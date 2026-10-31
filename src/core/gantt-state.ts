// src/core/gantt-state.ts
// Estado propio del Gantt (búsqueda, filtros y orden), zoom, grupos plegados y «sin fecha» visibles,
// guardados aparte del de Lista, Tabla y Kanban (v1.1.13, Fase G1).
import type { App } from 'obsidian';
import { TaskViewState, parseTaskViewState } from './task-view-state';
import { TASK_SORT_COLUMNS } from './task-column-sort';
import { GANTT_ZOOMS, GanttZoom } from './task-gantt';

const STATE_KEY = 'obsidian-agenda-gantt-view-state';
const ZOOM_KEY = 'oa_gantt_zoom';
const UNDATED_KEY = 'oa_gantt_show_undated';
const COLLAPSED_PREFIX = 'oa_gantt_collapsed:';

/** Por defecto ordena por fecha de inicio, de la más próxima a la más lejana. */
export function parseGanttState(raw: unknown): TaskViewState {
  const state = parseTaskViewState(raw);
  const saved = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!('sortColumn' in saved) || !TASK_SORT_COLUMNS.some(column => column.value === state.sortColumn)) {
    state.sortColumn = 'start';
    state.sortDirection = 'asc';
  }
  return state;
}

export function loadGanttState(app: App): TaskViewState {
  try {
    const saved = app.loadLocalStorage(STATE_KEY) as string | null;
    if (saved) return parseGanttState(JSON.parse(saved));
  } catch (error) {
    console.error('Error al cargar el estado del Gantt:', error);
  }
  return parseGanttState({});
}

export function saveGanttState(app: App, state: TaskViewState): void {
  app.saveLocalStorage(STATE_KEY, JSON.stringify(state));
}

/** `7`, `14`, `21` o `month`; cualquier otro valor guardado cuenta como el defecto (14 días). */
export function parseGanttZoom(raw: unknown): GanttZoom {
  if (raw === 'month') return 'month';
  const days = Number(raw);
  return GANTT_ZOOMS.find(zoom => zoom === days) ?? 14;
}

export function loadGanttZoom(app: App): GanttZoom {
  return parseGanttZoom(app.loadLocalStorage(ZOOM_KEY));
}

export function saveGanttZoom(app: App, zoom: GanttZoom): void {
  app.saveLocalStorage(ZOOM_KEY, String(zoom));
}

export function isGanttGroupCollapsed(app: App, key: string): boolean {
  return app.loadLocalStorage(`${COLLAPSED_PREFIX}${key}`) === 'true';
}

export function setGanttGroupCollapsed(app: App, key: string, collapsed: boolean): void {
  app.saveLocalStorage(`${COLLAPSED_PREFIX}${key}`, collapsed ? 'true' : null);
}

export function loadShowUndated(app: App): boolean {
  return app.loadLocalStorage(UNDATED_KEY) === 'true';
}

export function saveShowUndated(app: App, show: boolean): void {
  app.saveLocalStorage(UNDATED_KEY, show ? 'true' : null);
}
