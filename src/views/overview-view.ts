import { WorkspaceLeaf } from 'obsidian';
import { BaseView } from '../views/base-view'; 
import { TaskManager } from '../core/task-manager';
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { TaskPriority } from '../types/enums';
import { DateTime } from 'luxon';

// Interfaz extendida para tareas con edad calculada
interface ITaskWithAge extends ITask {
  daysOld: number;
}

export const OVERVIEW_VIEW_TYPE = 'overview-view';

export class OverviewView extends BaseView {
  private tasks: ITask[] = []; // Lista de tareas
  private tasksLastWeek: ITask[] = []; // Tareas de la semana pasada (para comparaciones)

  constructor(leaf: WorkspaceLeaf, private plugin: any, private i18n: I18n, private taskManager: TaskManager) {
    super(leaf);
    this.i18n = i18n;
  }

  getViewType(): string {
    return OVERVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("overview_view_title"); // Título de la vista principal
  }

  getIcon(): string {
    return 'calendar-check';
  }

  async onOpen(): Promise<void> {
    this.tasks = await this.getAllTasks(this.taskManager); 

    // Preparar los datos para la plantilla usando las funciones específicas
    const templateData = {
      tasks: this.tasks,
      totalTasks: this.tasks.length,
      completedTasks: this.getCompletedTasksCount(),
      pendingTasks: this.getPendingTasksCount(),
      inProgressTasks: this.getInProgressTasksCount(),
      productivity: this.calculateProductivity(),
      highPriorityTasks: this.getHighPriorityTasksCount(),
      totalEstimatedTime: this.calculateTotalEstimatedTime(),
      // Nuevos widgets
      noDateTasks: this.getNoDateTasksCount(),
      completedThisWeek: this.getCompletedThisWeekCount(),
      completionTrend: this.calculateCompletionTrend(),
      completionRatio: this.calculateCompletionRatio(),
      consistency: this.calculateConsistency(),
      systemHealth: this.calculateSystemHealth(),
      // Listas de tareas
      todayTasks: this.getTodayTasksList(),
      overdueTasks: this.getOverdueTasksList(),
      upcomingTasks: this.getUpcomingTasksList(),
      // Nuevas listas de tareas
      invalidTasks: this.getInvalidTasksList(),
      oldestTasks: this.getOldestTasksList(),
      projectTasks: this.getTasksByProjectList(),
    };

    await this.render(OVERVIEW_VIEW_TYPE, templateData, this.i18n, this.plugin, this.leaf);
  }

  /**
   * Carga datos históricos para cálculos comparativos
   * En una implementación real, esto cargaría desde un almacén persistente
   */
  private loadHistoricalData(): void {
    // Simulación simple - en producción, esto vendría de almacenamiento persistente
    this.tasksLastWeek = [...this.tasks]; // Copia para simular datos históricos
    // Ajustar algunos valores para simular diferencias entre periodos
    this.tasksLastWeek = this.tasksLastWeek.slice(0, Math.floor(this.tasksLastWeek.length * 0.8));
  }

  /**
   * Calcula el número de tareas completadas
   */
  private getCompletedTasksCount(): number {
    return this.tasks.filter(task => task.state.text === 'Done').length;
  }

  /**
   * Calcula el número de tareas pendientes
   */
  private getPendingTasksCount(): number {
    return this.tasks.filter(task => task.state.text === 'Todo' ).length;
  }

  /**
   * Calcula el número de tareas en progreso
   */
  private getInProgressTasksCount(): number {
    return this.tasks.filter(task => task.state.text === 'InProgress').length;
  }

  /**
   * Calcula el porcentaje de productividad
   */
  private calculateProductivity(): number {
    const completedCount = this.getCompletedTasksCount();
    return this.tasks.length > 0 
      ? Math.round((completedCount / this.tasks.length) * 100) 
      : 0;
  }

  /**
   * Calcula el número de tareas de alta prioridad
   */
  private getHighPriorityTasksCount(): number {
    return this.tasks.filter(task => 
      String(task.state.priority) === String(TaskPriority.Highest) || 
      String(task.state.priority) === String(TaskPriority.High)
    ).length;
  }

