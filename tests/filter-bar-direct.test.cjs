const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadSource } = require('./helpers/load-source.cjs');

// Filtros de fecha directos de la barra del calendario (v1.1.15): en el primer menú de «+ Filtro» se marcan con ✓
// y valen «con fecha», sin pasar por una segunda lista de valores.

class FakeMenu {
  constructor() { this.items = []; FakeMenu.last = this; }
  addItem(build) {
    const item = {
      title: '', checked: false, disabled: false, click: null,
      setTitle(value) { this.title = value; return this; },
      setChecked(value) { this.checked = Boolean(value); return this; },
      setDisabled(value) { this.disabled = Boolean(value); return this; },
      onClick(callback) { this.click = callback; return this; },
    };
    build(item);
    this.items.push(item);
    return this;
  }
  showAtPosition() {}
}

const { TaskFilterBar } = loadSource('core/task-filter-bar.ts', { obsidian: { Menu: FakeMenu, setIcon() {} } });
const { CALENDAR_FILTER_TYPES, CALENDAR_DIRECT_FILTER_TYPES, parseCalendarState } = loadSource('core/calendar-state.ts');

const i18n = { t: (key) => key };

function makeBar(options = {}) {
  const changes = [];
  const bar = new TaskFilterBar({
    i18n,
    tasks: [],
    state: parseCalendarState({}),
    onChange: (state, changed) => changes.push({ state, changed: [...changed] }),
    ...options,
  });
  return { bar, changes };
}

const calendarBar = () => makeBar({ filterTypes: CALENDAR_FILTER_TYPES, directFilterTypes: CALENDAR_DIRECT_FILTER_TYPES });
const openTypeMenu = (bar) => { bar.openTypeMenu({ x: 0, y: 0 }); return FakeMenu.last.items; };

test('el primer menú del calendario ofrece siete tipos: los de fecha y, al final, «Tareas recurrentes»', () => {
  const { bar } = calendarBar();
  const items = openTypeMenu(bar);
  assert.equal(items.length, 7);
  assert.equal(items[6].title, 'filter_recurring_tasks');
});

test('pulsar un tipo de fecha directo lo activa con «con fecha» y lo marca con ✓', () => {
  const { bar, changes } = calendarBar();
  const items = openTypeMenu(bar);
  const dateItems = items.slice(3, 6);
  assert.equal(dateItems.every(item => !item.checked), true);

  dateItems[1].click();
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0].changed, ['scheduled']);
  assert.equal(changes[0].state.scheduled, 'hasdate');
  assert.equal(bar.getState().scheduled, 'hasdate');

  const reopened = openTypeMenu(bar).slice(3, 6);
  assert.deepEqual(reopened.map(item => item.checked), [false, true, false]);
});

test('volver a pulsarlo lo desactiva', () => {
  const { bar, changes } = calendarBar();
  openTypeMenu(bar)[5].click(); // vencimiento
  assert.equal(bar.getState().due, 'hasdate');
  openTypeMenu(bar)[5].click();
  assert.equal(bar.getState().due, 'all');
  assert.deepEqual(changes.map(change => change.state.due), ['hasdate', 'all']);
});

test('cada tipo directo es independiente y se pueden marcar varios', () => {
  const { bar } = calendarBar();
  openTypeMenu(bar)[3].click();
  openTypeMenu(bar)[5].click();
  const state = bar.getState();
  assert.deepEqual([state.start, state.scheduled, state.due], ['hasdate', 'all', 'hasdate']);
});

test('pulsar un tipo directo no abre un segundo menú', () => {
  const queued = [];
  global.window = { setTimeout: (callback) => queued.push(callback) };
  try {
    const { bar } = calendarBar();
    openTypeMenu(bar)[4].click();
    assert.equal(queued.length, 0, 'sin segundo paso');
  } finally {
    delete global.window;
  }
});

test('el chip de un filtro directo se quita al pulsarlo', () => {
  const { bar } = calendarBar();
  openTypeMenu(bar)[4].click();
  assert.equal(bar.getState().scheduled, 'hasdate');
  bar.openValueMenu('scheduled', { x: 0, y: 0 });
  assert.equal(bar.getState().scheduled, 'all');
});

test('sin tipos directos (Lista, Tabla, Gantt) los de fecha siguen abriendo su lista de valores', () => {
  const queued = [];
  global.window = { setTimeout: (callback) => queued.push(callback) };
  try {
    const { bar, changes } = makeBar();
    const items = openTypeMenu(bar);
    assert.equal(items.length, 6, 'Lista, Tabla y Gantt no ofrecen «Tareas recurrentes»');
    items[4].click();
    assert.equal(changes.length, 0, 'no cambia ningún filtro todavía');
    assert.equal(queued.length, 1, 'se encola el segundo menú');
  } finally {
    delete global.window;
  }
});

// --- «Tareas recurrentes» (v1.1.15): marcado por defecto, se desmarca para ocultar las proyectadas -------

const { getActiveFilterChips, clearFilterChip, clearAllFilters } = loadSource('core/task-filter-chips.ts', { obsidian: { Menu: FakeMenu, setIcon() {} } });

test('«Tareas recurrentes» está marcado por defecto y no tiene chip', () => {
  const { bar } = calendarBar();
  assert.equal(bar.getState().projected, 'show');
  assert.equal(openTypeMenu(bar)[6].checked, true);
  assert.deepEqual(getActiveFilterChips(bar.getState(), i18n.t), []);
});

test('desmarcarlo oculta las proyectadas y muestra un chip; volver a marcarlo las devuelve', () => {
  const { bar, changes } = calendarBar();
  openTypeMenu(bar)[6].click();
  assert.equal(bar.getState().projected, 'hide');
  assert.deepEqual(changes[0].changed, ['projected']);
  assert.equal(openTypeMenu(bar)[6].checked, false);

  const [chip] = getActiveFilterChips(bar.getState(), i18n.t);
  assert.deepEqual([chip.id, chip.typeLabel, chip.valueLabel], ['projected', 'filter_recurring_tasks', 'filter_recurring_hidden']);

  openTypeMenu(bar)[6].click();
  assert.equal(bar.getState().projected, 'show');
});

test('el chip «Tareas recurrentes: ocultas» se quita al pulsarlo', () => {
  const { bar } = calendarBar();
  openTypeMenu(bar)[6].click();
  bar.openValueMenu('projected', { x: 0, y: 0 });
  assert.equal(bar.getState().projected, 'show');
});

test('Limpiar y la × devuelven «Tareas recurrentes» a mostrar', () => {
  const hidden = { ...parseCalendarState({}), projected: 'hide' };
  assert.equal(clearFilterChip(hidden, 'projected').projected, 'show');
  assert.equal(clearAllFilters(hidden).projected, 'show');
});

test('el estado del calendario conserva «ocultas» y cualquier otro valor vuelve a mostrar', () => {
  assert.equal(parseCalendarState({ projected: 'hide' }).projected, 'hide');
  assert.equal(parseCalendarState({ projected: 'otra cosa' }).projected, 'show');
  assert.equal(parseCalendarState({}).projected, 'show');
});
