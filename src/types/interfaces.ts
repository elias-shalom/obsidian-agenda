// This file exports interfaces and types used throughout the project.
import { DateTime } from 'luxon';
import { CalendarViewType } from './enums';

/**
 * Datos de un día específico en la vista semanal
 */
export interface WeekDayData {
  date: DateTime;
  isToday: boolean;
  dayOfMonth: number;
  dayOfWeek: number;
  dayName: string;
  formattedDate: string;
  tasksForDay: ITask[];
}

/**
 * Datos completos para la vista semanal del calendario
 */
export interface WeekViewData {
  viewType: CalendarViewType;
  weekNumber: number;
  days: WeekDayData[];
  dayNames: string[];
  periodName: string;
}

/**
 * Información del archivo donde se encuentra la tarea
 */
export interface ITaskFile {
  path: string;
  name: string;
  ext: string;
  root: string;
  meta: Record<string, unknown> | null;
}

/**
 * Información de la línea donde se encuentra la tarea
 */
export interface ITaskLine {
  number: number;
  text: string;
}

/**
 * Estado actual de la tarea
 */
export interface ITaskState {
  status: string;
  icon: string;
  text: string;
  priority: string;
  isValid: boolean;
}

/**
 * Fechas asociadas a la tarea
 */
export interface ITaskDate {
  due: DateTime | null;
  start: DateTime | null;
  scheduled: DateTime | null;
  created: DateTime | null;
  done: DateTime | null;
  cancelled: DateTime | null;
}

/**
 * Información de la sección/contenido de la tarea
 */
export interface ITaskSection {
  header: string;
  desc: string;
  tags: string[];
  fields: string[];
}

/**
 * Configuración de flow de la tarea
 */
export interface ITaskFlow {
  recur: string;
  blockLink: string;
  deps: string[];
  onCompletion: string | null;
}

/**
 * Nueva interfaz principal para una tarea optimizada
 */
export interface ITask {
  id: string;
  file: ITaskFile;
  line: ITaskLine;
  state: ITaskState;
  date: ITaskDate;
  section: ITaskSection;
  flow: ITaskFlow;
  groupLabel?: string;

    // Campos de compatibilidad temporal (deprecated)
  /** @deprecated Use file.path instead */
  //get filePath(): string;
  /** @deprecated Use file.name + '.' + file.ext instead */
  //get fileName(): string;
  /** @deprecated Use file.name instead */
  //get fileBasename(): string;
  /** @deprecated Use file.root instead */
  //get rootFolder(): string;
  /** @deprecated Use line.text instead */
  //get title(): string;
  /** @deprecated Use line.text instead */
  //get text(): string;
  /** @deprecated Use line.number instead */
  //get lineNumber(): number;
  /** @deprecated Use state.status instead */
  //get status(): string;
  /** @deprecated Use state.icon instead */
  //get statusIcon(): string;
  /** @deprecated Use state.text instead */
  //get statusText(): string;
  /** @deprecated Use section.tags instead */
  //get tags(): string[];
  /** @deprecated Use state.priority instead */
  //get priority(): string;
  /** @deprecated Use date.created instead */
  //get createdDate(): DateTime | null;
  /** @deprecated Use date.start instead */
  //get startDate(): DateTime | null;
  /** @deprecated Use date.scheduled instead */
  //get scheduledDate(): DateTime | null;
  /** @deprecated Use date.due instead */
  //get dueDate(): DateTime | null;
  /** @deprecated Use date.done instead */
  //get doneDate(): DateTime | null;
  /** @deprecated Use date.cancelled instead */
  //get cancelledDate(): DateTime | null;
  /** @deprecated Use recur instead */
  //get recurrence(): string;
  /** @deprecated Use flow.onCompletion instead */
  //get onCompletion(): string | null;
  /** @deprecated Use flow.deps instead */
  //get dependsOn(): string[];
  /** @deprecated Use flow.blockLink instead */
  //get blockLink(): string;
  /** @deprecated Use section.header instead */
  //get header(): string;
  /** @deprecated Use section.desc instead */
  //get description(): string;
  /** @deprecated Use section.fields instead */
  //get tasksFields(): string[];
  /** @deprecated Use state.isValid instead */
  //get isValid(): boolean;
  /** @deprecated Legacy compatibility object */
  //get taskData(): Record<string, any>;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TaskFilter {
  completed?: boolean;
  overdue?: boolean;
  due?: Date;
  start?: Date;
  scheduled?: Date;
  recurrence?: boolean;
  dailyNote?: boolean;
}

