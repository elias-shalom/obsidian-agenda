const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadSource } = require('./helpers/load-source.cjs');

const lanes = loadSource('core/task-lanes.ts');
const { buildLanes } = lanes;

const SYMBOL = { Todo: ' ', InProgress: '/', OnHold: '?', Done: 'x', Cancelled: '-', nonTask: '~' };

function task(id, { file = 'a.md', status = 'Todo', symbol, priority = 'normal', tags = [] } = {}) {
  const name = file.split('/').pop().replace(/\.md$/, '');
  return {
    id,
    state: { status: symbol ?? SYMBOL[status], priority },
    file: { path: file, name },
    section: { desc: id, tags },
  };
}

const ids = (lane) => lane.tasks.map(item => item.id);
const labels = (list) => list.map(lane => lane.label);
const keys = (list) => list.map(lane => lane.key);
const byLabel = (list, label) => list.find(lane => lane.label === label);

const vault = [
  task('a', { file: 'Work/Proj/a.md' }),
  task('b', { file: 'Work/Proj/Sub/b.md' }),
  task('c', { file: 'Work/Other/c.md' }),
  task('d', { file: 'Work/d.md' }),
  task('e', { file: 'Personal/e.md' }),
  task('f', { file: 'Daily Plan/f.md' }),
  task('g', { file: 'root.md' }),
];

// --- Campos válidos -----------------------------------------------------------

test('«Ninguno», un campo desconocido y la lista vacía no generan carriles', () => {
  assert.deepEqual(buildLanes(vault, ''), []);
  assert.deepEqual(buildLanes(vault, 'bogus'), []);
  assert.deepEqual(buildLanes(vault, undefined), []);
  assert.deepEqual(buildLanes([], 'area'), []);
});

test('las opciones de Lanes son las decididas, con «Ninguno» primero', () => {
  assert.deepEqual(lanes.LANE_OPTIONS.map(option => option.value),
    ['', 'area', 'subArea', 'status', 'priority', 'tag', 'folder', 'file']);
  assert.equal(lanes.isLaneField('area'), true);
  assert.equal(lanes.isLaneField(''), false);
  assert.equal(lanes.isLaneField('bogus'), false);
});

// --- Área -----------------------------------------------------------------------

test('Área: un carril por primera carpeta, alfabético, con «Raíz» al final', () => {
  const result = buildLanes(vault, 'area', key => key);
  assert.deepEqual(labels(result), ['Daily Plan', 'Personal', 'Work', 'area_root']);
  assert.deepEqual(result.map(ids), [['f'], ['e'], ['a', 'b', 'c', 'd'], ['g']]);
});

