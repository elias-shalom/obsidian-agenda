import { WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';

export const TIMELINE_VIEW_TYPE = 'timeline-view';

export class TimelineView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private taskManager: TaskManager; // Instancia de TaskManager
  private i18n: I18n;

  constructor(leaf: WorkspaceLeaf, private plugin: any, i18n: I18n) {
    super(leaf);
    this.taskManager = new TaskManager(plugin.app, i18n, this.plugin); // Inicializa TaskManager
    this.i18n = i18n;
  }

  getViewType(): string {
    return TIMELINE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("timeline_view_title"); // Título de la vista principal
  }

  getIcon(): string {
    return 'calendar-check';
  }

  async onOpen(): Promise<void> {
    await this.setTasks(this.taskManager);
    await this.render(TIMELINE_VIEW_TYPE, { tasks: this.tasks }, this.i18n, this.plugin, this.leaf);
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}