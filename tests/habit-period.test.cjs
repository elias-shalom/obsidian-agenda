const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DateTime } = require('luxon');
const { loadSource } = require('./helpers/load-source.cjs');

// Periodo activo de los hábitos (v1.1.15, HA1): `desde`/`hasta`, el historial estable al desactivar y los días
// fuera del periodo como neutrales en rachas y porcentajes.
const calendar = loadSource('habits/habit-calendar.ts');
const { parseHabit } = loadSource('habits/habit-parser.ts');
const { computeCells, computeOccurrenceCells, computeStats, computeOccurrenceStats } = loadSource('habits/habit-streak.ts');
const { computeYearHistory, computeAreaStats, computeDashboard } = loadSource('habits/habit-stats.ts');

const { parseActiveDate, isInPeriod, isActiveOn, isValidPeriod, activeUntilForStatus, countsOn } = calendar;

const SETTINGS = { nonWorkingDays: [6, 7], habitDefaultMaxGap: 0, habitDefaultPriority: 3, habitDefaultColor: '' };
const day = (iso) => DateTime.fromISO(iso, { zone: 'local' });
const iso = (date) => date.toISODate();

function makeHabit(overrides = {}) {
  const { completions = {}, ...rest } = overrides;
  const entries = new Set(Object.keys(completions));
  return {
    file: { basename: 'h', path: 'h.md' }, name: 'h', title: 'h', description: '', time: 0, area: 'physical', subArea: '',
    related: [], relatedFile: '', frequencySet: new Set([1, 2, 3, 4, 5, 6, 7]), priority: 3, daytimes: ['morning'],
    color: '', maxGap: 0, status: 'active', activeFrom: null, activeUntil: null, completions, entries, ...rest,
  };
}

const tick = (...dates) => Object.fromEntries(dates.map(date => [date, ['morning']]));
const range = (from, count) => Array.from({ length: count }, (_, i) => iso(day(from).plus({ days: i })));

// --- Lectura de las fechas ------------------------------------------------------

test('parseActiveDate acepta una fecha AAAA-MM-DD válida y descarta el resto', () => {
  assert.equal(parseActiveDate('2026-03-01'), '2026-03-01');
  assert.equal(parseActiveDate('  2026-03-01 '), '2026-03-01');
  for (const bad of ['2026-3-1', '01/03/2026', 'hoy', '', '2026-02-30', '2026-13-01', null, undefined, 5, {}, []]) {
    assert.equal(parseActiveDate(bad), null, String(bad));
  }
});

test('parseActiveDate admite una fecha ya convertida por el analizador de YAML', () => {
  assert.equal(parseActiveDate(new Date('2026-03-01T00:00:00Z')), '2026-03-01');
  assert.equal(parseActiveDate(new Date('no')), null);
});

test('parseHabit lee from y until y trata un valor inválido como ausente', () => {
  const file = { basename: 'h', path: 'h.md' };
  const both = parseHabit(file, { from: '2026-03-01', until: '2026-09-30' }, SETTINGS);
  assert.deepEqual([both.activeFrom, both.activeUntil], ['2026-03-01', '2026-09-30']);

  const none = parseHabit(file, {}, SETTINGS);
  assert.deepEqual([none.activeFrom, none.activeUntil], [null, null]);

  const invalid = parseHabit(file, { from: 'mañana', until: '2026-02-30' }, SETTINGS);
  assert.deepEqual([invalid.activeFrom, invalid.activeUntil], [null, null]);
});

test('las claves en español de una versión de prueba (desde y hasta) ya no se leen', () => {
  const habit = parseHabit({ basename: 'h', path: 'h.md' }, { desde: '2026-03-01', hasta: '2026-09-30' }, SETTINGS);
  assert.deepEqual([habit.activeFrom, habit.activeUntil], [null, null]);
});

// --- isInPeriod, isActiveOn y countsOn --------------------------------------------

