import { WorkspaceLeaf, Plugin } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { WeekDayData, WeekViewData, CalendarViewData } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";
import { getWorkweekDates } from '../core/non-working-days';

export const CALENDAR_WORK_WEEK_VIEW_TYPE = "calendar-workweek-view";

export class CalendarWorkWeekView extends CalendarView {

  constructor(leaf: WorkspaceLeaf, plugin: Plugin, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);

  }

  getViewType(): string {
    return CALENDAR_WORK_WEEK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("week_view_title");
  }

  /**
   * Genera los datos de la Semana laboral: la semana de lunes a domingo que contiene la fecha actual (la misma
   * que usa la Semana) sin los días marcados como no laborables (v1.1.15, NL1). Con el ajuste por defecto son
   * los cinco días de lunes a viernes de siempre; con otro, entre uno y seis.
   */
  protected generateViewData(): WeekViewData {
    // Obtener la fecha actual
    const currentDate = this.currentDate;
    
    // Calcular el lunes de la semana actual de manera explícita
    const currentWeekday = currentDate.weekday; // 1=lunes, 7=domingo
    const daysToPreviousMonday = (currentWeekday === 1) ? 0 : (currentWeekday === 7) ? 6 : currentWeekday - 1;
    const mondayOfWeek = currentDate.minus({ days: daysToPreviousMonday });

    // Los días laborables de esa semana, en orden; nunca queda vacía porque el ajuste exige un día sin marcar
    const workDates = getWorkweekDates(mondayOfWeek, this.getNonWorkingDays());

    // Obtener los nombres de los días localizados
    const localizedDayNames = this.getLocalizedDayNames();

    // Prepara los datos de los días
    const days: WeekDayData[] = workDates.map((currentDay) => {
      const dayTasks = this.getTasksForDate(currentDay, true);
      const dayIndex = (currentDay.weekday - this.getWeekStartDay() + 7) % 7;

      return {
        date: currentDay,
        isToday: currentDay.hasSame(DateTime.now(), 'day'),
        isSelected: currentDay.hasSame(this.currentDate, 'day'),
        dayOfMonth: currentDay.day,
        dayOfWeek: currentDay.weekday,
        dayName: localizedDayNames[dayIndex],
        formattedDate: `${localizedDayNames[dayIndex]} ${currentDay.day}`,
        holidays: this.getHolidays(currentDay),
        tasksForDay: dayTasks
      };
    });

    // Calcular el nombre del periodo (rango de fechas mostrado)
    const periodStart = workDates[0];
    const periodEnd = workDates[workDates.length - 1];
    const periodName = `${periodStart.toFormat('MMM d')} - ${periodEnd.toFormat('MMM d, yyyy')}`;
    
    return {
      viewType:  CalendarViewType.WorkWeek ,
      weekNumber: mondayOfWeek.weekNumber,
      days: days,
      dayNames: localizedDayNames,
      periodName: periodName,
      // Los once estilos de cuadrícula están pensados para cinco días
      gridStylesAvailable: days.length === 5
    };
  }

  protected navigateToPrevious(): void {
    this.setCurrentDate(this.currentDate.minus({ weeks: 1 }));
    this.refreshView().catch(console.error);
  }

  protected navigateToNext(): void {
    this.setCurrentDate(this.currentDate.plus({ weeks: 1 }));
    this.refreshView().catch(console.error);
  }

    /**
   * Sobrescribe el método de CalendarView para implementar event listeners específicos
   * @param container Contenedor donde se aplican los listeners
   * @param data Datos utilizados para renderizar la vista
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, data: CalendarViewData): void {
    // Primero ejecuta los event listeners comunes
    super.setupViewSpecificEventListeners(container, data);

    // El número de columnas sigue a los días laborables del ajuste (entre 1 y 6); sin estilo de cuadrícula elegido
    // manda esta variable.
    const weekDaysRowEl = container.querySelector<HTMLElement>('.oa-calendar-week-days-row');
    if (weekDaysRowEl?.dataset.dayCount) weekDaysRowEl.setCssProps({ '--oa-workweek-days': weekDaysRowEl.dataset.dayCount });
    
    // Añadir manejo del selector de estilo de cuadrícula
    const gridStyleSelector = container.querySelector('#oa-calendar-grid-style') as HTMLSelectElement;
    
    if (gridStyleSelector) {
      // Manejar cambios en el selector
      gridStyleSelector.addEventListener('change', () => {
        const selectedStyle = gridStyleSelector.value;
        const weekDaysRow = container.querySelector('.oa-calendar-week-days-row');
        
        if (weekDaysRow) {
          // Eliminar clases de estilo anteriores
          for (let i = 1; i <= 11; i++) {
            weekDaysRow.classList.remove(`style${i}`);
          }
          
          // Aplicar nuevo estilo si no es el predeterminado
          if (selectedStyle !== 'default') {
            weekDaysRow.classList.add(selectedStyle);
          }
          
          // Guardar la preferencia del usuario para la vista workweek
          this.app.saveLocalStorage('calendar-workweek-grid-style', selectedStyle);
        }
      });
      
      // Restaurar preferencia guardada al cargar la vista
      const savedStyle = this.app.loadLocalStorage('calendar-workweek-grid-style') as string | null;
      if (savedStyle && typeof savedStyle === 'string') {
        gridStyleSelector.value = savedStyle;
        
        // Disparar el evento change manualmente para aplicar el estilo
        const event = new Event('change');
        gridStyleSelector.dispatchEvent(event);
      }
    }
    
  }

  async onClose(): Promise<void> {
    await super.onClose();
  }
}
