import { App, EventRef, TFile, TFolder } from 'obsidian';
import type { AgendaPluginSettings } from '../settings/settings';
import type { Daytime, IHabit } from './habit';
import { parseHabit } from './habit-parser';
import { computeDashboard } from './habit-stats';
import { dayCompletedDates, toggle } from './habit-completions';
import { toggleOccurrence as writeToggleOccurrence } from './habit-writer';
import { HabitEditorModal } from './habit-editor';
import type { I18n } from '../core/i18n';

export class HabitManager {
  private habitCache = new Map<string, IHabit>();
  private readonly eventRefs: EventRef[] = [];
  private readonly descriptionCache = new Map<string, string>();

  constructor(
    private app: App,
    private settingsGetter: () => AgendaPluginSettings,
    private i18n: I18n
  ) {
    this.registerEvents();
    void this.refreshCache();
  }

  private getHabitFolderPath(): string {
    const folder = this.settingsGetter().habitFolderPath ?? 'daily plan/daily routine/habit';
    return folder.trim() || 'daily plan/daily routine/habit';
  }

  /** Ruta de la carpeta de hábitos configurada (uso público para las vistas) */
  getFolderPath(): string {
    return this.getHabitFolderPath();
  }

  /** Settings actuales del plugin (uso público para el editor de hábitos) */
  getSettings(): AgendaPluginSettings {
    return this.settingsGetter();
  }

  /** Indica si la carpeta de hábitos configurada existe en el vault */
  folderExists(): boolean {
    return this.app.vault.getAbstractFileByPath(this.getHabitFolderPath()) instanceof TFolder;
  }

  /** Recorre recursivamente la carpeta de hábitos y devuelve todas las notas .md encontradas */
  private collectHabitFiles(folder: TFolder): TFile[] {
    const results: TFile[] = [];

    for (const child of folder.children) {
      if (child instanceof TFile) {
        if (child.extension.toLowerCase() === 'md') {
          results.push(child);
        }
      } else if (child instanceof TFolder) {
        results.push(...this.collectHabitFiles(child));
      }
    }

    return results;
  }

  /** Nombres de las carpetas principales (raíz) del vault, usadas como opciones de área en el editor */
  getVaultRootFolders(): string[] {
    const names = new Set<string>(['temporal']);

    for (const child of this.app.vault.getRoot().children) {
      if (child instanceof TFolder) names.add(child.name);
    }

    for (const habit of this.habitCache.values()) {
      names.add(habit.area);
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  }

  /** Subcarpetas de 2º y 3er nivel bajo la carpeta raíz del área dada, para el combobox de sub-área */
  getSubAreaOptions(area: string): string[] {
    const root = this.app.vault.getRoot().children.find(
      (child): child is TFolder => child instanceof TFolder && child.name === area
    );
    if (!root) return [];

    const options: string[] = [];
    for (const level1 of root.children) {
      if (!(level1 instanceof TFolder)) continue;
      options.push(level1.name);
      for (const level2 of level1.children) {
        if (level2 instanceof TFolder) options.push(`${level1.name}/${level2.name}`);
      }
    }

    return options.sort((a, b) => a.localeCompare(b));
  }

  /** Resuelve el archivo relacionado de un hábito (wikilink o link inline) al TFile real, o null si no se encuentra */
  resolveRelatedFile(habit: IHabit): TFile | null {
    const raw = habit.related[0] ?? habit.relatedFile.trim();
    if (!raw) return null;

    const cache = this.app.metadataCache.getFileCache(habit.file);
    const linkCache = cache?.frontmatterLinks?.find(link => link.key === 'related');

    let linktext = linkCache?.link;
    if (!linktext) {
      const inlineMatch = raw.match(/^\[.*?\]\((.*?)\)$/);
      if (inlineMatch) {
        try { linktext = decodeURIComponent(inlineMatch[1]); } catch { linktext = inlineMatch[1]; }
      } else {
        linktext = raw.replace(/^\[\[|\]\]$/g, '').split('|')[0].split('#')[0];
      }
    }

    const dest = this.app.metadataCache.getFirstLinkpathDest(linktext, habit.file.path);
    if (dest) return dest;

    const fallback = this.app.vault.getAbstractFileByPath(linktext);
    return fallback instanceof TFile ? fallback : null;
  }

  private registerEvents(): void {
    this.eventRefs.push(
      this.app.vault.on('create', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.habitCache.delete(file.path);
          void this.refreshCache();
        }
      })
    );

    this.eventRefs.push(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.habitCache.delete(file.path);
          void this.refreshCache();
        }
      })
    );

    this.eventRefs.push(
      this.app.vault.on('delete', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.habitCache.delete(file.path);
          void this.refreshCache();
        }
      })
    );

    this.eventRefs.push(
      this.app.vault.on('rename', (file, oldPath) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.habitCache.delete(oldPath);
          this.habitCache.delete(file.path);
          void this.refreshCache();
        }
      })
    );
  }

  private async refreshCache(): Promise<void> {
    const folderPath = this.getHabitFolderPath();
    const folder = this.app.vault.getAbstractFileByPath(folderPath);

    if (!(folder instanceof TFolder)) {
      this.habitCache.clear();
      return;
    }

    const habits: IHabit[] = [];

    for (const file of this.collectHabitFiles(folder)) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
      const content = await this.app.vault.cachedRead(file);
      const bodyDescription = content.replace(/^---[\s\S]*?---\s*/, '').trim();
      this.descriptionCache.set(file.path, bodyDescription);
      const habit = parseHabit(file, fm, this.settingsGetter(), bodyDescription);
      if (habit) {
        habits.push(habit);
      }
    }

    this.habitCache = new Map(habits.map(habit => [habit.file.path, habit]));
  }

  /** Fuerza una reconstrucción completa de la caché y espera a que termine (uso público tras crear/editar/borrar un hábito) */
  async refreshHabits(): Promise<void> {
    await this.refreshCache();
  }

  /** Hábitos activos (usado por Grid/Weekly/Routine/Dashboard) */
  getHabits(): IHabit[] {
    return [...this.habitCache.values()].filter(habit => habit.status !== 'inactive').sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Todos los hábitos, incluidos los inactivos (usado por la vista Tabla/Lista) */
  getAllHabits(): IHabit[] {
    return [...this.habitCache.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  getHabit(file: TFile): IHabit | null {
    const cached = this.habitCache.get(file.path);
    if (cached) return cached;

    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const habit = parseHabit(file, fm, this.settingsGetter(), this.descriptionCache.get(file.path));
    if (!habit) return null;

    this.habitCache.set(file.path, habit);
    return habit;
  }

  async toggleOccurrence(file: TFile, date: string, daytime: Daytime): Promise<void> {
    const habit = this.getHabit(file);
    if (!habit) return;

    const nextCompletions = toggle(habit.completions, habit, date, daytime);
    const nextEntries = new Set(dayCompletedDates(nextCompletions, habit));

    await writeToggleOccurrence(this.app, file, habit, date, daytime);
    this.habitCache.set(file.path, { ...habit, completions: nextCompletions, entries: nextEntries });
  }

  computeDashboard() {
    return computeDashboard(this.getHabits());
  }

  /** Abre el modal de crear/editar hábito (crear si no se pasa hábito) */
  openEditor(habit?: IHabit): void {
    new HabitEditorModal(this.app, this, this.i18n, habit).open();
  }

  cleanup(): void {
    for (const ref of this.eventRefs) {
      this.app.vault.offref(ref);
    }
    this.eventRefs.length = 0;
    this.habitCache.clear();
    this.descriptionCache.clear();
  }
}