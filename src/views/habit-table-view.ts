import { WorkspaceLeaf } from 'obsidian';
import { DateTime } from 'luxon';
import { HabitView } from './habit-view';
import { AgendaPlugin, ViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskManager } from '../core/task-manager';
import { HabitManager, getAreaColor, getAreaLabel, dayCompleted, isScheduled } from '../habits';
import type { Daytime, IHabit } from '../habits';
import { computeStats } from '../habits/habit-streak';

export const HABIT_TABLE_VIEW_TYPE = 'habit-table-view';

const WEEKDAY_TOKEN_KEYS: Record<number, string> = {
  1: 'habit_freq_monday',
  2: 'habit_freq_tuesday',
  3: 'habit_freq_wednesday',
  4: 'habit_freq_thursday',
  5: 'habit_freq_friday',
  6: 'habit_freq_saturday',
  7: 'habit_freq_sunday',
};

function daytimeLabelKey(daytime: Daytime): string {
  return `habit_daytime_${daytime.replace(/\s+/g, '_')}`;
}

interface TableRow {
  id: string;
  title: string;
  color: string;
  areaLabel: string;
  areaColor: string;
  subArea: string;
  frequency: string;
  priority: number;
  daytimes: string[];
  time: number;
  streak: number;
  pct30d: number;
}

export class HabitTableView extends HabitView {
  private sortKey = 'priority';
  private sortDesc = true;

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
    return HABIT_TABLE_VIEW_TYPE;
  }

  protected get viewSubtype(): 'table' {
    return 'table';
  }

  protected get viewTitleKey(): string {
    return 'habit_list_title';
  }

  private frequencyLabel(habit: IHabit): string {
    const set = habit.frequencySet;
    if (set.size === 7 && [1, 2, 3, 4, 5, 6, 7].every(day => set.has(day))) return this.i18n.t('habit_freq_everyday');
    if (set.size === 5 && [1, 2, 3, 4, 5].every(day => set.has(day))) return this.i18n.t('habit_freq_workweek');
    if (set.size === 2 && [6, 7].every(day => set.has(day))) return this.i18n.t('habit_freq_weekend');

    return [1, 2, 3, 4, 5, 6, 7]
      .filter(day => set.has(day))
      .map(day => this.i18n.t(WEEKDAY_TOKEN_KEYS[day]))
      .join(', ');
  }

  private pct30d(habit: IHabit): number {
    const today = DateTime.local();
    let done = 0;
    let scheduled = 0;

    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = today.minus({ days: offset });
      if (!isScheduled(habit, date)) continue;

      scheduled += 1;
      if (dayCompleted(habit, date.toISODate() ?? '')) done += 1;
    }

    return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100);
  }

  private sortRows(rows: TableRow[]): void {
    const dir = this.sortDesc ? -1 : 1;

    rows.sort((a, b) => {
      let cmp = 0;
      switch (this.sortKey) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'area': cmp = a.areaLabel.localeCompare(b.areaLabel); break;
        case 'subArea': cmp = a.subArea.localeCompare(b.subArea); break;
        case 'frequency': cmp = a.frequency.localeCompare(b.frequency); break;
        case 'daytimes': cmp = a.daytimes.join(',').localeCompare(b.daytimes.join(',')); break;
        case 'time': cmp = a.time - b.time; break;
        case 'streak': cmp = a.streak - b.streak; break;
        case 'pct30d': cmp = a.pct30d - b.pct30d; break;
        case 'priority':
        default: cmp = a.priority - b.priority; break;
      }

      if (cmp === 0) cmp = a.title.localeCompare(b.title);
      return cmp * dir;
    });
  }

  protected getViewData(): Record<string, unknown> {
    const rows: TableRow[] = this.habits.map(habit => ({
      id: habit.file.path,
      title: habit.title,
      color: habit.color,
      areaLabel: getAreaLabel(habit.area, this.i18n),
      areaColor: getAreaColor(habit.area),
      subArea: habit.subArea,
      frequency: this.frequencyLabel(habit),
      priority: habit.priority,
      daytimes: habit.daytimes.map(daytime => this.i18n.t(daytimeLabelKey(daytime))),
      time: habit.time,
      streak: computeStats(habit).current,
      pct30d: this.pct30d(habit),
    }));

    this.sortRows(rows);

    const folderExists = this.habitManager.folderExists();

    return {
      habits: rows,
      emptyMessage: folderExists
        ? this.i18n.t('habit_no_habits')
        : this.i18n.t('habit_no_habits_at', { path: this.habitManager.getFolderPath() }),
    };
  }

  private toggleSort(key: string): void {
    if (this.sortKey === key) {
      this.sortDesc = !this.sortDesc;
    } else {
      this.sortKey = key;
      this.sortDesc = key !== 'title' && key !== 'area' && key !== 'subArea' && key !== 'frequency' && key !== 'daytimes';
    }
  }

  protected setupViewSpecificEventListeners(container: HTMLElement, data: ViewData): void {
    super.setupViewSpecificEventListeners(container, data);

    container.querySelectorAll<HTMLTableCellElement>('th[data-sort]').forEach(header => {
      const key = header.getAttribute('data-sort');
      header.setAttribute('aria-sort', key === this.sortKey ? (this.sortDesc ? 'descending' : 'ascending') : 'none');

      header.addEventListener('click', () => {
        if (!key) return;
        this.toggleSort(key);
        this.refreshHabitView().catch(console.error);
      });
    });

    container.querySelectorAll<HTMLTableRowElement>('tbody tr[data-habit-id]').forEach(row => {
      const habitPath = row.getAttribute('data-habit-id');
      if (!habitPath) return;

      row.addEventListener('click', () => {
        this.openTaskFile(habitPath);
      });

      row.addEventListener('dblclick', (event) => {
        event.stopPropagation();
        const habit = this.habits.find(item => item.file.path === habitPath);
        if (habit) this.habitManager.openEditor(habit);
      });
    });
  }
}