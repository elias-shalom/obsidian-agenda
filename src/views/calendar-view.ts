import { WorkspaceLeaf, Plugin } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, CalendarViewData, AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import Handlebars from 'handlebars';
import { CalendarViewType } from '../types/enums';

export const CALENDAR_VIEW_TYPE = 'calendar-view';

export abstract class CalendarView extends BaseView {
  protected tasks: ITask[] = []; 
  protected currentDate: DateTime = DateTime.now();

  constructor(leaf: WorkspaceLeaf, protected plugin: Plugin, protected i18n: I18n, protected taskManager: TaskManager) {
    super(leaf);
  }

  // Método que todas las vistas derivadas deben implementar
  protected abstract generateViewData(): CalendarViewData;
  
  // Método común para obtener el tipo de vista
  abstract getViewType(): string;

  getDisplayText(): string {
    return this.i18n.t("calendar_view_title");
  }

  getIcon(): string {
    return 'calendar-check';
  }

  async onOpen(): Promise<void> {
    this.showLoadingOverlay(8, true);
    this.tasks = await this.getAllTasks(this.taskManager);
    await this.refreshCalendar();
  }

  protected async refreshCalendar(): Promise<void> {

    const viewData = {
      tasks: this.tasks,
      currentDate: this.currentDate,
      calendar: this.generateViewData()
    };

    await this.render(this.getViewType(), viewData, this.i18n, this.plugin as AgendaPlugin, this.leaf);
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
  protected getWeekStartDay(): number {
    const plugin = this.plugin as AgendaPlugin;
    return plugin.settings?.weekStartDay ?? 1; // 1=Lun por defecto (ISO)
  }

  protected getLocalizedDayNames(): string[] {
    const allDays = [
      { key: 'day_mon', iso: 1 },
      { key: 'day_tue', iso: 2 },
      { key: 'day_wed', iso: 3 },
      { key: 'day_thu', iso: 4 },
      { key: 'day_fri', iso: 5 },
      { key: 'day_sat', iso: 6 },
      { key: 'day_sun', iso: 7 },
    ];
    const startDay = this.getWeekStartDay(); // 1–7 ISO
    const startIndex = allDays.findIndex(d => d.iso === startDay);
    const rotated = [...allDays.slice(startIndex), ...allDays.slice(0, startIndex)];
    return rotated.map(d => this.i18n.t(d.key));
  }

  /**
   * Gets tasks for a specific date
   */
  protected getTasksForDate(date: DateTime): ITask[] {
    const dayUnit = 'day';
    return this.tasks.filter(task => {
      if (!task.date.due) return false;
      
      // Convertir a DateTime si es string
      const taskDate = typeof task.date.due === 'string' 
        ? DateTime.fromISO(task.date.due) 
        : task.date.due;
      
      return taskDate.hasSame(date, dayUnit);
    });
  }

  // Métodos de navegación común que cada vista sobrescribirá según necesite
  protected abstract navigateToPrevious(): void;
  protected abstract navigateToNext(): void;

  // Método que todas las vistas utilizarán para ir a la fecha actual
  protected navigateToToday(): void {
    this.currentDate = DateTime.now();
    this.refreshView().catch(console.error);
  }

  /**
   * Sobrescribe el método de BaseView para registrar helpers específicos de CalendarView
   * @param i18n Instancia de I18n para la internacionalización
   */
  protected registerViewSpecificHelpers(_i18n: I18n): void {
    // Register calendar-specific helpers
    Handlebars.registerHelper('formatDateHeader', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toFormat('ccc d');
      }
      if (date instanceof DateTime) {
        return date.toFormat('ccc d');
      }
      return '';
    });