test('Área: cada área lleva su color y «Raíz» no', () => {
  const [daily, , , root] = buildLanes(vault, 'area', key => key);
  assert.match(daily.color, /^hsl\(/);
  assert.equal(root.color, undefined);
});

test('Área: Work y work son la misma área y gana el primer nombre visto', () => {
  const result = buildLanes([task('x', { file: 'Work/x.md' }), task('y', { file: 'work/y.md' })], 'area');
  assert.equal(result.length, 1);
  assert.equal(result[0].label, 'Work');
  assert.deepEqual(ids(result[0]), ['x', 'y']);
});

test('Área: una carpeta con nombre no ASCII no se funde con otras ni pierde sus tareas', () => {
  const list = [
    task('j', { file: '日本語/j.md' }),
    task('e', { file: '📁/e.md' }),
    task('w', { file: 'Work/w.md' }),
    task('k', { file: 'ＫＡＮＪＩ/k.md' }),
  ];
  const result = buildLanes(list, 'area');
  assert.equal(result.length, 4);
  assert.equal(result.reduce((total, lane) => total + lane.tasks.length, 0), 4);
  assert.equal(new Set(keys(result)).size, 4, 'claves distintas');
});

test('Área: el orden alfabético no distingue mayúsculas', () => {
  const list = [task('1', { file: 'beta/1.md' }), task('2', { file: 'Alpha/2.md' }), task('3', { file: 'gamma/3.md' }), task('4', { file: 'Delta/4.md' })];
  assert.deepEqual(labels(buildLanes(list, 'area')), ['Alpha', 'beta', 'Delta', 'gamma']);
});

// --- Sub-área ---------------------------------------------------------------------

test('Sub-área: un carril por ruta completa, con las notas directas del área primero', () => {
  const result = buildLanes(vault, 'subArea', key => key);
  assert.deepEqual(labels(result), [
    'Daily Plan › area_root',
    'Personal › area_root',
    'Work › area_root',
    'Work › Other',
    'Work › Proj',
    'Work › Proj › Sub',
    'area_root',
  ]);
  assert.deepEqual(result.map(ids), [['f'], ['e'], ['d'], ['c'], ['a'], ['b'], ['g']]);
});

test('Sub-área: cada tarea cae en un solo carril y no hay anidado por prefijo', () => {
  const result = buildLanes(vault, 'subArea');
  assert.equal(result.reduce((total, lane) => total + lane.tasks.length, 0), vault.length);
  assert.deepEqual(ids(byLabel(result, 'Work › Proj')), ['a'], 'Proj no incluye lo de Proj/Sub');
});

test('Sub-área: el mismo nombre en áreas distintas son carriles distintos', () => {
  const list = [task('1', { file: 'Work/Docs/1.md' }), task('2', { file: 'Personal/Docs/2.md' })];
  const result = buildLanes(list, 'subArea');
  assert.deepEqual(labels(result), ['Personal › Docs', 'Work › Docs']);
  assert.equal(new Set(keys(result)).size, 2);
});

test('Sub-área: lleva el color de su área', () => {
  const result = buildLanes(vault, 'subArea');
  const areaLane = buildLanes(vault, 'area').find(lane => lane.label === 'Work');
  assert.equal(byLabel(result, 'Work › Proj').color, areaLane.color);
  assert.equal(byLabel(result, 'Work › Proj › Sub').color, areaLane.color);
});

// --- Estado -----------------------------------------------------------------------

test('Estado: orden de flujo y sin carriles vacíos', () => {
  const list = [
    task('1', { status: 'Done' }), task('2', { status: 'Todo' }), task('3', { status: 'Cancelled' }),
    task('4', { status: 'InProgress' }), task('5', { status: 'Todo' }),
  ];
  const result = buildLanes(list, 'status', key => key);
  assert.deepEqual(labels(result), ['status_todo', 'status_in_progress', 'status_done', 'status_cancelled']);
  assert.deepEqual(result.map(ids), [['2', '5'], ['4'], ['1'], ['3']]);
});

test('Estado: los seis estados salen en su orden lógico, incluido En espera', () => {
  const list = Object.keys(SYMBOL).reverse().map(status => task(status, { status }));
  assert.deepEqual(keys(buildLanes(list, 'status')), ['Todo', 'InProgress', 'OnHold', 'Done', 'Cancelled', 'nonTask']);
});

test('Estado: un símbolo desconocido cuenta como Pendiente, como en el agrupado', () => {
  const result = buildLanes([task('1', { symbol: 'R' }), task('2', { status: 'Todo' })], 'status');
  assert.equal(result.length, 1);
  assert.deepEqual(ids(result[0]), ['1', '2']);
});

// --- Prioridad --------------------------------------------------------------------

test('Prioridad: de mayor a menor, «sin prioridad» al final y sin carriles vacíos', () => {
  const list = [
    task('1', { priority: 'low' }), task('2', { priority: 'highest' }), task('3', { priority: 'bogus' }),
    task('4', { priority: 'medium' }), task('5', { priority: 'high' }), task('6', { priority: 'undefined' }),
  ];
  const result = buildLanes(list, 'priority', key => key);
  assert.deepEqual(keys(result), ['highest', 'high', 'medium', 'low', 'none']);
  assert.deepEqual(labels(result), ['highest', 'high', 'medium', 'low', 'no_priority']);
  assert.deepEqual(ids(result[4]), ['3', '6']);
});

// --- Etiqueta ---------------------------------------------------------------------

test('Etiqueta: la tarea se repite en cada carril de sus etiquetas', () => {
  const list = [
    task('1', { tags: ['#casa', '#urgente'] }),
    task('2', { tags: ['#casa'] }),
    task('3', { tags: ['#urgente'] }),
  ];
  const result = buildLanes(list, 'tag', key => key);
  assert.deepEqual(labels(result), ['#casa', '#urgente']);
  assert.deepEqual(result.map(ids), [['1', '2'], ['1', '3']]);
  assert.equal(result.reduce((total, lane) => total + lane.tasks.length, 0), 4, 'la suma supera el total de tareas (3)');
  assert.equal(result[0].tasks[0], result[1].tasks[0], 'es la misma tarea, no una copia');
});

test('Etiqueta: sin etiquetas va a «Sin etiqueta», siempre al final', () => {
  const list = [task('1'), task('2', { tags: ['#zeta'] }), task('3', { tags: ['#alfa'] })];
  const result = buildLanes(list, 'tag', key => key);
  assert.deepEqual(labels(result), ['#alfa', '#zeta', 'lane_no_tag']);
  assert.deepEqual(ids(result[2]), ['1']);
});

test('Etiqueta: no distingue mayúsculas y una etiqueta repetida en la tarea cuenta una vez', () => {
  const list = [task('1', { tags: ['#Work', '#work'] }), task('2', { tags: ['#WORK'] })];
  const result = buildLanes(list, 'tag');
  assert.equal(result.length, 1);
  assert.equal(result[0].label, '#Work');
  assert.deepEqual(ids(result[0]), ['1', '2']);
});

// --- Carpeta y Archivo -------------------------------------------------------------

test('Carpeta: la ruta completa de la nota, con «Raíz» al final', () => {
  const result = buildLanes(vault, 'folder', key => key);
  assert.deepEqual(labels(result), ['Daily Plan', 'Personal', 'Work', 'Work/Other', 'Work/Proj', 'Work/Proj/Sub', 'area_root']);
  assert.deepEqual(ids(byLabel(result, 'Work')), ['d']);
});

test('Archivo: el nombre de la nota, alfabético', () => {
  const list = [task('1', { file: 'Work/zeta.md' }), task('2', { file: 'Work/Alfa.md' }), task('3', { file: 'Work/alfa2.md' }), task('4', { file: 'Work/Alfa.md' })];
  const result = buildLanes(list, 'file');
  assert.deepEqual(labels(result), ['Alfa', 'alfa2', 'zeta']);
  assert.deepEqual(ids(result[0]), ['2', '4']);
});

test('Archivo: dos notas con el mismo nombre en carpetas distintas se distinguen por su carpeta', () => {
  const list = [task('1', { file: 'Work/Notes.md' }), task('2', { file: 'Personal/Notes.md' }), task('3', { file: 'Solo.md' })];
  const result = buildLanes(list, 'file');
  assert.equal(result.length, 3);
  assert.deepEqual(labels(result), ['Notes (Personal)', 'Notes (Work)', 'Solo']);
});

// --- Reglas comunes ---------------------------------------------------------------

test('las tareas de un carril conservan el orden recibido', () => {
  const list = ['9', '3', '7', '1', '5'].map(id => task(id, { file: 'Work/x.md', priority: 'high' }));
  for (const field of ['area', 'subArea', 'status', 'priority', 'folder', 'file']) {
    assert.deepEqual(ids(buildLanes(list, field)[0]), ['9', '3', '7', '1', '5'], field);
  }
});

test('buildLanes no modifica la lista de entrada', () => {
  const input = [...vault];
  const before = input.map(item => item.id);
  buildLanes(input, 'subArea');
  assert.deepEqual(input.map(item => item.id), before);
});

test('sin traducción devuelve las claves como texto', () => {
  assert.equal(buildLanes([task('1', { file: 'root.md' })], 'area')[0].label, 'area_root');
});

test('cada tarea aparece al menos en un carril, sea cual sea el campo', () => {
  for (const field of ['area', 'subArea', 'status', 'priority', 'tag', 'folder', 'file']) {
    const result = buildLanes(vault, field);
    for (const item of vault) assert.ok(result.some(lane => lane.tasks.includes(item)), `${field}: ${item.id}`);
  }
});

// --- Exclusión entre Lanes y Group --------------------------------------------------

test('misma familia: Estado, Prioridad, Etiqueta y Archivo chocan consigo mismos', () => {
  assert.equal(lanes.isGroupOptionInUse('status', 'status'), true);
  assert.equal(lanes.isGroupOptionInUse('priority', 'priority'), true);
  assert.equal(lanes.isGroupOptionInUse('tags', 'tag'), true);
  assert.equal(lanes.isGroupOptionInUse('file', 'file'), true);
  assert.equal(lanes.isLaneOptionInUse('status', 'status'), true);
  assert.equal(lanes.isLaneOptionInUse('tag', 'tags'), true);
});

test('la familia de ruta (Área, Sub-área y Carpeta) choca entre sí en ambos chips', () => {
  for (const group of ['area', 'folder']) {
    for (const lane of ['area', 'subArea', 'folder']) {
      assert.equal(lanes.isGroupOptionInUse(group, lane), true, `Group ${group} con Lanes ${lane}`);
      assert.equal(lanes.isLaneOptionInUse(lane, group), true, `Lanes ${lane} con Group ${group}`);
    }
  }
});

test('Archivo y Vencimiento quedan libres frente a la ruta, y la ruta frente a Estado, Prioridad y Etiqueta', () => {
  assert.equal(lanes.isLaneOptionInUse('file', 'area'), false);
  assert.equal(lanes.isLaneOptionInUse('area', 'file'), false);
  assert.equal(lanes.isLaneOptionInUse('area', 'dueDate'), false);
  assert.equal(lanes.isGroupOptionInUse('dueDate', 'area'), false);
  assert.equal(lanes.isLaneOptionInUse('area', 'status'), false);
  assert.equal(lanes.isGroupOptionInUse('tags', 'area'), false);
  assert.equal(lanes.isLaneOptionInUse('status', 'priority'), false);
});

test('«Ninguno» no choca con nada', () => {
  assert.equal(lanes.isLaneOptionInUse('', 'status'), false);
  assert.equal(lanes.isGroupOptionInUse('none', 'status'), false);
  assert.equal(lanes.isGroupOptionInUse('status', ''), false);
  assert.equal(lanes.isLaneOptionInUse('status', 'none'), false);
  assert.equal(lanes.isLaneOptionInUse('status', ''), false);
});

const LIST = { defaultGroup: 'area' };
const TABLE = { defaultGroup: 'none' };
const KANBAN = { requiresGroup: true, defaultGroup: 'status' };

test('sin choque la elección se aplica tal cual', () => {
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'status', lanes: '' }, { axis: 'lanes', value: 'area' }, LIST),
    { group: 'status', lanes: 'area', blocked: false });
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'area', lanes: 'status' }, { axis: 'group', value: 'priority' }, LIST),
    { group: 'priority', lanes: 'status', blocked: false });
});

