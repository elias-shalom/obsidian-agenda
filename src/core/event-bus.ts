import { EventEmitter } from 'events';

export class EventBus {
  private static instance: EventBus;
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(30); // Evitar warnings de Node.js
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  public emit(event: string, ...args: any[]): boolean {
    return this.emitter.emit(event, ...args);
  }
}

// Constantes para eventos
export const EVENTS = {
  TASKS_UPDATED: 'tasks:updated',
  TASK_ADDED: 'task:added',
  TASK_MODIFIED: 'task:modified',
  TASK_DELETED: 'task:deleted',
  FOLDERS_UPDATED: 'folders:updated'
};