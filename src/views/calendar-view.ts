import { WorkspaceLeaf, Plugin, Notice, setIcon } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, CalendarViewData, ViewData, AgendaPlugin, HolidayLabel, HabitDayView, HabitDayGroup } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import Handlebars from 'handlebars';
import { CalendarViewType } from '../types/enums';
import { TaskWriter, TaskLineWrite } from '../core/task-writer';
import { upsertSimpleDate, upsertScheduledDate } from '../core/task-line-fields';
import { attachTaskGestures, TASK_CLICK_DELAY_MS } from '../core/task-gestures';
import { getReferenceDate, setReferenceDate } from '../core/calendar-reference-date';
import { CalendarDatePicker } from '../core/calendar-date-picker';
import { clearTooltips, installTooltips } from '../core/tooltips';
import { TaskViewState } from '../core/task-view-state';
import { CALENDAR_DIRECT_FILTER_TYPES, CALENDAR_FILTER_TYPES, filterTasksForCalendar, getActiveCalendarDateTypes, loadCalendarState, parseCalendarState, saveCalendarState } from '../core/calendar-state';
import { TaskFilterBar } from '../core/task-filter-bar';
import { closeFilterPopover, openFilterPopover } from '../core/task-filter-popover';
import { DEFAULT_NON_WORKING_DAYS, isNonWorkingDay } from '../core/non-working-days';
import { getHolidayLookup, hasOfficialHoliday } from '../core/holidays/holiday-calendar';
import { getAreaColor, resolveTaskArea } from '../core/area';
import { projectAllOccurrences, sanitizeProjectionCount } from '../core/task-projection';
import { buildHabitDaySummary, filterHabitsForCalendar } from '../habits/habit-calendar';
import type { Daytime, IHabit } from '../habits/habit';
import type { HabitManager } from '../habits/habit-manager';

export const CALENDAR_VIEW_TYPE = 'calendar-view';

/** Separador de la clave de una ocurrencia de hábito (`ruta de la nota::franja`), el mismo de las vistas de hábitos. */
const HABIT_ROW_SEPARATOR = '::';

/** Clave i18n del nombre de una franja del día (`habit_daytime_wake_up`…). */
const habitDaytimeLabelKey = (daytime: string): string => `habit_daytime_${daytime.replace(/\s+/g, '_')}`;

/** Íconos Lucide del selector de vista segmentado (v1.1.9, §12 Arquitectura técnica); Semana/Semana laboral deben distinguirse claramente. */
const CALENDAR_VIEW_BUTTON_ICONS: Record<string, string> = {
  year: 'calendar-range',
  month: 'calendar-days',
  week: 'columns-3',
  workweek: 'briefcase',
  day: 'calendar-clock',
  list: 'list-todo',
};

/** Payload transportado por `dataTransfer` durante un drag and drop de tarea (v1.1.4, Fase D). */
export interface TaskDragPayload {
  filePath: string;
  lineNumber: number;
  calendarDateType: string;
  scheduledTime: string | null;
}

/** Tipo de fecha que ancla una tarea a un día del calendario (v1.1.4, ADR-T4 en docs/agenda-tasks). */
export type CalendarDateType = 'due' | 'start' | 'scheduled';

/** Una tarea tal como la dibujan las vistas del calendario; `isProjected` marca una ocurrencia proyectada de solo lectura (v1.1.15, PR2) y `areaColor` es el color de su área (vacío en la raíz del vault). */
export type CalendarTask = ITask & { calendarDateType: CalendarDateType; areaColor?: string; isProjected?: boolean };

/** Orden de prioridad de la fecha que ancla una ocurrencia proyectada (ADR-R2). */
const PROJECTED_ANCHOR_ORDER: readonly CalendarDateType[] = ['scheduled', 'due', 'start'];

