import { WorkspaceLeaf, Menu, setIcon } from 'obsidian';
import { BaseView } from './base-view';
import { AgendaPlugin, ViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskManager } from '../core/task-manager';
import { HabitManager, IHabit, IHabitCalcContext, HABIT_VIEW_BUTTON_ICONS } from '../habits';

export type HabitViewSubtype = 'grid' | 'dashboard' | 'routine' | 'weekly' | 'table';

export const HABIT_DEFAULT_VIEW_TYPE = 'habit-overview-view';

/**
 * Clase base para las vistas de hábitos.
 * Sigue el modelo de CalendarView: un único tab principal en el header y
 * el resto de vistas conmutables mediante botones circulares (`data-habit-subtype`).
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
   * Identificador corto de esta vista, usado como `data-habit-subtype` de su botón en el selector
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
    return 'circle-check';
  }

  async onOpen(): Promise<void> {
    this.showLoadingOverlay(6, true);
    document.addEventListener('obsidian-agenda:habits-refresh', this.handleHabitsRefresh);
    await this.habitManager.waitForInitialCache();
    this.habits = this.loadHabits();
    await this.refreshHabitView();
  }

  async onClose(): Promise<void> {
    document.removeEventListener('obsidian-agenda:habits-refresh', this.handleHabitsRefresh);
  }

  /** Fuente de hábitos para esta vista; las subclases pueden sobreescribirla (p. ej. Tabla incluye inactivos) */
  protected loadHabits(): IHabit[] {
    return this.habitManager.getHabits();
  }

  private handleHabitsRefresh = (): void => {
    this.cancelAutoRefresh();
    this.habits = this.loadHabits();
    this.refreshHabitView().catch(console.error);
  };

  protected async performAutoRefresh(): Promise<void> {
    await this.habitManager.waitForInitialCache();
    this.habits = this.loadHabits();
    await this.refreshHabitView();
  }

  /**
   * Combina los datos específicos de cada vista con los campos comunes
   * (subtype, título y settings) necesarios para el toolbar y el selector de subvistas.
   */
  protected buildViewData(extra: Record<string, unknown> = {}): ViewData {
    return {
      ...extra,
      viewSubtype: this.viewSubtype,
      viewLabelKey: this.viewTitleKey,
      settings: this.plugin.settings,
    };
  }

  /** Mensaje de estado vacío: con la carpeta inexistente indica la ruta configurada. */
  protected getEmptyMessage(): string {
    return this.habitManager.folderExists()
      ? this.i18n.t('habit_no_habits')
      : this.i18n.t('habit_no_habits_at', { path: this.habitManager.getFolderPath() });
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
   * Listener común de los botones circulares que conmutan entre las subvistas de hábitos: pone el ícono de cada uno
   * y, al pulsarlo, cambia de subvista.
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, _data: ViewData): void {
    container.querySelectorAll<HTMLButtonElement>('.oa-calendar-view-btn[data-habit-subtype]').forEach(button => {
      const subtype = button.dataset.habitSubtype as HabitViewSubtype | undefined;
      const iconId = subtype && HABIT_VIEW_BUTTON_ICONS[subtype];
      if (iconId) setIcon(button, iconId);

      button.addEventListener('click', () => {
        if (subtype) this.switchToViewType(subtype);
      });
    });

    const newHabitBtn = container.querySelector('#oa-habit-new-btn');
    newHabitBtn?.addEventListener('click', () => {
      this.habitManager.openEditor();
    });

    container.querySelector('#oa-habit-vacations-btn')?.addEventListener('click', () => {
      this.plugin.openHabitSettings();
    });
  }

  /**
   * Chip de orden o de agrupado (`oa-axis-chip`, el mismo aspecto que Sort y Group de las tareas): al pulsarlo abre un
   * menú con la opción actual marcada; elegir otra la aplica. `labelKey` da la clave i18n de cada opción.
   */
  protected mountChipMenu<T extends string>(
    container: HTMLElement,
    selector: string,
    options: readonly T[],
    labelKey: (value: T) => string,
    current: T,
    onPick: (value: T) => void
  ): void {
    const button = container.querySelector<HTMLButtonElement>(selector);
    button?.addEventListener('click', () => {
      const menu = new Menu();
      for (const value of options) {
        menu.addItem(item => item
          .setTitle(this.i18n.t(labelKey(value)))
          .setChecked(value === current)
          .onClick(() => { if (value !== current) onPick(value); }));
      }
      const rect = button.getBoundingClientRect();
      menu.showAtPosition({ x: rect.left, y: rect.bottom });
    });
  }

  /** Vacaciones de los ajustes para las funciones puras de cálculo (v1.1.15, HV1). */
  protected get calcContext(): IHabitCalcContext {
    return this.habitManager.getCalcContext();
  }

  /** Texto de una celda o día de vacaciones: el nombre del periodo o, si no lo tiene, «Vacaciones». */
  protected vacationLabel(name?: string): string {
    return name ? `🌴 ${name}` : `🌴 ${this.i18n.t('habit_vacation')}`;
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