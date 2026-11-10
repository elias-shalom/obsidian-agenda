const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DateTime } = require('luxon');
const { loadSource } = require('./helpers/load-source.cjs');

// Las recurrentes `every weekday` y `every weekend` siguen los días no laborables de los ajustes (v1.1.15, NL2).
const stubs = { obsidian: { getLanguage: () => 'en', App: class {} } };
const { TaskSection } = loadSource('entities/task-section.ts', stubs);
const { getNextOccurrenceDate, buildRecurrenceOccurrence } = loadSource('core/task-recurrence.ts', stubs);

const iso = (date) => date.toISODate();
// Viernes 6 de noviembre de 2026
const FRIDAY = DateTime.fromISO('2026-11-06');
const THURSDAY = DateTime.fromISO('2026-11-05');

// --- convertToRRuleFormat ----------------------------------------------------------------

test('con el ajuste por defecto la conversión a RRULE es la de siempre', () => {
  assert.equal(TaskSection.convertToRRuleFormat('every weekday'), 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
  assert.equal(TaskSection.convertToRRuleFormat('every weekend'), 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU');
  assert.equal(TaskSection.convertToRRuleFormat('every weekday', [6, 7]), 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
  assert.equal(TaskSection.convertToRRuleFormat('every weekend', [6, 7]), 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU');
});

test('every weekend usa los días no laborables y every weekday los demás', () => {
  assert.equal(TaskSection.convertToRRuleFormat('every weekend', [5, 6]), 'RRULE:FREQ=WEEKLY;BYDAY=FR,SA');
  assert.equal(TaskSection.convertToRRuleFormat('every weekday', [5, 6]), 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,SU');
  assert.equal(TaskSection.convertToRRuleFormat('every weekend', [7]), 'RRULE:FREQ=WEEKLY;BYDAY=SU');
  assert.equal(TaskSection.convertToRRuleFormat('every weekday', [7]), 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA');
});

test('las demás recurrencias no dependen del ajuste', () => {
  for (const text of ['every day', 'every 2 weeks', 'every month', 'every monday', 'every week until 2026-12-31']) {
    assert.equal(TaskSection.convertToRRuleFormat(text, [5, 6]), TaskSection.convertToRRuleFormat(text), text);
  }
});

test('un ajuste inválido o vacío cuenta como sábado y domingo', () => {
  assert.equal(TaskSection.convertToRRuleFormat('every weekend', []), 'RRULE:FREQ=WEEKLY;BYDAY=SA,SU');
  assert.equal(TaskSection.convertToRRuleFormat('every weekday', [1, 2, 3, 4, 5, 6, 7]), 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
});

// --- Siguiente ocurrencia -----------------------------------------------------------------

test('every weekday tras un viernes cae en el lunes con el ajuste por defecto', () => {
  assert.equal(iso(getNextOccurrenceDate('every weekday', FRIDAY)), '2026-11-09');
  assert.equal(iso(getNextOccurrenceDate('every weekday', FRIDAY, [6, 7])), '2026-11-09');
});

test('every weekend tras un viernes cae en el sábado con el ajuste por defecto', () => {
  assert.equal(iso(getNextOccurrenceDate('every weekend', FRIDAY)), '2026-11-07');
});

test('con viernes y sábado no laborables, every weekday tras un jueves cae en el domingo', () => {
  assert.equal(iso(getNextOccurrenceDate('every weekday', THURSDAY, [5, 6])), '2026-11-08');
});

test('con viernes y sábado no laborables, every weekend tras un jueves cae en el viernes y tras el viernes en el sábado', () => {
  assert.equal(iso(getNextOccurrenceDate('every weekend', THURSDAY, [5, 6])), '2026-11-06');
  assert.equal(iso(getNextOccurrenceDate('every weekend', FRIDAY, [5, 6])), '2026-11-07');
});

test('el mismo texto da fechas distintas según el ajuste', () => {
  assert.notEqual(iso(getNextOccurrenceDate('every weekend', THURSDAY, [6, 7])), iso(getNextOccurrenceDate('every weekend', THURSDAY, [5, 6])));
});

test('when done sigue el ajuste igual que la recurrencia normal', () => {
  const next = getNextOccurrenceDate('every weekday when done', FRIDAY, [7]);
  assert.ok(next);
  assert.notEqual(next.weekday, 7);
});

// --- Línea de la siguiente ocurrencia ------------------------------------------------------

function task(repeat, due) {
  return {
    flow: { repeat },
    date: { due: DateTime.fromISO(due), scheduled: null, start: null },
    line: { text: `- [ ] Pay 🔁 ${repeat} 📅 ${due}` },
  };
}

test('buildRecurrenceOccurrence usa el ajuste que recibe', () => {
  const done = 'x';
  assert.match(buildRecurrenceOccurrence(task('every weekend', '2026-11-05'), done, [5, 6]), /📅 2026-11-06/);
  assert.match(buildRecurrenceOccurrence(task('every weekend', '2026-11-05'), done, [6, 7]), /📅 2026-11-07/);
});

test('buildRecurrenceOccurrence sin ajuste se comporta como antes', () => {
  assert.match(buildRecurrenceOccurrence(task('every weekday', '2026-11-06'), 'x'), /📅 2026-11-09/);
});

test('buildRecurrenceOccurrence no hace nada si el nuevo estado no es Hecho', () => {
  assert.equal(buildRecurrenceOccurrence(task('every weekday', '2026-11-06'), ' ', [5, 6]), null);
});