test('Lista, Tabla y Gantt: elegir un carril en uso por Group pone Group en Ninguno, escrito de forma explícita', () => {
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'status', lanes: '' }, { axis: 'lanes', value: 'status' }, LIST),
    { group: 'none', lanes: 'status', blocked: false });
  // Group vacío en la Lista significa Área: choca con Lanes: Área aunque no diga «area»
  assert.deepEqual(lanes.resolveAxisConflict({ group: '', lanes: '' }, { axis: 'lanes', value: 'area' }, LIST),
    { group: 'none', lanes: 'area', blocked: false });
  assert.deepEqual(lanes.resolveAxisConflict({ group: '', lanes: '' }, { axis: 'lanes', value: 'subArea' }, LIST),
    { group: 'none', lanes: 'subArea', blocked: false });
});

test('en la Tabla, Group vacío significa Ninguno y no choca con ningún carril', () => {
  for (const value of ['area', 'status', 'tag', 'file']) {
    assert.deepEqual(lanes.resolveAxisConflict({ group: '', lanes: '' }, { axis: 'lanes', value }, TABLE),
      { group: '', lanes: value, blocked: false }, value);
  }
});

test('Lista, Tabla y Gantt: elegir un Group en uso por Lanes pone Lanes en Ninguno', () => {
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'none', lanes: 'tag' }, { axis: 'group', value: 'tags' }, LIST),
    { group: 'tags', lanes: '', blocked: false });
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'none', lanes: 'subArea' }, { axis: 'group', value: 'area' }, LIST),
    { group: 'area', lanes: '', blocked: false });
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'none', lanes: 'area' }, { axis: 'group', value: 'folder' }, TABLE),
    { group: 'folder', lanes: '', blocked: false });
});

