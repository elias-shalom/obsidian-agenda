import type { ITask } from '../types/interfaces';

/** Cambia si cambia la línea de alguna tarea, o si hay tareas nuevas o desaparecen (el `id` lleva ruta y línea). */
export function tasksSignature(tasks: ITask[]): string {
  return tasks.map(task => `${task.id}\u0000${task.line.text}`).join('\n');
}
