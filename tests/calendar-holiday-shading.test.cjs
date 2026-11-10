const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { DateTime } = require('luxon');
const Handlebars = require('handlebars');
const { loadSource } = require('./helpers/load-source.cjs');
const nonWorkingDays = loadSource('core/non-working-days.ts');
const { hasOfficialHoliday } = loadSource('core/holidays/holiday-calendar.ts');
// Sombreado de los feriados (v1.1.15): un día con un feriado oficial lleva la clase `oa-calendar-holiday-day`, que se
// sombrea igual que un día no laborable, en Mes, Semana, Semana laboral, Lista y Día (columna entera). Los feriados no
// oficiales llevan su etiqueta pero no sombrean. El Año ya lo marca con su punto y el Gantt con su columna tintada.
const hbs = Handlebars.create();
hbs.registerHelper('t', key => key);
hbs.registerHelper('hasOfficialHoliday', holidays => hasOfficialHoliday(holidays));
hbs.registerHelper('equals', function (a, b, options) { return a === b ? options.fn(this) : options.inverse(this); });
hbs.registerHelper('isTaskDone', status => status === 'x');
hbs.registerHelper('toISODate', date => (date && date.toISODate ? date.toISODate() : ''));
for (const name of ['formatDateHeader', 'formatHour', 'formatFullDate', 'formatMonth', 'getDayOfMonth', 'formatDate']) hbs.registerHelper(name, () => '');
hbs.registerHelper('eq', (a, b) => a === b);
hbs.registerPartial('calendarHabitChip', '');

const templatesDir = path.join(__dirname, '..', 'src', 'views', 'templates');
const render = (name, data) => hbs.compile(readFileSync(path.join(templatesDir, name), 'utf8'))(data);

const HOLIDAY = [{ name: 'Revolution Day', color: '#c33', official: true }];
const UNOFFICIAL = [{ name: 'Mother\'s Day', color: '#c33', official: false }];
const date = (iso) => DateTime.fromISO(iso);
const weekDay = (iso, extra = {}) => ({ date: date(iso), isToday: false, isSelected: false, dayOfMonth: 1, dayName: 'x', holidays: [], tasksForDay: [], habits: null, ...extra });
const count = (html, cls) => (html.match(new RegExp(`class="[^"]*\\b${cls}\\b`, 'g')) ?? []).length;
const SHADE = 'oa-calendar-holiday-day';

