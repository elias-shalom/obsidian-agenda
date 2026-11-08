const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DateTime } = require('luxon');
const { loadSource } = require('./helpers/load-source.cjs');

// Proyección de recurrentes (v1.1.15, PR1): ocurrencias fantasma en memoria de una tarea con 🔁.
const stubs = { obsidian: {} };
const { projectOccurrences } = loadSource('core/task-projection.ts', stubs);

const day = (iso) => DateTime.fromISO(iso);
const iso = (date) => date?.toISODate() ?? null;

function makeTask(overrides = {}) {
  const { date, state, flow, ...rest } = overrides;
  return {
    id: 'Tareas.md#4',
    file: { path: 'Tareas.md', name: 'Tareas', ext: 'md', root: '', meta: null },
    line: { number: 4, text: '- [ ] Regar 🔁 every day ⏳ 2026-11-04' },
    state: { status: ' ', emoji: '⭕', text: 'Todo', priority: 'normal', isValid: true, ...state },
    date: {
      due: null, start: null, scheduled: day('2026-11-04'), created: day('2026-10-01'), done: null, cancelled: null,
      scheduledTime: null, scheduledDuration: null, ...date,
    },
    section: { header: '', desc: 'Regar', tags: [], fields: [] },
    flow: { id: '', repeat: 'every day', blockLink: '', dependsOn: [], onCompletion: null, ...flow },
    ...rest,
  };
}

const dates = (occurrences) => occurrences.map(o => iso(o.task.date.scheduled));

// --- Cálculo -----------------------------------------------------------------

test('una diaria proyecta N días seguidos tras la real, sin repetirla', () => {
  const result = projectOccurrences(makeTask(), 3);
  assert.deepEqual(dates(result), ['2026-11-05', '2026-11-06', '2026-11-07']);
  assert.deepEqual(result.map(o => o.index), [1, 2, 3]);
});

test('una semanal suma siete días cada vez', () => {
  const result = projectOccurrences(makeTask({ flow: { repeat: 'every week' } }), 3);
  assert.deepEqual(dates(result), ['2026-11-11', '2026-11-18', '2026-11-25']);
});

test('una mensual proyecta mes a mes', () => {
  const result = projectOccurrences(makeTask({ flow: { repeat: 'every month' } }), 3);
  assert.deepEqual(dates(result), ['2026-12-04', '2027-01-04', '2027-02-04']);
});

test('every 2 weeks y un día de la semana fijo', () => {
  assert.deepEqual(dates(projectOccurrences(makeTask({ flow: { repeat: 'every 2 weeks' } }), 2)), ['2026-11-18', '2026-12-02']);
  // 2026-11-04 es miércoles; la siguiente en lunes es el 9
  assert.deepEqual(dates(projectOccurrences(makeTask({ flow: { repeat: 'every monday' } }), 2)), ['2026-11-09', '2026-11-16']);
});

test('N exacto: ni una más ni una menos', () => {
  for (const count of [1, 2, 10, 50]) assert.equal(projectOccurrences(makeTask(), count).length, count);
});

test('con N en 0, negativo o no numérico no proyecta', () => {
  for (const count of [0, -3, NaN, Infinity]) assert.deepEqual(projectOccurrences(makeTask(), count), [], String(count));
});

test('un N con decimales se trunca', () => {
  assert.equal(projectOccurrences(makeTask(), 2.9).length, 2);
});

test('las fechas son estrictamente crecientes y posteriores a la real', () => {
  const result = projectOccurrences(makeTask({ flow: { repeat: 'every weekday' } }), 20);
  const list = dates(result);
  assert.ok(list.every(date => date > '2026-11-04'));
  assert.deepEqual(list, [...list].sort());
  assert.equal(new Set(list).size, list.length);
});

// --- Qué no se proyecta -----------------------------------------------------------

test('when done no se proyecta', () => {
  assert.deepEqual(projectOccurrences(makeTask({ flow: { repeat: 'every day when done' } }), 5), []);
  assert.deepEqual(projectOccurrences(makeTask({ flow: { repeat: 'every week WHEN DONE' } }), 5), []);
});

test('sin recurrencia, con recurrencia inválida o sin ninguna fecha no se proyecta', () => {
  assert.deepEqual(projectOccurrences(makeTask({ flow: { repeat: '' } }), 5), []);
  assert.deepEqual(projectOccurrences(makeTask({ flow: { repeat: 'cuando me acuerde' } }), 5), []);
  assert.deepEqual(projectOccurrences(makeTask({ date: { scheduled: null } }), 5), []);
});

