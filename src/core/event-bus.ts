import mitt from 'mitt';
import { Task } from '../entities/task';

export type Events = {
  'tasks:updated': Task[];
  'task:added': Task;
  'task:modified': Task;
  'task:deleted': string;
  'folders:updated': string[];
  'tasks:changed': { signature: string };
  'habits:updated': undefined;
  'day:changed': undefined;
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

  public listenerCount(event: keyof Events): number {
    return this.emitter.all.get(event)?.length ?? 0;
  }
}

export const EVENTS = {
  TASKS_UPDATED: 'tasks:updated' as const,
  TASK_ADDED: 'task:added' as const,
  TASK_MODIFIED: 'task:modified' as const,
  TASK_DELETED: 'task:deleted' as const,
  FOLDERS_UPDATED: 'folders:updated' as const,
  TASKS_CHANGED: 'tasks:changed' as const,
  HABITS_UPDATED: 'habits:updated' as const,
  DAY_CHANGED: 'day:changed' as const,
};