import { WorkspaceLeaf, Plugin } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, FolderNode, ListViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import Handlebars from 'handlebars';

export const LIST_VIEW_TYPE = 'list-view';

export class ListView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private isHierarchicalView: boolean = true; // Modo predeterminado: jerárquico

  constructor(leaf: WorkspaceLeaf, private plugin: Plugin, private i18n: I18n,private taskManager: TaskManager) {
    // Constructor de la clase ListView
    super(leaf); 
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
    this.onOpen().catch(console.error); // Recargar la vista con el nuevo modo
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

  protected registerViewSpecificHelpers(_i18n: I18n): void {
    // Helper para calcular el número total de tareas, incluyendo subcarpetas
    Handlebars.registerHelper("totalTaskCount", function(folder) {
      if (!folder) return 0;
      
  // Función recursiva para contar tareas
  function countAllTasks(folderNode: import("../types/interfaces").FolderNode) {
        // Contar tareas directas
        let count = folderNode.tasks ? folderNode.tasks.length : 0;
        
        // Contar tareas en subcarpetas
        if (folderNode.subfolders) {
          Object.values(folderNode.subfolders).forEach(subfolder => {
            count += countAllTasks(subfolder);
          });
        }
        
        return count;
      }
      
      return countAllTasks(folder as FolderNode);
    });

    // Helper para recorrer recursivamente la estructura de carpetas
    Handlebars.registerHelper("renderFolderHierarchy", function(folder: FolderNode, options: Handlebars.HelperOptions) {
      let output = '';
      if (!folder) return output;
      
      // Renderizar tareas directas de esta carpeta
      if (folder.tasks && folder.tasks.length > 0) {
        output += options.fn({ folderName: folder.name, fullPath: folder.fullPath, tasks: folder.tasks, level: 0 });
      }
      
      // Recorrer subcarpetas recursivamente
      if (folder.subfolders) {
        Object.values(folder.subfolders).forEach(subfolder => {
          output += Handlebars.helpers.renderFolderHierarchy(subfolder, options);
        });
      }
      
      return new Handlebars.SafeString(output);
    });
  }

  /**
   * Sobrescribe el método de BaseView para implementar event listeners específicos de ListView
   * @param container Contenedor donde se aplican los listeners
   * @param data Datos utilizados para renderizar la vista
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, _data: ListViewData): void {
    // Implementar los listeners específicos de ListView
    const viewToggleButton = container.querySelector('.oa-view-toggle-button');
    if (viewToggleButton) {
      viewToggleButton.addEventListener('click', () => {
        this.toggleViewMode();
      });
    }

    // 1. Eventos para carpetas (igual que en BaseView)
    this.addFolderToggleListeners(container);

    // 2. Eventos para tareas (personalizado para ListView)
    const taskItems = container.querySelectorAll('.oa-task-item');

    taskItems.forEach(item => {
      // Añadir indicador visual
      item.addClass('clickable');

      // Evento de doble clic para abrir el archivo
      item.addEventListener('dblclick', (_event) => {
        const filePath = item.getAttribute('data-file-path');
        const lineNumber = item.getAttribute('data-line-number');

        if (filePath) {
          this.openTaskFile(filePath, lineNumber ? parseInt(lineNumber) : undefined).catch(console.error);
        }
      });

      // Evento ADICIONAL para ListView - clic simple para seleccionar
      item.addEventListener('click', (_event) => {
        // Remover selección previa
        container.querySelectorAll('.oa-task-item.selected').forEach(el => {
          el.removeClass('selected');
        });

        // Marcar como seleccionada
        item.addClass('selected');

      });
    });

  }

  /**
   * Crea una estructura plana agrupando todas las tareas por carpeta principal
   * @param groupedTasks Estructura jerárquica de tareas
   * @returns Estructura plana con tareas agrupadas solo por carpeta principal
   */
  private flattenTaskHierarchy(groupedTasks: Record<string, FolderNode>): Record<string, FolderNode> {
    const flattenedStructure: Record<string, FolderNode> = {};

    // Función recursiva para recorrer la estructura jerárquica
    const processFolderRecursive = (folder: FolderNode, parentFolder?: string) => {
      const rootFolder = parentFolder || folder.name || 'Sin carpeta';

      // Inicializar la carpeta raíz si no existe
      if (!flattenedStructure[rootFolder]) {
        flattenedStructure[rootFolder] = {
          tasks: [],
          name: rootFolder,
          fullPath: rootFolder,
          subfolders: {}
        };
      }

      // Añadir tareas directas de esta carpeta a la carpeta raíz
      if (folder.tasks && folder.tasks.length > 0) {
        flattenedStructure[rootFolder].tasks.push(...folder.tasks);
      }

      // Procesar subcarpetas recursivamente
      if (folder.subfolders) {
        Object.values(folder.subfolders).forEach((subfolder: FolderNode) => {
          processFolderRecursive(subfolder, rootFolder);
        });
      }
    };

    // Iniciar el proceso para cada carpeta de nivel superior
    Object.values(groupedTasks).forEach((folder: FolderNode) => {
      processFolderRecursive(folder);
    });

    return flattenedStructure;
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}