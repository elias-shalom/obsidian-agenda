// src/core/holidays/holiday-data-mx.ts
// Feriados de México (v1.1.15, Fase FE1). Oficiales: los de la Ley Federal del Trabajo, art. 74 (los de febrero,
// marzo y noviembre se corren al lunes, como en la ley; el 1 de diciembre solo cada seis años, por la transmisión
// del Poder Ejecutivo). No oficiales: fechas que se celebran sin ser descanso obligatorio.
// Regiones: solo hay reglas regionales para los estados listados; añadir uno es añadir su código y sus reglas.
import type { HolidayCountryData } from './holiday-rules';

export const MX_HOLIDAYS: HolidayCountryData = {
  country: 'MX',
  regions: [
    { code: 'CHP', name: 'Chiapas' },
    { code: 'PUE', name: 'Puebla' },
  ],
  rules: [
    // Oficiales
    { id: 'new-year', nameKey: 'holiday_mx_new_year', category: 'official', type: 'fixed', month: 1, day: 1 },
    { id: 'constitution-day', nameKey: 'holiday_mx_constitution_day', category: 'official', type: 'nthWeekday', month: 2, weekday: 1, n: 1 },
    { id: 'benito-juarez', nameKey: 'holiday_mx_benito_juarez', category: 'official', type: 'nthWeekday', month: 3, weekday: 1, n: 3 },
    { id: 'labor-day', nameKey: 'holiday_mx_labor_day', category: 'official', type: 'fixed', month: 5, day: 1 },
    { id: 'independence-day', nameKey: 'holiday_mx_independence_day', category: 'official', type: 'fixed', month: 9, day: 16 },
    { id: 'revolution-day', nameKey: 'holiday_mx_revolution_day', category: 'official', type: 'nthWeekday', month: 11, weekday: 1, n: 3 },
    { id: 'presidential-transmission', nameKey: 'holiday_mx_presidential_transmission', category: 'official', type: 'cycle', baseYear: 1934, every: 6, month: 12, day: 1 },
    { id: 'christmas', nameKey: 'holiday_mx_christmas', category: 'official', type: 'fixed', month: 12, day: 25 },

    // No oficiales
    { id: 'epiphany', nameKey: 'holiday_mx_epiphany', category: 'unofficial', type: 'fixed', month: 1, day: 6 },
    { id: 'valentines-day', nameKey: 'holiday_mx_valentines_day', category: 'unofficial', type: 'fixed', month: 2, day: 14 },
    { id: 'flag-day', nameKey: 'holiday_mx_flag_day', category: 'unofficial', type: 'fixed', month: 2, day: 24 },
    { id: 'holy-thursday', nameKey: 'holiday_mx_holy_thursday', category: 'unofficial', type: 'easter', offset: -3 },
    { id: 'good-friday', nameKey: 'holiday_mx_good_friday', category: 'unofficial', type: 'easter', offset: -2 },
    { id: 'easter-sunday', nameKey: 'holiday_mx_easter_sunday', category: 'unofficial', type: 'easter', offset: 0 },
    { id: 'childrens-day', nameKey: 'holiday_mx_childrens_day', category: 'unofficial', type: 'fixed', month: 4, day: 30 },
    { id: 'mothers-day', nameKey: 'holiday_mx_mothers_day', category: 'unofficial', type: 'fixed', month: 5, day: 10 },
    { id: 'fathers-day', nameKey: 'holiday_mx_fathers_day', category: 'unofficial', type: 'nthWeekday', month: 6, weekday: 7, n: 3 },
    { id: 'grito', nameKey: 'holiday_mx_grito', category: 'unofficial', type: 'fixed', month: 9, day: 15 },
    { id: 'day-of-the-dead', nameKey: 'holiday_mx_day_of_the_dead', category: 'unofficial', type: 'fixed', month: 11, day: 2 },
    { id: 'guadalupe', nameKey: 'holiday_mx_guadalupe', category: 'unofficial', type: 'fixed', month: 12, day: 12 },
    { id: 'christmas-eve', nameKey: 'holiday_mx_christmas_eve', category: 'unofficial', type: 'fixed', month: 12, day: 24 },
    { id: 'new-years-eve', nameKey: 'holiday_mx_new_years_eve', category: 'unofficial', type: 'fixed', month: 12, day: 31 },

    // Regionales
    { id: 'battle-of-puebla', nameKey: 'holiday_mx_battle_of_puebla', category: 'official', region: 'PUE', type: 'fixed', month: 5, day: 5 },
    { id: 'chiapas-incorporation', nameKey: 'holiday_mx_chiapas_incorporation', category: 'official', region: 'CHP', type: 'fixed', month: 9, day: 14 },
  ],
};
