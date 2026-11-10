const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DateTime } = require('luxon');
const { loadSource } = require('./helpers/load-source.cjs');

const calendarState = loadSource('core/calendar-state.ts');
const area = loadSource('core/area.ts');
const viewState = loadSource('core/task-view-state.ts');

const NAME_TO_SYMBOL = { Todo: ' ', InProgress: '/', OnHold: '?', Done: 'x', Cancelled: '-', nonTask: '~' };

function task(id, { file, status = 'Todo', priority, due = null, scheduled = null, desc = id }) {
  return {
    id,
    state: { status: NAME_TO_SYMBOL[status], text: status, priority },
    file: { path: file },
    line: { number: 1 },
    section: { desc, tags: [] },
    flow: { repeat: '' },
    date: { due, start: null, scheduled },
  };
}

const day = DateTime.fromISO('2026-11-03');
const tasks = [
  task('a', { file: 'Work/Proj/a.md', status: 'Todo', priority: 'high', due: day }),
  task('b', { file: 'Work/Other/b.md', status: 'Done', priority: 'low', due: day }),
  task('c', { file: 'Personal/c.md', status: 'InProgress', priority: 'high', scheduled: day }),
  task('d', { file: 'root.md', status: 'Todo', due: day }),
];
const ids = (list) => list.map(item => item.id);
const state = (changes) => ({ ...calendarState.parseCalendarState({}), ...changes });

// --- Estado ---------------------------------------------------------------

test('el estado vacío del calendario no filtra nada', () => {
  const empty = calendarState.parseCalendarState({});
  assert.equal(calendarState.hasCalendarFilters(empty), false);
  assert.equal(calendarState.filterTasksForCalendar(tasks, empty), tasks);
});

test('el calendario solo conserva búsqueda, prioridad, estado, área y «con fecha»', () => {
  const parsed = calendarState.parseCalendarState({
    search: 'x', priority: ['high'], status: ['Todo'], areas: ['Work'],
    due: 'overdue', start: 'today', scheduled: 'future', group: 'status', sortColumn: 'due', sortDirection: 'asc',
  });
  assert.deepEqual([parsed.search, parsed.priority, parsed.status, parsed.areas], ['x', ['high'], ['Todo'], ['Work']]);
  // Los filtros de fecha relativos (vencidas, hoy, futuras…) no valen en el calendario
  assert.deepEqual([parsed.due, parsed.start, parsed.scheduled, parsed.group], ['all', 'all', 'all', '']);
  assert.deepEqual([parsed.sortColumn, parsed.sortDirection], ['priority', 'desc']);
  assert.equal(parsed.holidays, 'show');
});

test('el calendario conserva «con fecha» de inicio, programada y vencimiento', () => {
  const parsed = calendarState.parseCalendarState({ start: 'hasdate', scheduled: 'hasdate', due: 'hasdate' });
  assert.deepEqual([parsed.start, parsed.scheduled, parsed.due], ['hasdate', 'hasdate', 'hasdate']);
  // «Sin fecha» nunca dibujaría nada en el calendario: no se admite
  assert.equal(calendarState.parseCalendarState({ due: 'nodate' }).due, 'all');
});

test('el estado antiguo con un solo valor se convierte igual que en las demás vistas', () => {
  const parsed = calendarState.parseCalendarState({ priority: 'high', status: 'Todo', area: 'Work', subArea: 'Proj' });
  assert.deepEqual([parsed.priority, parsed.status, parsed.areas], [['high'], ['Todo'], ['Work/Proj']]);
});

test('hasCalendarFilters detecta cada filtro', () => {
  assert.equal(calendarState.hasCalendarFilters(state({ search: ' x ' })), true);
  assert.equal(calendarState.hasCalendarFilters(state({ search: '   ' })), false);
  assert.equal(calendarState.hasCalendarFilters(state({ priority: ['low'] })), true);
  assert.equal(calendarState.hasCalendarFilters(state({ status: ['Done'] })), true);
  assert.equal(calendarState.hasCalendarFilters(state({ areas: ['/'] })), true);
  assert.equal(calendarState.hasCalendarFilters(state({ start: 'hasdate' })), true);
  assert.equal(calendarState.hasCalendarFilters(state({ scheduled: 'hasdate' })), true);
  assert.equal(calendarState.hasCalendarFilters(state({ due: 'hasdate' })), true);
});

