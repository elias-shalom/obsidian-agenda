import mitt from 'mitt';

export type Events = {
  [key: string]: any;
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

  public on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  public emit(event: string, payload?: any): void {
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