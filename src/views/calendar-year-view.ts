import { WorkspaceLeaf, Plugin, getLanguage } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";
import { YearViewData } from '../types/interfaces';

export const CALENDAR_YEAR_VIEW_TYPE = "calendar-year-view";

export class CalendarYearView extends CalendarView {

  constructor(leaf: WorkspaceLeaf, plugin: Plugin, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);
  }

  getViewType(): string {
    return CALENDAR_YEAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("year_view_title");
  }

  getIcon(): string {
    return 'calendar-check';
  }

  protected generateViewData(): YearViewData {
    const year = this.currentDate.year;
    const today = DateTime.now();
    const locale = getLanguage() || 'en';
    const months: {
      monthName: string;
      monthAbbr: string;
      monthNumber: number;
      year: number;
      weeks: {
        days: {
          date: DateTime;
          isCurrentMonth: boolean;
          isToday: boolean;
          dayOfMonth: number;
          hasTasksDue: boolean;
          taskCount: number;
        }[];
        weekNumber: number;
      }[];
    }[] = [];

    for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
      const startOfMonth = DateTime.fromObject({ year, month: monthNumber }).startOf('month');
      const endOfMonth = startOfMonth.endOf('month');
      const startDate = startOfMonth.startOf('week');
      const endDate = endOfMonth.endOf('week');

      const weeks: {
        days: {
          date: DateTime;
          isCurrentMonth: boolean;
          isToday: boolean;
          dayOfMonth: number;
          hasTasksDue: boolean;
          taskCount: number;
        }[];
        weekNumber: number;
      }[] = [];

      let currentWeekDays: {
        date: DateTime;
        isCurrentMonth: boolean;
        isToday: boolean;
        dayOfMonth: number;
        hasTasksDue: boolean;
        taskCount: number;
      }[] = [];

      let currentDay = startDate;

      while (currentDay <= endDate) {
        const tasksForDay = this.getTasksForDate(currentDay);

        currentWeekDays.push({
          date: currentDay,
          isCurrentMonth: currentDay.month === monthNumber,
          isToday: currentDay.hasSame(today, 'day'),
          dayOfMonth: currentDay.day,
          hasTasksDue: tasksForDay.length > 0,
          taskCount: tasksForDay.length
        });

        if (currentWeekDays.length === 7) {
          weeks.push({
            days: [...currentWeekDays],
            weekNumber: currentWeekDays[0].date.weekNumber
          });
          currentWeekDays = [];
        }

        currentDay = currentDay.plus({ days: 1 });
      }

      months.push({
        monthName: startOfMonth.setLocale(locale).toFormat('MMMM'),
        monthAbbr: startOfMonth.setLocale(locale).toFormat('MMM'),  
        monthNumber,
        year,
        weeks
      });
    }

    return {
      viewType: CalendarViewType.Year,
      year,
      months,
      dayNames: this.getLocalizedDayNames(),
      periodName: String(year)
    };
  }

  protected navigateToPrevious(): void {
    this.currentDate = this.currentDate.minus({ years: 1 });
    this.refreshView().catch(console.error);
  }

  protected navigateToNext(): void {
    this.currentDate = this.currentDate.plus({ years: 1 });
    this.refreshView().catch(console.error);
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }

  protected setupViewSpecificEventListeners(container: HTMLElement, data: YearViewData): void {
  super.setupViewSpecificEventListeners(container, data);

  container.querySelectorAll<HTMLElement>('.oa-year-day-number.oa-day-has-tasks').forEach(span => {
    span.addEventListener('click', (e) => {
      e.stopPropagation(); // evita conflicto con dblclick de la celda
      const cell = span.closest<HTMLElement>('.oa-calendar-year-day');
      const dateStr = cell?.dataset.date;
      if (dateStr) this.navigateToDayView(dateStr);
    });
  });
}
}