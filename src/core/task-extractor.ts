import { App, TFile, CachedMetadata, FrontMatterCache } from "obsidian";
import { ITask } from "../types/interfaces";
import { TaskSection } from "../entities/task-section";
import { Task } from "../entities/task";
import { I18n } from "./i18n";
import { CoreTaskStatus, CoreTaskStatusIcon } from "../types/enums";

/**
 * Clase responsable de extraer tareas desde archivos de Obsidian
 * Utiliza tanto el caché de metadatos como métodos tradicionales
 */
export class TaskExtractor {
  constructor(private app: App, private i18n: I18n) {}

  /**
   * Extrae tareas de un archivo específico
   * @param file El archivo del cual extraer tareas
   * @returns Una promesa que resuelve a un array de tareas
   */
  public async extractTasksFromFile(file: TFile): Promise<ITask[]> {
    try {
      //console.log(`Extrayendo tareas de ${file}...`);
      const content = await this.app.vault.read(file);
      
      const cachedMetadata = this.app.metadataCache.getFileCache(file);
      //console.log(`Metadatos en caché para ${file.path}:`, cachedMetadata);

      // Verificar si podemos usar el caché de metadatos
      if (cachedMetadata && cachedMetadata.listItems) {
        const tasks = this.extractTasksFromCache(file, cachedMetadata, content);
        if (tasks.length > 0) {
          return tasks;
        }
        // Si no se encontraron tareas, caemos en el método tradicional (por si acaso)
      }

      // Usar el método tradicional como fallback
      return this.extractTasksTraditionally(file, content, cachedMetadata ? cachedMetadata.frontmatter : undefined);

    } catch (error) {
      console.error("Error al extraer tareas del contenido:", error);
      return [];
    }
  }

  /**
   * Extrae tareas usando el caché de metadatos de Obsidian
   */
  private extractTasksFromCache(file: TFile, cache: CachedMetadata, content: string): ITask[] {
    const tasks: ITask[] = [];
    const lines = content.split("\n");
    //console.debug(`Usando caché de metadatos para ${file.path}`);

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
            const task = this.createTaskFromLine(file, line, lineNumber, cache.frontmatter);
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
  private extractTasksTraditionally(file: TFile, content: string, frontmatter: FrontMatterCache | undefined): ITask[] {
    //console.debug(`Usando método tradicional para ${file.path}`);
    const lines = content.split("\n").filter(line => line.match(TaskSection.taskFormatRegex)); 
    const tasks: ITask[] = [];

    lines.forEach((line, lineNumber) => {
      if (line) {
        //console.debug(`Líneas de tareas encontradas en ${file.path}:`, line);
        const task = this.createTaskFromLine(file, line, lineNumber,frontmatter);
        if (task) {
          tasks.push(task);
        }
      }
    });
    
    //console.debug(`Extraídas ${tasks.length} tareas de ${file.path} usando método tradicional`);
    return tasks;
  }

  /**
   * Crea un objeto ITask a partir de una línea de texto con la nueva estructura
   */
  private createTaskFromLine(file: TFile, line: string, lineNumber: number, frontmatter: FrontMatterCache | undefined): ITask | null {
    try {
      const taskSection = new TaskSection(this.i18n);
      taskSection.initialize(line);
      //console.log(`Task data extraída de línea ${lineNumber + 1} en ${file.path}:`, taskSection);

      const status = Task.extractStatusFromHeader(taskSection.header);
      const tags = Task.extractTags(line);
      const statusText = this.getCoreTaskStatusName(status);
      // Obtiene el icono del enum CoreTaskStatusIcon
      const statusIcon = this.getCoreTaskStatusIcon(status);
      const rootFolder = this.getRootFolder(file.path);

      // Crear la nueva estructura optimizada
      return Task.create({
        id: (typeof taskSection.taskData.id === 'string' ? taskSection.taskData.id : null) || `${file.path}-${lineNumber + 1}`,
        
        file: {
          path: file.path,
          name: file.basename,
          ext: file.extension,
          root: rootFolder,
          meta: frontmatter || null
        },
        
        line: {
          number: lineNumber + 1,
          text: line.trim()
        },
        
        state: {
          status: status,
          icon: statusIcon,
          text: statusText,
          priority: taskSection.extractPriority(taskSection.taskData.priority),
          isValid: taskSection.extractIsValid(taskSection.taskData.isValid)
        },
        
        date: {
          due: taskSection.extractDate(taskSection.taskData.dueDate),
          start: taskSection.extractDate(taskSection.taskData.startDate),
          scheduled: taskSection.extractDate(taskSection.taskData.scheduledDate),
          created: taskSection.extractDate(taskSection.taskData.createdDate),
          done: taskSection.extractDate(taskSection.taskData.doneDate),
          cancelled: taskSection.extractDate(taskSection.taskData.cancelledDate)
        },
        
        section: {
          header: taskSection.header,
          desc: taskSection.description,
          tags: tags,
          fields: taskSection.tasksFields
        },
        
        flow: {
          recur: taskSection.extractString(taskSection.taskData.recurrence),
          blockLink: taskSection.blockLink,
          deps: taskSection.extractDependencies(taskSection.taskData.dependsOn),
          onCompletion: taskSection.extractOnCompletion(taskSection.taskData.onCompletion)
        }
      });

    } catch (error) {
      console.error(`Error creando tarea de línea ${lineNumber + 1} en ${file.path}:`, error);
      return null;
    }
  }

  /**
   * Obtiene la carpeta raíz de un archivo
   */
  private getRootFolder(filePath: string): string {
    if (filePath) {
      // Dividir la ruta del archivo en partes
      const pathParts = filePath.split('/');
      
      // El rootFolder es la primera parte de la ruta (si existe)
      if (pathParts.length > 1) {
        return pathParts[0];
      } else {
        // Si no hay separador de ruta, asignar "Root"
        return "root";
      }
    } else {
      // Si no hay ruta de archivo, asignar "Sin carpeta"
      return "undefined";
    }
  }

  /**
   * Obtiene el nombre del estado de la tarea
   */
  private getCoreTaskStatusName(status: CoreTaskStatus): string {
    switch (status) {
      case CoreTaskStatus.Todo:
        return "Todo";
      case CoreTaskStatus.InProgress:
        return "InProgress";
      case CoreTaskStatus.Done:
        return "Done";
      case CoreTaskStatus.Cancelled:
        return "Cancelled";
      case CoreTaskStatus.nonTask:
        return "NonTask";
      default:
        return "Unknown";
    }
  }

  /**
   * Obtiene el icono del estado de la tarea
   */
  private getCoreTaskStatusIcon(status: CoreTaskStatus): string {
    switch (status) {
      case CoreTaskStatus.Todo:
        return CoreTaskStatusIcon.Todo;
      case CoreTaskStatus.InProgress:
        return CoreTaskStatusIcon.InProgress;
      case CoreTaskStatus.Done:
        return CoreTaskStatusIcon.Done;
      case CoreTaskStatus.Cancelled:
        return CoreTaskStatusIcon.Cancelled;
      case CoreTaskStatus.nonTask:
        return CoreTaskStatusIcon.nonTask;
      default:
        return CoreTaskStatusIcon.Todo;
    }
  }
}