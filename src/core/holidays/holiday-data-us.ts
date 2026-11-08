// src/core/holidays/holiday-data-us.ts
// Feriados de EE. UU. (v1.1.15, Fase FE1). Oficiales: los federales (5 U.S.C. § 6103); los de fecha fija se
// recorren (sábado → viernes, domingo → lunes). No oficiales: fechas que se celebran sin ser feriado federal.
// Regiones: estados con un feriado propio; añadir uno es añadir su código y sus reglas.
import type { HolidayCountryData, HolidayRuleSpec } from './holiday-rules';

const observed = (month: number, day: number): HolidayRuleSpec => ({ type: 'observed', month, day, onSaturday: -1, onSunday: 1 });

export const US_HOLIDAYS: HolidayCountryData = {
  country: 'US',
  regions: [
    { code: 'AK', name: 'Alaska' },
    { code: 'CA', name: 'California' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'ME', name: 'Maine' },
    { code: 'TX', name: 'Texas' },
  ],
  rules: [
    // Oficiales (federales)
    { id: 'new-year', nameKey: 'holiday_us_new_year', category: 'official', ...observed(1, 1) },
    { id: 'mlk-day', nameKey: 'holiday_us_mlk_day', category: 'official', type: 'nthWeekday', month: 1, weekday: 1, n: 3 },
    { id: 'presidents-day', nameKey: 'holiday_us_presidents_day', category: 'official', type: 'nthWeekday', month: 2, weekday: 1, n: 3 },
    { id: 'memorial-day', nameKey: 'holiday_us_memorial_day', category: 'official', type: 'nthWeekday', month: 5, weekday: 1, n: -1 },
    { id: 'juneteenth', nameKey: 'holiday_us_juneteenth', category: 'official', ...observed(6, 19) },
    { id: 'independence-day', nameKey: 'holiday_us_independence_day', category: 'official', ...observed(7, 4) },
    { id: 'labor-day', nameKey: 'holiday_us_labor_day', category: 'official', type: 'nthWeekday', month: 9, weekday: 1, n: 1 },
    { id: 'columbus-day', nameKey: 'holiday_us_columbus_day', category: 'official', type: 'nthWeekday', month: 10, weekday: 1, n: 2 },
    { id: 'veterans-day', nameKey: 'holiday_us_veterans_day', category: 'official', ...observed(11, 11) },
    { id: 'thanksgiving', nameKey: 'holiday_us_thanksgiving', category: 'official', type: 'nthWeekday', month: 11, weekday: 4, n: 4 },
    { id: 'christmas', nameKey: 'holiday_us_christmas', category: 'official', ...observed(12, 25) },

    // No oficiales
    { id: 'valentines-day', nameKey: 'holiday_us_valentines_day', category: 'unofficial', type: 'fixed', month: 2, day: 14 },
    { id: 'st-patricks-day', nameKey: 'holiday_us_st_patricks_day', category: 'unofficial', type: 'fixed', month: 3, day: 17 },
    { id: 'good-friday', nameKey: 'holiday_us_good_friday', category: 'unofficial', type: 'easter', offset: -2 },
    { id: 'easter-sunday', nameKey: 'holiday_us_easter_sunday', category: 'unofficial', type: 'easter', offset: 0 },
    { id: 'mothers-day', nameKey: 'holiday_us_mothers_day', category: 'unofficial', type: 'nthWeekday', month: 5, weekday: 7, n: 2 },
    { id: 'fathers-day', nameKey: 'holiday_us_fathers_day', category: 'unofficial', type: 'nthWeekday', month: 6, weekday: 7, n: 3 },
    { id: 'halloween', nameKey: 'holiday_us_halloween', category: 'unofficial', type: 'fixed', month: 10, day: 31 },
    { id: 'christmas-eve', nameKey: 'holiday_us_christmas_eve', category: 'unofficial', type: 'fixed', month: 12, day: 24 },
    { id: 'new-years-eve', nameKey: 'holiday_us_new_years_eve', category: 'unofficial', type: 'fixed', month: 12, day: 31 },

    // Regionales
    { id: 'seward-day', nameKey: 'holiday_us_seward_day', category: 'official', region: 'AK', type: 'nthWeekday', month: 3, weekday: 1, n: -1 },
    { id: 'alaska-day', nameKey: 'holiday_us_alaska_day', category: 'official', region: 'AK', type: 'fixed', month: 10, day: 18 },
    { id: 'cesar-chavez-day', nameKey: 'holiday_us_cesar_chavez_day', category: 'official', region: 'CA', type: 'fixed', month: 3, day: 31 },
    { id: 'prince-kuhio-day', nameKey: 'holiday_us_prince_kuhio_day', category: 'official', region: 'HI', type: 'fixed', month: 3, day: 26 },
    { id: 'kamehameha-day', nameKey: 'holiday_us_kamehameha_day', category: 'official', region: 'HI', type: 'fixed', month: 6, day: 11 },
    { id: 'mardi-gras', nameKey: 'holiday_us_mardi_gras', category: 'official', region: 'LA', type: 'easter', offset: -47 },
    { id: 'patriots-day-ma', nameKey: 'holiday_us_patriots_day', category: 'official', region: 'MA', type: 'nthWeekday', month: 4, weekday: 1, n: 3 },
    { id: 'patriots-day-me', nameKey: 'holiday_us_patriots_day', category: 'official', region: 'ME', type: 'nthWeekday', month: 4, weekday: 1, n: 3 },
    { id: 'texas-independence-day', nameKey: 'holiday_us_texas_independence_day', category: 'official', region: 'TX', type: 'fixed', month: 3, day: 2 },
    { id: 'san-jacinto-day', nameKey: 'holiday_us_san_jacinto_day', category: 'official', region: 'TX', type: 'fixed', month: 4, day: 21 },
  ],
};
