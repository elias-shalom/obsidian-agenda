const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const Handlebars = require('handlebars');
const { DateTime } = require('luxon');
const { loadSource } = require('./helpers/load-source.cjs');

const gantt = loadSource('core/task-gantt.ts');
const { parseGanttState } = loadSource('core/gantt-state.ts');
const { buildGanttTaskRows, buildGanttGroupedRows, buildGanttLanes, ganttGroupKey, ganttWindow, GANTT_GROUP_OPTIONS } = gantt;

const SYMBOL = { Todo: ' ', Done: 'x' };
const day = (iso) => DateTime.fromISO(iso);

function task(id, { file = 'a.md', status = 'Todo', priority = 'normal', start, due } = {}) {
  return {
    id,
    state: { status: SYMBOL[status], priority, emoji: '⭕' },
    file: { path: file, name: file.split('/').pop().replace(/\.md$/, '') },
    line: { number: 1 },
    section: { desc: id, tags: [] },
    date: { start: start ? day(start) : null, due: due ? day(due) : null, scheduled: null },
  };
}

// Ventana de 14 días desde el lunes 2026-11-02
const win = ganttWindow(day('2026-11-04'), 14, 1);

const vault = [
  task('a', { file: 'Work/a.md', start: '2026-11-03', due: '2026-11-05' }),
  task('b', { file: 'Work/Proj/b.md', start: '2026-11-04', due: '2026-11-06', status: 'Done' }),
  task('c', { file: 'Personal/c.md', start: '2026-11-04', due: '2026-11-04', priority: 'high' }),
  task('far', { file: 'Work/far.md', start: '2027-03-01', due: '2027-03-02' }),
];

const never = () => false;
const labels = (rows) => rows.filter(row => row.isGroup).map(row => row.label);
const taskIds = (rows) => rows.filter(row => !row.isGroup).map(row => row.task.id);

// --- Opciones y claves --------------------------------------------------------

test('el chip Group del Gantt ofrece Ninguno, Área, Estado y Prioridad', () => {
  assert.deepEqual(GANTT_GROUP_OPTIONS.map(option => option.value), ['none', 'area', 'status', 'priority']);
});

test('la clave de plegado lleva el campo, salvo el área que conserva la suya', () => {
  assert.equal(ganttGroupKey('area', 'Work'), 'Work');
  assert.equal(ganttGroupKey('status', 'x'), 'status:x');
  assert.equal(ganttGroupKey('priority', 'high'), 'priority:high');
  assert.notEqual(ganttGroupKey('status', 'x'), ganttGroupKey('priority', 'x'));
});

// --- Modo plano y agrupado ------------------------------------------------------

test('modo plano: solo filas de tarea, sin cabeceras, a profundidad 0, y las de fuera de la ventana se omiten', () => {
  const rows = buildGanttGroupedRows(vault, 'none', win, never, key => key);
  assert.deepEqual(taskIds(rows).sort(), ['a', 'b', 'c']);
  assert.equal(rows.some(row => row.isGroup), false);
  assert.ok(rows.every(row => row.depth === 0));
});

test('modo plano: el color que se pasa llega a las filas', () => {
  const rows = buildGanttGroupedRows(vault, 'none', win, never, key => key, '#ff0000');
  assert.ok(rows.every(row => row.color === '#ff0000'));
});

test('por área: cabecera por área, con sub-áreas anidadas, y la clave de siempre', () => {
  const rows = buildGanttGroupedRows(vault, 'area', win, never, key => key);
  // «no_sub_area» agrupa las tareas directas del área Work, que además tiene la sub-área Proj
  assert.deepEqual(labels(rows), ['Personal', 'Work', 'Proj', 'no_sub_area']);
  assert.deepEqual(rows.filter(row => row.isGroup).map(row => row.key).slice(0, 2), ['Personal', 'Work']);
  assert.ok(rows.filter(row => row.isGroup && row.color).length >= 2);
});

test('por estado: solo los estados con tareas en la ventana, con clave de campo y sin color', () => {
  const rows = buildGanttGroupedRows(vault, 'status', win, never, key => key);
  const groups = rows.filter(row => row.isGroup);
  assert.equal(groups.length, 2);
  assert.ok(groups.every(row => row.key.startsWith('status:')));
  assert.ok(groups.every(row => row.color === undefined));
});

