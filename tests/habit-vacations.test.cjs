const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { DateTime } = require('luxon');
const { loadSource } = require('./helpers/load-source.cjs');

// Vacaciones de los hábitos (v1.1.15, HV1): lista global `habitVacations`, día neutral si no está marcado y contado
// solo para ese hábito si lo está (ADR-DM2), y propagación a rachas, porcentajes, celdas y heatmap.
const calendar = loadSource('habits/habit-calendar.ts');
const { computeCells, computeOccurrenceCells, computeStats, computeOccurrenceStats, computeUnscheduledBridges } = loadSource('habits/habit-streak.ts');
const { computeYearHistory, computeHistory30d, computeAreaStats, computeDaytimeStats, computeDashboard } = loadSource('habits/habit-stats.ts');
const { openPluginSettings } = loadSource('habits/open-habit-settings.ts');

const { sanitizeVacations, findVacation, countsOn, NO_VACATIONS } = calendar;

const day = (iso) => DateTime.fromISO(iso, { zone: 'local' });
const iso = (date) => date.toISODate();
const range = (from, count) => Array.from({ length: count }, (_, i) => day(from).plus({ days: i }));
const ctxOf = (...vacations) => ({ vacations });

function makeHabit(overrides = {}) {
  const { completions = {}, ...rest } = overrides;
  const entries = new Set(Object.keys(completions).filter(date => (completions[date] ?? []).length > 0));
  return {
    file: { basename: 'h', path: 'h.md' }, name: 'h', title: 'h', description: '', time: 0, area: 'physical', subArea: '',
    related: [], relatedFile: '', frequencySet: new Set([1, 2, 3, 4, 5, 6, 7]), priority: 3, daytimes: ['morning'],
    color: '', maxGap: 0, status: 'active', activeFrom: null, activeUntil: null, completions, entries, ...rest,
  };
}

const tick = (...dates) => Object.fromEntries(dates.map(date => [date, ['morning']]));

// 2026-03-02 es lunes: del 2 al 8 hay una semana completa
const MON = '2026-03-02';
const VACATION = { from: '2026-03-04', to: '2026-03-05', name: 'Viaje' };

// --- La lista de vacaciones -----------------------------------------------------

test('sanitizeVacations conserva los periodos válidos y recorta el nombre', () => {
  const result = sanitizeVacations([
    { from: '2026-12-20', to: '2027-01-02', name: '  Navidad ' },
    { from: '2026-03-04', to: '2026-03-04' },
  ]);
  assert.deepEqual(result, [
    { from: '2026-12-20', to: '2027-01-02', name: 'Navidad' },
    { from: '2026-03-04', to: '2026-03-04' },
  ]);
});

test('sanitizeVacations descarta lo que no es un periodo válido', () => {
  const result = sanitizeVacations([
    null, 'x', 5, [],
    { from: '2026-03-10', to: '2026-03-01' },
    { from: '2026-02-30', to: '2026-03-01' },
    { from: '2026-03-01' },
    { to: '2026-03-01' },
    { from: '2026-03-01', to: '2026-03-02', name: 7 },
  ]);
  assert.deepEqual(result, [{ from: '2026-03-01', to: '2026-03-02' }]);
});

test('sanitizeVacations devuelve una lista vacía si lo guardado no es una lista', () => {
  for (const bad of [undefined, null, 'x', 3, {}, { from: '2026-03-01', to: '2026-03-02' }]) {
    assert.deepEqual(sanitizeVacations(bad), [], String(bad));
  }
});

test('sanitizeVacations devuelve una lista nueva que no comparte referencia con la guardada', () => {
  const saved = [{ from: '2026-03-01', to: '2026-03-02' }];
  const result = sanitizeVacations(saved);
  assert.notEqual(result, saved);
  assert.notEqual(result[0], saved[0]);
});

