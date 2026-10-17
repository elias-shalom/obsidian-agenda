import { WorkspaceLeaf, Plugin } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, TableRow, TableViewData, TaskGroupViewModel, AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import Handlebars from 'handlebars';
import { TaskDateType } from '../types/enums';
import { TaskWriter } from '../core/task-writer';
import { attachTaskGestures, TASK_GESTURE_IGNORE_SELECTOR } from '../core/task-gestures';
import { TaskFilterBar, buildTaskModeSwitch } from '../core/task-filter-bar';
import { TaskViewState, DEFAULT_TASK_VIEW_STATE, TASK_MODE_VIEWS, loadTaskViewState, persistTaskViewState, saveTaskViewMode, filterTasksByViewState } from '../core/task-view-state';
import { TASK_SORT_COLUMNS, sortTasksByColumn } from '../core/task-column-sort';
import { TASK_GROUP_OPTIONS, groupTasksForView, toGroupViewModels } from '../core/task-grouping';

export const TABLE_VIEW_TYPE = 'table-view';

/** Agrupado que usa la Tabla cuando el usuario aún no eligió uno. */
const TABLE_DEFAULT_GROUP = 'none';

/** Ancho mínimo y máximo (px) de cada columna, en el orden de la tabla. */
const COLUMN_LIMITS = [
  { min: 44, max: 50 },
  { min: 48, max: 76 },
  { min: 48, max: 76 },
  { min: 200, max: 520 },
  { min: 80, max: 160 },
  { min: 80, max: 120 },
  { min: 96, max: 240 },
];

