// src/core/task-view-state.ts
// Estado compartido de las vistas de tareas (búsqueda, filtros, agrupado y orden) y su filtrado
// (v1.1.12, Fase U1; ver docs/agenda-tasks/Arquitectura técnica.md §23.1). Lo usa la barra de filtros.
import type { App } from 'obsidian';
import { DateTime } from 'luxon';
import { ITask, TaskFilterCriteria } from '../types/interfaces';
import { TaskFilter } from './task-filter';
import { STATUS_OPTIONS } from './task-status-options';

const TASK_VIEW_STATE_KEY = 'obsidian-agenda-task-view-state';
/** Clave que usaba la Tabla antes de v1.1.12; se lee una vez, se convierte y se elimina. */
const LEGACY_TABLE_STATE_KEY = 'obsidian-agenda-task-table-state';

export const PRIORITY_FILTER_VALUES = ['highest', 'high', 'medium', 'normal', 'low', 'lowest', 'none'] as const;
export const DUE_FILTER_VALUES = ['hasdate', 'overdue', 'today', 'thisweek', 'future', 'nodate'] as const;

export interface TaskViewState {
  search: string;
  /** `'all'`, un valor de `PRIORITY_FILTER_VALUES` (`'none'` = sin prioridad). */
  priority: string;
  /** `'all'` o el nombre de un estado de `CoreTaskStatus` (`Todo`, `InProgress`, …). */
  status: string;
  /** Primera carpeta de la ruta; vacío = todas. */
  area: string;
  /** Ruta de carpetas bajo el área; vacío = todas. */
  subArea: string;
  /** `'all'` o un valor de `DUE_FILTER_VALUES`. */
  due: string;
  /** Agrupado elegido entre los que ofrece la vista; vacío = el que cada vista usa por defecto. */
  group: string;
  /** Columna o campo de orden, entre los que ofrece la vista. */
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

export const DEFAULT_TASK_VIEW_STATE: Readonly<TaskViewState> = {
  search: '',
  priority: 'all',
  status: 'all',
  area: '',
  subArea: '',
  due: 'all',
  group: '',
  sortColumn: 'priority',
  sortDirection: 'desc',
};

const isOneOf = (values: readonly string[], value: unknown): value is string =>
  typeof value === 'string' && values.includes(value);

/** Valida un estado leído del almacenamiento: lo que no es válido vuelve a su valor por defecto. */
export function parseTaskViewState(raw: unknown): TaskViewState {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const defaults = DEFAULT_TASK_VIEW_STATE;
  const text = (value: unknown, fallback: string): string => (typeof value === 'string' ? value : fallback);

  return {
    search: text(source.search, defaults.search),
    priority: source.priority === 'all' || isOneOf(PRIORITY_FILTER_VALUES, source.priority) ? source.priority : defaults.priority,
    status: source.status === 'all' || STATUS_OPTIONS.some(option => option.name === source.status) ? source.status as string : defaults.status,
    area: text(source.area, defaults.area),
    subArea: text(source.subArea, defaults.subArea),
    due: source.due === 'all' || isOneOf(DUE_FILTER_VALUES, source.due) ? source.due : defaults.due,
    group: text(source.group, defaults.group),
    sortColumn: text(source.sortColumn, defaults.sortColumn) || defaults.sortColumn,
    sortDirection: source.sortDirection === 'asc' || source.sortDirection === 'desc' ? source.sortDirection : defaults.sortDirection,
  };
}

/** Convierte el estado antiguo de la Tabla: prioridad en minúsculas y `folder` (primera carpeta) pasa a `area`. */
export function migrateLegacyTableState(raw: unknown): TaskViewState {
  const legacy = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const folder = typeof legacy.folder === 'string' ? legacy.folder : '';
  return parseTaskViewState({
    ...legacy,
    priority: typeof legacy.priority === 'string' ? legacy.priority.toLowerCase() : undefined,
    // `all` no era una carpeta y `root` era el marcador de las notas en la raíz del vault.
    area: folder === 'all' || folder.toLowerCase() === 'root' ? '' : folder,
  });
}

/** Lee el estado guardado; si solo existe el de la Tabla anterior a v1.1.12, lo convierte y lo reemplaza. */
export function loadTaskViewState(app: App): TaskViewState {
  try {
    const saved = app.loadLocalStorage(TASK_VIEW_STATE_KEY) as string | null;
    if (saved) return parseTaskViewState(JSON.parse(saved));

    const legacy = app.loadLocalStorage(LEGACY_TABLE_STATE_KEY) as string | null;
    if (legacy) {
      const migrated = migrateLegacyTableState(JSON.parse(legacy));
      saveTaskViewState(app, migrated);
      app.saveLocalStorage(LEGACY_TABLE_STATE_KEY, null);
      return migrated;
    }
  } catch (error) {
    console.error('Error al cargar el estado de las vistas de tareas:', error);
  }
  return { ...DEFAULT_TASK_VIEW_STATE };
}

export function saveTaskViewState(app: App, state: TaskViewState): void {
  app.saveLocalStorage(TASK_VIEW_STATE_KEY, JSON.stringify(state));
}

/** Minúsculas y sin acentos: «ñáéíóúü» → «naeiouu». */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const hasAnyDate = (task: ITask): boolean =>
  [task.date.due, task.date.start, task.date.scheduled, task.date.created, task.date.done, task.date.cancelled]
    .some(date => date !== null && date !== undefined);

/**
 * Tareas que cumplen el estado de búsqueda y filtros. Prioridad, estado, área y vencimiento pasan por
 * `TaskFilter`; la búsqueda (descripción y etiquetas, sin acentos) y «con/sin fecha» son propias.
 * «Esta semana» son los próximos 7 días y «futuras» las que vencen después de ellos.
 */
export function filterTasksByViewState(tasks: ITask[], state: TaskViewState, now: DateTime = DateTime.now()): ITask[] {
  const criteria: TaskFilterCriteria = {};

  if (state.priority !== 'all') {
    criteria.priority = { is: [state.priority === 'none' ? 'undefined' : state.priority] };
  }

  const status = STATUS_OPTIONS.find(option => option.name === state.status);
  if (status) criteria.status = [status.status];

  if (state.area || state.subArea) {
    criteria.location = { area: state.area, subArea: state.subArea };
  }

  // Los criterios relativos de `TaskFilter` dejan pasar las tareas sin vencimiento: se exige que exista.
  switch (state.due) {
    case 'overdue':
      criteria.dueDate = { exists: true };
      criteria.dueDateRelative = { overdue: true };
      break;
    case 'today':
      criteria.dueDate = { exists: true };
      criteria.dueDateRelative = { today: true };
      break;
    case 'thisweek':
      criteria.dueDate = { exists: true };
      criteria.dueDateRelative = { futureDays: 7 };
      break;
    case 'future':
      criteria.dueDate = { exists: true, after: now.startOf('day').plus({ days: 7 }).toJSDate() };
      break;
  }

  const filtered = new TaskFilter().filterTasks(tasks, criteria);
  const search = normalizeSearchText(state.search.trim());

  return filtered.filter(task => {
    if (state.due === 'hasdate' && !hasAnyDate(task)) return false;
    if (state.due === 'nodate' && hasAnyDate(task)) return false;
    if (!search) return true;
    return normalizeSearchText(task.section.desc).includes(search)
      || normalizeSearchText(task.section.tags.join(' ')).includes(search);
  });
}
