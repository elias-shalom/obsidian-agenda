import { App, TFile } from "obsidian";
import { ITask } from "../types/interfaces";

export class TaskManager {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  async getAllTasks(): Promise<ITask[]> {
    const tasks: ITask[] = [];
    const files = this.app.vault.getMarkdownFiles();

    console.log("Archivos de Markdown encontrados:", files); // Debugging line

    for (const file of files) {
      const content = await this.app.vault.read(file);
      const fileTasks = this.extractTasksFromContent(content, file.path);
      tasks.push(...fileTasks);
    }

    console.log("Tareas extraídas:", tasks); // Debugging line
    return tasks;
  }

  private extractTasksFromContent(content: string, filePath: string): ITask[] {
    const taskRegex = /- \[( |x)\] .+/g; // Busca líneas con tareas
    const matches = content.match(taskRegex) || [];
    console.log("Tareas encontradas en el archivo:", filePath, matches); // Debugging line

    return matches.map((match, index) => {
      const isCompleted = match.includes("[x]");
      const text = match.replace(/- \[( |x)\] /, "").trim();

      // Extraer propiedades adicionales de la tarea
      const dueDateMatch = text.match(/📅\s*(\d{4}-\d{2}-\d{2})/); // Fecha de vencimiento (📅)
      const startDateMatch = text.match(/🛫\s*(\d{4}-\d{2}-\d{2})/); // Fecha de inicio (🛫)
      const scheduledDateMatch = text.match(/⏳\s*(\d{4}-\d{2}-\d{2})/); // Fecha programada (⏳)
      const completionDateMatch = text.match(/✅\s*(\d{4}-\d{2}-\d{2})/); // Fecha de finalización (✅)
      const priorityMatch = text.match(/(⏫|🔼|🔽)/); // Prioridad (⏫, 🔼, 🔽)
      const recurrenceMatch = text.match(/🔁/); // Indica si es recurrente (🔁)

      // Extraer el título antes del primer icono
      const titleMatch = text.split(/📅|🛫|⏳|✅|⏫|🔼|🔽|🔁/)[0].trim();
      const fileName = filePath.split("/").pop()?.replace(".md", "") || "unknown";

      return {
        id: `${filePath}-${index}`, // Generar un ID único basado en el archivo y el índice
        title: titleMatch || `task - ${fileName}`, // Si no hay texto, usar "task - <nombre del archivo>"
        isCompleted,
        text,
        path: filePath,
        checked: isCompleted,
        completed: isCompleted,
        priority: priorityMatch ? priorityMatch[1] : "C", // Prioridad por defecto "C"
        recurrence: !!recurrenceMatch, // Indica si es recurrente (🔁)
        due: dueDateMatch ? dueDateMatch[1] : undefined,
        start: startDateMatch ? startDateMatch[1] : undefined,
        scheduled: scheduledDateMatch ? scheduledDateMatch[1] : undefined,
        completion: completionDateMatch ? completionDateMatch[1] : undefined,
        link: { path: filePath },
      } as ITask;
    });
  }
}