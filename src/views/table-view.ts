import { WorkspaceLeaf, Plugin } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, TableViewData, AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import Handlebars from 'handlebars';
import { TaskDateType } from '../types/enums';
import { EDIT_TASK_MODAL_TYPE } from '../core/modal-manager';

const TASK_CLICK_DELAY_MS = 250;
const TABLE_VIEW_STATE_KEY = 'obsidian-agenda-task-table-state';

interface TaskTableViewState {
  search: string;
  priority: string;
  status: string;
  folder: string;
  due: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

export const TABLE_VIEW_TYPE = 'table-view';

export class TableView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private currentSortColumn = 'priority'; // Columna actualmente ordenada
  private currentSortDirection: 'asc' | 'desc' = 'desc'; // Dirección de la ordenación

  constructor(leaf: WorkspaceLeaf, private plugin: Plugin, private i18n: I18n, private taskManager: TaskManager) {
    super(leaf);
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

    const uniqueFolders = [...new Set(this.tasks.map(task => task.file.root))].sort();

    await this.render(TABLE_VIEW_TYPE, { tasks: this.tasks,
    uniqueFolders: uniqueFolders }, this.i18n, this.plugin as AgendaPlugin, this.leaf);
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
    this.restoreTableState(container);

    // Implementar los event listeners para la tabla aquí
    // Por ejemplo: ordenación, filtrado, paginación, etc.
    
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
  
    // Listener para el filtro de búsqueda
    const searchInput = container.querySelector('#oa-table-search-input') as HTMLInputElement;
    const searchClearButton = container.querySelector('#oa-table-search-clear') as HTMLButtonElement;
    searchClearButton?.classList.toggle('oa-visible', Boolean(searchInput?.value));
    searchInput?.addEventListener('input', () => {
      searchClearButton?.classList.toggle('oa-visible', Boolean(searchInput.value));
      this.filterTasks(container);
    });
    
    // Listener para los filtros de dropdown
    const filterDropdowns = container.querySelectorAll('.oa-table-filter-dropdown');
    filterDropdowns.forEach(dropdown => {
      dropdown.addEventListener('change', () => {
        this.filterTasks(container);
      });
    });

    if (searchInput && searchClearButton) {
      // Limpiar el campo de búsqueda al hacer clic en el botón
      searchClearButton.addEventListener('click', () => {
        searchInput.value = '';
        searchClearButton.classList.remove('oa-visible');
        searchInput.focus(); // Opcional: mantiene el foco en el campo
        this.filterTasks(container); // Volver a aplicar filtros sin el texto
      });
      
      // Inicialmente ocultar el botón si no hay texto
      if (searchInput.value) {
        searchClearButton.classList.add('oa-visible');
      } else {
        searchClearButton.classList.remove('oa-visible');
      }
    }

    const tableRows = container.querySelectorAll('tr.oa-task-row');
  
    tableRows.forEach(row => {
      // Añadir indicador visual
      row.addClass('clickable');
      let pendingClickTimer: number | null = null;
      
      // Evento de doble clic para abrir el archivo
      row.addEventListener('dblclick', () => {
        if (pendingClickTimer !== null) {
          window.clearTimeout(pendingClickTimer);
          pendingClickTimer = null;
        }

        const filePath = row.getAttribute('data-file-path');
        const lineNumber = row.getAttribute('data-line-number');
        
        if (filePath) {
          this.openTaskFile(filePath, lineNumber ? parseInt(lineNumber) : undefined).catch(console.error);
        }
      });

      row.addEventListener('click', (event) => {
        if ((event.target as HTMLElement).closest('button, a, input, select')) return;
        if (pendingClickTimer !== null) return;

        pendingClickTimer = window.setTimeout(() => {
          pendingClickTimer = null;
          const filePath = row.getAttribute('data-file-path');
          const lineNumber = row.getAttribute('data-line-number');
          const task = this.tasks.find(candidate =>
            candidate.file.path === filePath && candidate.line.number === Number(lineNumber)
          );
          if (task) this.openEditTaskModal(task);
        }, TASK_CLICK_DELAY_MS);
      });
    });

    this.applyCurrentSort(container);
    this.filterTasks(container);
  }

