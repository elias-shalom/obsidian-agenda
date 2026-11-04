const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadSource } = require('./helpers/load-source.cjs');

const { toLaneViewModels, repairAxes } = loadSource('core/task-lanes.ts');

const SYMBOL = { Todo: ' ', Done: 'x' };

function task(id, { file = 'a.md', status = 'Todo', priority = 'normal', tags = [] } = {}) {
  return {
    id,
    state: { status: SYMBOL[status], priority },
    file: { path: file, name: file.split('/').pop().replace(/\.md$/, '') },
    section: { desc: id, tags },
  };
}

const ids = (list) => list.map(item => item.id);

const vault = [
  task('a', { file: 'Work/Proj/a.md', priority: 'high' }),
  task('b', { file: 'Work/Proj/b.md', status: 'Done' }),
  task('c', { file: 'Personal/c.md' }),
  task('d', { file: 'root.md' }),
];

// --- toLaneViewModels ---------------------------------------------------------

test('sin campo de carril no hay modelos, y la vista se dibuja como siempre', () => {
  assert.deepEqual(toLaneViewModels(vault, '', 'none'), []);
  assert.deepEqual(toLaneViewModels(vault, 'bogus', 'none'), []);
});

test('un modelo por carril, en el orden de buildLanes, con su conteo y sus tareas', () => {
  const result = toLaneViewModels(vault, 'area', 'none', key => key);
  assert.deepEqual(result.map(lane => lane.label), ['Personal', 'Work', 'area_root']);
  assert.deepEqual(result.map(lane => lane.count), [1, 2, 1]);
  assert.deepEqual(result.map(lane => ids(lane.tasks)), [['c'], ['a', 'b'], ['d']]);
});

test('con Group = Ninguno los carriles no llevan grupos', () => {
  const result = toLaneViewModels(vault, 'area', 'none');
  assert.ok(result.every(lane => lane.groups.length === 0));
});

test('Group se aplica dentro de cada carril y solo con las tareas de ese carril', () => {
  const work = toLaneViewModels(vault, 'area', 'status', key => key).find(lane => lane.label === 'Work');
  assert.equal(work.groups.length, 2);
  assert.deepEqual(work.groups.map(group => group.count), [1, 1]);
  assert.deepEqual(work.groups.flatMap(group => ids(group.tasks)).sort(), ['a', 'b']);
});

test('los grupos de dentro del carril no recrean los vacíos', () => {
  const personal = toLaneViewModels(vault, 'area', 'status', key => key).find(lane => lane.label === 'Personal');
  assert.equal(personal.groups.length, 1);
});

test('la clave de plegado lleva el campo, distinta en cada carril y de la de los grupos', () => {
  const byArea = toLaneViewModels(vault, 'area', 'none');
  const byFolder = toLaneViewModels(vault, 'folder', 'none');
  const all = [...byArea, ...byFolder].map(lane => lane.storageKey);
  assert.equal(new Set(all).size, all.length);
  assert.ok(all.every(key => key.startsWith('lane:')));
  assert.ok(byArea.every(lane => lane.storageKey.startsWith('lane:area:')));
});

test('solo los carriles de área llevan color', () => {
  const byArea = toLaneViewModels(vault, 'area', 'none');
  assert.ok(byArea.find(lane => lane.label === 'Work').color);
  assert.equal(byArea.find(lane => lane.label !== 'Work' && lane.color === undefined) !== undefined, true);
  assert.ok(toLaneViewModels(vault, 'status', 'none').every(lane => lane.color === undefined));
});

test('las tareas de cada carril conservan el orden recibido', () => {
  const reversed = [...vault].reverse();
  const work = toLaneViewModels(reversed, 'area', 'none').find(lane => lane.label === 'Work');
  assert.deepEqual(ids(work.tasks), ['b', 'a']);
});

test('Etiqueta: una tarea con dos etiquetas cuenta en cada carril', () => {
  const tagged = [task('x', { tags: ['#a', '#b'] }), task('y', { tags: ['#a'] })];
  const result = toLaneViewModels(tagged, 'tag', 'none');
  assert.deepEqual(result.map(lane => lane.count), [2, 1]);
});

// --- repairAxes ---------------------------------------------------------------

test('sin choque no cambia nada y el agrupado por defecto se hace efectivo', () => {
  assert.deepEqual(repairAxes({ group: '', lanes: '' }, 'area'), { group: 'area', lanes: '' });
  assert.deepEqual(repairAxes({ group: 'status', lanes: 'area' }, 'area'), { group: 'status', lanes: 'area' });
  assert.deepEqual(repairAxes({ group: '', lanes: 'status' }, 'area'), { group: 'area', lanes: 'status' });
});

test('el Área por defecto de la Lista choca con Lanes: Área y pasa a Ninguno', () => {
  assert.deepEqual(repairAxes({ group: '', lanes: 'area' }, 'area'), { group: 'none', lanes: 'area' });
  assert.deepEqual(repairAxes({ group: '', lanes: 'subArea' }, 'area'), { group: 'none', lanes: 'subArea' });
});

test('el agrupado explícito que choca también pasa a Ninguno, y Lanes se conserva', () => {
  assert.deepEqual(repairAxes({ group: 'status', lanes: 'status' }, 'none'), { group: 'none', lanes: 'status' });
  assert.deepEqual(repairAxes({ group: 'folder', lanes: 'area' }, 'none'), { group: 'none', lanes: 'area' });
});

test('el agrupado por defecto Ninguno de la Tabla nunca choca', () => {
  assert.deepEqual(repairAxes({ group: '', lanes: 'area' }, 'none'), { group: 'none', lanes: 'area' });
});

test('Archivo y Vencimiento no chocan con la familia de ruta', () => {
  assert.deepEqual(repairAxes({ group: 'dueDate', lanes: 'area' }, 'area'), { group: 'dueDate', lanes: 'area' });
  assert.deepEqual(repairAxes({ group: 'area', lanes: 'file' }, 'area'), { group: 'area', lanes: 'file' });
});
