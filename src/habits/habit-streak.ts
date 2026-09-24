import { DateTime } from 'luxon';
import type { Daytime, IHabit, IHabitCell, IHabitStreakStats } from './habit';
import { dayCompleted, isScheduled, occurrencesFor } from './habit';

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
  const multiDaytime = habit.daytimes.length > 1;

  const cells: IHabitCell[] = orderedDates.map(date => {
    const iso = toIsoDate(date);
    const scheduled = isScheduled(habit, date);
    const ticked = dayCompleted(habit, iso);
    const occurrences = occurrencesFor(habit, iso);
    const done = occurrences.filter(o => o.done).length;
    const total = habit.daytimes.length;
    const partial = scheduled && !ticked && done > 0;

    return {
      date: iso,
      ticked,
      scheduled,
      partial,
      progress: { done, total },
      multiDaytime,
      gap: false,
      streakStart: false,
      streakEnd: false,
      streakCount: 0,
      deadline: false,
      classes: !scheduled
        ? '--oa-unscheduled'
        : ticked
          ? '--oa-ticked'
          : partial
            ? '--oa-partial'
            : '--oa-empty',
    };
  });

  if (!showStreaks) {
    return cells;
  }

  const scheduledCells = cells.filter(cell => cell.scheduled);
  const tickDates = scheduledCells
    .filter(cell => cell.ticked)
    .map(cell => DateTime.fromISO(cell.date, { zone: 'local' }));

  // Pass 1 y 3 (gap/deadline) solo aplican con tolerancia de huecos configurada
  if (maxGap > 0) {
    // Pass 1: marcar huecos (gap) entre dos días completos consecutivos; los parciales quedan tal cual
    for (const cell of scheduledCells.filter(item => !item.ticked && !item.partial)) {
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

    // Pass 3: deadline fantasma relativo al último día completo
    const lastTick = tickDates[tickDates.length - 1] ?? null;
    if (lastTick) {
      const deadlineDate = lastTick.plus({ days: maxGap + 1 });
      const deadlineCell = cells.find(cell => cell.scheduled && cell.date === toIsoDate(deadlineDate));
      if (deadlineCell) {
        deadlineCell.deadline = true;
        deadlineCell.classes = '--oa-deadline';
      }
    }
  }

  // Pass 2: agrupar corridas consecutivas de días completos (o gap) en una "píldora" visual.
  // Siempre corre, incluso con maxGap=0, para fusionar racha de días literalmente consecutivos.
  // Los días no programados y los parciales son neutrales (ADR-005/008): no abren, no cierran
  // ni cuentan la racha; solo ticked/gap la extienden.
  let runIndexes: number[] = [];

  const closeRun = () => {
    if (runIndexes.length === 0) return;
    const start = runIndexes[0];
    const end = runIndexes[runIndexes.length - 1];
    const runLength = runIndexes.length;

    for (const index of runIndexes) {
      cells[index].streakCount = runLength;
    }
    cells[start].streakStart = true;
    cells[end].streakEnd = true;
    runIndexes = [];
  };

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];

    if (!cell.scheduled || cell.partial) {
      continue; // neutral: no abre ni cierra la racha
    }

    if (cell.ticked || cell.gap) {
      runIndexes.push(index);
      continue;
    }

    closeRun(); // día programado, no parcial, sin marcar -> corta la racha
  }

  closeRun();

  return cells;
}

