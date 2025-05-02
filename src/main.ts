import { App, Plugin } from "obsidian";
import { ViewManager } from "./core/view-manager";
import { I18n } from "./core/i18n";

export default class ObsidianAgenda extends Plugin {
  private viewManager: ViewManager;
  private i18n: I18n;
  
  /// Constructor de la clase ObsidianAgendaPlugin.
  constructor(app: App, manifest: any) {
      super(app, manifest);
      this.i18n = new I18n(app);
      this.viewManager = new ViewManager(this, this.i18n); // Pasar la instancia del plugin
  }

  /// Método de inicializa del plugin.
  async onload(): Promise<void> {
    const MAIN_VIEW_TYPE = 'main-view';

    // Leer el contenido del archivo CSS y agregarlo al DOM
    const cssPath = this.app.vault.adapter.getResourcePath('.obsidian/plugins/obsidian-agenda/styles/styles.css');
    const response = await fetch(cssPath);

    if (response.ok) {
      const cssContent = await response.text();
      const style = document.createElement("style");
      style.textContent = cssContent;
      document.head.appendChild(style);
      console.log("Archivo CSS cargado correctamente.");
    } else {
      console.error("Error al cargar el archivo CSS:", response.statusText);
    }

     // Cargar idioma (puedes usar una configuración o detectar el idioma del sistema)
     await this.i18n.loadLanguage("es");

    this.addRibbonIcon("calendar-check", this.i18n.t("agenda_title"), async () => {
      this.viewManager.activateView(MAIN_VIEW_TYPE);
    });

    this.viewManager.registerViews();
  }

  onunload() {
    console.log('Descargando mi plugin');
    // Limpiar recursos si es necesario
  }
}
