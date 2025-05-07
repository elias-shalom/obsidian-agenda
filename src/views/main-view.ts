import { WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { console } from 'inspector';

export const MAIN_VIEW_TYPE = 'main-view';

export class MainView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private taskManager: TaskManager; // Instancia de TaskManager
  // Ruta del archivo de plantilla

  constructor(leaf: WorkspaceLeaf, private plugin: any, private i18n: I18n) {
    super(leaf);
    this.taskManager = new TaskManager(plugin.app, i18n); // Inicializa TaskManager
  }

  getViewType(): string {
    return MAIN_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("main_view_title"); // Título de la vista principal
  }

  getIcon(): string {
    return 'calendar-check';
  }

  async onOpen(): Promise<void> {
    this.tasks = await this.setTasks(this.taskManager);
    //console.log("Tareas obtenidas:", this.tasks); // Debugging line
    await this.render(MAIN_VIEW_TYPE, { tasks: this.tasks }, this.i18n, this.plugin, this.leaf);
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}