/** Cuenta cuántos días programados (no neutrales) hay estrictamente entre dos fechas */
function isRunContinuous(habit: IHabit, previous: DateTime, next: DateTime): boolean {
  let scheduledGapDays = 0;
  let cursor = previous.plus({ days: 1 });

  while (cursor < next) {
    const iso = toIsoDate(cursor);
    const scheduled = isScheduled(habit, cursor);
    const isPartial = scheduled && !dayCompleted(habit, iso) && (habit.completions[iso]?.length ?? 0) > 0;

    if (scheduled && !isPartial) {
      scheduledGapDays += 1;
    }

    cursor = cursor.plus({ days: 1 });
  }

  return scheduledGapDays <= habit.maxGap;
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

    if (isRunContinuous(habit, previous, currentDate)) {
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

/** Variante de computeCells para una sola ocurrencia (daytime) de un hábito multi-daytime */
export function computeOccurrenceCells(
  habit: IHabit,
  daytime: Daytime,
  dates: DateTime[],
  maxGap: number,
  showStreaks: boolean
): IHabitCell[] {
  const orderedDates = [...dates].sort((a, b) => a.toMillis() - b.toMillis());

  const cells: IHabitCell[] = orderedDates.map(date => {
    const iso = toIsoDate(date);
    const scheduled = isScheduled(habit, date);
    const ticked = (habit.completions[iso] ?? []).includes(daytime);

    return {
      date: iso,
      ticked,
      scheduled,
      partial: false,
      progress: { done: ticked ? 1 : 0, total: 1 },
      multiDaytime: false,
      gap: false,
      streakStart: false,
      streakEnd: false,
      streakCount: 0,
      deadline: false,
      classes: !scheduled ? '--oa-unscheduled' : ticked ? '--oa-ticked' : '--oa-empty',
    };
  });

  if (!showStreaks) {
    return cells;
  }

  const scheduledCells = cells.filter(cell => cell.scheduled);
  const tickDates = scheduledCells
    .filter(cell => cell.ticked)
    .map(cell => DateTime.fromISO(cell.date, { zone: 'local' }));

  if (maxGap > 0) {
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
  }

  let runIndexes: number[] = [];

  const closeRun = () => {
    if (runIndexes.length === 0) return;
    const start = runIndexes[0];
    const end = runIndexes[runIndexes.length - 1];
    const runLength = runIndexes.length;

    for (const index of runIndexes) {
      cells[index].streakCount = runLength;
    }
    cells[start].streakStart = true;
    cells[end].streakEnd = true;
    runIndexes = [];
  };

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];

    if (!cell.scheduled) {
      continue;
    }

    if (cell.ticked || cell.gap) {
      runIndexes.push(index);
      continue;
    }

    closeRun();
  }

  closeRun();

  return cells;
}

function isOccurrenceRunContinuous(habit: IHabit, previous: DateTime, next: DateTime): boolean {
  let scheduledGapDays = 0;
  let cursor = previous.plus({ days: 1 });

  while (cursor < next) {
    if (isScheduled(habit, cursor)) {
      scheduledGapDays += 1;
    }
    cursor = cursor.plus({ days: 1 });
  }

  return scheduledGapDays <= habit.maxGap;
}

/** Variante de computeStats para una sola ocurrencia (daytime) de un hábito multi-daytime */
export function computeOccurrenceStats(habit: IHabit, daytime: Daytime): IHabitStreakStats {
  const dates = Object.keys(habit.completions)
    .filter(date => (habit.completions[date] ?? []).includes(daytime))
    .sort((a, b) => a.localeCompare(b));

  if (dates.length === 0) {
    return { current: 0, max: 0, lastDate: null };
  }

  let current = 0;
  let max = 0;
  let previous: DateTime | null = null;

  for (const value of dates) {
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

    if (isOccurrenceRunContinuous(habit, previous, currentDate)) {
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
    lastDate: dates[dates.length - 1] ?? null,
  };
}

/** Días no programados que quedan encerrados entre dos celdas de una misma racha (ticked/gap a ambos lados) */
export function computeUnscheduledBridges(cells: Pick<IHabitCell, 'scheduled' | 'ticked' | 'gap'>[]): boolean[] {
  return cells.map((cell, index) => {
    if (cell.scheduled) return false;

    let previous: Pick<IHabitCell, 'scheduled' | 'ticked' | 'gap'> | null = null;
    for (let i = index - 1; i >= 0; i -= 1) {
      if (cells[i].scheduled) { previous = cells[i]; break; }
    }

    let next: Pick<IHabitCell, 'scheduled' | 'ticked' | 'gap'> | null = null;
    for (let i = index + 1; i < cells.length; i += 1) {
      if (cells[i].scheduled) { next = cells[i]; break; }
    }

    return !!previous && !!next && (previous.ticked || previous.gap) && (next.ticked || next.gap);
  });
}
