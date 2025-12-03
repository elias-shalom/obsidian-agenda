import { ITask, TaskFilterCriteria } from "../types/interfaces";

/**
 * Clase responsable de manejar consultas específicas y comunes de tareas
 * Proporciona métodos de conveniencia para obtener tareas con criterios predefinidos
 */
export class TaskQueryHandler {
  
  constructor(
    private filterTasks: (tasks: ITask[], criteria?: TaskFilterCriteria) => Promise<ITask[]>
  ) {}

  /**
   * Obtiene las tareas pendientes (no completadas)
   */
  async getPendingTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: false
    });
  }

  /**
   * Obtiene las tareas completadas
   */
  async getCompletedTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: true
    });
  }

  /**
   * Obtiene las tareas para hoy
   */
  async getTodayTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: false,
      dueDateRelative: {
        today: true
      },
      sort: {
        by: ['priority', 'text'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene las tareas para mañana
   */
  async getTomorrowTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: false,
      dueDateRelative: {
        tomorrow: true
      },
      sort: {
        by: ['priority', 'text'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene las tareas vencidas
   */
  async getOverdueTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: false,
      dueDateRelative: {
        overdue: true
      },
      sort: {
        by: ['dueDate', 'priority'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene las tareas programadas para esta semana
   */
  async getThisWeekTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: false,
      dueDateRelative: {
        thisWeek: true
      },
      sort: {
        by: ['dueDate', 'priority'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene las tareas programadas para la próxima semana
   */
  async getNextWeekTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: false,
      dueDateRelative: {
        nextWeek: true
      },
      sort: {
        by: ['dueDate', 'priority'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene las tareas completadas recientemente
   */
  async getRecentlyCompletedTasks(days: number = 7): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: true,
      doneDate: {
        after: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      },
      sort: {
        by: ['doneDate'],
        direction: ['desc']
      }
    });
  }

  /**
   * Obtiene las tareas con alta prioridad
   */
  async getHighPriorityTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: false,
      priority: {
        is: ['high']
      },
      sort: {
        by: ['dueDate'],
        direction: ['asc']
      }
    });
  }

  /**
   * Obtiene tareas por etiquetas específicas
   */
  async getTasksByTags(tags: string[]): Promise<ITask[]> {
    return this.filterTasks([], {
      tags: {
        includes: tags
      },
      sort: {
        by: ['priority', 'dueDate'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene tareas por estado específico
   */
  async getTasksByStatus(status: string[]): Promise<ITask[]> {
    return this.filterTasks([], {
      status: status,
      sort: {
        by: ['dueDate', 'priority'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene tareas por prioridad específica
   */
  async getTasksByPriority(priority: string[]): Promise<ITask[]> {
    return this.filterTasks([], {
      priority: {
        is: priority
      },
      sort: {
        by: ['dueDate', 'text'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene tareas por carpeta específica
   */
  async getTasksByFolder(folderPath: string): Promise<ITask[]> {
    return this.filterTasks([], {
      location: {
        folder: folderPath
      },
      sort: {
        by: ['priority', 'dueDate'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene tareas que contienen texto específico
   */
  async getTasksByText(searchText: string): Promise<ITask[]> {
    return this.filterTasks([], {
      text: {
        includes: [searchText]
      },
      sort: {
        by: ['priority', 'dueDate'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene tareas con fecha de vencimiento en un rango específico
   */
  async getTasksInDateRange(startDate: Date, endDate: Date): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: false,
      dueDate: {
        after: startDate,
        before: endDate
      },
      sort: {
        by: ['dueDate', 'priority'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene tareas sin fecha de vencimiento
   */
  async getTasksWithoutDueDate(): Promise<ITask[]> {
    return this.filterTasks([], {
      isCompleted: false,
      dueDate: {
        exists: false
      },
      sort: {
        by: ['priority', 'text'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene tareas con recurrencia
   */
  async getRecurringTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      recurrence: {
        has: true
      },
      sort: {
        by: ['dueDate', 'priority'],
        direction: ['asc', 'asc']
      }
    });
  }

  /**
   * Obtiene tareas bloqueadas (con dependencias)
   */
  async getBlockedTasks(): Promise<ITask[]> {
    return this.filterTasks([], {
      dependencies: {
        has: true
      },
      isCompleted: false,
      sort: {
        by: ['priority', 'dueDate'],
        direction: ['asc', 'asc']
      }
    });
  }
}