export abstract class CalendarView extends BaseView {
  protected tasks: ITask[] = []; 
  /** Filtros del calendario (v1.1.14, CF1): uno solo, compartido por las seis subvistas. */
  protected calendarState: TaskViewState = parseCalendarState({});
  /** Tareas que pasan los filtros del calendario; de aquí salen todas las que se dibujan. `this.tasks` queda completa para buscar una tarea por su línea. */
  protected visibleTasks: ITask[] = [];
  /** Ocurrencias proyectadas de las tareas recurrentes visibles (v1.1.15, PR2); se recalculan en cada dibujado. */
  private projectedTasks: ITask[] = [];
  /** Hábitos que se dibujan como entradas virtuales (v1.1.15, HC1): vacío si están ocultos, no hay ninguno o la pestaña Hábitos está oculta; se recalculan en cada dibujado. */
  protected visibleHabits: IHabit[] = [];
  /** Barra de filtros del calendario (v1.1.14, CF2): se crea en `onOpen()` y se monta tras cada dibujado completo. */
  protected filterBar: TaskFilterBar | null = null;
  /** Contenedor de la barra montada: un redibujado parcial lo conserva para que el buscador no pierda el foco. */
  private filterBarRoot: HTMLElement | null = null;
  /** Numera los redibujados parciales: si llega otro mientras uno espera la plantilla, el anterior se descarta. */
  private redrawToken = 0;
  protected currentDate: DateTime = DateTime.now();
  protected taskWriter: TaskWriter;
  /** Cierra el popover del selector de fecha abierto (si lo hay) y retira sus listeners globales. */
  private closeActiveDatePicker: (() => void) | null = null;

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
    const reference = getReferenceDate();
    if (reference) this.currentDate = reference;
    this.showLoadingOverlay(8, true);
    this.tasks = await this.getAllTasks(this.taskManager);
    // Los hábitos se leen de su propia caché: se espera a la primera carga para decidir si se ofrece su filtro
    await this.getHabitManager()?.waitForInitialCache();

