import { WorkspaceLeaf } from 'obsidian';
import { DateTime } from 'luxon';
import { HabitView } from './habit-view';
import { AgendaPlugin, ViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskManager } from '../core/task-manager';
import { HabitManager, getAreaColor, getAreaLabel, computeYearHistory } from '../habits';
import type { Daytime } from '../habits';

export const HABIT_OVERVIEW_VIEW_TYPE = 'habit-overview-view';

const DAYTIME_ORDER: Daytime[] = ['wake up', 'morning', 'afternoon', 'evening', 'night'];

function daytimeLabelKey(daytime: Daytime): string {
  return `habit_daytime_${daytime.replace(/\s+/g, '_')}`;
}

/** Índice de día de semana con domingo=0 (Luxon usa lunes=1..domingo=7) */
function sundayIndex(date: DateTime): number {
  return date.weekday % 7;
}

function heatmapLevel(pct: number): number {
  if (pct <= 0) return 0;
  if (pct < 25) return 1;
  if (pct < 50) return 2;
  if (pct < 75) return 3;
  return 4;
}

export class HabitOverviewView extends HabitView {
  private heatmapYear: number = DateTime.local().year;

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

    const formatHistoryLabel = (index: number) => {
      const day = history30d[index];
      return day ? (DateTime.fromISO(day.date).toFormat('dd MMM') ?? '') : '';
    };

    return {
      todayRaw: toPct(dashboard.todayRaw),
      todayWeighted: toPct(dashboard.todayWeighted),
      currentStreak: dashboard.currentStreak,
      maxStreak: dashboard.maxStreak,
      totalHabits: dashboard.totalHabits,
      byArea,
      byDaytime,
      history30d,
      historyStartLabel: formatHistoryLabel(0),
      historyMidLabel: formatHistoryLabel(Math.floor(history30d.length / 2)),
      historyEndLabel: formatHistoryLabel(history30d.length - 1),
      ...this.buildYearHeatmap(),
    };
  }

  /** Heatmap anual estilo GitHub: una columna por semana (domingo arriba), coloreada por % ponderado del día */
  private buildYearHeatmap(): Record<string, unknown> {
    const year = this.heatmapYear;
    const todayIso = DateTime.local().toISODate();

    const yearStart = DateTime.local(year, 1, 1);
    const yearEnd = DateTime.local(year, 12, 31);
    const gridStart = yearStart.minus({ days: sundayIndex(yearStart) });
    const gridEnd = yearEnd.plus({ days: 6 - sundayIndex(yearEnd) });

    const statsByDate = new Map(computeYearHistory(this.habits, year).map(day => [day.date, day]));

    const weekdayLabels: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const weekday = (i === 0 ? 7 : i) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
      weekdayLabels.push(DateTime.local().set({ weekday }).toFormat('ccc'));
    }

    const cells: { date: string; level: number; pct: number; inYear: boolean; isToday: boolean; column: number; row: number }[] = [];
    const monthLabels: { label: string; column: number }[] = [];
    const seenMonths = new Set<number>();

    let weekIndex = 1;
    for (let date = gridStart; date <= gridEnd; date = date.plus({ days: 1 })) {
      const row = sundayIndex(date) + 2; // fila 1 reservada para las etiquetas de mes
      const column = weekIndex + 1; // columna 1 reservada para las etiquetas de día de semana

      if (date.day === 1 && date.year === year && !seenMonths.has(date.month)) {
        seenMonths.add(date.month);
        monthLabels.push({ label: date.toFormat('MMM'), column });
      }

      const inYear = date.year === year;
      const iso = date.toISODate() ?? '';
      const dayStat = inYear ? statsByDate.get(iso) : undefined;
      const pct = dayStat ? Math.round(dayStat.pctWeighted * 100) : 0;

      cells.push({
        date: iso,
        level: inYear ? heatmapLevel(pct) : -1,
        pct,
        inYear,
        isToday: iso === todayIso,
        column,
        row,
      });

      if (row === 8) weekIndex += 1; // sábado: pasar a la siguiente columna/semana
    }

    return {
      heatmapYear: year,
      heatmapColumns: weekIndex + 1, // +1 por la columna reservada de etiquetas de dia de semana
      heatmapCells: cells,
      heatmapMonthLabels: monthLabels,
      heatmapWeekdayLabels: weekdayLabels,
    };
  }

  protected setupViewSpecificEventListeners(container: HTMLElement, data: ViewData): void {
    super.setupViewSpecificEventListeners(container, data);

    container.querySelector('.oa-habit-heatmap-prev')?.addEventListener('click', () => {
      this.heatmapYear -= 1;
      this.refreshHabitView().catch(console.error);
    });

    container.querySelector('.oa-habit-heatmap-next')?.addEventListener('click', () => {
      this.heatmapYear += 1;
      this.refreshHabitView().catch(console.error);
    });
  }
}
