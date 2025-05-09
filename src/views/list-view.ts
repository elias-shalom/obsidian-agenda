import { App, ItemView, WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';

export const LIST_VIEW_TYPE = 'list-view';

export class ListView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
   // Instancia de TaskManager

  constructor(leaf: WorkspaceLeaf, private plugin: any, private i18n: I18n, private taskManager: TaskManager) {
    // Constructor de la clase ListView
    super(leaf);
    
    this.i18n = i18n;
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

  async onOpen(): Promise<void> {
    this.tasks = await this.getAllTasks(this.taskManager); // Cargar tareas

    const groupedTasks = this.groupTasksByFolder(this.tasks);

    await this.render(LIST_VIEW_TYPE, { tasks: this.tasks, groupedTasks: groupedTasks }, this.i18n, this.plugin, this.leaf);
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}