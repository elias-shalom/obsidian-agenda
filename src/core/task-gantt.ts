// src/core/task-gantt.ts
// Lógica pura del Gantt (v1.1.13, Fase G1; ver docs/agenda-tasks/Especificación de vistas.md §12 y
// Arquitectura técnica.md §21): qué se dibuja para cada tarea, la ventana de tiempo, las posiciones
// en porcentaje y las filas agrupadas por área. Sin dependencias de Obsidian.
import { DateTime } from 'luxon';
import { ITask } from '../types/interfaces';
import { TaskGroup } from './task-grouping';

/** Campo de la tarea que define un borde de la barra. */
export type GanttField = 'start' | 'scheduled' | 'due';

export type GanttZoom = 7 | 14 | 21 | 'month';
export const GANTT_ZOOMS: readonly GanttZoom[] = [7, 14, 21, 'month'];

export interface GanttSpan {
  kind: 'bar' | 'milestone' | 'none';
  /** Inicio de la barra, o la única fecha del hito; a medianoche. */
  start: DateTime | null;
  end: DateTime | null;
  /** Campo que escribe el borde izquierdo y el derecho al arrastrarlos (v1.1.13, Fase G2). */
  startField: GanttField | null;
  endField: GanttField | null;
  /** Muesca de ⏳ dentro de una barra que ya tiene 🛫 y 📅. */
  scheduledMark: DateTime | null;
  /** Para un hito, el campo que se crearía al extenderlo y desde qué lado. */
  extendField: GanttField | null;
  extendSide: 'left' | 'right' | null;
  /** Fin anterior al inicio en datos escritos a mano: se dibuja como hito en el inicio, con aviso. */
  invalid: boolean;
}

const NO_SPAN: GanttSpan = {
  kind: 'none', start: null, end: null, startField: null, endField: null,
  scheduledMark: null, extendField: null, extendSide: null, invalid: false,
};

/**
 * Qué se dibuja para una tarea según sus fechas (Especificación §12.1): con dos o más de 🛫, ⏳ y 📅
 * una barra del inicio (🛫 o, si falta, ⏳) al fin (📅 o, si falta, ⏳); con una sola, un hito; con
 * ninguna, nada. La hora y la duración de ⏳ se ignoran.
 */
export function resolveGanttSpan(task: ITask): GanttSpan {
  const { start, scheduled, due } = task.date;
  const present = [start, scheduled, due].filter(Boolean).length;
  if (present === 0) return NO_SPAN;

  if (present === 1) {
    const date = (start ?? scheduled ?? due)?.startOf('day') ?? null;
    if (!date) return NO_SPAN;
    const field: GanttField = start ? 'start' : scheduled ? 'scheduled' : 'due';
    // Cadena inicio → programada → vencimiento; con solo el vencimiento se extiende hacia la izquierda.
    const extend: { field: GanttField; side: 'left' | 'right' } =
      field === 'start' ? { field: 'scheduled', side: 'right' }
        : field === 'scheduled' ? { field: 'due', side: 'right' }
          : { field: 'start', side: 'left' };
    return {
      kind: 'milestone', start: date, end: date, startField: field, endField: field,
      scheduledMark: null, extendField: extend.field, extendSide: extend.side, invalid: false,
    };
  }

  const first = (start ?? scheduled)?.startOf('day');
  const last = (due ?? scheduled)?.startOf('day');
  if (!first || !last) return NO_SPAN;

  const startField: GanttField = start ? 'start' : 'scheduled';
  const endField: GanttField = due ? 'due' : 'scheduled';

  if (last < first) {
    return {
      kind: 'milestone', start: first, end: first, startField, endField: startField,
      scheduledMark: null, extendField: null, extendSide: null, invalid: true,
    };
  }

  const mark = start && due && scheduled ? scheduled.startOf('day') : null;
  return {
    kind: 'bar', start: first, end: last, startField, endField,
    scheduledMark: mark && mark >= first && mark <= last ? mark : null,
    extendField: null, extendSide: null, invalid: false,
  };
}

/** Tareas con algo que dibujar y tareas sin ninguna fecha, que solo se cuentan. */
export function splitUndated(tasks: ITask[]): { dated: ITask[]; undated: ITask[] } {
  const dated: ITask[] = [];
  const undated: ITask[] = [];
  for (const task of tasks) (resolveGanttSpan(task).kind === 'none' ? undated : dated).push(task);
  return { dated, undated };
}

export interface GanttWindow {
  start: DateTime;
  days: number;
}

const dayDiff = (a: DateTime, b: DateTime): number => Math.round(a.startOf('day').diff(b.startOf('day'), 'days').days);
const percent = (value: number): number => Math.round(value * 1000) / 1000;

/**
 * Ventana de tiempo para una fecha de referencia: el mes natural (28 a 31 días) o N días que
 * empiezan en el primer día de semana configurado que contiene la referencia (Especificación §12.2).
 */
export function ganttWindow(reference: DateTime, zoom: GanttZoom, weekStartDay: number): GanttWindow {
  if (zoom === 'month') {
    const start = reference.startOf('month');
    return { start, days: start.daysInMonth ?? 30 };
  }
  const day = reference.startOf('day');
  return { start: day.minus({ days: (day.weekday - weekStartDay + 7) % 7 }), days: zoom };
}

