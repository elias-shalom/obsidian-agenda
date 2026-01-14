import { WorkspaceLeaf, Plugin } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { HourSlot, MiniCalendarDay, DayViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";

export const CALENDAR_DAY_VIEW_TYPE = "calendar-day-view";

export class CalendarDayView extends CalendarView {
  // Añadir una propiedad para rastrear el mes mostrado en el mini calendario
  private miniCalendarMonth: DateTime;
  
  constructor(leaf: WorkspaceLeaf, plugin: Plugin, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);
    // Inicializar el mes del mini calendario con la fecha actual
    this.miniCalendarMonth = this.currentDate;
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
   * Genera datos para la vista diaria del calendario
   */
  protected generateViewData(): DayViewData {
    const dayTasks = this.getTasksForDate(this.currentDate);

    // Organizar tareas por hora (24 horas)
    const hourSlots: HourSlot[] = [];
    for (let hour = 0; hour < 24; hour++) {
      // Filtrar tareas para esta hora específica
      const hourTasks = dayTasks.filter(task => {
        if (!task.date.due) return false;
        
        // Convertir a DateTime si es string
        const taskDate = typeof task.date.due === 'string'
          ? DateTime.fromISO(task.date.due)
          : task.date.due;
          
        // Verificar si la tarea es para esta hora
        return taskDate.hour === hour;
      });
      
      hourSlots.push({
        hour,
        formattedHour: this.formatHour(hour),
        tasks: hourTasks
      });
    }
    
    // Generar datos del mini calendario usando el mes almacenado
    const miniCalendar = this.generateMiniCalendarData(this.miniCalendarMonth);
    
    return {
      viewType: CalendarViewType.Day,
      date: this.currentDate,
      weekday: this.currentDate.weekday,
      dayName: this.currentDate.toFormat('cccc'), // Nombre completo del día
      isToday: this.currentDate.hasSame(DateTime.now(), 'day'),
      tasksForDay: dayTasks,
      hourSlots: hourSlots,
      periodName: this.currentDate.toFormat('EEEE, MMMM d, yyyy'),
      miniCalendar: miniCalendar
    };
  }

  /**
   * Genera datos para el mini calendario
   * Optimizado para rendimiento
   */
  private generateMiniCalendarData(currentDate: DateTime) {
    const today = DateTime.now().startOf('day');
    const firstOfMonth = currentDate.startOf('month');
    const lastOfMonth = currentDate.endOf('month');
    
    // Día de la semana del primer día del mes (0-6, donde 0 es domingo en ISO)
    let firstDayOfWeek = firstOfMonth.weekday % 7;
    // Ajustar para que la semana comience en lunes (1-7)
    if (firstDayOfWeek === 0) firstDayOfWeek = 7;
    
    // Nombres cortos de los días de la semana
    const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    
    // OPTIMIZACIÓN: Precalcular fechas con tareas usando un Set
    const datesWithTasks = new Set<string>();
    
    // Solo procesar una vez las tareas
    this.tasks.forEach(task => {
      if (task.date.due) {
        let dateString: string | undefined;
        if (typeof task.date.due === 'string') {
          // Type guard ensures split is called only on string
          dateString = (task.date.due as string).split('T')[0]; // Extraer solo la parte de la fecha
        } else if (task.date.due instanceof Date) {
          const isoDate = DateTime.fromJSDate(task.date.due).toISODate();
          if (isoDate !== null) {
            dateString = isoDate;
          }
        } else if (task.date.due && typeof task.date.due === 'object' && 'toISODate' in task.date.due) {
          const isoDate = task.date.due.toISODate();
          if (isoDate !== null) {
            dateString = isoDate;
          }
        }
        
        if (dateString) datesWithTasks.add(dateString);
      }
      
      // También considerar fechas programadas si existen
      if (task.date.scheduled) {
        let dateString: string | undefined;
        if (typeof task.date.scheduled === 'string') {
          dateString = (task.date.scheduled as string).split('T')[0];
        } else if (task.date.scheduled instanceof Date) {
          const isoDate = DateTime.fromJSDate(task.date.scheduled).toISODate();
          if (isoDate !== null) {
            dateString = isoDate;
          }
        } else if (task.date.scheduled && typeof task.date.scheduled === 'object' && 'toISODate' in task.date.scheduled) {
          const isoDate = task.date.scheduled.toISODate();
          if (isoDate !== null) {
            dateString = isoDate;
          }
        }
          
        if (dateString) datesWithTasks.add(dateString);
      }
    });
    
    // OPTIMIZACIÓN: Minimizar creación de objetos DateTime
    // Preparar strings base para las fechas
    const currentMonthStr = currentDate.toFormat('yyyy-MM');
    const prevMonthStr = firstOfMonth.minus({ months: 1 }).toFormat('yyyy-MM');
    const nextMonthStr = firstOfMonth.plus({ months: 1 }).toFormat('yyyy-MM');
    
    // Generar matriz para el calendario
    const weeks: MiniCalendarDay[][] = [];
    let currentWeek: MiniCalendarDay[] = [];
    
    // Días del mes anterior para completar la primera semana
    const daysInPrevMonth = firstOfMonth.minus({ months: 1 }).daysInMonth || 30;
    
    for (let i = 1; i < firstDayOfWeek; i++) {
      const day = daysInPrevMonth - firstDayOfWeek + i + 1;
      const paddedDay = day.toString().padStart(2, '0');
      const dateStr = `${prevMonthStr}-${paddedDay}`;
      
      currentWeek.push({
        day,
        date: dateStr,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        hasTasks: datesWithTasks.has(dateStr)
      });
    }
    
    // Días del mes actual
    const daysInMonth = lastOfMonth.day;
    for (let day = 1; day <= daysInMonth; day++) {
      const paddedDay = day.toString().padStart(2, '0');
      const dateStr = `${currentMonthStr}-${paddedDay}`;
      
      // Optimización: evitar crear objetos DateTime innecesarios
      const isToday = today.toISODate() === dateStr;
      const isSelected = currentDate.day === day && currentDate.month === firstOfMonth.month;
      
      currentWeek.push({
        day,
        date: dateStr,
        isCurrentMonth: true,
        isToday,
        isSelected,
        hasTasks: datesWithTasks.has(dateStr)
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Días del mes siguiente para completar la última semana
    if (currentWeek.length > 0) {
      let day = 1;
      while (currentWeek.length < 7) {
        const paddedDay = day.toString().padStart(2, '0');
        const dateStr = `${nextMonthStr}-${paddedDay}`;
        
        currentWeek.push({
          day,
          date: dateStr,
          isCurrentMonth: false,
          isToday: false,
          isSelected: false,
          hasTasks: datesWithTasks.has(dateStr)
        });
        day++;
      }
      weeks.push(currentWeek);
    }
    
    return {
      monthName: currentDate.toFormat('MMMM yyyy'),
      weekdays,
      weeks
    };
  }

  /**
   * Navega al mes anterior en el mini calendario
   */
  private navigateToPreviousMonth(): void {
    this.miniCalendarMonth = this.miniCalendarMonth.minus({ months: 1 });
    this.refreshView().catch(console.error);
  }

  /**
   * Navega al mes siguiente en el mini calendario
   */
  private navigateToNextMonth(): void {
    this.miniCalendarMonth = this.miniCalendarMonth.plus({ months: 1 });
    this.refreshView().catch(console.error);
  }

  protected navigateToPrevious(): void {
    this.currentDate = this.currentDate.minus({ days: 1 });
    this.miniCalendarMonth = this.currentDate; // Sincronizar el mes del mini calendario
    this.refreshView().catch(console.error);
  }

  protected navigateToNext(): void {
    this.currentDate = this.currentDate.plus({ days: 1 });
    this.miniCalendarMonth = this.currentDate; // Sincronizar el mes del mini calendario
    this.refreshView().catch(console.error);
  }
  
  protected navigateToToday(): void {
    this.currentDate = DateTime.now();
    this.miniCalendarMonth = this.currentDate; // Sincronizar el mes del mini calendario
    this.refreshView().catch(console.error);
  }

  /**
   * Configura event listeners específicos para esta vista
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, data: DayViewData): void {
    // Ejecutar event listeners comunes primero
    super.setupViewSpecificEventListeners(container, data);
    
    // Añadir event listeners para los días del mini calendario
    const miniDays = container.querySelectorAll('.calendar-mini-day');
    miniDays.forEach(day => {
      day.addEventListener('click', (e) => {
        const dateStr = day.getAttribute('data-date');
        if (dateStr) {
          // Cambiar a la fecha seleccionada
          this.currentDate = DateTime.fromISO(dateStr);
          // Actualizar también el mes del mini calendario
          this.miniCalendarMonth = this.currentDate;
          this.refreshView().catch(console.error);
        }
      });
    });
    
    // Añadir event listeners para los botones de navegación del mini calendario
    const miniPrevButton = container.querySelector('.mini-calendar-prev');
    const miniNextButton = container.querySelector('.mini-calendar-next');
    
    if (miniPrevButton) {
      miniPrevButton.addEventListener('click', () => {
        this.navigateToPreviousMonth();
      });
    }
    
    if (miniNextButton) {
      miniNextButton.addEventListener('click', () => {
        this.navigateToNextMonth();
      });
    }
  }

  async onClose(): Promise<void> {
    // Limpiar event listeners específicos
    //this.contentEl.off('click', '.calendar-mini-day');
  }
}