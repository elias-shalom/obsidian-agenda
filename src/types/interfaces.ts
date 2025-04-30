// This file exports interfaces and types used throughout the project.

export interface ITask {
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
    priority?: 'low' | 'medium' | 'high' | string; // Prioridad de la tarea (⏫, 🔼, 🔽, o por defecto "C")
    checked: boolean; // Indica si la tarea está marcada como completada
    completed: boolean; // Indica si la tarea está completada
    link: {
        path: string;
    }; // Enlace al archivo de la tarea
    header?: { subpath: string }; // Sub-ruta del encabezado de la tarea
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