  private restoreTableState(container: HTMLElement): void {
    const savedState = this.app.loadLocalStorage(TABLE_VIEW_STATE_KEY) as string | null;
    if (!savedState) return;

    try {
      const state = JSON.parse(savedState) as Partial<TaskTableViewState>;
      const searchInput = container.querySelector<HTMLInputElement>('#oa-table-search-input');
      if (typeof state.search === 'string' && searchInput) searchInput.value = state.search;

      const selectValues: Array<[string, string | undefined]> = [
        ['#oa-table-priority-filter', state.priority],
        ['#oa-table-status-filter', state.status],
        ['#oa-table-folder-filter', state.folder],
        ['#oa-table-due-filter', state.due],
      ];
      for (const [selector, value] of selectValues) {
        const select = container.querySelector<HTMLSelectElement>(selector);
        if (select && typeof value === 'string' && Array.from(select.options).some(option => option.value === value)) {
          select.value = value;
        }
      }

      const sortableColumns = ['priority', 'status', 'description', 'folder', 'file', 'due', 'tags'];
      if (state.sortColumn && sortableColumns.includes(state.sortColumn) &&
          (state.sortDirection === 'asc' || state.sortDirection === 'desc')) {
        this.currentSortColumn = state.sortColumn;
        this.currentSortDirection = state.sortDirection;
      }
    } catch (error) {
      console.error('Error al cargar el estado de la tabla de tareas:', error);
    }
  }

  private saveTableState(container: HTMLElement): void {
    const getValue = (selector: string): string =>
      container.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value || '';

    const state: TaskTableViewState = {
      search: getValue('#oa-table-search-input'),
      priority: getValue('#oa-table-priority-filter'),
      status: getValue('#oa-table-status-filter'),
      folder: getValue('#oa-table-folder-filter'),
      due: getValue('#oa-table-due-filter'),
      sortColumn: this.currentSortColumn,
      sortDirection: this.currentSortDirection,
    };
    this.app.saveLocalStorage(TABLE_VIEW_STATE_KEY, JSON.stringify(state));
  }

  private openEditTaskModal(task: ITask): void {
    const plugin = this.plugin as AgendaPlugin;
    plugin.modalManager.openModal(EDIT_TASK_MODAL_TYPE, {
      task,
      onSaved: () => this.onOpen().catch(console.error),
    });
  }

  /**
   * Normaliza un texto removiendo acentos y diacríticos
   * Convierte: "ñáéíóúü" → "naeiouu"
   */
  private normalizeText(text: string): string {
    return text
      .normalize('NFD')               // Normaliza descomponiendo caracteres
      .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos
      .toLowerCase();                  // Convierte a minúsculas
  }

  private filterTasks(container: HTMLElement): void {
    // Obtener valores de los filtros
    const searchInput = container.querySelector('#oa-table-search-input') as HTMLInputElement;
    const priorityFilter = container.querySelector('#oa-table-priority-filter') as HTMLSelectElement;
    const statusFilter = container.querySelector('#oa-table-status-filter') as HTMLSelectElement;
    const folderFilter = container.querySelector('#oa-table-folder-filter') as HTMLSelectElement;
    const dueFilter = container.querySelector('#oa-table-due-filter') as HTMLSelectElement;
    
    // Obtener los valores seleccionados
    const rawSearchText = searchInput?.value?.trim() || '';
    const normalizedSearchText = this.normalizeText(rawSearchText);
    const priorityValue = priorityFilter?.value || 'all';
    const statusValue = statusFilter?.value || 'all';
    const folderValue = folderFilter?.value || 'all';
    const dueValue = dueFilter?.value || 'all';
    
    // Obtener todas las filas de tareas
    const tableRows = container.querySelectorAll('tr.oa-task-row');
    let visibleCount = 0;
    
    // Obtener la fecha actual para los filtros de fecha
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calcular fecha de fin de semana (7 días desde hoy)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);
    
