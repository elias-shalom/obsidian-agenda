// src/core/task-filter-bar.ts
// Barra de filtros compartida por las vistas de tareas (v1.1.12, Fase A/U1/U6; v1.1.14, Fase L2; ver
// docs/agenda-tasks/Arquitectura técnica.md §20.3, §23.7 y §29.2). Fila principal: conmutador de modo,
// búsqueda y botón + Filtro. Segunda fila: los chips `Lanes`, `Group` y `Sort` que la vista ofrece.
// Tercera fila: un chip por filtro activo. Mismo patrón que `CalendarDatePicker`: `mount(root)` y un
// callback `onChange`.
import { Menu, setIcon } from 'obsidian';
import { ITask } from '../types/interfaces';
import { I18n } from './i18n';
import { hasDirectTasks, hasRootTasks, listTaskAreas, listTaskSubAreas, reconcileAreaRoutes, toggleAreaRoute } from './area';
import { TaskViewState, TaskViewMode } from './task-view-state';
import {
  FILTER_CHIP_IDS, FILTER_STATE_KEYS, FilterChipId,
  buildAreaFilterSections, clearAllFilters, clearFilterChip, getActiveFilterChips, getFilterTypeLabel, getFilterValueOptions,
  toggleFilterValue,
} from './task-filter-chips';
import { openFilterPopover } from './task-filter-popover';
import { AxisId, buildAxisChips, pickAxisOption, toggleSortDirection } from './task-axis-chips';
import type { AxisConflictOptions } from './task-lanes';

export interface FilterBarOption {
  value: string;
  label: string;
}

/** Conmutador segmentado entre los modos de la pestaña «Tareas». */
export interface TaskModeSwitch {
  current: TaskViewMode;
  modes: { value: TaskViewMode; label: string; icon: string }[];
  onSelect: (mode: TaskViewMode) => void;
}

/** El conmutador de Lista | Tabla, siempre con los dos modos. */
export function buildTaskModeSwitch(
  i18n: I18n,
  current: TaskViewMode,
  onSelect: (mode: TaskViewMode) => void
): TaskModeSwitch {
  return {
    current,
    modes: [
      { value: 'list', label: i18n.t('list_view_tab'), icon: 'list-todo' },
      { value: 'table', label: i18n.t('table_view_tab'), icon: 'table' },
    ],
    onSelect,
  };
}

export interface TaskFilterBarOptions {
  i18n: I18n;
  /** Tareas cargadas: de ellas salen las opciones de Área y Sub-área. */
  tasks: ITask[];
  state: TaskViewState;
  onChange: (state: TaskViewState, changed: readonly (keyof TaskViewState)[]) => void;
  /** Si se pasa, la barra muestra al inicio el conmutador de modo Lista | Tabla. */
  modeSwitch?: TaskModeSwitch;
  /** Si se pasa, la barra muestra el chip `Group` con estos valores (incluye el de «sin agrupar»). */
  groupOptions?: FilterBarOption[];
  /** Si se pasa, la barra muestra el chip `Sort` con estos campos y la flecha de dirección. */
  sortOptions?: FilterBarOption[];
  /** Si se pasa, la barra muestra el chip `Lanes` con estos campos (incluye el de «Ninguno», valor vacío). */
  laneOptions?: FilterBarOption[];
  /** Cómo resuelve la vista un campo que ya usa el otro chip (Kanban lo bloquea; las demás lo cambian a Ninguno). */
  axisRules?: AxisConflictOptions;
  /** Si se pasa, el menú «+ Filtro» ofrece solo estos tipos (el calendario no ofrece los filtros de fecha relativos). */
  filterTypes?: readonly FilterChipId[];
  /**
   * Tipos de fecha que se activan con un solo clic en el primer menú (marcados con ✓), sin segundo paso: valen
   * «con fecha» (`hasdate`) o «todos». Los usa el calendario: con fecha de inicio, programada o de vencimiento.
   */
  directFilterTypes?: readonly DirectFilterType[];
}

/** Filtros de fecha que el primer menú puede activar directamente. */
export type DirectFilterType = 'start' | 'scheduled' | 'due';

/** Dónde abrir un menú: bajo el botón o el chip pulsado, medido una vez porque el chip se redibuja al elegir. */
interface MenuAnchor {
  x: number;
  y: number;
}

/** Igualdad de un valor de filtro: las listas se comparan por contenido, no por referencia. */
function sameFilterValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, index) => value === b[index]);
  return a === b;
}