test('el periodo incluye los dos extremos y un extremo ausente no limita', () => {
  const habit = { activeFrom: '2026-03-10', activeUntil: '2026-03-20' };
  assert.equal(isInPeriod(habit, '2026-03-09'), false);
  assert.equal(isInPeriod(habit, '2026-03-10'), true);
  assert.equal(isInPeriod(habit, '2026-03-20'), true);
  assert.equal(isInPeriod(habit, '2026-03-21'), false);

  assert.equal(isInPeriod({ activeFrom: '2026-03-10', activeUntil: null }, '2030-01-01'), true);
  assert.equal(isInPeriod({ activeFrom: null, activeUntil: '2026-03-10' }, '2000-01-01'), true);
  assert.equal(isInPeriod({ activeFrom: null, activeUntil: null }, '2026-03-15'), true);
});

test('un periodo con desde posterior a hasta no está activo ningún día', () => {
  const habit = { activeFrom: '2026-03-20', activeUntil: '2026-03-10' };
  for (const date of ['2026-03-05', '2026-03-15', '2026-03-25']) assert.equal(isInPeriod(habit, date), false, date);
});

test('isActiveOn: activo sin fechas, con fechas, inactivo sin hasta (nunca) e inactivo con hasta', () => {
  assert.equal(isActiveOn({ status: 'active', activeFrom: null, activeUntil: null }, '2026-03-15'), true);
  assert.equal(isActiveOn({ status: 'active', activeFrom: '2026-03-10', activeUntil: '2026-03-20' }, '2026-03-15'), true);
  assert.equal(isActiveOn({ status: 'active', activeFrom: '2026-03-10', activeUntil: '2026-03-20' }, '2026-03-21'), false);

  assert.equal(isActiveOn({ status: 'inactive', activeFrom: null, activeUntil: null }, '2026-03-15'), false);
  const deactivated = { status: 'inactive', activeFrom: null, activeUntil: '2026-03-10' };
  assert.equal(isActiveOn(deactivated, '2026-03-10'), true);
  assert.equal(isActiveOn(deactivated, '2026-03-11'), false);
  assert.equal(isActiveOn({ ...deactivated, activeFrom: '2026-03-05' }, '2026-03-04'), false);
});

test('countsOn pide que toque por la frecuencia y que caiga dentro del periodo', () => {
  const weekdays = makeHabit({ frequencySet: new Set([1, 2, 3, 4, 5]), activeFrom: '2026-11-04', activeUntil: '2026-11-10' });
  assert.equal(countsOn(weekdays, day('2026-11-03')), false, 'lunes antes de desde');
  assert.equal(countsOn(weekdays, day('2026-11-04')), true, 'miércoles, primer día');
  assert.equal(countsOn(weekdays, day('2026-11-07')), false, 'sábado: no toca');
  assert.equal(countsOn(weekdays, day('2026-11-10')), true, 'martes, último día');
  assert.equal(countsOn(weekdays, day('2026-11-11')), false, 'después de hasta');
});

// --- Reglas del editor -----------------------------------------------------------------

test('isValidPeriod solo falla con los dos extremos y al revés', () => {
  assert.equal(isValidPeriod('2026-03-01', '2026-03-01'), true);
  assert.equal(isValidPeriod('2026-03-01', '2026-03-02'), true);
  assert.equal(isValidPeriod('2026-03-02', '2026-03-01'), false);
  assert.equal(isValidPeriod('', '2026-03-01'), true);
  assert.equal(isValidPeriod('2026-03-01', ''), true);
  assert.equal(isValidPeriod(null, null), true);
});

test('desactivar escribe hasta = hoy y reactivar lo borra', () => {
  assert.equal(activeUntilForStatus(false, '', '2026-11-09'), '2026-11-09');
  assert.equal(activeUntilForStatus(true, '2026-11-09', '2026-11-09'), '');
  assert.equal(activeUntilForStatus(true, '', '2026-11-09'), '');
});

test('al desactivar, un hasta anterior a hoy se respeta y uno futuro pasa a hoy', () => {
  assert.equal(activeUntilForStatus(false, '2026-10-01', '2026-11-09'), '2026-10-01');
  assert.equal(activeUntilForStatus(false, '2026-12-31', '2026-11-09'), '2026-11-09');
  assert.equal(activeUntilForStatus(false, '2026-11-09', '2026-11-09'), '2026-11-09');
});

