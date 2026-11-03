const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadSource } = require('./helpers/load-source.cjs');

const area = loadSource('core/area.ts');
const viewState = loadSource('core/task-view-state.ts');
const chips = loadSource('core/task-filter-chips.ts');

const { ROOT_AREA } = area;

// --- Rutas de área ---------------------------------------------------------

test('parseAreaRoute y buildAreaRoute son inversas', () => {
  assert.deepEqual(area.parseAreaRoute('/'), { kind: 'root' });
  assert.deepEqual(area.parseAreaRoute('Work'), { kind: 'area', area: 'Work' });
  assert.deepEqual(area.parseAreaRoute('Work/'), { kind: 'direct', area: 'Work' });
  assert.deepEqual(area.parseAreaRoute('Work/Proj/Sub'), { kind: 'subArea', area: 'Work', subArea: 'Proj/Sub' });

  assert.equal(area.buildAreaRoute(ROOT_AREA), '/');
  assert.equal(area.buildAreaRoute('Work'), 'Work');
  assert.equal(area.buildAreaRoute('Work', ROOT_AREA), 'Work/');
  assert.equal(area.buildAreaRoute('Work', 'Proj/Sub'), 'Work/Proj/Sub');
});

test('el filtro de un solo área y sub-área se convierte en una lista', () => {
  assert.deepEqual(area.areaRoutesFromLegacy('', ''), []);
  assert.deepEqual(area.areaRoutesFromLegacy(undefined, 'x'), []);
  assert.deepEqual(area.areaRoutesFromLegacy(ROOT_AREA, ''), ['/']);
  assert.deepEqual(area.areaRoutesFromLegacy('Work', ''), ['Work']);
  assert.deepEqual(area.areaRoutesFromLegacy('Work', ROOT_AREA), ['Work/']);
  assert.deepEqual(area.areaRoutesFromLegacy('Work', 'Proj'), ['Work/Proj']);
});

const vault = [
  'Work/Proj/a.md',
  'Work/Proj/Sub/b.md',
  'Work/Other/c.md',
  'Work/d.md',
  'Personal/e.md',
  'Daily Plan/f.md',
  'root.md',
];

const matching = (routes) => vault.filter(file => area.matchesTaskAreas(file, routes));

test('sin rutas no se filtra', () => {
  assert.deepEqual(matching([]), vault);
});

test('un área incluye todas sus sub-áreas y sus notas directas', () => {
  assert.deepEqual(matching(['Work']), ['Work/Proj/a.md', 'Work/Proj/Sub/b.md', 'Work/Other/c.md', 'Work/d.md']);
});

test('una sub-área incluye sus subcarpetas pero no las vecinas', () => {
  assert.deepEqual(matching(['Work/Proj']), ['Work/Proj/a.md', 'Work/Proj/Sub/b.md']);
  assert.deepEqual(matching(['Work/Proj/Sub']), ['Work/Proj/Sub/b.md']);
});

test('«Raíz» del área son solo las notas directas; «/» solo las de la raíz del vault', () => {
  assert.deepEqual(matching(['Work/']), ['Work/d.md']);
  assert.deepEqual(matching([ROOT_AREA]), ['root.md']);
});

test('los nombres se comparan sin distinguir mayúsculas, espacios ni guiones', () => {
  assert.deepEqual(matching(['daily-plan']), ['Daily Plan/f.md']);
  assert.deepEqual(matching(['work/proj']), ['Work/Proj/a.md', 'Work/Proj/Sub/b.md']);
});

test('gana lo más específico: el ejemplo de la especificación', () => {
  // Trabajo, Trabajo/Proyectos y Personal: las tareas de Proyectos y todas las de Personal
  assert.deepEqual(matching(['Work', 'Work/Proj', 'Personal']),
    ['Work/Proj/a.md', 'Work/Proj/Sub/b.md', 'Personal/e.md']);
  assert.deepEqual(area.effectiveAreaRoutes(['Work', 'Work/Proj', 'Personal']), ['Work/Proj', 'Personal']);
});