    // Aplicar filtros a cada fila
    tableRows.forEach(row => {
      let shouldShow = true;
      
      // 1. Filtro de texto (búsqueda) - ahora con normalización
      if (normalizedSearchText) {
        const taskDescription = row.querySelector('.oa-task-description')?.textContent || '';
        const normalizedDescription = this.normalizeText(taskDescription);
        
        const taskTags = Array.from(row.querySelectorAll('.oa-task-tag'))
          .map(tag => tag.textContent || '')
          .join(' ');
        const normalizedTags = this.normalizeText(taskTags);
        
        if (!normalizedDescription.includes(normalizedSearchText) && 
            !normalizedTags.includes(normalizedSearchText)) {
          shouldShow = false;
        }
      }

      // 2. Filtro por prioridad
      if (shouldShow && priorityValue !== 'all') {
        if (priorityValue === 'none') {
          // Buscar tareas sin prioridad
          const priorityElement = row.querySelector('.oa-task-priority');
          const hasPriority = !priorityElement?.classList.contains('priority-none');
          
          if (hasPriority) {
            shouldShow = false;
          }
        } else {
          // Buscar tareas con prioridad específica
          const hasPriority = row.querySelector(`.priority-${priorityValue.toLowerCase()}`);
          
          if (!hasPriority) {
            shouldShow = false;
          }
        }
      }
      
      // 3. Filtro por estado
      if (shouldShow && statusValue !== 'all') {
        const statusIcon = row.querySelector('.oa-status-icon');
        const currentStatus = statusIcon?.getAttribute('data-status') || '';
        
        if (currentStatus !== statusValue) {
          shouldShow = false;
        }
      }

      // 4. Filtro por carpeta
      if (shouldShow && folderValue !== 'all') {
        const folderName = row.querySelector('.oa-folder-name')?.textContent || '';
        
        if (folderName !== folderValue) {
          shouldShow = false;
        }
      }

      // 5. Filtro por fecha de vencimiento
      if (shouldShow && dueValue !== 'all') {
        // Verificar presencia de cualquier fecha con contenido
        const dateElements = row.querySelectorAll('.oa-task-date');
        const hasDateWithContent = Array.from(dateElements).some(el => {
          const dateText = el.querySelector('.oa-date-text')?.textContent || '';
          return dateText.trim().length > 0;
        });
        
        // Verificar los casos especiales primero
        if (dueValue === 'hasdate') {
          // Mostrar solo si tiene al menos una fecha con contenido
          if (!hasDateWithContent) {
            shouldShow = false;
          }
        } else if (dueValue === 'nodate') {
          // Mostrar solo si no tiene ninguna fecha con contenido
          if (hasDateWithContent) {
            shouldShow = false;
          }
        } else {
          // Para los demás filtros, buscar específicamente la fecha de vencimiento
          const dueDateElement = row.querySelector('.task-date.due-date');
          
          // Si no hay fecha de vencimiento, no mostrar para filtros que la requieren
          if (!dueDateElement) {
            shouldShow = false;
          } else {
            // Obtener el texto de la fecha del span con la clase 'date-text'
            const dateText = dueDateElement.querySelector('.oa-date-text')?.textContent || '';
            // Convertir a objeto Date
            const dueDate = new Date(dateText);
            
            // Verificar que es una fecha válida
            if (!isNaN(dueDate.getTime())) {
              switch (dueValue) {
                case 'overdue':
                  // Tareas vencidas (antes de hoy)
                  if (dueDate >= today) {
                    shouldShow = false;
                  }
                  break;
                  
                case 'today': {
                  // Tareas para hoy
                  const isToday = dueDate.getDate() === today.getDate() && 
                                dueDate.getMonth() === today.getMonth() && 
                                dueDate.getFullYear() === today.getFullYear();
                  if (!isToday) {
                    shouldShow = false;
                  }
                  break;
                }
                  
                case 'thisweek':
                  // Tareas para esta semana (próximos 7 días)
                  if (dueDate < today || dueDate > endOfWeek) {
                    shouldShow = false;
                  }
                  break;
                  
                case 'future':
                  // Tareas futuras (después de esta semana)
                  if (dueDate <= endOfWeek) {
                    shouldShow = false;
                  }
                  break;
              }
            } else {
              // Si no se puede parsear la fecha, no mostrar en filtros específicos
              shouldShow = false;
            }
          }
        }
      }

      // Aplicar visibilidad según resultado de filtros
      if (shouldShow) {
        row.classList.remove('oa-hidden');
        visibleCount++;
      } else {
        row.classList.add('oa-hidden');
      }
    });

