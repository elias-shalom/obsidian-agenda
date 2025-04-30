import { App, ItemView, WorkspaceLeaf } from 'obsidian';
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import Handlebars from 'handlebars';

export const MAIN_VIEW_TYPE = 'main-view';

export class MainView extends ItemView {
  private tasks: ITask[] = []; // Lista de tareas
  private taskManager: TaskManager; // Instancia de TaskManager
  private i18n: I18n;

  constructor(leaf: WorkspaceLeaf, private plugin: any, i18n: I18n) {
    super(leaf);
    this.taskManager = new TaskManager(plugin.app);
    this.i18n = i18n;
  }

  getViewType(): string {
    return MAIN_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Agenda de Tareas';
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

  // Dibuja las tareas en el contenedor
  private async render(): Promise<void> {
    console.log("Dibuja vista principal"); // Debugging line
    const container = this.containerEl.children[1]; // Contenedor principal de la vista
    container.empty(); // Limpia el contenido previo

    const templatePath = this.app.vault.adapter.getResourcePath('.obsidian/plugins/obsidian-agenda/templates/main-view.hbs');
    console.log("Ruta generada con getResourcePath:", templatePath);
    const response = await fetch(templatePath);
    
    if (!response.ok) {
      console.error("Error al cargar la plantilla:", response.statusText);
      return;
    }

    const templateSource = await response.text();
    const template = Handlebars.compile(templateSource);

    // Registrar el helper para traducciones
    Handlebars.registerHelper("t", (key: string) => this.i18n.t(key));

    // Dibujar la plantilla con datos
    const html = template({ tasks: this.tasks });

    // Insertar el contenido HTML en el contenedor
    container.innerHTML = html;

    const monthButton = container.querySelector("#month-view-button");

    monthButton?.addEventListener('click', () => {     
      console.log("Plugin cargado:", this.plugin);
      if (this.plugin.viewManager) {
        this.plugin.viewManager.activateView('month-view', this.leaf);
      } else {
        console.error("El plugin o viewManager no están definidos.");
      }
    });

    const weekButton = container.querySelector("#week-view-button");
    weekButton?.addEventListener('click', () => {
      this.plugin.viewManager.activateView('week-view', this.leaf);
    });

    const dayButton = container.querySelector("#day-view-button");
    dayButton?.addEventListener('click', () => {
      this.plugin.viewManager.activateView('day-view', this.leaf);
    });

    if (this.tasks.length === 0) {
      container.createEl("p", { text: "No hay tareas disponibles." });
    } else {
      const ul = container.createEl("ul");
      this.tasks.forEach((task) => {
        ul.createEl("li", { text: task.text });
      });
    }
  }
}