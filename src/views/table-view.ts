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
    await this.render(TABLE_VIEW_TYPE, { tasks: this.tasks }, this.i18n, this.plugin, this.leaf);
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
    
    // Listener para checkboxes de completado
    const checkboxes = container.querySelectorAll('.task-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('click', (e) => {
        this.toggleTaskCompletion(e.currentTarget as HTMLElement);
      });
    });
  }
  
  // Métodos adicionales para la funcionalidad de la tabla
  private handleColumnSort(header: HTMLElement): void {
    // Implementar lógica de ordenación
    const sortBy = header.dataset.sort;
    // Aquí irá el código para ordenar las tareas según la columna
  }
  
  private filterTasks(container: HTMLElement): void {
    // Implementar lógica de filtrado
    // Leer los valores de los filtros y aplicarlos a las tareas
  }
  
  private toggleTaskCompletion(checkbox: HTMLElement): void {
    // Implementar lógica para marcar/desmarcar tareas como completadas
    const taskId = checkbox.dataset.taskId;
    // Actualizar el estado de la tarea en los datos y en la UI
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}