    // Luego actualizar los números solo para las filas visibles
    let rowNumber = 1;
    tableRows.forEach(row => {
      if (!row.classList.contains('oa-hidden')) {
        const rowNumberElement = row.querySelector('.row-number');
        if (rowNumberElement) {
          rowNumberElement.textContent = rowNumber.toString();
          rowNumber++;
        }
      }
    });

    // Actualizar el contador total en el encabezado
    const totalRowCountElement = container.querySelector('#oa-total-row-count');
    if (totalRowCountElement) {
      totalRowCountElement.textContent = `(${visibleCount})`;
    }

    // Mostrar mensaje si no hay resultados
    const emptyMessage = container.querySelector('.oa-empty-table-message') as HTMLElement;
    if (emptyMessage) {
      if (visibleCount === 0) {
        emptyMessage.classList.add('oa-visible');
      } else {
        emptyMessage.classList.remove('oa-visible');
      }
    }

    this.saveTableState(container);
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
      { min: 44, max: 64 },
      { min: 48, max: 76 },
      { min: 48, max: 76 },
      { min: 200, max: 440 },
      { min: 100, max: 280 },
      { min: 120, max: 300 },
      { min: 150, max: 300 },
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
    
    // Si hacemos clic en la misma columna, cambiamos la dirección
    if (this.currentSortColumn === sortBy) {
      this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Si es una nueva columna, establecemos dirección ascendente por defecto
      this.currentSortColumn = sortBy;
      this.currentSortDirection = 'asc';
    }
    
    const container = header.closest('.oa-table-view-container');
    if (!container) return;
    
    // Actualizar indicadores visuales de ordenación
    this.updateSortIndicators(container);
    
    // Obtener todas las filas
    const tableBody = container.querySelector('tbody');
    if (!tableBody) return;
    
    const rows = Array.from(tableBody.querySelectorAll('tr.oa-task-row'));
    
    // Ordenar las filas
    const sortedRows = this.sortRows(rows, sortBy, this.currentSortDirection);
    
    // Eliminar las filas actuales
    rows.forEach(row => row.remove());
    
    // Añadir las filas ordenadas
    sortedRows.forEach(row => tableBody.appendChild(row));
    
    // Actualizar la numeración de filas
    this.filterTasks(container as HTMLElement);
  }

  private applyCurrentSort(container: HTMLElement): void {
    this.updateSortIndicators(container);
    const tableBody = container.querySelector('tbody');
    if (!tableBody) return;

    const rows = Array.from(tableBody.querySelectorAll('tr.oa-task-row'));
    const sortedRows = this.sortRows(rows, this.currentSortColumn, this.currentSortDirection);
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
    const activeHeader = container.querySelector(`[data-sort="${this.currentSortColumn}"]`);
    if (activeHeader) {
      activeHeader.setAttribute('aria-sort', this.currentSortDirection === 'asc' ? 'ascending' : 'descending');
      const indicator = activeHeader.querySelector('.oa-sort-indicator');
      if (indicator) {
        indicator.classList.add(this.currentSortDirection === 'asc' ? 'oa-sort-asc' : 'oa-sort-desc');
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
          
        case 'file':
          valueA = a.querySelector('.oa-file-name')?.textContent || '';
          valueB = b.querySelector('.oa-file-name')?.textContent || '';
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
