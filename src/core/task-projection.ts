// src/core/task-projection.ts
// Proyección de tareas recurrentes (v1.1.15, Fase PR1; ver docs/agenda-tasks/Especificación de vistas.md §21.3 y
// Arquitectura técnica.md §30.4). Módulo puro: calcula las ocurrencias futuras de una tarea con 🔁 como entradas
// fantasma en memoria. Nada se escribe en las notas: la siguiente ocurrencia real sigue creándose al completar la
// anterior (ADR-R1). El ajuste N y el dibujado en las vistas llegan en PR2.
import { DateTime } from 'luxon';
import { ITask } from '../types/interfaces';
import { CoreTaskStatus, CoreTaskStatusIcon } from '../types/enums';
import { DEFAULT_NON_WORKING_DAYS } from './non-working-days';
import { getNextOccurrenceDate } from './task-recurrence';

/** Una ocurrencia futura de una tarea recurrente, solo de lectura. */
export interface ProjectedOccurrence {
  /**
   * Copia de la tarea real con todas sus fechas desplazadas los mismos días, en estado pendiente y sin ✅ ni ❌: es
   * lo que las vistas dibujan. Conserva `file` y `line` de la real, de modo que abrirla lleva a la tarea real.
   */
  task: ITask;
  /** La tarea real de la que sale. */
  source: ITask;
  /** 1 es la primera ocurrencia posterior a la real. */
  index: number;
}

const WHEN_DONE_REGEX = /\bwhen\s+done\s*$/i;

/** Ocurrencias que se proyectan por tarea si el usuario no cambia el ajuste (v1.1.15, PR2). */
export const DEFAULT_PROJECTION_COUNT = 10;
/** Tope del ajuste: N cuenta ocurrencias, no tiempo, y cada una cuesta un cálculo de la regla. */
export const MAX_PROJECTION_COUNT = 50;

/** Deja el ajuste guardado en un entero entre 0 (desactivado) y el tope; cualquier otro valor vuelve al de por defecto. */
export function sanitizeProjectionCount(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_PROJECTION_COUNT;
  return Math.min(MAX_PROJECTION_COUNT, Math.max(0, Math.floor(raw)));
}

/** Una tarea terminada o cancelada no proyecta: su siguiente ocurrencia ya existe como otra línea (o no habrá). */
const NON_PROJECTING_STATUSES: readonly string[] = [CoreTaskStatus.Done, CoreTaskStatus.Cancelled, CoreTaskStatus.nonTask];

const shiftDate = (date: DateTime | null, deltaDays: number): DateTime | null => (date ? date.plus({ days: deltaDays }) : null);

/**
 * Hasta `count` ocurrencias posteriores a la real, en orden. La fecha de referencia es `scheduled > due > start`
 * (ADR-R2); la primera ocurrencia sale de la fecha real y cada una de las siguientes de la anterior, como al
 * completar una tras otra. Todas las fechas de la tarea se desplazan lo mismo que la de referencia y se conservan
 * la hora y la duración. Devuelve una lista vacía si `count` no es positivo, la tarea no es recurrente, está
 * terminada o cancelada, no tiene ninguna fecha, la recurrencia es inválida o es `when done` (depende de cuándo se
 * complete).
 */
export function projectOccurrences(
  task: ITask,
  count: number,
  nonWorkingDays: readonly number[] = DEFAULT_NON_WORKING_DAYS
): ProjectedOccurrence[] {
  const limit = Math.floor(count);
  const repeat = task.flow.repeat;
  if (!Number.isFinite(limit) || limit <= 0 || !repeat) return [];
  if (NON_PROJECTING_STATUSES.includes(task.state.status) || WHEN_DONE_REGEX.test(repeat)) return [];

  const referenceDate = task.date.scheduled ?? task.date.due ?? task.date.start;
  if (!referenceDate?.isValid) return [];

  const origin = referenceDate.startOf('day');
  const occurrences: ProjectedOccurrence[] = [];
  let previous = referenceDate;

  while (occurrences.length < limit) {
    const next = getNextOccurrenceDate(repeat, previous, nonWorkingDays);
    // Una regla sin más ocurrencias (`until`) o que no avanza termina la proyección
    if (!next || next.startOf('day') <= previous.startOf('day')) break;

    const deltaDays = Math.round(next.startOf('day').diff(origin, 'days').days);
    const index = occurrences.length + 1;
    occurrences.push({ task: buildGhost(task, deltaDays, index), source: task, index });
    previous = next;
  }

  return occurrences;
}

/**
 * Los fantasmas de todas las tareas dadas, listos para que una vista los dibuje junto a las reales. Con N en 0 no
 * calcula nada; el orden es el de las tareas y, dentro de cada una, el de sus ocurrencias.
 */
export function projectAllOccurrences(
  tasks: readonly ITask[],
  count: number,
  nonWorkingDays: readonly number[] = DEFAULT_NON_WORKING_DAYS
): ITask[] {
  if (!(count >= 1)) return [];
  return tasks.flatMap(task => projectOccurrences(task, count, nonWorkingDays).map(occurrence => occurrence.task));
}

function buildGhost(task: ITask, deltaDays: number, index: number): ITask {
  return {
    ...task,
    id: `${task.id}+${index}`,
    state: { ...task.state, status: CoreTaskStatus.Todo, emoji: CoreTaskStatusIcon.Todo },
    date: {
      ...task.date,
      start: shiftDate(task.date.start, deltaDays),
      due: shiftDate(task.date.due, deltaDays),
      scheduled: shiftDate(task.date.scheduled, deltaDays),
      done: null,
      cancelled: null,
    },
  };
}
