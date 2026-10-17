import { WorkspaceLeaf, Plugin } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, TableViewData, AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import Handlebars from 'handlebars';
import { TaskDateType } from '../types/enums';
import { TaskWriter } from '../core/task-writer';
import { attachTaskGestures, TASK_GESTURE_IGNORE_SELECTOR } from '../core/task-gestures';
import { TaskFilterBar } from '../core/task-filter-bar';
import { TaskViewState, DEFAULT_TASK_VIEW_STATE, loadTaskViewState, saveTaskViewState, filterTasksByViewState } from '../core/task-view-state';
import { TASK_SORT_COLUMNS } from '../core/task-column-sort';

export const TABLE_VIEW_TYPE = 'table-view';

export class TableView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private viewState: TaskViewState = { ...DEFAULT_TASK_VIEW_STATE };
  private filterBar: TaskFilterBar | null = null;
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
    this.viewState = loadTaskViewState(this.app);
    if (!TASK_SORT_COLUMNS.some(column => column.value === this.viewState.sortColumn)) {
      this.viewState.sortColumn = DEFAULT_TASK_VIEW_STATE.sortColumn;
    }

    await this.render(TABLE_VIEW_TYPE, { tasks: this.tasks }, this.i18n, this.plugin as AgendaPlugin, this.leaf);
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
    // Barra compartida: búsqueda, filtros y orden. Se monta primero porque reajusta el área guardada
    // si ya no tiene tareas, y la tabla filtra con el estado resultante.
    const toolbar = container.querySelector<HTMLElement>('.oa-table-toolbar');
    if (toolbar) {
      this.filterBar = new TaskFilterBar({
        i18n: this.i18n,
        tasks: this.tasks,
        state: this.viewState,
        sortOptions: TASK_SORT_COLUMNS.map(({ value, labelKey }) => ({ value, label: this.i18n.t(labelKey) })),
        onChange: (state) => {
          const sortChanged = state.sortColumn !== this.viewState.sortColumn || state.sortDirection !== this.viewState.sortDirection;
          this.viewState = state;
          if (sortChanged) this.applyCurrentSort(container);
          this.applyFilters(container);
        },
      });
      this.filterBar.mount(toolbar);
      this.viewState = this.filterBar.getState();
    }

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

    const tableRows = container.querySelectorAll('tr.oa-task-row');
  
    tableRows.forEach(row => {
      // Añadir indicador visual
      row.addClass('clickable');

      // Clic edita, doble clic abre el archivo y clic derecho cambia el estado (gestos compartidos).
      attachTaskGestures(row as HTMLElement, {
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

    this.applyCurrentSort(container);
    this.applyFilters(container);
  }

  private applyFilters(container: HTMLElement): void {
    const visibleIds = new Set(filterTasksByViewState(this.tasks, this.viewState).map(task => task.id));
    const tableRows = container.querySelectorAll<HTMLElement>('tr.oa-task-row');

    let visibleCount = 0;
    tableRows.forEach(row => {
      const visible = visibleIds.has(row.dataset.taskId ?? '');
      row.classList.toggle('oa-hidden', !visible);
      if (visible) {
        visibleCount += 1;
        const rowNumber = row.querySelector('.oa-row-number');
        if (rowNumber) rowNumber.textContent = String(visibleCount);
      }
    });

    const totalRowCountElement = container.querySelector('#oa-total-row-count');
    if (totalRowCountElement) {
      totalRowCountElement.textContent = `(${visibleCount})`;
    }

    container.querySelector('.oa-empty-table-message')?.classList.toggle('oa-visible', visibleCount === 0);

    saveTaskViewState(this.app, this.viewState);
    this.resizeColumns(container);
  }

  private resizeColumns(container: HTMLElement): void {
    const table = container.querySelector<HTMLTableElement>('.oa-tasks-table');
    if (!table) return;

    const canvas = container.createEl('canvas');
    const context = canvas.getContext('2d');
    canvas.remove();
    if (!context) return;

    const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'));
    const visibleRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr.oa-task-row:not(.oa-hidden)'));
    const allRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr.oa-task-row'));
    const limits = [
      { min: 44, max: 50 },
      { min: 48, max: 76 },
      { min: 48, max: 76 },
      { min: 200, max: 440 },
      { min: 100, max: 280 },
      { min: 80, max: 120 },
      { min: 96, max: 280 },
    ];

    headers.forEach((header, columnIndex) => {
      const { min, max } = limits[columnIndex] || { min: 80, max: 280 };
      let measuredWidth = 0;
      const cells = [header, ...visibleRows.map(row => row.cells.item(columnIndex)).filter((cell): cell is HTMLTableCellElement => cell !== null)];

      for (const cell of cells) {
        context.font = window.getComputedStyle(cell).font;
        const text = (cell.textContent || '').trim().replace(/\s+/g, ' ');
        measuredWidth = Math.max(measuredWidth, context.measureText(text).width);
        if (measuredWidth >= max - 28) break;
      }

      const width = Math.ceil(Math.min(max, Math.max(min, measuredWidth + 28)));
      const columnCells = [header, ...allRows.map(row => row.cells.item(columnIndex)).filter((cell): cell is HTMLTableCellElement => cell !== null)];
      columnCells.forEach(cell => cell.setCssStyles({ width: `${width}px`, minWidth: `${width}px` }));
    });
  }

  private handleColumnSort(header: HTMLElement): void {
    const sortBy = header.dataset.sort;
    if (!sortBy) return;

    // Misma columna: invierte la dirección; columna nueva: ascendente por defecto
    const direction = this.viewState.sortColumn === sortBy && this.viewState.sortDirection === 'asc' ? 'desc' : 'asc';
    this.viewState = { ...this.viewState, sortColumn: sortBy, sortDirection: direction };
    this.filterBar?.setSort(sortBy, direction);

    const container = header.closest<HTMLElement>('.oa-table-view-container');
    if (!container) return;

    this.applyCurrentSort(container);
    // Renumera las filas en el nuevo orden y guarda el estado
    this.applyFilters(container);
  }

  private applyCurrentSort(container: HTMLElement): void {
    this.updateSortIndicators(container);
    const tableBody = container.querySelector('tbody');
    if (!tableBody) return;

    const rows = Array.from(tableBody.querySelectorAll('tr.oa-task-row'));
    const sortedRows = this.sortRows(rows, this.viewState.sortColumn, this.viewState.sortDirection);
    sortedRows.forEach(row => tableBody.appendChild(row));
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

  private sortRows(rows: Element[], sortBy: string, direction: 'asc' | 'desc'): Element[] {
    const tasksByRow = new Map(
      this.tasks.map(task => [`${task.file.path}\u0000${task.line.number}`, task])
    );
    const getTaskForRow = (row: Element): ITask | undefined => {
      const filePath = row.getAttribute('data-file-path');
      const lineNumber = row.getAttribute('data-line-number');
      return filePath && lineNumber
        ? tasksByRow.get(`${filePath}\u0000${Number(lineNumber)}`)
        : undefined;
    };

    return [...rows].sort((a, b) => {
      let valueA: string | number;
      let valueB: string | number;
      
      // Extraer valores según el tipo de columna
      switch(sortBy) {
        case 'priority': {
          // Mapa de prioridades para ordenación
          const priorityMap: Record<string, number> = {
            'highest': 6, 'high': 5, 'medium': 4, 'normal': 3, 'low': 2, 'lowest': 1, 'none': 0
          };
          
          // Obtener clases de prioridad
          const priorityClassA = a.querySelector('.oa-task-priority')?.classList.toString() || '';
          const priorityClassB = b.querySelector('.oa-task-priority')?.classList.toString() || '';
          
          // Extraer el nivel de prioridad de la clase
          const priorityA = Object.keys(priorityMap).find(p => priorityClassA.includes(`priority-${p}`)) || 'none';
          const priorityB = Object.keys(priorityMap).find(p => priorityClassB.includes(`priority-${p}`)) || 'none';
          
          valueA = priorityMap[priorityA];
          valueB = priorityMap[priorityB];
          break;
        }
          
        case 'status': {
          // Mapa de estados para ordenación
          const statusMap: Record<string, number> = {
            'Todo': 4, 'InProgress': 3, 'Done': 2, 'Cancelled': 1, 'nonTask': 0
          };
          
          const statusA = a.querySelector('.oa-status-icon')?.getAttribute('data-status') || '';
          const statusB = b.querySelector('.oa-status-icon')?.getAttribute('data-status') || '';
          
          valueA = statusMap[statusA] || 0;
          valueB = statusMap[statusB] || 0;
          break;
        }
          
        case 'description':
          valueA = a.querySelector('.oa-task-description')?.textContent || '';
          valueB = b.querySelector('.oa-task-description')?.textContent || '';
          break;
          
        case 'folder':
          valueA = a.querySelector('.oa-folder-name')?.textContent || '';
          valueB = b.querySelector('.oa-folder-name')?.textContent || '';
          break;
          
        case 'due': {
          const dueDateA = getTaskForRow(a)?.date.due;
          const dueDateB = getTaskForRow(b)?.date.due;
          valueA = dueDateA?.toMillis() ?? (direction === 'asc' ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
          valueB = dueDateB?.toMillis() ?? (direction === 'asc' ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
          break;
        }
        case 'tags':
          valueA = Array.from(a.querySelectorAll('.oa-task-tag'))
            .map(tag => tag.textContent)
            .join(',') || '';
          valueB = Array.from(b.querySelectorAll('.oa-task-tag'))
            .map(tag => tag.textContent)
            .join(',') || '';
          break;
          
        default:
          valueA = '';
          valueB = '';
      }
      
      // Comparar valores
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return direction === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      } else {
        const numA = Number(valueA);
        const numB = Number(valueB);
        return direction === 'asc' 
          ? (numA - numB) 
          : (numB - numA);
      }
    });
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}
