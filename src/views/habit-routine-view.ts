import { WorkspaceLeaf } from 'obsidian';
import { DateTime } from 'luxon';
import { HabitView } from './habit-view';
import { AgendaPlugin, ViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskManager } from '../core/task-manager';
import { HabitManager, isScheduled, getAreaColor, getAreaTextColor, getAreaLabel } from '../habits';
import type { Daytime, HabitArea } from '../habits';

export const HABIT_ROUTINE_VIEW_TYPE = 'habit-routine-view';

const ROW_ID_SEPARATOR = '::';
const DAYTIME_ORDER: Daytime[] = ['wake up', 'morning', 'afternoon', 'evening', 'night'];

function daytimeLabelKey(daytime: Daytime): string {
  return `habit_daytime_${daytime.replace(/\s+/g, '_')}`;
}

interface RoutineHabitRow {
  id: string;
  title: string;
  priority: number;
  time: number;
  area: HabitArea;
  areaLabel: string;
  areaColor: string;
  areaTextColor: string;
  ticked: boolean;
  scheduled: boolean;
}

interface RoutineSection {
  label: string;
  pct: number;
  pctWeighted: number;
  habits: RoutineHabitRow[];
}

export class HabitRoutineView extends HabitView {
  private selectedDate: DateTime = DateTime.local();

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
    return HABIT_ROUTINE_VIEW_TYPE;
  }

  protected get viewSubtype(): 'routine' {
    return 'routine';
  }

  protected get viewTitleKey(): string {
    return 'habit_routine_title';
  }

  protected getViewData(): Record<string, unknown> {
    const dateIso = this.selectedDate.toISODate() ?? '';

    const sections: Partial<Record<Daytime, RoutineSection>> = {};
    for (const daytime of DAYTIME_ORDER) {
      sections[daytime] = { label: this.i18n.t(daytimeLabelKey(daytime)), pct: 0, pctWeighted: 0, habits: [] };
    }

    const areaTotals: Partial<Record<HabitArea, { done: number; scheduled: number; weightDone: number; weightTotal: number }>> = {};

    for (const habit of this.habits) {
      if (!isScheduled(habit, this.selectedDate)) continue;

      const doneToday = habit.completions[dateIso] ?? [];

      for (const daytime of habit.daytimes) {
        const section = sections[daytime];
        if (!section) continue;

        const ticked = doneToday.includes(daytime);

        section.habits.push({
          id: `${habit.file.path}${ROW_ID_SEPARATOR}${daytime}`,
          title: habit.title,
          priority: habit.priority,
          time: habit.time,
          area: habit.area,
          areaLabel: getAreaLabel(habit.area, this.i18n),
          areaColor: getAreaColor(habit.area),
          areaTextColor: getAreaTextColor(habit.area),
          ticked,
          scheduled: true,
        });

        const totals = areaTotals[habit.area] ?? { done: 0, scheduled: 0, weightDone: 0, weightTotal: 0 };
        totals.scheduled += 1;
        totals.weightTotal += habit.priority;
        if (ticked) {
          totals.done += 1;
          totals.weightDone += habit.priority;
        }
        areaTotals[habit.area] = totals;
      }
    }

    const nonEmptySections: Record<string, RoutineSection> = {};
    for (const daytime of DAYTIME_ORDER) {
      const section = sections[daytime];
      if (!section || section.habits.length === 0) continue;

      section.habits.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));

      const done = section.habits.filter(row => row.ticked).length;
      const weightTotal = section.habits.reduce((sum, row) => sum + row.priority, 0);
      const weightDone = section.habits.filter(row => row.ticked).reduce((sum, row) => sum + row.priority, 0);

      section.pct = Math.round((done / section.habits.length) * 100);
      section.pctWeighted = weightTotal === 0 ? 0 : Math.round((weightDone / weightTotal) * 100);

      nonEmptySections[daytime] = section;
    }

    const areaStats = (Object.keys(areaTotals) as HabitArea[]).map(area => {
      const totals = areaTotals[area]!;
      return {
        area,
        label: getAreaLabel(area, this.i18n),
        color: getAreaColor(area),
        pct: totals.scheduled === 0 ? 0 : Math.round((totals.done / totals.scheduled) * 100),
        pctWeighted: totals.weightTotal === 0 ? 0 : Math.round((totals.weightDone / totals.weightTotal) * 100),
      };
    });

    return {
      daytimes: nonEmptySections,
      selectedDate: dateIso,
      isToday: dateIso === DateTime.local().toISODate(),
      hasHabits: Object.keys(nonEmptySections).length > 0,
      areaStats,
    };
  }

  protected setupViewSpecificEventListeners(container: HTMLElement, data: ViewData): void {
    super.setupViewSpecificEventListeners(container, data);

    container.querySelector('[data-action="prev"]')?.addEventListener('click', () => {
      this.selectedDate = this.selectedDate.minus({ days: 1 });
      this.refreshHabitView().catch(console.error);
    });

    container.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      this.selectedDate = this.selectedDate.plus({ days: 1 });
      this.refreshHabitView().catch(console.error);
    });

    container.querySelector('[data-action="today"]')?.addEventListener('click', () => {
      this.selectedDate = DateTime.local();
      this.refreshHabitView().catch(console.error);
    });

    container.querySelectorAll<HTMLButtonElement>('.oa-habit-routine-checkbox:not([disabled])').forEach(button => {
      button.addEventListener('click', () => {
        const rowId = button.getAttribute('data-habit-id');
        const date = button.getAttribute('data-date');
        if (!rowId || !date) return;

        // Refresco optimista antes de confirmar la escritura en el frontmatter
        button.classList.toggle('oa-habit-routine-checkbox--checked');
        this.toggleHabitEntry(rowId, date).catch(console.error);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-action="open-note"]').forEach(button => {
      button.addEventListener('click', () => {
        const rowId = button.getAttribute('data-habit-id');
        const habit = this.findHabitByRowId(rowId);
        if (habit) this.openTaskFile(habit.file.path);
      });
    });
  }

  private findHabitByRowId(rowId: string | null) {
    if (!rowId) return null;
    const separatorIndex = rowId.lastIndexOf(ROW_ID_SEPARATOR);
    const habitPath = separatorIndex === -1 ? rowId : rowId.slice(0, separatorIndex);
    return this.habits.find(item => item.file.path === habitPath) ?? null;
  }

  private async toggleHabitEntry(rowId: string, date: string): Promise<void> {
    const separatorIndex = rowId.lastIndexOf(ROW_ID_SEPARATOR);
    if (separatorIndex === -1) return;

    const habitPath = rowId.slice(0, separatorIndex);
    const daytime = rowId.slice(separatorIndex + ROW_ID_SEPARATOR.length) as Daytime;

    const habit = this.habits.find(item => item.file.path === habitPath);
    if (!habit) return;

    await this.habitManager.toggleOccurrence(habit.file, date, daytime);

    // getHabit() lee del cache ya actualizado por toggleOccurrence(); getHabits() releería
    // metadataCache, que aún no refleja la escritura y revertiría el cambio.
    const updatedHabit = this.habitManager.getHabit(habit.file);
    if (updatedHabit) {
      this.habits = this.habits.map(item => item.file.path === habitPath ? updatedHabit : item);
    }

    await this.refreshHabitView();
  }
}