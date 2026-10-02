import { WorkspaceLeaf, Plugin, Notice } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, CalendarViewData, AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import Handlebars from 'handlebars';
import { CalendarViewType } from '../types/enums';
import { TaskWriter } from '../core/task-writer';
import { upsertSimpleDate, upsertScheduledDate } from '../core/task-line-fields';
import { EDIT_TASK_MODAL_TYPE } from '../core/modal-manager';

/** Espera entre un `click` y un posible segundo `click` antes de asumir que no viene un `dblclick` (ms). */
const TASK_CLICK_DELAY_MS = 250;

export const CALENDAR_VIEW_TYPE = 'calendar-view';

/** Payload transportado por `dataTransfer` durante un drag and drop de tarea (v1.1.4, Fase D). */
export interface TaskDragPayload {
  filePath: string;
  lineNumber: number;
  calendarDateType: string;
  scheduledTime: string | null;
}

/** Tipo de fecha que ancla una tarea a un día del calendario (v1.1.4, ADR-T4 en docs/agenda-tasks). */
export type CalendarDateType = 'due' | 'start' | 'scheduled';

export abstract class CalendarView extends BaseView {
  protected tasks: ITask[] = []; 
  protected currentDate: DateTime = DateTime.now();
  protected taskWriter: TaskWriter;

  constructor(leaf: WorkspaceLeaf, protected plugin: Plugin, protected i18n: I18n, protected taskManager: TaskManager) {
    super(leaf);
    this.taskWriter = new TaskWriter(this.app);
  }

  // Método que todas las vistas derivadas deben implementar
  protected abstract generateViewData(): CalendarViewData;
  
  // Método común para obtener el tipo de vista
  abstract getViewType(): string;

  getDisplayText(): string {
    return this.i18n.t("calendar_view_title");
  }

  getIcon(): string {
    return 'calendar-days';
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
  protected getTasksForDate(date: DateTime): (ITask & { calendarDateType: CalendarDateType })[] {
    const enabled = this.getCalendarDateSettings();
    const showCompleted = this.getCalendarShowCompletedTasks();
    const result: (ITask & { calendarDateType: CalendarDateType })[] = [];

    for (const task of this.tasks) {
      if (!showCompleted && task.state.status === 'x') continue;
      const type = this.resolveCalendarAnchor(task, date, enabled);
      if (type) result.push({ ...task, calendarDateType: type });
    }

    return result;
  }

  /** Lee de los settings si las tareas completadas se muestran (atenuadas) u ocultan por completo en el calendario. */
  protected getCalendarShowCompletedTasks(): boolean {
    const plugin = this.plugin as AgendaPlugin;
    return plugin.settings?.calendarShowCompletedTasks ?? true;
  }

  /** Lee de los settings qué tipos de fecha se muestran en el calendario (ADR-T4). */
  protected getCalendarDateSettings(): { due: boolean; start: boolean; scheduled: boolean } {
    const plugin = this.plugin as AgendaPlugin;
    return {
      due: plugin.settings?.calendarShowDueDates ?? true,
      start: plugin.settings?.calendarShowStartDates ?? false,
      scheduled: plugin.settings?.calendarShowScheduledDates ?? true,
    };
  }

  /** Resuelve, con prioridad `scheduled > due > start`, qué tipo de fecha ancla esta tarea al día dado (o null si ninguna aplica). */
  private resolveCalendarAnchor(
    task: ITask,
    date: DateTime,
    enabled: { due: boolean; start: boolean; scheduled: boolean }
  ): CalendarDateType | null {
    const matchesDay = (value: DateTime | string | null): boolean => {
      if (!value) return false;
      const dt = typeof value === 'string' ? DateTime.fromISO(value) : value;
      return dt.isValid && dt.hasSame(date, 'day');
    };

    if (enabled.scheduled && matchesDay(task.date.scheduled)) return 'scheduled';
    if (enabled.due && matchesDay(task.date.due)) return 'due';
    if (enabled.start && matchesDay(task.date.start)) return 'start';
    return null;
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

    // Helper para saber si una tarea está completada (usado para el atenuado visual, ADR-T6)
    Handlebars.registerHelper('isTaskDone', (status: unknown) => status === 'x');

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
    const taskItems = container.querySelectorAll<HTMLElement>('.oa-calendar-task');
    taskItems.forEach(item => {
      // Clic simple: abre el modal de edición; doble clic: abre el archivo (v1.1.4).
      // Un doble clic real también dispara dos `click` sueltos antes del `dblclick`, así que
      // el primer clic espera un poco por si llega un segundo antes de abrir el modal.
      let pendingClickTimer: number | null = null;

      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        if (pendingClickTimer !== null) return;

        pendingClickTimer = window.setTimeout(() => {
          pendingClickTimer = null;
          const filePath = target.getAttribute('data-file-path');
          const lineNumber = target.getAttribute('data-line-number');
          if (!filePath || !lineNumber) return;

          const task = this.tasks.find(t => t.file.path === filePath && t.line.number === Number(lineNumber));
          if (task) this.openEditTaskModal(task);
        }, TASK_CLICK_DELAY_MS);
      });

      item.addEventListener('dblclick', (e) => {
        if (pendingClickTimer !== null) {
          window.clearTimeout(pendingClickTimer);
          pendingClickTimer = null;
        }

        const target = e.currentTarget as HTMLElement;
        const filePath = target.getAttribute('data-file-path');
        const lineNumber = target.getAttribute('data-line-number');

        if (filePath) {
          this.openTaskFile(filePath, lineNumber ? parseInt(lineNumber) : undefined).catch(console.error);
        }
      });

      // Drag and drop (v1.1.4, Fase D): el `dragstart` es común a todas las vistas de calendario;
      // cada vista decide qué hace con el payload al recibir el `drop` (cambiar de día u hora).
      item.addEventListener('dragstart', (e) => {
        const payload = {
          filePath: item.getAttribute('data-file-path') ?? '',
          lineNumber: item.getAttribute('data-line-number') ?? '',
          calendarDateType: item.getAttribute('data-date-type') ?? '',
          scheduledTime: item.getAttribute('data-scheduled-time') ?? '',
        };
        e.dataTransfer?.setData('application/json', JSON.stringify(payload));
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        item.addClass('oa-dragging');
      });

      item.addEventListener('dragend', () => {
        item.removeClass('oa-dragging');
      });
    });

