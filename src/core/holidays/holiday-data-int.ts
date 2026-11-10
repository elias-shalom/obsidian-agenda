// src/core/holidays/holiday-data-int.ts
// Días internacionales (v1.1.15): efemérides de la ONU y de organismos internacionales, no feriados legales. Todas son
// «no oficiales», de fecha fija y se agrupan en cuatro temas que el usuario marca en el calendario «Internacional».
// Las fechas están escritas de memoria; los nombres se traducen con `holiday_int_*`.
import type { HolidayCountryData, HolidayRule } from './holiday-rules';

export const INT_GROUPS = ['women-children', 'health', 'environment', 'society-rights'] as const;

export type InternationalGroup = typeof INT_GROUPS[number];

/** Clave de traducción del nombre de un tema (`holiday_group_women_children`…). */
export const intGroupLabelKey = (group: string): string => `holiday_group_${group.replace(/-/g, '_')}`;

const day = (id: string, month: number, dayOfMonth: number, group: InternationalGroup): HolidayRule => ({
  id,
  nameKey: `holiday_int_${id.replace(/-/g, '_')}`,
  category: 'unofficial',
  type: 'fixed',
  month,
  day: dayOfMonth,
  group,
});

export const INT_HOLIDAYS: HolidayCountryData = {
  country: 'INT',
  regions: [],
  groups: INT_GROUPS,
  rules: [
    // Mujer e infancia
    day('girls-in-science', 2, 11, 'women-children'),
    day('womens-day', 3, 8, 'women-children'),
    day('child-labour', 6, 12, 'women-children'),
    day('girl-child', 10, 11, 'women-children'),
    day('childrens-day', 11, 20, 'women-children'),
    day('violence-against-women', 11, 25, 'women-children'),

    // Salud
    day('cancer', 2, 4, 'health'),
    day('autism', 4, 2, 'health'),
    day('health', 4, 7, 'health'),
    day('no-tobacco', 5, 31, 'health'),
    day('blood-donor', 6, 14, 'health'),
    day('mental-health', 10, 10, 'health'),
    day('food', 10, 16, 'health'),
    day('diabetes', 11, 14, 'health'),
    day('aids', 12, 1, 'health'),

    // Medio ambiente
    day('wetlands', 2, 2, 'environment'),
    day('wildlife', 3, 3, 'environment'),
    day('forests', 3, 21, 'environment'),
    day('water', 3, 22, 'environment'),
    day('earth', 4, 22, 'environment'),
    day('biodiversity', 5, 22, 'environment'),
    day('environment', 6, 5, 'environment'),
    day('oceans', 6, 8, 'environment'),
    day('animals', 10, 4, 'environment'),

    // Sociedad y derechos
    day('braille', 1, 4, 'society-rights'),
    day('education', 1, 24, 'society-rights'),
    day('holocaust', 1, 27, 'society-rights'),
    day('social-justice', 2, 20, 'society-rights'),
    day('mother-language', 2, 21, 'society-rights'),
    day('happiness', 3, 20, 'society-rights'),
    day('racial-discrimination', 3, 21, 'society-rights'),
    day('poetry', 3, 21, 'society-rights'),
    day('book', 4, 23, 'society-rights'),
    day('workers', 5, 1, 'society-rights'),
    day('press-freedom', 5, 3, 'society-rights'),
    day('families', 5, 15, 'society-rights'),
    day('internet', 5, 17, 'society-rights'),
    day('refugees', 6, 20, 'society-rights'),
    day('yoga', 6, 21, 'society-rights'),
    day('population', 7, 11, 'society-rights'),
    day('mandela', 7, 18, 'society-rights'),
    day('human-trafficking', 7, 30, 'society-rights'),
    day('indigenous-peoples', 8, 9, 'society-rights'),
    day('youth', 8, 12, 'society-rights'),
    day('humanitarian', 8, 19, 'society-rights'),
    day('literacy', 9, 8, 'society-rights'),
    day('peace', 9, 21, 'society-rights'),
    day('tourism', 9, 27, 'society-rights'),
    day('older-persons', 10, 1, 'society-rights'),
    day('teachers', 10, 5, 'society-rights'),
    day('poverty', 10, 17, 'society-rights'),
    day('united-nations', 10, 24, 'society-rights'),
    day('tolerance', 11, 16, 'society-rights'),
    day('mens-day', 11, 19, 'society-rights'),
    day('disabilities', 12, 3, 'society-rights'),
    day('volunteers', 12, 5, 'society-rights'),
    day('human-rights', 12, 10, 'society-rights'),
    day('migrants', 12, 18, 'society-rights'),
  ],
};
