export interface AgendaPluginSettings {
  // Define your plugin settings here
  showOverviewTab: boolean;
  showTasksTab: boolean;
  showKanbanTab: boolean;
  showGanttTab: boolean;
  showCalendarTab: boolean;
  showHabitTab: boolean;
  /** Versión del plugin cuyas novedades ya se anunciaron (v1.1.13); vacío si nunca se guardó. */
  lastSeenVersion: string;
  showWhatsNewOnUpdate: boolean;
  weekStartDay: number;
  calendarShowDueDates: boolean;
  calendarShowStartDates: boolean;
  calendarShowScheduledDates: boolean;
  calendarShowCompletedTasks: boolean;
  /** Días visibles en la vista de lista del calendario (v1.1.10, §4.10): mínimo 7, máximo 14. */
  calendarListDaysToShow: number;

  // Habits settings
  habitFolderPath: string;
  habitDaysToShow: number;
  habitShowStreaks: boolean;
  habitShowSingleDaytimeLabel: boolean;
  habitDefaultMaxGap: number;
  habitDefaultPriority: number;
  habitDefaultColor: string;
  showHabitSubAreaField: boolean;
  showHabitGridTab: boolean;
  showHabitDashboardTab: boolean;
  showHabitRoutineTab: boolean;
  showHabitWeeklyTab: boolean;
  showHabitListTab: boolean;
}

export const DEFAULT_SETTINGS: AgendaPluginSettings = {
  showOverviewTab: true,
  showTasksTab: true,
  showKanbanTab: true,
  showGanttTab: true,
  showCalendarTab: true,
  showHabitTab: true,
  lastSeenVersion: "",
  showWhatsNewOnUpdate: true,
  weekStartDay: 1,
  calendarShowDueDates: true,
  calendarShowStartDates: false,
  calendarShowScheduledDates: true,
  calendarShowCompletedTasks: true,
  calendarListDaysToShow: 14,

  habitFolderPath: "daily plan/daily routine/habit",
  habitDaysToShow: 21,
  habitShowStreaks: true,
  habitShowSingleDaytimeLabel: true,
  habitDefaultMaxGap: 0,
  habitDefaultPriority: 3,
  habitDefaultColor: "",
  showHabitSubAreaField: false,
  showHabitGridTab: true,
  showHabitDashboardTab: true,
  showHabitRoutineTab: true,
  showHabitWeeklyTab: true,
  showHabitListTab: true,
};

/** v1.1.13: `showListTab` y `showTableTab` pasan a ser `showTasksTab`; solo queda apagada si ambas lo estaban. */
export function migrateTabSettings(saved: Record<string, unknown>): Partial<AgendaPluginSettings> {
  const { showListTab, showTableTab, ...rest } = saved;
  const migrated = rest as Partial<AgendaPluginSettings>;
  if (typeof migrated.showTasksTab !== "boolean") {
    migrated.showTasksTab = !(showListTab === false && showTableTab === false);
  }
  return migrated;
}