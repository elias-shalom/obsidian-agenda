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
  entries: Set<string>;
}

export interface IHabitCell {
  date: string;
  ticked: boolean;
  scheduled: boolean;
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

export const priorityWeight = (habit: Pick<IHabit, "priority">): number => habit.priority;