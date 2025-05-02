import { ItemView, WorkspaceLeaf } from "obsidian";
import { TaskManager } from "../core/task-manager";
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import Handlebars from 'handlebars';

export const MONTH_VIEW_TYPE = "month-view";

export class MonthView extends ItemView {
  private tasks: ITask[] = [];
  private taskManager: TaskManager;
  private i18n: I18n;

  constructor(leaf: WorkspaceLeaf, private plugin: any, i18n: I18n) {
    super(leaf);
    this.taskManager = new TaskManager(plugin.app);
    this.i18n = i18n;
  }

  getViewType(): string {
    return MONTH_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Calendario Mensual";
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

  private render(): void {
    const container = this.containerEl.children[1];
    container.empty();

    container.createEl("h2", { text: "Vista Mensual" });

    // Crear botones para cambiar entre vistas
    const buttonContainer = container.createEl('div', { cls: 'view-buttons' });

    const mainButton = buttonContainer.createEl('button', { text: 'Vista Principal' });

    mainButton.addEventListener('click', () => {
      if (this.plugin.viewManager) {       
        this.plugin.viewManager.activateView('main-view', this.leaf);
      } else {
        console.error("El plugin o viewManager no están definidos.");
      }
    });

    const weekButton = buttonContainer.createEl('button', { text: 'Vista Semanal' });
    weekButton.addEventListener('click', () => {
        this.plugin.viewManager.activateView('week-view', this.leaf);
    });

    const dayButton = buttonContainer.createEl('button', { text: 'Vista Diaria' });
    dayButton.addEventListener('click', () => {
      this.plugin.viewManager.activateView('day-view', this.leaf);
    });

    // Obtener las tareas desde TaskManager
    const taskManager = new TaskManager(this.app);
    taskManager.getAllTasks().then((tasks) => {
        const monthlyTasks = tasks.filter((task) => {
        // Filtrar tareas por el mes actual
        const dueDate = task.due ? new Date(task.due) : null;
        const now = new Date();
        return dueDate && dueDate.getMonth() === now.getMonth() && dueDate.getFullYear() === now.getFullYear();
        });

        if (monthlyTasks.length === 0) {
        container.createEl("p", { text: "No hay tareas para este mes." });
        } else {
        const ul = container.createEl("ul");
        monthlyTasks.forEach((task) => {
            ul.createEl("li", { text: `${task.title} - ${task.due}` });
        });
        }
    });
  }
}