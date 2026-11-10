// src/habits/habit-calendar.ts
// Cuándo cuenta un día para un hábito (v1.1.15, Fases HA1 y HV1; ver docs/habit-tracker-agenda/Modelo de datos.md
// §8.3–§8.5 y Arquitectura técnica.md §10.2–§10.3). Funciones puras, sin `obsidian`: es el único sitio con la regla,
// así las rachas, los porcentajes y las vistas no la repiten.
import { DateTime } from 'luxon';
import type { Daytime, IHabit } from './habit';
import { isScheduled } from './habit';
import { matchesAreaRoutes } from '../core/area';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Periodo de vacaciones del ajuste `habitVacations`: fechas ISO inclusivas y un nombre opcional. */
export interface IHabitVacation {
  from: string;
  to: string;
  name?: string;
}

/** Lo que las funciones de cálculo necesitan de los ajustes; ellas nunca los leen. */
export interface IHabitCalcContext {
  vacations: readonly IHabitVacation[];
}

/** Contexto sin vacaciones: el comportamiento anterior a HV1. */
export const NO_VACATIONS: IHabitCalcContext = { vacations: [] };

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
 * Lista de vacaciones válida a partir de lo guardado en `data.json`: se descartan las filas que no son objetos, con
 * una fecha inexistente o con `to` anterior a `from`. Los periodos solapados se dejan como están: un día es de
 * vacaciones si cae en alguno.
 */
export function sanitizeVacations(value: unknown): IHabitVacation[] {
  if (!Array.isArray(value)) return [];

  const result: IHabitVacation[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const from = parseActiveDate(raw.from);
    const to = parseActiveDate(raw.to);
    if (!from || !to || to < from) continue;

    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    result.push(name ? { from, to, name } : { from, to });
  }
  return result;
}

/** Periodo de vacaciones que contiene la fecha ISO (extremos inclusivos) o `null`; alimenta el atenuado y el tooltip. */
export function findVacation(vacations: readonly IHabitVacation[], date: string): IHabitVacation | null {
  return vacations.find(vacation => vacation.from <= date && date <= vacation.to) ?? null;
}

/**
 * ¿Ese día cuenta para el hábito en rachas y porcentajes? Cuando toca por su frecuencia y cae dentro de su periodo;
 * si no, es neutral, igual que un día no programado. En un día de vacaciones solo cuenta si está marcado (`done`),
 * y entonces solo para ese hábito (ADR-DM2). `done` es la ocurrencia —o el día completo, según el agregado—; sin
 * `ctx` no hay vacaciones. No mira `status`: quien arma la lista de hábitos ya decidió cuáles entran (`getHabits()`
 * los activos, `getHabitsForStats()` también los desactivados con `until`, la Tabla todos).
 */
export function countsOn(
  habit: Pick<IHabit, 'frequencySet' | 'activeFrom' | 'activeUntil'>,
  date: DateTime,
  done = false,
  ctx: IHabitCalcContext = NO_VACATIONS
): boolean {
  const iso = date.toISODate() ?? date.toFormat('yyyy-MM-dd');
  if (!isScheduled(habit, date) || !isInPeriod(habit, iso)) return false;
  return done || findVacation(ctx.vacations, iso) === null;
}

/** Franjas del día en el orden en que se muestran. */
export const HABIT_DAYTIME_ORDER: readonly Daytime[] = ['wake up', 'morning', 'afternoon', 'evening', 'night'];

/** Una ocurrencia (hábito + franja) que toca ese día, tal como la dibuja el calendario (v1.1.15, HC1). */
export interface IHabitDayItem {
  habit: IHabit;
  daytime: Daytime;
  ticked: boolean;
  /** Entra en el total del resumen; falso solo en vacaciones si no está marcada (neutral, pero se puede marcar). */
  counted: boolean;
}

/** Lo que el calendario dibuja de los hábitos en un día: el chip `done/total`, la marca de vacaciones y las ocurrencias. */
export interface IHabitDaySummary {
  date: string;
  done: number;
  total: number;
  vacation: boolean;
  vacationName?: string;
  items: IHabitDayItem[];
}

/**
 * Resumen de los hábitos de un día para el calendario (HC1). Una ocurrencia aparece si toca por su frecuencia y cae
 * en el periodo activo del hábito, incluso en vacaciones, para poder marcarla; `total` y `done` cuentan solo las
 * que `countsOn()` da por buenas (en vacaciones, las marcadas: ADR-DM2). Las ocurrencias salen por franja y título.
 * Sin ningún hábito que toque, `items` queda vacío y el calendario no dibuja nada ese día.
 */
export function buildHabitDaySummary(habits: readonly IHabit[], date: DateTime, ctx: IHabitCalcContext = NO_VACATIONS): IHabitDaySummary {
  const iso = date.toISODate() ?? date.toFormat('yyyy-MM-dd');
  const vacation = findVacation(ctx.vacations, iso);
  const items: IHabitDayItem[] = [];
  let done = 0;
  let total = 0;

  for (const habit of habits) {
    if (!countsOn(habit, date, true)) continue;

    const daytimes = habit.daytimes.length > 0 ? habit.daytimes : (['morning'] as Daytime[]);
    const completed = habit.completions[iso] ?? [];
    for (const daytime of daytimes) {
      const ticked = completed.includes(daytime);
      const counted = countsOn(habit, date, ticked, ctx);
      items.push({ habit, daytime, ticked, counted });
      if (counted) {
        total += 1;
        if (ticked) done += 1;
      }
    }
  }

  const rank = (daytime: Daytime): number => {
    const index = HABIT_DAYTIME_ORDER.indexOf(daytime);
    return index === -1 ? HABIT_DAYTIME_ORDER.length : index;
  };
  items.sort((a, b) => rank(a.daytime) - rank(b.daytime) || a.habit.title.localeCompare(b.habit.title));

  return {
    date: iso,
    done,
    total,
    vacation: vacation !== null,
    ...(vacation?.name ? { vacationName: vacation.name } : {}),
    items,
  };
}

/**
 * Hábitos que pasan los filtros del calendario (HC1): solo el área (la del hábito, con su sub-área) y la búsqueda
 * (su título, sin distinguir mayúsculas ni acentos); la prioridad y el estado no aplican y no los ocultan.
 */
export function filterHabitsForCalendar(habits: readonly IHabit[], state: { search: string; areas: readonly string[] }): IHabit[] {
  const fold = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const query = fold(state.search.trim());

  return habits.filter(habit =>
    matchesAreaRoutes({ area: habit.area, subArea: habit.subArea }, state.areas)
    && (query === '' || fold(habit.title).includes(query)));
}
