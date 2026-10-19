// src/core/task-view-state.ts
// Estado compartido de las vistas de tareas (búsqueda, filtros, agrupado y orden) y su filtrado
// (v1.1.12, Fase U1; ver docs/agenda-tasks/Arquitectura técnica.md §23.1). Lo usa la barra de filtros.
import type { App } from 'obsidian';
import { DateTime } from 'luxon';
import { ITask, TaskFilterCriteria } from '../types/interfaces';
import { TaskFilter } from './task-filter';
import { STATUS_OPTIONS, isTaskOpen } from './task-status-options';

const TASK_VIEW_STATE_KEY = 'obsidian-agenda-task-view-state';
/** Clave que usaba la Tabla antes de v1.1.12; se lee una vez, se convierte y se elimina. */
const LEGACY_TABLE_STATE_KEY = 'obsidian-agenda-task-table-state';

export const PRIORITY_FILTER_VALUES = ['highest', 'high', 'medium', 'normal', 'low', 'lowest', 'none'] as const;
/** Valores de los filtros de fecha (vencimiento, inicio y programada): los tres comparten los mismos. */
export const DATE_FILTER_VALUES = ['hasdate', 'overdue', 'today', 'thisweek', 'future', 'nodate'] as const;

/** Modos de la pestaña «Tareas» y la vista que abre cada uno. */
export type TaskViewMode = 'list' | 'table';
export const TASK_MODE_VIEWS: Record<TaskViewMode, string> = { list: 'list-view', table: 'table-view' };

export interface TaskViewState {
  /** Último modo usado: la pestaña «Tareas» abre este. */
  mode: TaskViewMode;
  search: string;
  /** `'all'`, un valor de `PRIORITY_FILTER_VALUES` (`'none'` = sin prioridad). */
  priority: string;
  /** `'all'` o el nombre de un estado de `CoreTaskStatus` (`Todo`, `InProgress`, …). */
  status: string;
  /** Primera carpeta de la ruta; vacío = todas. */
  area: string;
  /** Ruta de carpetas bajo el área; vacío = todas. */
  subArea: string;
  /** `'all'` o un valor de `DATE_FILTER_VALUES`, sobre la fecha de inicio. */
  start: string;
  /** `'all'` o un valor de `DATE_FILTER_VALUES`, sobre la fecha programada. */
  scheduled: string;
  /** `'all'` o un valor de `DATE_FILTER_VALUES`, sobre la fecha de vencimiento. */
  due: string;
  /** Agrupado elegido entre los que ofrece la vista; vacío = el que cada vista usa por defecto. */
  group: string;
  /** Columna o campo de orden, entre los que ofrece la vista. */
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

export const DEFAULT_TASK_VIEW_STATE: Readonly<TaskViewState> = {
  mode: 'list',
  search: '',
  priority: 'all',
  status: 'all',
  area: '',
  subArea: '',
  start: 'all',
  scheduled: 'all',
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
    mode: source.mode === 'table' ? 'table' : defaults.mode,
    search: text(source.search, defaults.search),
    priority: source.priority === 'all' || isOneOf(PRIORITY_FILTER_VALUES, source.priority) ? source.priority : defaults.priority,
    status: source.status === 'all' || STATUS_OPTIONS.some(option => option.name === source.status) ? source.status as string : defaults.status,
    area: text(source.area, defaults.area),
    subArea: text(source.subArea, defaults.subArea),
    start: source.start === 'all' || isOneOf(DATE_FILTER_VALUES, source.start) ? source.start : defaults.start,
    scheduled: source.scheduled === 'all' || isOneOf(DATE_FILTER_VALUES, source.scheduled) ? source.scheduled : defaults.scheduled,
    due: source.due === 'all' || isOneOf(DATE_FILTER_VALUES, source.due) ? source.due : defaults.due,
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

/**
 * Guarda el estado tras un cambio en la barra. Cada vista resuelve su agrupado por defecto antes de
 * pintar; para que eso no quede fijado al cambiar otro control, el agrupado guardado solo se
 * sobrescribe si el cambio fue el del propio agrupado.
 */
export function persistTaskViewState(app: App, state: TaskViewState, changed: readonly string[]): void {
  saveTaskViewState(app, changed.includes('group') ? state : { ...state, group: loadTaskViewState(app).group });
}

/** Guarda solo el modo, sobre lo ya guardado (la vista que llama puede tener valores por defecto propios sin guardar). */
export function saveTaskViewMode(app: App, mode: TaskViewMode): void {
  const state = loadTaskViewState(app);
  if (state.mode !== mode) saveTaskViewState(app, { ...state, mode });
}

/** Minúsculas y sin acentos: «ñáéíóúü» → «naeiouu». */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * ¿La fecha cumple el valor del filtro? Se compara por día, sin hora. `overdue` es anterior a hoy y
 * solo cuenta si la tarea está abierta (`isOpen`); `thisweek` va de hoy a 7 días después, hoy incluido, y
 * `future` es más allá de esos 7 días.
 */
export function matchesDateFilter(date: DateTime | null | undefined, value: string, now: DateTime, isOpen = true): boolean {
  if (value === 'all') return true;
  if (value === 'nodate') return !date;
  if (!date) return false;
  if (value === 'hasdate') return true;

  const days = Math.round(date.startOf('day').diff(now.startOf('day'), 'days').days);
  switch (value) {
    case 'overdue': return days < 0 && isOpen;
    case 'today': return days === 0;
    case 'thisweek': return days >= 0 && days <= 7;
    case 'future': return days > 7;
    default: return true;
  }
}

/**
 * Tareas que cumplen el estado de búsqueda y filtros. Prioridad, estado y área pasan por `TaskFilter`;
 * la búsqueda (descripción y etiquetas, sin acentos) y los tres filtros de fecha son propios.
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

  const filtered = new TaskFilter().filterTasks(tasks, criteria);
  const search = normalizeSearchText(state.search.trim());

  return filtered.filter(task => {
    if (!matchesDateFilter(task.date.due, state.due, now, isTaskOpen(task))) return false;
    if (!matchesDateFilter(task.date.start, state.start, now)) return false;
    if (!matchesDateFilter(task.date.scheduled, state.scheduled, now)) return false;
    if (!search) return true;
    return normalizeSearchText(task.section.desc).includes(search)
      || normalizeSearchText(task.section.tags.join(' ')).includes(search);
  });
}
