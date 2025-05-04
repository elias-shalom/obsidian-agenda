// This file exports interfaces and types used throughout the project.

import { TaskSection } from "../entities/task-section";

export interface ITask {
    id: string;

    text: string; // Texto de la tarea
    line?: number;
    section?: TaskSection; // Sección de la tarea (opcional)
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