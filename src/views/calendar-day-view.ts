import { WorkspaceLeaf } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { HourSlot } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";
import Handlebars from 'handlebars';

export const CALENDAR_DAY_VIEW_TYPE = "calendar-day-view";

export class CalendarDayView extends CalendarView {

  constructor(leaf: WorkspaceLeaf, plugin: any, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);

  }

  getViewType(): string {
    return CALENDAR_DAY_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("day_view_title");
  }

  getIcon(): string {
    return 'calendar-check';
  }

 /**
   * Genera datos para la vista mensual del calendario
   */
  protected generateViewData(): any {
    const dayTasks = this.getTasksForDate(this.currentDate);
        
      // Organizar tareas por hora (24 horas)
      const hourSlots: HourSlot[] = [];
      for (let hour = 0; hour < 24; hour++) {
        // Filtrar tareas para esta hora específica
        const hourTasks = dayTasks.filter(task => {
          if (!task.dueDate) return false;
          
          // Convertir a DateTime si es string
          const taskDate = typeof task.dueDate === 'string'
            ? DateTime.fromISO(task.dueDate)
            : task.dueDate;
            
          // Verificar si la tarea es para esta hora
          return taskDate.hour === hour;
        });
        
        hourSlots.push({
          hour,
          formattedHour: this.formatHour(hour),
          tasks: hourTasks
        });
      }
      
      return {
        viewType: CalendarViewType.Day,
        date: this.currentDate,
        weekday: this.currentDate.weekday,
        dayName: this.currentDate.toFormat('cccc'), // Nombre completo del día
        tasksForDay: dayTasks,
        hourSlots: hourSlots,
        periodName: this.currentDate.toFormat('EEEE, MMMM d, yyyy')
      };
  }

  protected navigateToPrevious(): void {
    this.currentDate = this.currentDate.minus({ days: 1 });
    this.refreshView();
  }

  protected navigateToNext(): void {
    this.currentDate = this.currentDate.plus({ days: 1 });
    this.refreshView();
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}