// src/core/holidays/holiday-rules.ts
// Motor de reglas de feriados (v1.1.15, Fase FE1; ver docs/agenda-tasks/Especificación de vistas.md §21.2 y
// Arquitectura técnica.md §30.3). Módulo puro, sin red ni dependencias de Obsidian: cada feriado es una regla
// que `evaluateRule()` convierte en una fecha ISO para cualquier año. Los datos de cada país están en
// `holiday-data-*.ts` y las consultas por rango en `holiday-calendar.ts`.
//
// Formato de una regla (para añadir países): `{ id, nameKey, category, region?, type, ...parámetros del tipo }`.
//   - `id`: único dentro del país; `nameKey`: clave de traducción del nombre.
//   - `category`: `official` (descanso oficial) o `unofficial` (Día de las Madres, Halloween…).
//   - `region`: código de región (estado); sin él, la regla es nacional.
//   - `type` y sus parámetros: ver `HolidayRuleSpec`. Los días de la semana son ISO (1 = lunes … 7 = domingo) y los
//     meses van de 1 a 12.

export type HolidayCategory = 'official' | 'unofficial';

export type HolidayRuleSpec =
  /** Mismo día todos los años (25 de diciembre). */
  | { type: 'fixed'; month: number; day: number }
  /** N-ésimo día de la semana del mes (`n` de 1 a 5) o el último (`n = -1`): tercer lunes de noviembre. */
  | { type: 'nthWeekday'; month: number; weekday: number; n: number }
  /** Días antes (negativo) o después de la Pascua gregoriana: el Viernes Santo es -2. */
  | { type: 'easter'; offset: number }
  /**
   * Fecha fija que se recorre si cae en fin de semana. `onSaturday` y `onSunday` son los días a sumar (EE. UU.:
   * -1 el sábado y +1 el domingo). Es el fin de semana legal, no el ajuste de días no laborables del usuario.
   * El resultado puede caer en el año anterior o el siguiente.
   */
  | { type: 'observed'; month: number; day: number; onSaturday: number; onSunday: number }
  /** Fecha fija que solo ocurre cada `every` años desde `baseYear`: la transmisión del Poder Ejecutivo de México. */
  | { type: 'cycle'; baseYear: number; every: number; month: number; day: number }
  /** Fechas que no siguen una regla: año → fecha ISO completa. */
  | { type: 'explicit'; dates: Readonly<Record<number, string>> };

export type HolidayRule = {
  id: string;
  nameKey: string;
  category: HolidayCategory;
  region?: string;
} & HolidayRuleSpec;

/** Región de un país (estado). `name` es un nombre propio y no se traduce. */
export interface HolidayRegion {
  code: string;
  name: string;
}

/** Todo lo que un país aporta: sus regiones y sus reglas (nacionales y regionales). */
export interface HolidayCountryData {
  country: string;
  regions: readonly HolidayRegion[];
  rules: readonly HolidayRule[];
}

const DAY_MS = 86_400_000;

const pad = (value: number): string => String(value).padStart(2, '0');

function toIso(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Fecha UTC a mediodía, para que sumar días no dependa del huso ni del horario de verano. */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

const isoWeekday = (date: Date): number => date.getUTCDay() || 7;

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Fecha válida del calendario o `null` (29 de febrero en un año no bisiesto, mes 13…). */
function validDate(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) return null;
  return utcDate(year, month, day);
}

/** Domingo de Pascua gregoriano (algoritmo anónimo de Meeus/Jones/Butcher). */
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

export function getEasterDate(year: number): string {
  return toIso(easterDate(year));
}

function nthWeekdayDate(year: number, month: number, weekday: number, n: number): Date | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return null;
  const total = daysInMonth(year, month);

  if (n === -1) {
    const last = utcDate(year, month, total);
    return addDays(last, -((isoWeekday(last) - weekday + 7) % 7));
  }
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;

  const first = utcDate(year, month, 1);
  const day = 1 + ((weekday - isoWeekday(first) + 7) % 7) + (n - 1) * 7;
  return day > total ? null : utcDate(year, month, day);
}

/**
 * Fecha ISO (`AAAA-MM-DD`) en que cae la regla en el año dado, o `null` si ese año no la tiene (ciclo que no
 * toca, quinto lunes que no existe, año ausente de una lista explícita). Una regla observada o relativa a la
 * Pascua puede devolver una fecha del año anterior o del siguiente.
 */
export function evaluateRule(rule: HolidayRule, year: number): string | null {
  switch (rule.type) {
    case 'fixed': {
      const date = validDate(year, rule.month, rule.day);
      return date ? toIso(date) : null;
    }
    case 'nthWeekday': {
      const date = nthWeekdayDate(year, rule.month, rule.weekday, rule.n);
      return date ? toIso(date) : null;
    }
    case 'easter':
      return toIso(addDays(easterDate(year), rule.offset));
    case 'observed': {
      const date = validDate(year, rule.month, rule.day);
      if (!date) return null;
      const weekday = isoWeekday(date);
      if (weekday === 6) return toIso(addDays(date, rule.onSaturday));
      if (weekday === 7) return toIso(addDays(date, rule.onSunday));
      return toIso(date);
    }
    case 'cycle': {
      if (!Number.isInteger(rule.every) || rule.every < 1) return null;
      const elapsed = year - rule.baseYear;
      if (elapsed < 0 || elapsed % rule.every !== 0) return null;
      const date = validDate(year, rule.month, rule.day);
      return date ? toIso(date) : null;
    }
    case 'explicit':
      return rule.dates[year] ?? null;
  }
}