    // La barra se crea antes de filtrar porque reajusta un área guardada que ya no tiene tareas; si no,
    // esa ruta vaciaría el calendario sin mostrar ningún chip.
    this.filterBar = new TaskFilterBar({
      i18n: this.i18n,
      tasks: this.tasks,
      state: loadCalendarState(this.app),
      filterTypes: this.getCalendarFilterTypes(),
      directFilterTypes: CALENDAR_DIRECT_FILTER_TYPES,
      onChange: (state) => this.onCalendarFiltersChanged(state),
    });
    this.calendarState = this.filterBar.getState();
    this.visibleTasks = filterTasksForCalendar(this.tasks, this.calendarState);
    await this.refreshCalendar();
  }

  /** Un cambio en la barra: se guarda y se vuelve a dibujar solo el calendario, sin tocar la barra (que conserva el foco del buscador). */
  private onCalendarFiltersChanged(state: TaskViewState): void {
    this.calendarState = parseCalendarState(state);
    saveCalendarState(this.app, this.calendarState);
    this.visibleTasks = filterTasksForCalendar(this.tasks, this.calendarState);
    this.redrawCalendarBody().catch(console.error);
  }

  /** Único punto de escritura de `currentDate`: también actualiza la fecha de referencia compartida (v1.1.9, §9 Arquitectura técnica). */
  protected setCurrentDate(date: DateTime): void {
    this.currentDate = date;
    setReferenceDate(date);
  }

  protected async refreshCalendar(): Promise<void> {
    const viewData = this.buildCalendarViewData();

    await this.render(this.getViewType(), viewData, this.i18n, this.plugin as AgendaPlugin, this.leaf);
    this.mountFilterBar();
  }

  /** Lo que reciben la plantilla y los listeners: los datos de la subvista (`calendar`) junto a las tareas y la fecha actual. */
  private buildCalendarViewData(): ViewData {
    // Los fantasmas salen de las tareas que pasan los filtros, así que un filtro los oculta junto a su tarea real;
    // y «Tareas recurrentes» desmarcado en la barra los oculta todos
    const plugin = this.plugin as AgendaPlugin;
    this.projectedTasks = projectAllOccurrences(
      this.visibleTasks,
      this.calendarState.projected === 'hide' ? 0 : sanitizeProjectionCount(plugin.settings?.calendarProjectionCount),
      this.getNonWorkingDays()
    );

    // Los hábitos pasan solo el área y la búsqueda de la barra; «Hábitos» desmarcado los oculta todos
    const habitManager = this.getHabitManager();
    this.visibleHabits = habitManager && this.areHabitsOffered() && this.calendarState.habits !== 'hide'
      ? filterHabitsForCalendar(habitManager.getHabits(), this.calendarState)
      : [];

    return {
      tasks: this.tasks,
      currentDate: this.currentDate,
      calendar: this.generateViewData()
    };
  }

  /** El gestor de hábitos del plugin; las pruebas y un plugin sin hábitos no lo tienen. */
  private getHabitManager(): HabitManager | null {
    return (this.plugin as AgendaPlugin).getHabitManager?.() ?? null;
  }

  /** ¿Hay hábitos que dibujar? Con la pestaña Hábitos oculta o sin ningún hábito, el calendario queda como antes y no ofrece el filtro. */
  private areHabitsOffered(): boolean {
    const plugin = this.plugin as AgendaPlugin;
    if (plugin.settings?.showHabitTab === false) return false;
    return (this.getHabitManager()?.getHabits().length ?? 0) > 0;
  }

  /** Tipos de «+ Filtro»: «Hábitos» solo se ofrece si hay hábitos que mostrar y «Días festivos» solo si hay un calendario de feriados activo. */
  private getCalendarFilterTypes(): readonly (typeof CALENDAR_FILTER_TYPES)[number][] {
    const offersHabits = this.areHabitsOffered();
    const offersHolidays = this.areHolidaysOffered();
    return CALENDAR_FILTER_TYPES.filter(type => (type !== 'habits' || offersHabits) && (type !== 'holidays' || offersHolidays));
  }

  /** ¿Hay algún calendario de feriados en los ajustes? Sin ninguno no hay días festivos que ocultar y el filtro no se ofrece. */
  private areHolidaysOffered(): boolean {
    return ((this.plugin as AgendaPlugin).settings?.holidayCalendars?.length ?? 0) > 0;
  }

  /**
   * Los hábitos de un día para el chip resumen, el popover y la sección de la vista Día (v1.1.15, HC1); `null` si
   * están ocultos o ninguno toca ese día (nunca un `0/0`). En vacaciones el chip cuenta solo los marcados y, sin
   * ninguno, queda sin fracción (solo la 🌴 que añade la plantilla).
   */
  protected getHabitDay(date: DateTime): HabitDayView | null {
    const habitManager = this.getHabitManager();
    if (!habitManager || this.visibleHabits.length === 0) return null;

    const summary = buildHabitDaySummary(this.visibleHabits, date, habitManager.getCalcContext());
    if (summary.items.length === 0) return null;

    const groups: HabitDayGroup[] = [];
    for (const item of summary.items) {
      let group = groups[groups.length - 1];
      if (!group || group.daytime !== item.daytime) {
        group = { daytime: item.daytime, label: this.i18n.t(habitDaytimeLabelKey(item.daytime)), rows: [] };
        groups.push(group);
      }
      group.rows.push({
        id: `${item.habit.file.path}${HABIT_ROW_SEPARATOR}${item.daytime}`,
        title: item.habit.title,
        daytime: item.daytime,
        ticked: item.ticked,
        muted: !item.counted,
        areaColor: getAreaColor(item.habit.area),
      });
    }

    const counts = summary.total > 0 ? this.i18n.t('calendar_habits_summary', { done: summary.done, total: summary.total }) : '';
    const vacation = summary.vacation ? `🌴 ${summary.vacationName ?? this.i18n.t('habit_vacation')}` : '';
    return {
      date: summary.date,
      label: summary.total > 0 ? `${summary.done}/${summary.total}` : '',
      done: summary.done,
      total: summary.total,
      vacation: summary.vacation,
      tooltip: [counts, vacation].filter(Boolean).join(' · '),
      groups,
    };
  }

  /**
   * La barra de filtros es el primer elemento de `.agenda-content-container`, como en Lista, Tabla, Kanban y
   * Gantt (mismo espaciado bajo las pestañas), y se vuelve a montar tras cada dibujado completo.
   */
  private mountFilterBar(): void {
    const content = this.containerEl.children[1]?.querySelector<HTMLElement>('.agenda-content-container');
    if (!content || !this.filterBar) return;

    // Los ajustes pueden haber cambiado (un calendario de feriados nuevo) desde que se abrió la vista
    this.filterBar.setFilterTypes(this.getCalendarFilterTypes());

    const barRoot = createDiv({ cls: 'oa-calendar-filter-bar' });
    content.prepend(barRoot);
    this.filterBarRoot = barRoot;
    this.filterBar.mount(barRoot);
    installTooltips(barRoot);
  }

  /**
   * Vuelve a dibujar solo el calendario tras un cambio de filtro (Fase CF2). La barra vive en el mismo
   * contenedor, así que no se vacía: se sustituye todo salvo su nodo, y el buscador no pierde el foco con cada
   * tecla (quitar y volver a poner un nodo lo desenfocaría). Se dibuja en un contenedor aparte y se sustituye al
   * final: si llega otro cambio mientras espera la plantilla, el anterior se descarta.
   */
  private async redrawCalendarBody(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement | undefined;
    const content = container?.querySelector<HTMLElement>('.agenda-content-container');
    if (!container || !content) return;

    const token = ++this.redrawToken;
    const viewData = this.buildCalendarViewData();
    const staging = createDiv();
    await this.renderTemplate(staging, this.getViewType(), viewData);
    if (token !== this.redrawToken) return;

    clearTooltips(content);
    for (const child of Array.from(content.children)) {
      if (child !== this.filterBarRoot) child.remove();
    }
    content.append(...Array.from(staging.childNodes));
    installTooltips(container);
    this.setupViewSpecificEventListeners(content, viewData as CalendarViewData);
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

  /** Días ISO marcados como no laborables en los ajustes (v1.1.15, NL1). */
  protected getNonWorkingDays(): readonly number[] {
    const plugin = this.plugin as AgendaPlugin;
    return plugin.settings?.nonWorkingDays ?? DEFAULT_NON_WORKING_DAYS;
  }

  /** ¿El día cae en un día no laborable? Lo usan Mes, Semana y Lista para sombrearlo. */
  protected isNonWorking(date: DateTime): boolean {
    return isNonWorkingDay(date, this.getNonWorkingDays());
  }

  /** Feriados del día según los calendarios de feriados activos (v1.1.15, FE2); vacío si no hay ninguno o si «Días festivos» está desmarcado en la barra. */
  protected getHolidays(date: DateTime): HolidayLabel[] {
    if (this.calendarState.holidays === 'hide') return [];
    const plugin = this.plugin as AgendaPlugin;
    const lookup = getHolidayLookup(plugin.settings?.holidayCalendars ?? []);
    return lookup.get(date.toISODate() ?? '').map(entry => ({
      name: this.i18n.t(entry.nameKey),
      color: entry.color,
      official: entry.category === 'official',
    }));
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
   * Gets tasks for a specific date. Recorre las tareas que pasan los filtros del calendario (CF1) y respeta
   * `calendarShowCompletedTasks`; es el único punto por donde las seis subvistas, el selector de fecha y los
   * contadores de la vista Año obtienen las tareas.
   */
  protected getTasksForDate(date: DateTime, includeProjected = false): CalendarTask[] {
    const enabled = this.getCalendarDateSettings();
    const showCompleted = this.getCalendarShowCompletedTasks();
    const result: CalendarTask[] = [];

    for (const task of this.visibleTasks) {
      if (!showCompleted && task.state.status === 'x') continue;
      const type = this.resolveCalendarAnchor(task, date, enabled);
      if (type) result.push({ ...task, calendarDateType: type, areaColor: this.areaColorOf(task) });
    }

    // Las ocurrencias proyectadas (v1.1.15, PR2) van tras las reales; Año y el selector de fecha no las piden.
    // Cada una se dibuja una sola vez, en su fecha de referencia, no en cada una de sus fechas desplazadas.
    if (includeProjected) {
      for (const ghost of this.projectedTasks) {
        const type = this.resolveProjectedAnchor(ghost, date, enabled);
        if (type) result.push({ ...ghost, calendarDateType: type, areaColor: this.areaColorOf(ghost), isProjected: true });
      }
    }

    return result;
  }

  /**
   * Color del margen izquierdo de la píldora: el del área de la tarea (primera carpeta de su nota), como en los
   * carriles y grupos de las demás vistas. Una nota en la raíz del vault no tiene área y devuelve vacío: la
   * píldora usa el color por defecto.
   */
  private areaColorOf(task: ITask): string {
    const { area } = resolveTaskArea(task.file.path ?? '');
    return area ? getAreaColor(area) : '';
  }

  /** Lee de los settings si las tareas completadas se muestran (atenuadas) u ocultan por completo en el calendario. */
  protected getCalendarShowCompletedTasks(): boolean {
    const plugin = this.plugin as AgendaPlugin;
    return plugin.settings?.calendarShowCompletedTasks ?? true;
  }

  /** Lee de los settings qué tipos de fecha se muestran en el calendario (ADR-T4). */
  protected getCalendarDateSettings(): { due: boolean; start: boolean; scheduled: boolean } {
    const plugin = this.plugin as AgendaPlugin;
    const picked = getActiveCalendarDateTypes(this.calendarState);
    // Las fechas marcadas en la barra mandan sobre los ajustes: solo se dibujan las píldoras de esos tipos
    if (picked.length > 0) {
      return { due: picked.includes('due'), start: picked.includes('start'), scheduled: picked.includes('scheduled') };
    }
    return {
      due: plugin.settings?.calendarShowDueDates ?? true,
      start: plugin.settings?.calendarShowStartDates ?? false,
      scheduled: plugin.settings?.calendarShowScheduledDates ?? true,
    };
  }

  /**
   * Para una ocurrencia proyectada: solo cuenta su fecha de referencia, la de mayor prioridad (`scheduled > due >
   * start`) entre los tipos que el calendario muestra. Una tarea real aparece en cada una de sus fechas, pero
   * repetir eso en cada fantasma llenaría los días anteriores a la tarea real de copias de sus fechas de inicio y
   * vencimiento.
   */
  private resolveProjectedAnchor(
    task: ITask,
    date: DateTime,
    enabled: { due: boolean; start: boolean; scheduled: boolean }
  ): CalendarDateType | null {
    const type = PROJECTED_ANCHOR_ORDER.find(candidate => enabled[candidate] && task.date[candidate]);
    if (!type) return null;
    const value = task.date[type];
    return value?.isValid && value.hasSame(date, 'day') ? type : null;
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
    this.setCurrentDate(DateTime.now());
    this.refreshView().catch(console.error);
  }

  /**
   * Sobrescribe el método de BaseView para registrar helpers específicos de CalendarView
   * @param i18n Instancia de I18n para la internacionalización
   */
  protected registerViewSpecificHelpers(_i18n: I18n): void {
    // Chip resumen de los hábitos de un día (v1.1.15, HC1): lo comparten Mes, Semana, Semana laboral y Lista
    Handlebars.registerPartial('calendarHabitChip',
      '{{#if habits}}<button type="button" class="oa-calendar-habit-chip{{#if habits.vacation}} oa-calendar-habit-chip--vacation{{/if}}"'
      + ' data-habit-date="{{habits.date}}" title="{{habits.tooltip}}" aria-label="{{habits.tooltip}}" aria-haspopup="dialog">'
      + '<span class="oa-calendar-habit-icon" aria-hidden="true"></span>'
      + '{{#if habits.label}}<span class="oa-calendar-habit-count">{{habits.label}}</span>{{/if}}'
      + '{{#if habits.vacation}}<span class="oa-calendar-habit-vacation" aria-hidden="true">🌴</span>{{/if}}'
      + '</button>{{/if}}');

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

    // Solo un feriado oficial sombrea el día; los no oficiales llevan su etiqueta pero el día se ve normal
    Handlebars.registerHelper('hasOfficialHoliday', (holidays: unknown) => hasOfficialHoliday(holidays as { official: boolean }[]));

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
   * Los hábitos del calendario (v1.1.15, HC1): el icono del chip (el `sunrise` de la vista Rutina) y el chip, que abre
   * su popover. Es el mismo chip en todas las vistas, también en el encabezado de cada columna de la vista Día.
   */
  private setupHabitListeners(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('.oa-calendar-habit-icon').forEach(icon => setIcon(icon, 'sunrise'));

    container.querySelectorAll<HTMLButtonElement>('.oa-calendar-habit-chip').forEach(chip => {
      // El chip vive dentro de la celda del día: sin esto, su clic y su doble clic seleccionarían el día o crearían una tarea
      chip.addEventListener('click', (event) => {
        event.stopPropagation();
        const date = chip.dataset.habitDate;
        if (date) this.openHabitPopover(date, chip);
      });
      chip.addEventListener('dblclick', (event) => event.stopPropagation());
    });
  }

  /** Popover con los hábitos del día y su casilla; no se cierra al marcar y cada fila lleva un botón que abre la nota. */
  private openHabitPopover(date: string, anchorEl: HTMLElement): void {
    const day = this.getHabitDay(DateTime.fromISO(date));
    if (!day) return;

    const rect = anchorEl.getBoundingClientRect();
    // Las casillas se actualizan al momento; la nota y el calendario se actualizan cuando termina la escritura
    const ticked = new Map(day.groups.flatMap(group => group.rows.map(row => [row.id, row.ticked] as const)));
    const vacationMark = day.vacation ? ' 🌴' : '';

    openFilterPopover({
      anchor: { x: rect.left, y: rect.bottom },
      ariaLabel: day.tooltip || this.i18n.t('filter_habits'),
      getSections: () => day.groups.map(group => ({
        title: group.label,
        options: group.rows.map(row => ({
          value: row.id,
          label: `${row.title}${vacationMark}`,
          checked: ticked.get(row.id) ?? false,
          muted: row.muted && !ticked.get(row.id),
          color: row.areaColor,
        })),
      })),
      onToggle: (id) => {
        ticked.set(id, !ticked.get(id));
        this.toggleHabitRow(id, date).catch(console.error);
      },
      openOption: { label: this.i18n.t('open_file'), onOpen: (id) => { this.openHabitNote(id).catch(console.error); } },
    });
  }

  /** Marca o desmarca una ocurrencia de hábito (`habit-writer.ts`, la misma escritura de las vistas de hábitos) y redibuja el calendario. */
  private async toggleHabitRow(rowId: string, date: string): Promise<void> {
    const habit = this.findHabitByRowId(rowId);
    const daytime = rowId.slice(rowId.lastIndexOf(HABIT_ROW_SEPARATOR) + HABIT_ROW_SEPARATOR.length) as Daytime;
    const habitManager = this.getHabitManager();
    if (!habit || !habitManager) return;

    await habitManager.toggleOccurrence(habit.file, date, daytime);
    await this.redrawCalendarBody();
  }

  private async openHabitNote(rowId: string): Promise<void> {
    const habit = this.findHabitByRowId(rowId);
    if (habit) await this.openTaskFile(habit.file.path);
  }

  private findHabitByRowId(rowId: string): IHabit | null {
    const separator = rowId.lastIndexOf(HABIT_ROW_SEPARATOR);
    const path = separator === -1 ? rowId : rowId.slice(0, separator);
    return this.visibleHabits.find(habit => habit.file.path === path) ?? null;
  }

  /**
   * El color de cada feriado y el del área de cada tarea viajan en `data-holiday-color` y `data-area-color` (las
   * plantillas no llevan estilos en línea) y aquí pasan a las variables CSS que usan el tinte, el punto del Año y
   * el margen izquierdo de las píldoras (v1.1.15).
   */
  private applyHolidayColors(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('[data-holiday-color]').forEach(el => {
      el.setCssProps({ '--oa-holiday-color': el.dataset.holidayColor ?? '' });
    });
    container.querySelectorAll<HTMLElement>('[data-area-color]').forEach(el => {
      el.setCssProps({ '--oa-area-color': el.dataset.areaColor ?? '' });
    });
  }

  /**
   * Sobrescribe el método de BaseView para implementar event listeners específicos de CalendarView
   * @param container Contenedor donde se aplican los listeners
   * @param _data Datos utilizados para renderizar la vista (no usado en la implementación base)
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, _data: CalendarViewData): void {
    this.applyHolidayColors(container);
    this.setupHabitListeners(container);

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

    const viewButtons = container.querySelectorAll<HTMLButtonElement>('.oa-calendar-view-btn');
    viewButtons.forEach(button => {
      const viewTypeStr = button.dataset.viewType;
      const iconId = viewTypeStr && CALENDAR_VIEW_BUTTON_ICONS[viewTypeStr];
      if (iconId) setIcon(button, iconId);

      button.addEventListener('click', () => {
        if (!viewTypeStr) return;
        this.switchToViewType(this.getCalendarViewTypeFromString(viewTypeStr));
      });
    });

    // Selector de fecha popover (v1.1.9, §4.6.4): Mes/Semana/Semana laboral/Año; Día usa el modo docked.
    this.closeActiveDatePicker?.();
    const datePickerTrigger = container.querySelector<HTMLButtonElement>('.oa-calendar-date-picker-trigger');
    if (datePickerTrigger) {
      setIcon(datePickerTrigger, 'calendar');
      datePickerTrigger.addEventListener('click', () => {
        if (this.closeActiveDatePicker) { this.closeActiveDatePicker(); return; }
        this.openDatePickerPopover(datePickerTrigger);
      });
    }

  // Event listeners para tareas
    const taskItems = container.querySelectorAll<HTMLElement>('.oa-calendar-task');
    taskItems.forEach(item => {
      // Una ocurrencia proyectada es de solo lectura (v1.1.15, PR2): clic y doble clic llevan a la tarea real,
      // sin menú de estado y sin arrastre.
      const isProjected = item.dataset.projected === 'true';

      // Clic edita, doble clic abre el archivo y clic derecho cambia el estado (gestos compartidos).
      attachTaskGestures(item, {
        plugin: this.plugin as AgendaPlugin,
        i18n: this.i18n,
        taskWriter: this.taskWriter,
        getTask: () => {
          const filePath = item.getAttribute('data-file-path');
          const lineNumber = Number(item.getAttribute('data-line-number'));
          return this.tasks.find(t => t.file.path === filePath && t.line.number === lineNumber);
        },
        onChanged: () => this.refreshView(),
        openFile: (filePath, lineNumber) => this.openTaskFile(filePath, lineNumber),
        readOnly: isProjected,
      });

      if (isProjected) return;

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
      '.oa-calendar-month-day, .oa-calendar-week-day-container, .oa-calendar-year-day, .oa-calendar-list-row'
    );

    dayCells.forEach(cell => {
      // Clic simple selecciona y resalta el día (v1.1.9, §4.6.7 decisión revisitada); un clic que
      // llegara antes de un posible doble clic se demora lo mismo que en las tareas para no
      // interrumpir la creación de tarea por doble clic en la misma celda.
      let pendingSelectTimer: number | null = null;

      cell.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.oa-calendar-task')) return;
        if (pendingSelectTimer !== null) return;

        const dateStr = cell.dataset.date;
        if (!dateStr) return;

        pendingSelectTimer = window.setTimeout(() => {
          pendingSelectTimer = null;
          this.setCurrentDate(DateTime.fromISO(dateStr));
          this.refreshCalendar().catch(console.error);
        }, TASK_CLICK_DELAY_MS);
      });

      cell.addEventListener('dblclick', (e) => {        
        if (pendingSelectTimer !== null) {
          window.clearTimeout(pendingSelectTimer);
          pendingSelectTimer = null;
        }
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

    // Clic en el número de día (Mes/Semana/Semana laboral/Lista) navega a la vista Día de esa
    // fecha, igual que ya hace la vista Año con sus números de día.
    const dayNumbers = container.querySelectorAll<HTMLElement>(
      '.oa-calendar-month-day .oa-calendar-month-day-number, ' +
      '.oa-calendar-week-day-container .oa-calendar-date, ' +
      '.oa-calendar-list-row .oa-calendar-list-row-date'
    );

    dayNumbers.forEach(numberEl => {
      numberEl.addEventListener('click', (e) => {
        e.stopPropagation(); // evita conflicto con el dblclick de la celda (crear tarea)
        const cell = numberEl.closest<HTMLElement>('.oa-calendar-month-day, .oa-calendar-week-day-container, .oa-calendar-list-row');
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

    this.writeTaskLine(payload.filePath, payload.lineNumber, transform)
      .then(written => {
        if (written) this.refreshView().catch(console.error);
      })
      .catch(console.error);
  }

  /**
   * Reescribe una tarea de la vista con escritura segura: el texto esperado es el de la tarea tal
   * como se dibujó. Si la nota cambió y no se puede localizar la línea, avisa y no escribe nada.
   */
  protected async writeTaskLine(
    filePath: string,
    lineNumber: number,
    transform: (line: string) => string
  ): Promise<TaskLineWrite | null> {
    const task = this.tasks.find(t => t.file.path === filePath && t.line.number === lineNumber);
    const written = task
      ? await this.taskWriter.updateTaskLine(filePath, lineNumber, task.line.text, transform)
      : null;
    if (!written) new Notice(this.i18n.t('task_line_changed'));
    return written;
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
      case 'list':
        return CalendarViewType.List;
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
      case CalendarViewType.List:
        viewId = 'calendar-list-view';
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

  /**
   * Abre el selector de fecha compartido en modo popover, anclado al botón del encabezado
   * (v1.1.9, §9.3 Arquitectura técnica). Se cierra con Escape, clic fuera o al elegir un día.
   */
  private openDatePickerPopover(anchorButton: HTMLButtonElement): void {
    const panel = document.body.createDiv({ cls: 'oa-date-picker oa-date-picker--popover' });
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', this.i18n.t('select_date'));

    const positionPanel = (): void => {
      const anchorRect = anchorButton.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const margin = 8;
      const left = Math.max(margin, Math.min(anchorRect.left, window.innerWidth - panelRect.width - margin));
      const top = Math.max(margin, Math.min(anchorRect.bottom + 4, window.innerHeight - panelRect.height - margin));
      panel.setCssStyles({ left: `${left}px`, top: `${top}px` });
    };

    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    const onPointerDown = (event: MouseEvent): void => {
      if (event.target instanceof Node && (panel.contains(event.target) || anchorButton.contains(event.target))) return;
      close();
    };
    const onResize = (): void => positionPanel();

    const close = (): void => {
      document.removeEventListener('keydown', onKeydown, true);
      document.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('resize', onResize);
      anchorButton.setAttribute('aria-expanded', 'false');
      panel.remove();
      this.closeActiveDatePicker = null;
      anchorButton.focus();
    };
    this.closeActiveDatePicker = close;

    const picker = new CalendarDatePicker({
      i18n: this.i18n,
      selectedDate: this.currentDate,
      getWeekStartDay: () => this.getWeekStartDay(),
      getLocalizedDayNames: () => this.getLocalizedDayNames(),
      hasTasks: (date) => this.getTasksForDate(date).length > 0,
      onSelect: (date) => {
        this.setCurrentDate(date);
        close();
        this.refreshCalendar().catch(console.error);
      },
    });
    picker.mount(panel);
    positionPanel();
    picker.focusSelected();

    anchorButton.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('mousedown', onPointerDown, true);
    window.addEventListener('resize', onResize);
  }

  async onClose(): Promise<void> {
    this.closeActiveDatePicker?.();
    // El popover de la barra vive en document.body: si queda abierto, sus casillas apuntarían a una barra destruida.
    closeFilterPopover();
    // Al cambiar de tipo de vista, Obsidian destruye esta instancia sin pasar por render(),
    // así que un tooltip visible (su DOM vive en document.body, fuera del contenedor) quedaría
    // huérfano si no se limpia aquí explícitamente.
    clearTooltips(this.containerEl.children[1] as HTMLElement);
  }

  protected navigateToDayView(dateStr: string): void {
    this.setCurrentDate(DateTime.fromISO(dateStr));
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