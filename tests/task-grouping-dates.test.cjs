const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadSource } = require('./helpers/load-source.cjs');

const { groupTasksByField, groupTasksForView, TASK_GROUP_OPTIONS } = loadSource('core/task-grouping.ts');
const { isGroupOptionInUse } = loadSource('core/task-lanes.ts');

const day = (iso) => ({ toISODate: () => iso });

function task(id, { due, start, scheduled } = {}) {
  return {
    id,
    state: { status: ' ', priority: 'normal' },
    file: { path: 'a.md', name: 'a' },
    section: { desc: id, tags: [] },
    date: { due: due ? day(due) : null, start: start ? day(start) : null, scheduled: scheduled ? day(scheduled) : null },
  };
}

const tasks = [
  task('a', { due: '2026-11-05', start: '2026-11-02', scheduled: '2026-11-04' }),
  task('b', { due: '2026-11-01', scheduled: '2026-11-04' }),
  task('c', { start: '2026-11-01' }),
  task('d', {}),
];

const shape = (groups) => groups.map(group => [group.key, group.tasks.map(item => item.id)]);

test('el agrupado de Lista y Tabla ofrece Vencimiento, Inicio y Programada', () => {
  const values = TASK_GROUP_OPTIONS.map(option => option.value);
  assert.deepEqual(values.slice(-3), ['dueDate', 'startDate', 'scheduledDate']);
  assert.deepEqual(TASK_GROUP_OPTIONS.slice(-2).map(option => option.labelKey), ['start_date', 'scheduled_date']);
});

test('Vencimiento agrupa por su fecha, ascendente, y «sin fecha» al final', () => {
  assert.deepEqual(shape(groupTasksByField(tasks, 'dueDate')), [['2026-11-01', ['b']], ['2026-11-05', ['a']], ['', ['c', 'd']]]);
});

test('Inicio agrupa por la fecha de inicio y no por otra', () => {
  assert.deepEqual(shape(groupTasksByField(tasks, 'startDate')), [['2026-11-01', ['c']], ['2026-11-02', ['a']], ['', ['b', 'd']]]);
});

test('Programada agrupa por la fecha programada y no por otra', () => {
  assert.deepEqual(shape(groupTasksByField(tasks, 'scheduledDate')), [['2026-11-04', ['a', 'b']], ['', ['c', 'd']]]);
});

test('«sin fecha» se rotula con la clave de traducción y las fechas con su día', () => {
  const groups = groupTasksByField(tasks, 'startDate', key => `<${key}>`);
  assert.deepEqual(groups.map(group => group.label), ['2026-11-01', '2026-11-02', '<none>']);
});

test('groupTasksForView acepta las dos opciones nuevas', () => {
  assert.equal(groupTasksForView(tasks, 'startDate', key => key).length, 3);
  assert.equal(groupTasksForView(tasks, 'scheduledDate', key => key).length, 2);
});

test('no chocan con ningún carril', () => {
  for (const lane of ['area', 'subArea', 'status', 'priority', 'tag', 'folder', 'file']) {
    assert.equal(isGroupOptionInUse('startDate', lane), false);
    assert.equal(isGroupOptionInUse('scheduledDate', lane), false);
  }
});
