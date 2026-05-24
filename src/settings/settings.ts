export interface AgendaPluginSettings {
  // Define your plugin settings here
  showOverviewTab: boolean;
  showListTab: boolean;
  showTableTab: boolean;
  showCalendarTab: boolean;
}

export const DEFAULT_SETTINGS: AgendaPluginSettings = {
  showOverviewTab: true,
  showListTab: true,
  showTableTab: true,
  showCalendarTab: true,
};