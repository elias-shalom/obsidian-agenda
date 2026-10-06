// src/modals/task-modal.ts
import { App, Modal, Notice} from "obsidian";
import { DateTime } from "luxon";
import Handlebars from "handlebars";
import { I18n } from "../core/i18n";
import { TaskManager } from "../core/task-manager";
import { ModalType, ModalOptions, ITask } from "../types/interfaces";
import { CoreTaskStatus } from "../types/enums";
import { TaskWriter } from "../core/task-writer";
import { upsertTaskStatus } from "../core/task-line-fields";
import { TaskTimePickerModal } from "./task-time-picker-modal";
import { TaskDurationModal } from "./task-duration-modal";
import { clearTooltips, installTooltips } from "../core/tooltips";
import flatpickr from 'flatpickr';
//import { es } from 'flatpickr/dist/l10n/es';
//import 'flatpickr/dist/flatpickr.css';

/** Recuerda el último modo (básico/avanzado) usado en el Task Modal (v1.1.4, Fase E). */
const ADVANCED_MODE_STORAGE_KEY = "oa_task_modal_advanced_mode";

/** El estado de prioridad se guarda por nombre (ver `task-section.ts`); el formulario necesita el emoji crudo. */
const PRIORITY_NAME_TO_EMOJI: Record<string, string> = {
  lowest: "⏬",
  low: "🔽",
  normal: "",
  medium: "🔼",
  high: "⏫",
  highest: "🔺",
};


export class TaskModal extends Modal {
  private modalType: ModalType;
  private modalOptions?: ModalOptions;
  private i18n: I18n;
  private taskManager: TaskManager;
  private taskWriter: TaskWriter;

  constructor(app: App, modalType: ModalType, i18n: I18n, taskManager: TaskManager, modalOptions?: ModalOptions) {
    super(app);
    this.modalType = modalType;
    this.modalOptions = modalOptions;
    this.taskManager = taskManager;
    this.i18n = i18n;
    this.taskWriter = new TaskWriter(app);
  }

  onOpen(): void {
    this.registerHandlebarsHelpers();
    void this.initializeModal();    
  }

  private async initializeModal(): Promise<void> {
    const { contentEl } = this;
    clearTooltips(contentEl);
    contentEl.empty();
    contentEl.addClass("oa-task-modal");

    const editingTask = this.modalType === "edit-task" ? (this.modalOptions?.task as ITask | undefined) : undefined;

    // Reutiliza la misma plantilla para crear y editar; solo cambian los valores prefilled.
    await this.renderModal("create-task-modal", this.buildTemplateData(editingTask));
    installTooltips(contentEl);

    this.attachModalListeners();
  }

  /** Notifica a quien abrió el modal (ej. una vista de calendario) que se guardó, para que pueda refrescarse. */
  private notifySaved(): void {
    const onSaved = this.modalOptions?.onSaved;
    if (typeof onSaved === "function") {
      (onSaved as () => void)();
    }
  }

