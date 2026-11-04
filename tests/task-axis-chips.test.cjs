const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadSource } = require('./helpers/load-source.cjs');

const { buildAxisChips, pickAxisOption, toggleSortDirection } = loadSource('core/task-axis-chips.ts');
const { parseTaskViewState, DEFAULT_TASK_VIEW_STATE } = loadSource('core/task-view-state.ts');

const translate = key => `[${key}]`;
const laneOptions = [
  { value: '', label: 'None' },
  { value: 'area', label: 'Area' },
  { value: 'subArea', label: 'Sub-area' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'tag', label: 'Tags' },
  { value: 'folder', label: 'Folder' },
  { value: 'file', label: 'File' },
];
const groupOptions = [
  { value: 'none', label: 'No grouping' },
  { value: 'area', label: 'Area' },
  { value: 'folder', label: 'Folder' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'tags', label: 'Tags' },
  { value: 'dueDate', label: 'Due date' },
];
const sortOptions = [
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due date' },
];

const state = (overrides = {}) => ({ lanes: '', group: 'area', sortColumn: 'priority', sortDirection: 'desc', ...overrides });
const chips = (stateOverrides, extra = {}) =>
  buildAxisChips({ state: state(stateOverrides), laneOptions, groupOptions, sortOptions, translate, ...extra });
const byId = (list, id) => list.find(chip => chip.id === id);
const option = (chip, value) => chip.options.find(item => item.value === value);

// --- Qué chips ofrece la vista ------------------------------------------------------

test('los chips salen en el orden Lanes, Group, Sort', () => {
  assert.deepEqual(chips().map(chip => chip.id), ['lanes', 'group', 'sort']);
});

test('un chip solo existe si la vista le pasa sus opciones', () => {
  const noLanes = buildAxisChips({ state: state(), groupOptions, sortOptions, translate });
  assert.deepEqual(noLanes.map(chip => chip.id), ['group', 'sort']);

  const sortOnly = buildAxisChips({ state: state(), sortOptions, translate });
  assert.deepEqual(sortOnly.map(chip => chip.id), ['sort']);

  assert.deepEqual(buildAxisChips({ state: state(), translate }), []);
});

// --- Texto, atenuado y tooltip ------------------------------------------------------

test('cada chip muestra «Rótulo: valor»', () => {
  const list = chips({ lanes: 'status', group: 'priority', sortColumn: 'dueDate' });
  assert.equal(byId(list, 'lanes').text, '[lanes_label] Status');
  assert.equal(byId(list, 'group').text, '[group_label] Priority');
  assert.equal(byId(list, 'sort').text, '[sort_label] Due date');
});

test('Lanes = Ninguno se ve atenuado; con un campo, no', () => {
  assert.equal(byId(chips({ lanes: '' }), 'lanes').muted, true);
  assert.equal(byId(chips({ lanes: 'tag' }), 'lanes').muted, false);
  assert.equal(byId(chips({ lanes: '' }), 'group').muted, false);
});

test('solo Lanes tiene tooltip', () => {
  const list = chips();
  assert.equal(byId(list, 'lanes').tooltip, '[lanes_tooltip]');
  assert.equal(byId(list, 'group').tooltip, undefined);
  assert.equal(byId(list, 'sort').tooltip, undefined);
});

test('Sort lleva la dirección y los otros chips no', () => {
  const list = chips({ sortDirection: 'asc' });
  assert.equal(byId(list, 'sort').direction, 'asc');
  assert.equal(byId(list, 'lanes').direction, undefined);
  assert.equal(byId(list, 'group').direction, undefined);
});

test('un valor que la vista no ofrece muestra la primera opción', () => {
  assert.equal(byId(chips({ group: 'bogus' }), 'group').text, '[group_label] No grouping');
});

// --- Opción marcada ----------------------------------------------------------------

test('en cada chip solo está marcada la opción del estado', () => {
  const list = chips({ lanes: 'tag', group: 'status', sortColumn: 'dueDate' });
  for (const [id, value] of [['lanes', 'tag'], ['group', 'status'], ['sort', 'dueDate']]) {
    const checked = byId(list, id).options.filter(item => item.checked).map(item => item.value);
    assert.deepEqual(checked, [value]);
  }
});

