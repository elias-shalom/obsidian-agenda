// src/modals/task-duration-modal.ts
import { App, Modal, Notice } from "obsidian";
import { I18n } from "../core/i18n";

/** Modal mínimo para capturar una duración en minutos (v1.1.4 — ver docs/agenda-tasks/Especificación de vistas.md §7). */
export class TaskDurationModal extends Modal {
  constructor(
    app: App,
    private i18n: I18n,
    private initialMinutes: number | null,
    private onSubmit: (minutes: number) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("oa-task-modal");

    contentEl.createEl("h2", { text: this.i18n.t("task_duration_modal_title") });

    const form = contentEl.createEl("form", { cls: "oa-task-modal__form" });
    const group = form.createDiv({ cls: "oa-form-group" });
    group.createEl("label", { text: this.i18n.t("task_duration_modal_label"), cls: "oa-form-label", attr: { for: "oa-task-duration-input" } });
    const input = group.createEl("input", {
      type: "number",
      cls: "oa-form-input",
      attr: { id: "oa-task-duration-input", min: "1", step: "1" },
    });
    input.value = this.initialMinutes ? String(this.initialMinutes) : "";

    const actions = form.createDiv({ cls: "oa-task-modal__actions" });
    const cancelBtn = actions.createEl("button", { type: "button", text: this.i18n.t("cancel"), cls: "oa-btn oa-btn--secondary" });
    actions.createEl("button", { type: "submit", text: this.i18n.t("save"), cls: "oa-btn oa-btn--primary" });

    cancelBtn.addEventListener("click", () => this.close());

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const minutes = Number(input.value);
      if (!Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes <= 0) {
        new Notice(this.i18n.t("task_duration_invalid"));
        return;
      }
      this.onSubmit(minutes);
      this.close();
    });

    window.setTimeout(() => input.focus(), 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
