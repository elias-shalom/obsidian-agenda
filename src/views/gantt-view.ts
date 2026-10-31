import { WorkspaceLeaf, Notice, getLanguage, setIcon } from 'obsidian';
import { DateTime } from 'luxon';
import { BaseView } from './base-view';
import { TaskManager } from '../core/task-manager';
import { ITask, AgendaPlugin } from '../types/interfaces';
import { TaskPriority } from '../types/enums';
import { I18n } from '../core/i18n';
import { TaskWriter } from '../core/task-writer';
import { attachTaskGestures, TASK_GESTURE_IGNORE_SELECTOR } from '../core/task-gestures';
import { TaskFilterBar } from '../core/task-filter-bar';
import { TaskViewState, filterTasksByViewState } from '../core/task-view-state';
import { TASK_SORT_COLUMNS, sortTasksByColumn } from '../core/task-column-sort';
import { groupTasksByField } from '../core/task-grouping';
import { getReferenceDate, setReferenceDate } from '../core/calendar-reference-date';
import {
  GANTT_ZOOMS, GanttDependencies, GanttDragMode, GanttField, GanttRow, GanttSpan, GanttZoom,
  applyGanttEdit, buildDependencyIndex, buildGanttRows, clampGanttDelta, ganttCenter, ganttWeekBands, ganttWindow,
  planGanttEdit, resolveGanttSpan, shiftGanttReference, splitUndated,
} from '../core/task-gantt';
import {
  isGanttGroupCollapsed, loadGanttState, loadGanttZoom, loadShowUndated,
  saveGanttState, saveGanttZoom, saveShowUndated, setGanttGroupCollapsed,
} from '../core/gantt-state';

export const GANTT_VIEW_TYPE = 'gantt-view';

/** Sangría de cada nivel de grupo en la columna de nombres (px). */
const INDENT_PX = 16;
const FIELD_EMOJI: Record<GanttField, string> = { start: '🛫', scheduled: '⏳', due: '📅' };
const FIELD_LABEL_KEY: Record<GanttField, string> = { start: 'start_date', scheduled: 'scheduled_date', due: 'due_date' };

type GanttViewData = {
  zoomOptions: { value: string; label: string; title: string; isMonth: boolean; active: boolean }[];
  periodLabel: string;
  year: number;
  months: { index: number; label: string; active: boolean }[];
  weekBands: { label: string; left: number; width: number }[];
  days: { day: number; weekday: string; today: boolean; weekend: boolean; weekStart: boolean }[];
  todayLeft: number | null;
  rows: Record<string, unknown>[];
  emptyMessage: string;
  undatedCount: number;
  undatedTitle: string;
  showUndated: boolean;
  undated: { filePath: string; lineNumber: number; priority: string; desc: string }[];
  previousLabel: string;
  nextLabel: string;
  todayLabel: string;
};

/** Diagrama de Gantt (v1.1.13; Especificación §12, Arquitectura §21): una fila por tarea sobre un eje de tiempo. */
export class GanttView extends BaseView {
  private tasks: ITask[] = [];
  private viewState!: TaskViewState;
  private filterBar: TaskFilterBar | null = null;
  private content: HTMLElement | null = null;
  private taskWriter: TaskWriter;
  private zoom: GanttZoom = 14;
  private reference: DateTime = DateTime.now().startOf('day');
  private windowYear: number = DateTime.now().year;
  private showUndated = false;

  constructor(leaf: WorkspaceLeaf, private plugin: AgendaPlugin, private i18n: I18n, private taskManager: TaskManager) {
    super(leaf);
    this.taskWriter = new TaskWriter(this.app);
  }

  getViewType(): string {
    return GANTT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t('gantt_view_title');
  }

  getIcon(): string {
    return 'chart-gantt';
  }

