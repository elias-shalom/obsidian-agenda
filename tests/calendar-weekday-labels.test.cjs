const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const { DateTime } = require('luxon');

// Exercise the real view generators without starting Obsidian. The parent view
// supplies its contract: weekday names are rotated to the configured week start.
function loadView(file, exportName, locale) {
  class CalendarView {
    getWeekStartDay() { return this.plugin.settings.weekStartDay; }
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