test('Mes sombrea solo el día con feriado y lo suma al sombreado de no laborable', () => {
  const days = [weekDay('2026-11-16', { holidays: HOLIDAY }), weekDay('2026-11-17'), weekDay('2026-11-21', { isNonWorking: true, holidays: HOLIDAY }), weekDay('2026-11-22', { isNonWorking: true })];
  const html = render('calendar-month-view.hbs', { calendar: { viewType: 'month', weeks: [{ days, weekNumber: 47 }], dayNames: [] } });

  assert.equal(count(html, SHADE), 2);
  assert.match(html, /oa-calendar-month-day[^"]*oa-calendar-holiday-day" data-date="2026-11-16"/);
  assert.equal(/oa-calendar-holiday-day" data-date="2026-11-17"/.test(html), false);
  assert.match(html, /oa-calendar-non-working oa-calendar-holiday-day" data-date="2026-11-21"/, 'fin de semana con feriado: las dos clases');
  assert.equal(count(html, 'oa-calendar-non-working'), 2, 'el feriado no hace no laborable al día');
});

test('Semana, Semana laboral y Lista sombrean solo los días con feriado', () => {
  for (const [file, viewType, cell] of [
    ['calendar-week-view.hbs', 'week', 'oa-calendar-week-day-container'],
    ['calendar-workweek-view.hbs', 'workweek', 'oa-calendar-week-day-container'],
    ['calendar-list-view.hbs', 'list', 'oa-calendar-list-row'],
  ]) {
    const days = [weekDay('2026-11-16', { holidays: HOLIDAY }), weekDay('2026-11-17'), weekDay('2026-11-18')];
    const html = render(file, { calendar: { viewType, days, dayNames: [], weekNumber: 47 } });
    assert.equal(count(html, SHADE), 1, viewType);
    assert.match(html, new RegExp(`${cell}[^"]*oa-calendar-holiday-day" data-date="2026-11-16"`), viewType);
  }
});

test('un día sin feriados no lleva la clase en ninguna vista', () => {
  const days = [weekDay('2026-11-17'), weekDay('2026-11-18')];
  for (const [file, viewType] of [['calendar-week-view.hbs', 'week'], ['calendar-workweek-view.hbs', 'workweek'], ['calendar-list-view.hbs', 'list']]) {
    assert.equal(render(file, { calendar: { viewType, days, dayNames: [] } }).includes(SHADE), false, viewType);
  }
  const month = render('calendar-month-view.hbs', { calendar: { viewType: 'month', weeks: [{ days, weekNumber: 47 }], dayNames: [] } });
  assert.equal(month.includes(SHADE), false);
});

const column = (dateIso, holidays, isNonWorking = false) => ({ dateIso, dayName: 'x', dayOfMonth: 1, isToday: false, isReferenceDay: false, allDayDue: [], allDayStart: [], allDayScheduled: [], holidays, isNonWorking, habits: null });
const slot = (dateIso, isOfficialHoliday, isNonWorking = false) => ({ dateIso, upperHalfSegments: [], lowerHalfSegments: [], hasDurationSegments: false, isOfficialHoliday, isNonWorking });
const dayHtml = (columns, hourRows) => render('calendar-day-view.hbs', { settings: {}, calendar: { viewType: 'day', daysToShow: columns.length, periodName: 'x', columns, hourRows } });

test('los feriados no oficiales no sombrean el día en ninguna vista, ni siquiera en Día', () => {
  const days = [weekDay('2026-11-16', { holidays: UNOFFICIAL }), weekDay('2026-11-17', { holidays: [...UNOFFICIAL, ...HOLIDAY] })];
  for (const [file, viewType] of [['calendar-week-view.hbs', 'week'], ['calendar-workweek-view.hbs', 'workweek'], ['calendar-list-view.hbs', 'list']]) {
    const html = render(file, { calendar: { viewType, days, dayNames: [] } });
    assert.equal(count(html, SHADE), 1, viewType);
    assert.equal(/oa-calendar-holiday-day" data-date="2026-11-16"/.test(html), false, viewType);
  }
  const month = render('calendar-month-view.hbs', { calendar: { viewType: 'month', weeks: [{ days, weekNumber: 47 }], dayNames: [] } });
  assert.equal(count(month, SHADE), 1);

  const html = dayHtml([column('2026-11-16', UNOFFICIAL)], [{ hour: 0, formattedHour: '0', columns: [slot('2026-11-16', false)] }]);
  assert.equal(html.includes(SHADE), false);
});

test('Día sombrea la columna entera: encabezado, «Todo el día» y cada franja de hora', () => {
  const columns = [column('2026-11-16', HOLIDAY), column('2026-11-17', [])];
  const hourRows = [0, 1, 2].map(hour => ({ hour, formattedHour: `${hour}`, columns: [slot('2026-11-16', true), slot('2026-11-17', false)] }));
  const html = dayHtml(columns, hourRows);

  assert.match(html, /oa-calendar-day-column-header[^"]*oa-calendar-holiday-day" data-date="2026-11-16"/);
  assert.equal(/oa-calendar-day-column-header[^"]*oa-calendar-holiday-day" data-date="2026-11-17"/.test(html), false);
  assert.match(html, /oa-calendar-allday-content oa-calendar-holiday-day" data-date="2026-11-16"/);
  assert.equal(/oa-calendar-allday-content oa-calendar-holiday-day" data-date="2026-11-17"/.test(html), false);
  assert.equal(count(html, SHADE), 1 + 1 + 3, 'encabezado, todo el día y tres franjas de la columna con feriado');
  assert.equal((html.match(/oa-calendar-hour-slot oa-calendar-holiday-day" data-hour="\d" data-date="2026-11-16"/g) ?? []).length, 3);
});

test('Día sombrea también los días no laborables: encabezado, «Todo el día» y cada franja de hora', () => {
  const columns = [column('2026-11-20', [], false), column('2026-11-21', [], true)];
  const hourRows = [0, 1, 2].map(hour => ({ hour, formattedHour: `${hour}`, columns: [slot('2026-11-20', false, false), slot('2026-11-21', false, true)] }));
  const html = dayHtml(columns, hourRows);

  assert.match(html, /oa-calendar-day-column-header[^"]*oa-calendar-non-working[^"]*" data-date="2026-11-21"/);
  assert.equal(/oa-calendar-day-column-header[^"]*oa-calendar-non-working[^"]*" data-date="2026-11-20"/.test(html), false);
  assert.match(html, /oa-calendar-allday-content oa-calendar-non-working" data-date="2026-11-21"/);
  assert.equal((html.match(/oa-calendar-hour-slot oa-calendar-non-working" data-hour="\d" data-date="2026-11-21"/g) ?? []).length, 3);
  assert.equal(count(html, 'oa-calendar-non-working'), 1 + 1 + 3);
  assert.equal(count(html, SHADE), 0, 'un fin de semana sin feriado no lleva la clase de feriado');
});

test('Día suma las dos clases cuando el fin de semana es además feriado', () => {
  const html = dayHtml([column('2026-11-21', HOLIDAY, true)], [{ hour: 0, formattedHour: '0', columns: [slot('2026-11-21', true, true)] }]);
  assert.match(html, /oa-calendar-day-column-header[^"]*oa-calendar-non-working oa-calendar-holiday-day" data-date="2026-11-21"/);
  assert.match(html, /oa-calendar-hour-slot oa-calendar-non-working oa-calendar-holiday-day" data-hour="0"/);
});

// --- Los datos de la vista Día -----------------------------------------------------------

function loadDayView() {
  class CalendarView {
    constructor(_leaf, plugin) { this.plugin = plugin; }
    getNonWorkingDays() { return this.plugin.settings.nonWorkingDays; }
    isNonWorking(day) { return nonWorkingDays.isNonWorkingDay(day, this.getNonWorkingDays()); }
    getHolidays(day) { return (this.holidaysByDate.get(day.toISODate()) ?? []); }
    getTasksForDate() { return []; }
    getHabitDay() { return null; }
    formatHour(hour) { return String(hour); }
  }
  const stubs = {
    obsidian: { setIcon() {} },
    './calendar-view': { CalendarView },
    '../core/task-line-fields': {},
    '../core/calendar-date-picker': { CalendarDatePicker: class {} },
    '../core/holidays/holiday-calendar': { hasOfficialHoliday },
  };
  return loadSource('views/calendar-day-view.ts', stubs).CalendarDayView;
}

function dayData(currentIso, holidaysByDate = new Map(), nonWorking = [6, 7]) {
  const View = loadDayView();
  const view = new View({}, { settings: { nonWorkingDays: nonWorking } }, {}, {});
  view.app = { loadLocalStorage: () => null };
  view.currentDate = date(currentIso);
  view.holidaysByDate = holidaysByDate;
  return view.generateViewData();
}

test('la vista Día marca en sus datos el fin de semana y el feriado de la columna y de cada franja de hora', () => {
  // 2026-11-20 es viernes; 21 y 22, fin de semana
  const holidays = new Map([['2026-11-21', HOLIDAY], ['2026-11-23', HOLIDAY]]);
  const data = dayData('2026-11-22', holidays);
  assert.equal(data.columns.length, 1, 'por defecto una columna');

  const wide = (() => {
    const View = loadDayView();
    const view = new View({}, { settings: { nonWorkingDays: [6, 7] } }, {}, {});
    view.app = { loadLocalStorage: () => '5' };
    view.currentDate = date('2026-11-22');
    view.holidaysByDate = holidays;
    return view.generateViewData();
  })();

  assert.deepEqual(wide.columns.map(col => col.dateIso), ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24']);
  assert.deepEqual(wide.columns.map(col => col.isNonWorking), [false, true, true, false, false]);
  assert.deepEqual(wide.columns.map(col => col.holidays.length > 0), [false, true, false, true, false]);

  for (const row of wide.hourRows) {
    assert.deepEqual(row.columns.map(slotData => slotData.isNonWorking), [false, true, true, false, false]);
    assert.deepEqual(row.columns.map(slotData => slotData.isOfficialHoliday), [false, true, false, true, false]);
  }
});

test('la vista Día no marca como feriado de sombreado un día con solo feriados no oficiales', () => {
  const holidays = new Map([['2026-11-20', UNOFFICIAL], ['2026-11-21', [...UNOFFICIAL, ...HOLIDAY]]]);
  const data = dayData('2026-11-20', holidays);
  assert.equal(data.columns[0].holidays.length, 1, 'la etiqueta se conserva');
  assert.equal(data.hourRows[0].columns[0].isOfficialHoliday, false);
  assert.equal(dayData('2026-11-21', holidays).hourRows[0].columns[0].isOfficialHoliday, true, 'basta un oficial entre varios');
});

test('la vista Día sigue el ajuste de días no laborables', () => {
  const data = dayData('2026-11-18', new Map(), [3]);
  assert.equal(data.columns[0].isNonWorking, true, 'el 18 de noviembre de 2026 es miércoles');
  assert.equal(dayData('2026-11-18', new Map(), [6, 7]).columns[0].isNonWorking, false);
});

test('el sombreado de feriado y el de no laborable comparten el mismo estilo', () => {
  const scss = readFileSync(path.join(__dirname, '..', 'src', 'styles', 'views', '_calendar-common.scss'), 'utf8');
  assert.match(scss, /&\.oa-calendar-non-working,\s*&\.oa-calendar-holiday-day\s*\{\s*background-image: \$calendar-day-shade;/);
  assert.match(scss, /\.oa-calendar-day-column-header,\s*\.oa-calendar-allday-content,\s*\.oa-calendar-hour-slot\s*\{\s*&\.oa-calendar-non-working,\s*&\.oa-calendar-holiday-day\s*\{\s*background-image: \$calendar-day-shade;/);
});