test('Kanban: la opción en uso no se puede elegir y todo queda igual', () => {
  const state = { group: 'status', lanes: 'area' };
  // Lanes: Estado chocaría con las columnas por Estado
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'status', lanes: '' }, { axis: 'lanes', value: 'status' }, KANBAN),
    { group: 'status', lanes: '', blocked: true });
  // Columnas por Carpeta con Lanes: Área
  assert.deepEqual(lanes.resolveAxisConflict(state, { axis: 'group', value: 'folder' }, KANBAN),
    { group: 'status', lanes: 'area', blocked: true });
  // Group vacío en Kanban es Estado
  assert.deepEqual(lanes.resolveAxisConflict({ group: '', lanes: '' }, { axis: 'lanes', value: 'status' }, KANBAN),
    { group: '', lanes: '', blocked: true });
});

test('Kanban: sin choque se aplica, también Archivo en las columnas', () => {
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'status', lanes: '' }, { axis: 'lanes', value: 'area' }, KANBAN),
    { group: 'status', lanes: 'area', blocked: false });
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'status', lanes: 'area' }, { axis: 'group', value: 'file' }, KANBAN),
    { group: 'file', lanes: 'area', blocked: false });
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'file', lanes: '' }, { axis: 'lanes', value: 'file' }, KANBAN),
    { group: 'file', lanes: '', blocked: true });
});

