import { ItemView, TFile, TFolder, Plugin } from 'obsidian';
import Handlebars from 'handlebars';
import { ITask, FolderNode, ViewData } from '../types/interfaces';
import { TaskManager } from '../core/task-manager';
import { DateTime } from 'luxon';
import { TaskPriorityIcon } from '../types/enums';
// @ts-ignore: Plugin de esbuild maneja los archivos .hbs
import headerTemplate from './templates/header.hbs';
import { I18n } from '../core/i18n';

export abstract class BaseView extends ItemView {
  private helpersRegistered = false; // Flag para verificar si los helpers ya están registrados

  protected async getAllTasks(taskManager: TaskManager): Promise<ITask[]> {
    //console.log("Actualizando tareas"); // Debugging line
    return await taskManager.getAllTasks();
  }

  protected async getTodayTasks(taskManager: TaskManager): Promise<ITask[]> {
    return await taskManager.getTodayTasks();
  }

  protected groupTasksByFolder(tasks: ITask[]): Record<string, FolderNode> {
    const rootFolders: Record<string, FolderNode> = {};
    
    tasks.forEach(task => {
      if (!task.file.path) return;
      
      // Dividir la ruta del archivo en partes
      const pathParts = task.file.path.split('/');
      
      // Si no hay partes de ruta, asignar a "Root"
      if (pathParts.length === 1) {
        if (!rootFolders['Root']) {
          rootFolders['Root'] = {
            name: 'Root',
            fullPath: 'Root',
            tasks: [],
            subfolders: {}
          };
        }
        rootFolders['Root'].tasks.push(task);
        return;
      }
      
      // Procesar la jerarquía de carpetas
      let currentLevel = rootFolders;
      let currentPath = '';
      
      // Iterar por cada nivel de carpeta (excepto el último que es el archivo)
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        
        // Para el primer nivel, crear en rootFolders si no existe
        if (i === 0) {
          if (!currentLevel[folderName]) {
            currentLevel[folderName] = {
              name: folderName,
              fullPath: folderName,
              tasks: [],
              subfolders: {}
            };
          }
          // Si es el último nivel de carpeta, añadir la tarea aquí
          if (i === pathParts.length - 2) {
            currentLevel[folderName].tasks.push(task);
          }
          currentLevel = currentLevel[folderName].subfolders;
        } 
        // Para niveles subsecuentes
        else {
          if (!currentLevel[folderName]) {
            currentLevel[folderName] = {
              name: folderName,
              fullPath: currentPath,
              tasks: [],
              subfolders: {}
            };
          }
          // Si es el último nivel de carpeta, añadir la tarea aquí
          if (i === pathParts.length - 2) {
            currentLevel[folderName].tasks.push(task);
          }
          currentLevel = currentLevel[folderName].subfolders;
        }
      }
    });
    
