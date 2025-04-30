import { App, Plugin } from "obsidian";
import { ViewManager } from "./core/view-manager";

export default class ObsidianAgenda extends Plugin {
  private viewManager: ViewManager;
  
  /// <summary>
  /// Constructor de la clase ObsidianAgendaPlugin.
  constructor(app: App, manifest: any) {
      super(app, manifest);
      this.viewManager = new ViewManager(this); // Pasar la instancia del plugin
  }

  /// <summary>
  /// Método de inicializa del plugin.
  async onload(): Promise<void> {
    const MAIN_VIEW_TYPE = 'main-view';

    this.addRibbonIcon("calendar-check", "Agenda", async () => {
      this.viewManager.activateView(MAIN_VIEW_TYPE);
    });

    this.viewManager.registerViews();
  }

  onunload() {
    console.log('Descargando mi plugin');
    // Limpiar recursos si es necesario
  }

}
