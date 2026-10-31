import { Notice, WorkspaceLeaf } from 'obsidian';
import { BaseView } from './base-view';
import { TaskManager } from '../core/task-manager';
import { ITask, AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskWriter } from '../core/task-writer';
import { attachTaskGestures, changeTaskStatus, TASK_GESTURE_IGNORE_SELECTOR } from '../core/task-gestures';
import { TaskFilterBar } from '../core/task-filter-bar';
import { TaskViewState, filterTasksByViewState } from '../core/task-view-state';
import { TASK_SORT_COLUMNS, sortTasksByColumn } from '../core/task-column-sort';
import { KANBAN_GROUP_OPTIONS, KanbanColumn, KanbanPriority, buildKanbanColumns, priorityLineTransform, taskColumnKey } from '../core/kanban-board';
import { loadKanbanState, saveKanbanState } from '../core/kanban-state';
import { collapseStorageKey, parseCollapseChoice, resolveCollapsed } from '../core/kanban-collapse';

export const KANBAN_VIEW_TYPE = 'kanban-view';

/** Tipo propio para que un arrastre de otra parte (texto, enlaces, otra vista) no se acepte como tarjeta. */
const DRAG_MIME = 'application/x-agenda-kanban-task';

/** Margen para la barra de desplazamiento horizontal del tablero, que se suma a la altura de las columnas. */
const SCROLLBAR_ALLOWANCE_PX = 16;
/** Altura mínima que se deja a las columnas aunque el panel sea muy bajo. */
const MIN_COLUMN_MAX_HEIGHT_PX = 160;

type KanbanViewData = {
  columns: {
    key: string;
    label: string;
    count: number;
    droppable: boolean;
    collapsed: boolean;
    color?: string;
    tasks: ITask[];
  }[];
  /** La tarjeta repite estado o prioridad solo cuando las columnas no lo dicen ya. */
  showStatusIcon: boolean;
  showPriorityIcon: boolean;
  /** Hay tareas en el vault, aunque los filtros las oculten (cambia el mensaje de tablero vacío). */
  vaultHasTasks: boolean;
};

export class KanbanView extends BaseView {
  private tasks: ITask[] = [];
  private columns: KanbanColumn[] = [];
  private viewState!: TaskViewState;
  private filterBar: TaskFilterBar | null = null;
  private content: HTMLElement | null = null;
  private sizeObserver: ResizeObserver | null = null;
  private taskWriter: TaskWriter;

  constructor(leaf: WorkspaceLeaf, private plugin: AgendaPlugin, private i18n: I18n, private taskManager: TaskManager) {
    super(leaf);
    this.taskWriter = new TaskWriter(this.app);
  }

  getViewType(): string {
    return KANBAN_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t('kanban_view_title');
  }

  getIcon(): string {
    return 'kanban';
  }

  async onOpen(): Promise<void> {
    this.showLoadingOverlay(5, false);

    this.tasks = await this.getAllTasks(this.taskManager);

    // La barra se crea antes de dibujar porque reajusta el área guardada si ya no tiene tareas.
    this.filterBar = new TaskFilterBar({
      i18n: this.i18n,
      tasks: this.tasks,
      state: loadKanbanState(this.app),
      groupOptions: KANBAN_GROUP_OPTIONS.map(({ value, labelKey }) => ({
        value,
        label: `${this.i18n.t('group_by')}: ${this.i18n.t(labelKey)}`,
      })),
      sortOptions: TASK_SORT_COLUMNS.map(({ value, labelKey }) => ({ value, label: this.i18n.t(labelKey) })),
      onChange: (state) => {
        this.viewState = state;
        saveKanbanState(this.app, state);
        this.refreshBoard().catch(console.error);
      },
    });
    this.viewState = this.filterBar.getState();

    await this.render(KANBAN_VIEW_TYPE, this.buildViewData(), this.i18n, this.plugin, this.leaf);
  }

