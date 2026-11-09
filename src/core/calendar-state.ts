// src/core/calendar-state.ts
// Estado propio de los filtros del calendario (v1.1.14, Fase CF1; ver docs/agenda-tasks/Arquitectura
// técnica.md §28.3), compartido por las seis subvistas. Mismo formato que `TaskViewState` para que la
// barra de filtros lo edite sin adaptadores, pero solo cuentan la búsqueda, la prioridad, el estado, el
// área y, desde v1.1.15, tres «fechas a mostrar» (inicio, programada, vencimiento): marcadas en la barra,
// el calendario dibuja solo las píldoras de esos tipos de fecha. Los filtros de fecha relativos
// (vencidas, hoy, próximos 7 días…) chocan con el calendario, que ya decide qué fecha ancla cada tarea;
// el agrupado y el orden no aplican.
import type { App } from 'obsidian';
import { DateTime } from 'luxon';
import { ITask } from '../types/interfaces';
import { TaskViewState, filterTasksByViewState, parseTaskViewState } from './task-view-state';

export const CALENDAR_STATE_KEY = 'obsidian-agenda-calendar-view-state';

/** Tipos de filtro que ofrece el calendario, en el orden de la barra (`filterTypes` de `TaskFilterBar`, Fase CF2). */
export const CALENDAR_FILTER_TYPES = ['priority', 'status', 'area', 'start', 'scheduled', 'due'] as const;

/** Los que se activan con un solo clic en el primer menú de «+ Filtro» (✓), sin elegir un valor: solo «con fecha». */
export const CALENDAR_DIRECT_FILTER_TYPES = ['start', 'scheduled', 'due'] as const;

export type CalendarDateFilterType = typeof CALENDAR_DIRECT_FILTER_TYPES[number];

/** Un filtro de fecha del calendario solo vale «con fecha» (`hasdate`) o «todos»; cualquier otro valor se descarta. */
const parseCalendarDateFilter = (value: string): string => (value === 'hasdate' ? 'hasdate' : 'all');

/** Valida el estado leído y descarta lo que el calendario no usa: lo demás vuelve a su valor por defecto. */
export function parseCalendarState(raw: unknown): TaskViewState {
  const { search, priority, status, areas, start, scheduled, due } = parseTaskViewState(raw);
  return {
    ...parseTaskViewState({}),
    search, priority, status, areas,
    start: parseCalendarDateFilter(start),
    scheduled: parseCalendarDateFilter(scheduled),
    due: parseCalendarDateFilter(due),
  };
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
  return state.search.trim() !== '' || state.priority.length > 0 || state.status.length > 0 || state.areas.length > 0
    || state.start !== 'all' || state.scheduled !== 'all' || state.due !== 'all';
}

/**
 * Tipos de fecha marcados en la barra (en el orden inicio, programada, vencimiento). Con alguno marcado, el
 * calendario dibuja solo las píldoras de esos tipos, estén o no activados en los ajustes; sin ninguno, mandan
 * los ajustes «Mostrar fechas…».
 */
export function getActiveCalendarDateTypes(state: TaskViewState): CalendarDateFilterType[] {
  return CALENDAR_DIRECT_FILTER_TYPES.filter(type => state[type] === 'hasdate');
}

/**
 * Tareas que el calendario puede dibujar según sus filtros (O dentro de un tipo y Y entre tipos, igual
 * que en las demás vistas). Se combina después con `calendarShowCompletedTasks` y con las fechas que
 * ancla cada tarea. Los tipos de fecha marcados no quitan tareas: solo cambian qué píldoras se dibujan
 * (`getActiveCalendarDateTypes()`), y una tarea sin esa fecha no tiene píldora que mostrar.
 */
export function filterTasksForCalendar(tasks: ITask[], state: TaskViewState, now: DateTime = DateTime.now()): ITask[] {
  const calendarState = { ...parseCalendarState(state), start: 'all', scheduled: 'all', due: 'all' };
  return hasCalendarFilters(calendarState) ? filterTasksByViewState(tasks, calendarState, now) : tasks;
}
