import type { TFile } from 'obsidian';
import type { AgendaPluginSettings } from '../settings/settings';
import type { Daytime, HabitArea, IHabit } from './habit';

export interface IHabitParser {
  parse(file: TFile, fm: Record<string, unknown>, settings: AgendaPluginSettings): IHabit | null;
}

const AREA_ALIASES: Record<string, HabitArea> = {
  'daily-plan': 'daily-plan',
  'daily plan': 'daily-plan',
  'dailyplan': 'daily-plan',
  emotional: 'emotional',
  emotion: 'emotional',
  mind: 'emotional',
  financial: 'financial',
  finance: 'financial',
  money: 'financial',
  intellectual: 'intellectual',
  brain: 'intellectual',
  learning: 'intellectual',
  knowledge: 'intellectual',
  physical: 'physical',
  fitness: 'physical',
  health: 'physical',
  professional: 'professional',
  work: 'professional',
  career: 'professional',
  recreational: 'recreational',
  fun: 'recreational',
  leisure: 'recreational',
  relationship: 'relationship',
  relationships: 'relationship',
  social: 'relationship',
  spiritual: 'spiritual',
  mindfulness: 'spiritual',
  wellness: 'spiritual',
  temporal: 'temporal',
  misc: 'temporal',
  other: 'temporal',
  general: 'temporal',
};

function normalizeArea(value: unknown): HabitArea {
  const raw = String(value ?? 'temporal').trim().toLowerCase();
  if (!raw) return 'temporal';

  const normalized = raw.replace(/[_\s]+/g, '-').replace(/-+/g, '-');
  if (normalized in AREA_ALIASES) {
    return AREA_ALIASES[normalized];
  }

  const fallback = normalized.replace(/[^a-z-]/g, '');
  return AREA_ALIASES[fallback] ?? 'temporal';
}

function normalizePriority(value: unknown): number {
  const parsed = Number(value ?? 3);
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

function normalizeEntries(value: unknown): Set<string> {
  const rawList: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : [];

  const entries = new Set<string>();

  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      entries.add(trimmed);
    }
  }

  return entries;
}

function normalizeFrequencySet(value: unknown): Set<number> {
  const defaultSet = new Set<number>([1, 2, 3, 4, 5, 6, 7]);

  const tokens = (() => {
    if (typeof value === 'string') {
      return value
        .split(/[\s,]+/)
        .map(part => part.trim().toLowerCase())
        .filter(Boolean);
    }

    if (Array.isArray(value)) {
      return value.map(item => String(item).trim().toLowerCase()).filter(Boolean);
    }

    return [];
  })();

  if (tokens.length === 0) {
    return defaultSet;
  }

  const output = new Set<number>();
  const weekdayMap: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  };

  for (const token of tokens) {
    switch (token) {
      case 'everyday':
        for (let i = 1; i <= 7; i += 1) output.add(i);
        break;
      case 'workweek':
        for (let i = 1; i <= 5; i += 1) output.add(i);
        break;
      case 'weekend':
        output.add(6);
        output.add(7);
        break;
      default:
        if (token in weekdayMap) output.add(weekdayMap[token]);
        break;
    }
  }

  return output.size > 0 ? output : defaultSet;
}

function normalizeDaytimes(value: unknown): Daytime[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : ['morning'];

  const normalized = new Set<Daytime>();
  const lookup: Record<string, Daytime> = {
    'wake up': 'wake up',
    'wake-up': 'wake up',
    morning: 'morning',
    afternoon: 'afternoon',
    evening: 'evening',
    night: 'night',
  };

  for (const item of raw) {
    const key = String(item ?? '').trim().toLowerCase();
    if (!key) continue;

    const resolved = lookup[key] ?? lookup[key.replace(/_/g, ' ')];
    if (resolved) normalized.add(resolved);
  }

  if (normalized.size === 0) return ['morning'];
  return [...normalized];
}

export function parseHabit(file: TFile, fm: Record<string, unknown>, settings: AgendaPluginSettings): IHabit | null {
  const status = String(fm.status ?? 'active').trim().toLowerCase();

  if (status === 'inactive' || status === 'archived' || status === 'disabled') {
    return null;
  }

  const title = String(fm.title ?? fm.name ?? file.basename ?? 'Habit').trim() || file.basename || 'Habit';
  const maxGapValue = Number(fm.maxGap ?? settings.habitDefaultMaxGap);

  return {
    file,
    name: String(fm.name ?? file.basename ?? title).trim() || file.basename || title,
    title,
    description: String(fm.description ?? '').trim(),
    time: Number(fm.time ?? 0),
    area: normalizeArea(fm.area),
    subArea: String(fm.subArea ?? '').trim(),
    frequencySet: normalizeFrequencySet(fm.frequency),
    priority: normalizePriority(fm.priority ?? settings.habitDefaultPriority),
    daytimes: normalizeDaytimes(fm.daytime ?? fm.daytimes ?? ['morning']),
    color: String(fm.color ?? settings.habitDefaultColor ?? '').trim(),
    maxGap: Number.isFinite(maxGapValue) ? Math.max(0, Math.round(maxGapValue)) : 0,
    status: status || 'active',
    entries: normalizeEntries(fm.entries),
  };
}

export type { AgendaPluginSettings } from '../settings/settings';
export type { IHabit, HabitArea, Daytime, FrequencyToken, WeekdayName } from './habit';