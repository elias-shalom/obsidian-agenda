import { DateTime } from 'luxon';
import type { IHabit, IHabitDayStat, HabitDashboardData } from './habit';
import { dayCompleted, isScheduled } from './habit';
import { computeStats } from './habit-streak';

function toIsoDate(date: DateTime): string {
  return date.toISODate() ?? date.toFormat('yyyy-MM-dd');
}

export function computeAreaStats(
  habits: IHabit[],
  dateString: string
): Record<string, { raw: number; weighted: number }> {
  const date = DateTime.fromISO(dateString, { zone: 'local' });
  const totals: Record<string, { done: number; scheduled: number; weightDone: number; weightTotal: number }> = {};

  for (const habit of habits) {
    if (!isScheduled(habit, date)) continue;

    const area = habit.area;
    if (!(area in totals)) {
      totals[area] = { done: 0, scheduled: 0, weightDone: 0, weightTotal: 0 };
    }

    totals[area].scheduled += 1;
    totals[area].weightTotal += habit.priority;

    if (dayCompleted(habit, toIsoDate(date))) {
      totals[area].done += 1;
      totals[area].weightDone += habit.priority;
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
  dateString: string
): Record<string, { raw: number; weighted: number }> {
  const date = DateTime.fromISO(dateString, { zone: 'local' });
  const totals: Record<string, { done: number; scheduled: number; weightDone: number; weightTotal: number }> = {};

  for (const habit of habits) {
    if (!isScheduled(habit, date)) continue;

    for (const daytime of habit.daytimes) {
      if (!(daytime in totals)) {
        totals[daytime] = { done: 0, scheduled: 0, weightDone: 0, weightTotal: 0 };
      }

      totals[daytime].scheduled += 1;
      totals[daytime].weightTotal += habit.priority;

      if (dayCompleted(habit, toIsoDate(date))) {
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

export function computeHistory30d(habits: IHabit[]): IHabitDayStat[] {
  const end = DateTime.local();
  const result: IHabitDayStat[] = [];

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = end.minus({ days: offset });
    const iso = toIsoDate(date);

    let done = 0;
    let total = 0;
    let weightDone = 0;
    let weightTotal = 0;

    for (const habit of habits) {
      if (!isScheduled(habit, date)) continue;

      total += 1;
      weightTotal += habit.priority;

      if (dayCompleted(habit, iso)) {
        done += 1;
        weightDone += habit.priority;
      }
    }

    result.push({
      date: iso,
      done,
      total,
      pct: total === 0 ? 0 : done / total,
      weightDone,
      weightTotal,
      pctWeighted: weightTotal === 0 ? 0 : weightDone / weightTotal,
    });
  }

  return result;
}

/** Historial día a día para todo un año calendario (para el heatmap global tipo GitHub) */
export function computeYearHistory(habits: IHabit[], year: number): IHabitDayStat[] {
  const start = DateTime.local(year, 1, 1);
  const end = DateTime.local(year, 12, 31);
  const result: IHabitDayStat[] = [];

  let date = start;
  while (date <= end) {
    const iso = toIsoDate(date);

    let done = 0;
    let total = 0;
    let weightDone = 0;
    let weightTotal = 0;

    for (const habit of habits) {
      if (!isScheduled(habit, date)) continue;

      total += 1;
      weightTotal += habit.priority;

      if (dayCompleted(habit, iso)) {
        done += 1;
        weightDone += habit.priority;
      }
    }

    result.push({
      date: iso,
      done,
      total,
      pct: total === 0 ? 0 : done / total,
      weightDone,
      weightTotal,
      pctWeighted: weightTotal === 0 ? 0 : weightDone / weightTotal,
    });

    date = date.plus({ days: 1 });
  }

  return result;
}

export function computeDashboard(habits: IHabit[]): HabitDashboardData {
  const today = DateTime.local();
  const isoToday = toIsoDate(today);

  let todayDone = 0;
  let todayTotal = 0;
  let weightDone = 0;
  let weightTotal = 0;

  for (const habit of habits) {
    if (!isScheduled(habit, today)) continue;

    todayTotal += 1;
    weightTotal += habit.priority;

    if (dayCompleted(habit, isoToday)) {
      todayDone += 1;
      weightDone += habit.priority;
    }
  }

  const currentStreak = habits.reduce((max, habit) => Math.max(max, computeStats(habit).current), 0);
  const maxStreak = habits.reduce((max, habit) => Math.max(max, computeStats(habit).max), 0);

  return {
    todayRaw: todayTotal === 0 ? 0 : todayDone / todayTotal,
    todayWeighted: weightTotal === 0 ? 0 : weightDone / weightTotal,
    currentStreak,
    maxStreak,
    totalHabits: habits.length,
    byArea: computeAreaStats(habits, isoToday),
    byDaytime: computeDaytimeStats(habits, isoToday),
    history30d: computeHistory30d(habits),
  };
}