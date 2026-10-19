// src/core/task-status-options.ts
// Los 6 estados en orden de flujo de trabajo, con su ícono y su clave de traducción. Fuente única
// para el menú de estado, el agrupado y la barra de filtros.
import { CoreTaskStatus, CoreTaskStatusIcon } from '../types/enums';
import type { ITask } from '../types/interfaces';

const CLOSED_STATUSES = new Set<string>([CoreTaskStatus.Done, CoreTaskStatus.Cancelled, CoreTaskStatus.nonTask]);

/** Una tarea está abierta si no está hecha, cancelada ni marcada como «no es tarea». */
export function isTaskOpen(task: ITask): boolean {
  return !CLOSED_STATUSES.has(task.state.status);
}

export interface TaskStatusOption {
  status: CoreTaskStatus;
  /** Nombre del estado en `CoreTaskStatus` (`Todo`, `InProgress`, …); es el valor que guarda el filtro por estado. */
  name: keyof typeof CoreTaskStatus;
  icon: CoreTaskStatusIcon;
  labelKey: string;
}

export const STATUS_OPTIONS: readonly TaskStatusOption[] = [
  { status: CoreTaskStatus.Todo, name: 'Todo', icon: CoreTaskStatusIcon.Todo, labelKey: 'status_todo' },
  { status: CoreTaskStatus.InProgress, name: 'InProgress', icon: CoreTaskStatusIcon.InProgress, labelKey: 'status_in_progress' },
  { status: CoreTaskStatus.OnHold, name: 'OnHold', icon: CoreTaskStatusIcon.OnHold, labelKey: 'status_on_hold' },
  { status: CoreTaskStatus.Done, name: 'Done', icon: CoreTaskStatusIcon.Done, labelKey: 'status_done' },
  { status: CoreTaskStatus.Cancelled, name: 'Cancelled', icon: CoreTaskStatusIcon.Cancelled, labelKey: 'status_cancelled' },
  { status: CoreTaskStatus.nonTask, name: 'nonTask', icon: CoreTaskStatusIcon.nonTask, labelKey: 'status_non_task' },
];
