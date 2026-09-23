import { WorkspaceLeaf } from 'obsidian';
import { DateTime } from 'luxon';
import { HabitView } from './habit-view';
import { AgendaPlugin } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskManager } from '../core/task-manager';
import { HabitManager, getAreaColor, getAreaLabel } from '../habits';
import type { Daytime } from '../habits';

export const HABIT_OVERVIEW_VIEW_TYPE = 'habit-overview-view';

const DAYTIME_ORDER: Daytime[] = ['wake up', 'morning', 'afternoon', 'evening', 'night'];

function daytimeLabelKey(daytime: Daytime): string {
  return `habit_daytime_${daytime.replace(/\s+/g, '_')}`;
}

export class HabitOverviewView extends HabitView {
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
    return HABIT_OVERVIEW_VIEW_TYPE;
  }

  protected get viewSubtype(): 'dashboard' {
    return 'dashboard';
  }

  protected get viewTitleKey(): string {
    return 'habit_dashboard_title';
  }

  protected getViewData(): Record<string, unknown> {
    const dashboard = this.habitManager.computeDashboard();
    const todayIso = DateTime.local().toISODate();
    const toPct = (value: number) => Math.round(value * 100);

    const byArea = Object.entries(dashboard.byArea)
      .map(([area, value]) => ({
        area,
        label: getAreaLabel(area, this.i18n),
        color: getAreaColor(area),
        raw: toPct(value.raw),
        weighted: toPct(value.weighted),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const byDaytime = DAYTIME_ORDER
      .filter(daytime => dashboard.byDaytime[daytime])
      .map(daytime => ({
        daytime,
        label: this.i18n.t(daytimeLabelKey(daytime)),
        raw: toPct(dashboard.byDaytime[daytime].raw),
        weighted: toPct(dashboard.byDaytime[daytime].weighted),
      }));

    const history30d = dashboard.history30d.map(day => ({
      date: day.date,
      pct: toPct(day.pct),
      pctWeighted: toPct(day.pctWeighted),
      isToday: day.date === todayIso,
    }));

    return {
      todayRaw: toPct(dashboard.todayRaw),
      todayWeighted: toPct(dashboard.todayWeighted),
      currentStreak: dashboard.currentStreak,
      maxStreak: dashboard.maxStreak,
      totalHabits: dashboard.totalHabits,
      byArea,
      byDaytime,
      history30d,
    };
  }
}