test('findVacation incluye los dos extremos y devuelve el periodo que contiene la fecha', () => {
  const vacations = [VACATION];
  assert.equal(findVacation(vacations, '2026-03-03'), null);
  assert.equal(findVacation(vacations, '2026-03-04'), VACATION);
  assert.equal(findVacation(vacations, '2026-03-05'), VACATION);
  assert.equal(findVacation(vacations, '2026-03-06'), null);
  assert.equal(findVacation([], '2026-03-04'), null);
});

test('con periodos solapados un día es de vacaciones si cae en alguno', () => {
  const vacations = [{ from: '2026-03-01', to: '2026-03-05' }, { from: '2026-03-04', to: '2026-03-10', name: 'B' }];
  for (const date of ['2026-03-01', '2026-03-07', '2026-03-10']) assert.notEqual(findVacation(vacations, date), null, date);
  assert.equal(findVacation(vacations, '2026-03-11'), null);
});

// --- countsOn --------------------------------------------------------------------

test('en vacaciones un día cuenta solo si está marcado', () => {
  const habit = makeHabit();
  const ctx = ctxOf(VACATION);
  assert.equal(countsOn(habit, day('2026-03-04'), false, ctx), false);
  assert.equal(countsOn(habit, day('2026-03-04'), true, ctx), true);
  assert.equal(countsOn(habit, day('2026-03-03'), false, ctx), true, 'fuera de vacaciones cuenta aunque no esté marcado');
});

test('un día de vacaciones no programado sigue siendo neutral aunque esté marcado', () => {
  const weekdays = makeHabit({ frequencySet: new Set([1, 2, 3, 4, 5]) });
  assert.equal(countsOn(weekdays, day('2026-03-07'), true, ctxOf({ from: '2026-03-07', to: '2026-03-08' })), false);
});

test('un día de vacaciones fuera del periodo activo del hábito es neutral aunque esté marcado', () => {
  const habit = makeHabit({ activeUntil: '2026-03-03' });
  assert.equal(countsOn(habit, day('2026-03-04'), true, ctxOf(VACATION)), false);
});

test('sin contexto de vacaciones countsOn se comporta como antes', () => {
  const habit = makeHabit();
  assert.equal(countsOn(habit, day('2026-03-04')), true);
  assert.equal(countsOn(habit, day('2026-03-04'), false, NO_VACATIONS), true);
});

// --- Rachas ----------------------------------------------------------------------

test('un día de vacaciones sin marcar no rompe la racha', () => {
  const habit = makeHabit({ completions: tick('2026-03-02', '2026-03-03', '2026-03-06') });
  const ctx = ctxOf(VACATION);
  assert.equal(computeStats(habit, ctx).current, 3);
  assert.equal(computeStats(habit).current, 1, 'sin vacaciones el hueco del 4 y el 5 rompe la racha');
});

test('un día de vacaciones marcado suma a la racha de ese hábito', () => {
  const habit = makeHabit({ completions: tick('2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06') });
  const stats = computeStats(habit, ctxOf(VACATION));
  assert.deepEqual([stats.current, stats.max], [4, 4]);
});

test('las vacaciones de un hábito no cuentan para otro sin marcas ni lo penalizan', () => {
  const marked = makeHabit({ completions: tick('2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06') });
  const unmarked = makeHabit({ completions: tick('2026-03-03', '2026-03-06') });
  const ctx = ctxOf(VACATION);
  assert.equal(computeStats(marked, ctx).current, 4);
  assert.equal(computeStats(unmarked, ctx).current, 2);
});

test('las vacaciones no consumen maxGap', () => {
  const habit = makeHabit({ maxGap: 0, completions: tick('2026-03-03', '2026-03-06') });
  assert.equal(computeStats(habit, ctxOf(VACATION)).current, 2);

  const withGap = makeHabit({ maxGap: 1, completions: tick('2026-03-03', '2026-03-07') });
  // el 4 y el 5 son de vacaciones; solo el 6 consume el hueco permitido
  assert.equal(computeStats(withGap, ctxOf(VACATION)).current, 2);
});