  /** Arma los datos de la plantilla: vacíos/hoy por defecto al crear, prefilled con la tarea al editar (v1.1.4, edición). */
  private buildTemplateData(task: ITask | undefined): Record<string, unknown> {
    const none = this.i18n.t("none");

    if (!task) {
      // v1.1.9 (fix): antes siempre usaba DateTime.now(), ignorando la fecha/hora que pasó
      // el doble clic en una celda del calendario (modalOptions.today/scheduledTime).
      const today = (this.modalOptions?.today as string | undefined) ?? DateTime.now().toFormat("yyyy-MM-dd");
      const scheduledTime = (this.modalOptions?.scheduledTime as string | undefined) ?? "";
      return {
        headerTitle: this.i18n.t("new_task"),
        isEdit: false,
        taskTitle: "",
        filePathValue: "",
        priorityValue: "",
        statusValue: CoreTaskStatus.Todo,
        dueDateValue: "", dueLabelValue: none,
        startDateValue: "", startLabelValue: none,
        scheduledDateValue: today, scheduledLabelValue: today,
        scheduledTimeValue: scheduledTime, scheduledTimeLabelValue: scheduledTime || none,
        scheduledDurationValue: "", scheduledDurationLabelValue: none,
        recurrenceValue: "", dependsValue: "", onCompletionValue: "", idValue: "",
      };
    }

    const dueIso = task.date.due?.toISODate() ?? "";
    const startIso = task.date.start?.toISODate() ?? "";
    const scheduledIso = task.date.scheduled?.toISODate() ?? "";
    // El id cae a `path-línea` cuando la tarea no tiene 🆔 explícito (ver task-extractor.ts): no lo prefilled como si fuera real.
    const isAutoId = task.id === `${task.file.path}-${task.line.number}`;

    return {
      headerTitle: this.i18n.t("edit_task"),
      isEdit: true,
      taskTitle: task.section.desc,
      filePathValue: task.file.path,
      priorityValue: PRIORITY_NAME_TO_EMOJI[task.state.priority] ?? "",
      statusValue: task.state.status,
      dueDateValue: dueIso, dueLabelValue: dueIso || none,
      startDateValue: startIso, startLabelValue: startIso || none,
      scheduledDateValue: scheduledIso, scheduledLabelValue: scheduledIso || none,
      scheduledTimeValue: task.date.scheduledTime ?? "", scheduledTimeLabelValue: task.date.scheduledTime ?? none,
      scheduledDurationValue: task.date.scheduledDuration != null ? String(task.date.scheduledDuration) : "",
      scheduledDurationLabelValue: task.date.scheduledDuration != null ? `${task.date.scheduledDuration}m` : none,
      recurrenceValue: task.flow.repeat ?? "",
      dependsValue: (task.flow.dependsOn ?? []).join(", "),
      onCompletionValue: task.flow.onCompletion ?? "",
      idValue: isAutoId ? "" : task.id,
    };
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper("t", (key: string) => this.i18n.t(key));
  }

  onClose(): void {
    clearTooltips(this.contentEl);
    this.contentEl.empty();
  }

