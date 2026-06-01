import { App } from "obsidian";
import { TaskModal } from "../modals/task-modal";
import { TaskManager } from "./task-manager";
import { I18n } from "./i18n";
import { ModalType, ModalOptions } from "../types/interfaces";

export const TASK_MODAL_TYPE: ModalType = "create-task";
export const EDIT_TASK_MODAL_TYPE: ModalType = "edit-task";
export const QUICK_CAPTURE_MODAL_TYPE: ModalType = "quick-capture";


export class ModalManager {
  constructor(private app: App, private i18n: I18n, private taskManager: TaskManager) {}

  public openModal(modalType: ModalType, options?: ModalOptions): void {
    // TaskModal maneja internamente qué template y lógica usar
    new TaskModal(this.app, modalType, this.i18n, this.taskManager, options).open();
  }
}