/** Claves del estado que dibujan los chips `Lanes`, `Group` y `Sort`. */
const AXIS_STATE_KEYS: readonly (keyof TaskViewState)[] = ['lanes', 'group', 'sortColumn', 'sortDirection'];

export class TaskFilterBar {
  private state: TaskViewState;
  private areas: string[];
  private hasRootTasks: boolean;
  private filePaths: string[];
  private chipsEl: HTMLElement | null = null;
  private axesEl: HTMLElement | null = null;

  constructor(private options: TaskFilterBarOptions) {
    this.state = { ...options.state };
    this.filePaths = options.tasks.map(task => task.file.path);
    this.areas = listTaskAreas(this.filePaths);
    this.hasRootTasks = hasRootTasks(this.filePaths);
    this.reconcileArea();
  }

  /** Estado actual, ya ajustado a las áreas que existen (un área guardada que ya no tiene tareas se reinicia). */
  getState(): TaskViewState {
    return { ...this.state };
  }

  /** Refleja en el chip `Sort` un cambio hecho fuera de la barra (p. ej. clic en el encabezado de una columna). */
  setSort(column: string, direction: 'asc' | 'desc'): void {
    this.state.sortColumn = column;
    this.state.sortDirection = direction;
    this.renderAxes();
  }

  mount(root: HTMLElement): void {
    const { i18n } = this.options;
    root.empty();
    root.addClass('oa-filter-bar');

    const main = root.createDiv({ cls: 'oa-filter-bar__main' });
    const addButton = main.createEl('button', { cls: 'oa-filter-bar__add', text: i18n.t('filter_add'), attr: { type: 'button' } });
    addButton.addEventListener('click', () => this.openTypeMenu(this.anchorOf(addButton)));

    // Los chips Lanes, Group y Sort van junto a «+ Filtro»; sus hijos son elementos de la fila (`display: contents`)
    this.axesEl = main.createDiv({ cls: 'oa-filter-bar__axes' });
    this.renderAxes();

    // Al final de la fila, a la derecha: el conmutador Lista | Tabla (solo en esas vistas) y, pegado a él, el buscador
    this.mountModeSwitch(main);
    this.mountSearch(main);

    this.chipsEl = root.createDiv({ cls: 'oa-filter-bar__chips' });
    this.renderChips();
  }

  private mountModeSwitch(parent: HTMLElement): void {
    const modeSwitch = this.options.modeSwitch;
    if (!modeSwitch) return;

    // Mismas clases que el selector de vista del calendario; `oa-filter-bar__mode` lo lleva al borde derecho, junto al buscador
    const group = parent.createDiv({ cls: 'oa-calendar-view-segmented oa-filter-bar__mode', attr: { role: 'group', 'aria-label': this.options.i18n.t('tasks_view_tab') } });
    for (const mode of modeSwitch.modes) {
      const button = group.createEl('button', {
        cls: 'oa-calendar-view-btn',
        attr: { type: 'button', title: mode.label, 'aria-label': mode.label },
      });
      setIcon(button, mode.icon);
      button.toggleClass('oa-active', mode.value === modeSwitch.current);
      button.addEventListener('click', () => {
        if (mode.value !== modeSwitch.current) modeSwitch.onSelect(mode.value);
      });
    }
  }

  private mountSearch(parent: HTMLElement): void {
    const search = parent.createDiv({ cls: 'oa-filter-bar__search' });
    const input = search.createEl('input', {
      cls: 'oa-filter-bar__search-input',
      attr: { type: 'text', placeholder: this.options.i18n.t('search_tasks'), 'aria-label': this.options.i18n.t('search_tasks') },
    });
    const clear = search.createEl('button', { cls: 'oa-filter-bar__search-clear', text: '×', attr: { type: 'button' } });

    input.value = this.state.search;
    clear.toggleClass('oa-visible', Boolean(input.value));

    input.addEventListener('input', () => {
      clear.toggleClass('oa-visible', Boolean(input.value));
      this.update({ search: input.value });
    });
    clear.addEventListener('click', () => {
      input.value = '';
      clear.removeClass('oa-visible');
      input.focus();
      this.update({ search: '' });
    });
  }

