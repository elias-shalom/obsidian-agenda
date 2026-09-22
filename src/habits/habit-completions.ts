import type { Daytime, ICompletions, IHabit } from './habit';

/** Alterna una ocurrencia (date, daytime); limpia la fecha si queda sin ocurrencias */
export function toggle(
  completions: ICompletions,
  habit: Pick<IHabit, 'daytimes'>,
  date: string,
  daytime: Daytime
): ICompletions {
  const current = new Set(completions[date] ?? []);
  if (current.has(daytime)) {
    current.delete(daytime);
  } else {
    current.add(daytime);
  }

  const next: ICompletions = { ...completions };
  const filtered = habit.daytimes.filter(dt => current.has(dt));

  if (filtered.length === 0) {
    delete next[date];
  } else {
    next[date] = filtered;
  }

  return next;
}

/** Fechas con el día completo (todas las daytimes hechas) -> espejo `entries` */
export function dayCompletedDates(completions: ICompletions, habit: Pick<IHabit, 'daytimes'>): string[] {
  if (habit.daytimes.length === 0) return [];

  return Object.keys(completions).filter(date => {
    const done = completions[date] ?? [];
    return habit.daytimes.every(dt => done.includes(dt));
  });
}