export class TableView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private viewState: TaskViewState = { ...DEFAULT_TASK_VIEW_STATE };
  private filterBar: TaskFilterBar | null = null;
  private content: HTMLElement | null = null;
  private taskWriter: TaskWriter;

  constructor(leaf: WorkspaceLeaf, private plugin: Plugin, private i18n: I18n, private taskManager: TaskManager) {
    super(leaf);
    this.taskWriter = new TaskWriter(this.app);
  }

  getViewType(): string {
    return TABLE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("table_view_title"); // Título de la vista lista
  }

  getIcon(): string {
    return 'table';
  }

  async onOpen(): Promise<void> {
    this.showLoadingOverlay(8, true);
    this.tasks = await this.getAllTasks(this.taskManager);

    // El estado se comparte con otras vistas de tareas: se lee al abrir y se escribe al cambiar.
    const saved = loadTaskViewState(this.app);
    if (!TASK_SORT_COLUMNS.some(column => column.value === saved.sortColumn)) {
      saved.sortColumn = DEFAULT_TASK_VIEW_STATE.sortColumn;
    }

    // La pestaña «Tareas» abre el último modo usado
    saveTaskViewMode(this.app, 'table');
    saved.mode = 'table';

    // La barra se crea antes de dibujar porque reajusta el área guardada si ya no tiene tareas.
    this.filterBar = new TaskFilterBar({
      i18n: this.i18n,
      tasks: this.tasks,
      state: { ...saved, group: saved.group || TABLE_DEFAULT_GROUP },
      modeSwitch: buildTaskModeSwitch(this.i18n, (this.plugin as AgendaPlugin).settings, 'table', (mode) => {
        saveTaskViewMode(this.app, mode);
        (this.plugin as AgendaPlugin).viewManager.activateView(TASK_MODE_VIEWS[mode], this.leaf);
      }),
      groupOptions: TASK_GROUP_OPTIONS.map(({ value, labelKey }) => ({
        value,
        label: value === 'none' ? this.i18n.t(labelKey) : `${this.i18n.t('group_by')}: ${this.i18n.t(labelKey)}`,
      })),
      sortOptions: TASK_SORT_COLUMNS.map(({ value, labelKey }) => ({ value, label: this.i18n.t(labelKey) })),
      onChange: (state, changed) => {
        this.viewState = state;
        persistTaskViewState(this.app, state, changed);
        this.refreshRows().catch(console.error);
      },
    });
    this.viewState = this.filterBar.getState();

    await this.render(TABLE_VIEW_TYPE, this.buildViewData(), this.i18n, this.plugin as AgendaPlugin, this.leaf);
  }

  /** Aplica búsqueda, filtros, orden y agrupado del estado compartido y numera las filas. */
  private buildViewData(): TableViewData {
    const sorted = sortTasksByColumn(
      filterTasksByViewState(this.tasks, this.viewState),
      this.viewState.sortColumn,
      this.viewState.sortDirection
    );
    const group = this.viewState.group || TABLE_DEFAULT_GROUP;
    const groups = toGroupViewModels(groupTasksForView(sorted, group, key => this.i18n.t(key)), group);

    const rows: TableRow[] = [];
    let number = 0;
    const addTask = (task: ITask): void => {
      number += 1;
      rows.push({ ...task, isGroup: false, number });
    };
    const addGroup = (group: TaskGroupViewModel, level: number): void => {
      rows.push({ isGroup: true, label: group.label, storageKey: group.storageKey, color: group.color, count: group.count, level });
      group.tasks.forEach(addTask);
      group.children.forEach(child => addGroup(child, level + 1));
    };

    if (groups.length === 0) sorted.forEach(addTask);
    else groups.forEach(topGroup => addGroup(topGroup, 0));

    return { tasks: sorted, rows, vaultHasTasks: this.tasks.length > 0 };
  }

  protected registerViewSpecificHelpers(_i18n: I18n): void {
    // Implementar el helper 'equals' para comparaciones en la plantilla
    Handlebars.registerHelper('equals', function(arg1, arg2) {
      return arg1 === arg2;
    });
    
    // También podemos agregar otros helpers útiles para la vista de tabla
    Handlebars.registerHelper('not', function(arg) {
      return !arg;
    });
    
    Handlebars.registerHelper('contains', function(arr, value) {
      return Array.isArray(arr) && arr.includes(value);
    });

    // Helper para determinar si un valor está en un rango
    Handlebars.registerHelper('inRange', function(value, min, max) {
      return value >= min && value <= max;
    });

    // Helper para obtener iconos de fecha del enum
    Handlebars.registerHelper('dateTypeIcon', function(dateType: string) {
      return TaskDateType[dateType as keyof typeof TaskDateType] || '';
    });
  }

  protected setupViewSpecificEventListeners(container: HTMLElement, _data: TableViewData): void {
    this.content = container;

    // Barra compartida: búsqueda, filtros, agrupado y orden
    const toolbar = container.querySelector<HTMLElement>('.oa-table-toolbar');
    if (toolbar) this.filterBar?.mount(toolbar);

    // Listener para ordenar columnas
    const sortableHeaders = container.querySelectorAll('th.oa-sortable');
    sortableHeaders.forEach(header => {
      header.setAttribute('tabindex', '0');
      header.addEventListener('click', () => {
        this.handleColumnSort(header as HTMLElement);
      });
      header.addEventListener('keydown', (event) => {
        if (!(event instanceof KeyboardEvent) || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        this.handleColumnSort(header as HTMLElement);
      });
    });

    this.wireRows(container);
  }

  /** Vuelve a dibujar solo las filas (no la barra ni el encabezado) tras un cambio de filtro, orden o agrupado. */
  private async refreshRows(): Promise<void> {
    const container = this.content;
    if (!container) return;

    const staging = createDiv();
    await this.renderTemplate(staging, TABLE_VIEW_TYPE, this.buildViewData());
    const nextBody = staging.querySelector('tbody');
    const nextEmpty = staging.querySelector('.oa-empty-table-message');
    if (!nextBody || !nextEmpty) return;

    container.querySelector('tbody')?.replaceWith(nextBody);
    container.querySelector('.oa-empty-table-message')?.replaceWith(nextEmpty);
    this.wireRows(container);
  }

  private wireRows(container: HTMLElement): void {
    this.updateSortIndicators(container);

    container.querySelectorAll<HTMLElement>('tr.oa-group-row').forEach(row => {
      const color = row.dataset.groupColor;
      if (color) row.setCssProps({ '--oa-group-color': color });

      row.toggleClass('oa-collapsed', this.app.loadLocalStorage(this.collapsedKey(row)) === 'true');
      row.addEventListener('click', () => {
        row.toggleClass('oa-collapsed', !row.hasClass('oa-collapsed'));
        this.app.saveLocalStorage(this.collapsedKey(row), String(row.hasClass('oa-collapsed')));
        this.applyCollapse(container);
      });
    });

    container.querySelectorAll<HTMLElement>('tr.oa-task-row').forEach(row => {
      // Añadir indicador visual
      row.addClass('clickable');

      // Clic edita, doble clic abre el archivo y clic derecho cambia el estado (gestos compartidos).
      attachTaskGestures(row, {
        plugin: this.plugin as AgendaPlugin,
        i18n: this.i18n,
        taskWriter: this.taskWriter,
        getTask: () => {
          const filePath = row.getAttribute('data-file-path');
          const lineNumber = Number(row.getAttribute('data-line-number'));
          return this.tasks.find(candidate => candidate.file.path === filePath && candidate.line.number === lineNumber);
        },
        onChanged: () => this.refreshView(),
        openFile: (filePath, lineNumber) => this.openTaskFile(filePath, lineNumber),
        ignoreSelector: TASK_GESTURE_IGNORE_SELECTOR,
      });
    });

    const totalRowCount = container.querySelector('#oa-total-row-count');
    if (totalRowCount) totalRowCount.textContent = `(${container.querySelectorAll('tr.oa-task-row').length})`;

    this.applyCollapse(container);
  }

  /** Misma clave que usa la Lista para recordar el plegado de un grupo. */
  private collapsedKey(groupRow: HTMLElement): string {
    return `folder_${groupRow.dataset.folderPath ?? ''}_collapsed`;
  }

  /** Oculta las filas bajo una cabecera plegada, hasta la siguiente cabecera del mismo nivel o superior. */
  private applyCollapse(container: HTMLElement): void {
    let hiddenFromLevel: number | null = null;

    container.querySelectorAll<HTMLElement>('tbody tr').forEach(row => {
      if (row.hasClass('oa-group-row')) {
        const level = Number(row.dataset.level);
        if (hiddenFromLevel !== null && level <= hiddenFromLevel) hiddenFromLevel = null;
        row.toggleClass('oa-group-hidden', hiddenFromLevel !== null);
        if (hiddenFromLevel === null && row.hasClass('oa-collapsed')) hiddenFromLevel = level;
      } else {
        row.toggleClass('oa-group-hidden', hiddenFromLevel !== null);
      }
    });

    this.resizeColumns(container);
  }

  /** Mide el contenido visible de cada columna y reparte el ancho: si no caben, las columnas se reducen en proporción sin bajar de su mínimo. */
  private resizeColumns(container: HTMLElement): void {
    const table = container.querySelector<HTMLTableElement>('.oa-tasks-table');
    if (!table) return;

    const canvas = container.createEl('canvas');
    const context = canvas.getContext('2d');
    canvas.remove();
    if (!context) return;

    const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
    const visibleRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr.oa-task-row:not(.oa-group-hidden)'));
    const allRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr.oa-task-row'));
    const limitsOf = (columnIndex: number): { min: number; max: number } => COLUMN_LIMITS[columnIndex] ?? { min: 80, max: 280 };

    // La ruta bajo la tarea se corta con puntos suspensivos: no cuenta para el ancho de la columna.
    const measurable = (cell: HTMLTableCellElement): HTMLElement[] => {
      const description = cell.querySelector<HTMLElement>('.oa-task-description');
      return description ? [description] : [cell];
    };

    const widths = headers.map((header, columnIndex) => {
      const { min, max } = limitsOf(columnIndex);
      let measuredWidth = 0;
      const cells = [header, ...visibleRows.map(row => row.cells.item(columnIndex)).filter((cell): cell is HTMLTableCellElement => cell !== null)];

      for (const cell of cells) {
        for (const element of measurable(cell)) {
          context.font = window.getComputedStyle(element).font;
          const text = (element.textContent || '').trim().replace(/\s+/g, ' ');
          measuredWidth = Math.max(measuredWidth, context.measureText(text).width);
        }
        if (measuredWidth >= max - 28) break;
      }

      return Math.ceil(Math.min(max, Math.max(min, measuredWidth + 28)));
    });

    // Ajuste al ancho real del contenedor: la ventana en escritorio y el ancho del dispositivo en tableta y teléfono.
    const available = container.querySelector<HTMLElement>('.oa-table-container')?.clientWidth ?? 0;
    const total = widths.reduce((sum, width) => sum + width, 0);
    if (available > 0 && total > available) {
      const slack = widths.map((width, columnIndex) => width - limitsOf(columnIndex).min);
      const totalSlack = slack.reduce((sum, value) => sum + value, 0);
      const shrink = totalSlack > 0 ? Math.min(1, (total - available) / totalSlack) : 0;
      widths.forEach((width, columnIndex) => {
        widths[columnIndex] = Math.floor(width - slack[columnIndex] * shrink);
      });
    }

    headers.forEach((header, columnIndex) => {
      const columnCells = [header, ...allRows.map(row => row.cells.item(columnIndex)).filter((cell): cell is HTMLTableCellElement => cell !== null)];
      columnCells.forEach(cell => cell.setCssStyles({ width: `${widths[columnIndex]}px`, minWidth: `${widths[columnIndex]}px` }));
    });
  }

  private handleColumnSort(header: HTMLElement): void {
    const sortBy = header.dataset.sort;
    if (!sortBy) return;

    // Misma columna: invierte la dirección; columna nueva: ascendente por defecto
    const direction = this.viewState.sortColumn === sortBy && this.viewState.sortDirection === 'asc' ? 'desc' : 'asc';
    this.viewState = { ...this.viewState, sortColumn: sortBy, sortDirection: direction };
    this.filterBar?.setSort(sortBy, direction);
    persistTaskViewState(this.app, this.viewState, ['sortColumn', 'sortDirection']);
    this.refreshRows().catch(console.error);
  }

  private updateSortIndicators(container: Element): void {
    // Eliminar indicadores existentes
    const allSortIndicators = container.querySelectorAll('.oa-sort-indicator');
    allSortIndicators.forEach(indicator => {
      indicator.classList.remove('oa-sort-asc', 'oa-sort-desc');
    });

    container.querySelectorAll('th[data-sort]').forEach(header => {
      header.setAttribute('aria-sort', 'none');
    });
    
    // Añadir indicador a la columna activa
    const activeHeader = container.querySelector(`[data-sort="${this.viewState.sortColumn}"]`);
    if (activeHeader) {
      activeHeader.setAttribute('aria-sort', this.viewState.sortDirection === 'asc' ? 'ascending' : 'descending');
      const indicator = activeHeader.querySelector('.oa-sort-indicator');
      if (indicator) {
        indicator.classList.add(this.viewState.sortDirection === 'asc' ? 'oa-sort-asc' : 'oa-sort-desc');
      }
    }
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}
