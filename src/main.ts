import { App, Plugin, PluginManifest, Notice, Menu, MarkdownView } from "obsidian";
import { ViewManager } from "./core/view-manager";
import { I18n } from "./core/i18n";
import { TaskManager } from "./core/task-manager";
import { HabitManager } from "./habits";
import { SettingTab } from "./settings/setting-tab";
import { TASK_MODAL_TYPE, ModalManager } from "./core/modal-manager";
import { addTaskFieldMenuItems } from "./core/task-field-menu";
import { isTaskLine } from "./core/task-line-fields";
import { DEFAULT_SETTINGS, AgendaPluginSettings, } from "./settings/settings";

export default class ObsidianAgenda extends Plugin {
  settings: AgendaPluginSettings = DEFAULT_SETTINGS;
  private viewManager: ViewManager ;
  private i18n: I18n;
  private taskManager: TaskManager;
  private habitManager: HabitManager;
  public modalManager: ModalManager;

  /// Constructor de la clase ObsidianAgendaPlugin.
  constructor(app: App, manifest: PluginManifest) {
      super(app, manifest);
      this.i18n = new I18n(app);
      this.taskManager = new TaskManager(app, this.i18n, this);
      this.habitManager = new HabitManager(app, () => this.settings, this.i18n);
      this.viewManager = new ViewManager(this, this.i18n, this.taskManager, this.habitManager); // Pasar la instancia del plugin
      this.modalManager = new ModalManager(app, this.i18n, this.taskManager);
  }

  /// Método de inicializa del plugin.
  async onload(): Promise<void> {
    console.debug("Cargando el plugin OBS Agenda...");
    const OVERVIEW_VIEW_TYPE = 'overview-view';

    try {
      await this.loadSettings();

      // Cargar idioma (puedes usar una configuración o detectar el idioma del sistema)
      await this.i18n.loadLanguage();

      // Añadir la pestaña de configuración
      this.addSettingTab(new SettingTab(this.app, this, this.i18n));

      this.addRibbonIcon("notebook-tabs", this.i18n.t("agenda_title"), async () => {
        await this.viewManager.activateView(OVERVIEW_VIEW_TYPE);
      });

      // Registrar comando para abrir desde la paleta de comandos
      this.addCommand({
        id: 'open-agenda-view',
        name: this.i18n.t("agenda_title"),
        callback: async () => {
          await this.viewManager.activateView(OVERVIEW_VIEW_TYPE);
        }
      });

      // dentro de onload(), junto al icono existente:
      this.addRibbonIcon("calendar-plus", this.i18n.t("new_task"), () => {
        this.modalManager.openModal(TASK_MODAL_TYPE);
      });

      // opcional: comando
      this.addCommand({
        id: "open-create-task-modal",
        name: this.i18n.t("new_task"),
        callback: () => {
          this.modalManager.openModal(TASK_MODAL_TYPE);
        }
      });

      // Comandos del Habit Creator
      this.addCommand({
        id: "oa-habit-new",
        name: this.i18n.t("habit_new_habit"),
        callback: () => this.habitManager.openEditor(),
      });

      this.addCommand({
        id: "oa-habit-edit",
        name: this.i18n.t("habit_edit_habit"),
        callback: () => {
          const file = this.app.workspace.getActiveFile();
          const habit = file ? this.habitManager.getHabit(file) : null;
          if (habit) {
            this.habitManager.openEditor(habit);
          } else {
            new Notice(this.i18n.t("habit_edit_habit"));
          }
        },
      });

      // Registrar eventos
      this.taskManager.registerEvents(this);

      // Insertar campos de tarea (fecha/hora/duración/prioridad) desde el editor (v1.1.4, Fase B)
      this.addCommand({
        id: "oa-task-insert-field",
        name: this.i18n.t("task_insert_field_command"),
        editorCallback: (editor, ctx) => {
          const lineNumber = editor.getCursor().line;
          if (!isTaskLine(editor.getLine(lineNumber))) {
            new Notice(this.i18n.t("task_field_menu_not_a_task"));
            return;
          }

          const menu = new Menu();
          addTaskFieldMenuItems(menu, editor, lineNumber, this.i18n, this.app);

          const view = ctx instanceof MarkdownView ? ctx : this.app.workspace.getActiveViewOfType(MarkdownView);
          const rect = (view?.contentEl ?? document.body).getBoundingClientRect();
          menu.showAtPosition({ x: rect.left + rect.width / 2, y: rect.top + 80 });
        },
      });

      this.registerEvent(
        this.app.workspace.on("editor-menu", (menu, editor) => {
          const lineNumber = editor.getCursor().line;
          if (!isTaskLine(editor.getLine(lineNumber))) return;

          menu.addSeparator();
          addTaskFieldMenuItems(menu, editor, lineNumber, this.i18n, this.app);
        })
      );

      this.viewManager.registerViews();
      //logger.info("Vistas registradas correctamente.");

    } catch (error) {
      console.error(`Error durante la carga del plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async loadSettings(): Promise<void> {
    const raw: unknown = await this.loadData();
    const data = (raw && typeof raw === "object") ? raw as Partial<AgendaPluginSettings> : {};

    // Merge genérico: cualquier clave guardada sobrescribe su default, sin necesidad de listarla aquí.
    this.settings = { ...DEFAULT_SETTINGS, ...data };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

onunload() {
    console.debug('Descargando plugin OBS Agenda');

    try {
      // Desregistrar vistas
      if (this.viewManager) {
        this.viewManager.unregisterViews();
        //logger.info('Vistas desregistradas correctamente');
      }

      // Limpiar TaskManager (incluye eventos y cache)
      if (this.taskManager) {
        this.taskManager.cleanup();
        //logger.info('TaskManager limpiado correctamente');
      }

      // Limpiar HabitManager
      if (this.habitManager) {
        this.habitManager.cleanup();
      }

      // Limpiar cualquier tiempo/intervalo que pueda estar activo
      // Si tu plugin utiliza setInterval o setTimeout
      // clearInterval(this.someIntervalId);
      // clearTimeout(this.someTimeoutId);

      // Limpiar referencias
      // this.viewManager = null;
      // this.taskManager = null;
      // this.habitManager = null;
      // this.i18n = null;

      console.debug('Limpieza completada, plugin desactivado con éxito');
    } catch (error) {
      console.error(`Error durante la descarga del plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
