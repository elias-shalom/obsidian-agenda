import { WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import Handlebars from 'handlebars';  // Asegúrate de importar Handlebars

export const TABLE_VIEW_TYPE = 'table-view';

export class TableView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas

  constructor(leaf: WorkspaceLeaf, private plugin: any, private i18n: I18n, private taskManager: TaskManager) {
    super(leaf);
    this.i18n = i18n;
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

    const uniqueFolders = [...new Set(this.tasks.map(task => task.rootFolder))].sort();

    await this.render(TABLE_VIEW_TYPE, { tasks: this.tasks,
    uniqueFolders: uniqueFolders }, this.i18n, this.plugin, this.leaf);
  }

  protected registerViewSpecificHelpers(i18n: any): void {
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
    
    Handlebars.registerHelper('formatDate', function(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    });
    
    // Helper para determinar si un valor está en un rango
    Handlebars.registerHelper('inRange', function(value, min, max) {
      return value >= min && value <= max;
    });
  }

  protected setupViewSpecificEventListeners(container: HTMLElement, data: any): void {
    // Implementar los event listeners para la tabla aquí
    // Por ejemplo: ordenación, filtrado, paginación, etc.
    
    // Listener para ordenar columnas
    const sortableHeaders = container.querySelectorAll('th.sortable');
    sortableHeaders.forEach(header => {
      header.addEventListener('click', () => {
        this.handleColumnSort(header as HTMLElement);
      });
    });
    
    // Listener para el filtro de búsqueda
    const searchInput = container.querySelector('#table-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.filterTasks(container);
      });
    }
    
    // Listener para los filtros de dropdown
    const filterDropdowns = container.querySelectorAll('.table-filter-dropdown');
    filterDropdowns.forEach(dropdown => {
      dropdown.addEventListener('change', () => {
        this.filterTasks(container);
      });
    });

    // Configurar el botón de limpiar búsqueda
    const searchClearButton = container.querySelector('#table-search-clear') as HTMLButtonElement;

    if (searchInput && searchClearButton) {
      // Mostrar/ocultar botón según el contenido
      searchInput.addEventListener('input', () => {
        searchClearButton.style.display = searchInput.value ? 'block' : 'none';
        this.filterTasks(container);
      });
      
      // Limpiar el campo de búsqueda al hacer clic en el botón
      searchClearButton.addEventListener('click', () => {
        searchInput.value = '';
        searchClearButton.style.display = 'none';
        searchInput.focus(); // Opcional: mantiene el foco en el campo
        this.filterTasks(container); // Volver a aplicar filtros sin el texto
      });
      
      // Inicialmente ocultar el botón si no hay texto
      searchClearButton.style.display = searchInput.value ? 'block' : 'none';
    }

    const tableRows = container.querySelectorAll('tr.task-row');
  
    tableRows.forEach(row => {
      // Añadir indicador visual
      row.addClass('clickable');
      
      // Evento de doble clic para abrir el archivo
      row.addEventListener('dblclick', (event) => {
        const filePath = row.getAttribute('data-file-path');
        const lineNumber = row.getAttribute('data-line-number');
        
        if (filePath) {
          this.openTaskFile(filePath, lineNumber ? parseInt(lineNumber) : undefined);
        }
      });
    });
  }
  
  // Métodos adicionales para la funcionalidad de la tabla
  private handleColumnSort(header: HTMLElement): void {
    // Implementar lógica de ordenación
    const sortBy = header.dataset.sort;
    // Aquí irá el código para ordenar las tareas según la columna
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
    const searchInput = container.querySelector('#table-search-input') as HTMLInputElement;
    const priorityFilter = container.querySelector('#table-priority-filter') as HTMLSelectElement;
    const statusFilter = container.querySelector('#table-status-filter') as HTMLSelectElement;
    const folderFilter = container.querySelector('#table-folder-filter') as HTMLSelectElement;
    const dueFilter = container.querySelector('#table-due-filter') as HTMLSelectElement;
    
    // Obtener los valores seleccionados
    const rawSearchText = searchInput?.value?.trim() || '';
    const normalizedSearchText = this.normalizeText(rawSearchText);
    const priorityValue = priorityFilter?.value || 'all';
    const statusValue = statusFilter?.value || 'all';
    const folderValue = folderFilter?.value || 'all';
    const dueValue = dueFilter?.value || 'all';
    
    // Obtener todas las filas de tareas
    const tableRows = container.querySelectorAll('tr.task-row');
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
        const taskDescription = row.querySelector('.task-description')?.textContent || '';
        const normalizedDescription = this.normalizeText(taskDescription);
        
        const taskTags = Array.from(row.querySelectorAll('.task-tag'))
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
          const priorityElement = row.querySelector('.task-priority');
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
        const statusIcon = row.querySelector('.status-icon');
        const currentStatus = statusIcon?.getAttribute('data-status') || '';
        
        if (currentStatus !== statusValue) {
          shouldShow = false;
        }
      }
      
      // 4. Filtro por carpeta
      if (shouldShow && folderValue !== 'all') {
        const folderName = row.querySelector('.folder-name')?.textContent || '';
        
        if (folderName !== folderValue) {
          shouldShow = false;
        }
      }
      
      // 5. Filtro por fecha de vencimiento
      if (shouldShow && dueValue !== 'all') {
        const dueDateElement = row.querySelector('.task-due-date');
        const dueDateText = dueDateElement?.getAttribute('title') || '';
        
        // Si no hay fecha y se busca algo diferente a 'nodate'
        if (!dueDateElement && dueValue !== 'nodate') {
          shouldShow = false;
        } 
        // Si se busca específicamente tareas sin fecha
        else if (dueValue === 'nodate' && dueDateElement) {
          shouldShow = false;
        }
        // Si hay fecha, procesar según el filtro
        else if (dueDateElement && dueValue !== 'nodate') {
          const dueDate = new Date(dueDateText);
          
          switch (dueValue) {
            case 'overdue':
              // Tareas vencidas (antes de hoy)
              if (dueDate >= today) {
                shouldShow = false;
              }
              break;
              
            case 'today':
              // Tareas para hoy
              const isToday = dueDate.getDate() === today.getDate() && 
                              dueDate.getMonth() === today.getMonth() && 
                              dueDate.getFullYear() === today.getFullYear();
              if (!isToday) {
                shouldShow = false;
              }
              break;
              
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
        }
      }
      
      // Aplicar visibilidad según resultado de filtros
      if (shouldShow) {
        (row as HTMLElement).style.display = '';
        visibleCount++;
      } else {
        (row as HTMLElement).style.display = 'none';
      }
    });
    
    // Mostrar mensaje si no hay resultados
    const emptyMessage = container.querySelector('.empty-table-message') as HTMLElement;
    if (emptyMessage) {
      emptyMessage.style.display = visibleCount === 0 ? 'block' : 'none';
    }
    

  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}