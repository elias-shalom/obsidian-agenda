import { App, TFile } from "obsidian";
import { ITask } from "../types/interfaces";
import logger from "./logger";
import { log } from "console";
import { TaskSection } from "../entities/task-section";
import { Task } from "../entities/task";
import { I18n } from "./i18n";

export class TaskManager {

  constructor(private app: App, private i18n: I18n) {  }

  async getAllTasks(): Promise<ITask[]> {
    const tasks: ITask[] = [];
    const files = this.app.vault.getMarkdownFiles();

    //console.log("Archivos de Markdown encontrados:", files); // Debugging line

    /*const file = this.app.vault.getAbstractFileByPath("intellectual/intellectual.md") as TFile;
      if (file) {
        const cachedMetadata = this.app.metadataCache.getFileCache(file);
    
        console.log('cachedMetadata: ',cachedMetadata)     
        console.log('file: ',file)
        if (cachedMetadata?.listItems) {
          const tasks = cachedMetadata.listItems.filter(item => item.task !== undefined);
          tasks.forEach(task => {
            const taskText = task.task?.trim(); // Texto de la tarea
            const lineNumber = task.position.start.line; // Línea donde se encuentra la tarea
            console.log(`Tarea: ${taskText}, Línea: ${lineNumber}`);
              console.log(`Tarea: ${task.task}, Línea: ${task.position.start.line}`);
          });
        }
      }*/  

    for (const file of files) {
      const fileTasks = await this.extractTasksFromContent(file);
      tasks.push(...fileTasks);
    }

    console.log("Tareas extraídas:", tasks); // Debugging line
    
    return tasks;
  }

  /// Método para obtener tareas de un archivo específico
  private async extractTasksFromContent(file: TFile): Promise <ITask[]> {

    const content = await this.app.vault.read(file);
    const cachedMetadata = this.app.metadataCache.getFileCache(file);
    

    // Explicación de la expresión regular: se encuentra en la clase TaskSection
    // Se filtra el contenido en líneas de manera que solo se procesen las que contienen tareas
    const lines = content.split("\n").filter(line => line.match(TaskSection.taskFormatRegex)); 
    const tasks: ITask[] = [];

    lines.forEach((line, lineNumber) => {
      if (line) {

        const taskSection = new TaskSection(this.i18n);

        taskSection.initialize(line); // Inicializar la sección de tareas con el texto de la línea actual
        const status = Task.extractStatusFromHeader(taskSection.header);
        const tags = Task.extractTags(line); 

        tasks.push({
          id: (taskSection.taskData.id) ? taskSection.taskData.id : file.path +"-"+ (lineNumber + 1).toString(), // Generar un ID único para la tarea
          title: line,
          text: line.trim(),
          link: { path: file.path }, // Enlace al archivo de la tarea
          lineNumber: lineNumber + 1, // Ajustar el número de línea para que comience desde 1
          section: taskSection, // Sección de la tarea (opcional)          
          status: status, // Default status
          tags: tags, // Default tags
          priority: (taskSection.taskData.priority) ? taskSection.taskData.priority : "undefined", // Default priority
          createdDate: taskSection.taskData.createdDate || null, // Default created date
          startDate: taskSection.taskData.startDate || null, // Fecha de inicio (🛫)
          scheduledDate: taskSection.taskData.scheduledDate || null, // Fecha programada (⏳)
          dueDate: taskSection.taskData.dueDate || null, // Fecha de vencimiento (📅)
          doneDate: taskSection.taskData.doneDate || null, // Fecha de finalización (✅)
          cancelledDate: taskSection.taskData.cancelledDate || null, // Fecha de cancelación (❌)
          recurrence: (taskSection.taskData.recurrence) ? taskSection.taskData.recurrence : "", //Recurrence | null; Indica si la tarea es recurrente (🔁)
          onCompletion: taskSection.taskData.onCompletion,//OnCompletion;
          dependsOn: taskSection.taskData.dependsOn, // Dependencias de la tarea (⛔)
          blockLink: taskSection.blockLink, // Block link;
          scheduledDateIsInferred: false,
          file: file, // Archivo donde se encuentra la tarea
          isValid: taskSection.taskData.isValid || false, // Indica si la tarea es válida o no
        } as ITask); // Asegurarse de que el objeto cumpla con la interfaz ITask
      }
    });
    return tasks;
  }
}