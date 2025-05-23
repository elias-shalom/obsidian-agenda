// This file exports interfaces and types used throughout the project.
import { DateTime } from 'luxon';

export interface ITask {
  id: string;
  title: string;
  text: string; // Texto de la tarea
  link: { path: string }; // Enlace al archivo de la tarea  
  lineNumber?: number; // Número de línea donde se encuentra la tarea
  status: string; //Status;
  statusIcon: string; //StatusIcon;
  statusText: string; //StatusText;
  tags: string[];
  priority: string; //Priority; // Prioridad de la tarea (⏬|⏫|🔼|🔽|🔺 o por defecto "C")
  createdDate: DateTime | null; // Fecha de creación (➕)
  startDate: DateTime | null; // Fecha de inicio (🛫)
  scheduledDate: DateTime | null; // Fecha programada (⏳)
  dueDate: DateTime | null; // Fecha de vencimiento (📅)
  doneDate: DateTime | null; // Fecha de finalización (✅)
  cancelledDate: DateTime | null; // Fecha de cancelación (❌)
  recurrence: string; //Recurrence | null; Indica si la tarea es recurrente (🔁)
  onCompletion: string; //OnCompletion;
  dependsOn: string[];
  blockLink: string;
  scheduledDateIsInferred: boolean;
  filePath: string;
  fileName: string;
  fileBasename: string;
  fileExtension: string;
  header: string; // Representa el encabezado de la tarea
  description: string; // Representa la descripción de la tarea
  tasksFields: string[]; // Representa los campos específicos de la tarea como un arreglo de strings
  taskData: Record<string, any>;
  isValid: boolean; // Indica si la tarea es válida o no
  groupLabel?: string; // Etiqueta de grupo para la tarea
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

export type SortField = 'dueDate' | 'startDate' | 'scheduledDate' | 'doneDate' | 
                       'createdDate' | 'priority' | 'status' | 'text' | 'path';

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