    return rootFolders;
  }

  /**
   * Convierte una fecha a objeto Date de JavaScript manteniendo el día correcto en la zona horaria local
   */
  protected toLocalMidnight(dateInput: any): Date | null {
    if (!dateInput) return null;
    
    try {
      let date: Date;
      
      // Si es un string, convertir directamente
      if (typeof dateInput === 'string') {
        // Crear DateTime en zona horaria local, usando startOf('day') para garantizar medianoche
        return DateTime.fromISO(dateInput).startOf('day').toJSDate();
      }
      
      // Si es un objeto Date, asegurar que sea medianoche en zona horaria local
      if (dateInput instanceof Date) {
        return DateTime.fromJSDate(dateInput).startOf('day').toJSDate();
      }
      
      // Si tiene método toJSDate(), usarlo y luego asegurar que sea medianoche local
      if (dateInput && typeof dateInput.toJSDate === 'function') {
        return DateTime.fromJSDate(dateInput.toJSDate()).startOf('day').toJSDate();
      }
      
      // Último recurso: intentar crear una fecha
      date = new Date(dateInput);
      return DateTime.fromJSDate(date).startOf('day').toJSDate();
    } catch (error) {
      console.error("Error al convertir fecha:", error, dateInput);
      return null;
    }
  }

  protected registerHandlebarsHelpers(i18n: I18n): void {
    // Si ya están registrados, no hacer nada
    if (this.helpersRegistered) return;
    
    // Registrar helpers comunes para todas las vistas
    this.registerCommonHelpers(i18n);
    
    // Registrar helpers específicos para la vista actual
    this.registerViewSpecificHelpers(i18n);
  
    this.helpersRegistered = true;
  }

  /**
   * Registra todos los helpers de Handlebars de una sola vez
   * @param i18n Servicio de internacionalización
   */
  protected registerCommonHelpers(i18n: I18n): void {
    
    // Helper para traducción
    Handlebars.registerHelper("t", (key: string) => i18n.t(key));
    
    // Helper para formatear fechas
    Handlebars.registerHelper("formatDate", function(date) {
      if (!date) return "";

      // Si es un string, convertir a objeto DateTime
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toFormat('dd MMM yyyy');
      }
      
      // Si ya es un objeto DateTime de Luxon
      if (date.isLuxonDateTime) {
        return date.toFormat('dd MMM yyyy');
      }
      
      // Si es un objeto Date de JavaScript
      if (date instanceof Date) {
        return DateTime.fromJSDate(date).toFormat('dd MMM yyyy');
      }
      
      // Fallback: intentar convertir cualquier otro formato
      return DateTime.fromISO(date.toString()).toFormat('dd MMM yyyy');
    });
    
    // Helper para convertir prioridad a ícono según el enum
    Handlebars.registerHelper("priorityIcon", function(priority) {
      if (!priority) return "";
      
      // Devolver directamente el valor del enum si existe
      if (Object.values(TaskPriorityIcon).includes(priority)) {
        return priority;
      }
      
      // Si es un string que coincide con una clave del enum (case insensitive)
      const uppercasePriority = priority.toUpperCase?.() || priority;
      for (const key in TaskPriorityIcon) {
        if (key.toUpperCase() === uppercasePriority) {
          return TaskPriorityIcon[key as keyof typeof TaskPriorityIcon];
        }
      }
      
      // Valor por defecto si no hay coincidencia
      return ' ';
    });

    // Helper para multiplicar números (útil para la sangría)
    Handlebars.registerHelper("multiply", function(a, b) {
      return a * b;
    });

    // Helper para sumar números (útil para incrementar nivel)
    Handlebars.registerHelper("add", function(a, b) {
      return a + b;
    });

  }

  /**
 * Método para registrar helpers específicos para cada vista.
 * Las clases hijas pueden sobrescribir este método para registrar sus propios helpers.
 */
  protected registerViewSpecificHelpers(_i18n: I18n): void {
    // Por defecto no registra ningún helper específico
    // Las clases hijas sobrescribirán este método según sea necesario
  }

  protected renderHeader(container: HTMLElement, data: any): void {
    console.debug("Dibuja encabezado");
    try {
      // Usar directamente la plantilla importada (ya compilada por el plugin)
      const headerHtml = headerTemplate({ data });
      
      // Usar DOMParser para convertir HTML a nodos DOM
      const parser = new DOMParser();
      const doc = parser.parseFromString(headerHtml, 'text/html');

      // Transferir cada elemento del body al contenedor usando Fragment
      // para mejorar el rendimiento
      const fragment = document.createDocumentFragment();
      Array.from(doc.body.children).forEach(element => {
        fragment.appendChild(document.importNode(element, true));
      });
    
      // Añadir todos los elementos al contenedor de una vez
      container.appendChild(fragment);

      // Identificar la vista activa y aplicar la clase "active"
      const activeViewType = this.getViewType(); // Obtiene el tipo de vista actual
      const tabs = container.querySelectorAll(".c-tab");

      tabs.forEach((tab) => {
        const tabId = tab.getAttribute("id");
        
        // Verificar coincidencia exacta o si es una vista de calendario
        const isCalendarView = activeViewType.startsWith("calendar-") && tabId === "calendar-view-tab";
        const isExactMatch = tabId === `${activeViewType}-tab`;
        
        if (isExactMatch || isCalendarView) {
          tab.classList.add("active");
        } else {
          tab.classList.remove("active");
        }
      });

      // Lo mismo para los contenedores de pestañas
      const tabContainers = container.querySelectorAll(".c-tab-container");
      tabContainers.forEach((buttonContainer) => {
        const divId = buttonContainer.getAttribute("id");
        
        const isCalendarContainer = activeViewType.startsWith("calendar-") && divId === "calendar-view-container";
        const isExactMatch = divId === `${activeViewType}-container`;
        
        if (isExactMatch || isCalendarContainer) {
          buttonContainer.classList.add("active");
        } else {
          buttonContainer.classList.remove("active");
        }
      });

    } catch (error) {
      console.error(`Error renderizando cabecera header:`, error);
      
      // Crear elemento de error usando createEl de Obsidian
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDiv = createEl('div', {
        cls: 'error',
        text: `Error al cargar la plantilla de cabecera: ${errorMessage}`
      });
      container.appendChild(errorDiv);
    }
  }

  protected async renderTemplate(container: HTMLElement, templatePath: string, data: any): Promise<void> {
    try {
      // Importar dinámicamente la plantilla Handlebars según la vista
      // @ts-ignore: Plugin de esbuild maneja los archivos .hbs
      const templateModule = await import(`./templates/${templatePath}.hbs`);
      const viewTemplate = templateModule.default;

      // Renderizar el HTML usando la plantilla importada
      const html = viewTemplate(data);

      // Usar DOMParser para convertir HTML a nodos DOM
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Transferir todos los elementos del body al contenedor
      const bodyElements = Array.from(doc.body.children);
      bodyElements.forEach(element => {
        container.appendChild(document.importNode(element, true));
      });
    } catch (error) {
      console.error(`Error renderizando template ${templatePath}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Crear elemento de error usando createEl de Obsidian
      const errorDiv = createEl('div', {
        cls: 'error',
        text: `Error al cargar la plantilla: ${errorMessage}`
      });
      container.appendChild(errorDiv);
    }
  }

  protected attachEventTabs(container: HTMLElement, plugin: any, leaf: any): void {
    //console.log("Agregando eventos a los botones"); // Debugging line
  
    const activeViewType = this.getViewType(); // Obtiene el tipo de vista actual
    const tabs = [
      { id: "overview-view-tab", view: "overview-view" },
      { id: "list-view-tab", view: "list-view" },
      { id: "table-view-tab", view: "table-view" },
      { id: "calendar-view-tab", view: "calendar-month-view" },
      { id: "timeline-view-tab", view: "timeline-view" },
      { id: "gantt-view-tab", view: "gantt-view" },
    ];
  
    tabs.forEach((tab) => {
      // Excluir el botón de la vista activa
      if (tab.view === activeViewType) {
        return;
      }
  
      const element = container.querySelector(`#${tab.id}`);
      element?.addEventListener("click", () => {
        plugin.viewManager.activateView(tab.view, leaf);
      });
    });
  }

  // Añadir método para manejar eventos de los grupos de carpetas
  protected addFolderToggleListeners(container: HTMLElement): void {
    const folderHeaders = container.querySelectorAll('.folder-name');

    folderHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const folderGroup = header.closest('.folder-group');
        folderGroup?.classList.toggle('collapsed');

        // Guardar estado de plegado usando métodos de Obsidian
        if (folderGroup) {
          const folderPath = folderGroup.getAttribute('data-folder-path');
          if (folderPath) {
            const isCollapsed = folderGroup.classList.contains('collapsed');
            this.app.saveLocalStorage(`folder_${folderPath}_collapsed`, isCollapsed.toString());
          }
        }
      });
    });

    // Restaurar estado de plegado usando métodos de Obsidian
    const folderGroups = container.querySelectorAll('.folder-group');
    folderGroups.forEach(group => {
      const folderPath = group.getAttribute('data-folder-path');
      if (folderPath) {
        const isCollapsed = this.app.loadLocalStorage(`folder_${folderPath}_collapsed`) === 'true';
        if (isCollapsed) {
          group.classList.add('collapsed');
        }
      }
    });
  }

  // Añadir método para manejar eventos de doble clic en los elementos de tarea
  protected addTaskItemClickListeners(container: HTMLElement): void {
    const taskItems = container.querySelectorAll('.task-item');
    
    taskItems.forEach(item => {
      // Agregar cursor pointer para indicar que es clickeable
      item.addClass('clickable');
      
      item.addEventListener('dblclick', (event) => {
        const filePath = item.getAttribute('data-file-path');
        const lineNumber = item.getAttribute('data-line-number');
        
        if (filePath) {
          this.openTaskFile(filePath, lineNumber ? parseInt(lineNumber) : undefined).catch(console.error);
        }
      });
    });
  }
  
  protected async openTaskFile(filePath: string, lineNumber?: number): Promise<void> {
    try {
      // Obtener el archivo desde el vault
      const file = this.app.vault.getAbstractFileByPath(filePath);
      
      if (!file || file instanceof TFolder) {
        console.error(`No se pudo encontrar el archivo: ${filePath}`);
        return;
      }
      
      // Abrir el archivo en una nueva hoja
      const leaf = this.app.workspace.getLeaf('tab');
      if (file instanceof TFile) {
        await leaf.openFile(file);
      } else {
        console.error(`El archivo no es una instancia de TFile: ${filePath}`);
        return;
      }
      
      // Si hay un número de línea, desplazarse a esa línea
      if (lineNumber !== undefined) {
        const editor = this.app.workspace.activeEditor?.editor;
        if (editor) {
          // Posicionar en la línea específica
          const position = { line: lineNumber, ch: 0 };
          editor.setCursor(position);
          editor.scrollIntoView({ from: position, to: position }, true);
        }
      }
    } catch (error) {
      console.error(`Error al abrir el archivo: ${String(error)}`);
    }
  }

  protected async render(viewType: string, data: any, i18n: I18n, plugin: Plugin, leaf: any): Promise<void> {
    console.debug(`Dibuja vista: ${viewType}`); // Debugging line
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty(); // Limpia el contenido previo

    // Crear estructura con header fijo y contenido con scroll
    container.addClass("agenda-container");

    // Contenedor del header (fijo)
    const headerContainer = container.createDiv({ cls: "agenda-header-container" });

    // Contenedor del contenido (scrollable)
    const contentContainer = container.createDiv({ cls: "agenda-content-container" });

    // Registrar helpers antes de cualquier renderizado
    this.registerHandlebarsHelpers(i18n || null);

    try {
      // Renderizar header (síncrono)
      this.renderHeader(headerContainer, { i18n: I18n });
      
      // Renderizar contenido (asíncrono)
      await this.renderTemplate(contentContainer, viewType, data);
      
      // Agregar eventos a los botones
      this.attachEventTabs(headerContainer, plugin, leaf);

      // POR un método que las clases hijas pueden sobrescribir:
      this.setupViewSpecificEventListeners(contentContainer, data);
    } catch (error) {
      console.error(`Error renderizando vista ${viewType}:`, error);
    }
  }

  /**
   * Método para configurar eventos específicos de la vista
   * Las clases hijas pueden sobrescribir este método para implementar sus propios listeners
   * @param container El contenedor donde se aplican los listeners
   * @param _data Los datos utilizados para el renderizado (puede no usarse en algunas vistas)
   */
  protected setupViewSpecificEventListeners(_container: HTMLElement, _data: ViewData): void {
    // Implementación básica que puede ser sobrescrita
    // Por defecto, no hace nada
  }
}