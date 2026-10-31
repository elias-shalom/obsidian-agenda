// src/core/kanban-state.ts
// Estado propio del tablero Kanban (búsqueda, filtros, orden y agrupado de columnas), guardado aparte
// del de Lista y Tabla para que elegir columnas por estado aquí no cambie el agrupado de aquellas
// (v1.1.13, Fase B). Mismo formato que `TaskViewState`.
import type { App } from 'obsidian';
import { DEFAULT_TASK_VIEW_STATE, TaskViewState, parseTaskViewState } from './task-view-state';
import { TASK_SORT_COLUMNS } from './task-column-sort';
import { KANBAN_DEFAULT_GROUP, KANBAN_GROUP_OPTIONS } from './kanban-board';

const KANBAN_STATE_KEY = 'obsidian-agenda-kanban-view-state';

/** Valida el estado leído: un agrupado u orden que ya no existe vuelve a su valor por defecto. */
export function parseKanbanState(raw: unknown): TaskViewState {
  const state = parseTaskViewState(raw);
  if (!KANBAN_GROUP_OPTIONS.some(option => option.value === state.group)) state.group = KANBAN_DEFAULT_GROUP;
  if (!TASK_SORT_COLUMNS.some(column => column.value === state.sortColumn)) state.sortColumn = DEFAULT_TASK_VIEW_STATE.sortColumn;
  return state;
}

export function loadKanbanState(app: App): TaskViewState {
  try {
    const saved = app.loadLocalStorage(KANBAN_STATE_KEY) as string | null;
    if (saved) return parseKanbanState(JSON.parse(saved));
  } catch (error) {
    console.error('Error al cargar el estado del tablero Kanban:', error);
  }
  return parseKanbanState({});
}

export function saveKanbanState(app: App, state: TaskViewState): void {
  app.saveLocalStorage(KANBAN_STATE_KEY, JSON.stringify(state));
}
