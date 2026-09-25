import type { TFile } from 'obsidian';
import type { AgendaPluginSettings } from '../settings/settings';
import type { Daytime, ICompletions, IHabit } from './habit';
import { dayCompletedDates } from './habit-completions';

export interface IHabitParser {
  parse(file: TFile, fm: Record<string, unknown>, settings: AgendaPluginSettings): IHabit | null;
}

function normalizePriority(value: unknown): number {
  const parsed = Number(value ?? 3);
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

function normalizeEntries(value: unknown): string[] {
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

  return [...entries];
}

/** Valida fm.completions contra las daytimes del hábito; inválido -> {} */
function parseCompletions(value: unknown, daytimes: Daytime[]): ICompletions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const result: ICompletions = {};

  for (const [date, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const rawList = Array.isArray(raw) ? raw : [];
    const done = new Set<Daytime>();

    for (const item of rawList) {
      const key = String(item ?? '').trim().toLowerCase();
      const match = daytimes.find(dt => dt.toLowerCase() === key);
      if (match) done.add(match);
    }

    if (done.size > 0) {
      result[date] = daytimes.filter(dt => done.has(dt));
    }
  }

  return result;
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

function normalizeRelated(value: unknown): string[] {
  const rawValues = Array.isArray(value) ? value : [value];
  return [...new Set(rawValues
    .filter(item => typeof item === 'string')
    .flatMap(item => item.split(/\r?\n/))
    .map(item => item.trim())
    .filter(Boolean))];
}

export function parseHabit(
  file: TFile,
  fm: Record<string, unknown>,
  settings: AgendaPluginSettings,
  bodyDescription?: string
): IHabit | null {
  const rawStatus = String(fm.status ?? 'active').trim().toLowerCase();
  const status = rawStatus === 'inactive' || rawStatus === 'archived' || rawStatus === 'disabled' ? 'inactive' : 'active';

  const area = String(fm.area ?? '').trim() || 'temporal';
  const related = normalizeRelated(fm.related);

  const title = String(fm.title ?? fm.name ?? file.basename ?? 'Habit').trim() || file.basename || 'Habit';
  const maxGapValue = Number(fm.maxGap ?? settings.habitDefaultMaxGap);
  const daytimes = normalizeDaytimes(fm.daytime ?? fm.daytimes ?? ['morning']);

  let completions = parseCompletions(fm.completions, daytimes);

  // Migración legacy: nota con `entries` y sin `completions` válidas -> sintetizar día completo
  if (Object.keys(completions).length === 0) {
    const legacyEntries = normalizeEntries(fm.entries);
    if (legacyEntries.length > 0) {
      completions = Object.fromEntries(legacyEntries.map(date => [date, [...daytimes]]));
    }
  }

  return {
    file,
    name: String(fm.name ?? file.basename ?? title).trim() || file.basename || title,
    title,
    description: bodyDescription?.trim() || String(fm.description ?? '').trim(),
    time: Number(fm.time ?? 0),
    area,
    subArea: String(fm['sub-area'] ?? '').trim(),
    related,
    relatedFile: related[0] ?? '',
    frequencySet: normalizeFrequencySet(fm.frequency),
    priority: normalizePriority(fm.priority ?? settings.habitDefaultPriority),
    daytimes,
    color: String(fm.color ?? settings.habitDefaultColor ?? '').trim(),
    maxGap: Number.isFinite(maxGapValue) ? Math.max(0, Math.round(maxGapValue)) : 0,
    status,
    completions,
    entries: new Set(dayCompletedDates(completions, { daytimes })),
  };
}

export type { AgendaPluginSettings } from '../settings/settings';
export type { IHabit, HabitArea, Daytime, FrequencyToken, WeekdayName, ICompletions } from './habit';