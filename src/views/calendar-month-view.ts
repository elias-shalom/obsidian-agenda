import { WorkspaceLeaf, Plugin} from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";

import { MonthViewData } from '../types/interfaces';
export const CALENDAR_MONTH_VIEW_TYPE = "calendar-month-view";

export class CalendarMonthView extends CalendarView {

  constructor(leaf: WorkspaceLeaf, plugin: Plugin, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);
  }

  getViewType(): string {
    return CALENDAR_MONTH_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("month_view_title");
  }

  getIcon(): string {
    return 'calendar-check';
  }

  /**
   * Genera datos para la vista mensual del calendario
   */
  protected generateViewData(): MonthViewData {
    const startOfMonth = this.currentDate.startOf('month');
    const endOfMonth = this.currentDate.endOf('month');
    
    // Comienza desde el primer día de la semana que contiene el primer día del mes
    let startDate = startOfMonth.startOf('week');
    
    // Termina en el último día de la semana que contiene el último día del mes
    let endDate = endOfMonth.endOf('week');
    
    // Define el tipo de datos para los días
    type DayData = {
      date: DateTime;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayOfMonth: number;
      tasksForDay: ITask[];
    };
    
    // Define el tipo para una semana con su número
    type WeekData = {
      days: DayData[];
      weekNumber: number;
    };
    
    // Genera el array de fechas
    const weeks: WeekData[] = [];
    let currentWeekDays: DayData[] = [];
    let currentDay = startDate;
    
    while (currentDay <= endDate) {
      // Añade los datos del día
      const dayData: DayData = {
        date: currentDay,
        isCurrentMonth: currentDay.month === startOfMonth.month,
        isToday: currentDay.hasSame(DateTime.now(), 'day'),
        dayOfMonth: currentDay.day,
        tasksForDay: this.getTasksForDate(currentDay)
      };
      
      currentWeekDays.push(dayData);
      
      // Comienza una nueva semana si hemos llegado al final de una semana
      if (currentWeekDays.length === 7) {
        // Obtiene el número de semana del primer día de la semana
        const weekNumber = currentWeekDays[0].date.weekNumber;
        
        // Añade la semana completa con su número
        weeks.push({
          days: [...currentWeekDays],
          weekNumber: weekNumber
        });
        
        currentWeekDays = [];
      }
      
      // Avanza al siguiente día
      currentDay = currentDay.plus({ days: 1 });
    }
    
    return {
      viewType: CalendarViewType.Month,
      weeks: weeks,
      monthName: startOfMonth.toFormat('MMMM yyyy'),
      dayNames: this.getLocalizedDayNames(),
      periodName: startOfMonth.toFormat('MMMM yyyy')
    };
  }

  protected navigateToPrevious(): void {
    this.currentDate = this.currentDate.minus({ months: 1 });
    this.refreshView().catch(console.error);
  }

  protected navigateToNext(): void {
    this.currentDate = this.currentDate.plus({ months: 1 });
    this.refreshView().catch(console.error);
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}