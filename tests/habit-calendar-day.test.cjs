const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DateTime } = require('luxon');
const { loadSource } = require('./helpers/load-source.cjs');

// Hábitos en el calendario (v1.1.15, HC1): el resumen de un día (chip `done/total`, ocurrencias por franja, marca de
// vacaciones) y los filtros de área y búsqueda. Las funciones puras de `habit-calendar.ts`, sin Obsidian.
const { buildHabitDaySummary, filterHabitsForCalendar, HABIT_DAYTIME_ORDER } = loadSource('habits/habit-calendar.ts');

const day = (iso) => DateTime.fromISO(iso, { zone: 'local' });
const ctxOf = (...vacations) => ({ vacations });

function makeHabit(overrides = {}) {
  const { completions = {}, ...rest } = overrides;
  return {
    file: { basename: 'h', path: 'h.md' }, name: 'h', title: 'h', description: '', time: 0, area: 'physical', subArea: '',
    related: [], relatedFile: '', frequencySet: new Set([1, 2, 3, 4, 5, 6, 7]), priority: 3, daytimes: ['morning'],
    color: '', maxGap: 0, status: 'active', activeFrom: null, activeUntil: null, completions,
    entries: new Set(Object.keys(completions)), ...rest,
  };
}

// 2026-03-04 es miércoles
const DATE = '2026-03-04';
const VACATION = { from: '2026-03-04', to: '2026-03-05', name: 'Viaje' };

// --- Lo que toca ese día -------------------------------------------------------

test('el resumen cuenta cumplidos y los que tocan, por ocurrencia', () => {
  const habits = [
    makeHabit({ title: 'Agua', completions: { [DATE]: ['morning'] } }),
    makeHabit({ title: 'Leer' }),
    makeHabit({ title: 'Estirar', daytimes: ['morning', 'evening'], completions: { [DATE]: ['morning'] } }),
  ];
  const summary = buildHabitDaySummary(habits, day(DATE));
  assert.deepEqual([summary.date, summary.done, summary.total, summary.vacation], [DATE, 2, 4, false]);
  assert.equal(summary.items.length, 4);
});

test('solo aparecen los hábitos que tocan por su frecuencia ese día', () => {
  const weekdays = makeHabit({ title: 'Lunes a viernes', frequencySet: new Set([1, 2, 3, 4, 5]) });
  const weekend = makeHabit({ title: 'Fin de semana', frequencySet: new Set([6, 7]) });
  const wednesday = buildHabitDaySummary([weekdays, weekend], day(DATE));
  assert.deepEqual(wednesday.items.map(item => item.habit.title), ['Lunes a viernes']);
  const saturday = buildHabitDaySummary([weekdays, weekend], day('2026-03-07'));
  assert.deepEqual(saturday.items.map(item => item.habit.title), ['Fin de semana']);
});

test('respeta el periodo activo del hábito', () => {
  const habit = makeHabit({ activeFrom: '2026-03-10', activeUntil: '2026-03-20' });
  assert.equal(buildHabitDaySummary([habit], day('2026-03-09')).items.length, 0);
  assert.equal(buildHabitDaySummary([habit], day('2026-03-10')).items.length, 1);
  assert.equal(buildHabitDaySummary([habit], day('2026-03-20')).items.length, 1);
  assert.equal(buildHabitDaySummary([habit], day('2026-03-21')).items.length, 0);
});

test('un hábito sin franjas cae en la mañana, como en las estadísticas', () => {
  const [item] = buildHabitDaySummary([makeHabit({ daytimes: [] })], day(DATE)).items;
  assert.equal(item.daytime, 'morning');
});

// --- Casos vacíos --------------------------------------------------------------

test('sin hábitos o sin ninguno que toque el día no hay ocurrencias ni total', () => {
  const none = buildHabitDaySummary([], day(DATE));
  assert.deepEqual([none.items.length, none.total, none.done], [0, 0, 0]);

  const notToday = buildHabitDaySummary([makeHabit({ frequencySet: new Set([6, 7]) })], day(DATE));
  assert.deepEqual([notToday.items.length, notToday.total], [0, 0]);
});

// --- Orden --------------------------------------------------------------------

test('las ocurrencias salen por franja del día y luego por título', () => {
  const habits = [
    makeHabit({ title: 'Diario', daytimes: ['night'] }),
    makeHabit({ title: 'Leer', daytimes: ['morning'] }),
    makeHabit({ title: 'Agua', daytimes: ['wake up', 'morning'] }),
    makeHabit({ title: 'Caminar', daytimes: ['afternoon'] }),
  ];
  const order = buildHabitDaySummary(habits, day(DATE)).items.map(item => `${item.daytime}:${item.habit.title}`);
  assert.deepEqual(order, ['wake up:Agua', 'morning:Agua', 'morning:Leer', 'afternoon:Caminar', 'night:Diario']);
  assert.deepEqual([...HABIT_DAYTIME_ORDER], ['wake up', 'morning', 'afternoon', 'evening', 'night']);
});

