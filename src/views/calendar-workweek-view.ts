import { WorkspaceLeaf } from "obsidian";
import { CalendarView } from "./calendar-view";
import { TaskManager } from "../core/task-manager";
import { ITask } from '../types/interfaces';
import { I18n } from '../core/i18n';
import { DateTime } from 'luxon';
import { CalendarViewType } from "../types/enums";

export const CALENDAR_WORK_WEEK_VIEW_TYPE = "calendar-workweek-view";

export class CalendarWorkWeekView extends CalendarView {

  constructor(leaf: WorkspaceLeaf, plugin: any, i18n: I18n, taskManager: TaskManager) {
    super(leaf, plugin, i18n, taskManager);

  }

  getViewType(): string {
    return CALENDAR_WORK_WEEK_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.i18n.t("week_view_title");
  }

  getIcon(): string {
    return 'calendar-check';
  }

 /**
   * Genera datos para la vista mensual del calendario
   */
  protected generateViewData(): any {
    // Obtener la fecha actual
    const currentDate = this.currentDate;
    
    // Calcular el lunes de la semana actual de manera explícita
    const currentWeekday = currentDate.weekday; // 1=lunes, 7=domingo
    const daysToPreviousMonday = (currentWeekday === 1) ? 0 : (currentWeekday === 7) ? 6 : currentWeekday - 1;
    const mondayOfWeek = currentDate.minus({ days: daysToPreviousMonday });
    
    // Usar este lunes como fecha de inicio
    const weekStartDate = mondayOfWeek;
       
    const daysToGenerate =  5;

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
    let currentDay = weekStartDate;
    
    for (let i = 0; i < daysToGenerate; i++) {
      const dayTasks = this.getTasksForDate(currentDay);
      const dayIndex = currentDay.weekday % 7;
      
      days.push({
        date: currentDay,
        isToday: currentDay.hasSame(DateTime.now(), 'day'),
        dayOfMonth: currentDay.day,
        dayOfWeek: currentDay.weekday,
        dayName: localizedDayNames[dayIndex],
        formattedDate: `${localizedDayNames[dayIndex]} ${currentDay.day}`,
        tasksForDay: dayTasks
      });
      
      currentDay = currentDay.plus({ days: 1 });
    }
    
    // Calcular el nombre del periodo (rango de fechas)
    const weekEnd = weekStartDate.plus({ days: daysToGenerate - 1 });
    const periodName = `${weekStartDate.toFormat('MMM d')} - ${weekEnd.toFormat('MMM d, yyyy')}`;
    
    return {
      viewType:  CalendarViewType.WorkWeek ,
      weekNumber: weekStartDate.weekNumber,
      days: days,
      dayNames: localizedDayNames, // Solo lunes a viernes
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
          
          // Guardar la preferencia del usuario para la vista workweek
          this.app.saveLocalStorage('calendar-workweek-grid-style', selectedStyle);
        }
      });
      
      // Restaurar preferencia guardada al cargar la vista
      const savedStyle = this.app.loadLocalStorage('calendar-workweek-grid-style');
      if (savedStyle) {
        gridStyleSelector.value = savedStyle;
        
        // Disparar el evento change manualmente para aplicar el estilo
        const event = new Event('change');
        gridStyleSelector.dispatchEvent(event);
      }
    }
    
    // Agregar listeners para interacción con tareas
    this.setupTaskInteractionListeners(container);
  }
  
  /**
   * Configura los listeners para interacción con tareas
   * @param container Contenedor donde se aplican los listeners
   */
  private setupTaskInteractionListeners(container: HTMLElement): void {
    const taskElements = container.querySelectorAll('.calendar-task');
    
    taskElements.forEach(taskEl => {
      taskEl.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        
        // Obtener información de la tarea
        const filePath = target.dataset.filePath;
        const lineNumber = parseInt(target.dataset.lineNumber || '0', 10);
        
        if (filePath) {
          // Abrir el archivo en la línea donde está la tarea
          this.plugin.app.workspace.openLinkText(filePath, '', false, { line: lineNumber });
        }
      });
    });
  }

  async onClose(): Promise<void> {
    // Limpia recursos si es necesario
  }
}