export interface TaskFilterCriteria {
  // Filtros de estado
  status?: string[];                   // Ej: ['TODO', 'IN_PROGRESS', 'DONE']
  isCompleted?: boolean;               // true = completada, false = no completada
  
  // Filtros de texto
  text?: {
    includes?: string[];               // Texto que debe incluir la tarea
    excludes?: string[];               // Texto que NO debe incluir la tarea
    regex?: string;                    // Expresión regular para coincidir
  };
  
  // Filtros de etiquetas
  tags?: {
    includes?: string[];               // Etiquetas que debe tener
    excludes?: string[];               // Etiquetas que NO debe tener
  };
  
  // Filtros de prioridad
  priority?: {
    is?: string[];                     // Prioridades específicas: "high", "medium", "low"
    above?: string;                    // Prioridad mayor que
    below?: string;                    // Prioridad menor que
  };
  
  // Filtros de fechas
  dueDate?: {
    before?: Date;                     // Vence antes de fecha
    on?: Date;                         // Vence en fecha exacta
    after?: Date;                      // Vence después de fecha
    exists?: boolean;                  // Si tiene o no fecha de vencimiento
  };
  startDate?: {
    before?: Date;
    on?: Date;
    after?: Date;
    exists?: boolean;
  };
  scheduledDate?: {
    before?: Date;
    on?: Date;
    after?: Date;
    exists?: boolean;
  };
  doneDate?: {
    before?: Date;
    on?: Date;
    after?: Date;
    exists?: boolean;
  };
  createdDate?: {
    before?: Date;
    on?: Date;
    after?: Date;
    exists?: boolean;
  };
  
  // Filtros relativos a fecha
  dueDateRelative?: {
    pastDays?: number;                 // Vence en los últimos X días
    futureDays?: number;               // Vence en los próximos X días
    today?: boolean;                   // Vence hoy
    tomorrow?: boolean;                // Vence mañana
    thisWeek?: boolean;                // Vence esta semana
    nextWeek?: boolean;                // Vence la próxima semana
    thisMonth?: boolean;               // Vence este mes
    nextMonth?: boolean;               // Vence el próximo mes
    overdue?: boolean;                 // Está vencida (pasada la fecha)
  };
  
  // Filtros de ubicación
  location?: {
    folder?: string;                   // Carpeta donde se encuentra la tarea
    file?: string;                     // Archivo específico
  };
  
  // Filtros avanzados
  recurrence?: {
    has?: boolean;                     // Si tiene o no recurrencia
    pattern?: string;                  // Patrón específico de recurrencia
  };
  
  dependencies?: {
    has?: boolean;                     // Si tiene o no dependencias
    blocking?: boolean;                // Si está bloqueando otras tareas
    blockedBy?: boolean;               // Si está bloqueada por otras tareas
  };
  
  // Opciones de ordenación
  sort?: {
    by: SortField[];                   // Campos por los que ordenar
    direction: ('asc' | 'desc')[];     // Dirección para cada campo
  };
  
  // Opciones de limitación
  limit?: number;                      // Número máximo de resultados
  groupBy?: GroupField;                // Agrupar por este campo
}

export type SortField = 'dueDate' | 'startDate' | 'scheduledDate' | 'doneDate' | 'createdDate' | 'priority' | 'status' | 'text' | 'path';

export type GroupField = 'status' | 'priority' | 'dueDate' | 'path' | 'tags';

export interface IFile<T> {
  file: T,
  name: string,
  path: string,
  //getLastModifiedAsync(): Promise<DateTime>,
  renameAsync(folder: string): Promise<void>
  getContentAsync(): Promise<string>,
  setContentAsync(val: string): Promise<void>,
  isInFolder(folder: string): boolean
}

export interface FolderNode {
  name: string;         // Nombre de la carpeta actual
  fullPath: string;     // Ruta completa a esta carpeta
  tasks: ITask[];       // Tareas directamente en esta carpeta
  subfolders: Record<string, FolderNode>; // Subcarpetas
}

export interface HourSlot {
  hour: number;
  formattedHour: string;
  tasks: ITask[];
}

export interface MiniCalendarDay {
  day: number;
  date: string; // Formato ISO
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasTasks?: boolean;
}