    Handlebars.registerHelper('formatMonth', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toFormat('MMMM yyyy');
      }
      if (date instanceof DateTime) {
        return date.toFormat('MMMM yyyy');
      }
      return '';
    });
    
    // Helper para formatear hora en 12H usando Luxon
    Handlebars.registerHelper('formatHour', (hour) => {
      const hourNum = typeof hour === 'number' ? hour : parseInt(hour as string, 10);
      if (isNaN(hourNum)) return '';
      return DateTime.fromObject({ hour: hourNum }).toFormat('h a');
    });
    
    // Helper para formatear fecha completa
    Handlebars.registerHelper('formatFullDate', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toFormat('EEEE, MMMM d, yyyy');
      }
      if (date instanceof DateTime) {
        return date.toFormat('EEEE, MMMM d, yyyy');
      }
      return '';
    });
    
    // Helper para comparar valores (útil para condiciones en plantillas)
    Handlebars.registerHelper('equals', function(this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('toISODate', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toISODate();
      }
      if (date instanceof DateTime) {
        return date.toISODate();
      }
      try {
        // Type assertion for objects that might have toISODate method
        const dateObj = date as { toISODate?: () => string };
        return typeof dateObj.toISODate === 'function' ? dateObj.toISODate() : '';
      } catch (error) {
        console.error(error);
        return '';
      }
    });

    Handlebars.registerHelper('getDayOfMonth', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).day;
      }
      if (date instanceof DateTime) {
        return date.day;
      }
      return '';
    });
  }

  /**
   * Sobrescribe el método de BaseView para implementar event listeners específicos de CalendarView
   * @param container Contenedor donde se aplican los listeners
   * @param _data Datos utilizados para renderizar la vista (no usado en la implementación base)
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, _data: CalendarViewData): void {
    // Add event listeners for navigation buttons
    const prevButton = container.querySelector('.oa-calendar-prev');
    const nextButton = container.querySelector('.oa-calendar-next');
    const todayButton = container.querySelector('.oa-calendar-today');

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
    }

    const viewDropdown = container.querySelector('#oa-calendar-view-dropdown') as HTMLSelectElement;

    if (viewDropdown) {
      // Establecer el valor actual basado en la vista actual
      // El valor ya debería estar establecido desde la plantilla usando {{#equals}}

      // Añadir event listener para el cambio de selección
      viewDropdown.addEventListener('change', () => {
        const selectedViewType = this.getCalendarViewTypeFromString(viewDropdown.value);
        this.switchToViewType(selectedViewType);
      });
    }

  // Event listeners para tareas
    const taskItems = container.querySelectorAll('.oa-calendar-task');
    taskItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const filePath = target.getAttribute('data-file-path');
        const lineNumber = target.getAttribute('data-line-number');

        if (filePath) {
          this.openTaskFile(filePath, lineNumber ? parseInt(lineNumber) : undefined).catch(console.error);
        }
      });
    });

    const dayCells = container.querySelectorAll<HTMLElement>(
      '.oa-calendar-month-day, .oa-calendar-week-day-container, ' +
      '.oa-calendar-day-column, .oa-calendar-year-day'
    );

    dayCells.forEach(cell => {
      cell.addEventListener('dblclick', (e) => {        
        // Evitar abrir si se dio doble clic sobre una tarea (burbuja)
        if ((e.target as HTMLElement).closest('.oa-calendar-task')) return;

        const dateStr = cell.dataset.date;
        console.debug(`Fecha obtenida del dataset: ${dateStr}`); // Debugging line
        if (dateStr) this.openCreateTaskForDate(dateStr);
      });
    });
  }

  private getCalendarViewTypeFromString(viewTypeString: string): CalendarViewType {

    //console.log(`Convirtiendo ${viewTypeString} a CalendarViewType`);
    switch (viewTypeString) {
      case 'month':
        return CalendarViewType.Month;
      case 'week':
        return CalendarViewType.Week;
      case 'workweek':
        return CalendarViewType.WorkWeek;
      case 'day':
        return CalendarViewType.Day;
      case 'year':
        return CalendarViewType.Year;
      default:
        return CalendarViewType.Month; // Valor por defecto
    }
  }

  /**
   * Cambia el tipo de vista actual
   * @param viewType El tipo de vista al que cambiar
   */
  private switchToViewType(viewType: CalendarViewType): void {
    // Guardar preferencia del usuario
    this.app.saveLocalStorage('calendar_view_type', viewType);
    
    // Determinar el ID de vista según el tipo
    let viewId;
    switch (viewType) {
      case CalendarViewType.Year:
        viewId = 'calendar-year-view';
        break;
      case CalendarViewType.Month:
        viewId = 'calendar-month-view';
        break;
      case CalendarViewType.Week:
        viewId = 'calendar-week-view';
        break;
      case CalendarViewType.WorkWeek:
        viewId = 'calendar-workweek-view';
        break;
      case CalendarViewType.Day:
        viewId = 'calendar-day-view';
        break;
      default:
        viewId = 'calendar-month-view';
    }

    // Usar la factory para crear la vista correcta
    if (this.plugin && this.plugin.app) {
      const leaf = this.plugin.app.workspace.getActiveViewOfType(CalendarView)?.leaf;
      if (leaf) {
        leaf.setViewState({ type: viewId }).catch(console.error);
      }
    }
  }

  private openCreateTaskForDate(dateStr: string): void {
    console.debug(`Abriendo modal para crear tarea en fecha ${dateStr}`); // Debugging line
    const plugin = this.plugin as AgendaPlugin;
    plugin.modalManager.openModal("create-task", { today: dateStr });
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }

  protected navigateToDayView(dateStr: string): void {
    this.app.saveLocalStorage('oa_navigate_to_date', dateStr);
    const leaf = this.plugin.app.workspace.getActiveViewOfType(CalendarView)?.leaf;
    leaf?.setViewState({ type: 'calendar-day-view' }).catch(console.error);
  }

  // Helper para calcular el inicio de semana respetando la configuración
  protected getStartOfWeek(date: DateTime): DateTime {
    const startDay = this.getWeekStartDay(); // ISO: 1=Lun, 7=Dom
    const dayOfWeek = date.weekday; // ISO: 1=Lun, 7=Dom
    const diff = (dayOfWeek - startDay + 7) % 7;
    return date.minus({ days: diff }).startOf('day');
  }

  protected getEndOfWeek(date: DateTime): DateTime {
    return this.getStartOfWeek(date).plus({ days: 6 }).endOf('day');
  }
}