import { App, TFile, Plugin } from "obsidian";
import { ITask, TaskFilterCriteria, SortField, GroupField } from "../types/interfaces";
import { I18n } from "./i18n";
import { EventBus, EVENTS } from "./event-bus";
import { TaskCache } from "./task-cache";
import { TaskExtractor } from "./task-extractor";
import { TaskFilter } from "./task-filter";
import { TaskSorter } from "./task-sorter";
import { TaskQueryHandler } from "./task-query-handler";

export class TaskManager {
  private refreshInProgress: boolean = false;
  private refreshPromise: Promise<ITask[]> | null = null;
  private eventBus: EventBus;
  private registeredEvents: any[] = [];
  
  // Instancias de las clases especializadas
  private taskCache: TaskCache;
  private taskExtractor: TaskExtractor;
  private taskFilter: TaskFilter;
  private taskSorter: TaskSorter;
  private queryHandler: TaskQueryHandler;

  constructor(private app: App, private i18n: I18n, private plugin: Plugin) {
    this.eventBus = EventBus.getInstance();
    
    // Inicializar las clases especializadas
    this.taskCache = new TaskCache();
    this.taskExtractor = new TaskExtractor(app, i18n);
    this.taskFilter = new TaskFilter();
    this.taskSorter = new TaskSorter();
    this.queryHandler = new TaskQueryHandler(
      (tasks: ITask[], criteria?: TaskFilterCriteria) => this.getFilteredTasks(criteria)
    );
  }

