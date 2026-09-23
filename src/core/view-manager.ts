import { Plugin, WorkspaceLeaf } from "obsidian";
import { I18n } from "./i18n";
import { TaskManager } from "./task-manager";
import { HabitManager } from "../habits";
import { AgendaPlugin } from '../types/interfaces';
import { OverviewView, OVERVIEW_VIEW_TYPE, CalendarMonthView, CALENDAR_MONTH_VIEW_TYPE, CalendarWeekView, CALENDAR_WEEK_VIEW_TYPE,
  CalendarWorkWeekView, CALENDAR_WORK_WEEK_VIEW_TYPE, CalendarDayView, CALENDAR_DAY_VIEW_TYPE, ListView, LIST_VIEW_TYPE,
  CalendarYearView, CALENDAR_YEAR_VIEW_TYPE,
  TableView, TABLE_VIEW_TYPE } from "../views";

import { HabitGridView, HABIT_GRID_VIEW_TYPE} from "../views/habit-grid-view";
import { HabitRoutineView, HABIT_ROUTINE_VIEW_TYPE} from "../views/habit-routine-view";
import { HabitWeeklyView, HABIT_WEEKLY_VIEW_TYPE} from "../views/habit-weekly-view";
import { HabitTableView, HABIT_TABLE_VIEW_TYPE} from "../views/habit-table-view";
import { HabitOverviewView, HABIT_OVERVIEW_VIEW_TYPE} from "../views/habit-overview-view";

export class ViewManager {

  constructor(private plugin: Plugin, private i18n: I18n, private taskManager: TaskManager, private habitManager: HabitManager) {  }

  // Método para registrar todas las vistas
  public registerViews(): void {
    this.plugin.registerView(OVERVIEW_VIEW_TYPE, (leaf: WorkspaceLeaf) => new OverviewView(leaf, this.plugin as AgendaPlugin, this.i18n, this.taskManager));
    this.plugin.registerView(CALENDAR_YEAR_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarYearView(leaf, this.plugin, this.i18n, this.taskManager));
    this.plugin.registerView(CALENDAR_MONTH_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarMonthView(leaf, this.plugin, this.i18n, this.taskManager));
    this.plugin.registerView(CALENDAR_WEEK_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarWeekView(leaf, this.plugin, this.i18n, this.taskManager));
    this.plugin.registerView(CALENDAR_WORK_WEEK_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarWorkWeekView(leaf, this.plugin, this.i18n, this.taskManager));
    this.plugin.registerView(CALENDAR_DAY_VIEW_TYPE, (leaf: WorkspaceLeaf) => new CalendarDayView(leaf, this.plugin, this.i18n, this.taskManager));
    this.plugin.registerView(LIST_VIEW_TYPE, (leaf: WorkspaceLeaf) => new ListView(leaf, this.plugin as AgendaPlugin, this.i18n, this.taskManager));
    this.plugin.registerView(TABLE_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TableView(leaf, this.plugin, this.i18n, this.taskManager));

    // Habit views
    this.plugin.registerView(HABIT_GRID_VIEW_TYPE, (leaf: WorkspaceLeaf) => new HabitGridView(leaf, this.plugin as AgendaPlugin, this.i18n, this.taskManager, this.habitManager));
    this.plugin.registerView(HABIT_ROUTINE_VIEW_TYPE, (leaf: WorkspaceLeaf) => new HabitRoutineView(leaf, this.plugin as AgendaPlugin, this.i18n, this.taskManager, this.habitManager));
    this.plugin.registerView(HABIT_OVERVIEW_VIEW_TYPE, (leaf: WorkspaceLeaf) => new HabitOverviewView(leaf, this.plugin as AgendaPlugin, this.i18n, this.taskManager, this.habitManager));
    this.plugin.registerView(HABIT_WEEKLY_VIEW_TYPE, (leaf: WorkspaceLeaf) => new HabitWeeklyView(leaf, this.plugin as AgendaPlugin, this.i18n, this.taskManager, this.habitManager));
    this.plugin.registerView(HABIT_TABLE_VIEW_TYPE, (leaf: WorkspaceLeaf) => new HabitTableView(leaf, this.plugin as AgendaPlugin, this.i18n, this.taskManager, this.habitManager));

    //this.plugin.registerView(TIMELINE_VIEW_TYPE, (leaf: WorkspaceLeaf) => new TimelineView(leaf, this.plugin as AgendaPlugin, this.i18n));

    //this.plugin.registerView(GANTT_VIEW_TYPE, (leaf: WorkspaceLeaf) => new GanttView(leaf, this.plugin as AgendaPlugin, this.i18n));

  }

  // Método para activar una vista específica
  public async activateView(viewType: string, leaf?: WorkspaceLeaf): Promise<void> {
    //this.plugin.app.workspace.detachLeavesOfType(viewType);
    
    if (!leaf) {
      leaf = this.plugin.app.workspace.getLeaf(true);
    } 

    await leaf.setViewState({
      type: viewType,
      active: true,
    });
    
    this.plugin.app.workspace.revealLeaf(leaf).catch(console.error);
  }

  unregisterViews(): void {
    // Código para eliminar las vistas registradas
    // Por ejemplo:
    //this.registeredViewTypes.forEach(viewType => {
      //this.plugin.app.workspace.detachLeavesOfType(viewType);
    //});
  }
}