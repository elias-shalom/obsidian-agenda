// src/core/task-filter-bar.ts
// Barra de filtros compartida por las vistas de tareas (v1.1.12, Fase A/U1/U6; ver
// docs/agenda-tasks/Arquitectura técnica.md §20.3 y §23.7). Fila principal: conmutador de modo,
// botón + Filtro, agrupado y orden (si la vista los ofrece) y búsqueda a la derecha. Los filtros
// activos se muestran como chips en una segunda fila. Mismo patrón que `CalendarDatePicker`:
// `mount(root)` y un callback `onChange`.
import { Menu, setIcon } from 'obsidian';
import { ITask } from '../types/interfaces';
import { I18n } from './i18n';
import { listTaskAreas, listTaskSubAreas } from './area';
import { TaskViewState, TaskViewMode } from './task-view-state';
import {
  FILTER_CHIP_IDS, FILTER_STATE_KEYS, FilterChipId,
  clearAllFilters, clearFilterChip, getActiveFilterChips, getFilterTypeLabel, getFilterValueOptions,
} from './task-filter-chips';

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
  /** Si se pasa, la barra muestra el combo de agrupado con estos valores (incluye el de «sin agrupar»). */
  groupOptions?: FilterBarOption[];
  /** Si se pasa, la barra muestra el combo de orden con estos campos y el botón de dirección. */
  sortOptions?: FilterBarOption[];
}

/** Dónde abrir un menú: bajo el botón o el chip pulsado, medido una vez porque el chip se redibuja al elegir. */
interface MenuAnchor {
  x: number;
  y: number;
}

export class TaskFilterBar {
  private state: TaskViewState;
  private areas: string[];
  private filePaths: string[];
  private chipsEl: HTMLElement | null = null;
  private sortSelect: HTMLSelectElement | null = null;
  private sortDirectionButton: HTMLButtonElement | null = null;

  constructor(private options: TaskFilterBarOptions) {
    this.state = { ...options.state };
    this.filePaths = options.tasks.map(task => task.file.path);
    this.areas = listTaskAreas(this.filePaths);
    this.reconcileArea();
  }

  /** Estado actual, ya ajustado a las áreas que existen (un área guardada que ya no tiene tareas se reinicia). */
  getState(): TaskViewState {
    return { ...this.state };
  }

  /** Refleja en los controles de orden un cambio hecho fuera de la barra (p. ej. clic en el encabezado de una columna). */
  setSort(column: string, direction: 'asc' | 'desc'): void {
    this.state.sortColumn = column;
    this.state.sortDirection = direction;
    if (this.sortSelect) this.sortSelect.value = column;
    this.updateSortDirectionButton();
  }

  mount(root: HTMLElement): void {
    const { i18n } = this.options;
    root.empty();
    root.addClass('oa-filter-bar');

    const main = root.createDiv({ cls: 'oa-filter-bar__main' });
    this.mountModeSwitch(main);

    const addButton = main.createEl('button', { cls: 'oa-filter-bar__add', text: i18n.t('filter_add'), attr: { type: 'button' } });
    addButton.addEventListener('click', () => this.openTypeMenu(this.anchorOf(addButton)));

    const { groupOptions, sortOptions } = this.options;
    if (groupOptions) {
      this.addSelect(main, 'group_by', groupOptions, this.state.group, value => this.update({ group: value }));
    }
    if (sortOptions) {
      this.sortSelect = this.addSelect(main, 'sort_by',
        sortOptions.map(option => ({ value: option.value, label: `${i18n.t('sort_by')}: ${option.label}` })),
        this.state.sortColumn, value => this.update({ sortColumn: value }));
      this.sortDirectionButton = main.createEl('button', { cls: 'oa-filter-bar__sort-direction', attr: { type: 'button' } });
      this.sortDirectionButton.addEventListener('click', () => {
        this.update({ sortDirection: this.state.sortDirection === 'asc' ? 'desc' : 'asc' });
        this.updateSortDirectionButton();
      });
      this.updateSortDirectionButton();
    }

    this.mountSearch(main);

    this.chipsEl = root.createDiv({ cls: 'oa-filter-bar__chips' });
    this.renderChips();
  }

