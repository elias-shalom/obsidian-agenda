// src/modals/task-modal.ts
import { App, Modal, Notice} from "obsidian";
import { DateTime } from "luxon";
import Handlebars from "handlebars";
import { I18n } from "../core/i18n";
import { TaskManager } from "../core/task-manager";
import { ModalType, ModalOptions } from "../types/interfaces";
import { TaskWriter } from "../core/task-writer";
import flatpickr from 'flatpickr';
//import { es } from 'flatpickr/dist/l10n/es';
//import 'flatpickr/dist/flatpickr.css';


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
    contentEl.empty();
    contentEl.addClass("oa-task-modal");

    await this.renderModal(`${this.modalType}-modal`, {
    title: "Nueva tarea",
    today: DateTime.now().toFormat("yyyy-MM-dd"),
    ...this.modalOptions,
    });

    this.attachModalListeners();
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper("t", (key: string) => this.i18n.t(key));
  }

  onClose(): void {
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

      const fragment = this.contentEl.ownerDocument.createDocumentFragment();
      Array.from(doc.body.children).forEach((element) => {
      fragment.appendChild(this.contentEl.ownerDocument.importNode(element, true));
      });

      this.contentEl.appendChild(fragment);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.contentEl.createEl("div", {
      cls: "error",
      text: `Error al cargar la plantilla del modal: ${message}`,
      });
    }
  }

  private attachModalListeners(): void {
    switch (this.modalType) {
      case "create-task":
        this.attachCreateTaskListeners();
        break;
      case "edit-task":
        this.attachEditTaskListeners();
        break;
    }
  }

  private attachCreateTaskListeners(): void {
    const form = this.contentEl.querySelector<HTMLFormElement>("#oa-task-form");
    const titleInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-title");
    const dueInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-due");
    const fileInput = this.contentEl.querySelector<HTMLInputElement>("#oa-task-file");
    const priorityInput = this.contentEl.querySelector<HTMLSelectElement>("#oa-task-priority");
    const dateButton = this.contentEl.querySelector<HTMLButtonElement>("#oa-date-trigger");
    const priorityButton = this.contentEl.querySelector<HTMLButtonElement>("#oa-priority-trigger");
    const priorityLabel = this.contentEl.querySelector<HTMLSpanElement>("#oa-priority-label");
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
        const li = this.contentEl.ownerDocument.createElement("li");
        li.className = "oa-file-suggestion-item";
        li.textContent = file.path;
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          if (fileInput) fileInput.value = file.path;
          hideSuggestions();
          if (fileHint) fileHint.textContent = "";
        });
        suggestionsList.appendChild(li);
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
      setTimeout(hideSuggestions, 150);
    });

    // Abrir select al click del botón
    priorityButton?.addEventListener("click", (event) => {
      event.preventDefault();
      priorityInput?.click();
    });

    // Actualizar botón y label al cambiar la prioridad
    priorityInput?.addEventListener("change", () => {
      const selected = priorityInput.options[priorityInput.selectedIndex];
      const emoji = priorityInput.value ? priorityInput.value : "🚩";
      if (priorityButton) priorityButton.textContent = emoji;
      if (priorityLabel) priorityLabel.textContent = selected.text;
    });

    titleInput?.focus();

    // Inicializar Flatpickr
    if (dueInput) {
      flatpickr(dueInput, {
        //locale: es,
        enableTime: false,
        dateFormat: "Y-m-d",
        defaultDate: dueInput.value || new Date(),
        appendTo: this.contentEl,
        onClose: (selectedDates) => {
          if (selectedDates.length > 0) {
            const selectedDate = selectedDates[0];
            const formattedDate = selectedDate.toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
            dateButton!.title = `📅 ${formattedDate}`;
          }
        }
      });

      // Click en botón abre el calendar
      dateButton?.addEventListener("click", (event) => {
        event.preventDefault();
        dueInput.click();
      });
    }

    dueInput?.addEventListener("change", () => {
      const dateLabel = this.contentEl.querySelector<HTMLSpanElement>("#oa-date-label");
      if (dueInput.value && dateLabel) {
        dateLabel.textContent = dueInput.value;
      }
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

        // Validación del archivo
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

        const dueDate = (dueInput?.value ?? "").trim();
        const priority = (priorityInput?.value ?? "").trim();

        let line = `- [ ] ${title}`;
        if (priority) line += ` ${priority}`;
        if (dueDate) line += ` 📅 ${dueDate}`;

        try {
          console.debug(`Agregando línea a ${filePath}: ${line}`); // Debugging line
          const fileExists = !!this.app.vault.getAbstractFileByPath(filePath);
          await this.taskWriter.appendTaskLine(filePath, line);

          if (!fileExists) {
            new Notice(this.i18n.t("file_created", { file: filePath }));
          }
          new Notice(this.i18n.t("task_created"));
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

  private attachEditTaskListeners(): void {
    // Lógica específica para editar tareas
    /* const form = this.contentEl.querySelector<HTMLFormElement>("#oa-edit-form");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      // Tu lógica de edición aquí
      new Notice("Tarea actualizada");
      this.close();
    });*/
  }




}