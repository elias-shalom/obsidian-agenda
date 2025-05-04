import { ItemView, WorkspaceLeaf } from "obsidian";
import { TaskManager } from "../core/task-manager";
import { ITask } from '../types/interfaces';

export const WEEK_VIEW_TYPE = "week-view";

export class WeekView extends ItemView {
  private tasks: ITask[] = [];
  private taskManager: TaskManager; 

  constructor(leaf: WorkspaceLeaf, private plugin: any) {
    super(leaf);
    this.taskManager = new TaskManager(plugin.app);
  }

  getViewType(): string {
    return WEEK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Calendario Semanal";
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

    container.createEl("h2", { text: "Vista Semanal" });

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

    const weekButton = buttonContainer.createEl('button', { text: 'Vista Mensual' });
    weekButton.addEventListener('click', () => {
        this.plugin.viewManager.activateView('month-view', this.leaf);
    });

    const dayButton = buttonContainer.createEl('button', { text: 'Vista Diaria' });
    dayButton.addEventListener('click', () => {
      this.plugin.viewManager.activateView('day-view', this.leaf);
    });
  }
}