// src/core/task-filter-bar.ts
// Barra de filtros compartida por las vistas de tareas (v1.1.12, Fase A/U1; ver
// docs/agenda-tasks/Arquitectura técnica.md §20.3): búsqueda, prioridad, estado, área, sub-área y
// vencimiento, más agrupado y orden si la vista los ofrece. Mismo patrón que `CalendarDatePicker`:
// `mount(root)` y un callback `onChange`.
import { setIcon } from 'obsidian';
import { ITask } from '../types/interfaces';
import { AgendaPluginSettings } from '../settings/settings';
import { I18n } from './i18n';
import { STATUS_OPTIONS } from './task-status-options';
import { listTaskAreas, listTaskSubAreas } from './area';
import { TaskViewState, TaskViewMode } from './task-view-state';

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

/** El conmutador de Lista | Tabla, o `undefined` si los ajustes dejan un solo modo visible. */
export function buildTaskModeSwitch(
  i18n: I18n,
  settings: AgendaPluginSettings,
  current: TaskViewMode,
  onSelect: (mode: TaskViewMode) => void
): TaskModeSwitch | undefined {
  const modes: TaskModeSwitch['modes'] = [];
  if (settings.showListTab) modes.push({ value: 'list', label: i18n.t('list_view_tab'), icon: 'list-todo' });
  if (settings.showTableTab) modes.push({ value: 'table', label: i18n.t('table_view_tab'), icon: 'table' });
  return modes.length > 1 ? { current, modes, onSelect } : undefined;
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

const PRIORITY_OPTIONS: { value: string; labelKey: string; emoji: string }[] = [
  { value: 'highest', labelKey: 'highest_priority', emoji: ' 🔺' },
  { value: 'high', labelKey: 'high_priority', emoji: ' ⏫' },
  { value: 'medium', labelKey: 'medium_priority', emoji: ' 🔼' },
  { value: 'normal', labelKey: 'normal_priority', emoji: ' ▶️' },
  { value: 'low', labelKey: 'low_priority', emoji: ' 🔽' },
  { value: 'lowest', labelKey: 'lowest_priority', emoji: ' ⏬' },
  { value: 'none', labelKey: 'no_priority', emoji: '' },
];

const DUE_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'all', labelKey: 'all_dates' },
  { value: 'hasdate', labelKey: 'has_any_date' },
  { value: 'overdue', labelKey: 'overdue' },
  { value: 'today', labelKey: 'due_today' },
  { value: 'thisweek', labelKey: 'due_this_week' },
  { value: 'future', labelKey: 'future_tasks' },
  { value: 'nodate', labelKey: 'no_date' },
];

export class TaskFilterBar {
  private state: TaskViewState;
  private areas: string[];
  private subAreaSelect: HTMLSelectElement | null = null;
  private sortSelect: HTMLSelectElement | null = null;
  private sortDirectionButton: HTMLButtonElement | null = null;

  constructor(private options: TaskFilterBarOptions) {
    this.state = { ...options.state };
    const filePaths = options.tasks.map(task => task.file.path);
    this.areas = listTaskAreas(filePaths);
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

    const filters = root.createDiv({ cls: 'oa-filter-bar__filters' });

    this.mountModeSwitch(filters);

    this.addSelect(filters, 'task_priority', [
      { value: 'all', label: i18n.t('all_priorities') },
      ...PRIORITY_OPTIONS.map(({ value, labelKey, emoji }) => ({ value, label: `${i18n.t(labelKey)}${emoji}` })),
    ], this.state.priority, value => this.update({ priority: value }));

    this.addSelect(filters, 'task_status', [
      { value: 'all', label: i18n.t('all_tasks') },
      ...STATUS_OPTIONS.map(({ name, labelKey }) => ({ value: name, label: i18n.t(labelKey) })),
    ], this.state.status, value => this.update({ status: value }));

    this.addSelect(filters, 'all_areas', [
      { value: '', label: i18n.t('all_areas') },
      ...this.areas.map(area => ({ value: area, label: area })),
    ], this.state.area, value => {
      this.update({ area: value, subArea: '' });
      this.renderSubAreaOptions();
    });

    this.subAreaSelect = this.addSelect(filters, 'all_sub_areas', [], this.state.subArea,
      value => this.update({ subArea: value }));
    this.renderSubAreaOptions();

    this.addSelect(filters, 'due_date', DUE_OPTIONS.map(({ value, labelKey }) => ({ value, label: i18n.t(labelKey) })),
      this.state.due, value => this.update({ due: value }));

    const { groupOptions, sortOptions } = this.options;
    if (groupOptions) {
      this.addSelect(filters, 'group_by', groupOptions, this.state.group, value => this.update({ group: value }));
    }
    if (sortOptions) {
      this.sortSelect = this.addSelect(filters, 'sort_by',
        sortOptions.map(option => ({ value: option.value, label: `${i18n.t('sort_by')}: ${option.label}` })),
        this.state.sortColumn, value => this.update({ sortColumn: value }));
      this.sortDirectionButton = filters.createEl('button', { cls: 'oa-filter-bar__sort-direction', attr: { type: 'button' } });
      this.sortDirectionButton.addEventListener('click', () => {
        this.update({ sortDirection: this.state.sortDirection === 'asc' ? 'desc' : 'asc' });
        this.updateSortDirectionButton();
      });
      this.updateSortDirectionButton();
    }

    this.mountSearch(root);
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

  private mountSearch(root: HTMLElement): void {
    const search = root.createDiv({ cls: 'oa-filter-bar__search' });
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
    this.fillSelect(select, options, value);
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  private fillSelect(select: HTMLSelectElement, options: FilterBarOption[], value: string): void {
    select.empty();
    for (const option of options) select.createEl('option', { value: option.value, text: option.label });
    select.value = options.some(option => option.value === value) ? value : (options[0]?.value ?? '');
  }

  /** La sub-área solo se ofrece con un área elegida que tenga sub-áreas, y se reinicia al cambiar de área. */
  private renderSubAreaOptions(): void {
    const select = this.subAreaSelect;
    if (!select) return;

    const subAreas = listTaskSubAreas(this.options.tasks.map(task => task.file.path), this.state.area);
    if (this.state.subArea && !subAreas.includes(this.state.subArea)) this.state.subArea = '';

    this.fillSelect(select, [
      { value: '', label: this.options.i18n.t('all_sub_areas') },
      ...subAreas.map(path => ({ value: path, label: path })),
    ], this.state.subArea);
    select.toggleClass('oa-filter-bar__select--hidden', subAreas.length === 0);
  }

  private reconcileArea(): void {
    if (this.state.area && !this.areas.includes(this.state.area)) {
      this.state.area = '';
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

  private update(changes: Partial<TaskViewState>): void {
    this.state = { ...this.state, ...changes };
    this.options.onChange({ ...this.state }, Object.keys(changes) as (keyof TaskViewState)[]);
  }
}
