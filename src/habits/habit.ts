import { DateTime } from 'luxon';
import type { TFile } from 'obsidian';

export type HabitArea =
  | "daily-plan" | "emotional" | "financial" | "intellectual" | "physical"
  | "professional" | "recreational" | "relationship" | "spiritual" | "temporal";

export const HABIT_AREAS: readonly HabitArea[] = [
  "daily-plan", "emotional", "financial", "intellectual", "physical",
  "professional", "recreational", "relationship", "spiritual", "temporal",
];

export type Daytime = "wake up" | "morning" | "afternoon" | "evening" | "night";
export type FrequencyToken = "everyday" | "workweek" | "weekend";
export type WeekdayName = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

/** Fuente canónica de seguimiento por ocurrencia: fecha ISO -> daytimes hechas */
export interface ICompletions {
  [date: string]: Daytime[];
}

export interface IOccurrence {
  daytime: Daytime;
  done: boolean;
}

export interface IHabit {
  file: TFile;
  name: string;
  title: string;
  description: string;
  time: number;
  area: HabitArea;
  subArea: string;
  frequencySet: Set<number>;
  priority: number;
  daytimes: Daytime[];
  color: string;
  maxGap: number;
  status: string;
  completions: ICompletions;
  /** Espejo HT21 day-level, derivado de completions (nunca se lee directo del disco) */
  entries: Set<string>;
}

export interface IHabitCell {
  date: string;
  /** dayCompleted: todas las ocurrencias hechas */
  ticked: boolean;
  scheduled: boolean;
  /** programado con >=1 ocurrencia pero incompleto (neutral para racha/stats) */
  partial: boolean;
  progress: { done: number; total: number };
  multiDaytime: boolean;
  gap: boolean;
  streakStart: boolean;
  streakEnd: boolean;
  streakCount: number;
  deadline: boolean;
  classes: string;
}

export interface IHabitStreakStats {
  current: number;
  max: number;
  lastDate: string | null;
}

export interface IHabitDayStat {
  date: string;
  done: number;
  total: number;
  pct: number;
  weightDone: number;
  weightTotal: number;
  pctWeighted: number;
}

export interface HabitDashboardData {
  todayRaw: number;
  todayWeighted: number;
  currentStreak: number;
  maxStreak: number;
  totalHabits: number;
  byArea: Record<string, { raw: number; weighted: number }>;
  byDaytime: Record<string, { raw: number; weighted: number }>;
  history30d: IHabitDayStat[];
}

export function isScheduled(habit: Pick<IHabit, "frequencySet">, d: DateTime): boolean {
  return habit.frequencySet.has(d.weekday);
}

/** "Día cumplido" = todas las daytimes del hábito están en completions[date] */
export function dayCompleted(habit: Pick<IHabit, "completions" | "daytimes">, date: string): boolean {
  const done = habit.completions[date] ?? [];
  return habit.daytimes.length > 0 && habit.daytimes.every(dt => done.includes(dt));
}

/** Ocurrencias del día (consumido por el popover de la grid/rutina) */
export function occurrencesFor(habit: Pick<IHabit, "completions" | "daytimes">, date: string): IOccurrence[] {
  const done = habit.completions[date] ?? [];
  return habit.daytimes.map(daytime => ({ daytime, done: done.includes(daytime) }));
}

export const priorityWeight = (habit: Pick<IHabit, "priority">): number => habit.priority;