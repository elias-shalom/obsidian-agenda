import { TFile } from "obsidian";
import { ITask } from "../types/interfaces";
import { TaskSection } from "./task-section";
import { DateTime } from 'luxon';
import { CustomStatus } from "../types/enums";

export class Task implements ITask {
  id: string;
  title: string;
  text: string; // Texto de la tarea
  link: { path: string }; // Enlace al archivo de la tarea  
  lineNumber?: number; // Número de línea donde se encuentra la tarea
  //section?: TaskSection; // Sección de la tarea (opcional)
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
  /** El blockLink es una anotación "^" después de las fechas/reglas de recurrencia.
  * Cualquier valor no vacío debe comenzar con '^'. */
  blockLink: string;
  scheduledDateIsInferred: boolean;
  filePath: string;
  fileName: string;
  fileBasename: string;
  fileExtension: string;
  header: string; // Representa el encabezado de la tarea
  description: string; // Representa la descripción de la tarea
  tasksFields: string[]; // Representa los campos específicos de la tarea como un arreglo de strings
  taskData: Record<string, any> = {};
  groupLabel?: string | undefined;
  isValid: boolean; // Indica si la tarea es válida o no

  constructor(taskData: Partial<Task>) {
    this.id = taskData.id || '';
    this.title = taskData.title || '';
    this.text = taskData.text || '';
    this.lineNumber = taskData.lineNumber || 0; 
    this.status = taskData.status || '';
    this.priority = taskData.priority || '';
    this.cancelledDate = taskData.cancelledDate || null;
    this.onCompletion = taskData.onCompletion || '';
    this.createdDate = taskData.createdDate || null;
    this.startDate = taskData.startDate || null;
    this.scheduledDate = taskData.scheduledDate || null;
    this.dueDate = taskData.dueDate || null;
    this.doneDate = taskData.doneDate || null;
    this.recurrence = taskData.recurrence || '';
    this.dependsOn = taskData.dependsOn || [];
    this.blockLink = taskData.blockLink || '';
    this.scheduledDateIsInferred = taskData.scheduledDateIsInferred || false;
    this.filePath = taskData.filePath || '';
    this.fileName = taskData.fileName || ''; // Nombre del archivo
    this.fileBasename = taskData.fileBasename || ''; // Nombre base del archivo (sin extensión)
    this.fileExtension = taskData.fileExtension || '';
    this.header = taskData.header || ''; // Representa el encabezado de la tarea
    this.description = taskData.description || ''; // Representa la descripción de la tarea
    this.tasksFields = taskData.tasksFields || []; // Representa los campos específicos de la tarea como un arreglo de strings
    this.taskData = taskData.taskData || {}; // Objeto que contiene datos adicionales de la tarea
    this.groupLabel = taskData.groupLabel || ''; // Etiqueta de grupo para la tarea
    this.isValid = taskData.isValid || false; // Indica si la tarea es válida o no
    this.tags = taskData.tags || []; // Array de tags encontrados en el texto
  }

  /**
   * Extrae el estado de la tarea desde el texto del header.
   * @param headerText El texto del encabezado que contiene el estado entre corchetes.
   * @returns El estado correspondiente del enum CustomStatus.
  */
  static extractStatusFromHeader(headerText: string): CustomStatus {
    const statusMatch = headerText.match(/\[(.)\]/);

    if (statusMatch && statusMatch[1]) {
      const statusChar = statusMatch[1];

      // Verificar si el carácter existe en el enum CustomStatus
      if (Object.values(CustomStatus).includes(statusChar as CustomStatus)) {
          return statusChar as CustomStatus;
      }
    }

    // Si no se encontró un estado válido, devolver el valor predeterminado
    return CustomStatus.Space;
  }

  /**
   * Extrae los tags (palabras que comienzan con #) del texto de una tarea.
   * @param text Texto completo de la tarea.
   * @returns Array de tags encontrados en el texto.
   */
  static extractTags(text: string): string[] {
    const tagRegex = /#[a-zA-Z0-9_\-\/]+/g;
    const tagMatches = text.match(tagRegex) || [];
    return tagMatches.map(tag => tag.trim());
  }
}