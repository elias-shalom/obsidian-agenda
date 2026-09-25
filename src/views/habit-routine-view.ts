import { WorkspaceLeaf } from 'obsidian';
import { DateTime } from 'luxon';
import { HabitView } from './habit-view';
import { AgendaPlugin, ViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskManager } from '../core/task-manager';
import { HabitManager, isScheduled, getAreaColor, getAreaTextColor, getAreaLabel } from '../habits';
import type { Daytime, HabitArea } from '../habits';
import { computeOccurrenceCells, computeOccurrenceStats } from '../habits/habit-streak';

export const HABIT_ROUTINE_VIEW_TYPE = 'habit-routine-view';

const ROW_ID_SEPARATOR = '::';
const DAYTIME_ORDER: Daytime[] = ['wake up', 'morning', 'afternoon', 'evening', 'night'];
const SORT_MODES = ['alphabetical', 'area', 'daytime', 'priority', 'streak', 'pct'] as const;
type RoutineSortMode = typeof SORT_MODES[number];
const GROUP_MODES = ['daytime', 'area'] as const;
type RoutineGroupMode = typeof GROUP_MODES[number];

function daytimeLabelKey(daytime: Daytime): string {
  return `habit_daytime_${daytime.replace(/\s+/g, '_')}`;
}

interface RoutineHabitRow {
  id: string;
  title: string;
  priority: number;
  time: number;
  daytime: Daytime;
  daytimeLabel: string;
  area: HabitArea;
  areaLabel: string;
  areaColor: string;
  areaTextColor: string;
  subArea: string;
  streak: number;
  pct: number;
  ticked: boolean;
  scheduled: boolean;
  hasRelatedFile: boolean;
}

interface RoutineSection {
  label: string;
  color: string | null;
  pct: number;
  pctWeighted: number;
  habits: RoutineHabitRow[];
}

export class HabitRoutineView extends HabitView {
  private selectedDate: DateTime = DateTime.local();
  private sortBy: RoutineSortMode = 'priority';
  private groupBy: RoutineGroupMode = 'daytime';

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

    const sections = new Map<string, RoutineSection>();
    if (this.groupBy === 'daytime') {
      for (const daytime of DAYTIME_ORDER) {
        sections.set(daytime, { label: this.i18n.t(daytimeLabelKey(daytime)), color: null, pct: 0, pctWeighted: 0, habits: [] });
      }
    }

    const areaTotals: Partial<Record<HabitArea, { done: number; scheduled: number; weightDone: number; weightTotal: number }>> = {};

    const daysToShow = Math.max(1, this.plugin.settings.habitDaysToShow || 21);
    const windowDates: DateTime[] = [];
    for (let offset = daysToShow - 1; offset >= 0; offset -= 1) {
      windowDates.push(this.selectedDate.minus({ days: offset }));
    }

