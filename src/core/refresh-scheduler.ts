export interface RefreshSchedulerOptions {
  /** Espera de calma, en ms, antes de ejecutar y entre reintentos si está ocupado. */
  delayMs: number;
  isBusy: () => boolean;
  run: () => Promise<void> | void;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/** Agrupa peticiones de refresco y espera a que no haya una interacción en curso. */
export class RefreshScheduler {
  private handle: unknown = null;
  private running = false;
  private rerun = false;
  private disposed = false;
  private readonly setTimer: (callback: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  constructor(private readonly options: RefreshSchedulerOptions) {
    this.setTimer = options.setTimer ?? ((callback, ms) => window.setTimeout(callback, ms));
    this.clearTimer = options.clearTimer ?? ((handle) => window.clearTimeout(handle as number));
  }

  request(): void {
    if (this.disposed) return;
    if (this.running) {
      this.rerun = true;
      return;
    }
    this.schedule();
  }

  cancel(): void {
    this.rerun = false;
    if (this.handle === null) return;
    this.clearTimer(this.handle);
    this.handle = null;
  }

  dispose(): void {
    this.cancel();
    this.disposed = true;
  }

  private schedule(): void {
    if (this.handle !== null) this.clearTimer(this.handle);
    this.handle = this.setTimer(() => this.fire(), this.options.delayMs);
  }

  private fire(): void {
    this.handle = null;
    if (this.disposed) return;
    if (this.options.isBusy()) {
      this.schedule();
      return;
    }

    this.running = true;
    void Promise.resolve()
      .then(() => this.options.run())
      .catch(console.error)
      .finally(() => {
        this.running = false;
        if (this.rerun && !this.disposed) {
          this.rerun = false;
          this.schedule();
        }
      });
  }
}
