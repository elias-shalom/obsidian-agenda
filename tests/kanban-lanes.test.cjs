const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const Handlebars = require('handlebars');
const { loadSource } = require('./helpers/load-source.cjs');

const { buildKanbanLanes, buildKanbanColumns } = loadSource('core/kanban-board.ts');
const { collapseStorageKey } = loadSource('core/kanban-collapse.ts');
const { parseKanbanState } = loadSource('core/kanban-state.ts');

const SYMBOL = { Todo: ' ', InProgress: '/', Done: 'x' };

function task(id, { file = 'a.md', status = 'Todo', priority = 'normal', tags = [] } = {}) {
  return {
    id,
    state: { status: SYMBOL[status], priority, emoji: '⭕' },
    file: { path: file, name: file.split('/').pop().replace(/\.md$/, '') },
    line: { number: 1 },
    section: { desc: id, tags },
  };
}

const vault = [
  task('a', { file: 'Work/a.md', status: 'Done' }),
  task('b', { file: 'Work/b.md' }),
  task('c', { file: 'Personal/c.md', priority: 'high' }),
  task('d', { file: 'root.md' }),
];

const ids = (column) => column.tasks.map(item => item.id);

test('sin campo de carril no hay carriles y el tablero se dibuja como siempre', () => {
  assert.deepEqual(buildKanbanLanes(vault, '', 'status', key => key), []);
  assert.equal(buildKanbanColumns(vault, 'status', key => key).length, 6);
});

test('un tablero por carril, en el orden de los carriles y con su conteo', () => {
  const lanes = buildKanbanLanes(vault, 'area', 'status', key => key);
  assert.deepEqual(lanes.map(lane => lane.label), ['Personal', 'Work', 'area_root']);
  assert.deepEqual(lanes.map(lane => lane.count), [1, 2, 1]);
});

test('cada carril tiene todas las columnas de estado, aunque estén vacías, con sus tareas', () => {
  const [personal, work] = buildKanbanLanes(vault, 'area', 'status', key => key);
  assert.equal(personal.columns.length, 6);
  assert.equal(work.columns.length, 6);
  assert.deepEqual(work.columns.map(ids).flat().sort(), ['a', 'b']);
  assert.deepEqual(personal.columns.map(ids).flat(), ['c']);
});

test('las columnas de cada carril conservan su destino de arrastre', () => {
  const lanes = buildKanbanLanes(vault, 'area', 'status', key => key);
  for (const lane of lanes) assert.ok(lane.columns.every(column => column.drop && column.drop.kind === 'status'));
  const byPriority = buildKanbanLanes(vault, 'area', 'priority', key => key);
  assert.ok(byPriority[0].columns.filter(column => column.drop).every(column => column.drop.kind === 'priority'));
});

test('las columnas por etiqueta o carpeta solo existen con tareas, dentro de cada carril', () => {
  const tagged = [task('x', { file: 'Work/x.md', tags: ['#a'] }), task('y', { file: 'Personal/y.md', tags: ['#b'] })];
  const lanes = buildKanbanLanes(tagged, 'area', 'tags', key => key);
  assert.deepEqual(lanes.map(lane => lane.columns.map(column => column.label)), [['#b'], ['#a']]);
});

test('Etiqueta: una tarea con dos etiquetas aparece en el tablero de cada una', () => {
  const tagged = [task('x', { tags: ['#a', '#b'] })];
  const lanes = buildKanbanLanes(tagged, 'tag', 'status', key => key);
  assert.deepEqual(lanes.map(lane => lane.count), [1, 1]);
});

test('la clave de carril lleva el campo; solo los carriles de área llevan color', () => {
  const lanes = buildKanbanLanes(vault, 'area', 'status', key => key);
  assert.ok(lanes.every(lane => lane.storageKey.startsWith('lane:area:')));
  assert.ok(lanes.find(lane => lane.label === 'Work').color);
  assert.ok(buildKanbanLanes(vault, 'status', 'priority', key => key).every(lane => lane.color === undefined));
});

