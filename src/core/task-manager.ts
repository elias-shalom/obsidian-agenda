import { App, TFile } from "obsidian";
import { ITask } from "../types/interfaces";
import logger from "./logger";
import { log } from "console";
import { TaskSection } from "../entities/task-section";

export class TaskManager {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  async getAllTasks(): Promise<ITask[]> {
    const tasks: ITask[] = [];
    const files = this.app.vault.getMarkdownFiles();

    //console.log("Archivos de Markdown encontrados:", files); // Debugging line

    for (const file of files) {
      const content = await this.app.vault.read(file);
      //logger.info(`Leyendo archivo: ${content}`); // Debugging line
      //console.log("Contenido del archivo:", content); // Debugging line
      const fileTasks = this.extractTasksFromContent(content, file.path);
      tasks.push(...fileTasks);
    }

    console.log("Tareas extraídas:", tasks); // Debugging line
    return tasks;
  }

  /// Método para obtener tareas de un archivo específico
  private extractTasksFromContent(content: string, filePath: string): ITask[] {

    const taskSection = new TaskSection();

    // Explicación de la expresión regular: se encuentra en la clase TaskSection
    // Se filtra el contenido en líneas de manera que solo se procesen las que contienen tareas
    const lines = content.split("\n").filter(line => line.match(taskSection.taskFormatRegex)); 
    const tasks: ITask[] = [];

    lines.forEach((line, lineNumber) => {

      if (line) {

        taskSection.initialize(line); // Inicializar la sección de tareas con el texto de la línea actual
        //console.log(`filepath: ${filePath}`); // Debugging line
        //console.log(`descripcion: ${taskSection.description}`); // Debugging line
        //logger.info(`Leyendo línea: ${taskSection.tasksFields}`); // Debugging line
        //console.log("tasksFields:", taskSection.tasksFields); // Debugging line

        const isCompleted = line.includes("[x]");

        const text = line.replace(/(-|\*|\+|\d+[.)]) {0,4}\[( |x)\] {0,4}/, "").trim();

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

        tasks.push({
          id: `${filePath}-${lineNumber}`, // Generar un ID único basado en el archivo y el número de línea
          title: titleMatch || `task - ${fileName}`, // Si no hay texto, usar "task - <nombre del archivo>"
          isCompleted,
          text,
          path: filePath,
          line: lineNumber + 1, // Número de línea (sumar 1 porque los índices comienzan en 0)
          checked: isCompleted,
          completed: isCompleted,
          priority: priorityMatch ? priorityMatch[1] : "C", // Prioridad por defecto "C"
          recurrence: !!recurrenceMatch, // Indica si es recurrente (🔁)
          due: dueDateMatch ? dueDateMatch[1] : undefined,
          start: startDateMatch ? startDateMatch[1] : undefined,
          scheduled: scheduledDateMatch ? scheduledDateMatch[1] : undefined,
          completion: completionDateMatch ? completionDateMatch[1] : undefined,
          link: { path: filePath },
        } as ITask);
      }
    });

    return tasks;
  }
}