  private async renderModal(modalType: string, data: Record<string, unknown>): Promise<void> {
    try {
      console.debug(`Dibuja vista: ${modalType}`); // Debugging line

      // @ts-ignore: Plugin de esbuild maneja archivos .hbs
      const TEMPLATE_LOADERS: Record<string, () => Promise<{ default: (ctx: Record<string, unknown>) => string }>> = {
        // @ts-ignore
        "create-task-modal": () => import("./templates/create-task-modal.hbs"),
      };

      const loader = TEMPLATE_LOADERS[modalType];
      if (!loader) {
        throw new Error(`Unknown modal type: ${modalType}`);
      }
      const templateModule = await loader();

      const html = templateModule.default(data);

      const parser = new DOMParser();
      const doc = parser.parseFromString(String(html), "text/html");

      Array.from(doc.body.children).forEach((element) => {
        this.contentEl.appendChild(this.contentEl.ownerDocument.importNode(element, true));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.contentEl.createDiv({
      cls: "error",
      text: `Error al cargar la plantilla del modal: ${message}`,
      });
    }
  }

  private attachModalListeners(): void {
    switch (this.modalType) {
      case "create-task":
      case "edit-task":
        this.attachTaskFormListeners();
        break;
    }
  }

  private attachTaskFormListeners(): void {
    const editingTask = this.modalType === "edit-task" ? (this.modalOptions?.task as ITask | undefined) : undefined;
    const form = this.contentEl.querySelector<HTMLFormElement>("#oa-task-form");
    const titleInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-title");
    const dueInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-due");
    const fileInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-file");
    // Poblar datalist con archivos del vault
    const suggestionsList = this.contentEl.querySelector<HTMLUListElement>("#oa-file-suggestions");
    const fileHint = this.contentEl.querySelector<HTMLSpanElement>("#oa-file-hint");
    const markdownFiles = this.app.vault.getMarkdownFiles();

    const hideSuggestions = () => {
      suggestionsList?.addClass("oa-hidden");
    };

    const showSuggestions = (query: string) => {
      if (!suggestionsList) return;
      suggestionsList.innerHTML = "";

      if (!query) { hideSuggestions(); return; }

      const parts = query.toLowerCase().split("/");
      const matches = markdownFiles
        .filter(f => parts.every(part => f.path.toLowerCase().includes(part)))
        .slice(0, 10);

      if (matches.length === 0) { hideSuggestions(); return; }

      matches.forEach(file => {
        const li = suggestionsList.createEl("li", { cls: "oa-file-suggestion-item", text: file.path });
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          if (fileInput) fileInput.value = file.path;
          hideSuggestions();
          if (fileHint) fileHint.textContent = "";
        });
      });

      suggestionsList.removeClass("oa-hidden");
    };

    fileInput?.addEventListener("input", () => {
      const query = fileInput.value.trim();
      showSuggestions(query);

      // Hint de archivo nuevo
      if (!fileHint) return;
      if (!query) { fileHint.textContent = ""; return; }
      const exists = this.app.vault.getAbstractFileByPath(query);
      fileHint.textContent = exists ? "" : this.i18n.t("file_will_be_created");
      fileHint.className = exists ? "oa-file-hint" : "oa-file-hint oa-file-hint--new";
    });

    fileInput?.addEventListener("blur", () => {
      window.setTimeout(hideSuggestions, 150);
    });

    // Selector de prioridad: segmented control de píldoras (v1.1.4, reemplaza el botón+dropdown oculto)
    const priorityGroup = this.contentEl.querySelector<HTMLElement>("#oa-priority-group");
    const priorityPills = Array.from(priorityGroup?.querySelectorAll<HTMLButtonElement>(".oa-priority-pill") ?? []);
    let selectedPriority = priorityGroup?.dataset.selected ?? "";
    priorityPills.forEach(pill => {
      pill.toggleClass("oa-active", (pill.dataset.priority ?? "") === selectedPriority);
      pill.addEventListener("click", () => {
        selectedPriority = pill.dataset.priority ?? "";
        priorityPills.forEach(p => p.toggleClass("oa-active", p === pill));
      });
    });

    // Selector de estado (v1.1.10, Manejo de estatus): mismo patrón, grupo y clase de píldora
    // compartidos con prioridad, por eso cada selector de píldoras se escopea a su propio grupo.
    const statusGroup = this.contentEl.querySelector<HTMLElement>("#oa-status-group");
    const statusPills = Array.from(statusGroup?.querySelectorAll<HTMLButtonElement>(".oa-priority-pill") ?? []);
    let selectedStatus: CoreTaskStatus = (statusGroup?.dataset.selected as CoreTaskStatus) ?? CoreTaskStatus.Todo;
    statusPills.forEach(pill => {
      pill.toggleClass("oa-active", ((pill.dataset.status ?? "") as CoreTaskStatus) === selectedStatus);
      pill.addEventListener("click", () => {
        selectedStatus = (pill.dataset.status as CoreTaskStatus) ?? CoreTaskStatus.Todo;
        statusPills.forEach(p => p.toggleClass("oa-active", p === pill));
      });
    });

    titleInput?.focus();

    // Campos avanzados: start/scheduled reutilizan flatpickr (mismo patrón que due);
    // hora/duración reutilizan los modales dedicados de la Fase B (v1.1.4).
    const startInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-start");
    const startTrigger = this.contentEl.querySelector<HTMLButtonElement>("#oa-start-trigger");
    const startLabel = this.contentEl.querySelector<HTMLSpanElement>("#oa-start-label");

    const scheduledInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-scheduled");
    const scheduledTrigger = this.contentEl.querySelector<HTMLButtonElement>("#oa-scheduled-trigger");
    const scheduledLabel = this.contentEl.querySelector<HTMLSpanElement>("#oa-scheduled-label");

    const scheduledTimeInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-scheduled-time");
    const scheduledTimeTrigger = this.contentEl.querySelector<HTMLButtonElement>("#oa-scheduled-time-trigger");
    const scheduledTimeLabel = this.contentEl.querySelector<HTMLSpanElement>("#oa-scheduled-time-label");

    const scheduledDurationInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-scheduled-duration");
    const scheduledDurationTrigger = this.contentEl.querySelector<HTMLButtonElement>("#oa-scheduled-duration-trigger");
    const scheduledDurationLabel = this.contentEl.querySelector<HTMLSpanElement>("#oa-scheduled-duration-label");

    const recurrenceInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-recurrence");
    const dependsInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-depends");
    const onCompletionInput = this.contentEl.querySelector<HTMLSelectElement>("#oa-task-oncompletion");
    const idInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-id");

    if (onCompletionInput) onCompletionInput.value = onCompletionInput.dataset.value ?? "";

    // Toggle de opciones avanzadas (v1.1.4, Fase E): recuerda el último modo usado, sin cambiar
    // el texto (solo rota el caret), estilo sección colapsable. Al editar una tarea que ya tiene
    // algún campo avanzado con valor, se muestra expandida de entrada (no depende de la preferencia recordada).
    const advancedToggle = this.contentEl.querySelector<HTMLButtonElement>("#oa-advanced-toggle");
    const advancedFields = this.contentEl.querySelector<HTMLElement>("#oa-advanced-fields");

    const setAdvancedMode = (expanded: boolean) => {
      advancedFields?.toggleClass("oa-expanded", expanded);
      advancedToggle?.setAttribute("aria-expanded", String(expanded));
    };

    const hasAdvancedData = !!(dueInput?.value || startInput?.value || recurrenceInput?.value || dependsInput?.value || onCompletionInput?.value || idInput?.value);
    setAdvancedMode(hasAdvancedData || this.app.loadLocalStorage(ADVANCED_MODE_STORAGE_KEY) === "true");

    advancedToggle?.addEventListener("click", () => {
      const nowExpanded = advancedToggle.getAttribute("aria-expanded") !== "true";
      setAdvancedMode(nowExpanded);
      this.app.saveLocalStorage(ADVANCED_MODE_STORAGE_KEY, String(nowExpanded));
    });

    const setupSimpleDatePicker = (input: HTMLInputElement | null, trigger: HTMLButtonElement | null, label: HTMLSpanElement | null) => {
      if (!input) return;
      flatpickr(input, {
        enableTime: false,
        dateFormat: "Y-m-d",
        appendTo: this.contentEl,
        onClose: (selectedDates) => {
          if (selectedDates.length > 0 && label) {
            label.textContent = input.value;
          }
        },
      });
      trigger?.addEventListener("click", (event) => {
        event.preventDefault();
        input.click();
      });
    };

    setupSimpleDatePicker(dueInput, this.contentEl.querySelector<HTMLButtonElement>("#oa-date-trigger"), this.contentEl.querySelector<HTMLSpanElement>("#oa-date-label"));
    setupSimpleDatePicker(startInput, startTrigger, startLabel);
    setupSimpleDatePicker(scheduledInput, scheduledTrigger, scheduledLabel);

    scheduledTimeTrigger?.addEventListener("click", (event) => {
      event.preventDefault();
      new TaskTimePickerModal(this.app, this.i18n, scheduledTimeInput?.value || null, (time) => {
        if (scheduledTimeInput) scheduledTimeInput.value = time;
        if (scheduledTimeLabel) scheduledTimeLabel.textContent = time;
      }).open();
    });

    scheduledDurationTrigger?.addEventListener("click", (event) => {
      event.preventDefault();
      const currentMinutes = scheduledDurationInput?.value ? Number(scheduledDurationInput.value) : null;
      new TaskDurationModal(this.app, this.i18n, currentMinutes, (minutes) => {
        if (scheduledDurationInput) scheduledDurationInput.value = String(minutes);
        if (scheduledDurationLabel) scheduledDurationLabel.textContent = `${minutes}m`;
      }).open();
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();

      // Envolver en IIFE para ejecutar async sin retornar Promise
      void (async () => {
        const title = (titleInput?.value ?? "").trim();
        if (!title) {
          new Notice(this.i18n.t("description_required"));
          return;
        }

        const dueDate = (dueInput?.value ?? "").trim();
        const priority = selectedPriority;
        const todayIso = DateTime.now().toFormat("yyyy-MM-dd");
        const startDate = (startInput?.value ?? "").trim();
        const scheduledDate = (scheduledInput?.value ?? "").trim();
        const scheduledTime = (scheduledTimeInput?.value ?? "").trim();
        const scheduledDuration = (scheduledDurationInput?.value ?? "").trim();
        const recurrence = (recurrenceInput?.value ?? "").trim();
        const dependsOn = (dependsInput?.value ?? "").trim();
        const onCompletion = (onCompletionInput?.value ?? "").trim();
        const customId = (idInput?.value ?? "").trim();

        // Hora requiere fecha programada, duración requiere hora (ADR-T2/T3)
        if (scheduledTime && !scheduledDate) {
          new Notice(this.i18n.t("task_field_menu_need_scheduled_date"));
          return;
        }
        if (scheduledDuration && !scheduledTime) {
          new Notice(this.i18n.t("task_field_menu_need_scheduled_time"));
          return;
        }

        // Construye los campos comunes a crear/editar; el checkbox y el blockLink solo aplican al editar (se preservan).
        const buildLine = (statusChar: string, blockLink: string): string => {
          let line = `- [${statusChar}] ${title}`;
          if (priority) line += ` ${priority}`;
          if (recurrence) line += ` 🔁 ${recurrence}`;
          if (startDate) line += ` 🛫 ${startDate}`;
          if (scheduledDate) {
            line += ` ⏳ ${scheduledDate}`;
            if (scheduledTime) line += ` 🕐 ${scheduledTime}`;
            if (scheduledTime && scheduledDuration) line += ` ⏱️ ${scheduledDuration}m`;
          }
          if (dueDate) line += ` 📅 ${dueDate}`;
          if (dependsOn) line += ` ⛔ ${dependsOn}`;
          if (onCompletion) line += ` 🏁 ${onCompletion}`;
          if (customId) line += ` 🆔 ${customId}`;
          if (blockLink) line += ` ${blockLink}`;
          return line;
        };

        // Agrega/quita la fecha ✅ según corresponda (ADR-S3), reutilizando upsertTaskStatus() en vez de
        // duplicar esa lógica aquí. Si la tarea ya estaba Hecha y el estado no cambió, conserva su fecha
        // original en vez de pisarla con la de hoy.
        const applyStatus = (line: string, originalTask?: ITask): string => {
          if (selectedStatus !== CoreTaskStatus.Done) return line;
          const doneIso = (originalTask && (originalTask.state.status as CoreTaskStatus) === CoreTaskStatus.Done && originalTask.date.done)
            ? originalTask.date.done.toISODate() ?? todayIso
            : todayIso;
          return upsertTaskStatus(line, CoreTaskStatus.Done, doneIso);
        };

        if (editingTask) {
          const line = applyStatus(buildLine(selectedStatus, editingTask.flow.blockLink), editingTask);
          try {
            console.debug(`Actualizando línea ${editingTask.line.number} de ${editingTask.file.path}: ${line}`); // Debugging line
            const ok = await this.taskWriter.updateTaskLine(editingTask.file.path, editingTask.line.number, () => line);
            if (ok) {
              new Notice(this.i18n.t("task_updated"));
              this.notifySaved();
              this.close();
            } else {
              new Notice(this.i18n.t("task_update_error"));
            }
          } catch (error) {
            console.error(`Error actualizando tarea: ${error instanceof Error ? error.message : String(error)}`);
            new Notice(`Error actualizando tarea: ${String(error)}`);
          }
          return;
        }

        // Validación del archivo (solo aplica al crear; al editar el archivo ya está fijado)
        const filePath = (fileInput?.value ?? "").trim();
        if (!filePath) {
          new Notice(this.i18n.t("file_required"));
          fileInput?.focus();
          return;
        }
        if (!filePath.endsWith(".md")) {
          new Notice(this.i18n.t("file_invalid_extension"));
          fileInput?.focus();
          return;
        }

        const line = applyStatus(buildLine(selectedStatus, ""));

        try {
          console.debug(`Agregando línea a ${filePath}: ${line}`); // Debugging line
          const fileExists = !!this.app.vault.getAbstractFileByPath(filePath);
          await this.taskWriter.appendTaskLine(filePath, line);

          if (!fileExists) {
            new Notice(this.i18n.t("file_created", { file: filePath }));
          }
          new Notice(this.i18n.t("task_created"));
          this.notifySaved();
          this.close();
        } catch (error) {
          console.error(`Error creando tarea: ${error instanceof Error ? error.message : String(error)}`);
          new Notice(`Error creando tarea: ${String(error)}`);
        }
      })();
    });

    // Botón cancelar
    const cancelBtn = this.contentEl.querySelector<HTMLButtonElement>("#oa-task-cancel");
    cancelBtn?.addEventListener("click", () => {
      this.close();
    });
  }
}