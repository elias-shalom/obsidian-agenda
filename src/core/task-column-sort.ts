// src/core/task-column-sort.ts
// Orden de tareas por columna (v1.1.12, Fase U1/U2): lo comparten la barra de filtros, la Lista y,
// después, la Tabla. Las columnas son las de la Tabla; el orden por defecto es el de `TaskViewState`.
import type { DateTime } from 'luxon';
import { ITask } from '../types/interfaces';
import { STATUS_OPTIONS } from './task-status-options';
import { resolveTaskArea } from './area';

/** Columnas ordenables, con la clave de traducción de su nombre. */
export const TASK_SORT_COLUMNS: readonly { value: string; labelKey: string }[] = [
  { value: 'priority', labelKey: 'title_priority' },
  { value: 'status', labelKey: 'task_status' },
  { value: 'description', labelKey: 'task' },
  { value: 'folder', labelKey: 'area' },
  { value: 'start', labelKey: 'column_start' },
  { value: 'scheduled', labelKey: 'column_scheduled' },
  { value: 'due', labelKey: 'column_due' },
  { value: 'closed', labelKey: 'column_closed' },
  { value: 'tags', labelKey: 'tags' },
];

/** Columnas de fecha y la fecha por la que ordenan; la de cierre es la de hecha o, si no, la de cancelada. */
const DATE_COLUMNS: Record<string, (task: ITask) => DateTime | null> = {
  start: task => task.date.start,
  scheduled: task => task.date.scheduled,
  due: task => task.date.due,
  closed: task => task.date.done ?? task.date.cancelled,
};

/** Mayor valor = más prioritaria; lo que no coincide (`undefined`) queda al final en orden descendente. */
const PRIORITY_RANK: Record<string, number> = { highest: 6, high: 5, medium: 4, normal: 3, low: 2, lowest: 1 };

/** Los estados en orden de flujo, de «por hacer» (mayor valor) a «no es tarea» (menor). */
const STATUS_RANK = new Map<string, number>(STATUS_OPTIONS.map((option, index) => [option.status, STATUS_OPTIONS.length - 1 - index]));

const byText = (a: string, b: string): number => a.localeCompare(b);

/**
 * Compara rutas de sub-área por carpeta. Una ruta que es prefijo de otra (la vacía lo es de todas) va
 * después de sus descendientes en las dos direcciones: son las tareas directas de esa carpeta.
 */
function compareSubAreas(a: string, b: string, factor: number): number {
  const foldersA = a.split('/').filter(Boolean);
  const foldersB = b.split('/').filter(Boolean);
  for (let i = 0; i < Math.min(foldersA.length, foldersB.length); i += 1) {
    if (foldersA[i] !== foldersB[i]) return byText(foldersA[i], foldersB[i]) * factor;
  }
  return foldersB.length - foldersA.length;
}

function compareByColumn(a: ITask, b: ITask, column: string): number {
  switch (column) {
    case 'priority':
      return (PRIORITY_RANK[a.state.priority] ?? 0) - (PRIORITY_RANK[b.state.priority] ?? 0);
    case 'status':
      return (STATUS_RANK.get(a.state.status) ?? 0) - (STATUS_RANK.get(b.state.status) ?? 0);
    case 'description':
      return byText(a.section.desc, b.section.desc);
    case 'tags':
      return byText(a.section.tags.join(','), b.section.tags.join(','));
    default:
      return 0;
  }
}

/** Copia ordenada por la columna dada; las tareas sin fecha en una columna de fecha quedan al final en ambas direcciones, y en Área las que están directamente en la carpeta del área. */
export function sortTasksByColumn(tasks: ITask[], column: string, direction: 'asc' | 'desc'): ITask[] {
  const factor = direction === 'asc' ? 1 : -1;

  return [...tasks].sort((a, b) => {
    const dateOf = DATE_COLUMNS[column];
    if (dateOf) {
      const dueA = dateOf(a)?.toMillis();
      const dueB = dateOf(b)?.toMillis();
      if (dueA === undefined || dueB === undefined) return dueA === dueB ? 0 : dueA === undefined ? 1 : -1;
      return (dueA - dueB) * factor;
    }
    if (column === 'folder') {
      // La columna Carpeta es ahora Área: por área y, dentro de ella, por sub-área y ruta; sin sub-área, al final
      const areaA = resolveTaskArea(a.file.path);
      const areaB = resolveTaskArea(b.file.path);
      const byArea = byText(areaA.area, areaB.area) * factor;
      if (byArea !== 0) return byArea;
      if (areaA.subArea !== areaB.subArea) return compareSubAreas(areaA.subArea, areaB.subArea, factor);
      return byText(a.file.path, b.file.path) * factor;
    }
    return compareByColumn(a, b, column) * factor;
  });
}