  async onOpen(): Promise<void> {
    this.showLoadingOverlay(5, false);

    this.tasks = await this.getAllTasks(this.taskManager);
    this.zoom = loadGanttZoom(this.app);
    this.showUndated = loadShowUndated(this.app);
    this.reference = (getReferenceDate() ?? DateTime.now()).startOf('day');

    // La barra se crea antes de dibujar porque reajusta el área guardada si ya no tiene tareas.
    this.filterBar = new TaskFilterBar({
      i18n: this.i18n,
      tasks: this.tasks,
      state: loadGanttState(this.app),
      sortOptions: TASK_SORT_COLUMNS.map(({ value, labelKey }) => ({ value, label: this.i18n.t(labelKey) })),
      onChange: (state) => {
        this.viewState = state;
        saveGanttState(this.app, state);
        this.refreshChart().catch(console.error);
      },
    });
    this.viewState = this.filterBar.getState();

    await this.render(GANTT_VIEW_TYPE, this.buildViewData(), this.i18n, this.plugin, this.leaf);
  }

  private getWeekStartDay(): number {
    return this.plugin.settings.weekStartDay;
  }

  private formatDate(date: DateTime): string {
    return date.toFormat('yyyy-MM-dd');
  }

  /** Aplica búsqueda, filtros y orden, agrupa por área y calcula la ventana y las filas. */
  private buildViewData(): GanttViewData {
    const t = (key: string, params?: Record<string, string | number>) => this.i18n.t(key, params);
    const locale = getLanguage() || 'en';
    const weekStart = this.getWeekStartDay();

    const sorted = sortTasksByColumn(
      filterTasksByViewState(this.tasks, this.viewState),
      this.viewState.sortColumn,
      this.viewState.sortDirection
    );
    const { dated, undated } = splitUndated(sorted);
    const win = ganttWindow(this.reference, this.zoom, weekStart);
    this.windowYear = win.start.year;

    const groups = groupTasksByField(dated, 'area', key => t(key));
    const rows = buildGanttRows(groups, win, key => isGanttGroupCollapsed(this.app, key));
    const dependencies = buildDependencyIndex(this.tasks);

    const windowEnd = win.start.plus({ days: win.days - 1 });
    const periodLabel = this.zoom === 'month'
      ? win.start.setLocale(locale).toFormat('LLLL yyyy')
      : `${win.start.setLocale(locale).toLocaleString(DateTime.DATE_MED)} – ${windowEnd.setLocale(locale).toLocaleString(DateTime.DATE_MED)}`;

    const now = DateTime.now();
    const vaultHasTasks = this.tasks.length > 0;
    const emptyMessage = !vaultHasTasks ? t('no_tasks') : sorted.length === 0 ? t('no_tasks_match_filters') : t('gantt_empty');

    return {
      zoomOptions: GANTT_ZOOMS.map(zoom => ({
        value: String(zoom),
        // Los días llevan solo el número y el mes un icono (en wireChart), como el selector del calendario.
        label: zoom === 'month' ? '' : String(zoom),
        title: zoom === 'month' ? t('month_view') : t('gantt_zoom_days', { n: zoom }),
        isMonth: zoom === 'month',
        active: zoom === this.zoom,
      })),
      periodLabel,
      year: win.start.year,
      months: Array.from({ length: 12 }, (_, index) => ({
        index: index + 1,
        label: DateTime.local(2000, index + 1, 1).setLocale(locale).toFormat('LLL'),
        active: win.start.month === index + 1,
      })),
      weekBands: ganttWeekBands(win, weekStart).map(band => ({ label: `${t('gantt_week_prefix')}${band.weekNumber}`, left: band.left, width: band.width })),
      days: Array.from({ length: win.days }, (_, index) => {
        const date = win.start.plus({ days: index });
        return {
          day: date.day,
          weekday: date.setLocale(locale).toFormat(win.days > 14 ? 'ccccc' : 'ccc'),
          today: date.hasSame(now, 'day'),
          weekend: date.weekday >= 6,
          weekStart: (date.weekday - weekStart + 7) % 7 === 0,
        };
      }),
      todayLeft: ganttCenter(now, win),
      rows: rows.map(row => this.toRowView(row, dependencies)),
      emptyMessage,
      undatedCount: undated.length,
      undatedTitle: t('gantt_undated_title'),
      showUndated: this.showUndated,
      undated: undated.map(task => ({ filePath: task.file.path, lineNumber: task.line.number, priority: task.state.priority, desc: task.section.desc })),
      previousLabel: t('previous'),
      nextLabel: t('next'),
      todayLabel: t('today'),
    };
  }

