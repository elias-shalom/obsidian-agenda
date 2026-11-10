// src/core/holidays/holiday-calendar.ts
// Consulta de feriados por rango (v1.1.15, Fase FE1; ver Arquitectura técnica.md §30.3). Une los datos de cada
// país con el evaluador de reglas y los filtra según los calendarios de feriados que el usuario activó. Módulo
// puro: el ajuste `holidayCalendars` y el marcado en las vistas llegan en FE2.
import { MX_HOLIDAYS } from './holiday-data-mx';
import { US_HOLIDAYS } from './holiday-data-us';
import { INT_HOLIDAYS } from './holiday-data-int';
import { evaluateRule, type HolidayCategory, type HolidayCountryData, type HolidayRule } from './holiday-rules';

/** Un calendario de feriados activo: país, región opcional, qué categorías se ven y de qué color. */
export interface HolidayCalendarConfig {
  country: string;
  /** Sin región, solo las reglas nacionales; con ella, las nacionales y las de esa región. */
  region?: string;
  /**
   * Solo los países con temas (el internacional): los temas marcados; una regla con tema se ve solo si el suyo está
   * marcado. Los demás países no lo tienen.
   */
  groups?: string[];
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
  [INT_HOLIDAYS.country]: INT_HOLIDAYS,
};

/** Colores que se reparten entre los calendarios nuevos para que no empiecen todos iguales. */
export const HOLIDAY_COLOR_PALETTE: readonly string[] = ['#e5484d', '#3e63dd', '#30a46c', '#f5a524'];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Un calendario nuevo para el botón «Añadir»: el primer país, solo oficiales y el siguiente color de la paleta. */
export function createHolidayCalendar(existingCount: number): HolidayCalendarConfig {
  const [first] = getHolidayCountries();
  return {
    country: first.country,
    official: true,
    unofficial: false,
    color: HOLIDAY_COLOR_PALETTE[existingCount % HOLIDAY_COLOR_PALETTE.length],
  };
}

/**
 * Cambia el país de un calendario: la región es de cada país y se quita; un país con temas (el internacional) parte
 * con todos sus temas marcados y solo con fechas «no oficiales» (no tiene oficiales), y uno sin temas vuelve a las
 * casillas de siempre (solo oficiales). Conserva el color.
 */
export function changeHolidayCountry(calendar: HolidayCalendarConfig, country: string): void {
  const data = COUNTRIES[country];
  calendar.country = country;
  delete calendar.region;

  if (data?.groups) {
    calendar.groups = [...data.groups];
    calendar.official = false;
    calendar.unofficial = true;
  } else {
    delete calendar.groups;
    calendar.official = true;
    calendar.unofficial = false;
  }
}

/**
 * Deja el ajuste guardado en una lista válida: descarta lo que no es un calendario de un país conocido, quita la
 * región que el país no tiene y corrige el color o las casillas ausentes. En un país con temas, los temas
 * desconocidos se descartan y, si faltan, se marcan todos; sin temas, no los lleva. Cualquier otro valor da la lista
 * vacía («ninguno activo»).
 */
export function sanitizeHolidayCalendars(raw: unknown): HolidayCalendarConfig[] {
  if (!Array.isArray(raw)) return [];

  const result: HolidayCalendarConfig[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const entry = item as Record<string, unknown>;
    const data = typeof entry.country === 'string' ? COUNTRIES[entry.country] : undefined;
    if (!data) continue;

    const region = typeof entry.region === 'string' && data.regions.some(r => r.code === entry.region) ? entry.region : undefined;
    const calendar: HolidayCalendarConfig = {
      country: data.country,
      // Un país con temas solo tiene fechas «no oficiales»: las casillas no cuentan
      official: data.groups ? false : typeof entry.official === 'boolean' ? entry.official : true,
      unofficial: data.groups ? true : typeof entry.unofficial === 'boolean' ? entry.unofficial : false,
      color: typeof entry.color === 'string' && HEX_COLOR.test(entry.color)
        ? entry.color
        : HOLIDAY_COLOR_PALETTE[result.length % HOLIDAY_COLOR_PALETTE.length],
    };
    if (region) calendar.region = region;
    if (data.groups) {
      calendar.groups = Array.isArray(entry.groups)
        ? data.groups.filter(group => (entry.groups as unknown[]).includes(group))
        : [...data.groups];
    }
    result.push(calendar);
  }
  return result;
}

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
  // Una regla con tema se ve solo si su tema está marcado; no mira la categoría ni la región
  if (rule.group !== undefined) return calendar.groups?.includes(rule.group) ?? false;
  if (rule.region !== undefined && rule.region !== calendar.region) return false;
  return rule.category === 'official' ? calendar.official : calendar.unofficial;
}

/**
 * ¿Alguno de los feriados del día es oficial? Solo un feriado oficial sombrea el día en el calendario; los no
 * oficiales (Día de las Madres, los días internacionales…) llevan su etiqueta pero el día se ve como cualquier otro.
 */
export function hasOfficialHoliday(holidays: readonly { official: boolean }[] | null | undefined): boolean {
  return holidays?.some(holiday => holiday.official) ?? false;
}

/**
 * Consulta día a día con los años ya calculados: cada vista pregunta por muchos días seguidos y solo se evalúa
 * un año completo la primera vez que se toca. Sin calendarios no calcula nada.
 */
export class HolidayLookup {
  private readonly years = new Map<number, Map<string, HolidayEntry[]>>();

  constructor(private readonly calendars: readonly HolidayCalendarConfig[]) {}

  get hasCalendars(): boolean {
    return this.calendars.length > 0;
  }

  /** Feriados de un día (fecha ISO `AAAA-MM-DD`), en el orden de los calendarios; vacío si no hay ninguno. */
  get(iso: string): readonly HolidayEntry[] {
    if (!this.hasCalendars) return NO_HOLIDAYS;
    const year = Number(iso.slice(0, 4));
    let entries = this.years.get(year);
    if (!entries) {
      entries = getHolidaysForRange(this.calendars, `${year}-01-01`, `${year}-12-31`);
      this.years.set(year, entries);
    }
    return entries.get(iso) ?? NO_HOLIDAYS;
  }
}

const NO_HOLIDAYS: readonly HolidayEntry[] = [];

let sharedLookup: { signature: string; lookup: HolidayLookup } | null = null;

/**
 * Consulta compartida por todas las vistas: se reutiliza mientras el ajuste no cambie y se rehace cuando cambia,
 * así un dibujado completo no recalcula los feriados de cada subvista.
 */
export function getHolidayLookup(calendars: readonly HolidayCalendarConfig[]): HolidayLookup {
  const signature = JSON.stringify(calendars);
  if (!sharedLookup || sharedLookup.signature !== signature) sharedLookup = { signature, lookup: new HolidayLookup(calendars) };
  return sharedLookup.lookup;
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
