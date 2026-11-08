// src/core/holidays/holiday-calendar.ts
// Consulta de feriados por rango (v1.1.15, Fase FE1; ver Arquitectura técnica.md §30.3). Une los datos de cada
// país con el evaluador de reglas y los filtra según los calendarios de feriados que el usuario activó. Módulo
// puro: el ajuste `holidayCalendars` y el marcado en las vistas llegan en FE2.
import { MX_HOLIDAYS } from './holiday-data-mx';
import { US_HOLIDAYS } from './holiday-data-us';
import { evaluateRule, type HolidayCategory, type HolidayCountryData, type HolidayRule } from './holiday-rules';

/** Un calendario de feriados activo: país, región opcional, qué categorías se ven y de qué color. */
export interface HolidayCalendarConfig {
  country: string;
  /** Sin región, solo las reglas nacionales; con ella, las nacionales y las de esa región. */
  region?: string;
  official: boolean;
  unofficial: boolean;
  color: string;
}

export interface HolidayEntry {
  /** Fecha ISO `AAAA-MM-DD`. */
  date: string;
  ruleId: string;
  nameKey: string;
  category: HolidayCategory;
  country: string;
  region?: string;
  color: string;
}

const COUNTRIES: Readonly<Record<string, HolidayCountryData>> = {
  [MX_HOLIDAYS.country]: MX_HOLIDAYS,
  [US_HOLIDAYS.country]: US_HOLIDAYS,
};

interface EvaluatedRule {
  rule: HolidayRule;
  date: string;
}

// Las reglas de un país en un año no cambian: se calculan una sola vez
const yearCache = new Map<string, EvaluatedRule[]>();

export function getHolidayCountries(): readonly HolidayCountryData[] {
  return Object.values(COUNTRIES);
}

export function getHolidayCountry(country: string): HolidayCountryData | undefined {
  return COUNTRIES[country];
}

function evaluateCountryYear(data: HolidayCountryData, year: number): EvaluatedRule[] {
  const key = `${data.country}:${year}`;
  const cached = yearCache.get(key);
  if (cached) return cached;

  const evaluated: EvaluatedRule[] = [];
  for (const rule of data.rules) {
    const date = evaluateRule(rule, year);
    if (date) evaluated.push({ rule, date });
  }
  yearCache.set(key, evaluated);
  return evaluated;
}

function isVisible(rule: HolidayRule, calendar: HolidayCalendarConfig): boolean {
  if (rule.region !== undefined && rule.region !== calendar.region) return false;
  return rule.category === 'official' ? calendar.official : calendar.unofficial;
}

/**
 * Feriados entre dos fechas ISO (ambas incluidas), agrupados por día. Con varios calendarios, un mismo feriado
 * aparece una vez por calendario que lo incluye (cada uno con su color). Una regla observada o relativa a la
 * Pascua puede caer fuera del año de su regla, por eso se evalúa un año antes y uno después del rango.
 */
export function getHolidaysForRange(
  calendars: readonly HolidayCalendarConfig[],
  start: string,
  end: string,
): Map<string, HolidayEntry[]> {
  const result = new Map<string, HolidayEntry[]>();
  if (start > end) return result;

  const firstYear = Number(start.slice(0, 4)) - 1;
  const lastYear = Number(end.slice(0, 4)) + 1;

  for (const calendar of calendars) {
    const data = COUNTRIES[calendar.country];
    if (!data) continue;

    for (let year = firstYear; year <= lastYear; year++) {
      for (const { rule, date } of evaluateCountryYear(data, year)) {
        if (date < start || date > end || !isVisible(rule, calendar)) continue;
        const entries = result.get(date) ?? [];
        entries.push({
          date,
          ruleId: rule.id,
          nameKey: rule.nameKey,
          category: rule.category,
          country: data.country,
          region: rule.region,
          color: calendar.color,
        });
        result.set(date, entries);
      }
    }
  }
  return result;
}
