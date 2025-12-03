import { ITask } from "../types/interfaces";
import { EventBus, EVENTS } from "./event-bus";

/**
 * Clase responsable de la gestión del caché de tareas
 * Maneja tanto el caché por archivo como el caché global
 */
export class TaskCache {
  private tasksCache: Map<string, ITask[]> = new Map(); // Cache por archivo
  private allTasksCache: ITask[] | null = null; // Cache global de todas las tareas
  private lastRefreshTime: number = 0;
  private readonly CACHE_TTL = 300000; // 5 minutos (ajustable)
  private eventBus: EventBus;

  constructor() {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Verifica si el caché global es válido
   */
  public isGlobalCacheValid(): boolean {
    const now = Date.now();
    return this.allTasksCache !== null && (now - this.lastRefreshTime < this.CACHE_TTL);
  }

  /**
   * Obtiene las tareas del caché global
   */
  public getGlobalCache(): ITask[] | null {
    return this.allTasksCache;
  }

  /**
   * Actualiza el caché global
   */
  public setGlobalCache(tasks: ITask[]): void {
    this.allTasksCache = tasks;
    this.lastRefreshTime = Date.now();
  }

  /**
   * Verifica si existe caché para un archivo específico
   */
  public hasFileCache(filePath: string): boolean {
    return this.tasksCache.has(filePath);
  }

  /**
   * Obtiene las tareas del caché de un archivo específico
   */
  public getFileCache(filePath: string): ITask[] | undefined {
    return this.tasksCache.get(filePath);
  }

  /**
   * Actualiza el caché de un archivo específico
   */
  public setFileCache(filePath: string, tasks: ITask[]): void {
    this.tasksCache.set(filePath, tasks);
  }

  /**
   * Invalida el cache de un archivo específico
   */
  public invalidateFileCache(filePath: string): void {
    this.tasksCache.delete(filePath);
    this.allTasksCache = null; // Invalidar cache global
    this.eventBus.emit(EVENTS.TASKS_UPDATED, filePath);
  }

  /**
   * Invalida todo el cache
   */
  public invalidateAllCache(): void {
    this.tasksCache.clear();
    this.allTasksCache = null;
    this.lastRefreshTime = 0;
    this.eventBus.emit(EVENTS.TASKS_UPDATED);
  }

  /**
   * Obtiene estadísticas del caché
   */
  public getCacheStats(): {
    filesCached: number;
    globalCacheSize: number;
    lastRefreshTime: number;
    isGlobalCacheValid: boolean;
  } {
    return {
      filesCached: this.tasksCache.size,
      globalCacheSize: this.allTasksCache ? this.allTasksCache.length : 0,
      lastRefreshTime: this.lastRefreshTime,
      isGlobalCacheValid: this.isGlobalCacheValid()
    };
  }

  /**
   * Limpia todos los recursos del caché
   */
  public cleanup(): void {
    this.invalidateAllCache();
  }
}