// --- Plegado -------------------------------------------------------------------

test('la clave de plegado con carril no se pisa con la del tablero ni con la de otro carril', () => {
  const plain = collapseStorageKey('status', ' ');
  const inWork = collapseStorageKey('status', ' ', 'lane:area:work');
  const inPersonal = collapseStorageKey('status', ' ', 'lane:area:personal');
  assert.equal(new Set([plain, inWork, inPersonal]).size, 3);
  assert.equal(collapseStorageKey('status', ' ', ''), plain);
});

// --- Estado guardado ------------------------------------------------------------

test('el estado del Kanban conserva sus carriles cuando no repiten el campo de las columnas', () => {
  assert.equal(parseKanbanState({ group: 'status', lanes: 'area' }).lanes, 'area');
  assert.equal(parseKanbanState({ group: 'tags', lanes: 'status' }).lanes, 'status');
});

test('unos carriles que repiten el campo de las columnas se quitan al leer', () => {
  assert.equal(parseKanbanState({ group: 'status', lanes: 'status' }).lanes, '');
  assert.equal(parseKanbanState({ group: 'folder', lanes: 'area' }).lanes, '');
  assert.equal(parseKanbanState({ group: 'tags', lanes: 'tag' }).lanes, '');
});

test('un valor de carril desconocido vale Ninguno', () => {
  assert.equal(parseKanbanState({ lanes: 'bogus' }).lanes, '');
});

// --- Plantilla -----------------------------------------------------------------

function render(data) {
  Handlebars.registerHelper('t', key => key);
  Handlebars.registerHelper('priorityIcon', value => `[${value}]`);
  Handlebars.registerHelper('formatDate', value => String(value));
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/views/templates/kanban-view.hbs'), 'utf8');
  return Handlebars.compile(source)(data);
}

const count = (html, pattern) => (html.match(pattern) ?? []).length;

function columnView(column, laneKey) {
  return { key: column.key, label: column.label, count: column.tasks.length, droppable: column.drop !== null, collapsed: false, laneKey, tasks: column.tasks };
}

test('la plantilla dibuja un carril por tablero, cada columna con la clave de su carril', () => {
  const lanes = buildKanbanLanes(vault, 'area', 'status', key => key).map(lane => ({
    label: lane.label, storageKey: lane.storageKey, count: lane.count, columns: lane.columns.map(column => columnView(column, lane.storageKey)),
  }));
  const html = render({ columns: [], lanes, showStatusIcon: false, showPriorityIcon: true, vaultHasTasks: true });
  assert.equal(count(html, /class="oa-lane"/g), 3);
  assert.equal(count(html, /oa-kanban-board--lanes/g), 1);
  assert.equal(count(html, /<section class="oa-kanban-column[ "]/g), 18);
  assert.equal(count(html, /data-lane-key="lane:area:work"/g), 7);
  assert.equal(count(html, /class="oa-kanban-card"/g), 4);
});

test('la plantilla sin carriles dibuja el tablero de siempre, con la clave de carril vacía', () => {
  const columns = buildKanbanColumns(vault, 'status', key => key).map(column => columnView(column, ''));
  const html = render({ columns, lanes: [], showStatusIcon: false, showPriorityIcon: true, vaultHasTasks: true });
  assert.equal(count(html, /class="oa-lane"/g), 0);
  assert.equal(count(html, /oa-kanban-board--lanes/g), 0);
  assert.equal(count(html, /<section class="oa-kanban-column[ "]/g), 6);
  assert.equal(count(html, /data-lane-key=""/g), 6);
});

test('sin tareas muestra el mensaje de tablero vacío', () => {
  const html = render({ columns: [], lanes: [], showStatusIcon: false, showPriorityIcon: true, vaultHasTasks: false });
  assert.match(html, /oa-kanban-empty/);
  assert.match(html, /no_tasks/);
});
