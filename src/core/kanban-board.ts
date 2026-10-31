// src/core/kanban-board.ts
// Columnas del tablero Kanban y los cambios que produce arrastrar una tarjeta (v1.1.13, Fase B; ver
// docs/agenda-tasks/Arquitectura técnica.md §20.4). Módulo puro, sin dependencias de Obsidian.
import { ITask } from '../types/interfaces';
import { CoreTaskStatus } from '../types/enums';
import { STATUS_OPTIONS } from './task-status-options';
import { groupTasksByField, groupTasksForView } from './task-grouping';
import { PriorityEmoji, clearPriority, upsertPriority } from './task-line-fields';

/** Agrupados que ofrece el tablero para sus columnas, con la clave de traducción de su nombre. */
export const KANBAN_GROUP_OPTIONS: readonly { value: string; labelKey: string }[] = [
  { value: 'status', labelKey: 'task_status' },
  { value: 'priority', labelKey: 'task_priority' },
  { value: 'tags', labelKey: 'tags' },
  { value: 'folder', labelKey: 'folder' },
];

export const KANBAN_DEFAULT_GROUP = 'status';

export type KanbanPriority = 'highest' | 'high' | 'medium' | 'normal' | 'low' | 'lowest';

/** Qué cambia una tarjeta al soltarla en una columna; las columnas de etiqueta y carpeta no admiten soltar. */
export type KanbanDrop =
  | { kind: 'status'; status: CoreTaskStatus }
  | { kind: 'priority'; priority: KanbanPriority };

export interface KanbanColumn {
  key: string;
  label: string;
  tasks: ITask[];
  drop: KanbanDrop | null;
  color?: string;
}

/** De mayor a menor, como el menú de prioridad. */
const PRIORITIES: readonly KanbanPriority[] = ['highest', 'high', 'medium', 'normal', 'low', 'lowest'];

/** `normal` no tiene emoji: la tarea sin prioridad explícita ya cuenta como normal. */
const PRIORITY_EMOJI: Record<Exclude<KanbanPriority, 'normal'>, PriorityEmoji> = {
  highest: '🔺',
  high: '⏫',
  medium: '🔼',
  low: '🔽',
  lowest: '⏬',
};

const NO_PRIORITY_KEY = 'undefined';

/**
 * Columnas de `tasks` para el agrupado `group`. Por estado y por prioridad salen siempre todas las
 * columnas, aunque estén vacías, porque son destinos de arrastre; por etiqueta y carpeta, solo las
 * que tienen tareas. El orden de las tareas dentro de cada una es el de entrada.
 */
export function buildKanbanColumns(tasks: ITask[], group: string, translate: (key: string) => string): KanbanColumn[] {
  if (group === 'priority') {
    const byKey = new Map(groupTasksByField(tasks, 'priority', translate).map(column => [column.key, column]));
    const columns = PRIORITIES.map((priority): KanbanColumn => ({
      key: priority,
      label: translate(priority),
      tasks: byKey.get(priority)?.tasks ?? [],
      drop: { kind: 'priority', priority },
    }));
    const unset = byKey.get(NO_PRIORITY_KEY);
    return unset ? [...columns, { key: NO_PRIORITY_KEY, label: unset.label, tasks: unset.tasks, drop: null }] : columns;
  }

  if (group === 'tags' || group === 'folder') {
    return groupTasksForView(tasks, group, translate)
      .filter(column => column.tasks.length > 0)
      .map((column): KanbanColumn => ({ key: column.key, label: column.label, tasks: column.tasks, drop: null, color: column.color }));
  }

  return groupTasksByField(tasks, 'status', translate).map((column): KanbanColumn => ({
    key: column.key,
    label: column.label,
    tasks: column.tasks,
    drop: { kind: 'status', status: column.key as CoreTaskStatus },
  }));
}

/** Clave de la columna de estado o prioridad en que cae una tarea; `null` para otros agrupados. */
export function taskColumnKey(task: ITask, group: string): string | null {
  if (group === 'status') {
    return STATUS_OPTIONS.some(option => String(option.status) === task.state.status) ? task.state.status : CoreTaskStatus.Todo;
  }
  if (group === 'priority') {
    return PRIORITIES.includes(task.state.priority as KanbanPriority) ? task.state.priority : NO_PRIORITY_KEY;
  }
  return null;
}

/** Reescritura de la línea de una tarea para que quede con la prioridad indicada. */
export function priorityLineTransform(priority: KanbanPriority): (line: string) => string {
  return priority === 'normal'
    ? (line) => clearPriority(line)
    : (line) => upsertPriority(line, PRIORITY_EMOJI[priority]);
}
