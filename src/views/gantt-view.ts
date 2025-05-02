import { App, ItemView, WorkspaceLeaf } from 'obsidian';
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import Handlebars from 'handlebars';

export const GANTT_VIEW_TYPE = 'gantt-view';

export class GanttView extends ItemView {
  private tasks: ITask[] = []; // Lista de tareas
  private taskManager: TaskManager; // Instancia de TaskManager
  private i18n: I18n;

  constructor(leaf: WorkspaceLeaf, private plugin: any, i18n: I18n) {
    super(leaf);
    this.taskManager = new TaskManager(plugin.app);
    this.i18n = i18n;
  }

  getViewType(): string {
    return GANTT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("gantt_view_title"); // Título de la vista Gantt
  }

  getIcon(): string {
    return 'calendar-check';
  }

  async onOpen(): Promise<void> {
    await this.setTasks();
    this.render();
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }

  // Método para actualizar las tareas y dibuja la vista
  public async setTasks(): Promise<void> {
    console.log("Actualizando tareas en vista principal"); // Debugging line
    this.tasks = await this.taskManager.getAllTasks();
  }

  // Método para cargar y dibujar el encabezado
  private async renderHeader(container: HTMLElement): Promise<void> {
    console.log("Dibuja encabezado"); // Debugging line
    const headerPath = this.app.vault.adapter.getResourcePath('.obsidian/plugins/obsidian-agenda/templates/header.hbs');
    const headerResponse = await fetch(headerPath);

    if (!headerResponse.ok) {
      console.error("Error al cargar la plantilla del encabezado:", headerResponse.statusText);
      return;
    }

    const headerSource = await headerResponse.text();
    const headerTemplate = Handlebars.compile(headerSource);

    Handlebars.registerHelper("t", (key: string) => this.i18n.t(key));

    // Dibujar el encabezado
    const headerHtml = headerTemplate({});
    container.innerHTML = headerHtml;

    // Identificar la vista activa y aplicar la clase "active"
    const activeViewType = this.getViewType(); // Obtiene el tipo de vista actual
    const tabs = container.querySelectorAll(".agenda-tab"); // Selecciona todos los tabs del encabezado

    tabs.forEach((tab) => {
      const tabId = tab.getAttribute("id");
      if (tabId === `${activeViewType}-tab`) {
        tab.classList.add("active"); // Aplica la clase "active" al botón correspondiente
      } else {
        tab.classList.remove("active"); // Asegura que otros botones no tengan la clase "active"
      }
    });

    const tabContainers = container.querySelectorAll(".tab-container");

    tabContainers.forEach((buttonContainer) => {
      const divId = buttonContainer.getAttribute("id");
      if (divId === `${activeViewType}-container`) {
        buttonContainer.classList.add("active"); // Aplica la clase "active" al contenedor correspondiente
      } else {
        buttonContainer.classList.remove("active"); // Asegura que otros contenedores no tengan la clase "active"
      }
    });
  }

  // Función para cargar y dibuja la plantilla principal
  private async renderTemplate(container: HTMLElement): Promise<void> {
    const templatePath = this.app.vault.adapter.getResourcePath('.obsidian/plugins/obsidian-agenda/templates/gantt-view.hbs');
    const response = await fetch(templatePath);

    if (!response.ok) {
      console.error("Error al cargar la plantilla:", response.statusText);
      return;
    }

    const templateSource = await response.text();
    const template = Handlebars.compile(templateSource);

    // Dibujar la plantilla con datos
    const html = template({ tasks: this.tasks });

    // Insertar el contenido HTML en el contenedor
    container.innerHTML += html;
  }

  // Función para agregar eventos a los botones
  private attachEventListeners(container: HTMLElement): void {
    console.log("Agregando eventos a los botones"); // Debugging line

    const mainTab = container.querySelector("#main-view-tab");
    mainTab?.addEventListener("click", () => {
      this.plugin.viewManager.activateView("main-view", this.leaf);
    });

    const listTab = container.querySelector("#list-view-tab");
    listTab?.addEventListener("click", () => {
      this.plugin.viewManager.activateView("list-view", this.leaf);
    });

    const tableTab = container.querySelector("#table-view-tab");
    tableTab?.addEventListener("click", () => {
      this.plugin.viewManager.activateView("table-view", this.leaf);
    });

    const calendarTab = container.querySelector("#calendar-view-tab");
    calendarTab?.addEventListener("click", () => {
      this.plugin.viewManager.activateView("calendar-view", this.leaf);
    });

    const timelineTab = container.querySelector("#timeline-view-tab");
    timelineTab?.addEventListener("click", () => {
      this.plugin.viewManager.activateView("timeline-view", this.leaf);
    });
  }

  // Dibuja las tareas en el contenedor
  private async render(): Promise<void> {
    console.log("Dibuja vista principal"); // Debugging line
    const container = this.containerEl.children[1]; // Contenedor principal de la vista
    container.empty(); // Limpia el contenido previo    

    await this.renderHeader(container as HTMLElement);

      // Cargar y dibujar el contenido principal
    await this.renderTemplate(container as HTMLElement);

    // Agregar eventos a los botones
    this.attachEventListeners(container as HTMLElement);
  }
}