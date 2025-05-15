import { WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, HourSlot } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import Handlebars from 'handlebars';
import { CalendarViewType } from '../types/enums';

export const CALENDAR_VIEW_TYPE = 'calendar-view';

export abstract class CalendarView extends BaseView {
  protected tasks: ITask[] = []; 
  protected currentDate: DateTime = DateTime.now();
  //private viewType: CalendarViewType = CalendarViewType.Month;

  constructor(leaf: WorkspaceLeaf, protected plugin: any, protected i18n: I18n, protected taskManager: TaskManager) {
    super(leaf);
  }

  // Método que todas las vistas derivadas deben implementar
  protected abstract generateViewData(): any;
  
  // Método común para obtener el tipo de vista
  abstract getViewType(): string;

  getDisplayText(): string {
    return this.i18n.t("calendar_view_title");
  }

  getIcon(): string {
    return 'calendar-check';
  }

  async onOpen(): Promise<void> {
    // Intentar recuperar la preferencia de vista del usuario
    // const savedViewType = localStorage.getItem('calendar_view_type');
    /*if (savedViewType && Object.values(CalendarViewType).includes(savedViewType as CalendarViewType)) {
      this.viewType = savedViewType as CalendarViewType;
    }*/
    
    this.tasks = await this.getAllTasks(this.taskManager);
    await this.refreshView();
  }

  protected async refreshView(): Promise<void> {
    // Preparamos los datos según el tipo de vista actual
    /*let calendarData;
    
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
    }*/
    
    const viewData = {
      tasks: this.tasks,
      currentDate: this.currentDate,
      calendar: this.generateViewData()//calendarData,
      //viewType: this.viewType
    };
    
    await this.render(this.getViewType(), viewData, this.i18n, this.plugin, this.leaf);
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
  protected formatHour(hour: number): string {
    // Usar Luxon para formatear la hora
    return DateTime.fromObject({ hour }).toFormat('h a');
  }

  /**
   * Obtiene los nombres localizados de los días de la semana
   */
  protected getLocalizedDayNames(): string[] {
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
  protected getTasksForDate(date: DateTime): ITask[] {
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

  private changeViewType(newViewType: CalendarViewType): void {
    this.viewType = newViewType;
    
    // Guardar preferencia del usuario
    localStorage.setItem('calendar_view_type', newViewType);
    
    this.refreshView();
  }
       */

  // Métodos de navegación común que cada vista sobrescribirá según necesite
  protected abstract navigateToPrevious(): void;
  protected abstract navigateToNext(): void;

  // Método que todas las vistas utilizarán para ir a la fecha actual
  protected navigateToToday(): void {
    this.currentDate = DateTime.now();
    this.refreshView();
  }

  /**
   * Navega al período anterior según el tipo de vista actual   
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
  }*/

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
    //const viewTypeSelect = container.querySelector('.calendar-view-type') as HTMLSelectElement;
    
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
      todayButton.addEventListener('click', () => this.navigateToToday());
      /*todayButton.addEventListener('click', () => {
        this.currentDate = DateTime.now();
        this.refreshView();
      });*/
    }
    
    // Event listener para el selector de tipo de vista
    /*if (viewTypeSelect) {
      // Establecer el valor actual
      viewTypeSelect.value = this.viewType;
      
      viewTypeSelect.addEventListener('change', () => {
        this.changeViewType(viewTypeSelect.value as CalendarViewType);
      });
    }*/

    const monthViewButton = container.querySelector('#month-view-button');
    const weekViewButton = container.querySelector('#week-view-button');
    const dayViewButton = container.querySelector('#day-view-button');
    
    // Botón de vista mensual
    if (monthViewButton) {
      monthViewButton.addEventListener('click', () => {
        this.switchToViewType(CalendarViewType.Month);
      });
    }
    
    // Botón de vista semanal
    if (weekViewButton) {
      weekViewButton.addEventListener('click', () => {
        this.switchToViewType(CalendarViewType.Week);
      });
    }
    
    // Botón de vista diaria
    if (dayViewButton) {
      dayViewButton.addEventListener('click', () => {
        this.switchToViewType(CalendarViewType.Day);
      });
    }

  // Event listeners para tareas
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

  /**
   * Cambia el tipo de vista actual
   * @param viewType El tipo de vista al que cambiar
   */
  private switchToViewType(viewType: CalendarViewType): void {
    // Guardar preferencia del usuario
    localStorage.setItem('calendar_view_type', viewType);
    
    // Determinar el ID de vista según el tipo
    let viewId;
    switch (viewType) {
      case CalendarViewType.Month:
        viewId = 'calendar-month-view';
        break;
      case CalendarViewType.Week:
        viewId = 'calendar-week-view';
        break;
      case CalendarViewType.WorkWeek:
        viewId = 'calendar-work-week-view';
        break;
      case CalendarViewType.Day:
        viewId = 'calendar-day-view';
        break;
      default:
        viewId = 'month-view';
    }
    
    // Usar la factory para crear la vista correcta
    if (this.plugin && this.plugin.app) {
      const leaf = this.plugin.app.workspace.activeLeaf;
      if (leaf) {
        leaf.setViewState({ type: viewId });
      }
    }
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}