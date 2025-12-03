import { ITask, SortField, GroupField } from "../types/interfaces";
import { DateTime } from "luxon";

/**
 * Clase responsable de la ordenación y agrupación de tareas
 */
export class TaskSorter {
  
  /**
   * Ordena tareas por múltiples campos
   */
  public sortTasksByMultipleFields(
    tasks: ITask[], 
    sortFields: SortField[], 
    directions: ('asc' | 'desc')[]
  ): ITask[] {
    if (!sortFields || sortFields.length === 0) return tasks;

    const sortedTasks = [...tasks]; // Crear copia para no modificar el original

    sortedTasks.sort((a, b) => {
      for (let i = 0; i < sortFields.length; i++) {
        const field = sortFields[i];
        const direction = directions && directions[i] ? directions[i] : 'asc';
        const dirFactor = direction === 'asc' ? 1 : -1;
        const compareResult = this.compareTasks(a, b, field) * dirFactor;
        
        if (compareResult !== 0) {
          return compareResult;
        }
      }
      return 0; // Si todos los campos son iguales
    });
    return sortedTasks;
  }

  /**
   * Compara dos tareas por un campo específico
   */
  private compareTasks(a: ITask, b: ITask, field: SortField): number {
    switch (field) {
      case 'dueDate':
        return this.compareDates(a.dueDate, b.dueDate);
      case 'startDate':
        return this.compareDates(a.startDate, b.startDate);
      case 'scheduledDate':
        return this.compareDates(a.scheduledDate, b.scheduledDate);
      case 'doneDate':
        return this.compareDates(a.doneDate, b.doneDate);
      case 'createdDate':
        return this.compareDates(a.createdDate, b.createdDate);
      case 'priority':
        const priorityMap: {[key: string]: number} = {
          'high': 1,
          'medium': 2,
          'low': 3,
          'undefined': 4
        };
        const priorityA = priorityMap[a.priority || 'undefined'] || 4;
        const priorityB = priorityMap[b.priority || 'undefined'] || 4;
        return priorityA - priorityB;
      case 'status':
        const statusMap: {[key: string]: number} = {
          'TODO': 1,
          'IN_PROGRESS': 2,
          'BLOCKED': 3,
          'DONE': 4,
          'CANCELLED': 5
        };
        const statusA = statusMap[a.status || 'TODO'] || 1;
        const statusB = statusMap[b.status || 'TODO'] || 1;
        return statusA - statusB;
      case 'text':
        return (a.text || '').localeCompare(b.text || '');
      case 'path':
        return (a.filePath || '').localeCompare(b.filePath || '');
      default:
        return 0;
    }
  }

  /**
   * Compara dos fechas, manejando valores nulos y DateTime
   */
  private compareDates(dateA: DateTime<boolean> | Date | string | null, dateB: DateTime<boolean> | Date | string | null): number {
    // Convertir a Date si es string o DateTime
    const dateObjA = dateA
      ? typeof dateA === 'string'
        ? new Date(dateA)
        : typeof (dateA as any).toJSDate === 'function'
          ? (dateA as any).toJSDate()
          : dateA as Date
      : null;
    const dateObjB = dateB
      ? typeof dateB === 'string'
        ? new Date(dateB)
        : typeof (dateB as any).toJSDate === 'function'
          ? (dateB as any).toJSDate()
          : dateB as Date
      : null;

    // Manejar casos con null (null siempre va después)
    if (dateObjA === null && dateObjB === null) return 0;
    if (dateObjA === null) return 1;
    if (dateObjB === null) return -1;
    
    // Comparar fechas normalmente
    return dateObjA.getTime() - dateObjB.getTime();
  }

  /**
   * Agrupa tareas por un campo específico
   */
  public groupTasks(tasks: ITask[], groupField: GroupField): ITask[] {
    const groupedTasks = new Map<string, ITask[]>();

    // Agrupar tareas
    tasks.forEach(task => {
      let groupKey = 'Unknown';

      switch (groupField) {
        case 'status':
          groupKey = task.status || 'Unknown';
          break;
        case 'priority':
          groupKey = task.priority || 'undefined';
          break;
        case 'dueDate':
          if (!task.dueDate) {
            groupKey = 'No Due Date';
          } else {
            let dueDate: Date | null = null;
            if (typeof task.dueDate === 'string') {
              dueDate = new Date(task.dueDate);
            } else if (typeof (task.dueDate as any).toJSDate === 'function') {
              dueDate = (task.dueDate as unknown as DateTime).toJSDate();
            } else if (task.dueDate instanceof Date) {
              dueDate = task.dueDate;
            }
            groupKey = dueDate ? dueDate.toISOString().split('T')[0] : 'Invalid Date'; // YYYY-MM-DD
          }
          break;
        case 'path':
          if (task.filePath) {
            const lastSlashIndex = task.filePath.lastIndexOf('/');
            groupKey = lastSlashIndex > 0 ? task.filePath.substring(0, lastSlashIndex) : '/';
          } else {
            groupKey = 'Unknown';
          }
          break;
        case 'tags':
          if (!task.tags || task.tags.length === 0) {
            groupKey = 'No Tags';
          } else {
            // Usamos la primera etiqueta como clave de grupo
            groupKey = task.tags[0];
          }
          break;
      }

      if (!groupedTasks.has(groupKey)) {
        groupedTasks.set(groupKey, []);
      }

      groupedTasks.get(groupKey)?.push(task);
    });
    
    // Convertir el mapa en un array de tareas con propiedad de grupo
    const result: ITask[] = [];
    
    groupedTasks.forEach((tasksInGroup, groupKey) => {
      // Opcionalmente podrías añadir aquí una tarea "cabecera" para cada grupo
      // O podrías modificar tu interfaz ITask para incluir una propiedad de grupo

      // Por ahora, solo añadimos las tareas con una propiedad temporal
      tasksInGroup.forEach(task => {
        result.push({
          ...task,
          groupLabel: groupKey // Esta propiedad no está en ITask, deberías añadirla
        });
      });
    });
    return result;
  }
}