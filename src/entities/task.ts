import { ITask } from "../types/interfaces";

export class Task implements ITask {
    id: string;
    title: string;
    isCompleted: boolean;
    dueDate?: Date;
    tags?: string[];
    text: string; // Texto de la tarea
    path: string; // Ruta del archivo donde se encuentra la tarea
    dailyNote?: string; // Nota diaria asociada a la tarea
    due?: string; // Fecha de vencimiento (📅)
    start?: string; // Fecha de inicio (🛫)
    scheduled?: string; // Fecha programada (⏳)
    completion?: string; // Fecha de finalización (✅)
    recurrence?: boolean; // Indica si la tarea es recurrente (🔁)
    priority: string; // Prioridad de la tarea (⏫, 🔼, 🔽, o por defecto "C")
    checked: boolean; // Indica si la tarea está marcada como completada
    completed: boolean; // Indica si la tarea está completada
    link: { path: string }; // Enlace al archivo de la tarea
    header?: { subpath: string }; // Sub-ruta del encabezado de la tarea

    constructor(taskData: Partial<Task>) {
        this.id = taskData.id || '';
        this.title = taskData.title || '';
        this.isCompleted = taskData.isCompleted || false;
        this.dueDate = taskData.dueDate || new Date();
        this.tags = taskData.tags;
        this.text = taskData.text || '';
        this.path = taskData.path || '';
        this.dailyNote = taskData.dailyNote;
        this.due = taskData.due;
        this.start = taskData.start;
        this.scheduled = taskData.scheduled;
        this.completion = taskData.completion;
        this.recurrence = taskData.recurrence || false;
        this.priority = taskData.priority || 'C';
        this.checked = taskData.checked || false;
        this.completed = taskData.completed || false;
        this.link = taskData.link || { path: '' };
        this.header = taskData.header;
    }

    toggleCompletion(): void {
        this.isCompleted = !this.isCompleted;
    }
}