test('una sub-área con otra por debajo solo usa la más profunda', () => {
  assert.deepEqual(area.effectiveAreaRoutes(['Work/Proj', 'Work/Proj/Sub']), ['Work/Proj/Sub']);
  assert.deepEqual(matching(['Work/Proj', 'Work/Proj/Sub']), ['Work/Proj/Sub/b.md']);
});

test('las notas directas y una sub-área marcadas a la vez se suman y sustituyen al área completa', () => {
  assert.deepEqual(area.effectiveAreaRoutes(['Work', 'Work/', 'Work/Proj']), ['Work/', 'Work/Proj']);
  assert.deepEqual(matching(['Work', 'Work/', 'Work/Proj']), ['Work/Proj/a.md', 'Work/Proj/Sub/b.md', 'Work/d.md']);
});

test('la raíz y las áreas se combinan con O', () => {
  assert.deepEqual(matching([ROOT_AREA, 'Personal']), ['Personal/e.md', 'root.md']);
});

test('reconcileAreaRoutes descarta las rutas que ya no tienen notas', () => {
  assert.deepEqual(
    area.reconcileAreaRoutes(['Work', 'Gone', 'Work/Proj', '/', 'Gone/'], vault),
    ['Work', 'Work/Proj', '/'],
  );
  assert.deepEqual(area.reconcileAreaRoutes(['/'], ['Work/a.md']), []);
});

test('una sub-área o «Raíz» del área que ya no existen recaen en su área, como con un solo valor', () => {
  assert.deepEqual(area.reconcileAreaRoutes(['Work/Missing'], vault), ['Work']);
  assert.deepEqual(area.reconcileAreaRoutes(['Work/'], ['Work/Proj/a.md']), ['Work']);
  assert.deepEqual(area.reconcileAreaRoutes(['Work/Missing', 'Work'], vault), ['Work']);
  assert.deepEqual(area.reconcileAreaRoutes(['Work/Missing', 'Work/Proj'], vault), ['Work', 'Work/Proj']);
  assert.deepEqual(area.reconcileAreaRoutes(['Gone/Sub', 'Gone/'], vault), []);
});

test('el estado antiguo con una sub-área inexistente conserva el área al reconciliar', () => {
  const { areas } = viewState.parseTaskViewState({ area: 'Work', subArea: 'Gone' });
  assert.deepEqual(area.reconcileAreaRoutes(areas, vault), ['Work']);
});

// --- Estado de las vistas --------------------------------------------------

test('el estado vacío tiene listas vacías', () => {
  const state = viewState.parseTaskViewState({});
  assert.deepEqual([state.priority, state.status, state.areas], [[], [], []]);
  assert.equal('area' in state, false);
  assert.equal('subArea' in state, false);
});

test('un valor suelto guardado antes de v1.1.14 se convierte en una lista de uno', () => {
  const state = viewState.parseTaskViewState({ priority: 'high', status: 'InProgress', area: 'Work', subArea: 'Proj', search: 'x' });
  assert.deepEqual(state.priority, ['high']);
  assert.deepEqual(state.status, ['InProgress']);
  assert.deepEqual(state.areas, ['Work/Proj']);
  assert.equal(state.search, 'x');
});

test('«all» y los valores no válidos se convierten en «todos»', () => {
  const state = viewState.parseTaskViewState({ priority: 'all', status: 'Bogus', area: '', subArea: 'Proj' });
  assert.deepEqual([state.priority, state.status, state.areas], [[], [], []]);
});

test('las listas se conservan sin repetidos ni valores no válidos', () => {
  const state = viewState.parseTaskViewState({
    priority: ['high', 'high', 'none', 'nope', 3],
    status: ['Todo', 'Done', 'Bogus'],
    areas: ['Work', 'Work', '', 'Personal', 7],
  });
  assert.deepEqual(state.priority, ['high', 'none']);
  assert.deepEqual(state.status, ['Todo', 'Done']);
  assert.deepEqual(state.areas, ['Work', 'Personal']);
});

