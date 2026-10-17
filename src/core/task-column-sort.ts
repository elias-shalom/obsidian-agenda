// src/core/task-column-sort.ts
// Orden de tareas por columna (v1.1.12, Fase U1/U2): lo comparten la barra de filtros, la Lista y,
// después, la Tabla. Las columnas son las de la Tabla; el orden por defecto es el de `TaskViewState`.
import { ITask } from '../types/interfaces';
import { STATUS_OPTIONS } from './task-status-options';
import { resolveTaskArea } from './area';

/** Columnas ordenables, con la clave de traducción de su nombre. */
export const TASK_SORT_COLUMNS: readonly { value: string; labelKey: string }[] = [
  { value: 'priority', labelKey: 'title_priority' },
  { value: 'status', labelKey: 'task_status' },
  { value: 'description', labelKey: 'task' },
  { value: 'folder', labelKey: 'area' },
  { value: 'due', labelKey: 'dates' },
  { value: 'tags', labelKey: 'tags' },
];

/** Mayor valor = más prioritaria; lo que no coincide (`undefined`) queda al final en orden descendente. */
const PRIORITY_RANK: Record<string, number> = { highest: 6, high: 5, medium: 4, normal: 3, low: 2, lowest: 1 };

/** Los estados en orden de flujo, de «por hacer» (mayor valor) a «no es tarea» (menor). */
const STATUS_RANK = new Map<string, number>(STATUS_OPTIONS.map((option, index) => [option.status, STATUS_OPTIONS.length - 1 - index]));

const byText = (a: string, b: string): number => a.localeCompare(b);

function compareByColumn(a: ITask, b: ITask, column: string): number {
  switch (column) {
    case 'priority':
      return (PRIORITY_RANK[a.state.priority] ?? 0) - (PRIORITY_RANK[b.state.priority] ?? 0);
    case 'status':
      return (STATUS_RANK.get(a.state.status) ?? 0) - (STATUS_RANK.get(b.state.status) ?? 0);
    case 'description':
      return byText(a.section.desc, b.section.desc);
    case 'folder': {
      // La columna Carpeta es ahora Área: primero por área y, dentro de ella, por ruta
      const byArea = byText(resolveTaskArea(a.file.path).area, resolveTaskArea(b.file.path).area);
      return byArea !== 0 ? byArea : byText(a.file.path, b.file.path);
    }
    case 'tags':
      return byText(a.section.tags.join(','), b.section.tags.join(','));
    default:
      return 0;
  }
}

/** Copia ordenada por la columna dada; las tareas sin vencimiento quedan al final en ambas direcciones. */
export function sortTasksByColumn(tasks: ITask[], column: string, direction: 'asc' | 'desc'): ITask[] {
  const factor = direction === 'asc' ? 1 : -1;

  return [...tasks].sort((a, b) => {
    if (column === 'due') {
      const dueA = a.date.due?.toMillis();
      const dueB = b.date.due?.toMillis();
      if (dueA === undefined || dueB === undefined) return dueA === dueB ? 0 : dueA === undefined ? 1 : -1;
      return (dueA - dueB) * factor;
    }
    return compareByColumn(a, b, column) * factor;
  });
}
