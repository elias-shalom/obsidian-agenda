import { App, TFile, Plugin } from "obsidian";
import { ITask, TaskFilterCriteria, SortField, GroupField } from "../types/interfaces";
import logger from "./logger";
import { TaskSection } from "../entities/task-section";
import { Task } from "../entities/task";
import { I18n } from "./i18n";
import { EventBus, EVENTS } from "./event-bus";

export class TaskManager {
  private tasksCache: Map<string, ITask[]> = new Map(); // Cache por archivo
  private allTasksCache: ITask[] | null = null; // Cache global de todas las tareas
  private lastRefreshTime: number = 0;
  private readonly CACHE_TTL = 300000; // 5 minutos (ajustable)
  private refreshInProgress: boolean = false;
  private refreshPromise: Promise<ITask[]> | null = null;
  private eventBus: EventBus;

  constructor(private app: App, private i18n: I18n, private plugin: Plugin) {
    this.eventBus = EventBus.getInstance();
  }

  /**
  * Configura los escuchadores de eventos usando registerEvent
  * para una limpieza automática cuando el plugin se descarga
  */
  public registerEvents(plugin: Plugin): void {
    // Escuchar modificaciones de archivos Markdown
    console.log("Escuchando eventos de modificación de archivos Markdown");
    this.plugin.registerEvent(
      this.app.vault.on('modify', (file: any) => {
        if (file instanceof TFile && file.extension === 'md') {          
          this.invalidateFileCache(file.path);
        }
      })
    );

    // Escuchar creación de archivos Markdown
    this.plugin.registerEvent(
      this.app.vault.on('create', (file: any) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.invalidateCache();
        }
      })
    );

    // Escuchar eliminación de archivos Markdown
    this.plugin.registerEvent(
      this.app.vault.on('delete', (file: any) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.invalidateFileCache(file.path);
        }
      })
    );

    // Escuchar renombrado de archivos Markdown
    this.plugin.registerEvent(
      this.app.vault.on('rename', (file: any, oldPath: string) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.invalidateFileCache(oldPath);
          this.invalidateFileCache(file.path);
        }
      })
    );
  }

  /**
   * Invalida el cache de un archivo específico
   */
  public invalidateFileCache(filePath: string): void {
    this.tasksCache.delete(filePath);
    this.allTasksCache = null; // Invalidar cache global
    this.eventBus.emit(EVENTS.TASKS_UPDATED, filePath);
    logger.debug(`Cache invalidado para: ${filePath}`);
  }

  /**
   * Invalida todo el cache
   */
  public invalidateCache(): void {    
    this.tasksCache.clear();
    this.allTasksCache = null;
    this.lastRefreshTime = 0;
    this.eventBus.emit(EVENTS.TASKS_UPDATED);
    logger.debug("Cache de tareas completamente invalidado");
  }

  /**
   * Limpia recursos del TaskManager
   * Ya no necesitamos eliminar manualmente los eventos
   * ya que registerEvent se encarga de eso
   */
  public cleanup(): void {
    // Limpiar caches
    console.log("Limpiando Task Manager...");
    this.invalidateCache();
    logger.debug("Task Manager limpiado correctamente");
  }

  /**
   * Actualiza el cache completo de tareas
   */
  private async refreshAllTasksCache(): Promise<ITask[]> {
    try {
      const files = this.app.vault.getMarkdownFiles();
      const batchSize = 10;
      const allTasks: ITask[] = [];

      // Procesamiento por lotes
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        // Array para almacenar promesas
        const batchPromises = batch.map(async file => {
          // Primero verificar si hay un cache válido para este archivo
          if (this.tasksCache.has(file.path)) {
            return this.tasksCache.get(file.path) || [];
          }
          
          // Si no hay cache para el archivo, extraer las tareas
          const fileTasks = await this.extractTasksFromContent(file);
          
          // Actualizar el cache para este archivo
          this.tasksCache.set(file.path, fileTasks);
          
          return fileTasks;
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(fileTasks => {
          allTasks.push(...fileTasks);
        });
      }

      logger.debug(`Tareas extraídas: ${allTasks.length} de ${files.length} archivos`);
      
      // Actualizar el cache global y el timestamp
      this.allTasksCache = allTasks;
      this.lastRefreshTime = Date.now();

      //console.log(this.allTasksCache, this.lastRefreshTime);
      
      return allTasks;
    } catch (error) {
      logger.error("Error al obtener tareas:", error);
      return this.allTasksCache || [];
    }
  }

  /**
  * Recarga forzada de todas las tareas
  * Útil para llamadas desde la UI
  */
  async forceRefreshTasks(): Promise<ITask[]> {
    this.invalidateCache();
    return this.getAllTasks();
  }

  /**
 * Obtiene todas las tareas, usando cache si es posible
 * @returns Lista de tareas
 */
  async getAllTasks(): Promise<ITask[]> {
    // Si hay un refresh en progreso, esperar a que termine
    if (this.refreshInProgress && this.refreshPromise) {
      return this.refreshPromise;
    }

    console.log(this.allTasksCache, this.lastRefreshTime, this.CACHE_TTL);

    const now = Date.now();
    // Si el cache global es válido y reciente, usarlo
    if (this.allTasksCache && (now - this.lastRefreshTime < this.CACHE_TTL)) {
      logger.debug("Usando cache global de tareas");
      return this.allTasksCache;
    }

    // Iniciar un nuevo refresh
    this.refreshInProgress = true;
    this.refreshPromise = this.refreshAllTasksCache();
    
    try {
      const tasks = await this.refreshPromise;
      return tasks;
    } finally {
      this.refreshInProgress = false;
      this.refreshPromise = null;
    }
  }

  // El resto de métodos existentes...
  // Todos los métodos que llamen a this.getAllTasks() 
  // ahora usarán automáticamente el cache...

  /**
  * Filtra tareas según criterios especificados
  * @param criteria Criterios de filtrado (opcional)
  * @returns Tareas filtradas
  */
  async getFilteredTasks(criteria?: TaskFilterCriteria): Promise<ITask[]> {
    // Obtener todas las tareas
    const allTasks = await this.getAllTasks();
    
    // Si no hay criterios, devolver todas
    if (!criteria) return allTasks;
    
    // Aplicar filtros
    let filteredTasks = allTasks.filter(task => {
      // Implementamos una función por cada categoría de filtro para mayor claridad
      return this.matchesStatusFilters(task, criteria) &&
              this.matchesTextFilters(task, criteria) &&
              this.matchesTagFilters(task, criteria) &&
              this.matchesPriorityFilters(task, criteria) &&
              this.matchesDateFilters(task, criteria) &&
              this.matchesLocationFilters(task, criteria) &&
              this.matchesAdvancedFilters(task, criteria);
    });

    // Aplicar ordenación
    if (criteria.sort) {
      filteredTasks = this.sortTasksByMultipleFields(
        filteredTasks, 
        criteria.sort.by, 
        criteria.sort.direction
      );
    }

    // Aplicar límite
    if (criteria.limit && criteria.limit > 0) {
      filteredTasks = filteredTasks.slice(0, criteria.limit);
    }

    // Opcionalmente agrupar resultados
    if (criteria.groupBy) {
      return this.groupTasks(filteredTasks, criteria.groupBy);
    }

    logger.debug(`Filtrado: ${filteredTasks.length} de ${allTasks.length} tareas coinciden con los criterios`);
    return filteredTasks;
  }

  /**
 * Obtiene las tareas pendientes (no completadas)
 */
  async getPendingTasks(): Promise<ITask[]> {
    return this.getFilteredTasks({
      isCompleted: false
    });
  }

  /**
   * Obtiene las tareas completadas
   */
  async getCompletedTasks(): Promise<ITask[]> {
    return this.getFilteredTasks({
      isCompleted: true
    });
  }

  /**
  * Obtiene las tareas para hoy
  */
  async getTodayTasks(): Promise<ITask[]> {
    return this.getFilteredTasks({
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
    return this.getFilteredTasks({
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
    return this.getFilteredTasks({
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
    return this.getFilteredTasks({
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
    return this.getFilteredTasks({
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
    return this.getFilteredTasks({
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
    return this.getFilteredTasks({
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
   * Obtiene las tareas para un archivo específico
   * (método nuevo que puede ser útil)
   */
  async getTasksForFile(filePath: string): Promise<ITask[]> {
    // Si hay en el cache, devolver desde ahí
    if (this.tasksCache.has(filePath)) {
      return this.tasksCache.get(filePath) || [];
    }

    // Si no, intentar obtener el archivo
    const file = this.app.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) {
      const tasks = await this.extractTasksFromContent(file);
      this.tasksCache.set(filePath, tasks);
      return tasks;
    }
    return [];
  }

  ///
  /// Funciones para extraer tareas de archivos
  ///

  /**
   * Extrae tareas de un archivo específico
   * @param file El archivo del cual extraer tareas
   * @returns Una promesa que resuelve a un array de tareas
   */
  private async extractTasksFromContent(file: TFile): Promise <ITask[]> {
    try {
      const content = await this.app.vault.read(file);
      const cachedMetadata = this.app.metadataCache.getFileCache(file);

      // Verificar si podemos usar el caché de metadatos
      if (cachedMetadata && cachedMetadata.listItems) {
        const tasks = this.extractTasksFromCache(file, cachedMetadata, content);
        if (tasks.length > 0) {
          return tasks;
        }
        // Si no se encontraron tareas, caemos en el método tradicional (por si acaso)
      }

      // Usar el método tradicional como fallback
      return this.extractTasksTraditionally(file, content);

    } catch (error) {
      logger.error("Error al extraer tareas del contenido:", error);
      return [];
    }
  }

  /**
 * Extrae tareas usando el caché de metadatos de Obsidian
 */
  private extractTasksFromCache(file: TFile, cache: any, content: string): ITask[] {
    const tasks: ITask[] = [];
    const lines = content.split("\n");
    //logger.debug(`Usando caché de metadatos para ${file.path}`);

    // Solo procesar elementos de lista que son tareas
    if (cache.listItems) {
      for (const item of cache.listItems) {
        // Verificar si es una tarea (tiene un carácter de tarea)
        if (item.task !== undefined) {
          // Obtener el número de línea (ajustado a base 0)
          const lineNumber = item.position.start.line;

          // Obtener el contenido de la línea
          const line = lines[lineNumber];

          // Solo procesar si coincide con el formato de tarea
          if (line && line.match(TaskSection.taskFormatRegex)) {
            const task = this.createTaskFromLine(file, line, lineNumber, content);
            if (task) {
              tasks.push(task);
            }
          }
        }
      }
    }
    return tasks;
  }

  /**
   * Extrae tareas usando el método tradicional (sin caché)
   */
  private extractTasksTraditionally(file: TFile, content: string): ITask[] {
    //logger.debug(`Usando método tradicional para ${file.path}`);
    const lines = content.split("\n").filter(line => line.match(TaskSection.taskFormatRegex)); 
    const tasks: ITask[] = [];

    lines.forEach((line, lineNumber) => {
      if (line) {
        const task = this.createTaskFromLine(file, line, lineNumber, content);
        if (task) {
          tasks.push(task);
        }
      }
    });
    
    //logger.debug(`Extraídas ${tasks.length} tareas de ${file.path} usando método tradicional`);
    return tasks;
  }

  /**
 * Crea un objeto ITask a partir de una línea de texto
 */
  private createTaskFromLine(file: TFile, line: string, lineNumber: number, content: string): ITask | null {
    try {
      const taskSection = new TaskSection(this.i18n);
      taskSection.initialize(line);

      const status = Task.extractStatusFromHeader(taskSection.header);
      const tags = Task.extractTags(line);

      return {
        id: taskSection.taskData.id || `${file.path}-${lineNumber + 1}`,
        title: line,
        text: line.trim(),
        link: { path: file.path },
        lineNumber: lineNumber + 1, // Ajustar a base 1 para consistencia
        //section: taskSection,
        status: status,
        tags: tags,
        priority: taskSection.taskData.priority || "undefined",
        createdDate: taskSection.taskData.createdDate || null,
        startDate: taskSection.taskData.startDate || null,
        scheduledDate: taskSection.taskData.scheduledDate || null,
        dueDate: taskSection.taskData.dueDate || null,
        doneDate: taskSection.taskData.doneDate || null,
        cancelledDate: taskSection.taskData.cancelledDate || null,
        recurrence: taskSection.taskData.recurrence || "",
        onCompletion: taskSection.taskData.onCompletion,
        dependsOn: taskSection.taskData.dependsOn,
        blockLink: taskSection.blockLink,
        scheduledDateIsInferred: false,
        filePath: file.path,
        fileName: file.name,
        fileBasename: file.basename,
        fileExtension: file.extension,
        header: taskSection.header,
        description: taskSection.description,
        tasksFields: taskSection.tasksFields,
        taskData: taskSection.taskData,
        isValid: taskSection.taskData.isValid || false,
      } as ITask;
    } catch (error) {
      logger.error(`Error creando tarea de línea ${lineNumber + 1} en ${file.path}:`, error);
      return null;
    }
  }

  ///
  /// Funciones para filtrar tareas

  /**
   * Verifica si una tarea coincide con los filtros de estado
   */
  private matchesStatusFilters(task: ITask, criteria: TaskFilterCriteria): boolean {
    // Filtrar por estado específico
    if (criteria.status && criteria.status.length > 0) {
      if (!task.status || !criteria.status.includes(task.status)) {
        return false;
      }
    }

    // Filtrar por estado completado/no completado
    if (criteria.isCompleted !== undefined) {
      const isTaskCompleted = task.status === 'DONE' || task.status === 'CANCELLED';
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

    const taskText = task.text?.toLowerCase() || '';

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
        logger.error(`Error en expresión regular: ${criteria.text.regex}`, error);
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
    
    const taskTags = task.tags || [];

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

    const taskPriority = task.priority || 'undefined';

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
    // Empezamos verificando los filtros de fecha específicos
    if (!this.matchesSpecificDateFilter(task.dueDate, criteria.dueDate)) return false;
    if (!this.matchesSpecificDateFilter(task.startDate, criteria.startDate)) return false;
    if (!this.matchesSpecificDateFilter(task.scheduledDate, criteria.scheduledDate)) return false;
    if (!this.matchesSpecificDateFilter(task.doneDate, criteria.doneDate)) return false;
    if (!this.matchesSpecificDateFilter(task.createdDate, criteria.createdDate)) return false;

    // Luego verificamos los filtros de fecha relativos (solo para dueDate)
    if (criteria.dueDateRelative) {
      if (!this.matchesRelativeDateFilter(task.dueDate, criteria.dueDateRelative)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Auxiliar para verificar filtros de fecha específicos
   */
  private matchesSpecificDateFilter(taskDate: Date | string | null, filterCriteria: any): boolean {
    if (!filterCriteria) return true;

    // Convertir a Date si es string
    let dateObj: Date | null = null;
    if (taskDate) {
      dateObj = typeof taskDate === 'string' ? new Date(taskDate) : taskDate;
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
  private matchesRelativeDateFilter(taskDate: Date | string | null, filterCriteria: any): boolean {
    if (!taskDate) return true;

    const dateObj = typeof taskDate === 'string' ? new Date(taskDate) : taskDate;
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
      const taskFolder = task.filePath?.substring(0, task.filePath.lastIndexOf('/') + 1) || '';
      if (!taskFolder.startsWith(criteria.location.folder)) {
        return false;
      }
    }

    // Filtrar por archivo
    if (criteria.location.file) {
      if (!task.filePath?.includes(criteria.location.file)) {
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
      const hasRecurrence = !!task.recurrence && task.recurrence.length > 0;

      // Verificar si tiene recurrencia
      if (criteria.recurrence.has !== undefined && hasRecurrence !== criteria.recurrence.has) {
        return false;
      }

      // Verificar patrón específico
      if (criteria.recurrence.pattern && task.recurrence) {
        if (!task.recurrence.includes(criteria.recurrence.pattern)) {
          return false;
        }
      }
    }

    // Filtros de dependencias
    if (criteria.dependencies) {
      const hasDependencies = !!task.dependsOn && task.dependsOn.length > 0;

      // Verificar si tiene dependencias
      if (criteria.dependencies.has !== undefined && hasDependencies !== criteria.dependencies.has) {
        return false;
      }
      // Nota: Para blocking y blockedBy necesitaríamos implementar relaciones entre tareas
      // Esto requeriría implementación adicional
    }

    return true;
  }

  /**
   * Ordena tareas por múltiples campos
   */
  private sortTasksByMultipleFields(
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
   * Compara dos fechas, manejando valores nulos
   */
  private compareDates(dateA: Date | string | null, dateB: Date | string | null): number {
    // Convertir a Date si es string
    const dateObjA = dateA ? (typeof dateA === 'string' ? new Date(dateA) : dateA) : null;
    const dateObjB = dateB ? (typeof dateB === 'string' ? new Date(dateB) : dateB) : null;
    
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
  private groupTasks(tasks: ITask[], groupField: GroupField): ITask[] {
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
            const dueDate = typeof task.dueDate === 'string' ? new Date(task.dueDate) : task.dueDate;
            groupKey = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD
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