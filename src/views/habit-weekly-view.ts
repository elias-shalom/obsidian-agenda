import { WorkspaceLeaf } from 'obsidian';
import { DateTime } from 'luxon';
import { HabitView } from './habit-view';
import { AgendaPlugin, ViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskManager } from '../core/task-manager';
import { HabitManager } from '../habits';
import type { Daytime, HabitArea } from '../habits';
import { computeOccurrenceCells, computeOccurrenceStats } from '../habits/habit-streak';

export const HABIT_WEEKLY_VIEW_TYPE = 'habit-weekly-view';

const ROW_ID_SEPARATOR = '::';
const DAYTIME_ORDER: Daytime[] = ['wake up', 'morning', 'afternoon', 'evening', 'night'];
const SORT_MODES = ['alphabetical', 'area', 'daytime', 'priority', 'streak', 'pct'] as const;
type WeeklySortMode = typeof SORT_MODES[number];

function daytimeLabelKey(daytime: Daytime): string {
  return `habit_daytime_${daytime.replace(/\s+/g, '_')}`;
}

interface WeeklyRowRecord {
  id: string;
  title: string;
  color: string;
  streak: number;
  pct: number;
  area: HabitArea;
  priority: number;
  daytime: Daytime;
  cells: Record<string, unknown>[];
}

export class HabitWeeklyView extends HabitView {
  private weekStart: DateTime = DateTime.local().startOf('week');
  private sortBy: WeeklySortMode = 'alphabetical';

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
    const todayIso = DateTime.local().toISODate();
    const dates: DateTime[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      dates.push(this.weekStart.plus({ days: offset }));
    }

    const weekDays = dates.map(date => ({
      date: date.toISODate(),
      day: date.toFormat('ccc dd'),
      isToday: date.toISODate() === todayIso,
    }));

    const rows: WeeklyRowRecord[] = [];

    for (const habit of this.habits) {
      const daytimes = habit.daytimes.length > 0 ? habit.daytimes : (['morning'] as Daytime[]);
      const isMulti = daytimes.length > 1;

      for (const daytime of daytimes) {
        const cells = computeOccurrenceCells(habit, daytime, dates, habit.maxGap, this.plugin.settings.habitShowStreaks);
        const scheduledCells = cells.filter(cell => cell.scheduled);
        const doneCount = scheduledCells.filter(cell => cell.ticked).length;
        const pct = scheduledCells.length === 0 ? 0 : Math.round((doneCount / scheduledCells.length) * 100);
        const title = isMulti ? `${habit.title} (${this.i18n.t(daytimeLabelKey(daytime))})` : habit.title;

        rows.push({
          id: `${habit.file.path}${ROW_ID_SEPARATOR}${daytime}`,
          title,
          color: habit.color,
          streak: computeOccurrenceStats(habit, daytime).current,
          pct,
          area: habit.area,
          priority: habit.priority,
          daytime,
          cells: cells.map(cell => {
            const isRun = cell.ticked || cell.gap;
            return {
              ...cell,
              actual: cell.date === todayIso,
              runSingle: isRun && cell.streakStart && cell.streakEnd,
              runStart: isRun && cell.streakStart && !cell.streakEnd,
              runMiddle: isRun && !cell.streakStart && !cell.streakEnd,
              runEnd: isRun && cell.streakEnd && !cell.streakStart,
            };
          }),
        });
      }
    }

    this.sortRecords(rows);

    const folderExists = this.habitManager.folderExists();

    return {
      habits: rows.map((row, index) => ({ ...row, alt: index % 2 === 1 })),
      weekDays,
      sortBy: this.sortBy,
      weekStart: this.weekStart.toISODate(),
      weekEnd: this.weekStart.plus({ days: 6 }).toISODate(),
      emptyMessage: folderExists
        ? this.i18n.t('habit_no_habits')
        : this.i18n.t('habit_no_habits_at', { path: this.habitManager.getFolderPath() }),
    };
  }

  private sortRecords(records: WeeklyRowRecord[]): void {
    const daytimeIndex = (daytime: Daytime): number => {
      const index = DAYTIME_ORDER.indexOf(daytime);
      return index === -1 ? DAYTIME_ORDER.length : index;
    };

    switch (this.sortBy) {
      case 'area':
        records.sort((a, b) => a.area.localeCompare(b.area) || a.title.localeCompare(b.title));
        break;
      case 'daytime':
        records.sort((a, b) => daytimeIndex(a.daytime) - daytimeIndex(b.daytime) || a.title.localeCompare(b.title));
        break;
      case 'priority':
        records.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title));
        break;
      case 'streak':
        records.sort((a, b) => b.streak - a.streak || a.title.localeCompare(b.title));
        break;
      case 'pct':
        records.sort((a, b) => b.pct - a.pct || a.title.localeCompare(b.title));
        break;
      case 'alphabetical':
      default:
        records.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
  }

  protected setupViewSpecificEventListeners(container: HTMLElement, data: ViewData): void {
    super.setupViewSpecificEventListeners(container, data);

    container.querySelector('.oa-habit-weekly-nav-btn[data-action="prev"]')?.addEventListener('click', () => {
      this.weekStart = this.weekStart.minus({ weeks: 1 });
      this.refreshHabitView().catch(console.error);
    });

    container.querySelector('.oa-habit-weekly-nav-btn[data-action="next"]')?.addEventListener('click', () => {
      this.weekStart = this.weekStart.plus({ weeks: 1 });
      this.refreshHabitView().catch(console.error);
    });

    const sortSelect = container.querySelector('#oa-habit-weekly-sort') as HTMLSelectElement | null;
    sortSelect?.addEventListener('change', () => {
      const value = sortSelect.value as WeeklySortMode;
      if ((SORT_MODES as readonly string[]).includes(value)) {
        this.sortBy = value;
        this.refreshHabitView().catch(console.error);
      }
    });

    container.querySelectorAll<HTMLButtonElement>('.oa-habit-weekly-cell:not([disabled])').forEach(button => {
      button.addEventListener('click', () => {
        const date = button.getAttribute('data-date');
        const rowId = button.getAttribute('data-habit-id');
        if (!date || !rowId) return;

        // Refresco optimista antes de confirmar la escritura en el frontmatter
        button.classList.toggle('oa-habit-weekly-cell--ticked');
        this.toggleHabitEntry(rowId, date).catch(console.error);
      });
    });

    container.querySelectorAll<HTMLAnchorElement>('.oa-habit-weekly-name-link').forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const rowId = link.getAttribute('data-habit-id');
        const habit = this.findHabitByRowId(rowId);
        if (habit) this.habitManager.openEditor(habit);
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

    const updatedHabit = this.habitManager.getHabit(habit.file);
    if (updatedHabit) {
      this.habits = this.habits.map(item => item.file.path === habitPath ? updatedHabit : item);
    }

    await this.refreshHabitView();
  }
}