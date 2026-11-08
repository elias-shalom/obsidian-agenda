const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DateTime } = require('luxon');
const { loadSource } = require('./helpers/load-source.cjs');

const {
  DEFAULT_NON_WORKING_DAYS, isValidNonWorkingSet, sanitizeNonWorkingDays, isNonWorkingDay,
  getWorkweekDays, getWorkweekDates, toggleNonWorkingDay,
} = loadSource('core/non-working-days.ts');

const MONDAY = DateTime.fromISO('2026-11-02'); // lunes

// --- Regla de extremos y saneo --------------------------------------------------

test('por defecto son sábado y domingo', () => {
  assert.deepEqual([...DEFAULT_NON_WORKING_DAYS], [6, 7]);
});

test('la regla de extremos: ni vacío ni los siete días', () => {
  assert.equal(isValidNonWorkingSet([]), false);
  assert.equal(isValidNonWorkingSet([1, 2, 3, 4, 5, 6, 7]), false);
  assert.equal(isValidNonWorkingSet([7]), true);
  assert.equal(isValidNonWorkingSet([1, 2, 3, 4, 5, 6]), true);
});

test('un ajuste guardado válido se conserva, ordenado y sin repetidos', () => {
  assert.deepEqual(sanitizeNonWorkingDays([6, 7]), [6, 7]);
  assert.deepEqual(sanitizeNonWorkingDays([7, 5, 5, 6]), [5, 6, 7]);
  assert.deepEqual(sanitizeNonWorkingDays([1]), [1]);
});

test('un ajuste guardado inválido vuelve a sábado y domingo', () => {
  for (const bad of [undefined, null, 'x', 6, {}, [], [1, 2, 3, 4, 5, 6, 7], [0], [8], [1.5], ['6'], [6, 'x'], [NaN]]) {
    assert.deepEqual(sanitizeNonWorkingDays(bad), [6, 7], `entrada ${JSON.stringify(bad)}`);
  }
});

test('el valor por defecto devuelto es una copia que se puede modificar sin tocar el original', () => {
  const copy = sanitizeNonWorkingDays(undefined);
  copy.push(1);
  assert.deepEqual([...DEFAULT_NON_WORKING_DAYS], [6, 7]);
});

// --- Día no laborable y semana laboral -----------------------------------------

test('isNonWorkingDay compara el día ISO de la fecha con el ajuste', () => {
  assert.equal(isNonWorkingDay(DateTime.fromISO('2026-11-07'), [6, 7]), true); // sábado
  assert.equal(isNonWorkingDay(DateTime.fromISO('2026-11-08'), [6, 7]), true); // domingo
  assert.equal(isNonWorkingDay(DateTime.fromISO('2026-11-06'), [6, 7]), false); // viernes
  assert.equal(isNonWorkingDay(DateTime.fromISO('2026-11-06'), [5]), true);
});

test('getWorkweekDays: los días no marcados, de lunes a domingo', () => {
  assert.deepEqual(getWorkweekDays([6, 7]), [1, 2, 3, 4, 5]);
  assert.deepEqual(getWorkweekDays([5, 6]), [1, 2, 3, 4, 7]);
  assert.deepEqual(getWorkweekDays([1, 7]), [2, 3, 4, 5, 6]);
});

test('getWorkweekDays con un solo día no laborable da seis y con seis da uno', () => {
  assert.deepEqual(getWorkweekDays([7]), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(getWorkweekDays([1, 2, 3, 4, 5, 6]), [7]);
});

test('con el ajuste por defecto la Semana laboral es de lunes a viernes, como hasta ahora', () => {
  const dates = getWorkweekDates(MONDAY, [6, 7]);
  assert.deepEqual(dates.map(date => date.toISODate()), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
});

test('la Semana laboral omite los días marcados y conserva el orden', () => {
  assert.deepEqual(getWorkweekDates(MONDAY, [1, 7]).map(date => date.toISODate()),
    ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
  assert.deepEqual(getWorkweekDates(MONDAY, [3, 6, 7]).map(date => date.weekday), [1, 2, 4, 5]);
});

test('con un ajuste válido la Semana laboral nunca queda vacía', () => {
  for (let mask = 1; mask < 127; mask += 1) {
    const days = [1, 2, 3, 4, 5, 6, 7].filter((_, index) => mask & (1 << index));
    assert.ok(getWorkweekDates(MONDAY, days).length >= 1, `ajuste ${days}`);
  }
});

// --- Marcar y desmarcar casillas ------------------------------------------------

test('marcar un día lo añade, ordenado', () => {
  assert.deepEqual(toggleNonWorkingDay([6, 7], 5), { days: [5, 6, 7], rejected: false });
});

test('desmarcar un día lo quita', () => {
  assert.deepEqual(toggleNonWorkingDay([5, 6, 7], 5), { days: [6, 7], rejected: false });
});

test('no se puede desmarcar el último día no laborable', () => {
  assert.deepEqual(toggleNonWorkingDay([7], 7), { days: [7], rejected: true });
});

test('no se puede marcar el séptimo día', () => {
  assert.deepEqual(toggleNonWorkingDay([1, 2, 3, 4, 5, 6], 7), { days: [1, 2, 3, 4, 5, 6], rejected: true });
});

test('un día que no es ISO se rechaza sin tocar el ajuste', () => {
  assert.deepEqual(toggleNonWorkingDay([6, 7], 0), { days: [6, 7], rejected: true });
  assert.deepEqual(toggleNonWorkingDay([6, 7], 8), { days: [6, 7], rejected: true });
});

test('marcar y desmarcar no modifica la lista recibida', () => {
  const current = [6, 7];
  toggleNonWorkingDay(current, 5);
  assert.deepEqual(current, [6, 7]);
});