test('la lista de v1.1.14 gana sobre los campos antiguos si están los dos', () => {
  const state = viewState.parseTaskViewState({ areas: ['Personal'], area: 'Work' });
  assert.deepEqual(state.areas, ['Personal']);
});

test('los filtros de fecha siguen con un solo valor', () => {
  const state = viewState.parseTaskViewState({ due: 'overdue', start: 'bogus', scheduled: 'today' });
  assert.deepEqual([state.due, state.start, state.scheduled], ['overdue', 'all', 'today']);
});

test('el estado antiguo de la Tabla se convierte con su carpeta como área', () => {
  assert.deepEqual(viewState.migrateLegacyTableState({ folder: 'Work', priority: 'HIGH' }).areas, ['Work']);
  assert.deepEqual(viewState.migrateLegacyTableState({ folder: 'all' }).areas, []);
  assert.deepEqual(viewState.migrateLegacyTableState({ folder: 'root' }).areas, []);
  assert.deepEqual(viewState.migrateLegacyTableState({ priority: 'HIGH' }).priority, ['high']);
});

// --- Filtrado: O dentro de un tipo y Y entre tipos --------------------------

const NAME_TO_SYMBOL = { Todo: ' ', InProgress: '/', OnHold: '?', Done: 'x', Cancelled: '-', nonTask: '~' };

function task(id, { file, status = 'Todo', priority, desc = id, tags = [] }) {
  return {
    id,
    state: { status: NAME_TO_SYMBOL[status], text: status, priority },
    file: { path: file },
    section: { desc, tags },
    date: { due: null, start: null, scheduled: null },
  };
}

const tasks = [
  task('a', { file: 'Work/Proj/a.md', status: 'Todo', priority: 'high' }),
  task('b', { file: 'Work/Proj/Sub/b.md', status: 'InProgress', priority: 'low' }),
  task('c', { file: 'Work/Other/c.md', status: 'Done', priority: 'high' }),
  task('d', { file: 'Personal/e.md', status: 'Todo' }),
  task('e', { file: 'root.md', status: 'Cancelled', priority: 'medium' }),
];

const ids = (list) => list.map(item => item.id);
const filter = (changes) => ids(viewState.filterTasksByViewState(tasks, { ...viewState.parseTaskViewState({}), ...changes }));

test('sin filtros salen todas las tareas', () => {
  assert.deepEqual(filter({}), ['a', 'b', 'c', 'd', 'e']);
});

test('varias prioridades se suman con O', () => {
  assert.deepEqual(filter({ priority: ['high', 'low'] }), ['a', 'b', 'c']);
});

test('«none» es la tarea sin prioridad', () => {
  assert.deepEqual(filter({ priority: ['none'] }), ['d']);
  assert.deepEqual(filter({ priority: ['none', 'medium'] }), ['d', 'e']);
});

test('varios estados se suman con O', () => {
  assert.deepEqual(filter({ status: ['Todo', 'Done'] }), ['a', 'c', 'd']);
});

test('entre tipos se exige cumplir todos (Y)', () => {
  assert.deepEqual(filter({ priority: ['high'], status: ['Todo', 'Done'] }), ['a', 'c']);
  assert.deepEqual(filter({ priority: ['high'], status: ['Todo'], areas: ['Work'] }), ['a']);
  assert.deepEqual(filter({ priority: ['low'], status: ['Done'] }), []);
});

test('varias áreas se suman con O y gana la más específica', () => {
  assert.deepEqual(filter({ areas: ['Work', 'Personal'] }), ['a', 'b', 'c', 'd']);
  assert.deepEqual(filter({ areas: ['Work', 'Work/Proj', 'Personal'] }), ['a', 'b', 'd']);
  assert.deepEqual(filter({ areas: [ROOT_AREA] }), ['e']);
});

test('la búsqueda se combina con las listas', () => {
  assert.deepEqual(filter({ status: ['Todo', 'Done'], search: 'C' }), ['c']);
});