// --- Choques entre Lanes y Group ----------------------------------------------------

test('Group = Estado atenúa «Estado» en Lanes, con su motivo en el tooltip', () => {
  const lanes = byId(chips({ group: 'status' }), 'lanes');
  assert.equal(option(lanes, 'status').muted, true);
  assert.equal(option(lanes, 'status').disabled, false);
  assert.equal(option(lanes, 'status').title, '[axis_in_use_by_group_swap]');
  assert.equal(option(lanes, 'priority').muted, false);
  assert.equal(option(lanes, 'priority').title, undefined);
});

test('Lanes = Prioridad atenúa «Prioridad» en Group', () => {
  const group = byId(chips({ lanes: 'priority', group: 'none' }), 'group');
  assert.equal(option(group, 'priority').muted, true);
  assert.equal(option(group, 'priority').title, '[axis_in_use_by_lanes_swap]');
  assert.equal(option(group, 'status').muted, false);
});

test('la familia de ruta choca entre sí: Group = Carpeta atenúa Área, Sub-área y Carpeta en Lanes', () => {
  const lanes = byId(chips({ group: 'folder' }), 'lanes');
  for (const value of ['area', 'subArea', 'folder']) assert.equal(option(lanes, value).muted, true, value);
  for (const value of ['', 'status', 'priority', 'tag', 'file']) assert.equal(option(lanes, value).muted, false, value);
});

test('Vencimiento y «Ninguno» no chocan con nada', () => {
  const lanes = byId(chips({ group: 'dueDate' }), 'lanes');
  assert.equal(lanes.options.some(item => item.muted), false);
  assert.equal(byId(chips({ lanes: 'area', group: 'none' }), 'group').options.some(item => item.value === 'none' && item.muted), false);
});

test('el agrupado por defecto de la vista cuenta como el real cuando el estado lo trae vacío', () => {
  const rules = { defaultGroup: 'area' };
  const lanes = byId(chips({ group: '' }, { rules }), 'lanes');
  assert.equal(option(lanes, 'area').muted, true);

  const group = byId(chips({ lanes: 'area', group: '' }, { rules }), 'group');
  assert.equal(group.options.find(item => item.value === 'area').muted, true);
});

test('Kanban (requiresGroup) bloquea la opción en uso, con otro motivo en el tooltip', () => {
  const rules = { requiresGroup: true };
  const lanes = byId(chips({ group: 'status' }, { rules }), 'lanes');
  assert.equal(option(lanes, 'status').disabled, true);
  assert.equal(option(lanes, 'status').title, '[axis_in_use_by_group]');
  assert.equal(option(lanes, 'priority').disabled, false);

  const group = byId(chips({ lanes: 'tag', group: 'status' }, { rules }), 'group');
  assert.equal(option(group, 'tags').disabled, true);
  assert.equal(option(group, 'tags').title, '[axis_in_use_by_lanes]');
});

test('sin requiresGroup ninguna opción está bloqueada', () => {
  const list = chips({ lanes: 'status', group: 'status' });
  assert.equal(list.some(chip => chip.options.some(item => item.disabled)), false);
});

test('las opciones de Sort nunca están atenuadas ni bloqueadas', () => {
  const sort = byId(chips({ lanes: 'priority', group: 'priority' }), 'sort');
  assert.equal(sort.options.some(item => item.muted || item.disabled), false);
});

// --- Elegir una opción --------------------------------------------------------------

const pick = (stateOverrides, axis, value, rules) => pickAxisOption({ state: state(stateOverrides), rules }, axis, value);

test('elegir la opción que ya está activa no cambia nada', () => {
  assert.equal(pick({ lanes: 'tag' }, 'lanes', 'tag'), null);
  assert.equal(pick({ group: 'status' }, 'group', 'status'), null);
  assert.equal(pick({ sortColumn: 'dueDate' }, 'sort', 'dueDate'), null);
});

