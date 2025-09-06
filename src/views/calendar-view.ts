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
    this.tasks = await this.getAllTasks(this.taskManager);
    await this.refreshView();
  }

  protected async refreshView(): Promise<void> {

    const viewData = {
      tasks: this.tasks,
      currentDate: this.currentDate,
      calendar: this.generateViewData()
    };

    await this.render(this.getViewType(), viewData, this.i18n, this.plugin, this.leaf);
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
    const dayUnit = 'day';
    return this.tasks.filter(task => {
      if (!task.dueDate) return false;
      
      // Convertir a DateTime si es string
      const taskDate = typeof task.dueDate === 'string' 
        ? DateTime.fromISO(task.dueDate) 
        : task.dueDate;
      
      return taskDate.hasSame(date, dayUnit);
    });
  }

  // Métodos de navegación común que cada vista sobrescribirá según necesite
  protected abstract navigateToPrevious(): void;
  protected abstract navigateToNext(): void;

  // Método que todas las vistas utilizarán para ir a la fecha actual
  protected navigateToToday(): void {
    this.currentDate = DateTime.now();
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
    Handlebars.registerHelper('equals', function(this: any, arg1: any, arg2: any, options: any) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('toISODate', (date) => {
      if (!date) return '';
      if (typeof date === 'string') {
        return DateTime.fromISO(date).toISODate();
      }
      try {
        return typeof date.toISODate === 'function' ? date.toISODate() : '';
      } catch (e) {
        return '';
      }
    });

    Handlebars.registerHelper('getDayOfMonth', (date) => {
      if (!date) return '';
      return date.day;
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

    const viewDropdown = container.querySelector('#calendar-view-dropdown') as HTMLSelectElement;

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