  /** Fila de chips: uno por filtro activo, con su × y el botón Limpiar; vacía (y oculta por CSS) sin filtros. */
  private renderChips(): void {
    const container = this.chipsEl;
    if (!container) return;

    const { i18n } = this.options;
    container.empty();

    const chips = getActiveFilterChips(this.state, key => i18n.t(key));
    for (const chip of chips) {
      const chipEl = container.createDiv({ cls: 'oa-filter-chip' });
      const text = `${chip.typeLabel}: ${chip.valueLabel}`;

      const label = chipEl.createEl('button', { cls: 'oa-filter-chip__label', text, attr: { type: 'button', title: chip.title } });
      label.addEventListener('click', () => this.openValueMenu(chip.id, this.anchorOf(label)));

      const remove = chipEl.createEl('button', {
        cls: 'oa-filter-chip__remove',
        text: '×',
        attr: { type: 'button', 'aria-label': i18n.t('filter_remove', { filter: chip.typeLabel }) },
      });
      remove.addEventListener('click', () => this.replaceFilters(clearFilterChip(this.state, chip.id)));
    }

    if (chips.length > 0) {
      const clear = container.createEl('button', { cls: 'oa-filter-bar__clear', text: i18n.t('filter_clear'), attr: { type: 'button' } });
      clear.addEventListener('click', () => this.replaceFilters(clearAllFilters(this.state)));
    }
  }

  private axisInput() {
    const { groupOptions, sortOptions, laneOptions, axisRules, i18n } = this.options;
    return { state: this.state, laneOptions, groupOptions, sortOptions, rules: axisRules, translate: (key: string) => i18n.t(key) };
  }

  /** Fila de los chips `Lanes`, `Group` y `Sort`; sin ninguno que la vista ofrezca queda vacía y no se muestra. */
  private renderAxes(): void {
    const container = this.axesEl;
    if (!container) return;
    container.empty();

    for (const chip of buildAxisChips(this.axisInput())) {
      const chipEl = container.createDiv({ cls: `oa-axis-chip oa-axis-chip--${chip.id}${chip.muted ? ' oa-axis-chip--muted' : ''}` });
      const label = chipEl.createEl('button', {
        cls: 'oa-axis-chip__label',
        text: chip.text,
        attr: { type: 'button', 'aria-label': chip.ariaLabel, 'aria-haspopup': 'menu', ...(chip.tooltip ? { title: chip.tooltip } : {}) },
      });
      label.addEventListener('click', () => this.openAxisMenu(chip.id, this.anchorOf(label)));

      if (chip.direction) {
        const ascending = chip.direction === 'asc';
        const text = this.options.i18n.t(ascending ? 'sort_ascending' : 'sort_descending');
        const direction = chipEl.createEl('button', {
          cls: 'oa-axis-chip__direction',
          text: ascending ? '↑' : '↓',
          attr: { type: 'button', 'aria-label': text, title: text },
        });
        direction.addEventListener('click', () => this.update({ sortDirection: toggleSortDirection(this.state) }));
      }
    }
  }

  /** Lista directa de un chip, con el mismo menú que «+ Filtro»: elegir una opción la aplica y cierra el menú. */
  private openAxisMenu(id: AxisId, anchor: MenuAnchor): void {
    const options = buildAxisChips(this.axisInput()).find(chip => chip.id === id)?.options ?? [];
    const menu = new Menu();
    for (const option of options) {
      menu.addItem(item => item
        .setTitle(option.label)
        .setChecked(option.checked)
        .setDisabled(option.disabled)
        .onClick(() => {
          const changes = pickAxisOption({ state: this.state, rules: this.options.axisRules }, id, option.value);
          if (changes) this.update(changes);
        }));
    }
    menu.showAtPosition(anchor);
  }

  private anchorOf(element: HTMLElement): MenuAnchor {
    const rect = element.getBoundingClientRect();
    return { x: rect.left, y: rect.bottom };
  }

  /** Abre el siguiente menú de la cadena fuera del clic que cerró el anterior, que si no lo cerraría también. */
  private showNext(open: () => void): void {
    window.setTimeout(open, 0);
  }

  /** Primer paso de + Filtro: el tipo de filtro; los ya activos aparecen marcados y se editan. */
  private openTypeMenu(anchor: MenuAnchor): void {
    const active = new Set(getActiveFilterChips(this.state, key => this.options.i18n.t(key)).map(chip => chip.id));
    const menu = new Menu();
    for (const id of this.options.filterTypes ?? FILTER_CHIP_IDS) {
      // «Tareas recurrentes» (solo el calendario) va marcado por defecto y se desmarca para ocultar las proyectadas
      if (id === 'projected') {
        const shown = this.state.projected !== 'hide';
        menu.addItem(item => item
          .setTitle(getFilterTypeLabel(id, key => this.options.i18n.t(key)))
          .setChecked(shown)
          .onClick(() => this.update({ projected: shown ? 'hide' : 'show' })));
        continue;
      }
      const direct = this.isDirectType(id);
      menu.addItem(item => item
        .setTitle(getFilterTypeLabel(id, key => this.options.i18n.t(key)))
        .setChecked(active.has(id))
        // Los tipos directos se marcan y desmarcan aquí mismo; los demás abren su lista de valores
        .onClick(() => direct
          ? this.update({ [id]: active.has(id) ? 'all' : 'hasdate' })
          : this.showNext(() => this.openValueMenu(id, anchor))));
    }
    menu.showAtPosition(anchor);
  }

