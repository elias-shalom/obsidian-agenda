import { WorkspaceLeaf, Plugin, setIcon } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { HourSlot, DayViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";
import { upsertScheduledTime } from "../core/task-line-fields";
import { CalendarDatePicker } from "../core/calendar-date-picker";

export const CALENDAR_DAY_VIEW_TYPE = "calendar-day-view";

/** Clave de persistencia del colapso del sidebar del selector de fecha (v1.1.9). */
const SIDEBAR_COLLAPSED_KEY = 'calendar_day_sidebar_collapsed';

export class CalendarDayView extends CalendarView {
  constructor(leaf: WorkspaceLeaf, plugin: Plugin, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);
  }

  getViewType(): string {
    return CALENDAR_DAY_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("day_view_title");
  }

  /**
   * Genera datos para la vista diaria del calendario
   */
  protected generateViewData(): DayViewData {
    const dayTasks = this.getTasksForDate(this.currentDate);

    // Tareas ancladas por `scheduled` con hora asignada -> franjas horarias (modo punto/bloque, ADR-T2)
    const scheduledWithTime = dayTasks.filter(task => task.calendarDateType === 'scheduled' && task.date.scheduledTime);
    // Todo-el-día: due/start (siempre día completo, ADR-T1) y scheduled sin hora (caso límite)
    const allDayDue = dayTasks.filter(task => task.calendarDateType === 'due');
    const allDayStart = dayTasks.filter(task => task.calendarDateType === 'start');
    const allDayScheduled = dayTasks.filter(task => task.calendarDateType === 'scheduled' && !task.date.scheduledTime);

    // Organizar tareas programadas por hora (24 horas)
    const hourSlots: HourSlot[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourTasks = scheduledWithTime.filter(task => task.date.scheduled?.hour === hour);
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
      isToday: this.currentDate.hasSame(DateTime.now(), 'day'),
      tasksForDay: dayTasks,
      hourSlots: hourSlots,
      allDayDue,
      allDayStart,
      allDayScheduled,
      periodName: this.currentDate.toFormat('EEEE, MMMM d, yyyy'),
      sidebarCollapsed: this.app.loadLocalStorage(SIDEBAR_COLLAPSED_KEY) === 'true',
    };
  }

  protected navigateToPrevious(): void {
    this.setCurrentDate(this.currentDate.minus({ days: 1 }));
    this.refreshView().catch(console.error);
  }

  protected navigateToNext(): void {
    this.setCurrentDate(this.currentDate.plus({ days: 1 }));
    this.refreshView().catch(console.error);
  }
  
  protected navigateToToday(): void {
    this.setCurrentDate(DateTime.now());
    this.refreshView().catch(console.error);
  }

  /**
   * Configura event listeners específicos para esta vista
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, data: DayViewData): void {
    // Ejecutar event listeners comunes primero
    super.setupViewSpecificEventListeners(container, data);

    // Selector de fecha compartido (v1.1.9, §4.6.6): modo docked, siempre visible, sin botón de apertura.
    const datePickerContainer = container.querySelector<HTMLElement>('.oa-date-picker-docked');
    if (datePickerContainer) {
      const picker = new CalendarDatePicker({
        i18n: this.i18n,
        selectedDate: this.currentDate,
        getWeekStartDay: () => this.getWeekStartDay(),
        getLocalizedDayNames: () => this.getLocalizedDayNames(),
        hasTasks: (date) => this.getTasksForDate(date).length > 0,
        onSelect: (date) => {
          this.setCurrentDate(date);
          this.refreshCalendar().catch(console.error);
        },
      });
      picker.mount(datePickerContainer);
    }

    // Colapsar el sidebar del selector de fecha hacia la derecha (preferencia persistida, v1.1.9).
    const sidebarToggle = container.querySelector<HTMLButtonElement>('.oa-calendar-sidebar-toggle');
    sidebarToggle?.addEventListener('click', () => {
      const collapsed = this.app.loadLocalStorage(SIDEBAR_COLLAPSED_KEY) === 'true';
      this.app.saveLocalStorage(SIDEBAR_COLLAPSED_KEY, String(!collapsed));
      this.refreshCalendar().catch(console.error);
    });
    const sidebarToggleIcon = data.sidebarCollapsed ? 'chevron-left' : 'chevron-right';
    if (sidebarToggle) setIcon(sidebarToggle, sidebarToggleIcon);

    // Sección "Todo el día": colapsada por defecto (D10)
    const alldayToggle = container.querySelector<HTMLButtonElement>('.oa-calendar-allday-toggle');
    const alldayContainer = container.querySelector<HTMLElement>('.oa-calendar-allday');
    alldayToggle?.addEventListener('click', () => {
      if (!alldayContainer) return;
      const nowExpanded = !alldayContainer.hasClass('oa-expanded');
      alldayContainer.toggleClass('oa-expanded', nowExpanded);
      alldayToggle.setAttribute('aria-expanded', String(nowExpanded));
    });

    // Drag and drop (v1.1.4, Fase D): arrastrar una tarea programada a otra franja horaria
    // cambia su hora de `scheduled`, preservando los minutos originales dentro de la hora.
    // Doble clic en una franja vacía crea una tarea con fecha + hora prellenadas (v1.1.9, fix).
    const hourSlots = container.querySelectorAll<HTMLElement>('.oa-calendar-hour-slot');
    hourSlots.forEach(slot => {
      slot.addEventListener('dblclick', (e) => {
        if ((e.target as HTMLElement).closest('.oa-calendar-task')) return;

        const hourStr = slot.dataset.hour;
        if (hourStr === undefined) return;
        const hour = Number(hourStr);
        if (Number.isNaN(hour)) return;

        const dateStr = this.currentDate.toISODate();
        if (!dateStr) return;
        this.openCreateTaskForDate(dateStr, `${String(hour).padStart(2, '0')}:00`);
      });

      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.addClass('oa-calendar-drop-target');
      });

      slot.addEventListener('dragleave', () => {
        slot.removeClass('oa-calendar-drop-target');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.removeClass('oa-calendar-drop-target');
        this.handleHourSlotDrop(e, slot.dataset.hour);
      });
    });

    // Doble clic en la sección "Todo el día" crea una tarea sin hora (v1.1.9, fix).
    const alldayContent = container.querySelector<HTMLElement>('.oa-calendar-allday-content');
    alldayContent?.addEventListener('dblclick', (e) => {
      if ((e.target as HTMLElement).closest('.oa-calendar-task')) return;
      const dateStr = this.currentDate.toISODate();
      if (dateStr) this.openCreateTaskForDate(dateStr);
    });
  }

  /** Aplica el drop de una tarea programada sobre una franja horaria: reescribe su hora (🕐). */
  private handleHourSlotDrop(event: DragEvent, hourStr: string | undefined): void {
    if (hourStr === undefined) return;
    const payload = this.parseTaskDragPayload(event);
    if (!payload || payload.calendarDateType !== 'scheduled') return;

    const hour = Number(hourStr);
    if (Number.isNaN(hour)) return;

    const minutes = payload.scheduledTime?.split(':')[1] ?? '00';
    const newTime = `${String(hour).padStart(2, '0')}:${minutes}`;

    this.taskWriter.updateTaskLine(payload.filePath, payload.lineNumber, (line) => {
      const result = upsertScheduledTime(line, newTime);
      return result.ok ? result.line : line;
    })
      .then(ok => {
        if (ok) this.refreshView().catch(console.error);
      })
      .catch(console.error);
  }

  async onClose(): Promise<void> {
    await super.onClose();
  }
}