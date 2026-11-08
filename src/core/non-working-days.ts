// src/core/non-working-days.ts
// Días no laborables (v1.1.15, Fase NL1; ver docs/agenda-tasks/Especificación de vistas.md §21.1 y
// Arquitectura técnica.md §30.2). Módulo puro, sin dependencias de Obsidian: lo comparten el sombreado del
// calendario, la Semana laboral, el Gantt y, desde NL2, las frecuencias de hábitos y las recurrentes.
import type { DateTime } from 'luxon';

/** Días ISO (1 = lunes … 7 = domingo), la misma numeración de `weekday` de Luxon y de las frecuencias de hábitos. */
export const DEFAULT_NON_WORKING_DAYS: readonly number[] = [6, 7];

const ALL_DAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

const isIsoDay = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 7;

/**
 * El ajuste exige al menos un día no laborable y al menos uno laborable: así «Fin de semana», «Lunes a viernes»
 * y la Semana laboral nunca quedan vacíos.
 */
export function isValidNonWorkingSet(days: readonly number[]): boolean {
  return days.length >= 1 && days.length <= 6;
}

/**
 * Deja el ajuste guardado en una lista ordenada y sin repetidos. Un valor que no es una lista de días ISO, o que
 * rompe la regla de extremos (ninguno o los siete), vuelve a sábado y domingo.
 */
export function sanitizeNonWorkingDays(raw: unknown): number[] {
  if (!Array.isArray(raw) || !raw.every(isIsoDay)) return [...DEFAULT_NON_WORKING_DAYS];
  const days = [...new Set(raw)].sort((a, b) => a - b);
  return isValidNonWorkingSet(days) ? days : [...DEFAULT_NON_WORKING_DAYS];
}

export function isNonWorkingDay(date: Pick<DateTime, 'weekday'>, days: readonly number[]): boolean {
  return days.includes(date.weekday);
}

/** Los días laborables (los no marcados), de lunes a domingo; nunca vacío con un ajuste válido. */
export function getWorkweekDays(days: readonly number[]): number[] {
  return ALL_DAYS.filter(day => !days.includes(day));
}

/**
 * Las fechas de la Semana laboral: las de la semana que empieza en `weekStart` (un lunes) cuyo día no está
 * marcado como no laborable, de lunes a domingo.
 */
export function getWorkweekDates(weekStart: DateTime, days: readonly number[]): DateTime[] {
  return getWorkweekDays(days).map(iso => weekStart.plus({ days: iso - 1 }));
}

export interface NonWorkingToggle {
  /** El ajuste resultante; el mismo si se rechazó el cambio. */
  days: number[];
  /** El cambio dejaría la lista sin día laborable o sin día no laborable: no se aplica. */
  rejected: boolean;
}

/** Marca o desmarca `day`; rechaza el cambio que rompería la regla de extremos. */
export function toggleNonWorkingDay(current: readonly number[], day: number): NonWorkingToggle {
  const base = sanitizeNonWorkingDays([...current]);
  if (!isIsoDay(day)) return { days: base, rejected: true };

  const next = base.includes(day) ? base.filter(candidate => candidate !== day) : [...base, day].sort((a, b) => a - b);
  return isValidNonWorkingSet(next) ? { days: next, rejected: false } : { days: base, rejected: true };
}

export function isDefaultNonWorkingDays(days: readonly number[]): boolean {
  const clean = sanitizeNonWorkingDays([...days]);
  return clean.length === DEFAULT_NON_WORKING_DAYS.length && clean.every((day, index) => day === DEFAULT_NON_WORKING_DAYS[index]);
}

// --- Frecuencias de hábitos y recurrentes (Fase NL2) ----------------------------------

/** Frecuencias predefinidas de un hábito; «Fin de semana» son los días no laborables y «Lunes a viernes» el resto. */
export type FrequencyPreset = 'everyday' | 'workweek' | 'weekend';

/** Los días ISO de una frecuencia predefinida según el ajuste (por defecto, sábado y domingo). */
export function getFrequencyPresetDays(preset: FrequencyPreset, nonWorkingDays: readonly number[] = DEFAULT_NON_WORKING_DAYS): number[] {
  const nonWorking = sanitizeNonWorkingDays([...nonWorkingDays]);
  if (preset === 'weekend') return nonWorking;
  if (preset === 'workweek') return getWorkweekDays(nonWorking);
  return [...ALL_DAYS];
}

/**
 * Qué frecuencia predefinida describe exactamente `days`, o `custom` si ninguna. Con un ajuste distinto, una
 * lista guardada con días explícitos puede coincidir con otra predefinida (o dejar de coincidir con la que
 * coincidía): lo que se muestra siempre sale de la comparación con el ajuste de ahora.
 */
export function matchFrequencyPreset(days: Iterable<number>, nonWorkingDays: readonly number[] = DEFAULT_NON_WORKING_DAYS): FrequencyPreset | 'custom' {
  const set = new Set(days);
  for (const preset of ['everyday', 'workweek', 'weekend'] as const) {
    const expected = getFrequencyPresetDays(preset, nonWorkingDays);
    if (set.size === expected.length && expected.every(day => set.has(day))) return preset;
  }
  return 'custom';
}

export type RecurrenceDayKind = 'weekday' | 'weekend';

/** Los días de `every weekday` (los laborables) y de `every weekend` (los no laborables) según el ajuste. */
export function getRecurrenceDays(kind: RecurrenceDayKind, nonWorkingDays: readonly number[] = DEFAULT_NON_WORKING_DAYS): number[] {
  return getFrequencyPresetDays(kind === 'weekend' ? 'weekend' : 'workweek', nonWorkingDays);
}

const RRULE_DAY_NAMES: readonly string[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/** Días ISO como valor de `BYDAY` (`MO,TU,…`), de lunes a domingo. */
export function toRRuleDays(days: readonly number[]): string {
  return [...new Set(days)].filter(isIsoDay).sort((a, b) => a - b).map(day => RRULE_DAY_NAMES[day - 1]).join(',');
}

const RECURRENCE_DAY_KIND_REGEX = /\bevery\s+(?:\d+\s+)?(weekday|weekend)\b/i;

/** `weekday` o `weekend` si el texto de recurrencia es de ese tipo; `null` en otro caso. */
export function findRecurrenceDayKind(recurrenceText: string): RecurrenceDayKind | null {
  const match = recurrenceText.match(RECURRENCE_DAY_KIND_REGEX);
  return match ? (match[1].toLowerCase() as RecurrenceDayKind) : null;
}

export interface RecurrenceDaysNote {
  kind: RecurrenceDayKind;
  /** Los días ISO que el ajuste da a esa recurrencia. */
  days: number[];
}

/**
 * La nota del Task Modal bajo el campo de recurrencia: solo cuando el texto es `every weekday` o `every weekend`
 * y el ajuste no es el habitual (sábado y domingo), porque entonces los días no coinciden con los del plugin Tasks.
 */
export function describeRecurrenceDays(recurrenceText: string, nonWorkingDays: readonly number[]): RecurrenceDaysNote | null {
  const kind = findRecurrenceDayKind(recurrenceText);
  if (!kind || isDefaultNonWorkingDays(nonWorkingDays)) return null;
  return { kind, days: getRecurrenceDays(kind, nonWorkingDays) };
}
