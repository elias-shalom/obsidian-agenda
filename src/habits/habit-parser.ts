import type { TFile } from 'obsidian';
import type { AgendaPluginSettings } from '../settings/settings';
import type { IHabit } from './habit';

export interface IHabitParser {
  parse(file: TFile, fm: Record<string, unknown>, settings: AgendaPluginSettings): IHabit | null;
}

// Placeholder - implemented in Phase 1
export function parseHabit(_file: TFile, _fm: Record<string, unknown>, _settings: AgendaPluginSettings): IHabit | null {
  return null;
}

// Re-export types
export type { AgendaPluginSettings } from '../settings/settings';
export type { IHabit, HabitArea, Daytime, FrequencyToken, WeekdayName } from './habit';