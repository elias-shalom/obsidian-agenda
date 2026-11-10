const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadSource } = require('./helpers/load-source.cjs');

const { parseHabit } = loadSource('habits/habit-parser.ts');
const { matchFrequencyPreset } = loadSource('core/non-working-days.ts');

const file = { basename: 'Read', path: 'habits/Read.md' };

function habit(frequency, nonWorkingDays) {
  const settings = { habitDefaultMaxGap: 0, habitDefaultPriority: 3, habitDefaultColor: '', nonWorkingDays };
  return parseHabit(file, { name: 'Read', frequency }, settings);
}

const days = (parsed) => [...parsed.frequencySet].sort((a, b) => a - b);

test('con el ajuste por defecto las frecuencias predefinidas son las de siempre', () => {
  assert.deepEqual(days(habit('everyday', [6, 7])), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(days(habit('workweek', [6, 7])), [1, 2, 3, 4, 5]);
  assert.deepEqual(days(habit('weekend', [6, 7])), [6, 7]);
});

test('un hábito guardado sin ajuste en los ajustes sigue con sábado y domingo', () => {
  assert.deepEqual(days(habit('weekend', undefined)), [6, 7]);
  assert.deepEqual(days(habit('workweek', undefined)), [1, 2, 3, 4, 5]);
});

test('«Fin de semana» son los días no laborables del ajuste', () => {
  assert.deepEqual(days(habit('weekend', [5, 6])), [5, 6]);
  assert.deepEqual(days(habit('weekend', [7])), [7]);
  assert.deepEqual(days(habit('weekend', [1, 2, 3, 4, 5, 6])), [1, 2, 3, 4, 5, 6]);
});

test('«Lunes a viernes» son los días laborables del ajuste', () => {
  assert.deepEqual(days(habit('workweek', [5, 6])), [1, 2, 3, 4, 7]);
  assert.deepEqual(days(habit('workweek', [7])), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(days(habit('workweek', [1, 2, 3, 4, 5, 6])), [7]);
});

test('«Todos los días» y la frecuencia por defecto no cambian con el ajuste', () => {
  assert.deepEqual(days(habit('everyday', [5, 6])), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(days(habit(undefined, [5, 6])), [1, 2, 3, 4, 5, 6, 7]);
});

test('una lista de días explícita no sigue el ajuste', () => {
  const explicit = ['saturday', 'sunday'];
  assert.deepEqual(days(habit(explicit, [6, 7])), [6, 7]);
  assert.deepEqual(days(habit(explicit, [5, 6])), [6, 7]);
  assert.deepEqual(days(habit(['monday', 'wednesday'], [5, 6])), [1, 3]);
});

test('el token puede ir dentro de una lista y se combina con días sueltos', () => {
  assert.deepEqual(days(habit(['weekend', 'monday'], [5, 6])), [1, 5, 6]);
  assert.deepEqual(days(habit('weekend, monday', [5, 6])), [1, 5, 6]);
});

test('el editor y la tabla describen el hábito con el ajuste de ahora', () => {
  const asWeekend = habit('weekend', [5, 6]);
  assert.equal(matchFrequencyPreset(asWeekend.frequencySet, [5, 6]), 'weekend');
  assert.equal(matchFrequencyPreset(asWeekend.frequencySet, [6, 7]), 'custom');
  assert.equal(matchFrequencyPreset(habit('workweek', [5, 6]).frequencySet, [5, 6]), 'workweek');
});

test('un día programado cambia con el ajuste: el viernes cuenta en «Fin de semana» si es no laborable', () => {
  const friday = 5;
  assert.equal(habit('weekend', [6, 7]).frequencySet.has(friday), false);
  assert.equal(habit('weekend', [5, 6]).frequencySet.has(friday), true);
  assert.equal(habit('workweek', [5, 6]).frequencySet.has(friday), false);
});
