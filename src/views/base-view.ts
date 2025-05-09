import { ItemView } from 'obsidian';
import Handlebars from 'handlebars';
import { ITask } from '../types/interfaces';
import { TaskManager } from '../core/task-manager';
import { DateTime } from 'luxon';
import { TaskPriority } from '../types/enums';

export abstract class BaseView extends ItemView {
  private pathHbs: string = '.obsidian/plugins/obsidian-agenda/templates/'; 
  private hbs: string = '.hbs'; // Extensión de los archivos de plantilla

  protected async getAllTasks(taskManager: any): Promise<ITask[]> {
    //console.log("Actualizando tareas"); // Debugging line
    return await taskManager.getAllTasks();
  }

  protected async getTodayTasks(taskManager: TaskManager): Promise<ITask[]> {
    return await taskManager.getTodayTasks();
  }

  // Método para agrupar tareas por carpeta
  protected groupTasksByFolder(tasks: ITask[]): Record<string, ITask[]> {
    const groupedTasks: Record<string, ITask[]> = {};
    
    tasks.forEach(task => {
      if (!task.filePath) return;
      
      // Obtener el nombre de la carpeta principal (primera parte de la ruta)
      const pathParts = task.filePath.split('/');
      const folderName = pathParts.length > 1 ? pathParts[0] : 'Root';
      
      // Inicializar el array si no existe
      if (!groupedTasks[folderName]) {
        groupedTasks[folderName] = [];
      }
      
      // Añadir la tarea al grupo correspondiente
      groupedTasks[folderName].push(task);
    });
    
    return groupedTasks;
  }

  /// Funciones para dibujar las vistas
  ///

  protected async renderHeader(container: HTMLElement, i18n: any): Promise<void> {
    //console.log("Dibuja encabezado"); // Debugging line
    const headerPath = this.app.vault.adapter.getResourcePath(this.pathHbs + 'header.hbs');
    const headerResponse = await fetch(headerPath);

    if (!headerResponse.ok) {
      console.error("Error al cargar la plantilla del encabezado:", headerResponse.statusText);
      return;
    }

    const headerSource = await headerResponse.text();
    const headerTemplate = Handlebars.compile(headerSource);

    Handlebars.registerHelper("t", (key: string) => i18n.t(key));

    // Dibujar el encabezado
    const headerHtml = headerTemplate({});
    container.innerHTML = headerHtml;

    // Identificar la vista activa y aplicar la clase "active"
    const activeViewType = this.getViewType(); // Obtiene el tipo de vista actual
    const tabs = container.querySelectorAll(".agenda-tab");

    tabs.forEach((tab) => {
      const tabId = tab.getAttribute("id");
      if (tabId === `${activeViewType}-tab`) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    const tabContainers = container.querySelectorAll(".tab-container");

    tabContainers.forEach((buttonContainer) => {
      const divId = buttonContainer.getAttribute("id");
      if (divId === `${activeViewType}-container`) {
        buttonContainer.classList.add("active");
      } else {
        buttonContainer.classList.remove("active");
      }
    });
  }

  protected async renderTemplate(container: HTMLElement, templatePath: string, data: any): Promise<void> {
    const fullPath = this.app.vault.adapter.getResourcePath(this.pathHbs +templatePath + this.hbs);
    const response = await fetch(fullPath);

    if (!response.ok) {
      console.error("Error al cargar la plantilla:", response.statusText);
      return;
    }

    const templateSource = await response.text();
    const template = Handlebars.compile(templateSource);
    
    // Registrar helper para formatear fechas usando Luxon
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
      if (Object.values(TaskPriority).includes(priority)) {
        return priority;
      }
      
      // Si es un string que coincide con una clave del enum (case insensitive)
      const uppercasePriority = priority.toUpperCase?.() || priority;
      for (const key in TaskPriority) {
        if (key.toUpperCase() === uppercasePriority) {
          return TaskPriority[key];
        }
      }
      
      // Valor por defecto si no hay coincidencia
      return ' ';
    });

    // Dibujar la plantilla con los datos proporcionados
    const html = template(data);

    // Insertar el contenido HTML en el contenedor
    container.innerHTML += html;
    //console.log("Plantilla:", html); // Debugging line
  }

  protected attachEventTabs(container: HTMLElement, plugin: any, leaf: any): void {
    //console.log("Agregando eventos a los botones"); // Debugging line
  
    const activeViewType = this.getViewType(); // Obtiene el tipo de vista actual
    const tabs = [
      { id: "main-view-tab", view: "main-view" },
      { id: "list-view-tab", view: "list-view" },
      { id: "table-view-tab", view: "table-view" },
      { id: "calendar-view-tab", view: "calendar-view" },
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
  private addFolderToggleListeners(container: HTMLElement): void {
    const folderHeaders = container.querySelectorAll('.folder-name');

    folderHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const folderGroup = header.closest('.folder-group');
        folderGroup?.classList.toggle('collapsed');

        // Opcional: guardar estado de plegado en localStorage
        if (folderGroup) {
          const folderName = folderGroup.getAttribute('data-folder');
          if (folderName) {
            const isCollapsed = folderGroup.classList.contains('collapsed');
            localStorage.setItem(`folder_${folderName}_collapsed`, isCollapsed.toString());
          }
        }
      });
    });

    // Restaurar estado de plegado desde localStorage
    const folderGroups = container.querySelectorAll('.folder-group');
    folderGroups.forEach(group => {
      const folderName = group.getAttribute('data-folder');
      if (folderName) {
        const isCollapsed = localStorage.getItem(`folder_${folderName}_collapsed`) === 'true';
        if (isCollapsed) {
          group.classList.add('collapsed');
        }
      }
    });
  }

  protected async render(viewType: string, data: any, i18n: any, plugin: any, leaf: any): Promise<void> {
    //console.log(`Dibuja vista: ${viewType}`); // Debugging line
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty(); // Limpia el contenido previo

    // Crear estructura con header fijo y contenido con scroll
    container.addClass("agenda-container");

    // Contenedor del header (fijo)
    const headerContainer = container.createDiv({ cls: "agenda-header-container" });

    // Contenedor del contenido (scrollable)
    const contentContainer = container.createDiv({ cls: "agenda-content-container" });

    // Dibujar el encabezado
    await this.renderHeader(headerContainer, i18n);
  
    // Dibujar la plantilla principal
    await this.renderTemplate(contentContainer, viewType, data);
  
    // Agregar eventos a los botones
    this.attachEventTabs(headerContainer, plugin, leaf);

    // Añadir interactividad a los grupos de carpetas
    this.addFolderToggleListeners(contentContainer);
  }
}