    const dayCells = container.querySelectorAll<HTMLElement>(
      '.oa-calendar-month-day, .oa-calendar-week-day-container, .oa-calendar-year-day'
    );

    dayCells.forEach(cell => {
      cell.addEventListener('dblclick', (e) => {        
        // Evitar abrir si se dio doble clic sobre una tarea (burbuja)
        if ((e.target as HTMLElement).closest('.oa-calendar-task')) return;

        const dateStr = cell.dataset.date;
        console.debug(`Fecha obtenida del dataset: ${dateStr}`); // Debugging line
        if (dateStr) this.openCreateTaskForDate(dateStr);
      });

      // Drop de una tarea arrastrada: cambia el día del campo de fecha que la ancla
      // (scheduled > due > start, ADR-T4), preservando hora/duración si aplica (ADR-T2).
      cell.addEventListener('dragover', (e) => {
        if (!cell.dataset.date) return;
        e.preventDefault();
        cell.addClass('oa-calendar-drop-target');
      });

      cell.addEventListener('dragleave', () => {
        cell.removeClass('oa-calendar-drop-target');
      });

      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.removeClass('oa-calendar-drop-target');
        this.handleTaskDayDrop(e, cell.dataset.date);
      });
    });

    // Clic en el número de día (Mes/Semana/Semana laboral) navega a la vista Día de esa fecha,
    // igual que ya hace la vista Año con sus números de día.
    const dayNumbers = container.querySelectorAll<HTMLElement>(
      '.oa-calendar-month-day .oa-calendar-month-day-number, ' +
      '.oa-calendar-week-day-container .oa-calendar-date'
    );

    dayNumbers.forEach(numberEl => {
      numberEl.addEventListener('click', (e) => {
        e.stopPropagation(); // evita conflicto con el dblclick de la celda (crear tarea)
        const cell = numberEl.closest<HTMLElement>('.oa-calendar-month-day, .oa-calendar-week-day-container');
        const dateStr = cell?.dataset.date;
        if (dateStr) this.navigateToDayView(dateStr);
      });
    });
  }

  /** Extrae y valida el payload de un drag de tarea desde `dataTransfer` (o `null` si es inválido). */
  protected parseTaskDragPayload(event: DragEvent): TaskDragPayload | null {
    const raw = event.dataTransfer?.getData('application/json');
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as { filePath: string; lineNumber: string; calendarDateType: string; scheduledTime: string };
      const lineNumber = Number(parsed.lineNumber);
      if (!parsed.filePath || Number.isNaN(lineNumber)) return null;

      return {
        filePath: parsed.filePath,
        lineNumber,
        calendarDateType: parsed.calendarDateType,
        scheduledTime: parsed.scheduledTime || null,
      };
    } catch {
      return null;
    }
  }

  /** Aplica el drop de una tarea sobre una celda de día: reescribe su línea con la nueva fecha. */
  private handleTaskDayDrop(event: DragEvent, newIsoDate: string | undefined): void {
    if (!newIsoDate) return;
    const payload = this.parseTaskDragPayload(event);
    if (!payload) return;

    const transform = this.buildDateFieldTransform(payload.calendarDateType, newIsoDate);
    if (!transform) return;

    this.taskWriter.updateTaskLine(payload.filePath, payload.lineNumber, transform)
      .then(ok => {
        if (ok) {
          this.refreshView().catch(console.error);
        } else {
          new Notice(this.i18n.t('task_drag_drop_error'));
        }
      })
      .catch(console.error);
  }

  /** Construye la transformación de línea correspondiente al tipo de fecha que ancla la tarea. */
  private buildDateFieldTransform(calendarDateType: string, isoDate: string): ((line: string) => string) | null {
    switch (calendarDateType) {
      case 'due':
        return (line: string) => upsertSimpleDate(line, '📅', isoDate);
      case 'start':
        return (line: string) => upsertSimpleDate(line, '🛫', isoDate);
      case 'scheduled':
        return (line: string) => upsertScheduledDate(line, isoDate);
      default:
        return null;
    }
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

  /** Abre el modal de creación para una fecha (doble clic en celda vacía); `scheduledTime` opcional prellena la hora (franjas horarias de Día, v1.1.9). */
  protected openCreateTaskForDate(dateStr: string, scheduledTime?: string): void {
    console.debug(`Abriendo modal para crear tarea en fecha ${dateStr}`); // Debugging line
    const plugin = this.plugin as AgendaPlugin;
    plugin.modalManager.openModal("create-task", {
      today: dateStr,
      scheduledTime,
      onSaved: () => this.refreshView().catch(console.error),
    });
  }

  /** Abre el modal de edición para una tarea (clic simple sobre su píldora, v1.1.4). */
  private openEditTaskModal(task: ITask): void {
    const plugin = this.plugin as AgendaPlugin;
    plugin.modalManager.openModal(EDIT_TASK_MODAL_TYPE, {
      task,
      onSaved: () => this.refreshView().catch(console.error),
    });
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