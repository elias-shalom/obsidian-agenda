import { App, Plugin, WorkspaceLeaf} from "obsidian";
import { I18n } from "./i18n";
import { OverviewView, OVERVIEW_VIEW_TYPE, CalendarMonthView, CALENDAR_MONTH_VIEW_TYPE, CalendarWeekView, CALENDAR_WEEK_VIEW_TYPE, 
  CalendarWorkWeekView, CALENDAR_WORK_WEEK_VIEW_TYPE, CalendarDayView, CALENDAR_DAY_VIEW_TYPE, ListView, LIST_VIEW_TYPE,
  CalendarView, CALENDAR_VIEW_TYPE, TimelineView, TIMELINE_VIEW_TYPE,
  GanttView, GANTT_VIEW_TYPE, TableView, TABLE_VIEW_TYPE } from "../views";

export class ViewManager {
  private registeredViewTypes: string[] = [];

  constructor(private plugin: Plugin, private i18n: I18n, private taskManager: any) {  }

  // Método para registrar todas las vistas
  public registerViews(): void {
    this.plugin.registerView(OVERVIEW_VIEW_TYPE, (leaf: WorkspaceLeaf) => new OverviewView(leaf, this.plugin, this.i18n, this.taskManager));
    this.registeredViewTypes.push(OVERVIEW_VIEW_TYPE);
    this.plugin.registerView(CALENDAR_MONTH_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarMonthView(leaf, this.plugin, this.i18n, this.taskManager));
    this.registeredViewTypes.push(CALENDAR_MONTH_VIEW_TYPE);
    this.plugin.registerView(CALENDAR_WEEK_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarWeekView(leaf, this.plugin, this.i18n, this.taskManager));
    this.registeredViewTypes.push(CALENDAR_WEEK_VIEW_TYPE);
    this.plugin.registerView(CALENDAR_WORK_WEEK_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarWorkWeekView(leaf, this.plugin, this.i18n, this.taskManager));
    this.registeredViewTypes.push(CALENDAR_WORK_WEEK_VIEW_TYPE);
    this.plugin.registerView(CALENDAR_DAY_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarDayView(leaf, this.plugin, this.i18n, this.taskManager));
    this.registeredViewTypes.push(CALENDAR_DAY_VIEW_TYPE);
    this.plugin.registerView(LIST_VIEW_TYPE, (leaf: WorkspaceLeaf) => new ListView(leaf, this.plugin, this.i18n, this.taskManager));
    this.registeredViewTypes.push(LIST_VIEW_TYPE);
    //this.plugin.registerView(GANTT_VIEW_TYPE, (leaf: WorkspaceLeaf) => new GanttView(leaf, this.plugin, this.i18n));
    //this.registeredViewTypes.push(GANTT_VIEW_TYPE);
    //this.plugin.registerView(CALENDAR_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarView(leaf, this.plugin, this.i18n, this.taskManager));
    //this.registeredViewTypes.push(CALENDAR_VIEW_TYPE);
    this.plugin.registerView(TABLE_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TableView(leaf, this.plugin, this.i18n));
    this.registeredViewTypes.push(TABLE_VIEW_TYPE);
    //this.plugin.registerView(TIMELINE_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TimelineView(leaf, this.plugin, this.i18n));
    //this.registeredViewTypes.push(TIMELINE_VIEW_TYPE);
  }

  // Método para activar una vista específica
  public async activateView(viewType: string, leaf?: WorkspaceLeaf): Promise<void> {
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

  unregisterViews(): void {
    // Código para eliminar las vistas registradas
    // Por ejemplo:
    this.registeredViewTypes.forEach(viewType => {
      this.plugin.app.workspace.detachLeavesOfType(viewType);
    });
  }
}