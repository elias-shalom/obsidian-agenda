const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadSource } = require('./helpers/load-source.cjs');

const { evaluateRule, getEasterDate } = loadSource('core/holidays/holiday-rules.ts');
const {
  getHolidaysForRange, getHolidayCountries, getHolidayCountry, sanitizeHolidayCalendars, createHolidayCalendar,
  HolidayLookup, getHolidayLookup,
} = loadSource('core/holidays/holiday-calendar.ts');

const rule = (spec) => ({ id: 'r', nameKey: 'k', category: 'official', ...spec });

// --- Pascua -----------------------------------------------------------------

test('Pascua gregoriana en años conocidos', () => {
  const known = { 2000: '2000-04-23', 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28' };
  for (const [year, date] of Object.entries(known)) assert.equal(getEasterDate(Number(year)), date);
});

test('relativo a la Pascua: Jueves y Viernes Santo, domingo y Martes de Carnaval', () => {
  assert.equal(evaluateRule(rule({ type: 'easter', offset: -3 }), 2026), '2026-04-02');
  assert.equal(evaluateRule(rule({ type: 'easter', offset: -2 }), 2026), '2026-04-03');
  assert.equal(evaluateRule(rule({ type: 'easter', offset: 0 }), 2026), '2026-04-05');
  assert.equal(evaluateRule(rule({ type: 'easter', offset: -47 }), 2026), '2026-02-17');
});

// --- Fecha fija -------------------------------------------------------------

test('fecha fija y el 29 de febrero solo en bisiestos', () => {
  assert.equal(evaluateRule(rule({ type: 'fixed', month: 12, day: 25 }), 2026), '2026-12-25');
  assert.equal(evaluateRule(rule({ type: 'fixed', month: 2, day: 29 }), 2024), '2024-02-29');
  assert.equal(evaluateRule(rule({ type: 'fixed', month: 2, day: 29 }), 2025), null);
});

test('una fecha fija inválida da null en vez de rodar al mes siguiente', () => {
  assert.equal(evaluateRule(rule({ type: 'fixed', month: 4, day: 31 }), 2026), null);
  assert.equal(evaluateRule(rule({ type: 'fixed', month: 13, day: 1 }), 2026), null);
});

// --- N-ésimo día de la semana ----------------------------------------------

test('México: primer lunes de febrero, tercero de marzo y de noviembre', () => {
  const feb = rule({ type: 'nthWeekday', month: 2, weekday: 1, n: 1 });
  const mar = rule({ type: 'nthWeekday', month: 3, weekday: 1, n: 3 });
  const nov = rule({ type: 'nthWeekday', month: 11, weekday: 1, n: 3 });
  assert.deepEqual([2025, 2026, 2027].map(y => evaluateRule(feb, y)), ['2025-02-03', '2026-02-02', '2027-02-01']);
  assert.deepEqual([2025, 2026, 2027].map(y => evaluateRule(mar, y)), ['2025-03-17', '2026-03-16', '2027-03-15']);
  assert.deepEqual([2025, 2026, 2027].map(y => evaluateRule(nov, y)), ['2025-11-17', '2026-11-16', '2027-11-15']);
});

test('EE. UU.: Martin Luther King, Memorial Day y Acción de Gracias', () => {
  const mlk = rule({ type: 'nthWeekday', month: 1, weekday: 1, n: 3 });
  const memorial = rule({ type: 'nthWeekday', month: 5, weekday: 1, n: -1 });
  const thanksgiving = rule({ type: 'nthWeekday', month: 11, weekday: 4, n: 4 });
  assert.equal(evaluateRule(mlk, 2026), '2026-01-19');
  assert.equal(evaluateRule(memorial, 2025), '2025-05-26');
  assert.equal(evaluateRule(memorial, 2026), '2026-05-25');
  assert.equal(evaluateRule(memorial, 2027), '2027-05-31'); // el mes termina en lunes
  assert.equal(evaluateRule(thanksgiving, 2025), '2025-11-27');
  assert.equal(evaluateRule(thanksgiving, 2026), '2026-11-26');
});

test('el quinto día de la semana existe solo en algunos meses', () => {
  assert.equal(evaluateRule(rule({ type: 'nthWeekday', month: 1, weekday: 5, n: 5 }), 2026), '2026-01-30');
  assert.equal(evaluateRule(rule({ type: 'nthWeekday', month: 2, weekday: 1, n: 5 }), 2026), null);
});

test('n-ésimo día con parámetros inválidos da null', () => {
  assert.equal(evaluateRule(rule({ type: 'nthWeekday', month: 1, weekday: 8, n: 1 }), 2026), null);
  assert.equal(evaluateRule(rule({ type: 'nthWeekday', month: 1, weekday: 1, n: 0 }), 2026), null);
  assert.equal(evaluateRule(rule({ type: 'nthWeekday', month: 14, weekday: 1, n: 1 }), 2026), null);
});

// --- Observado --------------------------------------------------------------

const observedUs = (month, day) => rule({ type: 'observed', month, day, onSaturday: -1, onSunday: 1 });

test('observado: sábado pasa al viernes, domingo al lunes y entre semana no cambia', () => {
  assert.equal(evaluateRule(observedUs(7, 4), 2025), '2025-07-04'); // viernes
  assert.equal(evaluateRule(observedUs(7, 4), 2026), '2026-07-03'); // sábado
  assert.equal(evaluateRule(observedUs(7, 4), 2027), '2027-07-05'); // domingo
  assert.equal(evaluateRule(observedUs(12, 25), 2022), '2022-12-26'); // domingo
  assert.equal(evaluateRule(observedUs(12, 25), 2027), '2027-12-24'); // sábado
});

test('observado: el recorrido puede caer en el año anterior', () => {
  assert.equal(evaluateRule(observedUs(1, 1), 2028), '2027-12-31'); // 1 de enero de 2028 es sábado
});

// --- Ciclo de años ----------------------------------------------------------

test('ciclo de seis años: la transmisión del Poder Ejecutivo cae en 2018, 2024 y 2030', () => {
  const transmission = rule({ type: 'cycle', baseYear: 1934, every: 6, month: 12, day: 1 });
  for (const year of [1934, 2018, 2024, 2030]) assert.equal(evaluateRule(transmission, year), `${year}-12-01`);
  for (const year of [1933, 2019, 2023, 2025, 2026, 2029]) assert.equal(evaluateRule(transmission, year), null);
});

test('un ciclo inválido no produce fechas', () => {
  assert.equal(evaluateRule(rule({ type: 'cycle', baseYear: 2000, every: 0, month: 1, day: 1 }), 2000), null);
});

// --- Lista explícita --------------------------------------------------------

test('lista explícita: solo los años dados', () => {
  const explicit = rule({ type: 'explicit', dates: { 2026: '2026-10-12', 2027: '2027-10-11' } });
  assert.equal(evaluateRule(explicit, 2026), '2026-10-12');
  assert.equal(evaluateRule(explicit, 2027), '2027-10-11');
  assert.equal(evaluateRule(explicit, 2028), null);
});

// --- Datos de los países ----------------------------------------------------

test('hay datos de México y EE. UU.', () => {
  assert.deepEqual(getHolidayCountries().map(c => c.country).sort(), ['MX', 'US']);
  assert.equal(getHolidayCountry('FR'), undefined);
});

test('los datos son consistentes: ids únicos, regiones declaradas y reglas que se evalúan sin error', () => {
  for (const data of getHolidayCountries()) {
    const ids = data.rules.map(r => r.id);
    assert.equal(new Set(ids).size, ids.length, `ids repetidos en ${data.country}`);
    const regions = new Set(data.regions.map(r => r.code));
    for (const r of data.rules) {
      assert.match(r.nameKey, new RegExp(`^holiday_${data.country.toLowerCase()}_`));
      if (r.region !== undefined) assert.ok(regions.has(r.region), `${r.id}: región ${r.region} sin declarar`);
      for (let year = 1990; year <= 2100; year++) {
        const date = evaluateRule(r, year);
        if (r.type !== 'cycle') assert.match(date, /^\d{4}-\d{2}-\d{2}$/, `${data.country}/${r.id} en ${year}`);
      }
    }
  }
});

// --- Consulta por rango -----------------------------------------------------

const MX = { country: 'MX', official: true, unofficial: false, color: '#2e7d32' };
const US = { country: 'US', official: true, unofficial: false, color: '#1565c0' };

const datesOf = (map) => [...map.keys()].sort();

test('México 2026, solo oficiales y sin región: siete (el ciclo del 1 de diciembre no toca)', () => {
  assert.deepEqual(datesOf(getHolidaysForRange([MX], '2026-01-01', '2026-12-31')), [
    '2026-01-01', '2026-02-02', '2026-03-16', '2026-05-01', '2026-09-16', '2026-11-16', '2026-12-25',
  ]);
});

test('México 2024 incluye la transmisión del Poder Ejecutivo del 1 de diciembre', () => {
  const holidays = getHolidaysForRange([MX], '2024-12-01', '2024-12-01');
  assert.deepEqual(holidays.get('2024-12-01').map(h => h.ruleId), ['presidential-transmission']);
});

test('las categorías se filtran con las casillas Oficiales y No oficiales', () => {
  const unofficialOnly = getHolidaysForRange([{ ...MX, official: false, unofficial: true }], '2026-05-01', '2026-05-31');
  assert.deepEqual(unofficialOnly.get('2026-05-10').map(h => h.ruleId), ['mothers-day']);
  assert.equal(unofficialOnly.has('2026-05-01'), false);

  const none = getHolidaysForRange([{ ...MX, official: false, unofficial: false }], '2026-01-01', '2026-12-31');
  assert.equal(none.size, 0);
});

test('Semana Santa de México 2026 es no oficial', () => {
  const holidays = getHolidaysForRange([{ ...MX, official: false, unofficial: true }], '2026-04-01', '2026-04-06');
  assert.deepEqual(holidays.get('2026-04-02').map(h => h.ruleId), ['holy-thursday']);
  assert.deepEqual(holidays.get('2026-04-03').map(h => h.ruleId), ['good-friday']);
  assert.deepEqual(holidays.get('2026-04-05').map(h => h.ruleId), ['easter-sunday']);
});

test('la región suma sus reglas a las nacionales; sin región solo las nacionales', () => {
  const national = getHolidaysForRange([MX], '2026-05-01', '2026-05-31');
  assert.equal(national.has('2026-05-05'), false);

  const puebla = getHolidaysForRange([{ ...MX, region: 'PUE' }], '2026-05-01', '2026-05-31');
  assert.equal(puebla.get('2026-05-05')[0].region, 'PUE');
  assert.ok(puebla.has('2026-05-01'));

  const chiapas = getHolidaysForRange([{ ...MX, region: 'CHP' }], '2026-05-01', '2026-05-31');
  assert.equal(chiapas.has('2026-05-05'), false);
});

test('EE. UU. 2026: el 4 de julio se ve el viernes 3 y no el sábado 4', () => {
  const holidays = getHolidaysForRange([US], '2026-07-01', '2026-07-31');
  assert.deepEqual(datesOf(holidays), ['2026-07-03']);
  assert.equal(holidays.get('2026-07-03')[0].ruleId, 'independence-day');
});

test('un feriado observado del año siguiente aparece en un rango que no lo incluye por año', () => {
  const holidays = getHolidaysForRange([US], '2027-12-31', '2027-12-31');
  assert.deepEqual(holidays.get('2027-12-31').map(h => h.ruleId), ['new-year']);
  assert.equal(getHolidaysForRange([US], '2028-01-01', '2028-01-01').size, 0);
});

test('Mardi Gras de Luisiana es relativo a la Pascua', () => {
  const holidays = getHolidaysForRange([{ ...US, region: 'LA' }], '2026-02-01', '2026-02-28');
  assert.deepEqual(holidays.get('2026-02-17').map(h => h.ruleId), ['mardi-gras']);
});

test('con varios calendarios, cada feriado lleva el color de su calendario', () => {
  const holidays = getHolidaysForRange([MX, US], '2026-12-25', '2026-12-25');
  assert.deepEqual(holidays.get('2026-12-25').map(h => [h.country, h.color]), [['MX', '#2e7d32'], ['US', '#1565c0']]);
});

test('sin calendarios, país desconocido o rango invertido no hay feriados', () => {
  assert.equal(getHolidaysForRange([], '2026-01-01', '2026-12-31').size, 0);
  assert.equal(getHolidaysForRange([{ ...MX, country: 'FR' }], '2026-01-01', '2026-12-31').size, 0);
  assert.equal(getHolidaysForRange([MX], '2026-12-31', '2026-01-01').size, 0);
});

test('un rango de varios años devuelve los feriados de cada uno', () => {
  const holidays = getHolidaysForRange([MX], '2025-01-01', '2027-12-31');
  for (const date of ['2025-02-03', '2026-02-02', '2027-02-01', '2025-11-17', '2027-11-15']) assert.ok(holidays.has(date), date);
});

// --- Ajuste guardado (FE2) --------------------------------------------------

test('sanitizeHolidayCalendars: un valor que no es lista da «ninguno activo»', () => {
  for (const raw of [undefined, null, 'MX', 5, {}]) assert.deepEqual(sanitizeHolidayCalendars(raw), []);
});

test('sanitizeHolidayCalendars: conserva lo válido y descarta lo demás', () => {
  const result = sanitizeHolidayCalendars([
    { country: 'MX', region: 'PUE', official: true, unofficial: true, color: '#112233' },
    { country: 'FR', official: true, unofficial: false, color: '#112233' },
    null,
    'US',
    { country: 'US', official: false, unofficial: true, color: '#AABBCC' },
  ]);
  assert.deepEqual(result, [
    { country: 'MX', region: 'PUE', official: true, unofficial: true, color: '#112233' },
    { country: 'US', official: false, unofficial: true, color: '#AABBCC' },
  ]);
});

test('sanitizeHolidayCalendars: quita la región que el país no tiene y corrige color y casillas', () => {
  const [calendar] = sanitizeHolidayCalendars([{ country: 'US', region: 'PUE', color: 'rojo' }]);
  assert.equal('region' in calendar, false);
  assert.equal(calendar.official, true);
  assert.equal(calendar.unofficial, false);
  assert.match(calendar.color, /^#[0-9a-f]{6}$/i);
});

test('createHolidayCalendar: el primer país, solo oficiales y colores distintos', () => {
  const first = createHolidayCalendar(0);
  const second = createHolidayCalendar(1);
  assert.equal(first.country, getHolidayCountries()[0].country);
  assert.equal(first.official, true);
  assert.equal(first.unofficial, false);
  assert.notEqual(first.color, second.color);
  assert.deepEqual(sanitizeHolidayCalendars([first]), [first]);
});

// --- Consulta día a día (FE2) -----------------------------------------------

test('HolidayLookup: sin calendarios no devuelve nada', () => {
  const lookup = new HolidayLookup([]);
  assert.equal(lookup.hasCalendars, false);
  assert.deepEqual([...lookup.get('2026-12-25')], []);
});

test('HolidayLookup: responde por día y por año', () => {
  const lookup = new HolidayLookup([MX]);
  assert.deepEqual(lookup.get('2026-11-16').map(h => h.ruleId), ['revolution-day']);
  assert.deepEqual(lookup.get('2027-11-15').map(h => h.ruleId), ['revolution-day']);
  assert.deepEqual([...lookup.get('2026-11-17')], []);
});

test('HolidayLookup: un feriado observado de otro año se ve en su día recorrido', () => {
  assert.deepEqual(new HolidayLookup([US]).get('2027-12-31').map(h => h.ruleId), ['new-year']);
});

test('getHolidayLookup se reutiliza mientras el ajuste no cambia y se rehace cuando cambia', () => {
  const first = getHolidayLookup([MX]);
  assert.equal(getHolidayLookup([{ ...MX }]), first);
  const changed = getHolidayLookup([{ ...MX, official: false }]);
  assert.notEqual(changed, first);
  assert.deepEqual([...changed.get('2026-11-16')], []);
});

// --- Traducciones -----------------------------------------------------------

test('cada feriado y cada texto del ajuste tienen traducción en los 6 idiomas', () => {
  const { readFileSync } = require('node:fs');
  const path = require('node:path');
  const keys = new Set();
  for (const data of getHolidayCountries()) {
    keys.add(`holiday_country_${data.country.toLowerCase()}`);
    for (const r of data.rules) keys.add(r.nameKey);
  }
  for (const key of ['holiday_calendars', 'holiday_calendars_desc', 'holiday_calendars_empty', 'holiday_add_calendar',
    'holiday_remove_calendar', 'holiday_country', 'holiday_region', 'holiday_region_national', 'holiday_official',
    'holiday_unofficial', 'holiday_color']) keys.add(key);

  for (const locale of ['en', 'es', 'de', 'fr', 'it', 'pt']) {
    const translations = JSON.parse(readFileSync(path.join(__dirname, '..', 'src', 'locales', `${locale}.json`), 'utf8'));
    for (const key of keys) assert.ok(typeof translations[key] === 'string' && translations[key].trim() !== '', `${locale}: falta ${key}`);
  }
});
