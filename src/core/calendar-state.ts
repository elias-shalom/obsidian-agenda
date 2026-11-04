// src/core/calendar-state.ts
// Estado propio de los filtros del calendario (v1.1.14, Fase CF1; ver docs/agenda-tasks/Arquitectura
// técnica.md §28.3), compartido por las seis subvistas. Mismo formato que `TaskViewState` para que la
// barra de filtros lo edite sin adaptadores, pero solo cuentan la búsqueda, la prioridad, el estado y el
// área: los filtros de fecha chocan con el calendario (que ya decide qué fecha ancla cada tarea), y el
// agrupado y el orden no aplican.
import type { App } from 'obsidian';
import { DateTime } from 'luxon';
import { ITask } from '../types/interfaces';
import { TaskViewState, filterTasksByViewState, parseTaskViewState } from './task-view-state';

export const CALENDAR_STATE_KEY = 'obsidian-agenda-calendar-view-state';

/** Tipos de filtro que ofrece el calendario, en el orden de la barra (`filterTypes` de `TaskFilterBar`, Fase CF2). */
export const CALENDAR_FILTER_TYPES = ['priority', 'status', 'area'] as const;

/** Valida el estado leído y descarta lo que el calendario no usa: lo demás vuelve a su valor por defecto. */
export function parseCalendarState(raw: unknown): TaskViewState {
  const { search, priority, status, areas } = parseTaskViewState(raw);
  return { ...parseTaskViewState({}), search, priority, status, areas };
}

export function loadCalendarState(app: App): TaskViewState {
  try {
    const saved = app.loadLocalStorage(CALENDAR_STATE_KEY) as string | null;
    if (saved) return parseCalendarState(JSON.parse(saved));
  } catch (error) {
    console.error('Error al cargar el estado de los filtros del calendario:', error);
  }
  return parseCalendarState({});
}

export function saveCalendarState(app: App, state: TaskViewState): void {
  app.saveLocalStorage(CALENDAR_STATE_KEY, JSON.stringify(parseCalendarState(state)));
}

/** ¿Hay algún filtro activo? Sin ninguno, el calendario dibuja todas las tareas como antes. */
export function hasCalendarFilters(state: TaskViewState): boolean {
  return state.search.trim() !== '' || state.priority.length > 0 || state.status.length > 0 || state.areas.length > 0;
}

/**
 * Tareas que el calendario puede dibujar según sus filtros (O dentro de un tipo y Y entre tipos, igual
 * que en las demás vistas). Se combina después con `calendarShowCompletedTasks` y con las fechas que
 * ancla cada tarea.
 */
export function filterTasksForCalendar(tasks: ITask[], state: TaskViewState, now: DateTime = DateTime.now()): ITask[] {
  const calendarState = parseCalendarState(state);
  return hasCalendarFilters(calendarState) ? filterTasksByViewState(tasks, calendarState, now) : tasks;
}
