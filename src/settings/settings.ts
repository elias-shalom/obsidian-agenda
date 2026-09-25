export interface AgendaPluginSettings {
  // Define your plugin settings here
  showOverviewTab: boolean;
  showListTab: boolean;
  showTableTab: boolean;
  showCalendarTab: boolean;
  weekStartDay: number;

  // Habits settings
  habitFolderPath: string;
  habitDaysToShow: number;
  habitShowStreaks: boolean;
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

  habitFolderPath: "daily plan/daily routine/habit",
  habitDaysToShow: 21,
  habitShowStreaks: true,
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