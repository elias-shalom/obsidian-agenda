import { App, Plugin } from "obsidian";
import { ViewManager } from "./core/view-manager";
import { I18n } from "./core/i18n";
import logger from './core/logger';
import { TaskManager } from "./core/task-manager";

export default class ObsidianAgenda extends Plugin {
  private viewManager: ViewManager;
  private i18n: I18n;
  private taskManager: TaskManager; 
  
  /// Constructor de la clase ObsidianAgendaPlugin.
  constructor(app: App, manifest: any) {
      super(app, manifest);
      this.i18n = new I18n(app);
      this.taskManager = new TaskManager(app, this.i18n, this);
      this.viewManager = new ViewManager(this, this.i18n, this.taskManager); // Pasar la instancia del plugin
  }

  /// Método de inicializa del plugin.
  async onload(): Promise<void> {
    logger.info("Cargando el plugin Obsidian Agenda...");
    const MAIN_VIEW_TYPE = 'main-view';

    try {
      // Leer el contenido del archivo CSS y agregarlo al DOM
      const cssPath = this.app.vault.adapter.getResourcePath('.obsidian/plugins/obsidian-agenda/styles/styles.css');
      const response = await fetch(cssPath);

      if (response.ok) {
        const cssContent = await response.text();
        const style = document.createElement("style");
        style.textContent = cssContent;
        document.head.appendChild(style);
        logger.info("Archivo CSS cargado correctamente.");
      } else {
        logger.error("Error al cargar el archivo CSS:", response.statusText);
      }

      // Cargar idioma (puedes usar una configuración o detectar el idioma del sistema)
      await this.i18n.loadLanguage("es");

      this.addRibbonIcon("calendar-check", this.i18n.t("agenda_title"), async () => {
        this.viewManager.activateView(MAIN_VIEW_TYPE);
      });

      // Registrar eventos
      this.taskManager.registerEvents(this);

      this.viewManager.registerViews();
      logger.info("Vistas registradas correctamente.");
    } catch (error) {
      logger.error(`Error durante la carga del plugin: ${error}`);
    }
  }

  onunload() {
    console.log('Descargando plugin Obsidian Agenda'); 
  }
}
