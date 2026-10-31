import { WorkspaceLeaf, getLanguage, setIcon } from 'obsidian';
import { DateTime } from 'luxon';
import { BaseView } from './base-view';
import { TaskManager } from '../core/task-manager';
import { ITask, AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskWriter } from '../core/task-writer';
import { attachTaskGestures, TASK_GESTURE_IGNORE_SELECTOR } from '../core/task-gestures';
import { TaskFilterBar } from '../core/task-filter-bar';
import { TaskViewState, filterTasksByViewState } from '../core/task-view-state';
import { TASK_SORT_COLUMNS, sortTasksByColumn } from '../core/task-column-sort';
import { groupTasksByField } from '../core/task-grouping';
import { getReferenceDate, setReferenceDate } from '../core/calendar-reference-date';
import {
  GANTT_ZOOMS, GanttDependencies, GanttField, GanttRow, GanttZoom,
  buildDependencyIndex, buildGanttRows, ganttCenter, ganttWeekBands, ganttWindow, shiftGanttReference, splitUndated,
} from '../core/task-gantt';
import {
  isGanttGroupCollapsed, loadGanttState, loadGanttZoom, loadShowUndated,
  saveGanttState, saveGanttZoom, saveShowUndated, setGanttGroupCollapsed,
} from '../core/gantt-state';

export const GANTT_VIEW_TYPE = 'gantt-view';

/** Sangría de cada nivel de grupo en la columna de nombres (px). */
const INDENT_PX = 16;
const FIELD_EMOJI: Record<GanttField, string> = { start: '🛫', scheduled: '⏳', due: '📅' };

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
    const start = span.start ? this.formatDate(span.start) : '';
    const end = span.end ? this.formatDate(span.end) : '';
    const isMilestone = span.kind === 'milestone';
    const barTitle = isMilestone
      ? `${FIELD_EMOJI[span.startField ?? 'start']} ${start}`
      : `${FIELD_EMOJI[span.startField ?? 'start']} ${start} → ${FIELD_EMOJI[span.endField ?? 'due']} ${end}`;

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
        getTask: () => {
          const filePath = row.getAttribute('data-file-path');
          const lineNumber = Number(row.getAttribute('data-line-number'));
          return this.tasks.find(candidate => candidate.file.path === filePath && candidate.line.number === lineNumber);
        },
        onChanged: () => this.refreshView(),
        openFile: (filePath, lineNumber) => this.openTaskFile(filePath, lineNumber),
        ignoreSelector: TASK_GESTURE_IGNORE_SELECTOR,
      });
    });
  }

  async onClose(): Promise<void> {
    // Sin recursos que liberar
  }
}
