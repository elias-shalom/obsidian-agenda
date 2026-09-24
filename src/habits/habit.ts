import { DateTime } from 'luxon';
import type { TFile } from 'obsidian';

/** El área ya no es un enum fijo: es el nombre de la subcarpeta que contiene al hábito */
export type HabitArea = string;

/** Áreas "conocidas" (compatibilidad con la paleta/i18n original); no limita qué carpetas son válidas */
export const HABIT_AREAS: readonly HabitArea[] = [
  "daily-plan", "emotional", "financial", "intellectual", "physical",
  "professional", "recreational", "relationship", "spiritual", "temporal",
];

/** Paleta curada para las áreas conocidas; el resto usa un color derivado del nombre (ver getAreaColor) */
export const HABIT_AREA_COLORS: Record<string, string> = {
  "daily-plan": "hsl(280, 67%, 63%)",
  emotional: "hsl(358, 67%, 55%)",
  financial: "hsl(24, 100%, 46%)",
  intellectual: "hsl(42, 100%, 55%)",
  physical: "hsl(151, 87%, 37%)",
  professional: "hsl(195, 87%, 42%)",
  recreational: "hsl(208, 93%, 47%)",
  relationship: "hsl(226, 59%, 51%)",
  spiritual: "hsl(249, 91%, 63%)",
  temporal: "hsl(323, 62%, 49%)",
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Elige texto oscuro o claro según el brillo percibido (YIQ) del color de fondo dado */
export function getContrastTextColor(backgroundColor: string): string {
  const match = backgroundColor.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  if (!match) return "#ffffff";

  const [, h, s, l] = match.map(Number);
  const [r, g, b] = hslToRgb(h, s, l);
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return brightness > 0.6 ? "#1a1a1a" : "#ffffff";
}

/** Hash simple y determinístico de un string a un entero no-negativo */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Color de un área: usa la paleta curada si el nombre coincide, si no genera un tono armonizado por hash */
export function getAreaColor(area: string): string {
  const known = HABIT_AREA_COLORS[area];
  if (known) return known;

  const hue = hashString(area) % 360;
  return `hsl(${hue}, 62%, 55%)`;
}

/** Color de texto legible sobre getAreaColor(area) */
export function getAreaTextColor(area: string): string {
  return getContrastTextColor(getAreaColor(area));
}

/** Etiqueta localizada si el área coincide con las conocidas (habit_area_*); si no, el nombre de carpeta tal cual */
export function getAreaLabel(area: string, i18n: { t(key: string): string }): string {
  const slug = area.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const key = `habit_area_${slug}`;
  const translated = i18n.t(key);
  return translated === key ? area : translated;
}

/** @deprecated usar HABIT_AREA_COLORS/getAreaColor + HABIT_AREA_TEXT_COLORS/getAreaTextColor según necesidad */
export const HABIT_AREA_TEXT_COLORS: Record<string, string> = Object.fromEntries(
  HABIT_AREAS.map(area => [area, getContrastTextColor(HABIT_AREA_COLORS[area])])
);

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
  relatedFile: string;
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