test('el calendario guarda con su propia clave', () => {
  assert.equal(calendarState.CALENDAR_STATE_KEY, 'obsidian-agenda-calendar-view-state');
  const storage = new Map();
  const app = { loadLocalStorage: (key) => storage.get(key) ?? null, saveLocalStorage: (key, value) => storage.set(key, value) };

  assert.equal(calendarState.hasCalendarFilters(calendarState.loadCalendarState(app)), false);
  calendarState.saveCalendarState(app, state({ priority: ['high'], due: 'overdue', group: 'status' }));

  assert.deepEqual([...storage.keys()], ['obsidian-agenda-calendar-view-state']);
  const loaded = calendarState.loadCalendarState(app);
  assert.deepEqual(loaded.priority, ['high']);
  assert.equal(loaded.due, 'all');
});

test('un estado guardado dañado vuelve al estado vacío', () => {
  const app = { loadLocalStorage: () => '{no es json', saveLocalStorage() {} };
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(calendarState.hasCalendarFilters(calendarState.loadCalendarState(app)), false);
  } finally {
    console.error = original;
  }
});

// --- Filtrado: O dentro de un tipo y Y entre tipos --------------------------

test('filtra por prioridad, estado, área y búsqueda', () => {
  const filter = (changes) => ids(calendarState.filterTasksForCalendar(tasks, state(changes)));
  assert.deepEqual(filter({ priority: ['high'] }), ['a', 'c']);
  assert.deepEqual(filter({ status: ['Done', 'InProgress'] }), ['b', 'c']);
  assert.deepEqual(filter({ areas: ['Work'] }), ['a', 'b']);
  assert.deepEqual(filter({ areas: ['Work', 'Work/Proj', 'Personal'] }), ['a', 'c']);
  assert.deepEqual(filter({ areas: ['/'] }), ['d']);
  assert.deepEqual(filter({ priority: ['high'], areas: ['Work'] }), ['a']);
  assert.deepEqual(filter({ search: 'b' }), ['b']);
});

test('el calendario ignora los filtros de fecha relativos aunque lleguen en el estado', () => {
  const dated = { ...state({}), due: 'overdue', scheduled: 'today' };
  assert.deepEqual(ids(calendarState.filterTasksForCalendar(tasks, dated)), ['a', 'b', 'c', 'd']);
});

test('las fechas marcadas no quitan tareas: solo cambian qué píldoras se dibujan', () => {
  const filter = (changes) => ids(calendarState.filterTasksForCalendar(tasks, state(changes)));
  assert.deepEqual(filter({ due: 'hasdate' }), ['a', 'b', 'c', 'd']);
  assert.deepEqual(filter({ scheduled: 'hasdate', start: 'hasdate' }), ['a', 'b', 'c', 'd']);
});

test('las fechas marcadas se combinan con los demás filtros', () => {
  const filter = (changes) => ids(calendarState.filterTasksForCalendar(tasks, state(changes)));
  assert.deepEqual(filter({ due: 'hasdate', priority: ['high'] }), ['a', 'c']);
  assert.deepEqual(filter({ due: 'hasdate', areas: ['Work'], status: ['Todo'] }), ['a']);
});

test('getActiveCalendarDateTypes lista los tipos marcados en el orden de la barra', () => {
  assert.deepEqual(calendarState.getActiveCalendarDateTypes(state({})), []);
  assert.deepEqual(calendarState.getActiveCalendarDateTypes(state({ due: 'hasdate', start: 'hasdate' })), ['start', 'due']);
  assert.deepEqual(calendarState.getActiveCalendarDateTypes(state({ scheduled: 'hasdate' })), ['scheduled']);
});

// --- Integración con CalendarView --------------------------------------------