  /** Aplica búsqueda, filtros y orden del estado propio del tablero y reparte las tareas en columnas. */
  private buildViewData(): KanbanViewData {
    const sorted = sortTasksByColumn(
      filterTasksByViewState(this.tasks, this.viewState),
      this.viewState.sortColumn,
      this.viewState.sortDirection
    );
    const group = this.viewState.group;
    this.columns = buildKanbanColumns(sorted, group, key => this.i18n.t(key));

    return {
      columns: this.columns.map(column => ({
        key: column.key,
        label: column.label,
        count: column.tasks.length,
        droppable: column.drop !== null,
        collapsed: resolveCollapsed(column.tasks.length, parseCollapseChoice(this.app.loadLocalStorage(collapseStorageKey(group, column.key)))),
        color: column.color,
        tasks: column.tasks,
      })),
      showStatusIcon: group !== 'status',
      showPriorityIcon: group !== 'priority',
      vaultHasTasks: this.tasks.length > 0,
    };
  }

  protected setupViewSpecificEventListeners(container: HTMLElement): void {
    this.content = container;

    const toolbar = container.querySelector<HTMLElement>('.oa-kanban-toolbar');
    if (toolbar) this.filterBar?.mount(toolbar);

    this.wireBoard(container);
    this.observeBoardHeight(container);
  }

  /**
   * Las columnas no pasan de la altura visible del panel (menos la barra de filtros): el valor sale de
   * medir el contenedor, porque un `100%` de CSS no sirve cuando el contenedor es el que desplaza.
   */
  private observeBoardHeight(container: HTMLElement): void {
    this.sizeObserver?.disconnect();
    const toolbar = container.querySelector<HTMLElement>('.oa-kanban-toolbar');

    const update = (): void => {
      const board = container.querySelector<HTMLElement>('.oa-kanban-board');
      if (!board) return;
      const containerStyle = getComputedStyle(container);
      const boardStyle = getComputedStyle(board);
      const used = parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom)
        + parseFloat(boardStyle.paddingTop) + parseFloat(boardStyle.paddingBottom)
        + (toolbar?.offsetHeight ?? 0) + SCROLLBAR_ALLOWANCE_PX;
      const available = Math.max(container.clientHeight - used, MIN_COLUMN_MAX_HEIGHT_PX);
      container.setCssProps({ '--oa-kanban-max-height': `${available}px` });
    };

