import { WorkspaceLeaf, Plugin, setIcon } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { HourSlot, HourRow, DayColumnData, DaysToShow, DayViewData, DurationTaskSegment, ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";
import { upsertScheduledDate, upsertScheduledTime, upsertScheduledDuration, clearScheduledTime } from "../core/task-line-fields";
import { CalendarDatePicker } from "../core/calendar-date-picker";

export const CALENDAR_DAY_VIEW_TYPE = "calendar-day-view";

/** Clave de persistencia del colapso del sidebar del selector de fecha (v1.1.9). */
const SIDEBAR_COLLAPSED_KEY = 'calendar_day_sidebar_collapsed';

/** Clave de persistencia del modo de varios días (v1.1.10, §4.4.3/§13). */
const DAYS_TO_SHOW_KEY = 'calendar_day_days_to_show';

/** Medias-horas del día (0–47); cada bloque con duración redondea su fin hacia arriba al siguiente múltiplo de 30 min (v1.1.9, §4.7.2/§4.7.5). */
const HALF_SLOTS_PER_DAY = 48;

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

  /** Preferencia de 1/3/5 días persistida en `localStorage` (v1.1.10, mismo patrón que
   * `calendar-grid-style` de Semana/Semana laboral). */
  private getDaysToShow(): DaysToShow {
    const stored = Number(this.app.loadLocalStorage(DAYS_TO_SHOW_KEY));
    return stored === 3 || stored === 5 ? stored : 1;
  }

  /**
   * Genera datos para la vista diaria del calendario: una columna por día visible (1, 3 o 5),
   * centradas en la fecha de referencia (v1.1.10, §4.4.3/§13).
   */
  protected generateViewData(): DayViewData {
    const daysToShow = this.getDaysToShow();
    const windowStart = this.currentDate.minus({ days: Math.floor(daysToShow / 2) });

    const columns: DayColumnData[] = [];
    const hourRows: HourRow[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      formattedHour: this.formatHour(hour),
      columns: [],
    }));

    for (let i = 0; i < daysToShow; i++) {
      const columnDate = windowStart.plus({ days: i });
      const { column, hourSlotsByHour } = this.buildDayColumn(columnDate);
      columns.push(column);
      for (let hour = 0; hour < 24; hour++) {
        hourRows[hour].columns.push(hourSlotsByHour[hour]);
      }
    }

    const windowEnd = windowStart.plus({ days: daysToShow - 1 });
    const periodName = daysToShow === 1
      ? this.currentDate.toFormat('EEEE, MMMM d, yyyy')
      : `${windowStart.toFormat('MMM d')} – ${windowEnd.toFormat('MMM d, yyyy')}`;

    return {
      viewType: CalendarViewType.Day,
      date: this.currentDate,
      weekday: this.currentDate.weekday,
      dayName: this.currentDate.toFormat('cccc'), // Nombre completo del día
      isToday: this.currentDate.hasSame(DateTime.now(), 'day'),
      daysToShow,
      columns,
      hourRows,
      periodName,
      sidebarCollapsed: this.app.loadLocalStorage(SIDEBAR_COLLAPSED_KEY) === 'true',
    };
  }

  /** Genera los datos de una sola columna de día (todo-el-día + segmentos de hora), de forma
   * independiente: los carriles de solapamiento no se comparten entre columnas (v1.1.10, §13.2). */
  private buildDayColumn(date: DateTime): { column: DayColumnData; hourSlotsByHour: HourSlot[] } {
    const dayTasks = this.getTasksForDate(date);
    const dateIso = date.toISODate() ?? '';

    // Tareas ancladas por `scheduled` con hora asignada -> franjas horarias (modo punto/bloque, ADR-T2)
    const scheduledWithTime = dayTasks.filter(task => task.calendarDateType === 'scheduled' && task.date.scheduledTime);
    // Todo-el-día: due/start (siempre día completo, ADR-T1) y scheduled sin hora (caso límite)
    const allDayDue = dayTasks.filter(task => task.calendarDateType === 'due');
    const allDayStart = dayTasks.filter(task => task.calendarDateType === 'start');
    const allDayScheduled = dayTasks.filter(task => task.calendarDateType === 'scheduled' && !task.date.scheduledTime);

    // Bloques con duración (v1.1.9, §4.7 Fase A): un segmento por media-hora que ocupan.
    const segmentsByHalfSlot: DurationTaskSegment[][] = Array.from({ length: HALF_SLOTS_PER_DAY }, () => []);
    // Rango de medias-horas por tarea, antes de asignar carriles (Fase B, §4.7.3). Las tareas sin
    // duración ocupan exactamente una media-hora (la que contiene su minuto) y entran al mismo
    // sistema de segmentos/carriles que las que sí tienen duración, para reservar espacio igual.
    const durationRanges: { task: ITask; startHalfSlot: number; endHalfSlotExclusive: number }[] = [];

    for (const task of scheduledWithTime) {
      const [hourStr, minuteStr] = (task.date.scheduledTime as string).split(':');
      const hour = Number(hourStr);
      const minute = Number(minuteStr);
      const duration = task.date.scheduledDuration;

      const startTotalMinutes = hour * 60 + minute;
      const startHalfSlot = Math.floor(startTotalMinutes / 30);

      if (!duration || duration <= 0) {
        // Sin duración: una sola media-hora (la que contiene el minuto de inicio).
        durationRanges.push({ task, startHalfSlot, endHalfSlotExclusive: startHalfSlot + 1 });
        continue;
      }

      // Redondeo del fin hacia arriba al siguiente múltiplo de 30 min (decidido, §4.7.5/§4.7.2):
      // el bloque dibujado nunca se ve más corto que la duración real.
      const endTotalMinutesRounded = Math.ceil((startTotalMinutes + duration) / 30) * 30;
      // Recorta a medianoche (ADR-T7): una tarea no cruza al día siguiente en el dibujo.
      const endHalfSlotExclusive = Math.max(startHalfSlot + 1, Math.min(HALF_SLOTS_PER_DAY, endTotalMinutesRounded / 30));
      durationRanges.push({ task, startHalfSlot, endHalfSlotExclusive });
    }

    // Carriles por conglomerado de solapamiento (Fase B, §4.7.3): se ordena por inicio y se agrupan
    // en conglomerados de tareas mutuamente solapadas; dentro de cada conglomerado, asignación greedy
    // del primer carril libre. El ancho de carril (1 / nº de carriles) es uniforme en todo el
    // conglomerado, no por media-hora individual, para que las columnas queden alineadas.
    durationRanges.sort((a, b) => a.startHalfSlot - b.startHalfSlot);

    const assignCluster = (cluster: typeof durationRanges): void => {
      const laneEnds: number[] = [];
      const laneIndexByItem = new Map<typeof durationRanges[number], number>();
      for (const item of cluster) {
        let lane = laneEnds.findIndex(end => end <= item.startHalfSlot);
        if (lane === -1) {
          lane = laneEnds.length;
          laneEnds.push(item.endHalfSlotExclusive);
        } else {
          laneEnds[lane] = item.endHalfSlotExclusive;
        }
        laneIndexByItem.set(item, lane);
      }
      const laneCount = laneEnds.length;

      for (const item of cluster) {
        const laneIndex = laneIndexByItem.get(item) ?? 0;
        // Porcentajes precalculados (no calc() con variables CSS anidadas): el minificador de Sass
        // puede aplanar/reordenar esas expresiones y romper el cálculo (ver nota en interfaces.ts).
        const laneWidthPercent = 100 / laneCount;
        const laneLeftPercent = laneIndex * laneWidthPercent;
        const segmentCount = item.endHalfSlotExclusive - item.startHalfSlot;
        for (let i = 0; i < segmentCount; i++) {
          const slotIndex = item.startHalfSlot + i;
          if (slotIndex < 0 || slotIndex >= HALF_SLOTS_PER_DAY) continue;
          const segmentRole: DurationTaskSegment['segmentRole'] = segmentCount === 1
            ? 'half'
            : i === 0 ? 'start' : i === segmentCount - 1 ? 'end' : 'middle';
          segmentsByHalfSlot[slotIndex].push({ ...item.task, segmentRole, laneIndex, laneCount, laneLeftPercent, laneWidthPercent });
        }
      }
    };

    let cluster: typeof durationRanges = [];
    let clusterEnd = -Infinity;
    for (const item of durationRanges) {
      if (cluster.length > 0 && item.startHalfSlot >= clusterEnd) {
        assignCluster(cluster);
        cluster = [];
        clusterEnd = -Infinity;
      }
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endHalfSlotExclusive);
    }
    if (cluster.length > 0) assignCluster(cluster);

    // Organizar tareas programadas por hora (24 horas); cada hora expone su mitad superior
    // (:00–:29) e inferior (:30–:59) por separado para los bloques con duración.
    const hourSlotsByHour: HourSlot[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const upperHalfSegments = segmentsByHalfSlot[hour * 2] ?? [];
      const lowerHalfSegments = segmentsByHalfSlot[hour * 2 + 1] ?? [];
      hourSlotsByHour.push({
        dateIso,
        upperHalfSegments,
        lowerHalfSegments,
        hasDurationSegments: upperHalfSegments.length > 0 || lowerHalfSegments.length > 0,
      });
    }

    const column: DayColumnData = {
      dateIso,
      dayName: date.toFormat('cccc'),
      dayOfMonth: date.day,
      isToday: date.hasSame(DateTime.now(), 'day'),
      isReferenceDay: date.hasSame(this.currentDate, 'day'),
      allDayDue,
      allDayStart,
      allDayScheduled,
    };

    return { column, hourSlotsByHour };
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

    // Modo de varios días 1/3/5 (v1.1.10, §4.4.3/§13): preferencia persistida en `localStorage`,
    // mismo patrón que el selector de estilo de grilla de Semana/Semana laboral.
    const daysToShowButtons = container.querySelectorAll<HTMLButtonElement>('.oa-calendar-days-to-show-btn');
    daysToShowButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.app.saveLocalStorage(DAYS_TO_SHOW_KEY, btn.dataset.daysToShow ?? '1');
        this.refreshCalendar().catch(console.error);
      });
    });

    // Sección "Todo el día": colapsada por defecto (D10)
    const alldayToggle = container.querySelector<HTMLButtonElement>('.oa-calendar-allday-toggle');
    const alldayContainer = container.querySelector<HTMLElement>('.oa-calendar-allday');
    alldayToggle?.addEventListener('click', () => {
      if (!alldayContainer) return;
      const nowExpanded = !alldayContainer.hasClass('oa-expanded');
      alldayContainer.toggleClass('oa-expanded', nowExpanded);
      alldayToggle.setAttribute('aria-expanded', String(nowExpanded));
    });

    // Drag and drop (v1.1.4, Fase D; snap de media hora en v1.1.9; varias columnas en v1.1.10):
    // arrastrar una tarea programada a otra franja la mueve a la media hora exacta donde se suelta
    // (mitad superior = :00, mitad inferior = :30) y a la fecha de la columna donde se soltó, sin
    // importar el minuto/día original.
    // Doble clic en una franja vacía crea una tarea con fecha + hora prellenadas (v1.1.9, fix).
    const hourSlots = container.querySelectorAll<HTMLElement>('.oa-calendar-hour-slot');
    hourSlots.forEach(slot => {
      slot.addEventListener('dblclick', (e) => {
        if ((e.target as HTMLElement).closest('.oa-calendar-task')) return;

        const hourStr = slot.dataset.hour;
        if (hourStr === undefined) return;
        const hour = Number(hourStr);
        if (Number.isNaN(hour)) return;

        const dateStr = slot.dataset.date;
        if (!dateStr) return;
        this.openCreateTaskForDate(dateStr, `${String(hour).padStart(2, '0')}:00`);
      });

      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        const isUpperHalf = this.isPointerOverUpperHalf(e, slot);
        slot.toggleClass('oa-calendar-drop-target--upper', isUpperHalf);
        slot.toggleClass('oa-calendar-drop-target--lower', !isUpperHalf);
      });

      slot.addEventListener('dragleave', () => {
        slot.removeClass('oa-calendar-drop-target--upper');
        slot.removeClass('oa-calendar-drop-target--lower');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        const isUpperHalf = this.isPointerOverUpperHalf(e, slot);
        slot.removeClass('oa-calendar-drop-target--upper');
        slot.removeClass('oa-calendar-drop-target--lower');
        this.handleHourSlotDrop(e, slot.dataset.date, slot.dataset.hour, isUpperHalf ? '00' : '30');
      });
    });

    // Doble clic en la sección "Todo el día" crea una tarea sin hora (v1.1.9, fix). Arrastrar una
    // tarea programada de una franja horaria de vuelta a "Todo el día" le quita la hora/duración y
    // la mueve a la fecha de esa columna (v1.1.10): vuelve a aparecer en la fila de "programada sin
    // hora". El tipo de payload solo se valida en el `drop`: `dataTransfer.getData()` no devuelve
    // nada durante `dragover` (solo en `dragstart`/`drop`), así que validar aquí impediría llamar a
    // `preventDefault()` y el navegador rechazaría el drop antes de disparar el evento.
    const alldayColumns = container.querySelectorAll<HTMLElement>('.oa-calendar-allday-content');
    alldayColumns.forEach(alldayContent => {
      alldayContent.addEventListener('dblclick', (e) => {
        if ((e.target as HTMLElement).closest('.oa-calendar-task')) return;
        const dateStr = alldayContent.dataset.date;
        if (dateStr) this.openCreateTaskForDate(dateStr);
      });

      alldayContent.addEventListener('dragover', (e) => {
        e.preventDefault();
        alldayContent.addClass('oa-calendar-drop-target');
      });

      alldayContent.addEventListener('dragleave', () => {
        alldayContent.removeClass('oa-calendar-drop-target');
      });

      alldayContent.addEventListener('drop', (e) => {
        e.preventDefault();
        alldayContent.removeClass('oa-calendar-drop-target');
        const dateStr = alldayContent.dataset.date;
        const payload = this.parseTaskDragPayload(e);
        if (!dateStr || !payload || payload.calendarDateType !== 'scheduled') return;

        this.taskWriter.updateTaskLine(payload.filePath, payload.lineNumber, (line) => {
          const withDate = upsertScheduledDate(line, dateStr);
          const result = clearScheduledTime(withDate);
          return result.ok ? result.line : withDate;
        })
          .then(ok => {
            if (ok) this.refreshView().catch(console.error);
          })
          .catch(console.error);
      });
    });

    // Redimensionar arrastrando el borde inferior del último segmento de una tarea (v1.1.9, Fase C,
    // §4.7.4): snap a pasos de 30 minutos, duración mínima 30 minutos.
    const resizeHandles = container.querySelectorAll<HTMLElement>('.oa-calendar-resize-handle');
    resizeHandles.forEach(handle => this.wireResizeHandle(handle));
  }

  /** Arrastre lineal (análogo al dial de hábitos, pero vertical) para cambiar `scheduledDuration`. */
  private wireResizeHandle(handle: HTMLElement): void {
    const filePath = handle.dataset.filePath;
    const lineNumber = Number(handle.dataset.lineNumber);
    if (!filePath || Number.isNaN(lineNumber)) return;

    const initialDuration = Number(handle.dataset.currentDuration) || 30;
    let halfSlotPx = 22;
    let startY = 0;
    let liveDuration = initialDuration;
    let tooltip: HTMLElement | null = null;

    const snapDuration = (deltaY: number): number => {
      const deltaHalfSlots = Math.round(deltaY / halfSlotPx);
      return Math.max(30, initialDuration + deltaHalfSlots * 30);
    };

    const positionTooltip = (event: PointerEvent): void => {
      if (!tooltip) return;
      tooltip.setCssStyles({ left: `${event.clientX + 12}px`, top: `${event.clientY - 12}px` });
    };

    const onPointerMove = (event: PointerEvent): void => {
      liveDuration = snapDuration(event.clientY - startY);
      if (tooltip) tooltip.setText(`${liveDuration}m`);
      positionTooltip(event);
    };

    const onPointerUp = (event: PointerEvent): void => {
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.releasePointerCapture(event.pointerId);
      handle.removeClass('oa-resizing');
      tooltip?.remove();
      tooltip = null;

      if (liveDuration === initialDuration) return;
      this.taskWriter.updateTaskLine(filePath, lineNumber, (line) => {
        const result = upsertScheduledDuration(line, liveDuration);
        return result.ok ? result.line : line;
      })
        .then(ok => {
          if (ok) this.refreshView().catch(console.error);
        })
        .catch(console.error);
    };

    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation(); // No iniciar el drag nativo (mover la tarea) de la píldora contenedora.

      const row = handle.closest<HTMLElement>('.oa-calendar-hour-row');
      halfSlotPx = (row?.getBoundingClientRect().height ?? 44) / 2;
      startY = event.clientY;
      liveDuration = initialDuration;

      handle.addClass('oa-resizing');
      tooltip = document.body.createDiv({ cls: 'oa-calendar-resize-tooltip', text: `${initialDuration}m` });
      positionTooltip(event);

      handle.setPointerCapture(event.pointerId);
      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', onPointerUp);
    });

    // El navegador dispara 'click' tras el pointerup aunque este se detenga antes; sin esto, el
    // clic burbujea a la píldora contenedora y abre el modal de edición al soltar.
    handle.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
    });
  }

  /** `true` si el cursor del arrastre está sobre la mitad superior (:00) de la franja; `false` si está en la inferior (:30). */
  private isPointerOverUpperHalf(event: DragEvent, slot: HTMLElement): boolean {
    const rect = slot.getBoundingClientRect();
    return (event.clientY - rect.top) < rect.height / 2;
  }

  /** Aplica el drop de una tarea programada sobre una franja horaria: reescribe su hora (🕐) a la
   * media hora exacta donde se soltó y su fecha (⏳) a la columna donde se soltó (v1.1.10; antes
   * solo la hora, sin importar el minuto original de la tarea, v1.1.9). */
  private handleHourSlotDrop(event: DragEvent, dateIso: string | undefined, hourStr: string | undefined, minutes: '00' | '30'): void {
    if (hourStr === undefined || !dateIso) return;
    const payload = this.parseTaskDragPayload(event);
    if (!payload || payload.calendarDateType !== 'scheduled') return;

    const hour = Number(hourStr);
    if (Number.isNaN(hour)) return;

    const newTime = `${String(hour).padStart(2, '0')}:${minutes}`;

    this.taskWriter.updateTaskLine(payload.filePath, payload.lineNumber, (line) => {
      const withDate = upsertScheduledDate(line, dateIso);
      const result = upsertScheduledTime(withDate, newTime);
      return result.ok ? result.line : withDate;
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