/** DOM mínimo: lo que `CalendarView` necesita para montar la barra y redibujar el contenido. */
class FakeEl {
  constructor(cls = '') { this.cls = cls; this.childNodes = []; this.parent = null; this.removed = false; }
  get children() { return [...this.childNodes]; }
  adopt(node) { if (node instanceof FakeEl) node.parent = this; return node; }
  createDiv(options = {}) { const el = new FakeEl(options.cls); this.childNodes.push(this.adopt(el)); return el; }
  empty() { this.childNodes.forEach(node => { node.removed = true; }); this.childNodes = []; }
  append(...nodes) { this.childNodes.push(...nodes.map(node => this.adopt(node))); }
  prepend(node) { this.childNodes.unshift(this.adopt(node)); }
  remove() {
    this.removed = true;
    if (this.parent) this.parent.childNodes = this.parent.childNodes.filter(node => node !== this);
  }
  querySelector(selector) {
    const cls = selector.replace(/^\./, '');
    for (const child of this.childNodes) {
      if (child.cls === cls) return child;
      const found = child.querySelector?.(selector);
      if (found) return found;
    }
    return null;
  }
}

globalThis.createDiv = (options = {}) => new FakeEl(options.cls);

/** Doble de `TaskFilterBar`: guarda sus opciones y cada montaje, sin DOM. */
class FakeFilterBar {
  constructor(options) { this.options = options; this.mounted = []; }
  getState() { return this.options.state; }
  mount(root) { this.mounted.push(root); }
  setFilterTypes(types) { this.options = { ...this.options, filterTypes: types }; }
}

function loadCalendarView() {
  class BaseView {
    constructor() {
      this.app = {
        storage: new Map(),
        loadLocalStorage(key) { return this.storage.get(key) ?? null; },
        saveLocalStorage(key, value) { this.storage.set(key, value); },
      };
      this.containerEl = { children: [null, new FakeEl('agenda-container')] };
      this.fullRenders = 0;
      this.gates = [];
    }
    showLoadingOverlay() {}
    async getAllTasks() { return this.loadedTasks; }
    /** Un dibujado completo vacía el contenedor y lo reconstruye, como `BaseView.render()`. */
    async render(viewType, data) {
      this.fullRenders += 1;
      const container = this.containerEl.children[1];
      container.empty();
      container.createDiv({ cls: 'agenda-header-container' });
      await this.renderTemplate(container.createDiv({ cls: 'agenda-content-container' }), viewType, data);
    }
    async renderTemplate(container, _viewType, data) {
      if (this.gates.length > 0) await this.gates.shift();
      const page = new FakeEl('oa-calendar-container');
      page.text = JSON.stringify(data.calendar.ids);
      container.append(page);
    }
  }
  const stubs = {
    obsidian: { Notice: class {}, setIcon() {} },
    handlebars: {},
    '../views/base-view': { BaseView },
    '../core/task-writer': { TaskWriter: class { constructor(app) { this.app = app; } } },
    '../core/task-line-fields': {},
    '../core/task-gestures': { attachTaskGestures() {}, TASK_CLICK_DELAY_MS: 250 },
    '../core/calendar-date-picker': { CalendarDatePicker: class {} },
    '../core/tooltips': { clearTooltips() {}, installTooltips() {} },
    '../core/task-filter-bar': { TaskFilterBar: FakeFilterBar },
  };
  const { CalendarView } = loadSource('views/calendar-view.ts', stubs);

  class TestView extends CalendarView {
    generateViewData() { return { ids: this.visibleTasks.map(item => item.id) }; }
    getViewType() { return 'calendar-month-view'; }
    setupViewSpecificEventListeners(container) { (this.listened ??= []).push(container); }
  }

  const view = new TestView({}, { settings: { calendarShowDueDates: true, calendarShowScheduledDates: true, calendarShowCompletedTasks: true } }, {}, {});
  view.loadedTasks = tasks;
  return view;
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));
const contentOf = (view) => view.containerEl.children[1].querySelector('.agenda-content-container');
const shownIds = (view) => JSON.parse(contentOf(view).childNodes.at(-1).text);

test('CalendarView sin filtros dibuja todas las tareas del día', async () => {
  const view = loadCalendarView();
  await view.onOpen();
  assert.deepEqual(ids(view.getTasksForDate(day)), ['a', 'b', 'c', 'd']);
});

// --- Fechas marcadas en la barra: solo se dibujan las píldoras de esos tipos --------

test('cada píldora lleva el color de su área y las notas de la raíz no llevan ninguno', async () => {
  const view = loadCalendarView();
  await view.onOpen();
  const byId = Object.fromEntries(view.getTasksForDate(day).map(item => [item.id, item.areaColor]));
  assert.equal(byId.a, area.getAreaColor('Work'));
  assert.equal(byId.b, area.getAreaColor('Work'), 'la sub-área no cambia el color: manda la primera carpeta');
  assert.equal(byId.c, area.getAreaColor('Personal'));
  assert.equal(byId.d, '', 'sin carpeta: color por defecto');
  assert.notEqual(byId.a, byId.c);
});

