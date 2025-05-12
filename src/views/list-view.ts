import { App, ItemView, WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';

export const LIST_VIEW_TYPE = 'list-view';

export class ListView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private isHierarchicalView: boolean = true; // Modo predeterminado: jerárquico

  constructor(leaf: WorkspaceLeaf, private plugin: any, private i18n: I18n, private taskManager: TaskManager) {
    // Constructor de la clase ListView
    super(leaf);    
    this.i18n = i18n;
  }

  getViewType(): string {
    return LIST_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("list_view_title"); // Título de la vista lista
  }

  getIcon(): string {
    return 'calendar-check';
  }

  /**
   * Alternar entre vista jerárquica y plana
   */
  private toggleViewMode(): void {
    this.isHierarchicalView = !this.isHierarchicalView;
    this.onOpen(); // Recargar la vista con el nuevo modo
  }

  async onOpen(): Promise<void> {
    this.tasks = await this.getAllTasks(this.taskManager); // Cargar tareas

    // Siempre crear la estructura jerárquica
    const hierarchicalTasks = this.groupTasksByFolder(this.tasks);
    
    // Crear estructura plana si es necesario
    const flattenedTasks = this.isHierarchicalView ? null : this.flattenTaskHierarchy(hierarchicalTasks);
    
    // Renderizar con ambas estructuras disponibles
    await this.render(LIST_VIEW_TYPE, { 
      tasks: this.tasks, 
      groupedTasks: hierarchicalTasks,
      flattenedTasks: flattenedTasks,
      isHierarchicalView: this.isHierarchicalView
    }, this.i18n, this.plugin, this.leaf);
  }

  /**
   * Sobrescribe el método de BaseView para implementar event listeners específicos de ListView
   * @param container Contenedor donde se aplican los listeners
   * @param data Datos utilizados para renderizar la vista
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, data: any): void {
    // Implementar los listeners específicos de ListView
    const viewToggleButton = container.querySelector('.view-toggle-button');
    if (viewToggleButton) {
      viewToggleButton.addEventListener('click', () => {
        this.toggleViewMode();
      });
    }
    
    // 1. Eventos para carpetas (igual que en BaseView)
    this.addFolderToggleListeners(container);
    
    // 2. Eventos para tareas (personalizado para ListView)
    const taskItems = container.querySelectorAll('.task-item');
    
    taskItems.forEach(item => {
      // Añadir indicador visual
      item.addClass('clickable');
      
      // Evento de doble clic para abrir el archivo
      item.addEventListener('dblclick', (event) => {
        const filePath = item.getAttribute('data-file-path');
        const lineNumber = item.getAttribute('data-line-number');
        
        if (filePath) {
          this.openTaskFile(filePath, lineNumber ? parseInt(lineNumber) : undefined);
        }
      });
      
      // Evento ADICIONAL para ListView - clic simple para seleccionar
      item.addEventListener('click', (event) => {
        // Remover selección previa
        container.querySelectorAll('.task-item.selected').forEach(el => {
          el.removeClass('selected');
        });
        
        // Marcar como seleccionada
        item.addClass('selected');
        
        // Opcional: mostrar acciones para esta tarea
        //this.showTaskActions(item as HTMLElement);
      });
    });
    
    // 3. Añadir otros listeners específicos de ListView si es necesario
    // Por ejemplo, botones de filtro, ordenación, etc.
    //this.setupListViewFilters(container, data);
  }

  /**
  * Función específica para mostrar acciones en tareas seleccionadas
  */
  protected showTaskActions(taskItem: HTMLElement): void {
    const taskId = taskItem.getAttribute('data-id');
    console.log(`Mostrando acciones para tarea ${taskId}`);
    
    // Implementar la lógica para mostrar acciones (por ejemplo, un menú contextual)
    // ...
  }

  /**
   * Crea una estructura plana agrupando todas las tareas por carpeta principal
   * @param groupedTasks Estructura jerárquica de tareas
   * @returns Estructura plana con tareas agrupadas solo por carpeta principal
   */
  private flattenTaskHierarchy(groupedTasks: any): any {
    const flattenedStructure: any = {};
    
    // Función recursiva para recorrer la estructura jerárquica
    const processFolderRecursive = (folder: any, parentFolder?: string) => {
      const rootFolder = parentFolder || folder.name || 'Sin carpeta';
      
      // Inicializar la carpeta raíz si no existe
      if (!flattenedStructure[rootFolder]) {
        flattenedStructure[rootFolder] = {
          tasks: [],
          name: rootFolder,
          fullPath: rootFolder
        };
      }
      
      // Añadir tareas directas de esta carpeta a la carpeta raíz
      if (folder.tasks && folder.tasks.length > 0) {
        flattenedStructure[rootFolder].tasks.push(...folder.tasks);
      }
      
      // Procesar subcarpetas recursivamente
      if (folder.subfolders) {
        Object.values(folder.subfolders).forEach((subfolder: any) => {
          processFolderRecursive(subfolder, rootFolder);
        });
      }
    };
    
    // Iniciar el proceso para cada carpeta de nivel superior
    Object.values(groupedTasks).forEach(folder => {
      processFolderRecursive(folder as any);
    });
    
    return flattenedStructure;
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}