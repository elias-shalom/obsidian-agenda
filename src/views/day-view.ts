import { ItemView, WorkspaceLeaf } from "obsidian";
import { TaskManager } from "../core/task-manager";
import { ITask } from '../types/interfaces';

export const DAY_VIEW_TYPE = "day-view";

export class DayView extends ItemView {
  private tasks: ITask[] = [];
  private taskManager: TaskManager; 

  constructor(leaf: WorkspaceLeaf, private plugin: any) {
    super(leaf);
    this.taskManager = new TaskManager(plugin.app, this.plugin.i18n, this.plugin); // Inicializa TaskManager
  }

  getViewType(): string {
    return DAY_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Calendario Diario";
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
    this.tasks = await this.taskManager.getAllTasks();
  }

  private render(): void {
    const container = this.containerEl.children[1];
    container.empty();

    container.createEl("h2", { text: "Vista Diaria" });

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

    const monthButton = buttonContainer.createEl('button', { text: 'Vista Mensual' });
    monthButton.addEventListener('click', () => {
        this.plugin.viewManager.activateView('month-view', this.leaf);
    });

    const weekButton = buttonContainer.createEl('button', { text: 'Vista semanal' });
    weekButton.addEventListener('click', () => {
      this.plugin.viewManager.activateView('week-view', this.leaf);
    });
  }
}