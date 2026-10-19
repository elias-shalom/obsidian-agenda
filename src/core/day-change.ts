import { DateTime } from 'luxon';
import { EventBus, EVENTS } from './event-bus';

/** Milisegundos hasta la próxima medianoche local (con un margen para no despertar justo antes). */
export function msUntilNextMidnight(now: DateTime): number {
  return now.plus({ days: 1 }).startOf('day').diff(now).as('milliseconds') + 500;
}

/** Emite `day:changed` a la medianoche local y al volver a la ventana si el día cambió mientras tanto. */
export class DayChangeWatcher {
  private handle: number | null = null;
  private lastDay = DateTime.now().toISODate();

  start(): void {
    this.stop();
    this.lastDay = DateTime.now().toISODate();
    document.addEventListener('visibilitychange', this.check);
    this.schedule();
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.check);
    if (this.handle !== null) window.clearTimeout(this.handle);
    this.handle = null;
  }

  private schedule(): void {
    this.handle = window.setTimeout(() => {
      this.check();
      this.schedule();
    }, msUntilNextMidnight(DateTime.now()));
  }

  private check = (): void => {
    const today = DateTime.now().toISODate();
    if (today === this.lastDay) return;
    this.lastDay = today;
    EventBus.getInstance().emit(EVENTS.DAY_CHANGED, undefined);
  };
}
