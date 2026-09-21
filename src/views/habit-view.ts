import { WorkspaceLeaf } from 'obsidian';
import { BaseView } from './base-view';
import { AgendaPlugin, ViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskManager } from '../core/task-manager';
import { HabitManager, IHabit } from '../habits';

export type HabitViewSubtype = 'grid' | 'dashboard' | 'routine' | 'weekly' | 'table';

export const HABIT_DEFAULT_VIEW_TYPE = 'habit-grid-view';

/**
 * Clase base para las vistas de hábitos.
 * Sigue el modelo de CalendarView: un único tab principal en el header y
 * el resto de vistas conmutables mediante un dropdown (#oa-habit-view-dropdown).
 */
export abstract class HabitView extends BaseView {
  protected plugin: AgendaPlugin;
  protected i18n: I18n;
  protected taskManager: TaskManager;
  protected habitManager: HabitManager;
  protected habits: IHabit[] = [];

  constructor(
    leaf: WorkspaceLeaf,
    plugin: AgendaPlugin,
    i18n: I18n,
    taskManager: TaskManager,
    habitManager: HabitManager
  ) {
    super(leaf);
    this.plugin = plugin;
    this.i18n = i18n;
    this.taskManager = taskManager;
    this.habitManager = habitManager;
  }

  /**
   * Identificador corto de esta vista, usado como valor <option> en el dropdown
   */
  protected abstract get viewSubtype(): HabitViewSubtype;

  /**
   * Clave i18n del título de la vista actual (mostrado en el toolbar)
   */
  protected abstract get viewTitleKey(): string;

  getDisplayText(): string {
    return this.i18n.t('habit_view_tab');
  }

  getIcon(): string {
    return 'list-checks';
  }

  async onOpen(): Promise<void> {
    this.showLoadingOverlay(6, true);
    this.habits = this.habitManager.getHabits();
    await this.refreshHabitView();
  }

  /**
   * Combina los datos específicos de cada vista con los campos comunes
   * (subtype, título y settings) necesarios para el toolbar y el dropdown.
   */
  protected buildViewData(extra: Record<string, unknown> = {}): ViewData {
    return {
      ...extra,
      viewSubtype: this.viewSubtype,
      viewLabelKey: this.viewTitleKey,
      settings: this.plugin.settings,
    };
  }

  protected async refreshHabitView(): Promise<void> {
    await this.render(
      this.getViewType(),
      this.buildViewData(this.getViewData()),
      this.i18n,
      this.plugin,
      this.leaf
    );
  }

  /**
   * Datos específicos que cada vista derivada aporta a la plantilla
   */
  protected abstract getViewData(): Record<string, unknown>;

  /**
   * Listener común del dropdown que conmuta entre las subvistas de hábitos
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, _data: ViewData): void {
    const viewDropdown = container.querySelector('#oa-habit-view-dropdown') as HTMLSelectElement;

    if (viewDropdown) {
      viewDropdown.addEventListener('change', () => {
        this.switchToViewType(viewDropdown.value as HabitViewSubtype);
      });
    }
  }

  private getViewIdForSubtype(subtype: HabitViewSubtype): string {
    switch (subtype) {
      case 'dashboard':
        return 'habit-overview-view';
      case 'routine':
        return 'habit-routine-view';
      case 'weekly':
        return 'habit-weekly-view';
      case 'table':
        return 'habit-table-view';
      case 'grid':
      default:
        return 'habit-grid-view';
    }
  }

  private switchToViewType(subtype: HabitViewSubtype): void {
    const viewId = this.getViewIdForSubtype(subtype);
    if (viewId === this.getViewType()) return;

    const leaf = this.plugin.app.workspace.getActiveViewOfType(HabitView)?.leaf;
    if (leaf) {
      leaf.setViewState({ type: viewId }).catch(console.error);
    }
  }
}