test('la racha por ocurrencia también salta las vacaciones sin marcar', () => {
  const habit = makeHabit({ daytimes: ['morning', 'evening'], completions: { '2026-03-03': ['morning'], '2026-03-06': ['morning'] } });
  assert.equal(computeOccurrenceStats(habit, 'morning', ctxOf(VACATION)).current, 2);
  assert.equal(computeOccurrenceStats(habit, 'morning').current, 1);
});

// --- Celdas ----------------------------------------------------------------------

test('la celda de vacaciones sin marcar es neutral, marcable y lleva el nombre del periodo', () => {
  const habit = makeHabit();
  const [normal, vacation] = computeOccurrenceCells(habit, 'morning', [day('2026-03-03'), day('2026-03-04')], 0, true, ctxOf(VACATION));

  assert.deepEqual([normal.vacation, normal.scheduled, normal.markable], [false, true, true]);
  assert.deepEqual([vacation.vacation, vacation.scheduled, vacation.markable, vacation.ticked], [true, false, true, false]);
  assert.equal(vacation.vacationName, 'Viaje');
  assert.equal(normal.vacationName, undefined);
});

test('la celda de vacaciones marcada cuenta como programada y conserva su marca', () => {
  const habit = makeHabit({ completions: tick('2026-03-04') });
  const [cell] = computeOccurrenceCells(habit, 'morning', [day('2026-03-04')], 0, true, ctxOf(VACATION));
  assert.deepEqual([cell.vacation, cell.scheduled, cell.ticked, cell.markable], [true, true, true, true]);
});

test('un periodo sin nombre no añade vacationName', () => {
  const habit = makeHabit();
  const [cell] = computeOccurrenceCells(habit, 'morning', [day('2026-03-04')], 0, true, ctxOf({ from: '2026-03-04', to: '2026-03-04' }));
  assert.equal(cell.vacation, true);
  assert.equal('vacationName' in cell, false);
});

test('una celda de vacaciones de un día no programado no se puede marcar', () => {
  const weekdays = makeHabit({ frequencySet: new Set([1, 2, 3, 4, 5]) });
  const [cell] = computeOccurrenceCells(weekdays, 'morning', [day('2026-03-07')], 0, true, ctxOf({ from: '2026-03-07', to: '2026-03-08' }));
  assert.deepEqual([cell.vacation, cell.scheduled, cell.markable], [true, false, false]);
});

test('las vacaciones sin marcar no cortan la píldora de racha de las celdas', () => {
  const habit = makeHabit({ completions: tick('2026-03-02', '2026-03-03', '2026-03-06') });
  const cells = computeOccurrenceCells(habit, 'morning', range(MON, 5), 0, true, ctxOf(VACATION));

  const run = cells.filter(cell => cell.streakCount > 0);
  assert.deepEqual(run.map(cell => cell.date), ['2026-03-02', '2026-03-03', '2026-03-06']);
  assert.ok(run.every(cell => cell.streakCount === 3));
  assert.equal(cells[0].streakStart, true);
  assert.equal(cells[4].streakEnd, true);

  // los dos días de vacaciones quedan encerrados entre dos marcas: la raya de conexión los une
  assert.deepEqual(computeUnscheduledBridges(cells), [false, false, true, true, false]);
});

test('las celdas de día completo también reciben el contexto', () => {
  const habit = makeHabit({ daytimes: ['morning', 'evening'], completions: { '2026-03-04': ['morning'] } });
  const [partialInVacation, emptyInVacation] = computeCells(habit, [day('2026-03-04'), day('2026-03-05')], 0, true, ctxOf(VACATION));

  // un día parcial es neutral y en vacaciones también
  assert.deepEqual([partialInVacation.scheduled, partialInVacation.partial, partialInVacation.vacation], [false, false, true]);
  assert.deepEqual([emptyInVacation.scheduled, emptyInVacation.vacation], [false, true]);
});

test('sin contexto las celdas no tienen vacaciones y todas las programadas son marcables', () => {
  const habit = makeHabit();
  const cells = computeOccurrenceCells(habit, 'morning', range(MON, 7), 0, true);
  assert.ok(cells.every(cell => !cell.vacation && cell.scheduled && cell.markable));
});

