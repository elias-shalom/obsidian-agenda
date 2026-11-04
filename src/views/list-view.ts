import { WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask, ListViewData, AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskWriter } from '../core/task-writer';
import { attachTaskGestures, TASK_GESTURE_IGNORE_SELECTOR } from '../core/task-gestures';
import { TaskFilterBar, buildTaskModeSwitch } from '../core/task-filter-bar';
import { TaskViewState, TASK_MODE_VIEWS, loadTaskViewState, persistTaskViewState, saveTaskViewMode, filterTasksByViewState } from '../core/task-view-state';
import { TASK_SORT_COLUMNS, sortTasksByColumn } from '../core/task-column-sort';
import { TASK_GROUP_OPTIONS, groupTasksForView, toGroupViewModels } from '../core/task-grouping';
import { LANE_OPTIONS, repairAxes, toLaneViewModels } from '../core/task-lanes';

export const LIST_VIEW_TYPE = 'list-view';

/** Agrupado que usa la Lista cuando el usuario aún no eligió uno (el árbol de carpetas de siempre). */
const LIST_DEFAULT_GROUP = 'area';

export class ListView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private viewState!: TaskViewState;
  private filterBar: TaskFilterBar | null = null;
  private content: HTMLElement | null = null;
  private taskWriter: TaskWriter;

  constructor(leaf: WorkspaceLeaf, private plugin: AgendaPlugin, private i18n: I18n, private taskManager: TaskManager) {
    // Constructor de la clase ListView
    super(leaf); 
    this.taskWriter = new TaskWriter(this.app);
  }

  getViewType(): string {
    return LIST_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("list_view_title"); // Título de la vista lista
  }

  getIcon(): string {
    return 'list-todo';
  }

  async onOpen(): Promise<void> {
    this.showLoadingOverlay(5, false);

    this.tasks = await this.getAllTasks(this.taskManager); // Cargar tareas

    // El estado se comparte con otras vistas de tareas: se lee al abrir y se escribe al cambiar.
    const saved = loadTaskViewState(this.app);
    if (!TASK_SORT_COLUMNS.some(column => column.value === saved.sortColumn)) saved.sortColumn = 'priority';

    // La pestaña «Tareas» abre el último modo usado
    saveTaskViewMode(this.app, 'list');
    saved.mode = 'list';

    // La barra se crea antes de dibujar porque reajusta el área guardada si ya no tiene tareas.
    // Un agrupado que repite el campo de los carriles se reajusta: gana Lanes.
    this.filterBar = new TaskFilterBar({
      i18n: this.i18n,
      tasks: this.tasks,
      state: { ...saved, ...repairAxes(saved, LIST_DEFAULT_GROUP) },
      modeSwitch: buildTaskModeSwitch(this.i18n, 'list', (mode) => {
        saveTaskViewMode(this.app, mode);
        this.plugin.viewManager.activateView(TASK_MODE_VIEWS[mode], this.leaf);
      }),
      laneOptions: LANE_OPTIONS.map(({ value, labelKey }) => ({ value, label: this.i18n.t(labelKey) })),
      groupOptions: TASK_GROUP_OPTIONS.map(({ value, labelKey }) => ({ value, label: this.i18n.t(labelKey) })),
      sortOptions: TASK_SORT_COLUMNS.map(({ value, labelKey }) => ({ value, label: this.i18n.t(labelKey) })),
      onChange: (state, changed) => {
        this.viewState = state;
        persistTaskViewState(this.app, state, changed);
        this.refreshBody().catch(console.error);
      },
    });
    this.viewState = this.filterBar.getState();

    await this.render(LIST_VIEW_TYPE, this.buildViewData(), this.i18n, this.plugin, this.leaf);
  }

  /** Aplica búsqueda, filtros, orden y agrupado del estado compartido. */
  private buildViewData(): ListViewData {
    const sorted = sortTasksByColumn(
      filterTasksByViewState(this.tasks, this.viewState),
      this.viewState.sortColumn,
      this.viewState.sortDirection
    );
    const group = this.viewState.group || LIST_DEFAULT_GROUP;
    const translate = (key: string): string => this.i18n.t(key);
    // Con carriles, el agrupado actúa dentro de cada uno y no se arma otro árbol sobre todas las tareas
    const lanes = toLaneViewModels(sorted, this.viewState.lanes, group, translate);

    return {
      tasks: sorted,
      groups: lanes.length > 0 ? [] : toGroupViewModels(groupTasksForView(sorted, group, translate), group),
      lanes,
      flatTasks: sorted,
      // El árbol de áreas ya indica dónde está cada nota; los demás agrupados no.
      showPath: group !== 'area',
      vaultHasTasks: this.tasks.length > 0,
    };
  }

  /**
   * Sobrescribe el método de BaseView para implementar event listeners específicos de ListView
   * @param container Contenedor donde se aplican los listeners
   * @param data Datos utilizados para renderizar la vista
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, _data: ListViewData): void {
    this.content = container;

    const toolbar = container.querySelector<HTMLElement>('.oa-list-toolbar');
    if (toolbar) this.filterBar?.mount(toolbar);

    this.wireBody(container);
  }

  /** Vuelve a dibujar solo la lista (no la barra) tras un cambio de filtro, orden o agrupado. */
  private async refreshBody(): Promise<void> {
    const container = this.content;
    if (!container) return;

    const staging = createDiv();
    await this.renderTemplate(staging, LIST_VIEW_TYPE, this.buildViewData());
    const nextBody = staging.querySelector('.oa-list-body');
    if (!nextBody) return;

    container.querySelector('.oa-list-body')?.replaceWith(nextBody);
    this.wireBody(container);
  }

  private wireBody(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('.oa-folder-group[data-group-color], .oa-lane[data-group-color]').forEach(group => {
      group.setCssProps({ '--oa-group-color': group.dataset.groupColor ?? '' });
    });

    // Plegar y desplegar grupos (el estado se recuerda por clave)
    this.addFolderToggleListeners(container);
    this.wireLanes(container);

    container.querySelectorAll<HTMLElement>('.oa-task-item').forEach(item => {
      // Añadir indicador visual
      item.addClass('clickable');

      // Clic edita, doble clic abre el archivo y clic derecho cambia el estado (gestos compartidos).
      attachTaskGestures(item, {
        plugin: this.plugin,
        i18n: this.i18n,
        taskWriter: this.taskWriter,
        getTask: () => {
          const filePath = item.getAttribute('data-file-path');
          const lineNumber = Number(item.getAttribute('data-line-number'));
          return this.tasks.find(candidate => candidate.file.path === filePath && candidate.line.number === lineNumber);
        },
        onChanged: () => this.refreshView(),
        openFile: (filePath, lineNumber) => this.openTaskFile(filePath, lineNumber),
        ignoreSelector: TASK_GESTURE_IGNORE_SELECTOR,
      });

      item.addEventListener('click', (event) => {
        if ((event.target as HTMLElement).closest(TASK_GESTURE_IGNORE_SELECTOR)) return;

        // Remover selección previa
        container.querySelectorAll('.oa-task-item.selected').forEach(el => {
          el.removeClass('selected');
        });

        // Marcar como seleccionada
        item.addClass('selected');
      });
    });
  }

  /** Plegar y desplegar carriles; se recuerda con la misma clave de `localStorage` que usan los grupos. */
  private wireLanes(container: HTMLElement): void {
    container.querySelectorAll<HTMLElement>('.oa-lane').forEach(lane => {
      const storageKey = `folder_${lane.dataset.laneKey ?? ''}_collapsed`;
      lane.toggleClass('oa-collapsed', this.app.loadLocalStorage(storageKey) === 'true');

      lane.querySelector(':scope > .oa-lane-header')?.addEventListener('click', () => {
        lane.toggleClass('oa-collapsed', !lane.hasClass('oa-collapsed'));
        this.app.saveLocalStorage(storageKey, String(lane.hasClass('oa-collapsed')));
      });
    });
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}
