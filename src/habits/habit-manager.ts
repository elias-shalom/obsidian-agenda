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

  constructor(
    private app: App,
    private settingsGetter: () => AgendaPluginSettings,
    private i18n: I18n
  ) {
    this.registerEvents();
    this.refreshCache();
  }

  private getHabitFolderPath(): string {
    const folder = this.settingsGetter().habitFolderPath ?? 'daily plan/daily routine/habit';
    return folder.trim() || 'daily plan/daily routine/habit';
  }

  /** Ruta de la carpeta de hábitos configurada (uso público para las vistas) */
  getFolderPath(): string {
    return this.getHabitFolderPath();
  }

  /** Indica si la carpeta de hábitos configurada existe en el vault */
  folderExists(): boolean {
    return this.app.vault.getAbstractFileByPath(this.getHabitFolderPath()) instanceof TFolder;
  }

  private registerEvents(): void {
    this.eventRefs.push(
      this.app.vault.on('create', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.habitCache.delete(file.path);
          this.refreshCache();
        }
      })
    );

    this.eventRefs.push(
      this.app.vault.on('modify', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.habitCache.delete(file.path);
          this.refreshCache();
        }
      })
    );

    this.eventRefs.push(
      this.app.vault.on('delete', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.habitCache.delete(file.path);
          this.refreshCache();
        }
      })
    );

    this.eventRefs.push(
      this.app.vault.on('rename', (file, oldPath) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.habitCache.delete(oldPath);
          this.habitCache.delete(file.path);
          this.refreshCache();
        }
      })
    );
  }

  private refreshCache(): void {
    const folderPath = this.getHabitFolderPath();
    const folder = this.app.vault.getAbstractFileByPath(folderPath);

    if (!(folder instanceof TFolder)) {
      this.habitCache.clear();
      return;
    }

    const habits: IHabit[] = [];

    for (const child of folder.children) {
      if (!(child instanceof TFile) || child.extension.toLowerCase() !== 'md') continue;

      const fm = this.app.metadataCache.getFileCache(child)?.frontmatter ?? {};
      const habit = parseHabit(child, fm as Record<string, unknown>, this.settingsGetter());
      if (habit) {
        habits.push(habit);
      }
    }

    this.habitCache = new Map(habits.map(habit => [habit.file.path, habit]));
  }

  getHabits(): IHabit[] {
    this.refreshCache();
    return [...this.habitCache.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  getHabit(file: TFile): IHabit | null {
    const cached = this.habitCache.get(file.path);
    if (cached) return cached;

    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const habit = parseHabit(file, fm as Record<string, unknown>, this.settingsGetter());
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
  }
}