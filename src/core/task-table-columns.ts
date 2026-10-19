// src/core/task-table-columns.ts
// Modelo de columnas de la Tabla (v1.1.12, Fase U7; ver docs/agenda-tasks/Arquitectura técnica.md
// §23.8). Pura, sin Obsidian. Las columnas de fechas se ocultan si ninguna tarea cargada tiene algún
// valor que mostrar; la fase U5 le sumará la elección del usuario.
import { ITask } from '../types/interfaces';

export type TableColumnId = 'count' | 'priority' | 'status' | 'task' | 'area' | 'start' | 'scheduled' | 'due' | 'closed' | 'tags';

export interface TableColumn {
  id: TableColumnId;
  /** Ancho mínimo y máximo, en píxeles. */
  min: number;
  max: number;
  /** Solo en las columnas que se pueden ocultar: ¿la tarea tiene algún valor que esta columna mostraría? */
  hasValue?: (task: ITask) => boolean;
}

/** Columnas en el orden en que se dibujan. */
export const TABLE_COLUMNS: readonly TableColumn[] = [
  { id: 'count', min: 40, max: 48 },
  { id: 'priority', min: 36, max: 44 },
  { id: 'status', min: 36, max: 44 },
  { id: 'task', min: 170, max: 380 },
  { id: 'area', min: 72, max: 140 },
  { id: 'start', min: 90, max: 120, hasValue: task => Boolean(task.date.start ?? task.date.created) },
  { id: 'scheduled', min: 90, max: 120, hasValue: task => Boolean(task.date.scheduled) },
  { id: 'due', min: 90, max: 120, hasValue: task => Boolean(task.date.due) },
  { id: 'closed', min: 90, max: 120, hasValue: task => Boolean(task.date.done ?? task.date.cancelled) },
  { id: 'tags', min: 80, max: 200 },
];

/**
 * Columnas visibles, en orden. Se decide sobre todas las tareas cargadas y no sobre las que quedan
 * tras filtrar, para que la tabla no cambie de forma al filtrar.
 */
export function getVisibleColumns(tasks: ITask[]): TableColumn[] {
  return TABLE_COLUMNS.filter(column => !column.hasValue || tasks.some(column.hasValue));
}

/** Los mismos datos como mapa por `id` para la plantilla. */
export function getColumnVisibility(tasks: ITask[]): Record<TableColumnId, boolean> {
  const visible = new Set(getVisibleColumns(tasks).map(column => column.id));
  return Object.fromEntries(TABLE_COLUMNS.map(column => [column.id, visible.has(column.id)])) as Record<TableColumnId, boolean>;
}

/** Límites de ancho de una columna por su `id` (`data-column` en el DOM); uno por defecto si no se conoce. */
export function getColumnLimits(id: string | undefined): { min: number; max: number } {
  return TABLE_COLUMNS.find(column => column.id === id) ?? { min: 80, max: 280 };
}
