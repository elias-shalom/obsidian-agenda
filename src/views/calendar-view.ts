import { WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, HourSlot } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import Handlebars from 'handlebars';
import { CalendarViewType } from '../types/enums';

export const CALENDAR_VIEW_TYPE = 'calendar-view';

export class CalendarView extends BaseView {
  private tasks: ITask[] = []; 
  private currentDate: DateTime = DateTime.now();
  private viewType: CalendarViewType = CalendarViewType.Month;
  
  constructor(leaf: WorkspaceLeaf, private plugin: any, private i18n: I18n, private taskManager: TaskManager) {
    super(leaf);
  }

  getViewType(): string {
    return CALENDAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("calendar_view_title");
  }

  getIcon(): string {
    return 'calendar-check';
  }

  async onOpen(): Promise<void> {
    // Intentar recuperar la preferencia de vista del usuario
    const savedViewType = localStorage.getItem('calendar_view_type');
    if (savedViewType && Object.values(CalendarViewType).includes(savedViewType as CalendarViewType)) {
      this.viewType = savedViewType as CalendarViewType;
    }
    
    this.tasks = await this.getAllTasks(this.taskManager);
    await this.refreshView();
  }

  private async refreshView(): Promise<void> {
    // Preparamos los datos según el tipo de vista actual
    let calendarData;
    
    switch (this.viewType) {
      case CalendarViewType.Month:
        calendarData = this.generateMonthData();
        break;
      case CalendarViewType.Week:
        calendarData = this.generateWeekData(false);
        break;
      case CalendarViewType.WorkWeek:
        calendarData = this.generateWeekData(true);
        break;
      case CalendarViewType.Day:
        calendarData = this.generateDayData();
        break;
      default:
        calendarData = this.generateMonthData();
    }
    
    const viewData = {
      tasks: this.tasks,
      currentDate: this.currentDate,
      calendar: calendarData,
      viewType: this.viewType
    };
    
    await this.render(CALENDAR_VIEW_TYPE, viewData, this.i18n, this.plugin, this.leaf);
  }

  /**
   * Genera datos para la vista mensual del calendario
   */
  private generateMonthData(): any {
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

  /**
   * Genera datos para la vista semanal o de semana laboral
   * @param workWeekOnly Si es true, genera solo días laborables (lunes a viernes)
   */
  private generateWeekData(workWeekOnly: boolean = false): any {
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
      dayOfMonth: number;
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
        dayOfMonth: currentDay.day,
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

  /**
   * Genera datos para la vista diaria
   */
  private generateDayData(): any {
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

  /**
   * Formatea una hora en formato 12 horas con AM/PM
   */
  private formatHour(hour: number): string {
    // Usar Luxon para formatear la hora
    return DateTime.fromObject({ hour }).toFormat('h a');
  }

  /**
   * Obtiene los nombres localizados de los días de la semana
   */
  private getLocalizedDayNames(): string[] {
    return [
      this.i18n.t('day_sun'),
      this.i18n.t('day_mon'),
      this.i18n.t('day_tue'),
      this.i18n.t('day_wed'),
      this.i18n.t('day_thu'),
      this.i18n.t('day_fri'),
      this.i18n.t('day_sat')
    ];
  }

  /**
   * Gets tasks for a specific date
   */
  private getTasksForDate(date: DateTime): ITask[] {
    return this.tasks.filter(task => {
      if (!task.dueDate) return false;
      
      // Convertir a DateTime si es string
      const taskDate = typeof task.dueDate === 'string' 
        ? DateTime.fromISO(task.dueDate) 
        : task.dueDate;
      
      return taskDate.hasSame(date, 'day');
    });
  }

  /**
   * Cambia el tipo de vista y refresca la visualización
   */
  private changeViewType(newViewType: CalendarViewType): void {
    this.viewType = newViewType;
    
    // Guardar preferencia del usuario
    localStorage.setItem('calendar_view_type', newViewType);
    
    this.refreshView();
  }

  /**
   * Navega al período anterior según el tipo de vista actual
   */
  private navigateToPrevious(): void {
    switch (this.viewType) {
      case CalendarViewType.Month:
        this.currentDate = this.currentDate.minus({ months: 1 });
        break;
      case CalendarViewType.Week:
      case CalendarViewType.WorkWeek:
        this.currentDate = this.currentDate.minus({ weeks: 1 });
        break;
      case CalendarViewType.Day:
        this.currentDate = this.currentDate.minus({ days: 1 });
        break;
    }
    this.refreshView();
  }

  /**
   * Navega al período siguiente según el tipo de vista actual
   */
  private navigateToNext(): void {
    switch (this.viewType) {
      case CalendarViewType.Month:
        this.currentDate = this.currentDate.plus({ months: 1 });
        break;
      case CalendarViewType.Week:
      case CalendarViewType.WorkWeek:
        this.currentDate = this.currentDate.plus({ weeks: 1 });
        break;
      case CalendarViewType.Day:
        this.currentDate = this.currentDate.plus({ days: 1 });
        break;
    }
    this.refreshView();
  }

  /**
   * Sobrescribe el método de BaseView para registrar helpers específicos de CalendarView
   * @param i18n Instancia de I18n para la internacionalización
   */
  protected registerViewSpecificHelpers(i18n: any): void {
    // Register calendar-specific helpers
    Handlebars.registerHelper('formatDateHeader', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toFormat('ccc d');
      }
      return date.toFormat('ccc d');
    });

    Handlebars.registerHelper('formatMonth', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toFormat('MMMM yyyy');
      }
      return date.toFormat('MMMM yyyy');
    });
    
    // Helper para formatear hora en 12H usando Luxon
    Handlebars.registerHelper('formatHour', (hour) => {
      return DateTime.fromObject({ hour }).toFormat('h a');
    });
    
    // Helper para formatear fecha completa
    Handlebars.registerHelper('formatFullDate', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toFormat('EEEE, MMMM d, yyyy');
      }
      return date.toFormat('EEEE, MMMM d, yyyy');
    });
    
    // Helper para comparar valores (útil para condiciones en plantillas)
    Handlebars.registerHelper('equals', function(arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('toISODate', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toISODate();
      }
      return date.toISODate();
    });
  }

  /**
   * Sobrescribe el método de BaseView para implementar event listeners específicos de CalendarView
   * @param container Contenedor donde se aplican los listeners
   * @param data Datos utilizados para renderizar la vista
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, data: any): void {
    // Add event listeners for navigation buttons
    const prevButton = container.querySelector('.calendar-prev');
    const nextButton = container.querySelector('.calendar-next');
    const todayButton = container.querySelector('.calendar-today');
    const viewTypeSelect = container.querySelector('.calendar-view-type') as HTMLSelectElement;
    
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        this.navigateToPrevious();
      });
    }
    
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        this.navigateToNext();
      });
    }
    
    if (todayButton) {
      todayButton.addEventListener('click', () => {
        this.currentDate = DateTime.now();
        this.refreshView();
      });
    }
    
    // Event listener para el selector de tipo de vista
    if (viewTypeSelect) {
      // Establecer el valor actual
      viewTypeSelect.value = this.viewType;
      
      viewTypeSelect.addEventListener('change', () => {
        this.changeViewType(viewTypeSelect.value as CalendarViewType);
      });
    }

    // Add event listeners for task items to open task details
    const taskItems = container.querySelectorAll('.calendar-task');
    taskItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const filePath = target.getAttribute('data-file-path');
        const lineNumber = target.getAttribute('data-line-number');
        
        if (filePath) {
          this.openTaskFile(filePath, lineNumber ? parseInt(lineNumber) : undefined);
        }
      });
    });
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}