test('un fantasma lleva el color del área de su tarea real', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [recurringTask('r')];
  view.plugin.settings.calendarProjectionCount = 1;
  await view.onOpen();
  const [ghost] = view.getTasksForDate(nextDay, true);
  assert.equal(ghost.areaColor, area.getAreaColor('Work'));
});

async function openWithDates(changes, settings = {}) {
  const view = loadCalendarView();
  Object.assign(view.plugin.settings, settings);
  calendarState.saveCalendarState(view.app, state(changes));
  await view.onOpen();
  return view;
}

test('con Programada marcada solo se ven las píldoras de la fecha programada', async () => {
  const view = await openWithDates({ scheduled: 'hasdate' });
  const shown = view.getTasksForDate(day);
  assert.deepEqual(ids(shown), ['c']);
  assert.equal(shown[0].calendarDateType, 'scheduled');
});

test('con Vencimiento marcada se ocultan las píldoras de la fecha programada', async () => {
  const view = await openWithDates({ due: 'hasdate' });
  assert.deepEqual(ids(view.getTasksForDate(day)), ['a', 'b', 'd']);
});

test('con dos fechas marcadas se ven las píldoras de las dos', async () => {
  const view = await openWithDates({ due: 'hasdate', scheduled: 'hasdate' });
  assert.deepEqual(ids(view.getTasksForDate(day)), ['a', 'b', 'c', 'd']);
});

test('con Inicio marcada y ninguna tarea con inicio no se dibuja nada', async () => {
  const view = await openWithDates({ start: 'hasdate' });
  assert.deepEqual(ids(view.getTasksForDate(day)), []);
});

test('lo marcado en la barra manda sobre los ajustes «Mostrar fechas»', async () => {
  const view = await openWithDates({ scheduled: 'hasdate' }, { calendarShowScheduledDates: false, calendarShowDueDates: true });
  assert.deepEqual(ids(view.getTasksForDate(day)), ['c']);
});

test('sin fechas marcadas mandan los ajustes «Mostrar fechas»', async () => {
  const view = await openWithDates({}, { calendarShowDueDates: false });
  assert.deepEqual(ids(view.getTasksForDate(day)), ['c']);
});

test('desmarcar la fecha en la barra devuelve todas las píldoras', async () => {
  const view = await openWithDates({ scheduled: 'hasdate' });
  view.filterBar.options.onChange(state({}), ['scheduled']);
  await settle();
  assert.deepEqual(ids(view.getTasksForDate(day)), ['a', 'b', 'c', 'd']);
});

test('los fantasmas siguen las fechas marcadas', async () => {
  const view = loadCalendarView();
  const recurring = weeklyWithThreeDates();
  view.loadedTasks = [recurring];
  view.plugin.settings.calendarProjectionCount = 1;
  view.plugin.settings.calendarShowStartDates = true;
  calendarState.saveCalendarState(view.app, state({ due: 'hasdate' }));
  await view.onOpen();

  // Con solo Vencimiento: la copia va en el vencimiento desplazado, no en la fecha programada
  assert.deepEqual(ids(view.getTasksForDate(day.plus({ days: 8 }), true)), [], 'programada oculta');
  const [ghost] = view.getTasksForDate(day.plus({ days: 14 }), true);
  assert.equal(ghost.id, 'w+1');
  assert.equal(ghost.calendarDateType, 'due');
});

test('CalendarView filtra con el estado guardado al abrir y en cada navegación', async () => {
  const view = loadCalendarView();
  calendarState.saveCalendarState(view.app, state({ priority: ['high'] }));

  await view.onOpen();
  assert.deepEqual(ids(view.getTasksForDate(day)), ['a', 'c']);
  assert.equal(view.tasks.length, 4, 'la lista completa se conserva para buscar una tarea por su línea');

  // La navegación vuelve a ejecutar onOpen(): un cambio guardado se aplica sin recrear la vista
  calendarState.saveCalendarState(view.app, state({ areas: ['Work'] }));
  await view.onOpen();
  assert.deepEqual(ids(view.getTasksForDate(day)), ['a', 'b']);
});