// --- Chips -----------------------------------------------------------------

const translate = (key) => key;
const state = (changes) => ({ ...viewState.parseTaskViewState({}), ...changes });

test('un valor muestra su nombre y dos o más muestran solo el número', () => {
  const active = chips.getActiveFilterChips(state({ priority: ['high', 'low'], status: ['Todo'], areas: ['Work/Proj', '/'] }), translate);
  assert.deepEqual(active.map(chip => chip.id), ['priority', 'status', 'area']);
  assert.equal(active[1].valueLabel, 'status_todo');
  assert.equal(active[0].valueLabel, '2');
  assert.equal(active[2].valueLabel, '2');
});

test('el tooltip del chip lista todos los valores', () => {
  const [two] = chips.getActiveFilterChips(state({ status: ['Todo', 'Done'] }), translate);
  assert.equal(two.valueLabel, '2');
  assert.equal(two.title, 'task_status: status_todo, status_done');

  const [three] = chips.getActiveFilterChips(state({ status: ['Todo', 'InProgress', 'Done'] }), translate);
  assert.equal(three.valueLabel, '3');
  assert.equal(three.title, 'task_status: status_todo, status_in_progress, status_done');

  const [areas] = chips.getActiveFilterChips(state({ areas: ['Work', 'Personal', '/'] }), translate);
  assert.equal(areas.valueLabel, '3');
  assert.equal(areas.title, 'area: Work, Personal, area_root');

  const [single] = chips.getActiveFilterChips(state({ areas: ['Work/Proj'] }), translate);
  assert.equal(single.valueLabel, 'Work › Proj');
  assert.equal(single.title, 'area: Work › Proj');
});

test('sin filtros no hay chips', () => {
  assert.deepEqual(chips.getActiveFilterChips(state({}), translate), []);
});

test('areaRouteLabel nombra cada tipo de ruta', () => {
  assert.equal(chips.areaRouteLabel('/', translate), 'area_root');
  assert.equal(chips.areaRouteLabel('Work', translate), 'Work');
  assert.equal(chips.areaRouteLabel('Work/', translate), 'Work › area_root');
  assert.equal(chips.areaRouteLabel('Work/Proj/Sub', translate), 'Work › Proj › Sub');
});

test('quitar un chip vacía su lista y no toca lo demás', () => {
  const start = state({ priority: ['high'], status: ['Todo'], areas: ['Work'], search: 'x', due: 'overdue' });
  assert.deepEqual(chips.clearFilterChip(start, 'priority').priority, []);
  assert.deepEqual(chips.clearFilterChip(start, 'area').areas, []);
  assert.deepEqual(chips.clearFilterChip(start, 'priority').status, ['Todo']);

  const cleared = chips.clearAllFilters(start);
  assert.deepEqual([cleared.priority, cleared.status, cleared.areas, cleared.due], [[], [], [], 'all']);
  assert.equal(cleared.search, 'x');
});

test('FILTER_STATE_KEYS cubre solo claves del estado', () => {
  const keys = Object.keys(viewState.parseTaskViewState({}));
  for (const key of chips.FILTER_STATE_KEYS) assert.ok(keys.includes(key), key);
});

// --- Marcar y desmarcar en el popover ---------------------------------------

const ORDER = ['highest', 'high', 'medium', 'normal', 'low', 'lowest', 'none'];

test('toggleFilterValue marca y desmarca sin importar el orden de las marcas', () => {
  assert.deepEqual(chips.toggleFilterValue([], 'normal', ORDER), ['normal']);
  // Normal y Medium a la vez, el caso que motivó esta fase
  assert.deepEqual(chips.toggleFilterValue(['normal'], 'medium', ORDER), ['medium', 'normal']);
  assert.deepEqual(chips.toggleFilterValue(['medium', 'normal'], 'normal', ORDER), ['medium']);
  assert.deepEqual(chips.toggleFilterValue(['medium'], 'medium', ORDER), []);
  assert.deepEqual(chips.toggleFilterValue(['none', 'high'], 'lowest', ORDER), ['high', 'lowest', 'none']);
});