// --- Rachas: los días fuera del periodo son neutrales -------------------------------------

test('las celdas anteriores a desde y posteriores a hasta no cuentan como programadas', () => {
  const habit = makeHabit({ activeFrom: '2026-11-04', activeUntil: '2026-11-06', completions: tick('2026-11-04', '2026-11-05', '2026-11-06') });
  const cells = computeCells(habit, range('2026-11-02', 7).map(day), 0, true);
  assert.deepEqual(cells.map(cell => cell.scheduled), [false, false, true, true, true, false, false]);
  assert.equal(cells[0].classes, '--oa-unscheduled');
});

test('los días antes de desde no rompen la racha', () => {
  const habit = makeHabit({ activeFrom: '2026-11-04', completions: tick('2026-11-04', '2026-11-05', '2026-11-06') });
  const cells = computeCells(habit, range('2026-11-01', 8).map(day), 0, true);
  const run = cells.filter(cell => cell.streakCount > 0);
  assert.deepEqual(run.map(cell => cell.date), ['2026-11-04', '2026-11-05', '2026-11-06']);
  assert.equal(run[0].streakCount, 3);
  assert.equal(computeStats(habit).current, 3);
});

test('un día marcado fuera del periodo no suma a la racha ni al máximo', () => {
  const habit = makeHabit({ activeFrom: '2026-11-04', activeUntil: '2026-11-06', completions: tick('2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-08') });
  assert.deepEqual([computeStats(habit).current, computeStats(habit).max], [1, 1]);
  assert.deepEqual([computeOccurrenceStats(habit, 'morning').current, computeOccurrenceStats(habit, 'morning').max], [1, 1]);
});

test('una racha continúa por encima de los días fuera del periodo con maxGap 0', () => {
  // Frecuencia solo lunes y miércoles; el miércoles 4 queda fuera por desde, así que el lunes 2 y el lunes 9 no se separan por un día programado
  const habit = makeHabit({ frequencySet: new Set([1, 3]), activeFrom: '2026-11-05', completions: tick('2026-11-09', '2026-11-11') });
  assert.equal(computeStats(habit).current, 2);
});

test('las celdas por ocurrencia también respetan el periodo', () => {
  const habit = makeHabit({ activeUntil: '2026-11-03', completions: tick('2026-11-02', '2026-11-03', '2026-11-04') });
  const cells = computeOccurrenceCells(habit, 'morning', range('2026-11-02', 3).map(day), 0, true);
  assert.deepEqual(cells.map(cell => cell.scheduled), [true, true, false]);
  assert.deepEqual(cells.map(cell => cell.ticked), [true, true, true], 'la marca queda guardada, solo que no cuenta');
});

test('sin desde ni hasta el resultado es el de antes', () => {
  const habit = makeHabit({ completions: tick('2026-11-01', '2026-11-02', '2026-11-03') });
  assert.equal(computeStats(habit).current, 3);
  const cells = computeCells(habit, range('2026-11-01', 5).map(day), 0, true);
  assert.deepEqual(cells.map(cell => cell.scheduled), [true, true, true, true, true]);
});

// --- Porcentajes: el historial no cambia al desactivar ------------------------------------

function statsFor(habits, date) {
  const year = Number(date.slice(0, 4));
  return computeYearHistory(habits, year).find(stat => stat.date === date);
}