test('por prioridad: de mayor a menor y con clave de campo', () => {
  const groups = buildGanttGroupedRows(vault, 'priority', win, never, key => key).filter(row => row.isGroup);
  assert.deepEqual(groups.map(row => row.key), ['priority:high', 'priority:normal']);
});

test('un grupo plegado con la clave del campo oculta sus tareas pero conserva su conteo', () => {
  const collapsed = key => key === 'status:x';
  const rows = buildGanttGroupedRows(vault, 'status', win, collapsed, key => key);
  const done = rows.find(row => row.isGroup && row.key === 'status:x');
  assert.equal(done.collapsed, true);
  assert.equal(done.count, 1);
  assert.deepEqual(taskIds(rows).sort(), ['a', 'c']);
});

test('un agrupado desconocido cae en el de por defecto (área)', () => {
  const rows = buildGanttGroupedRows(vault, 'bogus', win, never, key => key);
  assert.deepEqual(labels(rows), ['Personal', 'Work', 'Proj', 'no_sub_area']);
});

test('buildGanttTaskRows no repite las reglas: lo que no toca la ventana no tiene fila', () => {
  assert.deepEqual(buildGanttTaskRows(vault, win, 0).map(row => row.task.id).sort(), ['a', 'b', 'c']);
});

// --- Carriles -------------------------------------------------------------------

test('sin campo de carril no hay carriles', () => {
  assert.deepEqual(buildGanttLanes(vault, '', 'none', win, never, key => key), []);
});

test('un diagrama por carril, con su conteo dentro de la ventana y sin carriles vacíos', () => {
  const lanes = buildGanttLanes(vault, 'area', 'none', win, never, key => key);
  assert.deepEqual(lanes.map(lane => lane.label), ['Personal', 'Work']);
  assert.deepEqual(lanes.map(lane => lane.count), [1, 2]);
});

test('un carril cuyas tareas caen todas fuera de la ventana no sale', () => {
  const onlyFar = [task('far', { file: 'Other/far.md', start: '2027-03-01', due: '2027-03-02' }), ...vault];
  const lanes = buildGanttLanes(onlyFar, 'area', 'none', win, never, key => key);
  assert.equal(lanes.some(lane => lane.label === 'Other'), false);
});

test('todos los carriles comparten la ventana: las posiciones no dependen del carril', () => {
  const lanes = buildGanttLanes(vault, 'area', 'none', win, never, key => key);
  const alone = buildGanttTaskRows(vault, win, 0).find(row => row.task.id === 'c');
  const inLane = lanes.find(lane => lane.label === 'Personal').rows.find(row => row.task.id === 'c');
  assert.deepEqual(inLane.position, alone.position);
});

test('Group se aplica dentro de cada carril', () => {
  const lanes = buildGanttLanes(vault, 'area', 'status', win, never, key => key);
  const work = lanes.find(lane => lane.label === 'Work');
  assert.equal(work.rows.filter(row => row.isGroup).length, 2);
  assert.equal(lanes.find(lane => lane.label === 'Personal').rows.filter(row => row.isGroup).length, 1);
});

test('con Group = Ninguno las filas del carril de área llevan el color del carril', () => {
  const lanes = buildGanttLanes(vault, 'area', 'none', win, never, key => key);
  const work = lanes.find(lane => lane.label === 'Work');
  assert.ok(work.color);
  assert.ok(work.rows.every(row => row.color === work.color));
});

test('la clave del carril lleva el campo', () => {
  const lanes = buildGanttLanes(vault, 'status', 'none', win, never, key => key);
  assert.ok(lanes.every(lane => lane.storageKey.startsWith('lane:status:')));
});

// --- Estado guardado ------------------------------------------------------------

test('el agrupado del Gantt vale Área por defecto y un valor desconocido vuelve a él', () => {
  assert.equal(parseGanttState({}).group, 'area');
  assert.equal(parseGanttState({ group: 'bogus' }).group, 'area');
  assert.equal(parseGanttState({ group: 'dueDate' }).group, 'area');
});