  /**
   * Calcula el tiempo estimado total y lo formatea
   */
  private calculateTotalEstimatedTime(): string {
  // todo: Implementar la lógica para calcular el tiempo estimado total de las tareas
    const totalEstimatedMinutes = this.tasks
      .filter(task => task.state.text !== 'Done' && (Number(task.date.due ?? 0) - Number(task.date.start ?? 0) > 0)) // Filtrar tareas no completadas y con fechas válidas
      .reduce((total, task) => total + ((Number(task.date.due ?? 0) - Number(task.date.start ?? 0)) || 0), 0);

    // Convertir minutos a formato legible (Xh Ym)
    const hours = Math.floor(totalEstimatedMinutes / 60);
    const minutes = totalEstimatedMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
    } else {
      return minutes > 0 ? `${minutes}m` : '0m';
    }
  }

  /**
   * Calcula el número de tareas sin fecha asignada
   */
  private getNoDateTasksCount(): number {
    return this.tasks.filter(task => !task.date.due && !task.date.start && !task.date.done && !task.date.scheduled && !task.date.cancelled).length;
  }

  /**
   * Calcula el número de tareas completadas en la última semana
   */
  private getCompletedThisWeekCount(): number {
    const oneWeekAgo = DateTime.now().minus({ days: 7 }).toJSDate();

    return this.tasks.filter(task => {
      // Primero verificamos que la tarea esté completada
      if (task.state.text !== 'Done') return false;
      
      // Luego verificamos que tenga una fecha de finalización
      if (!task.date.done) return false;
      
      // Finalmente comparamos las fechas
      try {
        const taskDoneDate = this.toLocalMidnight(task.date.done);
        if (!taskDoneDate) return false;
        return taskDoneDate >= oneWeekAgo;
      } catch (error) {
        console.error("Error al comparar fechas:", error, task);
        return false;
      }
    }).length;
  }

  private getCompletedLastWeekCount(): number {
    const oneWeekAgo = DateTime.now().minus({ weeks: 1 }).toJSDate();
    const oneWeekBefore = DateTime.now().minus({ weeks: 2 }).toJSDate();

    return this.tasks.filter(task => {
      // Primero verificamos que la tarea esté completada
      if (task.state.text !== 'Done') return false;
      
      // Luego verificamos que tenga una fecha de finalización
      if (!task.date.done) return false;
      
      // Finalmente comparamos las fechas
      try {
        const taskDoneDate = this.toLocalMidnight(task.date.done);
        if (!taskDoneDate) return false;

        return taskDoneDate < oneWeekAgo && taskDoneDate >= oneWeekBefore;
      } catch (error) {
        console.error("Error al comparar fechas:", error, task);
        return false;
      }
    }).length;
  }

  /**
   * Calcula la tendencia de completado (% de cambio respecto a semana anterior)
   */
  private calculateCompletionTrend(): string {
    const completedThisWeek = this.getCompletedThisWeekCount();

    const completedLastWeek = this.getCompletedLastWeekCount();
    
    if (completedLastWeek === 0) return "+0%"; // Evitar división por cero

    const trend = ((completedThisWeek - completedLastWeek) / completedLastWeek) * 100;
    const trendRounded = Math.round(trend);
    
    return (trend >= 0 ? "+" : "") + trendRounded + "%" + (trendRounded > 0 ? "↑" : trendRounded < 0 ? "↓" : "");
  }

  /**
   * Calcula el promedio de tareas completadas por día en la última semana
   */
  private calculateCompletionRatio(): string {
    const completedThisWeek = this.getCompletedThisWeekCount();
    const ratio = completedThisWeek / 7; // División por 7 días
    
    return ratio.toFixed(1) + "/día";
  }

  /**
   * Calcula el porcentaje de días activos en la última semana
   */
  private calculateConsistency(): number {
    // Crear un mapa para contar días activos
    const activeDays = new Map<string, boolean>();
    const now = DateTime.now();
    
    // Revisa cada tarea completada
    this.tasks.forEach(task => {
      if (task.state.text === 'Done' && task.date.done) {
        const doneDate = this.toLocalMidnight(task.date.done);
        if (!doneDate) return false;

        const doneDateLuxon = DateTime.fromJSDate(doneDate);

        const daysAgo = now.diff(doneDateLuxon, 'days').days;

        // Si está dentro de la semana pasada
        if (daysAgo <= 7) {
          // Formato YYYY-MM-DD como clave del mapa
          const dateKey = doneDateLuxon.toFormat('yyyy-MM-dd');
          activeDays.set(dateKey, true);
        }
      }
    });
    
    // Calcular porcentaje de días activos
    const daysActiveCount = activeDays.size;
    return Math.round((daysActiveCount / 7) * 100);
  }

  /**
   * Calcula el porcentaje de tareas correctamente configuradas
   */
  private calculateSystemHealth(): number {
    // Definir qué hace a una tarea "saludable"
    const healthyTasks = this.tasks.filter(task => {
      // Una tarea saludable debe tener texto, estado y al menos o bien una fecha
      // o bien una prioridad asignada
      return task.state.isValid;
    }).length;
    
    return this.tasks.length > 0 
      ? Math.round((healthyTasks / this.tasks.length) * 100) 
      : 100; // Si no hay tareas, consideramos el sistema como 100% saludable
  }

  protected registerViewSpecificHelpers(i18n: any): void {
    // Puedes añadir helpers específicos si es necesario
  }

  protected setupViewSpecificEventListeners(container: HTMLElement, data: any): void {
    this.addTaskItemClickListeners(container);
    this.setupWidgetFilterListeners(container);
  }

  /**
 * Configura los listeners para el filtrado de widgets
 */
  private setupWidgetFilterListeners(container: HTMLElement): void {
    // Botón para mostrar/ocultar el panel de filtros
    const filterButton = container.querySelector('#widgets-filter-button');
    const filterPanel = container.querySelector('#widgets-filter-panel');
    const closeFilterButton = container.querySelector('#close-filter-panel');
    const applyButton = container.querySelector('#apply-widget-filters');
    const resetButton = container.querySelector('#reset-widget-filters');
    const checkboxes = container.querySelectorAll('.widget-checkboxes input[type="checkbox"]');
    
    if (!filterButton || !filterPanel || !closeFilterButton || !applyButton || !resetButton) return;

    // Cargar configuración guardada
    this.loadWidgetFiltersState(checkboxes);
    
    // Aplicar estado inicial
    this.applyWidgetFilters(container, checkboxes);

    // Mostrar/ocultar panel de filtros
    filterButton.addEventListener('click', () => {
      filterPanel.classList.toggle('hidden');
    });

    // Cerrar panel
    closeFilterButton.addEventListener('click', () => {
      filterPanel.classList.add('hidden');
    });

    // Aplicar filtros
    applyButton.addEventListener('click', () => {
      this.applyWidgetFilters(container, checkboxes);
      this.saveWidgetFiltersState(checkboxes);
      filterPanel.classList.add('hidden');
    });

    // Restablecer filtros
    resetButton.addEventListener('click', () => {
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = true;
      });
      this.applyWidgetFilters(container, checkboxes);
      this.saveWidgetFiltersState(checkboxes);
    });
  }

  /**
   * Aplica los filtros de widgets según las casillas seleccionadas
   */
  private applyWidgetFilters(container: HTMLElement, checkboxes: NodeListOf<Element>): void {
    checkboxes.forEach(checkbox => {
      const cb = checkbox as HTMLInputElement;
      const widgetType = cb.dataset.widget;
    
      if (widgetType) {
      // Buscar todos los widgets que coincidan con este tipo (pueden ser múltiples)
      const widgets = container.querySelectorAll(`[data-widget-type="${widgetType}"]`);
      
      // Verificar si se encontraron widgets
      if (widgets.length === 0) {
        console.warn(`No se encontraron widgets para: ${widgetType}`);
      }
      
        // Aplicar visibilidad a todos los widgets encontrados
        widgets.forEach(widget => {
          //console.log(`Aplicando ${cb.checked ? 'mostrar' : 'ocultar'} a widget: ${widgetType}`);
          if (cb.checked) {
            widget.classList.remove('hidden');
          } else {
            widget.classList.add('hidden');
          }
        });
      }
    });
  }

  /**
   * Guarda el estado de los filtros
   */
  private saveWidgetFiltersState(checkboxes: NodeListOf<Element>): void {
    const state: Record<string, boolean> = {};
    
    checkboxes.forEach(checkbox => {
      const cb = checkbox as HTMLInputElement;
      const widgetClass = cb.dataset.widget;
      if (widgetClass) {
        state[widgetClass] = cb.checked;
      }
    });
    
    this.app.saveLocalStorage('obsidian-agenda-widget-filters', JSON.stringify(state));
  }

  /**
   * Carga el estado guardado de los filtros
   */
  private loadWidgetFiltersState(checkboxes: NodeListOf<Element>): void {
    const savedState = this.app.loadLocalStorage('obsidian-agenda-widget-filters');
    if (!savedState) return;
    
    try {
      const state = JSON.parse(savedState);
      checkboxes.forEach(checkbox => {
        const cb = checkbox as HTMLInputElement;
        const widgetClass = cb.dataset.widget;
        if (widgetClass && state[widgetClass] !== undefined) {
          cb.checked = state[widgetClass];
        }
      });
    } catch (error) {
      console.error("Error al cargar la configuración de widgets:", error);
    }
  }

  /**
   * Obtiene la lista de tareas programadas para hoy
   */
  private getTodayTasksList(): ITask[] {
    const today = DateTime.now().startOf('day');
    const tomorrow = today.plus({ days: 1 });
    
    return this.tasks
      .filter(task => {
        // Si la tarea está completada o cancelada, no se incluye
        if (task.state.text === 'Done' || task.state.text === 'Cancelled') return false;
        
        // Verificar si la tarea está programada para hoy
        if (task.date.scheduled) {
          const scheduledDate = this.toLocalMidnight(task.date.scheduled);
          if (!scheduledDate) return false;
          const scheduledDateTime = DateTime.fromJSDate(scheduledDate);

          return scheduledDateTime >= today && scheduledDateTime < tomorrow;
        }

        // Si no tiene fecha programada pero tiene fecha de vencimiento hoy
        if (task.date.due) {
          const dueDate = this.toLocalMidnight(task.date.due);
          if (!dueDate) return false;

          const dueDateTime = DateTime.fromJSDate(dueDate).startOf('day');
          return dueDateTime.equals(today);
        }
        
        return false;
      })
      .sort((a, b) => {
        // Ordenar por prioridad (mayor primero)
        if (a.state.priority !== b.state.priority) {
          return (Number(b.state.priority || 0) - Number(a.state.priority || 0));
        }
        
        // Si misma prioridad, ordenar por fecha de vencimiento
        const aDate = a.date.due ? this.toLocalMidnight(a.date.due) : null;
        const bDate = b.date.due ? this.toLocalMidnight(b.date.due) : null;
        
        if (aDate && bDate) return aDate.getTime() - bDate.getTime();
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
      })
      .slice(0, 5); // Limitar a 5 tareas para el widget
  }

  /**
   * Obtiene la lista de tareas vencidas
   */
  private getOverdueTasksList(): ITask[] {
    const today = DateTime.now().startOf('day');
    
    return this.tasks
      .filter(task => {
        // Si la tarea está completada o cancelada, no se incluye
        if (task.state.text === 'Done' || task.state.text === 'Cancelled') return false;
        
        // Verificar si la tarea está vencida
        if (task.date.due) {
          const dueDate = this.toLocalMidnight(task.date.due);
          if (!dueDate) return false;

          const dueDateTime = DateTime.fromJSDate(dueDate).startOf('day');
          return dueDateTime < today;
        }
        
        return false;
      })
      .sort((a, b) => {
        // Ordenar por fecha de vencimiento (más antigua primero)
        const aDate = a.date.due ? this.toLocalMidnight(a.date.due) : null;
        const bDate = b.date.due ? this.toLocalMidnight(b.date.due) : null;
        
        if (aDate && bDate) return aDate.getTime() - bDate.getTime();
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
      })
      .slice(0, 5); // Limitar a 5 tareas para el widget
  }

  /**
   * Obtiene la lista de tareas próximas a vencer
   */
  private getUpcomingTasksList(): ITask[] {
    const today = DateTime.now().startOf('day');
    const nextWeek = today.plus({ days: 7 });
    
    return this.tasks
      .filter(task => {
        // Si la tarea está completada o cancelada, no se incluye
        if (task.state.text === 'Done' || task.state.text === 'Cancelled') return false;
        
        // Verificar si la tarea vence próximamente
        if (task.date.due) {
          const dueDate = this.toLocalMidnight(task.date.due);
          if (!dueDate) return false;

          const dueDateTime = DateTime.fromJSDate(dueDate).startOf('day');
          return dueDateTime >= today && dueDateTime <= nextWeek;
        }
        
        return false;
      })
      .sort((a, b) => {
        // Ordenar por fecha de vencimiento (más cercana primero)
        const aDate = a.date.due ? this.toLocalMidnight(a.date.due) : null;
        const bDate = b.date.due ? this.toLocalMidnight(b.date.due) : null;
        
        if (aDate && bDate) return aDate.getTime() - bDate.getTime();
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
      })
      .slice(0, 5); // Limitar a 5 tareas para el widget
  }

  /**
 * Obtiene la lista de tareas no válidas (isValid = false)
 */
  private getInvalidTasksList(): ITask[] {
    return this.tasks
    .filter(task => {
      // Filtrar solo tareas no válidas que no estén completadas o canceladas
      return !task.state.isValid && 
             task.state.text !== 'Done' && 
             task.state.text !== 'Cancelled';
    })
    .map(task => {
      // Añadir información de error desde taskFields
      if (task.section.fields) {
        // Extraer los mensajes de error de taskFields
        const errorMessages: string[] = [];
        
        // Recorrer todos los campos en taskFields para encontrar errores
        task.section.fields.forEach(field => {
          if (field) {
            errorMessages.push(`${field}`);
          }
        });
        
        // Añadir los mensajes de error como propiedad temporal
        //task['errorMessages'] = errorMessages.length > 0 
        //  ? errorMessages 
        //  : ['Error desconocido'];
      } else {
        //task['errorMessages'] = ['Campo inválido'];
      }
      
      return task;
    })
    .sort((a, b) => {
      // Ordenar por más reciente primero
      const aDate = a.date.created ? this.toLocalMidnight(a.date.created) : null;
      const bDate = b.date.created ? this.toLocalMidnight(b.date.created) : null;
      
      if (aDate && bDate) return bDate.getTime() - aDate.getTime();
      if (aDate) return 1;
      if (bDate) return -1;
      return 0;
    })
    .slice(0, 5); // Limitar a 5 tareas para el widget
  }

  /**
   * Obtiene la lista de tareas más antiguas (tiempo sin completar)
   */
  private getOldestTasksList(): ITaskWithAge[] {
    const now = DateTime.now();
    
    return this.tasks
      .filter(task => {
        // Filtrar tareas no completadas y no canceladas
        return task.state.text !== 'Done' && 
              task.state.text !== 'Cancelled' && 
              task.date.created;
      })
      .sort((a, b) => {
        // Ordenar por fecha de creación (más antigua primero)
        const aDate = a.date.created ? this.toLocalMidnight(a.date.created) : null;
        const bDate = b.date.created ? this.toLocalMidnight(b.date.created) : null;
        
        if (aDate && bDate) return aDate.getTime() - bDate.getTime();
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
      })
      .slice(0, 5) // Limitar a 5 tareas para el widget
      .map(task => {
        // Calcular días desde creación para mostrar
        let daysOld = 0;
        if (task.date.created) {
          const createdDate = this.toLocalMidnight(task.date.created);
          if (createdDate) {
            const createdLuxon = DateTime.fromJSDate(createdDate);
            daysOld = Math.floor(now.diff(createdLuxon, 'days').days);
          }
        }
        
        // Crear objeto con type safety
        const result: ITaskWithAge = {
          ...task,
          daysOld: daysOld
        };
        
        return result;
      });
  }

  /**
   * Obtiene tareas agrupadas por proyecto/carpeta
   */
  private getTasksByProjectList(): { project: string, tasks: ITask[] }[] {
    // Crear un mapa para agrupar tareas por proyecto
    const projectMap = new Map<string, ITask[]>();
    
    // Agrupar por file.root
    this.tasks
      .filter(task => task.state.text !== 'Done' && task.state.text !== 'Cancelled')
      .forEach(task => {
        const projectName = task.file.root || 'Sin proyecto';
        
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, []);
        }
        projectMap.get(projectName)!.push(task);
      });
    
    // Convertir el mapa a un array de objetos
    const result = Array.from(projectMap.entries())
      .map(([project, tasks]) => ({
        project,
        tasks: tasks.slice(0, 3) // Limitar a 3 tareas por proyecto para el widget
      }))
      .sort((a, b) => b.tasks.length - a.tasks.length) // Ordenar por cantidad de tareas
      .slice(0, 5); // Mostrar solo los 5 proyectos principales
    
    return result;
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}