test('elegir sin choque cambia solo el propio eje', () => {
  assert.deepEqual(pick({ group: 'status' }, 'lanes', 'tag'), { lanes: 'tag' });
  assert.deepEqual(pick({ lanes: 'tag' }, 'group', 'status'), { group: 'status' });
  assert.deepEqual(pick({}, 'sort', 'dueDate'), { sortColumn: 'dueDate' });
});

test('quitar los carriles («Ninguno») no toca Group', () => {
  assert.deepEqual(pick({ lanes: 'tag', group: 'status' }, 'lanes', ''), { lanes: '' });
});

test('elegir en Lanes un campo que usa Group pone Group en «Ninguno», escrito de forma explícita', () => {
  assert.deepEqual(pick({ group: 'status' }, 'lanes', 'status'), { lanes: 'status', group: 'none' });
});

test('elegir en Group un campo que usa Lanes quita los carriles', () => {
  assert.deepEqual(pick({ lanes: 'priority', group: 'status' }, 'group', 'priority'), { group: 'priority', lanes: '' });
});

test('el choque por familia de ruta también se resuelve: Lanes = Área con Group = Carpeta', () => {
  assert.deepEqual(pick({ group: 'folder' }, 'lanes', 'area'), { lanes: 'area', group: 'none' });
});

test('si Group ya estaba en «Ninguno» y se quita el choque, el cambio de Group no se repite', () => {
  assert.deepEqual(pick({ group: 'none' }, 'lanes', 'status'), { lanes: 'status' });
});

test('el agrupado por defecto con estado vacío se compara por su valor real', () => {
  assert.deepEqual(pick({ group: '' }, 'lanes', 'area', { defaultGroup: 'area' }), { lanes: 'area', group: 'none' });
});

test('Kanban no aplica una elección que choca', () => {
  const rules = { requiresGroup: true };
  assert.equal(pick({ group: 'status' }, 'lanes', 'status', rules), null);
  assert.equal(pick({ lanes: 'tag', group: 'status' }, 'group', 'tags', rules), null);
  assert.deepEqual(pick({ group: 'status' }, 'lanes', 'priority', rules), { lanes: 'priority' });
});

// --- Dirección del orden ------------------------------------------------------------

test('la dirección del orden se invierte', () => {
  assert.equal(toggleSortDirection({ sortDirection: 'asc' }), 'desc');
  assert.equal(toggleSortDirection({ sortDirection: 'desc' }), 'asc');
});

// --- Estado guardado ----------------------------------------------------------------

test('todas las claves de texto de los chips existen en los 6 idiomas', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const seen = new Set();
  const spy = key => { seen.add(key); return key; };

  for (const rules of [{}, { requiresGroup: true }]) {
    for (const [lanesValue, group] of [['status', 'status'], ['', 'area'], ['area', 'folder']]) {
      buildAxisChips({ state: state({ lanes: lanesValue, group }), laneOptions, groupOptions, sortOptions, rules, translate: spy });
    }
  }
  for (const key of ['sort_ascending', 'sort_descending']) seen.add(key);
  assert.ok(seen.has('lanes_tooltip') && seen.has('axis_in_use_by_lanes_swap') && seen.has('axis_in_use_by_group'));

  for (const locale of ['en', 'es', 'de', 'fr', 'it', 'pt']) {
    const texts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'locales', `${locale}.json`), 'utf8'));
    for (const key of seen) assert.ok(typeof texts[key] === 'string' && texts[key] !== '', `${locale}: falta «${key}»`);
  }
});

test('el estado guardado valida el campo de los carriles', () => {
  assert.equal(DEFAULT_TASK_VIEW_STATE.lanes, '');
  assert.equal(parseTaskViewState({}).lanes, '');
  assert.equal(parseTaskViewState({ lanes: 'tag' }).lanes, 'tag');
  assert.equal(parseTaskViewState({ lanes: 'bogus' }).lanes, '');
  assert.equal(parseTaskViewState({ lanes: 3 }).lanes, '');
});
