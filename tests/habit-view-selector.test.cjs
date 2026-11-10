const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const Handlebars = require('handlebars');
const { loadSource } = require('./helpers/load-source.cjs');

// Selector circular de subvistas de hábitos (v1.1.15, HU1): las cinco plantillas pintan un botón por subvista
// (`data-habit-subtype`) respetando `showHabit*Tab`, marcan la activa y ya no tienen el <select> de vista.
const { HABIT_VIEW_BUTTON_ICONS } = loadSource('habits/habit-view-icons.ts');

const hbs = Handlebars.create();
hbs.registerHelper('t', (key) => key);
hbs.registerHelper('eq', function (a, b, options) {
  if (options && typeof options.fn === 'function') return a === b ? options.fn(this) : options.inverse(this);
  return a === b;
});
// Los demás helpers solo los usan las partes de datos de cada plantilla, que aquí van vacías
hbs.registerHelper('formatDate', (value) => String(value ?? ''));
hbs.registerHelper('gt', (a, b) => a > b);
hbs.registerHelper('add', (a, b) => a + b);

const TEMPLATES = {
  dashboard: 'habit-overview-view.hbs',
  routine: 'habit-routine-view.hbs',
  weekly: 'habit-weekly-view.hbs',
  grid: 'habit-grid-view.hbs',
  table: 'habit-table-view.hbs',
};
const SETTING_BY_SUBTYPE = {
  dashboard: 'showHabitDashboardTab',
  routine: 'showHabitRoutineTab',
  weekly: 'showHabitWeeklyTab',
  grid: 'showHabitGridTab',
  table: 'showHabitListTab',
};
const SUBTYPES = Object.keys(TEMPLATES);

const source = (name) => readFileSync(path.join(__dirname, '..', 'src', 'views', 'templates', name), 'utf8');

function render(subtype, settingsOverrides = {}) {
  const settings = Object.fromEntries(Object.values(SETTING_BY_SUBTYPE).map(key => [key, true]));
  Object.assign(settings, settingsOverrides);
  const template = hbs.compile(source(TEMPLATES[subtype]));
  return template({ viewSubtype: subtype, viewLabelKey: 'x', settings, habits: [], columns: [], weekDays: [], daytimes: {}, heatmapCells: [] });
}

const buttons = (html) => [...html.matchAll(/<button[^>]*data-habit-subtype="(\w+)"[^>]*>/g)].map(match => ({ subtype: match[1], tag: match[0] }));

test('cada plantilla pinta un botón por subvista y en el mismo orden', () => {
  for (const subtype of SUBTYPES) {
    assert.deepEqual(buttons(render(subtype)).map(button => button.subtype), ['dashboard', 'routine', 'weekly', 'grid', 'table'], subtype);
  }
});

test('solo el botón de la subvista actual lleva oa-active', () => {
  for (const subtype of SUBTYPES) {
    const active = buttons(render(subtype)).filter(button => button.tag.includes('oa-active')).map(button => button.subtype);
    assert.deepEqual(active, [subtype], subtype);
  }
});

test('los botones son solo icono, con title y aria-label con la misma clave', () => {
  const html = render('grid');
  for (const { subtype, tag } of buttons(html)) {
    const key = tag.match(/title="([^"]+)"/)?.[1];
    assert.ok(key, subtype);
    assert.ok(tag.includes(`aria-label="${key}"`), subtype);
  }
  assert.match(html, /<button[^>]*data-habit-subtype="grid"[^>]*><\/button>/, 'sin texto dentro del botón');
});

test('el grupo de botones tiene rol y etiqueta accesibles y la barra ya no tiene ningún <select>', () => {
  for (const subtype of SUBTYPES) {
    const html = render(subtype);
    assert.match(html, /class="oa-calendar-view-segmented" role="group" aria-label="habit_view_tab"/, subtype);
    assert.equal(html.includes('<select'), false, subtype);
    assert.equal(html.includes('oa-habit-view-dropdown'), false, subtype);
  }
});

test('el orden y el agrupado son chips oa-axis-chip con el valor actual en el texto', () => {
  const data = { sortLabel: 'Prioridad', groupLabel: 'Área' };
  const chip = (html, id) => html.match(new RegExp(`<div class="oa-axis-chip oa-axis-chip--(\\w+)">\\s*<button[^>]*id="${id}"[^>]*>([^<]*)</button>`));

  for (const [subtype, id] of [['grid', 'oa-habit-grid-sort'], ['weekly', 'oa-habit-weekly-sort'], ['routine', 'oa-habit-routine-sort']]) {
    const html = hbs.compile(source(TEMPLATES[subtype]))({ viewSubtype: subtype, settings: {}, habits: [], columns: [], weekDays: [], daytimes: {}, ...data });
    const match = chip(html, id);
    assert.ok(match, `${subtype}: chip de orden`);
    assert.equal(match[1], 'sort');
    assert.equal(match[2], 'habit_sort_label Prioridad');
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-haspopup="menu"`));
  }

  const routine = hbs.compile(source(TEMPLATES.routine))({ viewSubtype: 'routine', settings: {}, habits: [], daytimes: {}, ...data });
  const group = chip(routine, 'oa-habit-routine-group');
  assert.ok(group, 'chip de agrupado');
  assert.deepEqual([group[1], group[2]], ['group', 'habit_group_label Área']);
});

test('los ajustes showHabit*Tab ocultan el botón de su subvista en las cinco plantillas', () => {
  for (const hidden of SUBTYPES) {
    for (const subtype of SUBTYPES) {
      const html = render(subtype, { [SETTING_BY_SUBTYPE[hidden]]: false });
      const shown = buttons(html).map(button => button.subtype);
      assert.deepEqual(shown, SUBTYPES.filter(other => other !== hidden), `${subtype} sin ${hidden}`);
    }
  }
});

test('con una sola subvista visible queda un botón y con ninguna el grupo queda vacío', () => {
  const only = (subtype) => Object.fromEntries(Object.entries(SETTING_BY_SUBTYPE).map(([key, setting]) => [setting, key === subtype]));
  assert.deepEqual(buttons(render('grid', only('grid'))).map(button => button.subtype), ['grid']);

  const none = render('grid', Object.fromEntries(Object.values(SETTING_BY_SUBTYPE).map(setting => [setting, false])));
  assert.deepEqual(buttons(none), []);
  assert.match(none, /role="group"/);
});

test('el mapa de íconos cubre exactamente las cinco subvistas con íconos distintos', () => {
  assert.deepEqual(Object.keys(HABIT_VIEW_BUTTON_ICONS).sort(), [...SUBTYPES].sort());
  assert.deepEqual(HABIT_VIEW_BUTTON_ICONS, {
    dashboard: 'layout-dashboard', routine: 'sunrise', weekly: 'calendar-check-2', grid: 'layout-grid', table: 'list-checks',
  });
  assert.equal(new Set(Object.values(HABIT_VIEW_BUTTON_ICONS)).size, SUBTYPES.length);
});

test('los textos de los botones existen en los 6 idiomas', () => {
  const keys = ['habit_view_tab', 'habit_dashboard_tab', 'habit_routine_tab', 'habit_weekly_tab', 'habit_grid_tab', 'habit_list_tab'];
  for (const locale of ['en', 'es', 'pt', 'fr', 'de', 'it']) {
    const translations = JSON.parse(readFileSync(path.join(__dirname, '..', 'src', 'locales', `${locale}.json`), 'utf8'));
    for (const key of keys) assert.ok(String(translations[key] ?? '').trim(), `${locale}.${key}`);
  }
});