test('desactivar un hábito con hasta no cambia el porcentaje de las fechas pasadas', () => {
  const doneA = tick('2026-03-05', '2026-03-15');
  const doneB = tick('2026-03-05');
  const a = makeHabit({ file: { basename: 'a', path: 'a.md' }, completions: doneA });

  const bActive = makeHabit({ file: { basename: 'b', path: 'b.md' }, completions: doneB });
  const bDeactivated = makeHabit({ file: { basename: 'b', path: 'b.md' }, completions: doneB, status: 'inactive', activeUntil: '2026-03-10' });

  // 5 de marzo: dentro del periodo de B, el resultado es el mismo antes y después de desactivarlo
  assert.deepEqual(statsFor([a, bActive], '2026-03-05'), statsFor([a, bDeactivated], '2026-03-05'));
  assert.deepEqual([statsFor([a, bDeactivated], '2026-03-05').done, statsFor([a, bDeactivated], '2026-03-05').total], [2, 2]);

  // 15 de marzo: B ya no cuenta, solo A
  const later = statsFor([a, bDeactivated], '2026-03-15');
  assert.deepEqual([later.done, later.total], [1, 1]);
  assert.equal(later.pct, 1);
});

test('sin la lista de estadísticas el porcentaje pasado sí cambiaría (por eso existe getHabitsForStats)', () => {
  const a = makeHabit({ completions: tick('2026-03-05') });
  const bDeactivated = makeHabit({ completions: {}, status: 'inactive', activeUntil: '2026-03-10' });
  assert.equal(statsFor([a], '2026-03-05').pct, 1);
  assert.equal(statsFor([a, bDeactivated], '2026-03-05').pct, 0.5);
});

test('un hábito aún no empezado no cuenta antes de desde', () => {
  const a = makeHabit({ completions: tick('2026-03-05') });
  const later = makeHabit({ activeFrom: '2026-03-10' });
  const before = statsFor([a, later], '2026-03-05');
  assert.deepEqual([before.done, before.total], [1, 1]);
  assert.equal(statsFor([a, later], '2026-03-10').total, 2);
});

test('el porcentaje por área solo cuenta los hábitos dentro de su periodo', () => {
  const inside = makeHabit({ area: 'physical', completions: tick('2026-03-05') });
  const outside = makeHabit({ area: 'physical', activeFrom: '2026-04-01' });
  const stats = computeAreaStats([inside, outside], '2026-03-05');
  assert.equal(stats.physical.raw, 1);
});

test('el Dashboard calcula los porcentajes con la lista de estadísticas y las rachas y el total con los activos', () => {
  const today = iso(DateTime.local());
  const yesterday = iso(DateTime.local().minus({ days: 1 }));
  const tenDaysAgo = iso(DateTime.local().minus({ days: 10 }));
  const active = makeHabit({ completions: tick(today, yesterday, tenDaysAgo) });
  // Desactivado hace cinco días: sus días anteriores siguen en el historial
  const recent = makeHabit({ status: 'inactive', activeUntil: iso(DateTime.local().minus({ days: 5 })), completions: tick(tenDaysAgo) });
  const old = makeHabit({ status: 'inactive', activeUntil: '2020-01-01', completions: tick('2019-12-30', '2019-12-31', '2020-01-01') });

  const withStats = computeDashboard([active], [active, recent, old]);
  const plain = computeDashboard([active]);
  assert.equal(withStats.totalHabits, 1);
  assert.equal(withStats.todayRaw, plain.todayRaw, 'los desactivados ya no cuentan hoy');
  assert.equal(withStats.currentStreak, plain.currentStreak, 'su racha no entra en la «actual»');
  assert.equal(withStats.history30d.length, 30);

  const pastDay = (dashboard) => dashboard.history30d.find(stat => stat.date === tenDaysAgo);
  assert.equal(pastDay(plain).total, 1);
  assert.equal(pastDay(withStats).total, 2, 'el desactivado cuenta en las fechas de su periodo');
});

// --- Traducciones -----------------------------------------------------------------------------

test('el periodo activo tiene sus textos en los 6 idiomas', () => {
  const { readFileSync } = require('node:fs');
  const path = require('node:path');
  for (const locale of ['en', 'es', 'de', 'fr', 'it', 'pt']) {
    const translations = JSON.parse(readFileSync(path.join(__dirname, '..', 'src', 'locales', `${locale}.json`), 'utf8'));
    for (const key of ['habit_active_from', 'habit_active_until', 'habit_period_invalid', 'habit_period_clear']) {
      assert.ok(typeof translations[key] === 'string' && translations[key].trim() !== '', `${locale}: falta ${key}`);
    }
  }
});
