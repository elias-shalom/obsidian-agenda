import { App, Plugin, PluginManifest } from "obsidian";
import { ViewManager } from "./core/view-manager";
import { I18n } from "./core/i18n";
//import logger from './core/logger';
import { TaskManager } from "./core/task-manager";
//import { SettingTab } from "./settings/setting-tab";
//import { 	DEFAULT_SETTINGS, AgendaPluginSettings, } from "./settings/settings";

export default class ObsidianAgenda extends Plugin {
  //settings: AgendaPluginSettings;
  private viewManager: ViewManager ;
  private i18n: I18n;
  private taskManager: TaskManager; 
  
  /// Constructor de la clase ObsidianAgendaPlugin.
  constructor(app: App, manifest: PluginManifest) {
      super(app, manifest);
      this.i18n = new I18n(app);
      this.taskManager = new TaskManager(app, this.i18n, this);
      this.viewManager = new ViewManager(this, this.i18n, this.taskManager); // Pasar la instancia del plugin
  }

  /// Método de inicializa del plugin.
  async onload(): Promise<void> {
    console.debug("Cargando el plugin OBS Agenda...");
    const OVERVIEW_VIEW_TYPE = 'overview-view';

    try {
      //await this.loadSettings();

      // Cargar idioma (puedes usar una configuración o detectar el idioma del sistema)
      await this.i18n.loadLanguage();

      // Añadir la pestaña de configuración
      //this.addSettingTab(new SettingTab(this.app, this, this.i18n));

      this.addRibbonIcon("calendar-check", this.i18n.t("agenda_title"), async () => {
        await this.viewManager.activateView(OVERVIEW_VIEW_TYPE);
      });

      // Registrar eventos
      this.taskManager.registerEvents(this);

      this.viewManager.registerViews();
      //logger.info("Vistas registradas correctamente.");

    } catch (error) {
      console.error(`Error durante la carga del plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /*async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }*/

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
      
      // Eliminar estilos aplicados
      this.app.workspace.containerEl.ownerDocument.querySelectorAll('style[data-plugin="obsidian-agenda"]').forEach(element => {
        element.remove();
      });
      
      // Limpiar cualquier tiempo/intervalo que pueda estar activo
      // Si tu plugin utiliza setInterval o setTimeout
      // clearInterval(this.someIntervalId);
      // clearTimeout(this.someTimeoutId);
      
      // Limpiar referencias
      // this.viewManager = null;
      // this.taskManager = null;
      // this.i18n = null;
      
      console.debug('Limpieza completada, plugin desactivado con éxito');
    } catch (error) {
      console.error(`Error durante la descarga del plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
