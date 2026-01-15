import { WorkspaceLeaf, Plugin } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';

export const GANTT_VIEW_TYPE = 'gantt-view';

export class GanttView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private taskManager: TaskManager; // Instancia de TaskManager

  constructor(leaf: WorkspaceLeaf, private plugin: Plugin, private i18n: I18n) {
    super(leaf);
    this.taskManager = new TaskManager(plugin.app, i18n, this.plugin); // Inicializa TaskManager con la 
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
    await this.getAllTasks(this.taskManager); // Cargar tareas
    await this.render(GANTT_VIEW_TYPE, { tasks: this.tasks }, this.i18n, this.plugin, this.leaf);
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}