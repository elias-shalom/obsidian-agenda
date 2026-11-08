const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const { DateTime } = require('luxon');
const { loadSource } = require('./helpers/load-source.cjs');

const nonWorkingDays = loadSource('core/non-working-days.ts');

// Exercise the real view generators without starting Obsidian. The parent view
// supplies its contract: weekday names are rotated to the configured week start.
function loadView(file, exportName, locale) {
  class CalendarView {
    getWeekStartDay() { return this.plugin.settings.weekStartDay; }
    getNonWorkingDays() { return this.plugin.settings.nonWorkingDays ?? [6, 7]; }
    isNonWorking(date) { return nonWorkingDays.isNonWorkingDay(date, this.getNonWorkingDays()); }
    getLocalizedDayNames() {
      const monday = DateTime.fromISO('2026-10-26', { locale });
      return Array.from({ length: 7 }, (_, index) =>
        monday.plus({ days: this.getWeekStartDay() - 1 + index }).toFormat('ccc'));
    }
    getTasksForDate(date) { return this.tasksByDate.get(date.toISODate()) ?? []; }
  }
  const module = { exports: {} };
  const source = readFileSync(path.join(__dirname, '../src/views', file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const requireStub = (id) => {
    if (id === './calendar-view') return { CalendarView };
    if (id === 'obsidian') return { getLanguage: () => locale };
    if (id === '../types/enums') {
      return { CalendarViewType: { Week: 'week', WorkWeek: 'workweek', List: 'list' } };
    }
    if (id === 'luxon') return { DateTime };
    if (id === '../core/non-working-days') return nonWorkingDays;
    throw new Error(`Unexpected view dependency: ${id}`);
  };
  new Function('require', 'module', 'exports', outputText)(requireStub, module, module.exports);
  return module.exports[exportName];
}

const views = [
  ['calendar-week-view.ts', 'CalendarWeekView', 7],
  ['calendar-workweek-view.ts', 'CalendarWorkWeekView', 5],
  ['calendar-list-view.ts', 'CalendarListView', 14],
];

for (const [file, exportName, count] of views) {
  for (let weekStartDay = 1; weekStartDay <= 7; weekStartDay++) {
    test(`${exportName}: accurate labels and task dates with week start ${weekStartDay}`, () => {
      for (const locale of ['en', 'es']) {
        const View = loadView(file, exportName, locale);
        for (const zone of ['UTC', 'Europe/Bucharest', 'America/New_York']) {
          for (const date of ['2026-10-31', '2026-11-01', '2026-12-31', '2024-02-29', '2026-10-25']) {
            const currentDate = DateTime.fromISO(date, { zone, locale });
            const view = new View();
            view.plugin = { settings: { weekStartDay, calendarListDaysToShow: count } };
            view.currentDate = currentDate;
            view.windowStart = null;
            view.tasksByDate = new Map();
            // Preserve the existing date ranges: Week starts Monday, workweek
            // is Monday–Friday, and List starts on the selected reference date.
            const firstDate = count === 14 ? currentDate : currentDate.startOf('week');
            const task = { id: 'sentinel-task', scheduledDate: firstDate.toISODate() };
            view.tasksByDate.set(firstDate.toISODate(), [task]);
            const result = view.generateViewData();
            assert.equal(result.days.length, count);
            result.days.forEach((day, index) => {
              const expectedDate = firstDate.plus({ days: index });
              assert.equal(day.date.toISODate(), expectedDate.toISODate());
              assert.equal(day.dayOfMonth, expectedDate.day);
              assert.equal(day.dayOfWeek, expectedDate.weekday);
              assert.equal(day.dayName, expectedDate.toFormat('ccc'), `${date}, ${zone}, ${locale}`);
              assert.equal(day.formattedDate, `${expectedDate.toFormat('ccc')} ${expectedDate.day}`);
              assert.equal(day.tasksForDay.length, index === 0 ? 1 : 0);
              if (index === 0) assert.strictEqual(day.tasksForDay[0], task);
            });
          }
        }
      }
    });
  }
}

// --- Non-working days (v1.1.15, NL1) ---------------------------------------------

function buildView(file, exportName, settings, date = '2026-11-04') {
  const View = loadView(file, exportName, 'en');
  const view = new View();
  view.plugin = { settings: { weekStartDay: 1, calendarListDaysToShow: 14, ...settings } };
  view.currentDate = DateTime.fromISO(date, { locale: 'en' }); // Wednesday
  view.windowStart = null;
  view.tasksByDate = new Map();
  return view;
}

const isoDays = (result) => result.days.map(day => day.date.toISODate());

test('Work Week keeps Monday to Friday with the default setting', () => {
  const result = buildView('calendar-workweek-view.ts', 'CalendarWorkWeekView', { nonWorkingDays: [6, 7] }).generateViewData();
  assert.deepEqual(isoDays(result), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
  assert.equal(result.gridStylesAvailable, true);
});

test('Work Week hides the marked days and keeps the others in order', () => {
  const result = buildView('calendar-workweek-view.ts', 'CalendarWorkWeekView', { nonWorkingDays: [1, 7] }).generateViewData();
  assert.deepEqual(isoDays(result), ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
  assert.equal(result.days.every(day => day.date.weekday !== 1 && day.date.weekday !== 7), true);
});

test('Work Week shows six days with a single non-working day, and one with six', () => {
  const six = buildView('calendar-workweek-view.ts', 'CalendarWorkWeekView', { nonWorkingDays: [7] }).generateViewData();
  assert.equal(six.days.length, 6);
  const one = buildView('calendar-workweek-view.ts', 'CalendarWorkWeekView', { nonWorkingDays: [1, 2, 3, 4, 5, 6] }).generateViewData();
  assert.deepEqual(isoDays(one), ['2026-11-08']);
});

test('Work Week offers the alternative grid styles only with five days', () => {
  for (const [days, expected] of [[[6, 7], true], [[7], false], [[1, 6, 7], false], [[2, 3, 6], false]]) {
    const result = buildView('calendar-workweek-view.ts', 'CalendarWorkWeekView', { nonWorkingDays: days }).generateViewData();
    assert.equal(result.gridStylesAvailable, expected, `ajuste ${days}`);
  }
});

test('Work Week period name spans the first and last day shown', () => {
  const result = buildView('calendar-workweek-view.ts', 'CalendarWorkWeekView', { nonWorkingDays: [1, 7] }).generateViewData();
  assert.equal(result.periodName, 'Nov 3 - Nov 7, 2026');
});

test('Work Week on a Sunday belongs to the week that started the previous Monday, as before', () => {
  const result = buildView('calendar-workweek-view.ts', 'CalendarWorkWeekView', { nonWorkingDays: [6, 7] }, '2026-11-08').generateViewData();
  assert.deepEqual(isoDays(result), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
});

test('Week and List flag the non-working days and only those', () => {
  for (const [file, name] of [['calendar-week-view.ts', 'CalendarWeekView'], ['calendar-list-view.ts', 'CalendarListView']]) {
    const result = buildView(file, name, { nonWorkingDays: [5, 6] }).generateViewData();
    for (const day of result.days) assert.equal(day.isNonWorking, [5, 6].includes(day.date.weekday), `${name} ${day.date.toISODate()}`);
    assert.equal(result.days.some(day => day.isNonWorking), true);
    assert.equal(result.days.some(day => !day.isNonWorking), true);
  }
});

test('Week and List flag Saturday and Sunday by default', () => {
  for (const [file, name] of [['calendar-week-view.ts', 'CalendarWeekView'], ['calendar-list-view.ts', 'CalendarListView']]) {
    const result = buildView(file, name, {}).generateViewData();
    for (const day of result.days) assert.equal(day.isNonWorking, day.date.weekday >= 6, `${name} ${day.date.toISODate()}`);
  }
});