// --- Porcentajes -----------------------------------------------------------------

test('el porcentaje por área de un día de vacaciones cuenta solo los hábitos marcados', () => {
  const marked = makeHabit({ priority: 2, completions: tick('2026-03-04') });
  const unmarked = makeHabit({ priority: 5 });
  const stats = computeAreaStats([marked, unmarked], '2026-03-04', ctxOf(VACATION));
  assert.deepEqual(stats.physical, { raw: 1, weighted: 1 });
});

test('un día de vacaciones sin ninguna marca no tiene dato por área ni por franja', () => {
  const habits = [makeHabit(), makeHabit({ area: 'mind' })];
  assert.deepEqual(computeAreaStats(habits, '2026-03-04', ctxOf(VACATION)), {});
  assert.deepEqual(computeDaytimeStats(habits, '2026-03-04', ctxOf(VACATION)), {});
});

test('con varias franjas la regla se evalúa por ocurrencia', () => {
  const habit = makeHabit({ daytimes: ['morning', 'evening'], completions: { '2026-03-04': ['morning'] } });
  const area = computeAreaStats([habit], '2026-03-04', ctxOf(VACATION));
  assert.deepEqual(area.physical, { raw: 1, weighted: 1 }, 'solo la ocurrencia marcada cuenta');

  const daytime = computeDaytimeStats([habit], '2026-03-04', ctxOf(VACATION));
  assert.deepEqual(Object.keys(daytime), ['morning']);
});

test('fuera de vacaciones el cálculo por área no cambia', () => {
  const habit = makeHabit({ daytimes: ['morning', 'evening'], completions: { '2026-03-03': ['morning'] } });
  assert.deepEqual(computeAreaStats([habit], '2026-03-03', ctxOf(VACATION)).physical, { raw: 0.5, weighted: 0.5 });
});

// --- Historial y heatmap -----------------------------------------------------------

test('un día de vacaciones sin marcas queda con total 0, marcado como vacaciones y con el nombre', () => {
  const stats = computeYearHistory([makeHabit()], 2026, ctxOf(VACATION));
  const byDate = new Map(stats.map(stat => [stat.date, stat]));

  const vacation = byDate.get('2026-03-04');
  assert.deepEqual([vacation.vacation, vacation.total, vacation.pct, vacation.pctWeighted], [true, 0, 0, 0]);
  assert.equal(vacation.vacationName, 'Viaje');

  const normal = byDate.get('2026-03-03');
  assert.deepEqual([normal.vacation, normal.total], [false, 1]);
  assert.equal('vacationName' in normal, false);
});

test('una sola marca en vacaciones da 100 % ese día (ADR-DM2)', () => {
  const habits = [makeHabit({ completions: tick('2026-03-04') }), makeHabit()];
  const day4 = computeYearHistory(habits, 2026, ctxOf(VACATION)).find(stat => stat.date === '2026-03-04');
  assert.deepEqual([day4.done, day4.total, day4.pct, day4.vacation], [1, 1, 1, true]);
});

test('las vacaciones no cambian el porcentaje de los demás días', () => {
  const habits = [makeHabit({ completions: tick('2026-03-02', '2026-03-03') })];
  const without = computeYearHistory(habits, 2026);
  const withVacation = computeYearHistory(habits, 2026, ctxOf(VACATION));
  for (const date of ['2026-03-02', '2026-03-03', '2026-03-06', '2026-05-01']) {
    const a = without.find(stat => stat.date === date);
    const b = withVacation.find(stat => stat.date === date);
    assert.deepEqual([b.done, b.total, b.pct], [a.done, a.total, a.pct], date);
  }
});

test('el historial de 30 días también marca los días de vacaciones', () => {
  const today = DateTime.local();
  const ctx = ctxOf({ from: iso(today.minus({ days: 2 })), to: iso(today.minus({ days: 1 })) });
  const stats = computeHistory30d([makeHabit()], ctx);
  assert.equal(stats.length, 30);
  assert.deepEqual(stats.slice(-4).map(stat => stat.vacation), [false, true, true, false]);
  assert.deepEqual(stats.slice(-3, -1).map(stat => stat.total), [0, 0]);
});

