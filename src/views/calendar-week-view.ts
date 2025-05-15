import { WorkspaceLeaf } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";
import Handlebars from 'handlebars';

export const CALENDAR_WEEK_VIEW_TYPE = "calendar-week-view";

export class CalendarWeekView extends CalendarView {

  constructor(leaf: WorkspaceLeaf, plugin: any, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);

  }

  getViewType(): string {
    return CALENDAR_WEEK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("week_view_title");
  }

  getIcon(): string {
    return 'calendar-check';
  }

 /**
   * Genera datos para la vista mensual del calendario
   */
  protected generateViewData(workWeekOnly: boolean = false): any {
    // Ajustar la semana actual según la fecha seleccionada
       const startOfWeek = this.currentDate.startOf('week');
       
       // Para la vista de semana laboral, comenzamos en lunes (weekday 1 en Luxon)
       const weekStartDate = workWeekOnly 
         ? startOfWeek.plus({ days: 1 }) // Comenzar en lunes (Luxon: domingo=0, lunes=1)
         : startOfWeek;
       
       const daysToGenerate = workWeekOnly ? 5 : 7;
       
       // Define a type for day data
       type WeekDayData = {
         date: DateTime;
         isToday: boolean;
         dayOfweek: number;
         dayOfWeek: number;
         dayName: string;
         formattedDate: string;
         tasksForDay: ITask[];
       };
       
       // Prepara los datos de los días
       const days: WeekDayData[] = [];
       let currentDay = weekStartDate;
       
       for (let i = 0; i < daysToGenerate; i++) {
         const dayTasks = this.getTasksForDate(currentDay);
         
         days.push({
           date: currentDay,
           isToday: currentDay.hasSame(DateTime.now(), 'day'),
           dayOfweek: currentDay.day,
           dayOfWeek: currentDay.weekday,
           dayName: currentDay.toFormat('ccc'),
           formattedDate: currentDay.toFormat('ccc d'),
           tasksForDay: dayTasks
         });
         
         currentDay = currentDay.plus({ days: 1 });
       }
       
       // Calcular el nombre del periodo (rango de fechas)
       const weekEnd = weekStartDate.plus({ days: daysToGenerate - 1 });
       const periodName = `${weekStartDate.toFormat('MMM d')} - ${weekEnd.toFormat('MMM d, yyyy')}`;
       
       return {
         viewType: workWeekOnly ? CalendarViewType.WorkWeek : CalendarViewType.Week,
         weekNumber: weekStartDate.weekNumber,
         days: days,
         dayNames: workWeekOnly 
           ? this.getLocalizedDayNames().slice(1, 6) // Solo lunes a viernes
           : this.getLocalizedDayNames(),
         periodName: periodName,
         workWeekOnly: workWeekOnly
       };
  }

  protected navigateToPrevious(): void {
    this.currentDate = this.currentDate.minus({ weeks: 1 });
    this.refreshView();
  }

  protected navigateToNext(): void {
    this.currentDate = this.currentDate.plus({ weeks: 1 });
    this.refreshView();
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}