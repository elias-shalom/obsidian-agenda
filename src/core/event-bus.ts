import mitt from 'mitt';
import { Task } from '../entities/task';

export type Events = {
  'tasks:updated': Task[];
  'task:added': Task;
  'task:modified': Task;
  'task:deleted': string;
  'folders:updated': string[];
};

export class EventBus {
  private static instance: EventBus;
  private emitter = mitt<Events>();

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): void {
    this.emitter.on(event, listener);
  }

  public off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): void {
    this.emitter.off(event, listener);
  }

  public emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.emitter.emit(event, payload);
  }
}

export const EVENTS = {
  TASKS_UPDATED: 'tasks:updated',
  TASK_ADDED: 'task:added',
  TASK_MODIFIED: 'task:modified',
  TASK_DELETED: 'task:deleted',
  FOLDERS_UPDATED: 'folders:updated'
};