// src/core/task-filter-popover.ts
// Popover con casillas de la barra de filtros (v1.1.14, Fase M2; ver docs/agenda-tasks/Arquitectura
// técnica.md §28.2). A diferencia del `Menu` de Obsidian, no se cierra al marcar: se cierra con un clic
// fuera o con Esc. Mismo patrón que el selector de fecha del calendario (`openDatePickerPopover`).

export interface FilterPopoverOption {
  value: string;
  label: string;
  checked: boolean;
  /** Se dibuja atenuada pero se puede marcar igual (hábitos neutrales de un día de vacaciones, v1.1.15). */
  muted?: boolean;
  /** Color del margen izquierdo de la fila; los hábitos usan el de su área. */
  color?: string;
}

export interface FilterPopoverSection {
  title?: string;
  options: FilterPopoverOption[];
}

export interface FilterPopoverConfig {
  /** Dónde abrir: bajo el botón o el chip pulsado, medido una vez porque el chip se redibuja al marcar. */
  anchor: { x: number; y: number };
  ariaLabel: string;
  /** Se vuelve a pedir tras cada marca: las secciones pueden cambiar (el área añade y quita sub-áreas). */
  getSections: () => FilterPopoverSection[];
  onToggle: (value: string) => void;
  /**
   * Si se pasa, cada fila lleva al final un botón (con este texto como tooltip y `aria-label`) que llama a
   * `onOpen` con su valor sin marcar la casilla: el popover de hábitos del calendario abre así la nota del hábito.
   */
  openOption?: { label: string; onOpen: (value: string) => void };
}

const MARGIN = 8;

/** Solo hay uno abierto: abrir otro cierra el anterior. */
let closeActive: (() => void) | null = null;

export function closeFilterPopover(): void {
  closeActive?.();
}

export function openFilterPopover(config: FilterPopoverConfig): void {
  closeFilterPopover();

  const panel = document.body.createDiv({ cls: 'oa-filter-popover' });
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', config.ariaLabel);

  const position = (): void => {
    const rect = panel.getBoundingClientRect();
    const left = Math.max(MARGIN, Math.min(config.anchor.x, window.innerWidth - rect.width - MARGIN));
    const top = Math.max(MARGIN, Math.min(config.anchor.y + 4, window.innerHeight - rect.height - MARGIN));
    panel.setCssStyles({ left: `${left}px`, top: `${top}px` });
  };

  /** Dibuja las casillas; `focusValue` devuelve el foco a la que se acaba de marcar, porque dibujar la sustituye. */
  const render = (focusValue?: string): void => {
    const scrollTop = panel.scrollTop;
    panel.empty();

    for (const section of config.getSections()) {
      if (section.options.length === 0) continue;
      if (section.title) panel.createDiv({ cls: 'oa-filter-popover__title', text: section.title });

      for (const option of section.options) {
        const row = panel.createEl('label', { cls: `oa-filter-popover__option${option.muted ? ' oa-filter-popover__option--muted' : ''}` });
        if (option.color) row.setCssProps({ '--oa-area-color': option.color });
        const input = row.createEl('input', { type: 'checkbox', attr: { 'data-value': option.value } });
        input.checked = option.checked;
        row.createSpan({ cls: 'oa-filter-popover__label', text: option.label });

        const { openOption } = config;
        if (openOption) {
          const open = row.createEl('button', {
            cls: 'oa-filter-popover__open',
            text: '↗',
            attr: { type: 'button', 'aria-label': openOption.label, title: openOption.label },
          });
          open.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openOption.onOpen(option.value);
          });
        }

        input.addEventListener('change', () => {
          config.onToggle(option.value);
          render(option.value);
        });
      }
    }

    position();
    panel.scrollTop = scrollTop;

    const target = [...panel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
      .find(input => input.dataset.value === focusValue) ?? panel.querySelector<HTMLInputElement>('input[type="checkbox"]');
    target?.focus({ preventScroll: true });
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };
  const onPointerDown = (event: MouseEvent): void => {
    if (event.target instanceof Node && panel.contains(event.target)) return;
    close();
  };
  const onResize = (): void => position();

  const close = (): void => {
    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('mousedown', onPointerDown, true);
    window.removeEventListener('resize', onResize);
    panel.remove();
    if (closeActive === close) closeActive = null;
  };

  // Sin opciones no hay nada que mostrar
  if (!config.getSections().some(section => section.options.length > 0)) {
    panel.remove();
    return;
  }

  closeActive = close;
  render();
  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('mousedown', onPointerDown, true);
  window.addEventListener('resize', onResize);
}
