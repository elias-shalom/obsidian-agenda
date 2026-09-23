import { App, Plugin, PluginManifest, Notice } from "obsidian";
import { ViewManager } from "./core/view-manager";
import { I18n } from "./core/i18n";
import { TaskManager } from "./core/task-manager";
import { HabitManager } from "./habits";
import { SettingTab } from "./settings/setting-tab";
import { TASK_MODAL_TYPE, ModalManager } from "./core/modal-manager";
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

      this.viewManager.registerViews();
      //logger.info("Vistas registradas correctamente.");

    } catch (error) {
      console.error(`Error durante la carga del plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async loadSettings(): Promise<void> {
    const raw: unknown = await this.loadData();

    if (!raw || typeof raw !== "object") {
      this.settings = { ...DEFAULT_SETTINGS };
      return;
    }

    const data = raw as Partial<AgendaPluginSettings>;

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(typeof data.showOverviewTab === "boolean" ? { showOverviewTab: data.showOverviewTab } : {}),
      ...(typeof data.showListTab === "boolean" ? { showListTab: data.showListTab } : {}),
      ...(typeof data.showTableTab === "boolean" ? { showTableTab: data.showTableTab } : {}),
      ...(typeof data.showCalendarTab === "boolean" ? { showCalendarTab: data.showCalendarTab } : {}),
      ...(typeof data.weekStartDay === "number" ? { weekStartDay: data.weekStartDay } : {}),
      ...(typeof data.habitFolderPath === "string" ? { habitFolderPath: data.habitFolderPath } : {}),
      ...(typeof data.habitDaysToShow === "number" ? { habitDaysToShow: data.habitDaysToShow } : {}),
      ...(typeof data.habitShowStreaks === "boolean" ? { habitShowStreaks: data.habitShowStreaks } : {}),
      ...(typeof data.habitDefaultMaxGap === "number" ? { habitDefaultMaxGap: data.habitDefaultMaxGap } : {}),
      ...(typeof data.habitDefaultPriority === "number" ? { habitDefaultPriority: data.habitDefaultPriority } : {}),
      ...(typeof data.habitDefaultColor === "string" ? { habitDefaultColor: data.habitDefaultColor } : {}),
      ...(typeof data.showHabitGridTab === "boolean" ? { showHabitGridTab: data.showHabitGridTab } : {}),
      ...(typeof data.showHabitDashboardTab === "boolean" ? { showHabitDashboardTab: data.showHabitDashboardTab } : {}),
      ...(typeof data.showHabitRoutineTab === "boolean" ? { showHabitRoutineTab: data.showHabitRoutineTab } : {}),
      ...(typeof data.showHabitWeeklyTab === "boolean" ? { showHabitWeeklyTab: data.showHabitWeeklyTab } : {}),
      ...(typeof data.showHabitListTab === "boolean" ? { showHabitListTab: data.showHabitListTab } : {}),
    };
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