    for (const habit of this.habits) {
      if (!isScheduled(habit, this.selectedDate)) continue;

      const doneToday = habit.completions[dateIso] ?? [];

      for (const daytime of habit.daytimes) {
        const groupKey = this.groupBy === 'area' ? habit.area : daytime;

        let section = sections.get(groupKey);
        if (!section) {
          section = this.groupBy === 'area'
            ? { label: getAreaLabel(habit.area, this.i18n), color: getAreaColor(habit.area), pct: 0, pctWeighted: 0, habits: [] }
            : { label: this.i18n.t(daytimeLabelKey(daytime)), color: null, pct: 0, pctWeighted: 0, habits: [] };
          sections.set(groupKey, section);
        }

        const ticked = doneToday.includes(daytime);
        const cells = computeOccurrenceCells(habit, daytime, windowDates, habit.maxGap, this.plugin.settings.habitShowStreaks);
        const scheduledCells = cells.filter(cell => cell.scheduled);
        const doneCount = scheduledCells.filter(cell => cell.ticked).length;
        const pct = scheduledCells.length === 0 ? 0 : Math.round((doneCount / scheduledCells.length) * 100);

        section.habits.push({
          id: `${habit.file.path}${ROW_ID_SEPARATOR}${daytime}`,
          title: habit.title,
          priority: habit.priority,
          time: habit.time,
          daytime,
          daytimeLabel: this.i18n.t(daytimeLabelKey(daytime)),
          area: habit.area,
          areaLabel: getAreaLabel(habit.area, this.i18n),
          areaColor: getAreaColor(habit.area),
          areaTextColor: getAreaTextColor(habit.area),
          subArea: habit.subArea,
          streak: computeOccurrenceStats(habit, daytime).current,
          pct,
          ticked,
          scheduled: true,
          hasRelatedFile: !!habit.relatedFile,
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

    const orderedKeys = this.groupBy === 'daytime'
      ? DAYTIME_ORDER.filter(daytime => sections.has(daytime))
      : [...sections.keys()].sort((a, b) => sections.get(a)!.label.localeCompare(sections.get(b)!.label));

    const nonEmptySections: Record<string, RoutineSection> = {};
    for (const key of orderedKeys) {
      const section = sections.get(key);
      if (!section || section.habits.length === 0) continue;

      this.sortRows(section.habits);

      const done = section.habits.filter(row => row.ticked).length;
      const weightTotal = section.habits.reduce((sum, row) => sum + row.priority, 0);
      const weightDone = section.habits.filter(row => row.ticked).reduce((sum, row) => sum + row.priority, 0);

      section.pct = Math.round((done / section.habits.length) * 100);
      section.pctWeighted = weightTotal === 0 ? 0 : Math.round((weightDone / weightTotal) * 100);

      nonEmptySections[key] = section;
    }

    const areaStats = Object.keys(areaTotals).map(area => {
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
      sortBy: this.sortBy,
      groupBy: this.groupBy,
      areaStats,
    };
  }

  private sortRows(rows: RoutineHabitRow[]): void {
    const daytimeIndex = (daytime: Daytime): number => {
      const index = DAYTIME_ORDER.indexOf(daytime);
      return index === -1 ? DAYTIME_ORDER.length : index;
    };

    switch (this.sortBy) {
      case 'area':
        rows.sort((a, b) => a.areaLabel.localeCompare(b.areaLabel) || a.title.localeCompare(b.title));
        break;
      case 'daytime':
        rows.sort((a, b) => daytimeIndex(a.daytime) - daytimeIndex(b.daytime) || a.title.localeCompare(b.title));
        break;
      case 'priority':
        rows.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
        break;
      case 'streak':
        rows.sort((a, b) => b.streak - a.streak || a.title.localeCompare(b.title));
        break;
      case 'pct':
        rows.sort((a, b) => b.pct - a.pct || a.title.localeCompare(b.title));
        break;
      case 'alphabetical':
      default:
        rows.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
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

    const sortSelect = container.querySelector<HTMLSelectElement>('#oa-habit-routine-sort');
    sortSelect?.addEventListener('change', () => {
      const value = sortSelect.value as RoutineSortMode;
      if ((SORT_MODES as readonly string[]).includes(value)) {
        this.sortBy = value;
        this.refreshHabitView().catch(console.error);
      }
    });

    const groupSelect = container.querySelector<HTMLSelectElement>('#oa-habit-routine-group');
    groupSelect?.addEventListener('change', () => {
      const value = groupSelect.value as RoutineGroupMode;
      if ((GROUP_MODES as readonly string[]).includes(value)) {
        this.groupBy = value;
        this.refreshHabitView().catch(console.error);
      }
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
        if (habit) this.openTaskFile(habit.file.path).catch(console.error);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-action="edit-habit"]').forEach(button => {
      button.addEventListener('click', () => {
        const rowId = button.getAttribute('data-habit-id');
        const habit = this.findHabitByRowId(rowId);
        if (habit) this.habitManager.openEditor(habit);
      });
    });

    container.querySelectorAll<HTMLButtonElement>('[data-action="open-related"]').forEach(button => {
      button.addEventListener('click', () => {
        const rowId = button.getAttribute('data-habit-id');
        const habit = this.findHabitByRowId(rowId);
        if (!habit) return;
        const target = this.habitManager.resolveRelatedFile(habit);
        if (target) this.openTaskFile(target.path).catch(console.error);
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