import { WorkspaceLeaf, Plugin } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, TableViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import Handlebars from 'handlebars';
import { TaskDateType } from '../types/enums';

export const TABLE_VIEW_TYPE = 'table-view';

export class TableView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private currentSortColumn: string = ''; // Columna actualmente ordenada
  private currentSortDirection: 'asc' | 'desc' = 'asc'; // Dirección de la ordenación

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
    return 'calendar-check';
  }

  async onOpen(): Promise<void> {
    this.tasks = await this.getAllTasks(this.taskManager);

    const uniqueFolders = [...new Set(this.tasks.map(task => task.file.root))].sort();

    await this.render(TABLE_VIEW_TYPE, { tasks: this.tasks,
    uniqueFolders: uniqueFolders }, this.i18n, this.plugin, this.leaf);
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
    // Implementar los event listeners para la tabla aquí
    // Por ejemplo: ordenación, filtrado, paginación, etc.
    
    // Listener para ordenar columnas
    const sortableHeaders = container.querySelectorAll('th.oa-sortable');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        this.handleColumnSort(header as HTMLElement);
      });
    });
  
    // Establecer ordenación inicial (opcional)
    // Por ejemplo, ordenar por prioridad de forma descendente por defecto
    const initialSortHeader = container.querySelector('th[data-sort="priority"]');
    if (initialSortHeader) {
      this.handleColumnSort(initialSortHeader as HTMLElement);
      // Llamar una segunda vez para ordenar descendente (tareas más importantes primero)
      this.handleColumnSort(initialSortHeader as HTMLElement);
    }
    
    // Listener para el filtro de búsqueda
    const searchInput = container.querySelector('#oa-table-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.filterTasks(container);
      });
    }
    
    // Listener para los filtros de dropdown
    const filterDropdowns = container.querySelectorAll('.oa-table-filter-dropdown');
    filterDropdowns.forEach(dropdown => {
      dropdown.addEventListener('change', () => {
        this.filterTasks(container);
      });
    });

    // Configurar el botón de limpiar búsqueda
    const searchClearButton = container.querySelector('#oa-table-search-clear') as HTMLButtonElement;

    if (searchInput && searchClearButton) {
      // Mostrar/ocultar botón según el contenido
      searchInput.addEventListener('input', () => {
        if (searchInput.value) {
          searchClearButton.classList.add('oa-visible');
        } else {
          searchClearButton.classList.remove('oa-visible');
        }
        this.filterTasks(container);
      });
      
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
      
      // Evento de doble clic para abrir el archivo
      row.addEventListener('dblclick', (_event) => {
        const filePath = row.getAttribute('data-file-path');
        const lineNumber = row.getAttribute('data-line-number');
        
        if (filePath) {
          this.openTaskFile(filePath, lineNumber ? parseInt(lineNumber) : undefined).catch(console.error);
        }
      });
    });

    // Inicializar la numeración de filas al cargar la vista
    this.filterTasks(container);
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
    
    const container = header.closest('.table-view-container');
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

  private updateSortIndicators(container: Element): void {
    // Eliminar indicadores existentes
    const allSortIndicators = container.querySelectorAll('.oa-sort-indicator');
    allSortIndicators.forEach(indicator => {
      indicator.classList.remove('oa-sort-asc', 'oa-sort-desc');
    });
    
    // Añadir indicador a la columna activa
    const activeHeader = container.querySelector(`[data-sort="${this.currentSortColumn}"]`);
    if (activeHeader) {
      const indicator = activeHeader.querySelector('.oa-sort-indicator');
      if (indicator) {
        indicator.classList.add(this.currentSortDirection === 'asc' ? 'oa-sort-asc' : 'oa-sort-desc');
      }
    }
  }

  private sortRows(rows: Element[], sortBy: string, direction: 'asc' | 'desc'): Element[] {
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
          // Para fechas, buscamos primero la fecha de vencimiento
          const dueDateElementA = a.querySelector('.task-date.due-date .date-text');
          const dueDateElementB = b.querySelector('.task-date.due-date .date-text');
          
          // Si hay fecha de vencimiento, la usamos; si no, usamos un valor extremo
          if (dueDateElementA) {
            valueA = new Date(dueDateElementA.textContent || '').getTime();
          } else {
            valueA = direction === 'asc' ? Number.MAX_SAFE_INTEGER : 0;
          }
          
          if (dueDateElementB) {
            valueB = new Date(dueDateElementB.textContent || '').getTime();
          } else {
            valueB = direction === 'asc' ? Number.MAX_SAFE_INTEGER : 0;
          }
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