  private mountModeSwitch(parent: HTMLElement): void {
    const modeSwitch = this.options.modeSwitch;
    if (!modeSwitch) return;

    // Mismas clases que el selector de vista del calendario
    const group = parent.createDiv({ cls: 'oa-calendar-view-segmented', attr: { role: 'group', 'aria-label': this.options.i18n.t('tasks_view_tab') } });
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

  private addSelect(
    parent: HTMLElement,
    ariaKey: string,
    options: FilterBarOption[],
    value: string,
    onChange: (value: string) => void
  ): HTMLSelectElement {
    const select = parent.createEl('select', { cls: 'oa-filter-bar__select', attr: { 'aria-label': this.options.i18n.t(ariaKey) } });
    for (const option of options) select.createEl('option', { value: option.value, text: option.label });
    select.value = options.some(option => option.value === value) ? value : (options[0]?.value ?? '');
    select.addEventListener('change', () => onChange(select.value));
    return select;
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

      const label = chipEl.createEl('button', { cls: 'oa-filter-chip__label', text, attr: { type: 'button', title: text } });
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
    for (const id of FILTER_CHIP_IDS) {
      menu.addItem(item => item
        .setTitle(getFilterTypeLabel(id, key => this.options.i18n.t(key)))
        .setChecked(active.has(id))
        .onClick(() => this.showNext(() => this.openValueMenu(id, anchor))));
    }
    menu.showAtPosition(anchor);
  }

  private openValueMenu(id: FilterChipId, anchor: MenuAnchor): void {
    if (id === 'area') {
      this.openAreaMenu(anchor);
      return;
    }

    const menu = new Menu();
    for (const option of getFilterValueOptions(id, key => this.options.i18n.t(key))) {
      menu.addItem(item => item
        .setTitle(option.label)
        .setChecked(this.state[id] === option.value)
        .onClick(() => this.update({ [id]: option.value })));
    }
    menu.showAtPosition(anchor);
  }

  private openAreaMenu(anchor: MenuAnchor): void {
    const menu = new Menu();
    for (const area of this.areas) {
      menu.addItem(item => item
        .setTitle(area)
        .setChecked(this.state.area === area)
        .onClick(() => {
          // Otra área reinicia la sub-área; la misma vuelve a abrir el menú de sub-áreas, que es cómo se cambia
          this.update({ area, subArea: area === this.state.area ? this.state.subArea : '' });
          if (this.subAreasOf(area).length > 0) this.showNext(() => this.openSubAreaMenu(anchor));
        }));
    }
    menu.showAtPosition(anchor);
  }

  private openSubAreaMenu(anchor: MenuAnchor): void {
    const menu = new Menu();
    menu.addItem(item => item
      .setTitle(this.options.i18n.t('all_sub_areas'))
      .setChecked(!this.state.subArea)
      .onClick(() => this.update({ subArea: '' })));
    for (const path of this.subAreasOf(this.state.area)) {
      menu.addItem(item => item
        .setTitle(path)
        .setChecked(this.state.subArea === path)
        .onClick(() => this.update({ subArea: path })));
    }
    menu.showAtPosition(anchor);
  }

  private subAreasOf(area: string): string[] {
    return listTaskSubAreas(this.filePaths, area);
  }

  /** Un área o una sub-área guardadas que ya no tienen tareas se reinician. */
  private reconcileArea(): void {
    if (this.state.area && !this.areas.includes(this.state.area)) {
      this.state.area = '';
      this.state.subArea = '';
    }
    if (this.state.subArea && !this.subAreasOf(this.state.area).includes(this.state.subArea)) {
      this.state.subArea = '';
    }
  }

  private updateSortDirectionButton(): void {
    const button = this.sortDirectionButton;
    if (!button) return;
    const ascending = this.state.sortDirection === 'asc';
    const label = this.options.i18n.t(ascending ? 'sort_ascending' : 'sort_descending');
    button.setText(ascending ? '↑' : '↓');
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
  }

  /** Aplica un estado con otros filtros (quitar un chip o todos) como los cambios que lo diferencian del actual. */
  private replaceFilters(next: TaskViewState): void {
    const changes: Partial<TaskViewState> = {};
    for (const key of FILTER_STATE_KEYS) {
      if (next[key] !== this.state[key]) Object.assign(changes, { [key]: next[key] });
    }
    this.update(changes);
  }

  private update(changes: Partial<TaskViewState>): void {
    this.state = { ...this.state, ...changes };
    this.options.onChange({ ...this.state }, Object.keys(changes) as (keyof TaskViewState)[]);
    if (FILTER_STATE_KEYS.some(key => key in changes)) this.renderChips();
  }
}