test('los agrupados válidos se conservan', () => {
  for (const group of ['none', 'area', 'status', 'priority']) assert.equal(parseGanttState({ group }).group, group);
});

test('un agrupado que repite el campo de los carriles pasa a Ninguno y Lanes se conserva', () => {
  assert.deepEqual(pick(parseGanttState({ group: 'area', lanes: 'area' })), { group: 'none', lanes: 'area' });
  assert.deepEqual(pick(parseGanttState({ lanes: 'subArea' })), { group: 'none', lanes: 'subArea' });
  assert.deepEqual(pick(parseGanttState({ group: 'status', lanes: 'status' })), { group: 'none', lanes: 'status' });
});

test('sin choque no se toca nada', () => {
  assert.deepEqual(pick(parseGanttState({ group: 'status', lanes: 'area' })), { group: 'status', lanes: 'area' });
  assert.deepEqual(pick(parseGanttState({ lanes: 'file' })), { group: 'area', lanes: 'file' });
});

function pick(state) {
  return { group: state.group, lanes: state.lanes };
}

// --- Plantilla -----------------------------------------------------------------

function render(data) {
  Handlebars.registerHelper('t', key => key);
  Handlebars.registerHelper('priorityIcon', value => `[${value}]`);
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/views/templates/gantt-view.hbs'), 'utf8');
  return Handlebars.compile(source)(data);
}

const count = (html, pattern) => (html.match(pattern) ?? []).length;

function rowView(row) {
  return row.isGroup
    ? { isGroup: true, key: row.key, label: row.label, indent: 0, count: row.count, collapsed: row.collapsed }
    : { isGroup: false, filePath: row.task.file.path, lineNumber: 1, status: ' ', priority: 'normal', desc: row.task.id, indent: 0, left: row.position.left, width: row.position.width };
}

const base = {
  zoomOptions: [{ value: '14', label: '14', title: '14', active: true }],
  periodLabel: 'p', year: 2026, previousLabel: 'prev', nextLabel: 'next', todayLabel: 'today',
  months: [{ index: 1, label: 'Jan', active: true }, { index: 2, label: 'Feb', active: false }],
  weekBands: [{ label: 'W1', left: 0, width: 50 }],
  days: [{ day: 2, weekday: 'Mon', today: false, weekend: false, weekStart: true }, { day: 3, weekday: 'Tue', today: false, weekend: false, weekStart: false }],
  todayLeft: null, emptyMessage: 'empty', undatedCount: 0, undated: [], showUndated: false,
};

test('la plantilla con carriles repite la cabecera de fechas en cada carril y los controles solo una vez', () => {
  const lanes = buildGanttLanes(vault, 'area', 'none', win, never, key => key)
    .map(lane => ({ label: lane.label, storageKey: lane.storageKey, count: lane.count, rows: lane.rows.map(rowView) }));
  const html = render({ ...base, rows: [], lanes });
  assert.equal(count(html, /class="oa-lane"/g), 2);
  assert.equal(count(html, /class="oa-gantt-head"/g), 2);
  assert.equal(count(html, /oa-gantt-controls/g), 1);
  assert.equal(count(html, /data-month="1"/g), 2);
  assert.equal(count(html, /oa-gantt-row--task/g), 3);
  assert.equal(count(html, /oa-gantt--lanes/g), 1);
});

test('la plantilla sin carriles dibuja el diagrama de siempre, con una sola cabecera', () => {
  const rows = buildGanttGroupedRows(vault, 'area', win, never, key => key).map(rowView);
  const html = render({ ...base, rows, lanes: [] });
  assert.equal(count(html, /class="oa-lane"/g), 0);
  assert.equal(count(html, /class="oa-gantt-head"/g), 1);
  assert.equal(count(html, /oa-gantt--lanes/g), 0);
  assert.equal(count(html, /oa-gantt-row--task/g), 3);
});

test('sin filas muestra la cabecera y el mensaje de vacío', () => {
  const html = render({ ...base, rows: [], lanes: [] });
  assert.equal(count(html, /class="oa-gantt-head"/g), 1);
  assert.match(html, /oa-gantt-empty/);
});
