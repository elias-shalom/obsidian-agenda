import { App, Plugin, WorkspaceLeaf} from "obsidian";
import { MainView, MAIN_VIEW_TYPE } from "../views/main-view";
import { MonthView, MONTH_VIEW_TYPE } from "../views/month-view";
import { WeekView, WEEK_VIEW_TYPE } from "../views/week-view";
import { DayView, DAY_VIEW_TYPE } from "../views/day-view";
import { I18n } from "./i18n";

export class ViewManager {
  private plugin: Plugin;
  private i18n: I18n;

  constructor(plugin: Plugin, i18n: I18n) {
    this.i18n = i18n;
    this.plugin = plugin;

  }

  // Método para registrar todas las vistas
  public registerViews(): void {    
    this.plugin.registerView(MAIN_VIEW_TYPE, (leaf: WorkspaceLeaf) => new MainView(leaf, this.plugin, this.i18n));
    this.plugin.registerView(MONTH_VIEW_TYPE, (leaf: WorkspaceLeaf) => new MonthView(leaf, this.plugin));
    this.plugin.registerView(WEEK_VIEW_TYPE, (leaf: WorkspaceLeaf) => new WeekView(leaf, this.plugin));
    this.plugin.registerView(DAY_VIEW_TYPE, (leaf: WorkspaceLeaf) => new DayView(leaf, this.plugin));
  }

  // Método para activar una vista específica
  public async activateView(viewType: string, leaf?: WorkspaceLeaf): Promise<void> {
    console.log(`Activando vista: ${viewType}`);
    this.plugin.app.workspace.detachLeavesOfType(viewType);

    if (!leaf) {
      leaf = this.plugin.app.workspace.getLeaf(true);
    } 

    await leaf.setViewState({
      type: viewType,
      active: true,
    });
    this.plugin.app.workspace.revealLeaf(leaf);
  }
}