/** La referencia desplazada una ventana (o un mes en el modo mes). */
export function shiftGanttReference(reference: DateTime, zoom: GanttZoom, direction: 1 | -1): DateTime {
  return zoom === 'month' ? reference.plus({ months: direction }) : reference.plus({ days: direction * zoom });
}

export interface GanttPosition {
  /** Porcentaje del ancho de la ventana. */
  left: number;
  width: number;
  clippedLeft: boolean;
  clippedRight: boolean;
}

/** Posición de un rango de días (ambos incluidos); `null` si no toca la ventana. Se recorta a sus bordes. */
export function ganttPosition(start: DateTime, end: DateTime, win: GanttWindow): GanttPosition | null {
  const from = dayDiff(start, win.start);
  const to = dayDiff(end, win.start) + 1;
  if (to <= 0 || from >= win.days) return null;

  const clampedFrom = Math.max(from, 0);
  const clampedTo = Math.min(to, win.days);
  return {
    left: percent((clampedFrom / win.days) * 100),
    width: percent(((clampedTo - clampedFrom) / win.days) * 100),
    clippedLeft: from < 0,
    clippedRight: to > win.days,
  };
}

/** Centro de la columna de un día como porcentaje de la ventana; `null` si cae fuera. */
export function ganttCenter(date: DateTime, win: GanttWindow): number | null {
  const offset = dayDiff(date, win.start);
  return offset < 0 || offset >= win.days ? null : percent(((offset + 0.5) / win.days) * 100);
}

export interface GanttWeekBand {
  weekNumber: number;
  left: number;
  width: number;
}

/** Bandas de semana de la ventana; la primera y la última pueden quedar cortadas. */
export function ganttWeekBands(win: GanttWindow, weekStartDay: number): GanttWeekBand[] {
  const bands: GanttWeekBand[] = [];
  let index = 0;
  while (index < win.days) {
    const day = win.start.plus({ days: index });
    const length = Math.min(7 - ((day.weekday - weekStartDay + 7) % 7), win.days - index);
    bands.push({ weekNumber: day.weekNumber, left: percent((index / win.days) * 100), width: percent((length / win.days) * 100) });
    index += length;
  }
  return bands;
}

export interface GanttGroupRow {
  isGroup: true;
  key: string;
  label: string;
  depth: number;
  color?: string;
  /** Tareas con fila dentro de la ventana, aunque el grupo esté plegado. */
  count: number;
  collapsed: boolean;
}

export interface GanttTaskRow {
  isGroup: false;
  task: ITask;
  depth: number;
  span: GanttSpan;
  position: GanttPosition;
  /** Centro del día de ⏳ para la muesca, si cae en la ventana. */
  markLeft: number | null;
  /** Centro del día del hito. */
  centerLeft: number | null;
  color?: string;
}

export type GanttRow = GanttGroupRow | GanttTaskRow;

/**
 * Filas del diagrama a partir de los grupos por área (árbol): una cabecera por grupo y, si no está
 * plegado, sus tareas y subgrupos. Solo hay fila para las tareas que tocan la ventana, y un grupo sin
 * ninguna se omite.
 */
export function buildGanttRows(
  groups: TaskGroup[],
  win: GanttWindow,
  isCollapsed: (key: string) => boolean,
  depth = 0
): GanttRow[] {
  const rows: GanttRow[] = [];

  for (const group of groups) {
    const inner: GanttRow[] = [];
    for (const task of group.tasks) {
      const span = resolveGanttSpan(task);
      if (span.kind === 'none' || !span.start || !span.end) continue;
      const position = ganttPosition(span.start, span.end, win);
      if (!position) continue;
      inner.push({
        isGroup: false, task, depth: depth + 1, span, position,
        markLeft: span.scheduledMark ? ganttCenter(span.scheduledMark, win) : null,
        centerLeft: ganttCenter(span.start, win),
        color: group.color,
      });
    }
    inner.push(...buildGanttRows(group.children ?? [], win, isCollapsed, depth + 1));
    if (inner.length === 0) continue;

    rows.push({
      isGroup: true, key: group.key, label: group.label, depth, color: group.color,
      count: inner.filter(row => !row.isGroup).length,
      collapsed: isCollapsed(group.key),
    });
    if (!isCollapsed(group.key)) rows.push(...inner);
  }
  return rows;
}

export interface GanttDependencies {
  /** Títulos (o el 🆔 si no se encuentra la tarea) de aquello de lo que depende. */
  dependsOn: string[];
  /** Títulos de las tareas que dependen de esta. */
  blocks: string[];
}

/** Dependencias de cada tarea por su `ITask.id`, resueltas con el `🆔` de las demás tareas. */
export function buildDependencyIndex(tasks: ITask[]): Map<string, GanttDependencies> {
  const byFlowId = new Map<string, ITask>();
  for (const task of tasks) if (task.flow.id) byFlowId.set(task.flow.id, task);

  const index = new Map<string, GanttDependencies>();
  const entryOf = (task: ITask): GanttDependencies => {
    let entry = index.get(task.id);
    if (!entry) {
      entry = { dependsOn: [], blocks: [] };
      index.set(task.id, entry);
    }
    return entry;
  };

  for (const task of tasks) {
    for (const dependency of task.flow.dependsOn) {
      const target = byFlowId.get(dependency);
      entryOf(task).dependsOn.push(target ? target.section.desc : dependency);
      if (target) entryOf(target).blocks.push(task.section.desc);
    }
  }
  return index;
}
