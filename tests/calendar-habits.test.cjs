const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { DateTime } = require('luxon');
const RealHandlebars = require('handlebars');
const { loadSource } = require('./helpers/load-source.cjs');

// Hábitos en el calendario (v1.1.15, HC1) en `CalendarView`: el modelo de un día (chip, franjas, vacaciones), el
// filtro «Hábitos» y su disponibilidad, y las plantillas que dibujan el chip y la sección del Día.
const calendarState = loadSource('core/calendar-state.ts');

const partials = {};
const fakeHandlebars = { __esModule: true, default: { registerPartial: (name, source) => { partials[name] = source; }, registerHelper() {} } };

function loadCalendarView() {
  class BaseView {
    constructor() {
      this.app = { storage: new Map(), loadLocalStorage(key) { return this.storage.get(key) ?? null; }, saveLocalStorage(key, value) { this.storage.set(key, value); } };
    }
  }
  const stubs = {
    obsidian: { Notice: class {}, setIcon() {} },
    handlebars: fakeHandlebars,
    '../views/base-view': { BaseView },
    '../core/task-writer': { TaskWriter: class {} },
    '../core/task-line-fields': {},
    '../core/task-gestures': { attachTaskGestures() {}, TASK_CLICK_DELAY_MS: 250 },
    '../core/calendar-date-picker': { CalendarDatePicker: class {} },
    '../core/tooltips': { clearTooltips() {}, installTooltips() {} },
    '../core/task-filter-bar': { TaskFilterBar: class {} },
  };
  const { CalendarView } = loadSource('views/calendar-view.ts', stubs);
  class TestView extends CalendarView {
    generateViewData() { return {}; }
    getViewType() { return 'calendar-month-view'; }
  }
  return TestView;
}

const TestView = loadCalendarView();

function makeHabit(overrides = {}) {
  const { completions = {}, ...rest } = overrides;
  return {
    file: { basename: 'h', path: `habits/${rest.title ?? 'h'}.md` }, name: 'h', title: 'h', description: '', time: 0, area: 'physical', subArea: '',
    related: [], relatedFile: '', frequencySet: new Set([1, 2, 3, 4, 5, 6, 7]), priority: 3, daytimes: ['morning'],
    color: '', maxGap: 0, status: 'active', activeFrom: null, activeUntil: null, completions, entries: new Set(Object.keys(completions)), ...rest,
  };
}

const t = (key, params) => (params ? `${key}(${Object.values(params).join(',')})` : key);

/** Una vista con un gestor de hábitos simulado; `habits` y `vacations` se pueden cambiar entre pruebas. */
function makeView({ habits = [], vacations = [], settings = {}, withManager = true } = {}) {
  const manager = withManager
    ? { getHabits: () => habits.filter(habit => habit.status !== 'inactive'), getCalcContext: () => ({ vacations }), waitForInitialCache: async () => {} }
    : null;
  const plugin = { settings: { showHabitTab: true, ...settings }, ...(manager ? { getHabitManager: () => manager } : {}) };
  const view = new TestView({}, plugin, { t }, {});
  view.tasks = [];
  view.visibleTasks = [];
  view.currentDate = DateTime.fromISO('2026-03-04');
  return view;
}

const DATE = DateTime.fromISO('2026-03-04');

// --- El modelo de un día -----------------------------------------------------------