test('marcar prioridad Normal y Medium filtra las dos', () => {
  const both = viewState.filterTasksByViewState(
    [task('n', { file: 'a.md', priority: 'normal' }), task('m', { file: 'a.md', priority: 'medium' }), task('h', { file: 'a.md', priority: 'high' })],
    state({ priority: chips.toggleFilterValue(['normal'], 'medium', ORDER) }),
  );
  assert.deepEqual(ids(both), ['n', 'm']);
});

test('isAreaMarked mira cualquier ruta del área', () => {
  assert.equal(area.isAreaMarked(['Work'], 'work'), true);
  assert.equal(area.isAreaMarked(['Work/Proj'], 'Work'), true);
  assert.equal(area.isAreaMarked(['Work/'], 'Work'), true);
  assert.equal(area.isAreaMarked(['/'], 'Work'), false);
  assert.equal(area.isAreaMarked(['Personal'], 'Work'), false);
});

test('toggleAreaRoute: marcar un área, una sub-área y desmarcar el área quita sus sub-áreas', () => {
  let routes = area.toggleAreaRoute([], 'Work');
  assert.deepEqual(routes, ['Work']);
  routes = area.toggleAreaRoute(routes, 'Work/Proj');
  assert.deepEqual(routes, ['Work', 'Work/Proj']);
  routes = area.toggleAreaRoute(routes, 'Personal');
  assert.deepEqual(routes, ['Work', 'Work/Proj', 'Personal']);
  routes = area.toggleAreaRoute(routes, 'Work');
  assert.deepEqual(routes, ['Personal']);
  assert.deepEqual(area.toggleAreaRoute(['/', 'Work'], '/'), ['Work']);
  assert.deepEqual(area.toggleAreaRoute(['Work', 'Work/Proj'], 'Work/Proj'), ['Work']);
});

const areaSections = (routes) => chips.buildAreaFilterSections({
  routes,
  areas: ['Personal', 'Work'],
  hasRootTasks: true,
  subAreasOf: (a) => area.listTaskSubAreas(vault, a),
  hasDirectTasks: (a) => area.hasDirectTasks(vault, a),
  translate,
});

test('el popover del área lista las áreas con «Raíz» y las sub-áreas de las marcadas', () => {
  const [areas, subAreas] = areaSections(['Work']);
  assert.deepEqual(areas.options.map(o => [o.value, o.label, o.checked]),
    [['Personal', 'Personal', false], ['Work', 'Work', true], ['/', 'area_root', false]]);
  assert.equal(subAreas.title, 'filter_sub_areas');
  assert.deepEqual(subAreas.options.map(o => [o.value, o.label]), [
    ['Work/', 'Work › area_root'],
    ['Work/Other', 'Work › Other'],
    ['Work/Proj', 'Work › Proj'],
    ['Work/Proj/Sub', 'Work › Proj › Sub'],
  ]);
});

test('el popover del área marca las sub-áreas elegidas y oculta las de áreas sin marcar', () => {
  const [, subAreas] = areaSections(['Work', 'Work/Proj']);
  assert.deepEqual(subAreas.options.filter(o => o.checked).map(o => o.value), ['Work/Proj']);

  assert.equal(areaSections([]).length, 1);
  // Personal solo tiene una nota directa (e.md): su sección de sub-áreas es «Personal › Raíz»
  const [, personal] = areaSections(['Personal']);
  assert.deepEqual(personal.options.map(o => o.value), ['Personal/']);
});

test('un área marcada solo por una sub-área se muestra marcada', () => {
  const [areas, subAreas] = areaSections(['Work/Proj']);
  assert.equal(areas.options.find(o => o.value === 'Work').checked, true);
  assert.deepEqual(subAreas.options.filter(o => o.checked).map(o => o.value), ['Work/Proj']);
});