test('una tarea terminada, cancelada o que no es tarea no proyecta: su siguiente ya existe', () => {
  for (const status of ['x', '-', '~']) assert.deepEqual(projectOccurrences(makeTask({ state: { status } }), 5), [], status);
});

test('una tarea en curso o en espera sí proyecta', () => {
  for (const status of ['/', '?']) assert.equal(projectOccurrences(makeTask({ state: { status } }), 2).length, 2, status);
});

test('una regla con until se queda sin ocurrencias antes de llegar a N', () => {
  const result = projectOccurrences(makeTask({ flow: { repeat: 'every day until 2026-11-10' } }), 30);
  assert.ok(result.length > 0 && result.length < 10);
  assert.ok(dates(result).every(date => date <= '2026-11-10'));
});

// --- Fecha de referencia y desplazamiento --------------------------------------------

test('la referencia es scheduled > due > start y todas las fechas se desplazan lo mismo', () => {
  const task = makeTask({ date: { scheduled: day('2026-11-04'), due: day('2026-11-10'), start: day('2026-11-01') } });
  const [first] = projectOccurrences(task, 1);
  assert.equal(iso(first.task.date.scheduled), '2026-11-05');
  assert.equal(iso(first.task.date.due), '2026-11-11');
  assert.equal(iso(first.task.date.start), '2026-11-02');
});

test('sin scheduled manda due, y sin due manda start', () => {
  const byDue = projectOccurrences(makeTask({ date: { scheduled: null, due: day('2026-11-10') } }), 1)[0];
  assert.equal(iso(byDue.task.date.due), '2026-11-11');
  assert.equal(byDue.task.date.scheduled, null);

  const byStart = projectOccurrences(makeTask({ date: { scheduled: null, start: day('2026-11-20') } }), 1)[0];
  assert.equal(iso(byStart.task.date.start), '2026-11-21');
});

test('conserva la hora y la duración y las fechas que la tarea no tiene siguen vacías', () => {
  const task = makeTask({ date: { scheduledTime: '09:30', scheduledDuration: 45 } });
  const [first] = projectOccurrences(task, 1);
  assert.equal(first.task.date.scheduledTime, '09:30');
  assert.equal(first.task.date.scheduledDuration, 45);
  assert.equal(first.task.date.due, null);
  assert.equal(first.task.date.start, null);
});

test('la distancia entre fechas se mantiene en toda la cadena', () => {
  const task = makeTask({ date: { scheduled: day('2026-11-04'), due: day('2026-11-08') }, flow: { repeat: 'every week' } });
  for (const { task: ghost } of projectOccurrences(task, 4)) {
    assert.equal(ghost.date.due.diff(ghost.date.scheduled, 'days').days, 4);
  }
});

test('every weekday sigue los días no laborables del ajuste', () => {
  // Con viernes y sábado no laborables, el jueves 5 de noviembre va seguido del domingo 8 y el lunes 9
  const task = makeTask({ date: { scheduled: day('2026-11-05') }, flow: { repeat: 'every weekday' } });
  assert.deepEqual(dates(projectOccurrences(task, 2, [5, 6])), ['2026-11-08', '2026-11-09']);
  assert.deepEqual(dates(projectOccurrences(task, 2)), ['2026-11-06', '2026-11-09']);
});

// --- La entrada fantasma ----------------------------------------------------------

test('el fantasma apunta a la tarea real y conserva su archivo y su línea', () => {
  const task = makeTask();
  const [ghost] = projectOccurrences(task, 1);
  assert.equal(ghost.source, task);
  assert.equal(ghost.task.file, task.file);
  assert.equal(ghost.task.line.number, 4);
  assert.equal(ghost.task.section.desc, 'Regar');
  assert.notEqual(ghost.task.id, task.id);
});

test('los fantasmas se distinguen entre sí por su id', () => {
  const ids = projectOccurrences(makeTask(), 5).map(o => o.task.id);
  assert.equal(new Set(ids).size, 5);
});

test('el fantasma queda pendiente y sin fechas de cierre, aunque la real esté en curso', () => {
  const task = makeTask({ state: { status: '/', emoji: '🛠️' }, date: { done: day('2026-11-01'), cancelled: day('2026-11-02') } });
  const [ghost] = projectOccurrences(task, 1);
  assert.equal(ghost.task.state.status, ' ');
  assert.equal(ghost.task.date.done, null);
  assert.equal(ghost.task.date.cancelled, null);
});

test('proyectar no modifica la tarea real', () => {
  const task = makeTask({ state: { status: '/' }, date: { due: day('2026-11-10') } });
  const before = JSON.stringify(task);
  projectOccurrences(task, 5);
  assert.equal(JSON.stringify(task), before);
  assert.equal(task.state.status, '/');
});
