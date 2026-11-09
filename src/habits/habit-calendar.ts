// src/habits/habit-calendar.ts
// Cuándo cuenta un día para un hábito (v1.1.15, Fase HA1; ver docs/habit-tracker-agenda/Modelo de datos.md §8.3 y
// Arquitectura técnica.md §10.2). Funciones puras, sin `obsidian`: es el único sitio con la regla, así las rachas,
// los porcentajes y las vistas no la repiten. Las vacaciones (HV1) se añaden aquí.
import { DateTime } from 'luxon';
import type { IHabit } from './habit';
import { isScheduled } from './habit';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha `AAAA-MM-DD` válida del calendario (no solo con el formato) o `null`: así un campo `from`/`until` mal escrito cuenta como ausente. */
export function parseActiveDate(value: unknown): string | null {
  // Un analizador de YAML que convierta `2026-03-01` en `Date` lo hace a medianoche UTC
  const text = value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString().slice(0, 10)
    : typeof value === 'string' ? value.trim() : '';
  return ISO_DAY.test(text) && DateTime.fromISO(text).isValid ? text : null;
}

/** ¿La fecha ISO cae dentro del periodo `from`/`until`? Los dos extremos son inclusivos y uno ausente no limita. */
export function isInPeriod(habit: Pick<IHabit, 'activeFrom' | 'activeUntil'>, date: string): boolean {
  if (habit.activeFrom && date < habit.activeFrom) return false;
  if (habit.activeUntil && date > habit.activeUntil) return false;
  return true;
}

/**
 * ¿El hábito está activo ese día? Un hábito `inactive` sin `until` nunca lo está (como hasta ahora); con `until`
 * lo está hasta ese día, de modo que desactivarlo hoy no cambia el historial (ADR-DM1).
 */
export function isActiveOn(habit: Pick<IHabit, 'status' | 'activeFrom' | 'activeUntil'>, date: string): boolean {
  if (habit.status === 'inactive' && !habit.activeUntil) return false;
  return isInPeriod(habit, date);
}

/** ¿`from` ≤ `until`? Un extremo vacío no limita, así que solo falla cuando están los dos y están al revés. */
export function isValidPeriod(from: string | null, until: string | null): boolean {
  return !from || !until || from <= until;
}

/**
 * Valor de `until` al cambiar el switch de estado del Habit Creator: al **desactivar** es hoy (así el historial no
 * cambia; si ya había un `until` anterior a hoy se respeta) y al **reactivar** se vacía (`from` se conserva).
 */
export function activeUntilForStatus(active: boolean, current: string, today: string): string {
  if (active) return '';
  return current && current < today ? current : today;
}

/**
 * ¿Ese día cuenta para el hábito en rachas y porcentajes? Cuando toca por su frecuencia y cae dentro de su periodo;
 * si no, es neutral, igual que un día no programado. No mira `status`: quien arma la lista de hábitos ya decidió
 * cuáles entran (`getHabits()` los activos, `getHabitsForStats()` también los desactivados con `until`, la Tabla
 * todos).
 */
export function countsOn(habit: Pick<IHabit, 'frequencySet' | 'activeFrom' | 'activeUntil'>, date: DateTime): boolean {
  return isScheduled(habit, date) && isInPeriod(habit, date.toISODate() ?? date.toFormat('yyyy-MM-dd'));
}