test('los filtros se combinan con ocultar las completadas', async () => {
  const view = loadCalendarView();
  view.plugin.settings.calendarShowCompletedTasks = false;
  calendarState.saveCalendarState(view.app, state({ areas: ['Work'] }));

  await view.onOpen();
  assert.deepEqual(ids(view.getTasksForDate(day)), ['a']);
});

test('los filtros no cambian qué fecha ancla cada tarea', async () => {
  const view = loadCalendarView();
  calendarState.saveCalendarState(view.app, state({ priority: ['high'] }));
  await view.onOpen();

  const [a, c] = view.getTasksForDate(day);
  assert.deepEqual([a.calendarDateType, c.calendarDateType], ['due', 'scheduled']);
  assert.deepEqual(ids(view.getTasksForDate(day.plus({ days: 1 }))), []);
});

// --- Barra del calendario (Fase CF2) ------------------------------------------

test('la barra ofrece prioridad, estado, área y «con fecha», y arranca con el estado guardado', async () => {
  const view = loadCalendarView();
  calendarState.saveCalendarState(view.app, state({ priority: ['high'] }));
  await view.onOpen();

  assert.deepEqual([...view.filterBar.options.filterTypes], ['priority', 'status', 'area', 'start', 'scheduled', 'due', 'projected']);
  assert.deepEqual([...view.filterBar.options.directFilterTypes], ['start', 'scheduled', 'due']);
  assert.deepEqual(view.filterBar.options.state.priority, ['high']);
  assert.equal(view.filterBar.options.groupOptions, undefined, 'sin agrupado');
  assert.equal(view.filterBar.options.sortOptions, undefined, 'sin orden');
  assert.equal(view.filterBar.options.modeSwitch, undefined);
  assert.equal(view.filterBar.options.tasks, view.tasks, 'las áreas salen de todas las tareas, no de las filtradas');
});

test('la barra es el primer elemento del contenido, como en las demás vistas, una vez por dibujado completo', async () => {
  const view = loadCalendarView();
  await view.onOpen();

  const content = contentOf(view);
  assert.equal(view.filterBar.mounted.length, 1);
  assert.equal(view.filterBar.mounted[0].cls, 'oa-calendar-filter-bar');
  assert.equal(content.childNodes[0], view.filterBar.mounted[0], 'la barra va antes que el calendario');
  assert.equal(content.childNodes[1].cls, 'oa-calendar-container');
  assert.equal(view.containerEl.children[1].querySelector('.agenda-header-container').querySelector('.oa-calendar-filter-bar'), null,
    'la cabecera con las pestañas no lleva la barra');

  // Navegar o cambiar de subvista vuelve a dibujar todo y monta la barra en el contenido nuevo
  await view.refreshCalendar();
  const newContent = contentOf(view);
  assert.equal(view.filterBar.mounted.length, 2);
  assert.notEqual(newContent, content, 'el dibujado completo crea un contenido nuevo');
  assert.equal(newContent.childNodes[0], view.filterBar.mounted[1], 'la barra está en el contenido nuevo');
});

test('un cambio de filtro redibuja el calendario y conserva el mismo nodo de la barra (el foco)', async () => {
  const view = loadCalendarView();
  await view.onOpen();
  const rendersBefore = view.fullRenders;
  const mountsBefore = view.filterBar.mounted.length;
  const content = contentOf(view);
  const bar = view.filterBar.mounted[0];
  const pageBefore = content.childNodes[1];
  const listenedBefore = view.listened?.length ?? 0;

  view.filterBar.options.onChange(state({ priority: ['high'], due: 'overdue' }), ['priority']);
  await settle();

  assert.deepEqual(shownIds(view), ['a', 'c']);
  assert.deepEqual(ids(view.getTasksForDate(day)), ['a', 'c']);
  assert.equal(view.fullRenders, rendersBefore, 'no hay dibujado completo');
  assert.equal(view.filterBar.mounted.length, mountsBefore, 'la barra no se vuelve a montar');
  assert.equal(contentOf(view), content, 'el contenedor es el mismo');
  assert.equal(content.childNodes[0], bar, 'la barra sigue siendo el primer elemento');
  assert.equal(bar.removed, false, 'el nodo de la barra no se quitó ni se volvió a poner, que le haría perder el foco');
  assert.equal(pageBefore.removed, true, 'el calendario anterior sí se sustituye');
  assert.equal(content.childNodes.length, 2, 'la barra y un solo calendario');
  assert.equal(view.listened.length, listenedBefore + 1, 'los listeners se vuelven a asignar al contenido nuevo');

  const saved = calendarState.loadCalendarState(view.app);
  assert.deepEqual(saved.priority, ['high']);
  assert.equal(saved.due, 'all', 'el calendario no guarda filtros de fecha');
});

