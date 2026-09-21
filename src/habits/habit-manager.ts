import type { App, TFile, TFolder } from 'obsidian';
import type { AgendaPluginSettings } from '../settings/settings';
import type { IHabit } from './habit';

// Placeholder - implemented in Phase 1
export class HabitManager {
  constructor(
    private app: App,
    private settingsGetter: () => AgendaPluginSettings
  ) {}

  getHabits(): IHabit[] {
    return [];
  }

  getHabit(_file: TFile): IHabit | null {
    return null;
  }

  async toggle(_date: string): Promise<void> {
    // No-op in Phase 0
  }

  computeDashboard() {
    return {
      todayRaw: 0,
      todayWeighted: 0,
      currentStreak: 0,
      maxStreak: 0,
      totalHabits: 0,
      byArea: {},
      byDaytime: {},
      history30d: [],
    };
  }

  cleanup(): void {
    // No-op in Phase 0
  }
}