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