test('quitar los filtros devuelve todas las tareas', async () => {
  const view = loadCalendarView();
  calendarState.saveCalendarState(view.app, state({ priority: ['high'] }));
  await view.onOpen();

  view.filterBar.options.onChange(state({}), ['priority']);
  await settle();
  assert.deepEqual(shownIds(view), ['a', 'b', 'c', 'd']);
});

test('si llegan dos cambios seguidos y el primero tarda más, gana el último', async () => {
  const view = loadCalendarView();
  await view.onOpen();

  let releaseFirst;
  let releaseSecond;
  view.gates.push(new Promise(resolve => { releaseFirst = resolve; }));
  view.gates.push(new Promise(resolve => { releaseSecond = resolve; }));

  view.filterBar.options.onChange(state({ priority: ['high'] }), ['priority']);
  view.filterBar.options.onChange(state({ areas: ['/'] }), ['areas']);

  releaseSecond();
  await settle();
  releaseFirst();
  await settle();

  assert.deepEqual(shownIds(view), ['d'], 'no se pinta el resultado atrasado del primer cambio');
  assert.equal(contentOf(view).childNodes.length, 2, 'la barra y un solo calendario: el contenido no se duplica');
});

test('un área guardada que ya no existe no vacía el calendario', async () => {
  const view = loadCalendarView();
  calendarState.saveCalendarState(view.app, state({ areas: ['Gone'] }));
  // La barra real descarta la ruta al crearse; el doble devuelve el estado ya reconciliado
  FakeFilterBar.prototype.getState = function () { return { ...this.options.state, areas: [] }; };
  try {
    await view.onOpen();
    assert.deepEqual(ids(view.getTasksForDate(day)), ['a', 'b', 'c', 'd']);
  } finally {
    FakeFilterBar.prototype.getState = function () { return this.options.state; };
  }
});

// --- Ocurrencias proyectadas (v1.1.15, PR2) ---------------------------------------

function recurringTask(id, priority = 'high') {
  return { ...task(id, { file: 'Work/Proj/r.md', priority, due: day }), flow: { repeat: 'every day' } };
}

const nextDay = day.plus({ days: 1 });

test('las ocurrencias proyectadas se piden aparte y van detrás de las reales', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [...tasks, recurringTask('r')];
  view.plugin.settings.calendarProjectionCount = 3;
  await view.onOpen();

  assert.deepEqual(ids(view.getTasksForDate(day, true)), ['a', 'b', 'c', 'd', 'r']);
  assert.deepEqual(ids(view.getTasksForDate(nextDay)), [], 'sin pedirlas, Año y el selector de fecha no las ven');

  const ghosts = view.getTasksForDate(nextDay, true);
  assert.deepEqual(ids(ghosts), ['r+1']);
  assert.equal(ghosts[0].isProjected, true);
  assert.equal(ghosts[0].calendarDateType, 'due');
  assert.equal(ids(view.getTasksForDate(day.plus({ days: 3 }), true)).length, 1);
  assert.deepEqual(ids(view.getTasksForDate(day.plus({ days: 4 }), true)), [], 'solo N ocurrencias');
});

test('las reales no llevan la marca de proyectada', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [...tasks, recurringTask('r')];
  await view.onOpen();
  assert.equal(view.getTasksForDate(day, true).some(item => item.isProjected), false);
});

test('con N en 0 el calendario no proyecta nada', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [...tasks, recurringTask('r')];
  view.plugin.settings.calendarProjectionCount = 0;
  await view.onOpen();
  assert.deepEqual(ids(view.getTasksForDate(nextDay, true)), []);
});

test('sin el ajuste guardado se proyectan 10', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [...tasks, recurringTask('r')];
  await view.onOpen();
  assert.equal(ids(view.getTasksForDate(day.plus({ days: 10 }), true)).length, 1);
  assert.deepEqual(ids(view.getTasksForDate(day.plus({ days: 11 }), true)), []);
});

