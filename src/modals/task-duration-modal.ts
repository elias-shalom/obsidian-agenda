// src/modals/task-duration-modal.ts
import { App, Modal, Notice } from "obsidian";
import { I18n } from "../core/i18n";
import { TimeDial } from "../core/time-dial";

const MAX_MINUTES = 420; // 7 horas (v1.1.10, §7.7/§18)
const STEP_MINUTES = 5;

/** Modal para capturar una duración en minutos con el dial circular compartido (v1.1.4 — ver
 * docs/agenda-tasks/Especificación de vistas.md §7; dial extraído del Habit Editor en v1.1.10, §7.7). */
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
    const group = form.createDiv({ cls: "oa-form-group oa-form-group--dial" });
    group.createEl("label", { text: this.i18n.t("task_duration_modal_label"), cls: "oa-form-label" });

    const dialRoot = group.createDiv();
    const dial = new TimeDial({
      maxMinutes: MAX_MINUTES,
      stepMinutes: STEP_MINUTES,
      initialMinutes: this.initialMinutes ?? 0,
      unitLabel: this.i18n.t("habit_time_unit_minutes"),
      ariaLabel: this.i18n.t("task_duration_modal_label"),
    });
    dial.mount(dialRoot);

    const actions = form.createDiv({ cls: "oa-task-modal__actions" });
    actions.createEl("button", { type: "submit", text: this.i18n.t("save"), cls: "oa-btn oa-btn--primary" });
    const cancelBtn = actions.createEl("button", { type: "button", text: this.i18n.t("cancel"), cls: "oa-btn oa-btn--secondary" });

    cancelBtn.addEventListener("click", () => this.close());

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const minutes = dial.getValue();
      if (minutes <= 0) {
        new Notice(this.i18n.t("task_duration_invalid"));
        return;
      }
      this.onSubmit(minutes);
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
