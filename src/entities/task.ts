import { ITask } from "../types/interfaces";
import { TaskSection } from "./task-section";

export class Task implements ITask {
    id: string;
    title: string;
    //isCompleted: boolean;
    //dueDate?: Date;
    //tags?: string[];
    text: string; // Texto de la tarea
    //path: string; // Ruta del archivo donde se encuentra la tarea
    //dailyNote?: string; // Nota diaria asociada a la tarea
    //due?: string; // Fecha de vencimiento (📅)
    //start?: string; // Fecha de inicio (🛫)
    //scheduled?: string; // Fecha programada (⏳)
    //completion?: string; // Fecha de finalización (✅)
    //recurrence?: boolean; // Indica si la tarea es recurrente (🔁)
    //priority: string; // Prioridad de la tarea (⏫, 🔼, 🔽, o por defecto "C")
    //checked: boolean; // Indica si la tarea está marcada como completada
    //completed: boolean; // Indica si la tarea está completada
    //link: { path: string }; // Enlace al archivo de la tarea
    //header?: { subpath: string }; // Sub-ruta del encabezado de la tarea
    line?: number; // Número de línea donde se encuentra la tarea
    section?: TaskSection; // Sección de la tarea (opcional)

    constructor(taskData: Partial<Task>) {
        this.id = taskData.id || '';
        this.title = taskData.title || '';

        this.text = taskData.text || '';

        this.line = taskData.line; 
    }


}