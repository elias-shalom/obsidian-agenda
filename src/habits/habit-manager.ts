import { App, EventRef, TFile, TFolder } from 'obsidian';
import type { AgendaPluginSettings } from '../settings/settings';
import type { IHabit } from './habit';
import { parseHabit } from './habit-parser';
import { computeDashboard } from './habit-stats';
import { toggleEntry } from './habit-writer';

export class HabitManager {
  private habitCache = new Map<string, IHabit>();
  private readonly eventRefs: EventRef[] = [];

  constructor(
    private app: App,
    private settingsGetter: () => AgendaPluginSettings
  ) {
    this.registerEvents();
    this.refreshCache();
  }

  private getHabitFolderPath(): string {
    const folder = this.settingsGetter().habitFolderPath ?? 'daily plan/daily routine/habit';
    return folder.trim() || 'daily plan/daily routine/habit';
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

  async toggle(date: string): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) return;

    const habit = this.getHabit(file);
    if (!habit) return;

    const nextEntries = new Set(habit.entries);
    if (nextEntries.has(date)) {
      nextEntries.delete(date);
    } else {
      nextEntries.add(date);
    }

    await toggleEntry(this.app, file, date, habit.entries);
    this.habitCache.set(file.path, { ...habit, entries: nextEntries });
  }

  computeDashboard() {
    return computeDashboard(this.getHabits());
  }

  cleanup(): void {
    for (const ref of this.eventRefs) {
      this.app.vault.offref(ref);
    }
    this.eventRefs.length = 0;
    this.habitCache.clear();
  }
}