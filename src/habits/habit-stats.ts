import { DateTime } from 'luxon';
import type { Daytime, IHabit, IHabitDayStat, HabitDashboardData } from './habit';
import { dayCompleted } from './habit';
import type { IHabitCalcContext } from './habit-calendar';
import { NO_VACATIONS, countsOn, findVacation } from './habit-calendar';
import { computeStats } from './habit-streak';

function toIsoDate(date: DateTime): string {
  return date.toISODate() ?? date.toFormat('yyyy-MM-dd');
}

export function computeAreaStats(
  habits: IHabit[],
  dateString: string,
  ctx: IHabitCalcContext = NO_VACATIONS
): Record<string, { raw: number; weighted: number }> {
  const date = DateTime.fromISO(dateString, { zone: 'local' });
  const isoDate = toIsoDate(date);
  const totals: Record<string, { done: number; scheduled: number; weightDone: number; weightTotal: number }> = {};

  for (const habit of habits) {
    const area = habit.area;
    const daytimes = habit.daytimes.length > 0 ? habit.daytimes : (['morning'] as Daytime[]);
    const completedDaytimes = habit.completions[isoDate] ?? [];

    // Por ocurrencia: en un día de vacaciones solo cuentan las marcadas
    for (const daytime of daytimes) {
      const done = completedDaytimes.includes(daytime);
      if (!countsOn(habit, date, done, ctx)) continue;

      if (!(area in totals)) {
        totals[area] = { done: 0, scheduled: 0, weightDone: 0, weightTotal: 0 };
      }

      totals[area].scheduled += 1;
      totals[area].weightTotal += habit.priority;

      if (done) {
        totals[area].done += 1;
        totals[area].weightDone += habit.priority;
      }
    }
  }

  const result: Record<string, { raw: number; weighted: number }> = {};
  for (const [key, value] of Object.entries(totals)) {
    result[key] = {
      raw: value.scheduled === 0 ? 0 : value.done / value.scheduled,
      weighted: value.weightTotal === 0 ? 0 : value.weightDone / value.weightTotal,
    };
  }

  return result;
}

export function computeDaytimeStats(
  habits: IHabit[],
  dateString: string,
  ctx: IHabitCalcContext = NO_VACATIONS
): Record<string, { raw: number; weighted: number }> {
  const date = DateTime.fromISO(dateString, { zone: 'local' });
  const isoDate = toIsoDate(date);
  const totals: Record<string, { done: number; scheduled: number; weightDone: number; weightTotal: number }> = {};

  for (const habit of habits) {
    const daytimes = habit.daytimes.length > 0 ? habit.daytimes : (['morning'] as Daytime[]);
    for (const daytime of daytimes) {
      const done = (habit.completions[isoDate] ?? []).includes(daytime);
      if (!countsOn(habit, date, done, ctx)) continue;

      if (!(daytime in totals)) {
        totals[daytime] = { done: 0, scheduled: 0, weightDone: 0, weightTotal: 0 };
      }

      totals[daytime].scheduled += 1;
      totals[daytime].weightTotal += habit.priority;

      if (done) {
        totals[daytime].done += 1;
        totals[daytime].weightDone += habit.priority;
      }
    }
  }

  const result: Record<string, { raw: number; weighted: number }> = {};
  for (const [key, value] of Object.entries(totals)) {
    result[key] = {
      raw: value.scheduled === 0 ? 0 : value.done / value.scheduled,
      weighted: value.weightTotal === 0 ? 0 : value.weightDone / value.weightTotal,
    };
  }

  return result;
}

/** Estadística de un día completo: cuenta cada hábito que toca ese día y, en vacaciones, solo si está completo. */
function computeDayStat(habits: IHabit[], date: DateTime, ctx: IHabitCalcContext): IHabitDayStat {
  const iso = toIsoDate(date);
  const vacation = findVacation(ctx.vacations, iso);

  let done = 0;
  let total = 0;
  let weightDone = 0;
  let weightTotal = 0;

  for (const habit of habits) {
    const completed = dayCompleted(habit, iso);
    if (!countsOn(habit, date, completed, ctx)) continue;

    total += 1;
    weightTotal += habit.priority;

    if (completed) {
      done += 1;
      weightDone += habit.priority;
    }
  }

  return {
    date: iso,
    done,
    total,
    pct: total === 0 ? 0 : done / total,
    weightDone,
    weightTotal,
    pctWeighted: weightTotal === 0 ? 0 : weightDone / weightTotal,
    vacation: vacation !== null,
    ...(vacation?.name ? { vacationName: vacation.name } : {}),
  };
}

export function computeHistory30d(habits: IHabit[], ctx: IHabitCalcContext = NO_VACATIONS): IHabitDayStat[] {
  const end = DateTime.local();
  const result: IHabitDayStat[] = [];

  for (let offset = 29; offset >= 0; offset -= 1) {
    result.push(computeDayStat(habits, end.minus({ days: offset }), ctx));
  }

  return result;
}

/** Historial día a día para todo un año calendario (para el heatmap global tipo GitHub) */
export function computeYearHistory(habits: IHabit[], year: number, ctx: IHabitCalcContext = NO_VACATIONS): IHabitDayStat[] {
  const start = DateTime.local(year, 1, 1);
  const end = DateTime.local(year, 12, 31);
  const result: IHabitDayStat[] = [];

  let date = start;
  while (date <= end) {
    result.push(computeDayStat(habits, date, ctx));
    date = date.plus({ days: 1 });
  }

  return result;
}

/**
 * Datos del Dashboard. `habits` son los hábitos activos (filas, rachas y total) y `statsHabits`, por defecto los
 * mismos, la lista de los porcentajes: con los desactivados que tienen `until` incluidos, el historial de fechas
 * pasadas no cambia al desactivar un hábito (v1.1.15, HA1). `ctx` trae las vacaciones (HV1).
 */
export function computeDashboard(
  habits: IHabit[],
  statsHabits: IHabit[] = habits,
  ctx: IHabitCalcContext = NO_VACATIONS
): HabitDashboardData {
  const today = DateTime.local();
  const isoToday = toIsoDate(today);

  const todayStat = computeDayStat(statsHabits, today, ctx);

  const currentStreak = habits.reduce((max, habit) => Math.max(max, computeStats(habit, ctx).current), 0);
  const maxStreak = habits.reduce((max, habit) => Math.max(max, computeStats(habit, ctx).max), 0);

  return {
    todayRaw: todayStat.pct,
    todayWeighted: todayStat.pctWeighted,
    currentStreak,
    maxStreak,
    totalHabits: habits.length,
    byArea: computeAreaStats(statsHabits, isoToday, ctx),
    byDaytime: computeDaytimeStats(statsHabits, isoToday, ctx),
    history30d: computeHistory30d(statsHabits, ctx),
  };
}