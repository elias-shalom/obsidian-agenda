// This file exports interfaces and types used throughout the project.
import { TaskSection } from "../entities/task-section";
import { DateTime } from 'luxon';

export interface ITask {
  id: string;
  title: string;
  text: string; // Texto de la tarea
  link: { path: string }; // Enlace al archivo de la tarea  
  lineNumber?: number; // Número de línea donde se encuentra la tarea
  status: string; //Status;
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