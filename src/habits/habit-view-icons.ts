// Íconos Lucide de los botones circulares del selector de subvistas de hábitos (v1.1.15, HU1), uno por subvista,
// análogo a CALENDAR_VIEW_BUTTON_ICONS del calendario. La clave es el `data-habit-subtype` de la plantilla.
export const HABIT_VIEW_BUTTON_ICONS: Readonly<Record<string, string>> = {
  dashboard: 'layout-dashboard',
  routine: 'sunrise',
  weekly: 'calendar-check-2',
  grid: 'layout-grid',
  table: 'list-checks',
};