  private toRowView(row: GanttRow, dependencies: Map<string, GanttDependencies>): Record<string, unknown> {
    if (row.isGroup) {
      return {
        isGroup: true,
        key: row.key,
        label: row.label,
        indent: row.depth * INDENT_PX,
        color: row.color,
        count: row.count,
        collapsed: row.collapsed,
      };
    }

    const { task, span } = row;
    const isMilestone = span.kind === 'milestone';
    const barTitle = this.datesTitle(task);

    const info = dependencies.get(task.id);
    const linkParts: string[] = [];
    if (info?.dependsOn.length) linkParts.push(this.i18n.t('gantt_depends_on', { list: info.dependsOn.join(', ') }));
    if (info?.blocks.length) linkParts.push(this.i18n.t('gantt_blocks', { list: info.blocks.join(', ') }));

    return {
      isGroup: false,
      filePath: task.file.path,
      lineNumber: task.line.number,
      status: task.state.status,
      emoji: task.state.emoji,
      priority: task.state.priority,
      hasPriority: Object.values<string>(TaskPriority).includes(task.state.priority),
      desc: task.section.desc,
      indent: row.depth * INDENT_PX,
      color: row.color,
      isMilestone,
      left: row.position.left,
      width: row.position.width,
      clippedLeft: row.position.clippedLeft,
      clippedRight: row.position.clippedRight,
      centerLeft: row.centerLeft,
      markLeft: row.markLeft,
      barTitle,
      startHandleTitle: this.fieldTitle(span.startField),
      endHandleTitle: this.fieldTitle(span.endField),
      extendSide: span.extendSide,
      extendTitle: this.fieldTitle(span.extendField),
      linkTitle: linkParts.join(' · '),
      invalidTitle: span.invalid ? this.i18n.t('gantt_invalid_range') : '',
    };
  }

  protected setupViewSpecificEventListeners(container: HTMLElement): void {
    this.content = container;

    const toolbar = container.querySelector<HTMLElement>('.oa-gantt-toolbar');
    if (toolbar) this.filterBar?.mount(toolbar);

    this.wireChart(container);
  }

  /** Vuelve a dibujar el diagrama (no la barra de filtros) tras un cambio de zoom, ventana, filtro o plegado. */
  private async refreshChart(): Promise<void> {
    const container = this.content;
    if (!container) return;

    const staging = createDiv();
    await this.renderTemplate(staging, GANTT_VIEW_TYPE, this.buildViewData());
    const next = staging.querySelector('.oa-gantt');
    if (!next) return;

    container.querySelector('.oa-gantt')?.replaceWith(next);
    this.wireChart(container);
  }

  private moveReference(next: DateTime): void {
    this.reference = next.startOf('day');
    setReferenceDate(this.reference);
    this.refreshChart().catch(console.error);
  }

  private wireChart(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('[data-group-color]').forEach(el => {
      el.setCssProps({ '--oa-gantt-color': el.dataset.groupColor ?? '' });
    });

    container.querySelectorAll<HTMLElement>('[data-zoom]').forEach(button => {
      if (button.dataset.zoom === 'month') setIcon(button, 'calendar-days');
      button.addEventListener('click', () => {
        const value = button.dataset.zoom;
        const zoom = GANTT_ZOOMS.find(candidate => String(candidate) === value);
        if (zoom === undefined || zoom === this.zoom) return;
        this.zoom = zoom;
        saveGanttZoom(this.app, zoom);
        this.refreshChart().catch(console.error);
      });
    });

    container.querySelectorAll<HTMLElement>('[data-action]').forEach(button => {
      button.addEventListener('click', () => {
        switch (button.dataset.action) {
          case 'prev': this.moveReference(shiftGanttReference(this.reference, this.zoom, -1)); break;
          case 'next': this.moveReference(shiftGanttReference(this.reference, this.zoom, 1)); break;
          case 'today': this.moveReference(DateTime.now()); break;
          case 'prev-year': this.moveReference(this.reference.minus({ years: 1 })); break;
          case 'next-year': this.moveReference(this.reference.plus({ years: 1 })); break;
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-month]').forEach(button => {
      button.addEventListener('click', () => {
        this.moveReference(DateTime.local(this.windowYear, Number(button.dataset.month), 1));
      });
    });

    container.querySelectorAll<HTMLElement>('[data-group-key]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.groupKey ?? '';
        setGanttGroupCollapsed(this.app, key, !isGanttGroupCollapsed(this.app, key));
        this.refreshChart().catch(console.error);
      });
    });

