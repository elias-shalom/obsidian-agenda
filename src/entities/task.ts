import { ITask } from "../types/interfaces";
import { TaskSection } from "./task-section";
import { DateTime } from 'luxon';

export class Task implements ITask {
    id: string;
    title: string;
    text: string; // Texto de la tarea
    link: { path: string }; // Enlace al archivo de la tarea  
    lineNumber?: number; // Número de línea donde se encuentra la tarea
    section?: TaskSection; // Sección de la tarea (opcional)
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
    }


}