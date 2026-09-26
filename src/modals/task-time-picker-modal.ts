// src/modals/task-time-picker-modal.ts
// Wheel picker estilo iOS para elegir la hora de `scheduled` (v1.1.4). Reemplaza al
// widget de hora de flatpickr, que quedó demasiado simple para esta interacción.
// Formato 24h (dos columnas: hora/minuto, sin AM/PM) — ver ADR-T3 en docs/agenda-tasks.
import { App, Modal } from "obsidian";
import { I18n } from "../core/i18n";

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const COLUMN_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING = (COLUMN_HEIGHT - ITEM_HEIGHT) / 2;

interface WheelColumn {
  scrollTo: (value: number) => void;
}

export class TaskTimePickerModal extends Modal {
  private hour: number;
  private minute: number;

  constructor(
    app: App,
    private i18n: I18n,
    initialTime: string | null,
    private onSubmit: (time: string) => void
  ) {
    super(app);
    const [h, m] = (initialTime ?? "12:00").split(":").map(Number);
    this.hour = Number.isFinite(h) ? h : 12;
    this.minute = Number.isFinite(m) ? m : 0;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("oa-time-picker-modal");

    const header = contentEl.createDiv({ cls: "oa-time-picker__header" });
    header.createSpan({ cls: "oa-time-picker__title", text: this.i18n.t("task_field_menu_set_scheduled_time") });
    const valuePill = header.createSpan({ cls: "oa-time-picker__value" });

    const updatePill = () => {
      valuePill.setText(`${String(this.hour).padStart(2, "0")}:${String(this.minute).padStart(2, "0")}`);
    };
    updatePill();

    const wheelsEl = contentEl.createDiv({ cls: "oa-time-picker__wheels" });
    wheelsEl.createDiv({ cls: "oa-time-picker__highlight" });

    const hourColumn = this.createWheelColumn(wheelsEl, 24, (value) => {
      this.hour = value;
      updatePill();
    });
    const minuteColumn = this.createWheelColumn(wheelsEl, 60, (value) => {
      this.minute = value;
      updatePill();
    });

    const actions = contentEl.createDiv({ cls: "oa-time-picker__actions" });
    const cancelBtn = actions.createEl("button", { type: "button", text: this.i18n.t("cancel"), cls: "oa-btn oa-btn--secondary" });
    const saveBtn = actions.createEl("button", { type: "button", text: this.i18n.t("save"), cls: "oa-btn oa-btn--primary" });

    cancelBtn.addEventListener("click", () => this.close());
    saveBtn.addEventListener("click", () => {
      this.onSubmit(`${String(this.hour).padStart(2, "0")}:${String(this.minute).padStart(2, "0")}`);
      this.close();
    });

    // Centrar el scroll inicial una vez que el modal ya tiene layout (alto real de las columnas)
    window.setTimeout(() => {
      hourColumn.scrollTo(this.hour);
      minuteColumn.scrollTo(this.minute);
    }, 0);
  }

  onClose(): void {
    this.contentEl.empty();
  }

  /** Crea una columna de rueda (00..count-1) con desvanecido por distancia al centro y snap al soltar. */
  private createWheelColumn(parent: HTMLElement, count: number, onSettle: (value: number) => void): WheelColumn {
    const column = parent.createDiv({ cls: "oa-time-picker__column" });
    const track = column.createDiv({ cls: "oa-time-picker__track" });
    track.setCssStyles({ paddingTop: `${PADDING}px`, paddingBottom: `${PADDING}px` });

    const items: HTMLElement[] = [];
    for (let value = 0; value < count; value += 1) {
      const item = track.createDiv({ cls: "oa-time-picker__item", text: String(value).padStart(2, "0") });
      items.push(item);
      item.addEventListener("click", () => column.scrollTo({ top: value * ITEM_HEIGHT, behavior: "smooth" }));
    }

    const applyFade = () => {
      const centerIndex = Math.round(column.scrollTop / ITEM_HEIGHT);
      items.forEach((item, index) => {
        const distance = Math.abs(index - centerIndex);
        const opacity = Math.max(0.2, 1 - distance * 0.35);
        const blur = Math.min(2, distance * 0.6);
        item.setCssStyles({ opacity: String(opacity), filter: distance === 0 ? "none" : `blur(${blur}px)` });
        item.toggleClass("oa-time-picker__item--selected", distance === 0);
      });
    };

    // Coalesca el desvanecido a un máximo de una vez por frame (evita el "trabado" al hacer scroll rápido)
    let fadeScheduled = false;
    const scheduleFade = () => {
      if (fadeScheduled) return;
      fadeScheduled = true;
      window.requestAnimationFrame(() => {
        fadeScheduled = false;
        applyFade();
      });
    };

    const currentIndex = () => Math.min(count - 1, Math.max(0, Math.round(column.scrollTop / ITEM_HEIGHT)));

    const snapToNearest = () => {
      const index = currentIndex();
      column.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" });
      onSettle(index);
    };

    let settleTimeout: number | undefined;
    column.addEventListener("scroll", () => {
      scheduleFade();
      window.clearTimeout(settleTimeout);
      settleTimeout = window.setTimeout(snapToNearest, 120);
    });

    // Rueda del mouse: mueve exactamente un ítem por "click" de la rueda, con un breve
    // enfriamiento para que ráfagas de eventos de un mismo notch no salten varios números.
    let wheelCooldown = false;
    column.addEventListener("wheel", (event) => {
      event.preventDefault();
      if (wheelCooldown) return;
      wheelCooldown = true;
      const direction = event.deltaY > 0 ? 1 : -1;
      const next = Math.min(count - 1, Math.max(0, currentIndex() + direction));
      column.scrollTo({ top: next * ITEM_HEIGHT, behavior: "smooth" });
      window.setTimeout(() => { wheelCooldown = false; }, 90);
    }, { passive: false });

    // Arrastre con el mouse (no hay gesto táctil de scroll en desktop sin esto)
    let dragging = false;
    let dragStartY = 0;
    let dragStartScrollTop = 0;
    column.addEventListener("pointerdown", (event) => {
      dragging = true;
      dragStartY = event.clientY;
      dragStartScrollTop = column.scrollTop;
      column.setPointerCapture(event.pointerId);
      column.addClass("oa-time-picker__column--dragging");
    });
    column.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      column.scrollTop = dragStartScrollTop + (dragStartY - event.clientY);
    });
    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      column.releasePointerCapture(event.pointerId);
      column.removeClass("oa-time-picker__column--dragging");
      snapToNearest();
    };
    column.addEventListener("pointerup", endDrag);
    column.addEventListener("pointercancel", endDrag);

    const scrollTo = (value: number) => {
      column.scrollTo({ top: value * ITEM_HEIGHT });
      applyFade();
    };

    return { scrollTo };
  }
}