    // La lista de tareas sin fecha se pliega como un grupo de la Lista, sin volver a dibujar el diagrama.
    container.querySelector<HTMLElement>('[data-action-undated]')?.addEventListener('click', (event) => {
      const group = (event.currentTarget as HTMLElement).closest('.oa-folder-group');
      if (!group) return;
      group.toggleClass('oa-collapsed', !group.hasClass('oa-collapsed'));
      this.showUndated = !group.hasClass('oa-collapsed');
      saveShowUndated(this.app, this.showUndated);
    });

    // Clic edita, doble clic abre la nota y clic derecho cambia el estado (gestos compartidos).
    container.querySelectorAll<HTMLElement>('[data-task-row]').forEach(row => {
      attachTaskGestures(row, {
        plugin: this.plugin,
        i18n: this.i18n,
        taskWriter: this.taskWriter,
        getTask: () => this.findTask(row),
        onChanged: () => this.refreshView(),
        openFile: (filePath, lineNumber) => this.openTaskFile(filePath, lineNumber),
        ignoreSelector: TASK_GESTURE_IGNORE_SELECTOR,
      });
    });

    container.querySelectorAll<HTMLElement>('[data-drag]').forEach(el => this.wireDrag(el));
  }

  private findTask(row: HTMLElement | null): ITask | undefined {
    if (!row) return undefined;
    const filePath = row.getAttribute('data-file-path');
    const lineNumber = Number(row.getAttribute('data-line-number'));
    return this.tasks.find(candidate => candidate.file.path === filePath && candidate.line.number === lineNumber);
  }

  private fieldTitle(field: GanttField | null): string {
    return field ? `${FIELD_EMOJI[field]} ${this.i18n.t(FIELD_LABEL_KEY[field])}` : '';
  }

  /** Reescribe la línea de la tarea como era al dibujarse la vista; avisa si la nota cambió. */
  private async writeTaskLine(task: ITask, transform: (line: string) => string): Promise<void> {
    const written = await this.taskWriter.updateTaskLine(task.file.path, task.line.number, task.line.text, transform);
    if (!written) new Notice(this.i18n.t('task_line_changed'));
  }

  /** Todas las fechas de la tarea en orden, p. ej. «🛫 2026-11-02 → ⏳ 2026-11-04 → 📅 2026-11-06», desplazadas `deltaDays`. */
  private datesTitle(task: ITask, deltaDays = 0): string {
    return (['start', 'scheduled', 'due'] as const)
      .flatMap(field => {
        const date = task.date[field];
        return date ? [`${FIELD_EMOJI[field]} ${this.formatDate(date.plus({ days: deltaDays }))}`] : [];
      })
      .join(' → ');
  }

  /** Texto de la insignia mientras se arrastra: el campo que se escribiría y su nueva fecha. */
  private describeEdit(task: ITask, span: GanttSpan, mode: GanttDragMode, delta: number): string {
    if (!span.start || !span.end) return '';
    const emoji = (field: GanttField | null): string => (field ? FIELD_EMOJI[field] : '');
    switch (mode) {
      case 'move': return this.datesTitle(task, delta);
      case 'resize-start': return `${emoji(span.startField)} ${this.formatDate(span.start.plus({ days: delta }))}`;
      case 'resize-end': return `${emoji(span.endField)} ${this.formatDate(span.end.plus({ days: delta }))}`;
      case 'extend': return `${emoji(span.extendField)} ${this.formatDate(span.start.plus({ days: delta }))}`;
    }
  }

  /**
   * Arrastre con eventos de puntero en pasos de un día (Especificación §12.4): mover la barra o el hito,
   * redimensionar un borde o extender un hito. Muestra el cambio en vivo y escribe al soltar.
   */
  private wireDrag(el: HTMLElement): void {
    const mode = el.dataset.drag as GanttDragMode | undefined;
    if (!mode) return;
    let suppressClick = false;

    el.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const row = el.closest<HTMLElement>('[data-task-row]');
      const track = el.closest<HTMLElement>('.oa-gantt-track');
      const chart = el.closest<HTMLElement>('.oa-gantt');
      const task = this.findTask(row);
      const days = Number(chart?.dataset.days) || 0;
      const dayPx = track && days ? track.getBoundingClientRect().width / days : 0;
      if (!track || !task || dayPx <= 0) return;

      event.preventDefault();
      event.stopPropagation(); // La barra no debe iniciar su arrastre cuando se pulsa una manija.

      const span = resolveGanttSpan(task);
      const dayPct = 100 / days;
      const parts = Array.from(track.querySelectorAll<HTMLElement>('.oa-gantt-bar, .oa-gantt-notch, .oa-gantt-milestone'));
      const bar = track.querySelector<HTMLElement>('.oa-gantt-bar');
      const barLeft = Number(bar?.dataset.left);
      const barWidth = Number(bar?.dataset.width);
      const center = Number(el.dataset.center);
      const startX = event.clientX;
      let delta = 0;
      const tooltip = document.body.createDiv({ cls: 'oa-calendar-resize-tooltip', text: this.describeEdit(task, span, mode, 0) });

      const place = (x: number, y: number): void => tooltip.setCssStyles({ left: `${x + 12}px`, top: `${y - 12}px` });
      const preview = (): void => {
        switch (mode) {
          case 'move':
            parts.forEach(part => part.setCssProps({ translate: `${delta * dayPx}px` }));
            break;
          case 'resize-start':
            bar?.setCssStyles({ left: `${barLeft + delta * dayPct}%`, width: `${Math.max(0, barWidth - delta * dayPct)}%` });
            break;
          case 'resize-end':
            bar?.setCssStyles({ width: `${Math.max(0, barWidth + delta * dayPct)}%` });
            break;
          case 'extend': {
            const ghost = track.querySelector<HTMLElement>('.oa-gantt-bar--ghost') ?? track.createDiv({ cls: 'oa-gantt-bar oa-gantt-bar--ghost' });
            const column = center - dayPct / 2;
            const from = Math.max(0, column + Math.min(delta, 0) * dayPct);
            const to = Math.min(100, column + dayPct + Math.max(delta, 0) * dayPct);
            ghost.setCssStyles({ left: `${from}%`, width: `${Math.max(0, to - from)}%` });
            break;
          }
        }
      };
      const reset = (): void => {
        parts.forEach(part => part.setCssProps({ translate: '' }));
        bar?.setCssStyles({ left: `${barLeft}%`, width: `${barWidth}%` });
        track.querySelector('.oa-gantt-bar--ghost')?.remove();
      };

      const onMove = (moveEvent: PointerEvent): void => {
        delta = clampGanttDelta(span, mode, Math.round((moveEvent.clientX - startX) / dayPx));
        tooltip.setText(this.describeEdit(task, span, mode, delta));
        place(moveEvent.clientX, moveEvent.clientY);
        preview();
      };
      const finish = (endEvent: PointerEvent, commit: boolean): void => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onCancel);
        el.releasePointerCapture(endEvent.pointerId);
        el.removeClass('oa-resizing');
        tooltip.remove();

        const edit = commit ? planGanttEdit(span, mode, delta) : null;
        if (!edit) {
          reset();
          return;
        }
        suppressClick = true;
        window.setTimeout(() => { suppressClick = false; }, 0);
        this.writeTaskLine(task, line => applyGanttEdit(line, edit))
          .then(() => this.refreshView())
          .catch(console.error);
      };
      const onUp = (upEvent: PointerEvent): void => finish(upEvent, true);
      const onCancel = (cancelEvent: PointerEvent): void => finish(cancelEvent, false);

      el.addClass('oa-resizing');
      place(event.clientX, event.clientY);
      el.setPointerCapture(event.pointerId);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
    });

    // El clic posterior al arrastre no debe abrir el modal de la tarea; las manijas nunca lo abren.
    el.addEventListener('click', (event) => {
      if (mode === 'move' && !suppressClick) return;
      event.stopPropagation();
      event.preventDefault();
    });
  }

  async onClose(): Promise<void> {
    // Sin recursos que liberar
  }
}
