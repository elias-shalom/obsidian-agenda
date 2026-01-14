import { ITask, TaskFilterCriteria } from "../types/interfaces";
import { DateTime } from "luxon";

/**
 * Clase responsable del filtrado de tareas según diversos criterios
 */
export class TaskFilter {
  
  /**
   * Filtra tareas según criterios especificados
   * @param tasks Array de tareas a filtrar
   * @param criteria Criterios de filtrado (opcional)
   * @returns Tareas filtradas
   */
  public filterTasks(tasks: ITask[], criteria?: TaskFilterCriteria): ITask[] {
    // Si no hay criterios, devolver todas
    if (!criteria) return tasks;
    
    // Aplicar filtros
    return tasks.filter(task => {
      // Implementamos una función por cada categoría de filtro para mayor claridad
      return this.matchesStatusFilters(task, criteria) &&
              this.matchesTextFilters(task, criteria) &&
              this.matchesTagFilters(task, criteria) &&
              this.matchesPriorityFilters(task, criteria) &&
              this.matchesDateFilters(task, criteria) &&
              this.matchesLocationFilters(task, criteria) &&
              this.matchesAdvancedFilters(task, criteria);
    });
  }

  /**
   * Verifica si una tarea coincide con los filtros de estado
   */
  private matchesStatusFilters(task: ITask, criteria: TaskFilterCriteria): boolean {
    // Filtrar por estado específico
    if (criteria.status && criteria.status.length > 0) {
      if (!task.state.status || !criteria.status.includes(task.state.status)) {
        return false;
      }
    }

    // Filtrar por estado completado/no completado
    if (criteria.isCompleted !== undefined) {
      const isTaskCompleted = task.state.status === 'DONE' || task.state.status === 'CANCELLED';
      if (isTaskCompleted !== criteria.isCompleted) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verifica si una tarea coincide con los filtros de texto
   */
  private matchesTextFilters(task: ITask, criteria: TaskFilterCriteria): boolean {
    if (!criteria.text) return true;

    const taskText = task.line.text.trim()?.toLowerCase() || '';

    // Texto que debe incluir
    if (criteria.text.includes && criteria.text.includes.length > 0) {
      if (!criteria.text.includes.every(term => 
          taskText.includes(term.toLowerCase()))) {
        return false;
      }
    }

    // Texto que NO debe incluir
    if (criteria.text.excludes && criteria.text.excludes.length > 0) {
      if (criteria.text.excludes.some(term => 
          taskText.includes(term.toLowerCase()))) {
        return false;
      }
    }

    // Regex para coincidir
    if (criteria.text.regex) {
      try {
        const regex = new RegExp(criteria.text.regex, 'i');
        if (!regex.test(taskText)) {
          return false;
        }
      } catch (error) {
        console.error(`Error en expresión regular: ${criteria.text.regex}`, error);
        // Si hay error en la regex, ignoramos este filtro
      }
    }

    return true;
  }

  /**
   * Verifica si una tarea coincide con los filtros de etiquetas
   */
  private matchesTagFilters(task: ITask, criteria: TaskFilterCriteria): boolean {
    if (!criteria.tags) return true;
    
    const taskTags = task.section.tags || [];

    // Etiquetas que debe tener
    if (criteria.tags.includes && criteria.tags.includes.length > 0) {
      // Verificar que la tarea tenga TODAS las etiquetas requeridas
      if (!criteria.tags.includes.every(tag => taskTags.includes(tag))) {
        return false;
      }
    }

    // Etiquetas que NO debe tener
    if (criteria.tags.excludes && criteria.tags.excludes.length > 0) {
      // Verificar que la tarea NO tenga NINGUNA de las etiquetas excluidas
      if (criteria.tags.excludes.some(tag => taskTags.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verifica si una tarea coincide con los filtros de prioridad
   */
  private matchesPriorityFilters(task: ITask, criteria: TaskFilterCriteria): boolean {
    if (!criteria.priority) return true;

    const taskPriority = task.state.priority || 'undefined';

    // Prioridad exacta
    if (criteria.priority.is && criteria.priority.is.length > 0) {
      if (!criteria.priority.is.includes(taskPriority)) {
        return false;
      }
    }

    // Prioridad mayor que
    if (criteria.priority.above) {
      const priorities = ['high', 'medium', 'low', 'undefined'];
      const taskIndex = priorities.indexOf(taskPriority);
      const thresholdIndex = priorities.indexOf(criteria.priority.above);

      if (taskIndex === -1 || thresholdIndex === -1 || taskIndex >= thresholdIndex) {
        return false;
      }
    }

    // Prioridad menor que
    if (criteria.priority.below) {
      const priorities = ['high', 'medium', 'low', 'undefined'];
      const taskIndex = priorities.indexOf(taskPriority);
      const thresholdIndex = priorities.indexOf(criteria.priority.below);

      if (taskIndex === -1 || thresholdIndex === -1 || taskIndex <= thresholdIndex) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verifica si una tarea coincide con los filtros de fechas
   */
  private matchesDateFilters(task: ITask, criteria: TaskFilterCriteria): boolean {
     // Definir configuración de fechas
    const dateChecks = [
      { taskDate: task.date.due, criteriaDate: criteria.dueDate },
      { taskDate: task.date.start, criteriaDate: criteria.startDate },
      { taskDate: task.date.scheduled, criteriaDate: criteria.scheduledDate },
      { taskDate: task.date.done, criteriaDate: criteria.doneDate },
      { taskDate: task.date.created, criteriaDate: criteria.createdDate }
    ];

    // Validar cada fecha
    for (const { taskDate, criteriaDate } of dateChecks) {
        if (!this.matchesSpecificDateFilter(taskDate, criteriaDate)) {
          return false;
        }
    }
    // Luego verificamos los filtros de fecha relativos (solo para dueDate)
    if (criteria.dueDateRelative) {
      if (!this.matchesRelativeDateFilter(task.date.due, criteria.dueDateRelative)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Auxiliar para verificar filtros de fecha específicos
   */
  private matchesSpecificDateFilter(taskDate: DateTime<boolean> | Date | string | null, filterCriteria: TaskFilterCriteria['dueDate'] | TaskFilterCriteria['startDate'] | TaskFilterCriteria['scheduledDate'] | TaskFilterCriteria['doneDate'] | TaskFilterCriteria['createdDate']): boolean {
    if (!filterCriteria) return true;

    // Convertir a Date si es string o DateTime
    let dateObj: Date | null = null;
    if (taskDate) {
      if (typeof taskDate === 'string') {
        dateObj = new Date(taskDate);
      } else if (typeof (taskDate as unknown as DateTime).toJSDate === 'function') {
        dateObj = (taskDate as unknown as DateTime).toJSDate();
      } else if (taskDate instanceof Date) {
        dateObj = taskDate;
      }
    }

    // Verificar existencia
    if (filterCriteria.exists !== undefined) {
      const hasDate = dateObj !== null;
      if (hasDate !== filterCriteria.exists) {
        return false;
      }
    }

    // Solo seguir verificando si la tarea tiene fecha
    if (!dateObj) return true;

    // Comparar con fechas específicas
    if (filterCriteria.before && dateObj >= filterCriteria.before) return false;
    if (filterCriteria.on) {
      const onDate = filterCriteria.on;
      if (dateObj.getFullYear() !== onDate.getFullYear() ||
          dateObj.getMonth() !== onDate.getMonth() ||
          dateObj.getDate() !== onDate.getDate()) {
        return false;
      }
    }
    if (filterCriteria.after && dateObj <= filterCriteria.after) return false;

    return true;
  }

  /**
   * Auxiliar para verificar filtros de fecha relativos
   */
  private matchesRelativeDateFilter(taskDate: DateTime<boolean> | Date | string | null, filterCriteria: TaskFilterCriteria['dueDateRelative']): boolean {
    if (!filterCriteria || !taskDate) return true;

    let dateObj: Date;
    if (typeof taskDate === 'string') {
      dateObj = new Date(taskDate);
    } else if (typeof (taskDate as unknown as DateTime).toJSDate === 'function') {
      dateObj = (taskDate as unknown as DateTime).toJSDate();
    } else {
      dateObj = taskDate as Date;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar vencida
    if (filterCriteria.overdue) {
      const isOverdue = dateObj < today;
      if (!isOverdue) return false;
    }

    // Verificar para hoy
    if (filterCriteria.today) {
      const isToday = dateObj.getFullYear() === today.getFullYear() &&
                    dateObj.getMonth() === today.getMonth() &&
                    dateObj.getDate() === today.getDate();
      if (!isToday) return false;
    }

    // Verificar para mañana
    if (filterCriteria.tomorrow) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = dateObj.getFullYear() === tomorrow.getFullYear() &&
                        dateObj.getMonth() === tomorrow.getMonth() &&
                        dateObj.getDate() === tomorrow.getDate();
      if (!isTomorrow) return false;
    }

    // Verificar esta semana
    if (filterCriteria.thisWeek) {
      const endOfWeek = new Date(today);
      const daysUntilEndOfWeek = 7 - today.getDay();
      endOfWeek.setDate(endOfWeek.getDate() + daysUntilEndOfWeek);
      
      const isThisWeek = dateObj >= today && dateObj <= endOfWeek;
      if (!isThisWeek) return false;
    }

    // Verificar próxima semana
    if (filterCriteria.nextWeek) {
      const startOfNextWeek = new Date(today);
      const daysUntilNextWeek = 7 - today.getDay() + 1;
      startOfNextWeek.setDate(startOfNextWeek.getDate() + daysUntilNextWeek);

      const endOfNextWeek = new Date(startOfNextWeek);
      endOfNextWeek.setDate(endOfNextWeek.getDate() + 6);

      const isNextWeek = dateObj >= startOfNextWeek && dateObj <= endOfNextWeek;
      if (!isNextWeek) return false;
    }

    // Verificar días pasados
    if (filterCriteria.pastDays !== undefined) {
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - filterCriteria.pastDays);

      const isInPastDays = dateObj >= pastDate && dateObj < today;
      if (!isInPastDays) return false;
    }

    // Verificar días futuros
    if (filterCriteria.futureDays !== undefined) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + filterCriteria.futureDays);

      const isInFutureDays = dateObj >= today && dateObj <= futureDate;
      if (!isInFutureDays) return false;
    }

    return true;
  }

  /**
   * Verifica si una tarea coincide con los filtros de ubicación
   */
  private matchesLocationFilters(task: ITask, criteria: TaskFilterCriteria): boolean {
    if (!criteria.location) return true;

    // Filtrar por carpeta
    if (criteria.location.folder) {
      const taskFolder = task.file.path?.substring(0, task.file.path.lastIndexOf('/') + 1) || '';
      if (!taskFolder.startsWith(criteria.location.folder)) {
        return false;
      }
    }

    // Filtrar por archivo
    if (criteria.location.file) {
      if (!task.file.path?.includes(criteria.location.file)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verifica si una tarea coincide con los filtros avanzados
   */
  private matchesAdvancedFilters(task: ITask, criteria: TaskFilterCriteria): boolean {
    // Filtros de recurrencia
    if (criteria.recurrence) {
      const hasRecurrence = !!task.flow.recur && task.flow.recur.length > 0;

      // Verificar si tiene recurrencia
      if (criteria.recurrence.has !== undefined && hasRecurrence !== criteria.recurrence.has) {
        return false;
      }

      // Verificar patrón específico
      if (criteria.recurrence.pattern && task.flow.recur) {
        if (!task.flow.recur.includes(criteria.recurrence.pattern)) {
          return false;
        }
      }
    }

    // Filtros de dependencias
    if (criteria.dependencies) {
      const hasDependencies = !!task.flow.deps && task.flow.deps.length > 0;

      // Verificar si tiene dependencias
      if (criteria.dependencies.has !== undefined && hasDependencies !== criteria.dependencies.has) {
        return false;
      }
      // Nota: Para blocking y blockedBy necesitaríamos implementar relaciones entre tareas
      // Esto requeriría implementación adicional
    }

    return true;
  }
}