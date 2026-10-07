import { WorkspaceLeaf, Plugin } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { WeekDayData, CalendarListViewData, AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";

export const CALENDAR_LIST_VIEW_TYPE = "calendar-list-view";

/** Vista de lista dentro del calendario (v1.1.10, §4.10/§17): una fila por día en una ventana
 * continua, 7º botón del selector segmentado. */
export class CalendarListView extends CalendarView {
  /** Inicio de la ventana mostrada; separado de `currentDate` (día seleccionado) para que un
   * clic en una fila solo resalte el día sin recentrar la ventana, igual que Mes/Semana. */
  private windowStart: DateTime | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: Plugin, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);
  }

  getViewType(): string {
    return CALENDAR_LIST_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("calendar_list_view_title");
  }

  /** Cantidad de días configurable (Settings ▸ Calendario), 7–14, por defecto 14. */
  private getDaysToShow(): number {
    const plugin = this.plugin as AgendaPlugin;
    const value = plugin.settings?.calendarListDaysToShow ?? 14;
    return Math.min(14, Math.max(7, value));
  }

  /**
   * Genera datos para la vista de lista: una ventana continua de días desde la fecha de
   * referencia, sin alinear a inicio de semana (§4.10).
   */
  protected generateViewData(): CalendarListViewData {
    const daysToShow = this.getDaysToShow();
    const localizedDayNames = this.getLocalizedDayNames();

    // Si el día seleccionado cae fuera de la ventana mostrada (p. ej. elegido desde el selector
    // de fecha o al abrir la vista), recentra la ventana en él; si ya está dentro, la ventana
    // se mantiene fija y un clic solo cambia el día resaltado (igual que Mes/Semana/Año).
    const windowEndExclusive = (this.windowStart ?? this.currentDate).plus({ days: daysToShow });
    if (this.windowStart === null || this.currentDate < this.windowStart || this.currentDate >= windowEndExclusive) {
      this.windowStart = this.currentDate;
    }

    const days: WeekDayData[] = [];
    let currentDay = this.windowStart;

    for (let i = 0; i < daysToShow; i++) {
      const dayTasks = this.getTasksForDate(currentDay);
      const dayIndex = currentDay.weekday % 7;

      days.push({
        date: currentDay,
        isToday: currentDay.hasSame(DateTime.now(), 'day'),
        isSelected: currentDay.hasSame(this.currentDate, 'day'),
        dayOfMonth: currentDay.day,
        dayOfWeek: currentDay.weekday,
        dayName: localizedDayNames[dayIndex],
        formattedDate: `${localizedDayNames[dayIndex]} ${currentDay.day}`,
        tasksForDay: dayTasks,
      });

      currentDay = currentDay.plus({ days: 1 });
    }

    const windowEnd = this.windowStart.plus({ days: daysToShow - 1 });
    const periodName = `${this.windowStart.toFormat('MMM d')} – ${windowEnd.toFormat('MMM d, yyyy')}`;

    return {
      viewType: CalendarViewType.List,
      days,
      periodName,
    };
  }

  /** Mueve la ventana completa (`daysToShow` días), no día a día (§17.4). */
  protected navigateToPrevious(): void {
    this.windowStart = (this.windowStart ?? this.currentDate).minus({ days: this.getDaysToShow() });
    this.setCurrentDate(this.windowStart);
    this.refreshView().catch(console.error);
  }

  protected navigateToNext(): void {
    this.windowStart = (this.windowStart ?? this.currentDate).plus({ days: this.getDaysToShow() });
    this.setCurrentDate(this.windowStart);
    this.refreshView().catch(console.error);
  }

  protected navigateToToday(): void {
    this.setCurrentDate(DateTime.now());
    this.refreshView().catch(console.error);
  }

  async onClose(): Promise<void> {
    await super.onClose();
  }
}
