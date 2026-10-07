export interface AgendaPluginSettings {
  // Define your plugin settings here
  showOverviewTab: boolean;
  showListTab: boolean;
  showTableTab: boolean;
  showCalendarTab: boolean;
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
  showListTab: true,
  showTableTab: true,
  showCalendarTab: true,
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