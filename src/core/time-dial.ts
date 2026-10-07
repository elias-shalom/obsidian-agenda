// src/core/time-dial.ts
// Dial circular para elegir minutos, extraído del Habit Editor (v1.1.10, §7.7/§18) para
// reutilizarlo en el modal de duración de tareas con un máximo y un paso distintos.
export interface TimeDialOptions {
  /** Valor máximo representable (una vuelta completa del dial equivale a este valor). */
  maxMinutes: number;
  /** Incremento al arrastrar/usar flechas/rueda del mouse (por defecto 1). */
  stepMinutes?: number;
  initialMinutes: number;
  /** Texto bajo el valor central (ej. "min"). */
  unitLabel: string;
  ariaLabel: string;
  onChange?: (minutes: number) => void;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Dial circular compartido (arrastre, flechas de teclado, rueda del mouse). Construye su propio
 * DOM en `mount(root)`, igual que `CalendarDatePicker`. */
export class TimeDial {
  private readonly maxMinutes: number;
  private readonly stepMinutes: number;
  private readonly unitLabel: string;
  private readonly ariaLabel: string;
  private readonly onChange?: (minutes: number) => void;
  private currentValue: number;

  private dial: HTMLElement | null = null;
  private arc: SVGCircleElement | null = null;
  private thumb: HTMLElement | null = null;
  private valueLabel: HTMLElement | null = null;

  constructor(options: TimeDialOptions) {
    this.maxMinutes = options.maxMinutes;
    this.stepMinutes = options.stepMinutes ?? 1;
    this.currentValue = options.initialMinutes;
    this.onChange = options.onChange;
    this.unitLabel = options.unitLabel;
    this.ariaLabel = options.ariaLabel;
  }

  getValue(): number {
    return this.currentValue;
  }

  mount(root: HTMLElement): void {
    root.addClass("oa-time-dial");
    root.setAttribute("tabindex", "0");
    root.setAttribute("role", "slider");
    root.setAttribute("aria-label", this.ariaLabel);
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", String(this.maxMinutes));
    this.dial = root;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 120");
    svg.classList.add("oa-time-dial-svg");

    const track = document.createElementNS(SVG_NS, "circle");
    track.classList.add("oa-time-dial-track");
    track.setAttribute("cx", "60");
    track.setAttribute("cy", "60");
    track.setAttribute("r", String(RADIUS));
    svg.appendChild(track);

    const arc = document.createElementNS(SVG_NS, "circle");
    arc.classList.add("oa-time-dial-progress");
    arc.setAttribute("cx", "60");
    arc.setAttribute("cy", "60");
    arc.setAttribute("r", String(RADIUS));
    arc.setCssStyles({ strokeDasharray: `${CIRCUMFERENCE}` });
    svg.appendChild(arc);
    this.arc = arc;

    root.appendChild(svg);

    this.thumb = root.createDiv({ cls: "oa-time-dial-thumb" });

    const center = root.createDiv({ cls: "oa-time-dial-center" });
    this.valueLabel = center.createSpan({ cls: "oa-time-dial-value" });
    center.createSpan({ cls: "oa-time-dial-unit", text: this.unitLabel });

    this.wireInteraction(root);
    this.applyValue(this.currentValue);
  }

  private applyValue(minutes: number): void {
    this.currentValue = Math.max(0, Math.min(this.maxMinutes, Math.round(minutes / this.stepMinutes) * this.stepMinutes));
    const percent = this.currentValue / this.maxMinutes;
    const angleDeg = percent * 360 - 90;
    const angleRad = angleDeg * (Math.PI / 180);

    this.arc?.setCssStyles({ strokeDashoffset: `${CIRCUMFERENCE * (1 - percent)}` });
    this.thumb?.setCssStyles({
      left: `${((60 + RADIUS * Math.cos(angleRad)) / 120) * 100}%`,
      top: `${((60 + RADIUS * Math.sin(angleRad)) / 120) * 100}%`,
    });
    if (this.valueLabel) this.valueLabel.textContent = String(this.currentValue);
    this.dial?.setAttribute("aria-valuenow", String(this.currentValue));
    this.onChange?.(this.currentValue);
  }

  private wireInteraction(dial: HTMLElement): void {
    const setValueFromPointer = (event: PointerEvent) => {
      const rect = dial.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      this.applyValue((angle / 360) * this.maxMinutes);
    };

    let dragging = false;
    dial.addEventListener("pointerdown", (event) => {
      dragging = true;
      dial.setPointerCapture(event.pointerId);
      setValueFromPointer(event);
    });
    dial.addEventListener("pointermove", (event) => {
      if (dragging) setValueFromPointer(event);
    });
    dial.addEventListener("pointerup", (event) => {
      dragging = false;
      dial.releasePointerCapture(event.pointerId);
    });
    dial.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" || event.key === "ArrowRight") {
        event.preventDefault();
        this.applyValue(this.currentValue + this.stepMinutes);
      } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
        event.preventDefault();
        this.applyValue(this.currentValue - this.stepMinutes);
      }
    });
    dial.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.applyValue(this.currentValue + (event.deltaY < 0 ? this.stepMinutes : -this.stepMinutes));
    }, { passive: false });
  }
}