// --- Dashboard ---------------------------------------------------------------------

test('el Dashboard en un día de vacaciones usa solo los hábitos marcados y no rompe la racha', () => {
  const today = DateTime.local();
  const ctx = ctxOf({ from: iso(today), to: iso(today) });
  const marked = makeHabit({ completions: tick(iso(today.minus({ days: 1 })), iso(today)) });
  const unmarked = makeHabit({ completions: tick(iso(today.minus({ days: 2 })), iso(today.minus({ days: 1 }))) });

  const data = computeDashboard([marked, unmarked], [marked, unmarked], ctx);
  assert.equal(data.todayRaw, 1);
  assert.equal(data.currentStreak, 2);

  const none = computeDashboard([unmarked], [unmarked], ctx);
  assert.deepEqual([none.todayRaw, none.todayWeighted, none.byArea, none.byDaytime], [0, 0, {}, {}]);
  assert.equal(none.currentStreak, 2, 'el día de vacaciones sin marcar no rompe la racha');
});

test('sin vacaciones el Dashboard no cambia', () => {
  const today = DateTime.local();
  const habit = makeHabit({ completions: tick(iso(today)) });
  const withDefault = computeDashboard([habit]);
  const withEmpty = computeDashboard([habit], [habit], NO_VACATIONS);
  assert.deepEqual(withDefault, withEmpty);
  assert.equal(withDefault.todayRaw, 1);
});

// --- Botón «Vacaciones» --------------------------------------------------------------

test('openPluginSettings abre los ajustes y pide la pestaña del plugin', () => {
  const calls = [];
  const app = { setting: { open: () => calls.push('open'), openTabById: (id) => { calls.push(id); return {}; } } };
  assert.equal(openPluginSettings(app, 'agenda-tasks'), true);
  assert.deepEqual(calls, ['open', 'agenda-tasks']);
});

test('openPluginSettings no se queja si openTabById no devuelve nada', () => {
  const app = { setting: { open: () => {}, openTabById: () => undefined } };
  assert.equal(openPluginSettings(app, 'agenda-tasks'), true);
});

test('openPluginSettings devuelve false si la API no existe, está incompleta o falla', () => {
  assert.equal(openPluginSettings({}, 'agenda-tasks'), false);
  assert.equal(openPluginSettings({ setting: {} }, 'agenda-tasks'), false);
  assert.equal(openPluginSettings({ setting: { open: () => {} } }, 'agenda-tasks'), false);
  assert.equal(openPluginSettings({ setting: { open: () => { throw new Error('x'); }, openTabById: () => ({}) } }, 'agenda-tasks'), false);
  assert.equal(openPluginSettings({ setting: { open: () => {}, openTabById: () => { throw new Error('x'); } } }, 'agenda-tasks'), false);
  assert.equal(openPluginSettings({ setting: { open: () => {}, openTabById: () => false } }, 'agenda-tasks'), false);
});

// --- Textos ---------------------------------------------------------------------------

test('las vacaciones tienen sus textos en los 6 idiomas', () => {
  const keys = [
    'habit_vacations', 'habit_vacations_periods', 'habit_vacations_desc', 'habit_vacations_empty', 'habit_vacation_add',
    'habit_vacation_from', 'habit_vacation_to', 'habit_vacation_name', 'habit_vacation_remove', 'habit_vacation_invalid',
    'habit_vacation', 'habit_vacations_open_failed',
  ];
  for (const locale of ['en', 'es', 'pt', 'fr', 'de', 'it']) {
    const translations = JSON.parse(readFileSync(path.join(__dirname, '..', 'src', 'locales', `${locale}.json`), 'utf8'));
    for (const key of keys) {
      assert.equal(typeof translations[key], 'string', `${locale}.${key}`);
      assert.notEqual(translations[key].trim(), '', `${locale}.${key}`);
    }
  }
});
