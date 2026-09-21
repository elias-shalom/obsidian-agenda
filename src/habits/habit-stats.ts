import type { IHabit, IHabitDayStat, HabitDashboardData } from './habit';

// Placeholder - implemented in Phase 1
export function computeAreaStats(_habits: IHabit[], _date: string): Record<string, { raw: number; weighted: number }> {
  return {};
}

export function computeDaytimeStats(_habits: IHabit[], _date: string): Record<string, { raw: number; weighted: number }> {
  return {};
}

export function computeHistory30d(_habits: IHabit[]): IHabitDayStat[] {
  return [];
}

export function computeDashboard(_habits: IHabit[]): HabitDashboardData {
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