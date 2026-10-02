import { DateTime } from 'luxon';
import { getLanguage } from 'obsidian';
import { I18n } from './i18n';

/** Niveles de navegación del selector de fecha compartido (v1.1.9, §9.3 Arquitectura técnica). */
type PickerLevel = 'days' | 'years' | 'months';

interface PickerDay {
  date: DateTime;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasTasks: boolean;
}

export interface CalendarDatePickerOptions {
  i18n: I18n;
  /** Fecha marcada como seleccionada al montar (la referencia de calendario vigente). */
  selectedDate: DateTime;
  getWeekStartDay: () => number;
  getLocalizedDayNames: () => string[];
  /** Mismo criterio que `CalendarView.getTasksForDate()` (respeta los settings de calendario). */
  hasTasks: (date: DateTime) => boolean;
  onSelect: (date: DateTime) => void;
}

const DECADE_SIZE = 10;
const DAYS_GRID_CELLS = 42; // 6 filas x 7 días, fijo para que el panel no cambie de alto entre meses.

/**
 * Selector de fecha compartido entre las cinco vistas de calendario (v1.1.9, §9.3 Arquitectura técnica
 * / §4.6.4 Especificación de vistas). Mismo componente en modo `popover` (Mes/Semana/Semana laboral/Año,
 * montado al abrir) y `docked` (Día, montado una vez por render, siempre visible). Construye su DOM con
 * `createEl`/`createDiv`, sin plantilla Handlebars, y mantiene un estado de exploración propio que no
 * toca la fecha seleccionada hasta que se elige un día.
 */
export class CalendarDatePicker {
  private level: PickerLevel = 'days';
  private readonly selectedDate: DateTime;
  private viewMonth: DateTime;
  private viewYear: number;
  private viewDecadeStart: number;
  private root: HTMLElement | null = null;

  constructor(private readonly options: CalendarDatePickerOptions) {
    this.selectedDate = options.selectedDate;
    this.viewMonth = options.selectedDate.startOf('month');
    this.viewYear = options.selectedDate.year;
    this.viewDecadeStart = Math.floor(this.viewYear / DECADE_SIZE) * DECADE_SIZE;
  }

  mount(root: HTMLElement): void {
    this.root = root;
    root.addClass('oa-date-picker');
    this.renderLevel();
  }

  /** Mueve el foco a la celda seleccionada (apertura de popover, §4.6.4: "foco inicial va a la fecha seleccionada"). */
  focusSelected(): void {
    this.root?.querySelector<HTMLElement>('.oa-date-picker-cell.oa-date-picker-selected')?.focus();
  }

  private renderLevel(): void {
    if (!this.root) return;
    this.root.empty();
    if (this.level === 'days') this.renderDaysLevel(this.root);
    else if (this.level === 'years') this.renderYearsLevel(this.root);
    else this.renderMonthsLevel(this.root);
  }

  private renderHeader(
    container: HTMLElement,
    label: string,
    onHeaderClick: (() => void) | null,
    onPrev: () => void,
    onNext: () => void,
    prevLabel: string,
    nextLabel: string,
  ): void {
    const header = container.createDiv({ cls: 'oa-date-picker-header' });

    const prevBtn = header.createEl('button', {
      cls: 'oa-date-picker-nav',
      attr: { type: 'button', 'aria-label': prevLabel, title: prevLabel },
    });
    prevBtn.createSpan({ cls: 'icon', text: '◀' });
    prevBtn.addEventListener('click', onPrev);

    if (onHeaderClick) {
      const titleBtn = header.createEl('button', { cls: 'oa-date-picker-title', text: label, attr: { type: 'button' } });
      titleBtn.addEventListener('click', onHeaderClick);
    } else {
      header.createDiv({ cls: 'oa-date-picker-title oa-date-picker-title-static', text: label });
    }

    const nextBtn = header.createEl('button', {
      cls: 'oa-date-picker-nav',
      attr: { type: 'button', 'aria-label': nextLabel, title: nextLabel },
    });
    nextBtn.createSpan({ cls: 'icon', text: '▶' });
    nextBtn.addEventListener('click', onNext);
  }

