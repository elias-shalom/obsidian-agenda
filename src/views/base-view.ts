import { ItemView } from 'obsidian';
import Handlebars from 'handlebars';
import { ITask } from '../types/interfaces';

export abstract class BaseView extends ItemView {
  private pathHbs: string = '.obsidian/plugins/obsidian-agenda/templates/'; 
  private hbs: string = '.hbs'; // Extensión de los archivos de plantilla

  protected async setTasks(taskManager: any): Promise<ITask[]> {
    console.log("Actualizando tareas"); // Debugging line
    return await taskManager.getAllTasks();
  }

  protected async renderHeader(container: HTMLElement, i18n: any): Promise<void> {
    console.log("Dibuja encabezado"); // Debugging line
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
    
    // Dibujar la plantilla con los datos proporcionados
    const html = template(data);

    // Insertar el contenido HTML en el contenedor
    container.innerHTML += html;
    console.log("Plantilla:", html); // Debugging line
  }

  protected attachEventTabs(container: HTMLElement, plugin: any, leaf: any): void {
    console.log("Agregando eventos a los botones"); // Debugging line
  
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

  protected async render(viewType: string, data: any, i18n: any, plugin: any, leaf: any): Promise<void> {
    console.log(`Dibuja vista: ${viewType}`); // Debugging line
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty(); // Limpia el contenido previo    
  
    // Dibujar el encabezado
    await this.renderHeader(container, i18n);
  
    // Dibujar la plantilla principal
    await this.renderTemplate(container, viewType, data);
  
    // Agregar eventos a los botones
    this.attachEventTabs(container, plugin, leaf);
  }
}