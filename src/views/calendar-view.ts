import { WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';

export const CALENDAR_VIEW_TYPE = 'calendar-view';

export class CalendarView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private taskManager: TaskManager; // Instancia de TaskManager

  constructor(leaf: WorkspaceLeaf, private plugin: any, private i18n: I18n) {
    super(leaf);
    this.taskManager = new TaskManager(plugin.app);
  }

  getViewType(): string {
    return CALENDAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("calendar_view_title"); // Título de la vista principal
  }

  getIcon(): string {
    return 'calendar-check';
  }

  async onOpen(): Promise<void> {
    await this.setTasks(this.taskManager);
    await this.render(CALENDAR_VIEW_TYPE, { tasks: this.tasks }, this.i18n, this.plugin, this.leaf);
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }


}