  private isDirectType(id: FilterChipId): id is DirectFilterType {
    return (this.options.directFilterTypes as readonly FilterChipId[] | undefined)?.includes(id) ?? false;
  }

  private openValueMenu(id: FilterChipId, anchor: MenuAnchor): void {
    // El chip «Tareas recurrentes: ocultas» solo tiene un valor: pulsarlo vuelve a mostrarlas, igual que su ×
    if (id === 'projected') {
      this.update({ projected: 'show' });
      return;
    }

    // Un filtro directo solo tiene un valor: pulsar su chip lo quita, igual que su ×
    if (this.isDirectType(id)) {
      this.update({ [id]: 'all' });
      return;
    }

    // Prioridad, estado y área aceptan varios valores: popover con casillas que no se cierra al marcar
    if (id === 'area') {
      this.openAreaPopover(anchor);
      return;
    }
    if (id === 'priority' || id === 'status') {
      this.openListPopover(id, anchor);
      return;
    }

    // Los filtros de fecha siguen con un solo valor
    const menu = new Menu();
    for (const option of getFilterValueOptions(id, key => this.options.i18n.t(key))) {
      menu.addItem(item => item
        .setTitle(option.label)
        .setChecked(this.state[id] === option.value)
        .onClick(() => this.update({ [id]: option.value })));
    }
    menu.showAtPosition(anchor);
  }

  private openListPopover(id: 'priority' | 'status', anchor: MenuAnchor): void {
    const translate = (key: string): string => this.options.i18n.t(key);
    const options = getFilterValueOptions(id, translate);
    const order = options.map(option => option.value);

    openFilterPopover({
      anchor,
      ariaLabel: getFilterTypeLabel(id, translate),
      getSections: () => [{ options: options.map(option => ({ ...option, checked: this.state[id].includes(option.value) })) }],
      onToggle: value => this.update({ [id]: toggleFilterValue(this.state[id], value, order) }),
    });
  }

  /** Dos pasos en el mismo popover: las áreas y, debajo, las sub-áreas de las áreas marcadas. */
  private openAreaPopover(anchor: MenuAnchor): void {
    const translate = (key: string): string => this.options.i18n.t(key);

    openFilterPopover({
      anchor,
      ariaLabel: getFilterTypeLabel('area', translate),
      getSections: () => buildAreaFilterSections({
        routes: this.state.areas,
        areas: this.areas,
        hasRootTasks: this.hasRootTasks,
        subAreasOf: area => this.subAreasOf(area),
        hasDirectTasks: area => hasDirectTasks(this.filePaths, area),
        translate,
      }),
      onToggle: route => this.update({ areas: toggleAreaRoute(this.state.areas, route) }),
    });
  }

  private subAreasOf(area: string): string[] {
    return listTaskSubAreas(this.filePaths, area);
  }

  /** Las rutas de área guardadas que ya no tienen tareas se descartan. */
  private reconcileArea(): void {
    this.state.areas = reconcileAreaRoutes(this.state.areas, this.filePaths);
  }

  /** Aplica un estado con otros filtros (quitar un chip o todos) como los cambios que lo diferencian del actual. */
  private replaceFilters(next: TaskViewState): void {
    const changes: Partial<TaskViewState> = {};
    for (const key of FILTER_STATE_KEYS) {
      if (!sameFilterValue(next[key], this.state[key])) Object.assign(changes, { [key]: next[key] });
    }
    this.update(changes);
  }

  private update(changes: Partial<TaskViewState>): void {
    this.state = { ...this.state, ...changes };
    this.options.onChange({ ...this.state }, Object.keys(changes) as (keyof TaskViewState)[]);
    if (FILTER_STATE_KEYS.some(key => key in changes)) this.renderChips();
    if (AXIS_STATE_KEYS.some(key => key in changes)) this.renderAxes();
  }
}