test('elegir «Ninguno» en Lanes siempre se aplica', () => {
  assert.deepEqual(lanes.resolveAxisConflict({ group: 'none', lanes: 'status' }, { axis: 'lanes', value: '' }, KANBAN),
    { group: 'none', lanes: '', blocked: false });
});

test('resolveAxisConflict no modifica el estado recibido', () => {
  const state = { group: 'status', lanes: 'area' };
  lanes.resolveAxisConflict(state, { axis: 'lanes', value: 'status' }, LIST);
  assert.deepEqual(state, { group: 'status', lanes: 'area' });
});

// --- Traducciones ------------------------------------------------------------------

test('todas las claves de texto de los carriles existen en los 6 idiomas', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const keysUsed = new Set(['area_root', 'no_priority', 'lane_no_tag', ...lanes.LANE_OPTIONS.map(option => option.labelKey)]);
  for (const status of ['status_todo', 'status_in_progress', 'status_on_hold', 'status_done', 'status_cancelled', 'status_non_task']) keysUsed.add(status);
  for (const priority of ['highest', 'high', 'medium', 'normal', 'low', 'lowest']) keysUsed.add(priority);

  // Las claves que reciben `translate` salen de buildLanes con todos los campos: nada debe quedar sin texto
  const seen = new Set();
  const spy = (key) => { seen.add(key); return key; };
  const everything = [
    ...vault,
    task('s', { status: 'OnHold', priority: 'lowest', tags: [] }),
    task('p', { priority: 'none' }),
    task('t', { tags: ['#x'] }),
  ];
  for (const field of ['area', 'subArea', 'status', 'priority', 'tag', 'folder', 'file']) buildLanes(everything, field, spy);
  for (const key of seen) assert.ok(keysUsed.has(key), `clave no prevista: ${key}`);

  const dir = path.join(__dirname, '..', 'src', 'locales');
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
    const texts = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const key of keysUsed) assert.ok(typeof texts[key] === 'string' && texts[key] !== '', `${file}: falta «${key}»`);
  }
});
