import { WorkspaceLeaf } from 'obsidian';
import { HabitView } from './habit-view';
import { AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskManager } from '../core/task-manager';
import { HabitManager } from '../habits';

export const HABIT_WEEKLY_VIEW_TYPE = 'habit-weekly-view';

export class HabitWeeklyView extends HabitView {
  constructor(
    leaf: WorkspaceLeaf,
    plugin: AgendaPlugin,
    i18n: I18n,
    taskManager: TaskManager,
    habitManager: HabitManager
  ) {
    super(leaf, plugin, i18n, taskManager, habitManager);
  }

  getViewType(): string {
    return HABIT_WEEKLY_VIEW_TYPE;
  }

  protected get viewSubtype(): 'weekly' {
    return 'weekly';
  }

  protected get viewTitleKey(): string {
    return 'habit_weekly_title';
  }

  protected getViewData(): Record<string, unknown> {
    return { habits: this.habits, weekDays: [], weekStart: '', weekEnd: '' };
  }
}