  private renderDaysLevel(container: HTMLElement): void {
    const { i18n, getWeekStartDay, getLocalizedDayNames, hasTasks } = this.options;
    const locale = getLanguage() || 'en';
    const monthLabel = this.capitalize(this.viewMonth.setLocale(locale).toFormat('MMMM yyyy'));

    this.renderHeader(
      container,
      monthLabel,
      () => {
        this.viewYear = this.viewMonth.year;
        this.viewDecadeStart = Math.floor(this.viewYear / DECADE_SIZE) * DECADE_SIZE;
        this.level = 'years';
        this.renderLevel();
      },
      () => { this.viewMonth = this.viewMonth.minus({ months: 1 }); this.renderLevel(); },
      () => { this.viewMonth = this.viewMonth.plus({ months: 1 }); this.renderLevel(); },
      i18n.t('previous_month'),
      i18n.t('next_month'),
    );

    const weekdaysRow = container.createDiv({ cls: 'oa-date-picker-weekdays' });
    getLocalizedDayNames().forEach(name => weekdaysRow.createDiv({ cls: 'oa-date-picker-weekday', text: name }));

    const grid = container.createDiv({ cls: 'oa-date-picker-grid oa-date-picker-grid-days' });
    this.buildDaysGrid(this.viewMonth, getWeekStartDay(), hasTasks).forEach(day => {
      const classes = ['oa-date-picker-cell'];
      if (!day.isCurrentMonth) classes.push('oa-other-month');
      if (day.isToday) classes.push('oa-date-picker-today');
      if (day.isSelected) classes.push('oa-date-picker-selected');
      if (day.hasTasks) classes.push('oa-has-tasks');

      const cell = grid.createEl('button', {
        cls: classes.join(' '),
        text: String(day.date.day),
        attr: { type: 'button' },
      });
      cell.addEventListener('click', () => this.options.onSelect(day.date));
    });
  }

  private renderYearsLevel(container: HTMLElement): void {
    const { i18n } = this.options;
    this.renderHeader(
      container,
      `${this.viewDecadeStart} – ${this.viewDecadeStart + DECADE_SIZE - 1}`,
      null,
      () => { this.viewDecadeStart -= DECADE_SIZE; this.renderLevel(); },
      () => { this.viewDecadeStart += DECADE_SIZE; this.renderLevel(); },
      i18n.t('previous_decade'),
      i18n.t('next_decade'),
    );

    const grid = container.createDiv({ cls: 'oa-date-picker-grid oa-date-picker-grid-years' });
    // Un año antes y uno después de la década, atenuados, para ubicar el límite visualmente.
    for (let offset = -1; offset <= DECADE_SIZE; offset++) {
      const year = this.viewDecadeStart + offset;
      const inDecade = offset >= 0 && offset < DECADE_SIZE;
      const classes = ['oa-date-picker-cell'];
      if (!inDecade) classes.push('oa-other-month');
      if (year === this.selectedDate.year) classes.push('oa-date-picker-selected');

      const cell = grid.createEl('button', { cls: classes.join(' '), text: String(year), attr: { type: 'button' } });
      cell.addEventListener('click', () => {
        this.viewYear = year;
        this.level = 'months';
        this.renderLevel();
      });
    }
  }

  private renderMonthsLevel(container: HTMLElement): void {
    const { i18n } = this.options;
    const locale = getLanguage() || 'en';

    this.renderHeader(
      container,
      String(this.viewYear),
      () => {
        this.viewDecadeStart = Math.floor(this.viewYear / DECADE_SIZE) * DECADE_SIZE;
        this.level = 'years';
        this.renderLevel();
      },
      () => { this.viewYear -= 1; this.renderLevel(); },
      () => { this.viewYear += 1; this.renderLevel(); },
      i18n.t('previous_year'),
      i18n.t('next_year'),
    );

    const grid = container.createDiv({ cls: 'oa-date-picker-grid oa-date-picker-grid-months' });
    for (let month = 1; month <= 12; month++) {
      const monthDate = DateTime.fromObject({ year: this.viewYear, month });
      const isSelected = this.selectedDate.year === this.viewYear && this.selectedDate.month === month;
      const classes = ['oa-date-picker-cell'];
      if (isSelected) classes.push('oa-date-picker-selected');

      const cell = grid.createEl('button', {
        cls: classes.join(' '),
        text: this.capitalize(monthDate.setLocale(locale).toFormat('MMM')),
        attr: { type: 'button' },
      });
      cell.addEventListener('click', () => {
        this.viewMonth = monthDate.startOf('month');
        this.level = 'days';
        this.renderLevel();
      });
    }
  }

  private buildDaysGrid(viewMonth: DateTime, weekStartDay: number, hasTasks: (date: DateTime) => boolean): PickerDay[] {
    const firstOfMonth = viewMonth.startOf('month');
    const diff = (firstOfMonth.weekday - weekStartDay + 7) % 7;
    const gridStart = firstOfMonth.minus({ days: diff });
    const today = DateTime.now();

    const days: PickerDay[] = [];
    for (let i = 0; i < DAYS_GRID_CELLS; i++) {
      const date = gridStart.plus({ days: i });
      days.push({
        date,
        isCurrentMonth: date.month === viewMonth.month,
        isToday: date.hasSame(today, 'day'),
        isSelected: date.hasSame(this.selectedDate, 'day'),
        hasTasks: hasTasks(date),
      });
    }
    return days;
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