// --- Vacaciones (ADR-DM2) --------------------------------------------------------

test('en vacaciones las ocurrencias sin marcar aparecen pero no cuentan y se marcan como neutrales', () => {
  const habits = [makeHabit({ title: 'Agua', completions: { [DATE]: ['morning'] } }), makeHabit({ title: 'Leer' })];
  const summary = buildHabitDaySummary(habits, day(DATE), ctxOf(VACATION));

  assert.deepEqual([summary.vacation, summary.vacationName], [true, 'Viaje']);
  assert.deepEqual([summary.done, summary.total], [1, 1], 'solo cuenta el marcado');
  assert.equal(summary.items.length, 2, 'el neutral sigue en la lista para poder marcarlo');
  assert.deepEqual(summary.items.map(item => [item.habit.title, item.ticked, item.counted]), [['Agua', true, true], ['Leer', false, false]]);
});

test('en vacaciones sin ninguna marca el total es 0 pero las ocurrencias siguen ahí', () => {
  const summary = buildHabitDaySummary([makeHabit(), makeHabit({ title: 'Otro' })], day(DATE), ctxOf(VACATION));
  assert.deepEqual([summary.done, summary.total, summary.vacation], [0, 0, true]);
  assert.equal(summary.items.length, 2);
  assert.ok(summary.items.every(item => !item.counted));
});

test('fuera de vacaciones todo cuenta y sin contexto el resultado es el de siempre', () => {
  const habits = [makeHabit({ completions: { '2026-03-06': ['morning'] } })];
  const outside = buildHabitDaySummary(habits, day('2026-03-06'), ctxOf(VACATION));
  assert.deepEqual([outside.vacation, outside.done, outside.total], [false, 1, 1]);
  assert.equal('vacationName' in outside, false);

  const noContext = buildHabitDaySummary(habits, day(DATE));
  assert.deepEqual([noContext.vacation, noContext.total], [false, 1]);
});

test('un periodo de vacaciones sin nombre no añade vacationName', () => {
  const summary = buildHabitDaySummary([makeHabit()], day(DATE), ctxOf({ from: DATE, to: DATE }));
  assert.equal(summary.vacation, true);
  assert.equal('vacationName' in summary, false);
});

test('un hábito no programado o fuera de su periodo no aparece ni en vacaciones', () => {
  const weekend = makeHabit({ frequencySet: new Set([6, 7]) });
  const expired = makeHabit({ activeUntil: '2026-03-01' });
  assert.equal(buildHabitDaySummary([weekend, expired], day(DATE), ctxOf(VACATION)).items.length, 0);
});

// --- Filtros del calendario ------------------------------------------------------

const FILTER_HABITS = [
  makeHabit({ title: 'Beber agua', area: 'physical' }),
  makeHabit({ title: 'Meditación', area: 'mind', subArea: 'calma' }),
  makeHabit({ title: 'Leer', area: 'mind' }),
];
const titles = (habits) => habits.map(habit => habit.title);

test('sin filtros pasan todos los hábitos', () => {
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: '', areas: [] })), ['Beber agua', 'Meditación', 'Leer']);
});

test('el área filtra por el área del hábito, sin distinguir mayúsculas', () => {
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: '', areas: ['mind'] })), ['Meditación', 'Leer']);
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: '', areas: ['MIND'] })), ['Meditación', 'Leer']);
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: '', areas: ['work'] })), []);
});

test('las rutas de área con sub-área también filtran', () => {
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: '', areas: ['mind/calma'] })), ['Meditación']);
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: '', areas: ['mind/'] })), ['Leer'], 'solo las notas directas del área');
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: '', areas: ['physical', 'mind/calma'] })), ['Beber agua', 'Meditación']);
});

test('la búsqueda filtra por el título sin distinguir mayúsculas ni acentos', () => {
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: 'AGUA', areas: [] })), ['Beber agua']);
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: 'meditacion', areas: [] })), ['Meditación']);
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: '  lee ', areas: [] })), ['Leer']);
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: 'zzz', areas: [] })), []);
});

test('área y búsqueda se combinan con Y', () => {
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: 'leer', areas: ['mind'] })), ['Leer']);
  assert.deepEqual(titles(filterHabitsForCalendar(FILTER_HABITS, { search: 'leer', areas: ['physical'] })), []);
});

test('la prioridad y el estado no ocultan hábitos', () => {
  const habits = [makeHabit({ title: 'Alta', priority: 5 }), makeHabit({ title: 'Baja', priority: 1 })];
  const state = { search: '', areas: [], priority: ['high'], status: ['Done'] };
  assert.deepEqual(titles(filterHabitsForCalendar(habits, state)), ['Alta', 'Baja']);
});