test('con hábitos y el filtro por defecto cada día trae su chip y sus franjas', () => {
  const view = makeView({ habits: [
    makeHabit({ title: 'Agua', daytimes: ['wake up'], completions: { '2026-03-04': ['wake up'] } }),
    makeHabit({ title: 'Leer', daytimes: ['morning'] }),
  ] });
  view.buildCalendarViewData();

  const day = view.getHabitDay(DATE);
  assert.deepEqual([day.date, day.label, day.done, day.total, day.vacation], ['2026-03-04', '1/2', 1, 2, false]);
  assert.equal(day.tooltip, 'calendar_habits_summary(1,2)');
  assert.deepEqual(day.groups.map(group => [group.daytime, group.label, group.rows.map(row => row.title)]), [
    ['wake up', 'habit_daytime_wake_up', ['Agua']],
    ['morning', 'habit_daytime_morning', ['Leer']],
  ]);
  const [agua] = day.groups[0].rows;
  assert.deepEqual([agua.id, agua.ticked, agua.muted], ['habits/Agua.md::wake up', true, false]);
  assert.match(agua.areaColor, /^#|^hsl|^rgb/);
});

test('un día en que no toca ningún hábito no tiene chip', () => {
  const view = makeView({ habits: [makeHabit({ frequencySet: new Set([6, 7]) })] });
  view.buildCalendarViewData();
  assert.equal(view.getHabitDay(DATE), null);
  assert.notEqual(view.getHabitDay(DateTime.fromISO('2026-03-07')), null);
});

test('«Hábitos» desmarcado oculta todos los hábitos', () => {
  const view = makeView({ habits: [makeHabit()] });
  view.calendarState = calendarState.parseCalendarState({ habits: 'hide' });
  view.buildCalendarViewData();
  assert.equal(view.getHabitDay(DATE), null);
  assert.deepEqual(view.visibleHabits, []);
});

test('el área y la búsqueda de la barra filtran los hábitos del chip', () => {
  const habits = [makeHabit({ title: 'Agua', area: 'physical' }), makeHabit({ title: 'Leer', area: 'mind' })];
  const view = makeView({ habits });
  view.calendarState = calendarState.parseCalendarState({ areas: ['mind'] });
  view.buildCalendarViewData();
  assert.deepEqual([view.getHabitDay(DATE).label, view.getHabitDay(DATE).groups[0].rows[0].title], ['0/1', 'Leer']);

  view.calendarState = calendarState.parseCalendarState({ search: 'agua' });
  view.buildCalendarViewData();
  assert.equal(view.getHabitDay(DATE).groups[0].rows[0].title, 'Agua');

  view.calendarState = calendarState.parseCalendarState({ search: 'nada' });
  view.buildCalendarViewData();
  assert.equal(view.getHabitDay(DATE), null);
});

test('un hábito inactivo no se dibuja', () => {
  const view = makeView({ habits: [makeHabit({ status: 'inactive' })] });
  view.buildCalendarViewData();
  assert.equal(view.getHabitDay(DATE), null);
});

// --- Vacaciones ------------------------------------------------------------------------

const VACATION = { from: '2026-03-04', to: '2026-03-05', name: 'Viaje' };

test('en vacaciones con una marca el chip cuenta solo el marcado y lleva la marca de vacaciones', () => {
  const view = makeView({
    habits: [makeHabit({ title: 'Agua', completions: { '2026-03-04': ['morning'] } }), makeHabit({ title: 'Leer' })],
    vacations: [VACATION],
  });
  view.buildCalendarViewData();

  const day = view.getHabitDay(DATE);
  assert.deepEqual([day.label, day.vacation, day.done, day.total], ['1/1', true, 1, 1]);
  assert.equal(day.tooltip, 'calendar_habits_summary(1,1) · 🌴 Viaje');
  assert.deepEqual(day.groups[0].rows.map(row => [row.title, row.ticked, row.muted]), [['Agua', true, false], ['Leer', false, true]]);
});

test('en vacaciones sin ninguna marca el chip no tiene fracción y los hábitos siguen en la lista', () => {
  const view = makeView({ habits: [makeHabit({ title: 'Agua' }), makeHabit({ title: 'Leer' })], vacations: [VACATION] });
  view.buildCalendarViewData();

  const day = view.getHabitDay(DATE);
  assert.deepEqual([day.label, day.vacation, day.total], ['', true, 0]);
  assert.equal(day.tooltip, '🌴 Viaje');
  assert.equal(day.groups[0].rows.length, 2);
  assert.ok(day.groups[0].rows.every(row => row.muted));
});

test('un periodo de vacaciones sin nombre usa el texto genérico', () => {
  const view = makeView({ habits: [makeHabit()], vacations: [{ from: '2026-03-04', to: '2026-03-04' }] });
  view.buildCalendarViewData();
  assert.equal(view.getHabitDay(DATE).tooltip, '🌴 habit_vacation');
});

// --- Disponibilidad del filtro ---------------------------------------------------------

const types = (view) => [...view.getCalendarFilterTypes()];

test('con hábitos la barra ofrece «Hábitos» al final', () => {
  const view = makeView({ habits: [makeHabit()] });
  assert.deepEqual(types(view), ['priority', 'status', 'area', 'start', 'scheduled', 'due', 'projected', 'habits']);
});

test('sin ningún hábito no se ofrece «Hábitos» ni se dibuja nada', () => {
  const view = makeView({ habits: [] });
  assert.deepEqual(types(view), ['priority', 'status', 'area', 'start', 'scheduled', 'due', 'projected']);
  view.buildCalendarViewData();
  assert.deepEqual(view.visibleHabits, []);
  assert.equal(view.getHabitDay(DATE), null);
});

test('con la pestaña Hábitos oculta no se ofrece «Hábitos» ni se dibuja nada', () => {
  const view = makeView({ habits: [makeHabit()], settings: { showHabitTab: false } });
  assert.equal(types(view).includes('habits'), false);
  view.buildCalendarViewData();
  assert.equal(view.getHabitDay(DATE), null);
});

test('sin gestor de hábitos el calendario queda como antes', () => {
  const view = makeView({ withManager: false });
  assert.equal(types(view).includes('habits'), false);
  view.buildCalendarViewData();
  assert.equal(view.getHabitDay(DATE), null);
});

test('un estado guardado «ocultos» sin hábitos no tiene efecto ni chip: los tipos ofrecidos lo dejan fuera', () => {
  const view = makeView({ habits: [] });
  view.calendarState = calendarState.parseCalendarState({ habits: 'hide' });
  assert.equal(types(view).includes('habits'), false);
});

// --- «Días festivos» (v1.1.15) ------------------------------------------------------------

const MEXICO = { country: 'MX', official: true, unofficial: false, color: '#2e7d32' };
const REVOLUTION_DAY = DateTime.fromISO('2026-11-16');

test('«Días festivos» se ofrece solo con un calendario de feriados en los ajustes', () => {
  assert.equal(types(makeView({ settings: { holidayCalendars: [MEXICO] } })).at(-1), 'holidays');
  assert.equal(types(makeView({ settings: { holidayCalendars: [] } })).includes('holidays'), false);
  assert.equal(types(makeView()).includes('holidays'), false, 'sin el ajuste tampoco');
});

test('con «Días festivos» desmarcado ninguna vista recibe feriados; marcado, sí', () => {
  const view = makeView({ settings: { holidayCalendars: [MEXICO] } });
  assert.deepEqual(view.getHolidays(REVOLUTION_DAY).map(holiday => holiday.official), [true]);

  view.calendarState = calendarState.parseCalendarState({ holidays: 'hide' });
  assert.deepEqual(view.getHolidays(REVOLUTION_DAY), []);

  view.calendarState = calendarState.parseCalendarState({ holidays: 'show' });
  assert.equal(view.getHolidays(REVOLUTION_DAY).length, 1);
});

// --- Plantillas ------------------------------------------------------------------------

const hbs = RealHandlebars.create();
hbs.registerHelper('t', key => key);
hbs.registerHelper('equals', function (a, b, options) { return a === b ? options.fn(this) : options.inverse(this); });
hbs.registerHelper('isTaskDone', status => status === 'x');
hbs.registerHelper('toISODate', date => (date && date.toISODate ? date.toISODate() : ''));
hbs.registerHelper('formatDateHeader', () => '');
hbs.registerHelper('formatHour', () => '');
hbs.registerHelper('formatFullDate', () => '');
hbs.registerHelper('formatMonth', () => '');
hbs.registerHelper('getDayOfMonth', () => '');
hbs.registerHelper('formatDate', () => '');
hbs.registerHelper('eq', (a, b) => a === b);
hbs.registerHelper('hasOfficialHoliday', holidays => Array.isArray(holidays) && holidays.some(holiday => holiday.official));

// El parcial se registra al preparar los helpers de la vista: se ejecuta ese método con el Handlebars simulado
new TestView({}, { settings: {} }, { t }, {}).registerViewSpecificHelpers({});
hbs.registerPartial('calendarHabitChip', partials.calendarHabitChip);

const source = (name) => readFileSync(path.join(__dirname, '..', 'src', 'views', 'templates', name), 'utf8');

test('la vista registra el parcial del chip', () => {
  assert.equal(typeof partials.calendarHabitChip, 'string');
});

const chipHtml = (habits) => hbs.compile('{{> calendarHabitChip}}')({ habits });
const DAY_HABITS = { date: '2026-03-04', label: '3/5', done: 3, total: 5, vacation: false, tooltip: '3 de 5', groups: [] };

test('el chip lleva el icono, la fracción, el tooltip y la fecha', () => {
  const html = chipHtml(DAY_HABITS);
  assert.match(html, /<button type="button" class="oa-calendar-habit-chip"/);
  assert.match(html, /data-habit-date="2026-03-04"/);
  assert.match(html, /title="3 de 5" aria-label="3 de 5"/);
  assert.match(html, /<span class="oa-calendar-habit-icon" aria-hidden="true"><\/span>/);
  assert.match(html, /<span class="oa-calendar-habit-count">3\/5<\/span>/);
  assert.equal(html.includes('🌴'), false);
});

test('en vacaciones el chip lleva la 🌴 y, sin fracción, solo el icono y la 🌴', () => {
  const withCount = chipHtml({ ...DAY_HABITS, vacation: true });
  assert.match(withCount, /oa-calendar-habit-chip oa-calendar-habit-chip--vacation/);
  assert.match(withCount, /oa-calendar-habit-count">3\/5/);
  assert.match(withCount, /oa-calendar-habit-vacation" aria-hidden="true">🌴/);

  const bare = chipHtml({ ...DAY_HABITS, label: '', total: 0, done: 0, vacation: true });
  assert.equal(bare.includes('oa-calendar-habit-count'), false);
  assert.match(bare, /🌴/);
});

test('sin hábitos el parcial no dibuja nada', () => {
  assert.equal(chipHtml(null).trim(), '');
  assert.equal(chipHtml(undefined).trim(), '');
});

test('Mes, Semana, Semana laboral y Lista usan el parcial y el Año no', () => {
  for (const name of ['month', 'week', 'workweek', 'list']) {
    assert.equal(source(`calendar-${name}-view.hbs`).includes('{{> calendarHabitChip}}'), true, name);
  }
  assert.equal(source('calendar-year-view.hbs').includes('calendarHabitChip'), false);
});

test('el chip y los feriados van juntos en la primera fila del día (`oa-calendar-day-meta`), el chip primero, y antes de las tareas', () => {
  for (const name of ['month', 'week', 'workweek', 'list']) {
    const text = source(`calendar-${name}-view.hbs`);
    const meta = text.indexOf('oa-calendar-day-meta');
    const chip = text.indexOf('{{> calendarHabitChip}}');
    const holidays = text.indexOf('#each holidays');
    const tasks = text.indexOf('#each tasksForDay');
    assert.ok(meta > 0, name);
    assert.ok(meta < chip && chip < holidays && holidays < tasks, `${name}: contenedor, chip, feriados y tareas en ese orden`);
  }
});

test('el contenedor de la primera fila invierte el orden, da un ancho mínimo al feriado y se oculta vacío', () => {
  const scss = readFileSync(path.join(__dirname, '..', 'src', 'styles', 'views', '_calendar-common.scss'), 'utf8');
  const meta = scss.slice(scss.indexOf('.oa-calendar-day-meta {'));
  assert.match(meta, /flex-flow: row-reverse wrap;/);
  assert.match(meta, /&:not\(:has\(\*\)\)\s*\{\s*display: none;/);
  assert.match(meta, /\.oa-calendar-holiday\s*\{\s*flex: 1 1 70px;\s*min-width: 70px;/);
  assert.match(meta, /& \+ \.oa-calendar-holiday\s*\{\s*flex-basis: 100%;/, 'un segundo feriado va en su propia fila');
});

test('el chip solo es absoluto en el encabezado de la vista Día', () => {
  const scss = readFileSync(path.join(__dirname, '..', 'src', 'styles', 'views', '_calendar-common.scss'), 'utf8');
  const chipRule = scss.slice(scss.indexOf('.oa-calendar-habit-chip {'), scss.indexOf('/* Primera fila de un día'));
  assert.equal(chipRule.includes('position: absolute'), false);
  assert.match(scss, /\.oa-calendar-day-column-header \.oa-calendar-habit-chip\s*\{\s*position: absolute;/);
});

const DAY_TEMPLATE = source('calendar-day-view.hbs');

function dayHtml(columns) {
  return hbs.compile(DAY_TEMPLATE)({
    settings: {}, calendar: { viewType: 'day', daysToShow: columns.length, periodName: 'x', columns, hourRows: [] },
  });
}

const column = (habits, dateIso = '2026-03-04') => ({ dateIso, dayName: 'Wed', dayOfMonth: 4, allDayDue: [], allDayStart: [], allDayScheduled: [], holidays: [], habits });
const HABITS_COLUMN = column({
  ...DAY_HABITS, vacation: false,
  groups: [
    { daytime: 'wake up', label: 'Despertar', rows: [{ id: 'habits/Agua.md::wake up', title: 'Agua', daytime: 'wake up', ticked: true, muted: false, areaColor: '#0a0' }] },
  ],
});

test('la vista Día usa el mismo chip que las demás, en el encabezado de la columna, y ya no tiene sección aparte', () => {
  const html = dayHtml([HABITS_COLUMN]);
  assert.match(html, /<div class="oa-calendar-day-column-header[^"]*" data-date="2026-03-04">[\s\S]*?<button type="button" class="oa-calendar-habit-chip"[^>]*data-habit-date="2026-03-04"/);
  assert.match(html, /oa-calendar-habit-count">3\/5</);
  for (const gone of ['oa-calendar-habits', 'oa-calendar-habit-row', 'oa-calendar-habit-check', 'hasHabits']) {
    assert.equal(html.includes(gone), false, gone);
  }
});

test('el chip del Día va después del nombre, la fecha y los feriados del encabezado', () => {
  const withHoliday = column(DAY_HABITS);
  withHoliday.holidays = [{ name: 'Revolution Day', color: '#c33', official: true }];
  const html = dayHtml([withHoliday]);
  const holiday = html.indexOf('oa-calendar-holiday--header');
  const chip = html.indexOf('oa-calendar-habit-chip');
  assert.ok(holiday > 0 && chip > holiday);
  assert.ok(html.indexOf('oa-calendar-day-name') < chip);
});

test('sin hábitos el encabezado del Día no lleva chip', () => {
  assert.equal(dayHtml([column(null)]).includes('oa-calendar-habit-chip'), false);
});

test('en la vista Día el chip de un día de vacaciones lleva la 🌴 y, sin marcas, no tiene fracción', () => {
  const html = dayHtml([column({ ...DAY_HABITS, vacation: true, label: '', total: 0, done: 0, groups: [] })]);
  assert.match(html, /oa-calendar-habit-chip oa-calendar-habit-chip--vacation/);
  assert.equal(html.includes('oa-calendar-habit-count'), false);
  assert.match(html, /oa-calendar-habit-vacation" aria-hidden="true">🌴/);
});

test('con varios días cada columna lleva su propio chip con su fecha', () => {
  const second = column({ ...DAY_HABITS, date: '2026-03-05', label: '0/1' }, '2026-03-05');
  const third = column(null, '2026-03-06');
  const html = dayHtml([HABITS_COLUMN, second, third]);
  const dates = [...html.matchAll(/data-habit-date="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(dates, ['2026-03-04', '2026-03-05']);
});

// --- Textos ----------------------------------------------------------------------------

test('los textos de los hábitos del calendario existen en los 6 idiomas', () => {
  const keys = ['filter_habits', 'filter_habits_hidden', 'calendar_habits_summary'];
  for (const locale of ['en', 'es', 'pt', 'fr', 'de', 'it']) {
    const translations = JSON.parse(readFileSync(path.join(__dirname, '..', 'src', 'locales', `${locale}.json`), 'utf8'));
    for (const key of keys) assert.ok(String(translations[key] ?? '').trim(), `${locale}.${key}`);
    assert.match(translations.calendar_habits_summary, /\{done\}.*\{total\}/, locale);
  }
});
