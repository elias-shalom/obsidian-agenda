import type { IHabit, IHabitCell, IHabitStreakStats } from './habit';
import { DateTime } from 'luxon';

// Placeholder - implemented in Phase 1
export function computeCells(
  _habit: IHabit,
  _dates: DateTime[],
  _maxGap: number,
  _showStreaks: boolean
): IHabitCell[] {
  return [];
}

export function computeStats(_habit: IHabit): IHabitStreakStats {
  return { current: 0, max: 0, lastDate: null };
}