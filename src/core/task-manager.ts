import { App, TFile } from "obsidian";
import { ITask } from "../types/interfaces";
import logger from "./logger";

import { TaskSection } from "../entities/task-section";
import { Task } from "../entities/task";
import { I18n } from "./i18n";

export class TaskManager {

  constructor(private app: App, private i18n: I18n) {  }

  async getAllTasks(): Promise<ITask[]> {
    try {
      const files = this.app.vault.getMarkdownFiles();

      // Configuración de tamaño de lote (ajustable según necesidades)
      const batchSize = 10;
      const allTasks: ITask[] = [];

      // Procesamiento por lotes
      for (let i = 0; i < files.length; i += batchSize) {
        // Obtener un lote de archivos
        const batch = files.slice(i, i + batchSize);
        
        // Crear un array de promesas (una por cada archivo en el lote)
        const batchPromises = batch.map(file => this.extractTasksFromContent(file));
        
        // Ejecutar todas las promesas en paralelo y esperar a que todas terminen
        const batchResults = await Promise.all(batchPromises);
        
        // Añadir los resultados al array principal
        batchResults.forEach(fileTasks => {
          allTasks.push(...fileTasks);
        });
        
        // Opcional: reportar progreso
        //logger.debug(`Procesado lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(files.length/batchSize)} (${i+batch.length}/${files.length} archivos)`);
      }

      logger.debug(`Tareas extraídas: ${allTasks.length} de ${files.length} archivos`);
      //logger.debug(`Resumen de tareas: ${JSON.stringify(allTasks, null, 2)}`);
      console.log('Resumen de tareas:', allTasks);
      return allTasks;
    } catch (error) {
      logger.error("Error al obtener tareas:", error);
      return [];
    }
  }

  /// Método para obtener tareas de un archivo específico
  private async extractTasksFromContent(file: TFile): Promise <ITask[]> {
    try {
      const content = await this.app.vault.read(file);
      const cachedMetadata = this.app.metadataCache.getFileCache(file);

      // Verificar si podemos usar el caché de metadatos
      if (cachedMetadata && cachedMetadata.listItems) {
        const tasks = this.extractTasksFromCache(file, cachedMetadata, content);
        if (tasks.length > 0) {
          return tasks;
        }
        // Si no se encontraron tareas, caemos en el método tradicional (por si acaso)
      }

      // Usar el método tradicional como fallback
      return this.extractTasksTraditionally(file, content);

    } catch (error) {
      logger.error("Error al extraer tareas del contenido:", error);
      return [];
    }
  }

  /**
 * Extrae tareas usando el caché de metadatos de Obsidian
 */
  private extractTasksFromCache(file: TFile, cache: any, content: string): ITask[] {
    const tasks: ITask[] = [];
    const lines = content.split("\n");
    //logger.debug(`Usando caché de metadatos para ${file.path}`);

    // Solo procesar elementos de lista que son tareas
    if (cache.listItems) {
      for (const item of cache.listItems) {
        // Verificar si es una tarea (tiene un carácter de tarea)
        if (item.task !== undefined) {
          // Obtener el número de línea (ajustado a base 0)
          const lineNumber = item.position.start.line;

          // Obtener el contenido de la línea
          const line = lines[lineNumber];

          // Solo procesar si coincide con el formato de tarea
          if (line && line.match(TaskSection.taskFormatRegex)) {
            const task = this.createTaskFromLine(file, line, lineNumber, content);
            if (task) {
              tasks.push(task);
            }
          }
        }
      }
    }
    return tasks;
  }

    /**
   * Extrae tareas usando el método tradicional (sin caché)
   */
  private extractTasksTraditionally(file: TFile, content: string): ITask[] {
    //logger.debug(`Usando método tradicional para ${file.path}`);
    const lines = content.split("\n").filter(line => line.match(TaskSection.taskFormatRegex)); 
    const tasks: ITask[] = [];

    lines.forEach((line, lineNumber) => {
      if (line) {
        const task = this.createTaskFromLine(file, line, lineNumber, content);
        if (task) {
          tasks.push(task);
        }
      }
    });
    
    //logger.debug(`Extraídas ${tasks.length} tareas de ${file.path} usando método tradicional`);
    return tasks;
  }

  /**
 * Crea un objeto ITask a partir de una línea de texto
 */
  private createTaskFromLine(file: TFile, line: string, lineNumber: number, content: string): ITask | null {
    try {
      const taskSection = new TaskSection(this.i18n);
      taskSection.initialize(line);

      const status = Task.extractStatusFromHeader(taskSection.header);
      const tags = Task.extractTags(line);

      return {
        id: taskSection.taskData.id || `${file.path}-${lineNumber + 1}`,
        title: line,
        text: line.trim(),
        link: { path: file.path },
        lineNumber: lineNumber + 1, // Ajustar a base 1 para consistencia
        //section: taskSection,
        status: status,
        tags: tags,
        priority: taskSection.taskData.priority || "undefined",
        createdDate: taskSection.taskData.createdDate || null,
        startDate: taskSection.taskData.startDate || null,
        scheduledDate: taskSection.taskData.scheduledDate || null,
        dueDate: taskSection.taskData.dueDate || null,
        doneDate: taskSection.taskData.doneDate || null,
        cancelledDate: taskSection.taskData.cancelledDate || null,
        recurrence: taskSection.taskData.recurrence || "",
        onCompletion: taskSection.taskData.onCompletion,
        dependsOn: taskSection.taskData.dependsOn,
        blockLink: taskSection.blockLink,
        scheduledDateIsInferred: false,
        filePath: file.path,
        fileName: file.name,
        fileBasename: file.basename,
        fileExtension: file.extension,
        header: taskSection.header,
        description: taskSection.description,
        tasksFields: taskSection.tasksFields,
        taskData: taskSection.taskData,
        isValid: taskSection.taskData.isValid || false,
      } as ITask;
    } catch (error) {
      logger.error(`Error creando tarea de línea ${lineNumber + 1} en ${file.path}:`, error);
      return null;
    }
  }
}