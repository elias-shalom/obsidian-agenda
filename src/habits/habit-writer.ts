import type { App, TFile } from 'obsidian';
import type { Daytime, IHabit } from './habit';
import { dayCompletedDates, toggle } from './habit-completions';

/** Alterna una ocurrencia y re-deriva el espejo `entries` en la misma transacción */
export async function toggleOccurrence(
  app: App,
  file: TFile,
  habit: Pick<IHabit, 'completions' | 'daytimes'>,
  date: string,
  daytime: Daytime
): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return;
  }

  const nextCompletions = toggle(habit.completions, habit, date, daytime);
  const nextEntries = dayCompletedDates(nextCompletions, habit).sort();

  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.completions = nextCompletions;
    frontmatter.entries = nextEntries;
  });
}