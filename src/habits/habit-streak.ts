import { DateTime } from 'luxon';
import type { IHabit, IHabitCell, IHabitStreakStats } from './habit';
import { isScheduled } from './habit';

function toIsoDate(date: DateTime): string {
  return date.toISODate() ?? date.toFormat('yyyy-MM-dd');
}

export function computeCells(
  habit: IHabit,
  dates: DateTime[],
  maxGap: number,
  showStreaks: boolean
): IHabitCell[] {
  const orderedDates = [...dates].sort((a, b) => a.toMillis() - b.toMillis());
  const cells: IHabitCell[] = orderedDates.map(date => {
    const iso = toIsoDate(date);
    const scheduled = isScheduled(habit, date);
    const ticked = habit.entries.has(iso);

    return {
      date: iso,
      ticked,
      scheduled,
      gap: false,
      streakStart: false,
      streakEnd: false,
      streakCount: 0,
      deadline: false,
      classes: scheduled ? (ticked ? '--oa-ticked' : '--oa-empty') : '--oa-unscheduled',
    };
  });

  if (!showStreaks || maxGap <= 0) {
    return cells;
  }

  const scheduledCells = cells.filter(cell => cell.scheduled);
  const tickDates = scheduledCells
    .filter(cell => cell.ticked)
    .map(cell => DateTime.fromISO(cell.date, { zone: 'local' }));

  for (const cell of scheduledCells.filter(item => !item.ticked)) {
    const currentDate = DateTime.fromISO(cell.date, { zone: 'local' });
    const previousTick = tickDates.filter(date => date < currentDate).slice(-1)[0] ?? null;
    const nextTick = tickDates.find(date => date > currentDate) ?? null;

    if (!previousTick || !nextTick) continue;

    const between = nextTick.diff(previousTick, 'days').days;
    const fromPrevious = currentDate.diff(previousTick, 'days').days;
    const toNext = nextTick.diff(currentDate, 'days').days;

    if (between > 1 && between <= maxGap + 2 && fromPrevious <= maxGap + 1 && toNext <= maxGap + 1) {
      cell.gap = true;
      cell.classes = '--oa-gap';
    }
  }

  const lastTick = tickDates[tickDates.length - 1] ?? null;
  if (lastTick) {
    const deadlineDate = lastTick.plus({ days: maxGap + 1 });
    const deadlineCell = cells.find(cell => cell.scheduled && cell.date === toIsoDate(deadlineDate));
    if (deadlineCell) {
      deadlineCell.deadline = true;
      deadlineCell.classes = '--oa-deadline';
    }
  }

  let runIndexes: number[] = [];

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];

    if (!cell.scheduled) {
      if (runIndexes.length > 0) {
        const start = runIndexes[0];
        const end = runIndexes[runIndexes.length - 1];
        const runLength = runIndexes.length;

        for (let i = start; i <= end; i += 1) {
          if (cells[i].scheduled && (cells[i].ticked || cells[i].gap)) {
            cells[i].streakCount = runLength;
            if (i === start) cells[i].streakStart = true;
            if (i === end) cells[i].streakEnd = true;
          }
        }

        runIndexes = [];
      }
      continue;
    }

    if (cell.ticked || cell.gap) {
      runIndexes.push(index);
      continue;
    }

    if (runIndexes.length > 0) {
      const start = runIndexes[0];
      const end = runIndexes[runIndexes.length - 1];
      const runLength = runIndexes.length;

      for (let i = start; i <= end; i += 1) {
        if (cells[i].scheduled && (cells[i].ticked || cells[i].gap)) {
          cells[i].streakCount = runLength;
          if (i === start) cells[i].streakStart = true;
          if (i === end) cells[i].streakEnd = true;
        }
      }

      runIndexes = [];
    }
  }

  if (runIndexes.length > 0) {
    const start = runIndexes[0];
    const end = runIndexes[runIndexes.length - 1];
    const runLength = runIndexes.length;

    for (let i = start; i <= end; i += 1) {
      if (cells[i].scheduled && (cells[i].ticked || cells[i].gap)) {
        cells[i].streakCount = runLength;
        if (i === start) cells[i].streakStart = true;
        if (i === end) cells[i].streakEnd = true;
      }
    }
  }

  return cells;
}

export function computeStats(habit: IHabit): IHabitStreakStats {
  const sortedEntries = [...habit.entries].sort((a, b) => a.localeCompare(b));

  if (sortedEntries.length === 0) {
    return { current: 0, max: 0, lastDate: null };
  }

  let current = 0;
  let max = 0;
  let previous: DateTime | null = null;

  for (const value of sortedEntries) {
    const currentDate = DateTime.fromISO(value, { zone: 'local' });

    if (!isScheduled(habit, currentDate)) {
      continue;
    }

    if (!previous) {
      current = 1;
      max = 1;
      previous = currentDate;
      continue;
    }

    const diffDays = previous.diff(currentDate, 'days').days;
    if (diffDays === 1) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 1;
    }

    previous = currentDate;
  }

  return {
    current,
    max,
    lastDate: sortedEntries[sortedEntries.length - 1] ?? null,
  };
}