  /**
  * Configura los escuchadores de eventos usando registerEvent
  * para una limpieza automática cuando el plugin se descarga
  */
  public registerEvents(plugin: Plugin): void {
    // Escuchar modificaciones de archivos Markdown
    //console.log("Escuchando eventos de modificación de archivos Markdown");
    const event = this.plugin.registerEvent(
      this.app.vault.on('modify', (file: any) => {
        if (file instanceof TFile && file.extension === 'md') {          
          this.invalidateFileCache(file.path);
        }
      })
    );

    this.registeredEvents.push(event);

    // Escuchar creación de archivos Markdown
    const createEvent = this.plugin.registerEvent(
      this.app.vault.on('create', (file: any) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.invalidateCache();
        }
      })
    );

    this.registeredEvents.push(createEvent);

    // Escuchar eliminación de archivos Markdown
    const deleteEvent = this.plugin.registerEvent(
      this.app.vault.on('delete', (file: any) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.invalidateFileCache(file.path);
        }
      })
    );

    this.registeredEvents.push(deleteEvent);

    // Escuchar renombrado de archivos Markdown
    const renameEvent = this.plugin.registerEvent(
      this.app.vault.on('rename', (file: any, oldPath: string) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.invalidateFileCache(oldPath);
          this.invalidateFileCache(file.path);
        }
      })
    );

    this.registeredEvents.push(renameEvent);
  }

  unregisterEvents(): void {
    // Los eventos registrados con this.plugin.registerEvent() 
    // se limpian automáticamente cuando el plugin se descarga
    // No necesitamos hacer nada aquí manualmente
    this.registeredEvents.length = 0; // Limpiar el array
  }

  /**
   * Invalida el cache de un archivo específico
   */
  public invalidateFileCache(filePath: string): void {
    this.taskCache.invalidateFileCache(filePath);
  }

  /**
   * Invalida todo el cache
   */
  public invalidateCache(): void {    
    this.taskCache.invalidateAllCache();
  }

  /**
   * Limpia recursos del TaskManager
   */
  public cleanup(): void {
    // Limpiar caches
    this.taskCache.cleanup();
    
    // Limpiar array de eventos (aunque Obsidian maneja la limpieza automática)
    this.registeredEvents.length = 0;
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
          if (this.taskCache.hasFileCache(file.path)) {
            return this.taskCache.getFileCache(file.path) || [];
          }          
          
          // Si no hay cache para el archivo, extraer las tareas
          const fileTasks = await this.taskExtractor.extractTasksFromFile(file);
          
          // Actualizar el cache para este archivo
          this.taskCache.setFileCache(file.path, fileTasks);
          
          return fileTasks;
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(fileTasks => {
          allTasks.push(...fileTasks);
        });
      }

      console.debug(`Tareas extraídas: ${allTasks.length} de ${files.length} archivos`);
      
      // Actualizar el cache global
      this.taskCache.setGlobalCache(allTasks);

      console.debug(allTasks);
      
      return allTasks;
    } catch (error) {
      console.error("Error al obtener tareas:", error);
      return this.taskCache.getGlobalCache() || [];
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

    // Si el cache global es válido, usarlo
    if (this.taskCache.isGlobalCacheValid()) {
      return this.taskCache.getGlobalCache()!;
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

  /**
  * Filtra tareas según criterios especificados
  * @param criteria Criterios de filtrado (opcional)
  * @returns Tareas filtradas
  */
  async getFilteredTasks(criteria?: TaskFilterCriteria): Promise<ITask[]> {
    // Obtener todas las tareas
    const allTasks = await this.getAllTasks();
    
    // Aplicar filtros usando TaskFilter
    let filteredTasks = this.taskFilter.filterTasks(allTasks, criteria);

    // Aplicar ordenación usando TaskSorter
    if (criteria?.sort) {
      filteredTasks = this.taskSorter.sortTasksByMultipleFields(
        filteredTasks, 
        criteria.sort.by, 
        criteria.sort.direction
      );
    }

    // Aplicar límite
    if (criteria?.limit && criteria.limit > 0) {
      filteredTasks = filteredTasks.slice(0, criteria.limit);
    }

    // Opcionalmente agrupar resultados usando TaskSorter
    if (criteria?.groupBy) {
      return this.taskSorter.groupTasks(filteredTasks, criteria.groupBy);
    }

    return filteredTasks;
  }

  /**
   * Obtiene las tareas pendientes (no completadas)
   */
  async getPendingTasks(): Promise<ITask[]> {
    return this.queryHandler.getPendingTasks();
  }

  /**
   * Obtiene las tareas completadas
   */
  async getCompletedTasks(): Promise<ITask[]> {
    return this.queryHandler.getCompletedTasks();
  }

  /**
   * Obtiene las tareas para hoy
   */
  async getTodayTasks(): Promise<ITask[]> {
    return this.queryHandler.getTodayTasks();
  }

  /**
   * Obtiene las tareas para mañana
   */
  async getTomorrowTasks(): Promise<ITask[]> {
    return this.queryHandler.getTomorrowTasks();
  }

  /**
   * Obtiene las tareas vencidas
   */
  async getOverdueTasks(): Promise<ITask[]> {
    return this.queryHandler.getOverdueTasks();
  }

  /**
   * Obtiene las tareas programadas para esta semana
   */
  async getThisWeekTasks(): Promise<ITask[]> {
    return this.queryHandler.getThisWeekTasks();
  }

  /**
   * Obtiene las tareas programadas para la próxima semana
   */
  async getNextWeekTasks(): Promise<ITask[]> {
    return this.queryHandler.getNextWeekTasks();
  }

  /**
   * Obtiene las tareas completadas recientemente
   */
  async getRecentlyCompletedTasks(days: number = 7): Promise<ITask[]> {
    return this.queryHandler.getRecentlyCompletedTasks(days);
  }

  /**
   * Obtiene las tareas con alta prioridad
   */
  async getHighPriorityTasks(): Promise<ITask[]> {
    return this.queryHandler.getHighPriorityTasks();
  }

  /**
   * Obtiene las tareas para un archivo específico
   
  async getTasksForFile(filePath: string): Promise<ITask[]> {
    // Si hay en el cache, devolver desde ahí
    if (this.taskCache.hasFileCache(filePath)) {
      return this.taskCache.getFileCache(filePath) || [];
    }

    // Si no, intentar obtener el archivo
    const file = this.app.vault.getAbstractFileByPath(filePath);

    if (file instanceof TFile) {
      const tasks = await this.taskExtractor.extractTasksFromFile(file);
      this.taskCache.setFileCache(filePath, tasks);
      return tasks;
    }
    return [];
  }*/

}