    this.sizeObserver = new ResizeObserver(update);
    this.sizeObserver.observe(container);
    if (toolbar) this.sizeObserver.observe(toolbar);
    update();
  }

  /** Pliega o despliega una columna y guarda la elección del usuario. */
  private toggleColumn(column: HTMLElement, header: HTMLElement): void {
    const collapsed = !column.hasClass('oa-kanban-column--collapsed');
    column.toggleClass('oa-kanban-column--collapsed', collapsed);
    header.setAttribute('aria-expanded', String(!collapsed));
    header.setAttribute('title', this.i18n.t(collapsed ? 'kanban_expand_column' : 'kanban_collapse_column'));
    this.app.saveLocalStorage(
      collapseStorageKey(this.viewState.group, column.dataset.columnKey ?? ''),
      collapsed ? 'collapsed' : 'expanded'
    );
  }

  /** Vuelve a dibujar solo el tablero (no la barra) tras un cambio de filtro, orden o agrupado. */
  private async refreshBoard(): Promise<void> {
    const container = this.content;
    if (!container) return;

    const staging = createDiv();
    await this.renderTemplate(staging, KANBAN_VIEW_TYPE, this.buildViewData());
    const nextBoard = staging.querySelector('.oa-kanban-board');
    if (!nextBoard) return;

    container.querySelector('.oa-kanban-board')?.replaceWith(nextBoard);
    this.wireBoard(container);
  }

  private findTask(filePath: string | null, lineNumber: number): ITask | undefined {
    return this.tasks.find(candidate => candidate.file.path === filePath && candidate.line.number === lineNumber);
  }

  private wireBoard(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('.oa-kanban-column[data-column-color]').forEach(column => {
      column.setCssProps({ '--oa-column-color': column.dataset.columnColor ?? '' });
    });

    const clearHighlights = (): void => {
      container.querySelectorAll('.oa-kanban-column--over').forEach(el => el.removeClass('oa-kanban-column--over'));
    };

    container.querySelectorAll<HTMLElement>('.oa-kanban-column').forEach(column => {
      const header = column.querySelector<HTMLElement>('.oa-kanban-column__header');
      header?.addEventListener('click', () => this.toggleColumn(column, header));
    });

    container.querySelectorAll<HTMLElement>('.oa-kanban-card').forEach(card => {
      const getTask = (): ITask | undefined =>
        this.findTask(card.getAttribute('data-file-path'), Number(card.getAttribute('data-line-number')));

      // Clic edita, doble clic abre la nota y clic derecho cambia el estado (gestos compartidos).
      attachTaskGestures(card, {
        plugin: this.plugin,
        i18n: this.i18n,
        taskWriter: this.taskWriter,
        getTask,
        onChanged: () => this.refreshView(),
        openFile: (filePath, lineNumber) => this.openTaskFile(filePath, lineNumber),
        ignoreSelector: TASK_GESTURE_IGNORE_SELECTOR,
      });

      card.addEventListener('dragstart', (event) => {
        const task = getTask();
        if (!task || !event.dataTransfer) return;
        event.dataTransfer.setData(DRAG_MIME, JSON.stringify({ filePath: task.file.path, lineNumber: task.line.number }));
        event.dataTransfer.effectAllowed = 'move';
        card.addClass('oa-dragging');
      });
      card.addEventListener('dragend', () => {
        card.removeClass('oa-dragging');
        clearHighlights();
      });
    });

    // `dragover` no puede leer lo que se arrastra: solo las columnas que admiten soltar lo aceptan y
    // la tarjeta se valida en `drop`.
    container.querySelectorAll<HTMLElement>('.oa-kanban-column[data-droppable="true"]').forEach(column => {
      column.addEventListener('dragover', (event) => {
        event.preventDefault();
        column.addClass('oa-kanban-column--over');
      });
      column.addEventListener('dragleave', (event) => {
        if (!(event.relatedTarget instanceof Node && column.contains(event.relatedTarget))) {
          column.removeClass('oa-kanban-column--over');
        }
      });
      column.addEventListener('drop', (event) => {
        event.preventDefault();
        column.removeClass('oa-kanban-column--over');
        const raw = event.dataTransfer?.getData(DRAG_MIME);
        if (raw) this.handleDrop(raw, column.dataset.columnKey ?? '').catch(console.error);
      });
    });
  }

  private async handleDrop(raw: string, columnKey: string): Promise<void> {
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const { filePath, lineNumber } = (payload ?? {}) as { filePath?: unknown; lineNumber?: unknown };
    if (typeof filePath !== 'string' || typeof lineNumber !== 'number') return;

    const task = this.findTask(filePath, lineNumber);
    const drop = this.columns.find(column => column.key === columnKey)?.drop;
    if (!task || !drop || taskColumnKey(task, this.viewState.group) === columnKey) return;

    const changed = drop.kind === 'status'
      ? await changeTaskStatus(task, drop.status, { taskWriter: this.taskWriter, i18n: this.i18n })
      : await this.changeTaskPriority(task, drop.priority);
    if (changed) {
      // La columna destino se despliega sola: ya no está vacía y se descarta lo que el usuario hubiera elegido.
      this.app.saveLocalStorage(collapseStorageKey(this.viewState.group, columnKey), null);
      await this.refreshView();
    }
  }

  /** Reescribe la prioridad de la tarea; devuelve `false` (con aviso) si la nota cambió y no se pudo localizar la línea. */
  private async changeTaskPriority(task: ITask, priority: KanbanPriority): Promise<boolean> {
    const written = await this.taskWriter.updateTaskLine(
      task.file.path, task.line.number, task.line.text, priorityLineTransform(priority)
    );
    if (!written) new Notice(this.i18n.t('task_line_changed'));
    return written !== null;
  }

  async onClose(): Promise<void> {
    this.sizeObserver?.disconnect();
    this.sizeObserver = null;
  }
}
