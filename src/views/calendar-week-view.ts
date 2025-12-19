import { WorkspaceLeaf } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";

export const CALENDAR_WEEK_VIEW_TYPE = "calendar-week-view";

export class CalendarWeekView extends CalendarView {

  constructor(leaf: WorkspaceLeaf, plugin: any, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);

  }

  getViewType(): string {
    return CALENDAR_WEEK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("week_view_title");
  }

  getIcon(): string {
    return 'calendar-check';
  }

  /**
   * Genera datos para la vista semanal del calendario
   */
  protected generateViewData(): any {
    // Obtener la fecha de inicio de la semana actual
    const startOfWeek = this.currentDate.startOf('week');
    
    // Siempre generamos los 7 días de la semana
    const daysToGenerate = 7;
    
    // Obtener los nombres de los días localizados
    const localizedDayNames = this.getLocalizedDayNames();
    
    // Define a type for day data
    type WeekDayData = {
      date: DateTime;
      isToday: boolean;
      dayOfMonth: number;
      dayOfWeek: number;
      dayName: string;
      formattedDate: string;
      tasksForDay: ITask[];
    };
    
    // Prepara los datos de los días
    const days: WeekDayData[] = [];
    let currentDay = startOfWeek;
    
    for (let i = 0; i < daysToGenerate; i++) {
      const dayTasks = this.getTasksForDate(currentDay);
      const dayIndex = currentDay.weekday % 7; // Asegura que el índice sea 0-6
      
      days.push({
        date: currentDay,
        isToday: currentDay.hasSame(DateTime.now(), 'day'),
        dayOfMonth: currentDay.day,
        dayOfWeek: currentDay.weekday,
        // Usar el nombre localizado del día en lugar de toFormat()
        dayName: localizedDayNames[dayIndex],
        formattedDate: `${localizedDayNames[dayIndex]} ${currentDay.day}`,
        tasksForDay: dayTasks
      });
      
      currentDay = currentDay.plus({ days: 1 });
    }
    
    // Calcular el nombre del periodo (rango de fechas)
    const weekEnd = startOfWeek.plus({ days: daysToGenerate - 1 });
    const periodName = `${startOfWeek.toFormat('MMM d')} - ${weekEnd.toFormat('MMM d, yyyy')}`;
    
    return {
      viewType: CalendarViewType.Week,
      weekNumber: startOfWeek.weekNumber,
      days: days,
      dayNames: localizedDayNames,
      periodName: periodName
    };
  }

  protected navigateToPrevious(): void {
    this.currentDate = this.currentDate.minus({ weeks: 1 });
    this.refreshView();
  }

  protected navigateToNext(): void {
    this.currentDate = this.currentDate.plus({ weeks: 1 });
    this.refreshView();
  }

  /**
   * Sobrescribe el método de CalendarView para implementar event listeners específicos
   * @param container Contenedor donde se aplican los listeners
   * @param data Datos utilizados para renderizar la vista
   */
  protected setupViewSpecificEventListeners(container: HTMLElement, data: any): void {
    // Primero ejecuta los event listeners comunes
    super.setupViewSpecificEventListeners(container, data);
    
    // Añadir manejo del selector de estilo de cuadrícula
    const gridStyleSelector = container.querySelector('#calendar-grid-style') as HTMLSelectElement;
    
    if (gridStyleSelector) {
      // Manejar cambios en el selector
      gridStyleSelector.addEventListener('change', () => {
        const selectedStyle = gridStyleSelector.value;
        const weekDaysRow = container.querySelector('.calendar-week-days-row');
        
        if (weekDaysRow) {
          // Eliminar clases de estilo anteriores
          for (let i = 1; i <= 11; i++) {
            weekDaysRow.classList.remove(`style${i}`);
          }
          
          // Aplicar nuevo estilo si no es el predeterminado
          if (selectedStyle !== 'default') {
            weekDaysRow.classList.add(selectedStyle);
          }
          
          // Guardar la preferencia del usuario
          this.app.saveLocalStorage('calendar-grid-style', selectedStyle);
        }
      });
      
      // Restaurar preferencia guardada al cargar la vista
      const savedStyle = this.app.loadLocalStorage('calendar-grid-style');
      if (savedStyle) {
        gridStyleSelector.value = savedStyle;
        
        // Disparar el evento change manualmente para aplicar el estilo
        const event = new Event('change');
        gridStyleSelector.dispatchEvent(event);
      }
    }
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}