// Una semanal con inicio, programada y vencimiento: la real sale el miércoles 4 (programada), el martes 3 (inicio...)
function weeklyWithThreeDates() {
  const base = task('w', { file: 'Work/Proj/w.md', priority: 'high', due: day.plus({ days: 7 }), scheduled: day.plus({ days: 1 }) });
  base.date.start = day.minus({ days: 2 });
  base.flow = { repeat: 'every week' };
  return base;
}

test('un fantasma se dibuja solo en su fecha de referencia, no en cada una de sus fechas', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [weeklyWithThreeDates()];
  view.plugin.settings.calendarProjectionCount = 2;
  view.plugin.settings.calendarShowStartDates = true;
  await view.onOpen();

  const scheduled = day.plus({ days: 1 });
  // La referencia es la programada (4 de noviembre): los fantasmas caen una y dos semanas después
  assert.deepEqual(ids(view.getTasksForDate(scheduled.plus({ days: 7 }), true)), ['w+1']);
  assert.deepEqual(ids(view.getTasksForDate(scheduled.plus({ days: 14 }), true)), ['w+2']);
  // Ni su vencimiento ni su inicio desplazados dibujan otra copia
  assert.deepEqual(ids(view.getTasksForDate(day.plus({ days: 14 }), true)), [], 'vencimiento desplazado');
  assert.deepEqual(ids(view.getTasksForDate(day.plus({ days: 21 }), true)), [], 'vencimiento desplazado');
  assert.deepEqual(ids(view.getTasksForDate(day.plus({ days: 5 }), true)), [], 'inicio desplazado');
  assert.equal(view.getTasksForDate(scheduled.plus({ days: 7 }), true)[0].calendarDateType, 'scheduled');
});

test('si no se muestran las programadas, el fantasma se ancla a la siguiente fecha que sí se muestra', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [weeklyWithThreeDates()];
  view.plugin.settings.calendarProjectionCount = 1;
  view.plugin.settings.calendarShowScheduledDates = false;
  await view.onOpen();

  // Vencimiento real: 10 de noviembre; el fantasma, una semana después
  const [ghost] = view.getTasksForDate(day.plus({ days: 14 }), true);
  assert.equal(ghost.id, 'w+1');
  assert.equal(ghost.calendarDateType, 'due');
  assert.deepEqual(ids(view.getTasksForDate(day.plus({ days: 8 }), true)), [], 'la programada oculta no ancla nada');
});

test('desmarcar «Tareas recurrentes» en la barra oculta las proyectadas y no las tareas reales', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [...tasks, recurringTask('r')];
  view.plugin.settings.calendarProjectionCount = 3;
  await view.onOpen();
  assert.deepEqual(ids(view.getTasksForDate(nextDay, true)), ['r+1']);

  view.filterBar.options.onChange(state({ projected: 'hide' }), ['projected']);
  await settle();
  assert.deepEqual(ids(view.getTasksForDate(nextDay, true)), [], 'sin proyectadas');
  assert.ok(ids(view.getTasksForDate(day, true)).includes('r'), 'la tarea real sigue');

  view.filterBar.options.onChange(state({ projected: 'show' }), ['projected']);
  await settle();
  assert.deepEqual(ids(view.getTasksForDate(nextDay, true)), ['r+1'], 'al volver a marcarlo reaparecen');
});

test('«Tareas recurrentes» desmarcado se recuerda al abrir el calendario', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [...tasks, recurringTask('r')];
  calendarState.saveCalendarState(view.app, state({ projected: 'hide' }));
  await view.onOpen();
  assert.deepEqual(ids(view.getTasksForDate(nextDay, true)), []);
});

test('un filtro oculta los fantasmas junto a su tarea real', async () => {
  const view = loadCalendarView();
  view.loadedTasks = [...tasks, recurringTask('r', 'low')];
  calendarState.saveCalendarState(view.app, state({ priority: ['high'] }));
  await view.onOpen();
  assert.deepEqual(ids(view.getTasksForDate(nextDay, true)), []);

  view.filterBar.options.onChange(state({ priority: ['low'] }), ['priority']);
  await settle();
  assert.deepEqual(ids(view.getTasksForDate(nextDay, true)), ['r+1']);
});
