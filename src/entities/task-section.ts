import { OnCompletion, TaskPriorityEmoji } from "../types/enums";
import { I18n } from "../core/i18n";
import { rrulestr } from 'rrule';
import { DateTime } from "luxon";

/**
 * Interfaz para la configuración de emojios en las tareas
 */
interface EmojiConfig {
  type: 'date' | 'priority' | 'recurrence' | 'id' | 'blocked' | 'completion';
  property: string;
  format?: string;
  value?: string | number | TaskPriorityEmoji;
  name?: string;
  values?: (string | number)[];
}

export class TaskSection {
  header: string; // Representa el encabezado de la tarea
  description: string; // Representa la descripción de la tarea
  tasksFields: string[]; // Representa los campos específicos de la tarea como un arreglo de strings
  blockLink: string;
  taskData: Record<string, string | number | boolean | string[] | null | undefined> = {};

  /**
       * Expresión regular para validar el formato de una tarea.
       * 
       * Desglose de la expresión:
       * 
       * ^[\t ]*:
       * - Permite que la línea comience con cualquier cantidad de tabulaciones (`\t`) o espacios (` `).
       * - Esto asegura que las tareas con indentación sean válidas.
       * 
       * (>*) :
       * - Permite que haya cero o más caracteres `>` al inicio de la línea.
       * - Esto permite que las tareas citadas (por ejemplo, `> - [x] Tarea`) o con múltiples citas (`>> - [x]`) sean válidas.
       * 
       * \s*:
       * - Permite cualquier cantidad de espacios después de los caracteres `>` (si están presentes).
       * 
       * (-|\*|\+|\d+[.)]):
       * - Valida el prefijo de la tarea:
       *   - `-`: Un guion.
       *   - `*`: Un asterisco.
       *   - `+`: Un signo más.
       *   - `\d+[.)]`: Un número seguido de un punto (`.`) o un paréntesis de cierre (`)`).
       * - Esto asegura que las tareas tengan un formato de lista válido.
       * 
       * {0,4}:
       * - Permite hasta 4 espacios opcionales después del prefijo.
       * 
       * \[(.)\]:
       * - Valida que haya corchetes `[ ]` con exactamente un carácter dentro.
       * - `(.)`: Captura cualquier carácter dentro de los corchetes.
       * - Esto asegura que las tareas tengan un estado válido (por ejemplo, `[x]`, `[ ]`, `[?]`).
       * 
       * {0,4}:
       * - Permite hasta 4 espacios opcionales después de los corchetes.
       * 
       * \S:
       * - Asegura que haya al menos un carácter no vacío (no espacio) después de los corchetes.
       * - Esto evita que las tareas sin contenido sean consideradas válidas.
       * 
       * .+:
       * - Requiere que haya más texto después del primer carácter no vacío.
       * - Esto asegura que las tareas tengan una descripción o contenido.
       * 
       * g:
       * - Bandera global para buscar todas las coincidencias en el texto.
       * 
       * Ejemplo de tareas válidas:
       * - `- [x] Tarea completada`
       * - `> - [ ] Tarea pendiente`
       * - `>> - [/] Tarea en progreso`
       * - `1. [x] Tarea numerada`
       * 
       * Ejemplo de tareas no válidas:
       * - `Texto aleatorio - [x] Tarea inválida` (texto antes del prefijo).
       * - `- [] Tarea inválida` (sin carácter dentro de los corchetes).
       * - `- [x]` (sin texto después de los corchetes).
       */
  // Propiedades para las expresiones regulares
  private headerRegex: RegExp;
  private emojiRegex: RegExp;

  // Nueva propiedad estática para el formato de tareas
  static readonly taskFormatRegex: RegExp = /^[\t ]*(>*)\s*(-|\*|\+|\d+[.)]) {0,4}\[(.)\] {0,4}\S.+/g;

  private readonly dataviewKeyMapping: Record<string, string> = {
    'due':           'dueDate',
    'duedate':       'dueDate',
    'start':         'startDate',
    'startdate':     'startDate',
    'scheduled':     'scheduledDate',
    'scheduleddate': 'scheduledDate',
    'created':       'createdDate',
    'createddate':   'createdDate',
    'done':          'doneDate',
    'donedate':      'doneDate',
    'cancelled':     'cancelledDate',
    'cancelleddate': 'cancelledDate',
    'canceled':      'cancelledDate',
    'canceleddate':  'cancelledDate',
    'priority':      'priority',
    'recurrence':    'recurrence',
    'repeat':        'recurrence',
    'id':            'id',
    'dependson':     'dependsOn',
    'depends':       'dependsOn',
    'blockedby':     'dependsOn',
    'oncompletion':  'onCompletion',
    'completion':    'onCompletion',
  };

  private readonly emojiMapping: Record<string, EmojiConfig> = {
    // Emojios de fechas
    "📅": { type: "date", property: "dueDate", format: "YYYY-MM-DD" },
    "🛫": { type: "date", property: "startDate", format: "YYYY-MM-DD" },
    "⏳": { type: "date", property: "scheduledDate", format: "YYYY-MM-DD" },
    "✅": { type: "date", property: "doneDate", format: "YYYY-MM-DD" },
    "❌": { type: "date", property: "cancelledDate", format: "YYYY-MM-DD" },
    "➕": { type: "date", property: "createdDate", format: "YYYY-MM-DD" },
    
    // Emojios de prioridad con nombre legible
    "⏬": { type: "priority", property: "priority", value: TaskPriorityEmoji.Lowest, name: "lowest" },
    "🔽": { type: "priority", property: "priority", value: TaskPriorityEmoji.Low, name: "low" },
    "🔼": { type: "priority", property: "priority", value: TaskPriorityEmoji.Medium, name: "medium" },
    "⏫": { type: "priority", property: "priority", value: TaskPriorityEmoji.High, name: "high" },
    "🔺": { type: "priority", property: "priority", value: TaskPriorityEmoji.Highest, name: "highest" },

    // Otros emojios
    "🔁": { type: "recurrence", property: "recurrence" },
    "🆔": { type: "id", property: "id" },
    "⛔": { type: "blocked", property: "blockedBy" },
    "🏁": { type: "completion", property: "onCompletion", 
            values: [OnCompletion.Keep, OnCompletion.Delete] }
  };

  constructor(private i18n: I18n) {
      // Inicializar las propiedades como cadenas vacías
      this.header = "";
      this.description = "";
      this.tasksFields = [];
      this.blockLink = "";
      this.headerRegex = /^[\t ]*(>*)\s*(-|\*|\+|\d+[.)]) {0,4}\[(.)\] {0,4}/;
      this.emojiRegex = /📅|🛫|⏳|✅|❌|➕|⏬|⏫|🔼|🔽|🔺|🔁|🆔|⛔|🏁/g;
  }

  /**
   * Método helper para obtener la configuración de un emoji de forma segura
   * @param emoji El emoji a buscar
   * @returns La configuración del emoji o null si no existe
   */
  private getEmojiConfig(emoji: string): EmojiConfig | null {
    return this.emojiMapping[emoji] || null;
  }

  /**
   * Extrae la prioridad de forma type-safe
   * @param priority Valor de prioridad desde taskData
   * @returns String de prioridad seguro
   */
  public extractPriority(priority: unknown): string {
    return typeof priority === 'string' ? priority : "undefined";
  }

  /**
   * Extrae el valor isValid de forma type-safe
   * @param isValid Valor booleano desde taskData
   * @returns Boolean seguro
   */
  public extractIsValid(isValid: unknown): boolean {
    return typeof isValid === 'boolean' ? isValid : false;
  }

  /**
   * Extrae fechas de forma type-safe
   * @param date Valor de fecha desde taskData
   * @returns DateTime object o null
   */
  public extractDate(date: unknown): DateTime | null {
    if (date instanceof Date) return DateTime.fromJSDate(date);
    if (typeof date === 'string') {
      const parsed = DateTime.fromISO(date);
      return parsed.isValid ? parsed : DateTime.fromFormat(date, 'yyyy-MM-dd').isValid 
        ? DateTime.fromFormat(date, 'yyyy-MM-dd') 
        : null;
    }
    if (date && typeof date === 'object' && 'toISO' in date) {
      // Si ya es un objeto DateTime de Luxon
      return date as DateTime;
    }
    return null;
  }

  /**
   * Extrae strings de forma type-safe
   * @param value Valor desde taskData
   * @returns String seguro
   */
  public extractString(value: unknown): string {
    return typeof value === 'string' ? value : "";
  }

  /**
   * Extrae dependencias de forma type-safe
   * @param deps Array de dependencias desde taskData
   * @returns Array de strings seguro
   */
  public extractDependencies(deps: unknown): string[] {
    if (Array.isArray(deps)) {
      return deps.filter((dep): dep is string => typeof dep === 'string');
    }
    return [];
  }

  /**
   * Extrae onCompletion de forma type-safe
   * @param completion Valor de completion desde taskData
   * @returns String o null seguro
   */
  public extractOnCompletion(completion: unknown): string | null {
    return typeof completion === 'string' ? completion : null;
  }

  /**
   * Inicializa las propiedades de la clase a partir del texto proporcionado.
   * @param text Texto completo de la tarea.
   */
  initialize(text: string): void {
      try {
          this.header = this.extractHeader(text);
          let remainingText = this.removeText(text, this.header);
          remainingText = this.removeAllTags(remainingText); // Eliminar tags del texto restante

          this.description = this.extractDescription(remainingText);
          //console.log(`Descripción extraída: ${this.description}`);

          remainingText = this.removeText(remainingText, this.description);
          const result = this.extractTasksFields(remainingText);
          this.tasksFields = result.fields;
          this.taskData = result.taskData;

          // Establecer prioridad predeterminada si no se especificó
          if (!this.taskData.priority && !this.taskData.priority_error) {
            this.taskData.priority = "normal";
          }

          this.blockLink = this.extractBlockLink(text);
      } catch (error) {
          // Si ocurre un error, inicializar todo como vacío
          const errorMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error);
          console.error(this.i18n.t('errors.initializeTaskSection', { error: errorMsg }));
          this.header = "";
          this.description = "";
          this.tasksFields = [];
          this.blockLink = "";
      }
  }

  /**
   * Extrae el encabezado del texto utilizando la expresión regular.
   * @param text Texto completo de la tarea.
   * @returns El encabezado extraído.
   * @throws Error si no se encuentra un encabezado válido.
   */
  private extractHeader(text: string): string {
      const match = text.match(this.headerRegex);
      if (!match) {
          throw new Error("Texto inválido: no contiene un encabezado válido.");
      }
      return match[0].trim();
  }

  /**
   * Elimina el encabezado del texto para procesar las secciones restantes.
   * @param text Texto completo de la tarea.
   * @param header El encabezado extraído.
   * @returns El texto restante después de eliminar el encabezado.
   */
  private removeText(text: string, cutText: string): string {
      const endIndex = text.indexOf(cutText) + cutText.length;
      return text.slice(endIndex).trim();
  }

  /**
   * Elimina todos los tags (palabras que comienzan con #) de un texto.
   * @param text Texto del que se eliminarán los tags.
   * @returns El texto sin tags.
   */
  private removeAllTags(text: string): string {
  // Eliminar todas las palabras que comienzan con #
  let textWithoutTags = text.replace(/#[a-zA-Z0-9_\-/]+\b/g, '');

  // Eliminar espacios múltiples que pueden haber quedado
  textWithoutTags = textWithoutTags.replace(/\s+/g, ' ').trim();

  return textWithoutTags;
  }

  /**
   * Extrae la descripción del texto restante.
   * @param text Texto restante después de eliminar el encabezado.
   * @returns La descripción extraída.
   */
  private extractDescription(text: string): string {
    let smallestIndex = text.length; // Inicializar con el tamaño máximo del texto

    // Buscar todas las coincidencias de los emojis
    for (const match of text.matchAll(this.emojiRegex)) {
      const index = match.index;
      if (index < smallestIndex) smallestIndex = index;
    }

    // Buscar marcadores dataview [key::
    const dataviewMarkerRegex = /\[[a-zA-Z][a-zA-Z0-9_]*::/g;
    for (const match of text.matchAll(dataviewMarkerRegex)) {
      const index = match.index;
      if (index < smallestIndex) smallestIndex = index;
    }

    // Si se encontró un ícono, cortar el texto hasta el índice más pequeño
    if (smallestIndex < text.length) {
        return text.slice(0, smallestIndex).trim();
    }

    // Si no se encontraron íconos, devolver todo el texto como descripción
    return text.trim();
  }

  /**
 * Extrae los campos específicos de la tarea del texto restante.
 * Orquesta la extracción en dos formatos: emoji y dataview.
 * @param text Texto restante después de eliminar el encabezado.
 * @returns Un objeto que contiene el arreglo de campos y los datos estructurados extraídos.
 */
  private extractTasksFields(text: string): { fields: string[], taskData: Record<string, string | number | boolean | string[] | null | undefined> } {
    const errors: string[] = [];
    const taskData: Record<string, string | number | boolean | string[] | null | undefined> = {};
    const allFields: string[] = [];

    // Extraer todos los campos dataview del texto original
    const dataviewFieldRegex = /\[([a-zA-Z][a-zA-Z0-9_]*)::\s*([^\]]*)\]/g;
    const dataviewMatches = Array.from(text.matchAll(dataviewFieldRegex));
    
    // Crear un texto sin los dataview para procesarlo con emojis
    let textWithoutDataview = text;
    for (const match of dataviewMatches) {
      textWithoutDataview = textWithoutDataview.replace(match[0], '');
    }
    textWithoutDataview = textWithoutDataview.replace(/\s+/g, ' ').trim();

    // Extraer campos en formato emoji
    const emojiResult = this.extractEmojiFields(textWithoutDataview);
    allFields.push(...emojiResult.fields);
    Object.assign(taskData, emojiResult.taskData);
    if (emojiResult.errors) {
      errors.push(...emojiResult.errors);
    }

    // Extraer campos en formato dataview
    const dataviewResult = this.extractDataviewFields(text);
    allFields.push(...dataviewResult.fields);
    // Merge dataview taskData sin sobrescribir valores existentes (emoji tiene prioridad)
    for (const [key, value] of Object.entries(dataviewResult.taskData)) {
      if (!(key in taskData)) {
        taskData[key] = value;
      } else if (key === 'dependsOn' && Array.isArray(taskData[key]) && Array.isArray(value)) {
        // Caso especial: merge de dependencias
        taskData[key] = [...(taskData[key]), ...value];
      }
    }
    if (dataviewResult.errors) {
      errors.push(...dataviewResult.errors);
    }

    // Establecer estado final
    if (errors.length > 0) {
      taskData.errors = errors;
      taskData.isValid = false;
    } else {
      taskData.isValid = true;
    }

    return { fields: allFields, taskData };
  }

  /**
   * Extrae los campos específicos de la tarea del texto restante.
   * @param text Texto restante después de eliminar el encabezado.
   * @returns Un objeto que contiene el arreglo de campos y los datos estructurados extraídos.
   */
  private extractEmojiFields(text: string): { fields: string[], taskData: Record<string, string | number | boolean | string[] | null | undefined>, errors: string[]  } {
    const fields: string[] = [];
    const taskData: Record<string, string | number | boolean | string[] | null | undefined> = {};
    const errors: string[] = [];

    const emojiDateRegex = /(📅|🛫|⏳|✅|❌|➕)\s*(\d{4}-\d{2}-\d{2})\s*$/g // Ícono seguido de una fecha en formato YYYY-MM-DD
    const emojiEmptyRegex = /(⏬|⏫|🔼|🔽|🔺)\s*$/g; // Ícono seguido solo por espacios o tabulaciones
    const emojiCompletionRegex = /🏁\s*(keep|delete)/g; // Ícono 🏁 seguido de valores válidos de OnCompletion
    const emojiBlockedRegex = /⛔\s*(.*)/g; // Ícono bloqueado seguido de una cadena de identificadores
    const emojiRecurrenceRegex = /🔁\s*(.*)/g; // Ícono de recurrencia seguido de una cadena de texto
    const idEmojisRegex = /🆔\s*(.*)/g; // Otros íconos que no requieren validación adicional

    const matches = Array.from(text.matchAll(this.emojiRegex)); // Encontrar todas las coincidencias de emojis

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const matchIndex = match.index;
      const nextMatchIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;

      // Extraer el texto desde el inicio del emoji actual hasta justo antes del siguiente emoji
      let fieldText = text.slice(matchIndex, nextMatchIndex).trim();
      
      const emoji = match[0]; // Obtener el emoji actual

      // Obtener la configuración del emoji desde el mapeo
      const emojiConfig = this.getEmojiConfig(emoji);

      if (emojiConfig) {
        let isValid = true;
        let extractedValue: string | null = null;
        let errorMessage = "";

        switch (emojiConfig.type) {
          case "date": {
            // Reiniciar la expresión regular (debido a 'g')
            emojiDateRegex.lastIndex = 0;

            // Verificar si el campo es válido usando la expresión regular específica
            if (emojiDateRegex.test(fieldText)) {
              // Extraer la fecha YYYY-MM-DD
              const dateMatch = fieldText.match(/\d{4}-\d{2}-\d{2}/);
              if (dateMatch) {
                extractedValue = dateMatch[0];
              }
            } else {
              isValid = false;
              errorMessage = this.i18n.t('errors.invalidDate', { emoji: emoji });
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;
          }

          case "priority":
            // Reiniciar la expresión regular (debido a 'g')
            emojiEmptyRegex.lastIndex = 0;

            // Verificar si el campo es válido usando la expresión regular específica
            if (emojiEmptyRegex.test(fieldText)) {
              extractedValue = emojiConfig.name || "normal";
            } else {
              isValid = false;
              errorMessage = this.i18n.t('errors.invalidPriority', { emoji: emoji });
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;

          case "completion": {
            // Reiniciar la expresión regular (debido a 'g')
            emojiCompletionRegex.lastIndex = 0;

            // Verificar si el campo es válido usando la expresión regular específica
            if (emojiCompletionRegex.test(fieldText)) {
              const completionMatch = fieldText.match(/keep|delete/i);
              if (completionMatch) {
                extractedValue = completionMatch[0].toLowerCase();
              }
            } else {
              isValid = false;
              errorMessage = this.i18n.t('errors.invalidCompletion', { emoji: emoji });;
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;
          }
          case "blocked": {
            // Reiniciar la expresión regular (debido a 'g')
            emojiBlockedRegex.lastIndex = 0;

            if (emojiBlockedRegex.test(fieldText) ) {
              extractedValue = fieldText.substring(emoji.length).trim();
              const dependencies = extractedValue.split(',').map(dep => dep.trim()).filter(dep => dep.length > 0);
              
              // Asignar como array en lugar de string
              if (dependencies.length > 0) {
                taskData.dependsOn = dependencies;
              }
            } else {
              isValid = false;
              errorMessage = this.i18n.t('errors.invalidDependency', { emoji: emoji });
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;
          }
          case "recurrence": {
            // ! Error en la recurrencia no invalida la tarea
            // Reiniciar la expresión regular (debido a 'g')
            emojiRecurrenceRegex.lastIndex = 0;

            if (emojiRecurrenceRegex.test(fieldText)) {
              const recurrenceText = fieldText.substring(emoji.length).trim();

              try {
                // Convertir texto de recurrencia al formato RRULE
                const rruleText = this.convertToRRuleFormat(recurrenceText);               

                if (rruleText) {
                  // Validar sintaxis RRULE
                  this.validateRRuleSyntax(rruleText);
                  // Si llegamos aquí, el patrón es válido
                  extractedValue = recurrenceText;
                } else {
                  throw new Error("No se pudo convertir al formato RRULE");
                }
              } catch (error) {                
                errorMessage = this.i18n.t('errors.invalidRecurrencePattern', { emoji: emoji });
                fieldText = `${fieldText} @${errorMessage}`;
                console.error(error);
              }
            } else {              
              errorMessage = this.i18n.t('errors.invalidRecurrence', { emoji: emoji });
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;
          }
          case "id": {
            // Reiniciar la expresión regular (debido a 'g')
            idEmojisRegex.lastIndex = 0;

            // Para otros tipos de emojis, usar la expresión regular de otros emojis
            const otherMatch = idEmojisRegex.exec(fieldText);
            if (otherMatch && otherMatch[2] !== undefined) {
              extractedValue = otherMatch[2].trim();
            } else {
              extractedValue = fieldText.substring(emoji.length).trim();
            }
            break;
          }
        }

        // Si el campo es válido y tiene una propiedad definida, guardarla en taskData
        if (isValid && emojiConfig.property) {
          taskData[emojiConfig.property] = extractedValue;
        } else if (!isValid) {
          // Si el campo es inválido, guardar el error en taskData
          const errorProperty = `${emojiConfig.property || 'field'}_error`;
          taskData[errorProperty] = errorMessage;
          errors.push(errorMessage); // Agregar al array de errores
        }
      }

      // Agregar el texto del campo al arreglo de fields
      fields.push(fieldText);
    }

    // Agregar array de errores al taskData si hay errores
    if (errors.length > 0) {
      taskData.errors = errors;
      taskData.isValid = false;
    } else {
      taskData.isValid = true;
    }

    return { fields, taskData, errors };
  }

  /**
   * Extrae campos en formato dataview (ej: [due:: 2023-05-01] [priority:: high])
   * @param text Texto a procesar
   * @returns Objeto con fields, taskData y errors
   */
  private extractDataviewFields(text: string): { fields: string[], taskData: Record<string, string | number | boolean | string[] | null | undefined>, errors: string[] } {
    const fields: string[] = [];
    const taskData: Record<string, string | number | boolean | string[] | null | undefined> = {};
    const errors: string[] = [];

    const dataviewFieldRegex = /\[([a-zA-Z][a-zA-Z0-9_]*)::\s*([^\]]*)\]/g;
    const dataviewMatches = Array.from(text.matchAll(dataviewFieldRegex));

    for (const dvMatch of dataviewMatches) {
      const key = dvMatch[1].trim().toLowerCase();
      const value = dvMatch[2].trim();
      const fieldText = dvMatch[0]; // e.g. "[priority:: high]"

      const property = this.dataviewKeyMapping[key];
      if (!property) {
        fields.push(fieldText); // clave desconocida, guardar como campo raw
        continue;
      }

      let isValid = true;
      let errorMessage = "";
      const keyLabel = `[${dvMatch[1]}::]`;

      if (['dueDate', 'startDate', 'scheduledDate', 'doneDate', 'cancelledDate', 'createdDate'].includes(property)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          if (!(property in taskData)) taskData[property] = value;
        } else {
          isValid = false;
          errorMessage = this.i18n.t('errors.invalidDate', { emoji: keyLabel });
        }
      } else if (property === 'priority') {
        const validPriorities = ['lowest', 'low', 'normal', 'medium', 'high', 'highest'];
        if (validPriorities.includes(value.toLowerCase())) {
          if (!('priority' in taskData)) taskData.priority = value.toLowerCase();
        } else {
          isValid = false;
          errorMessage = this.i18n.t('errors.invalidPriority', { emoji: keyLabel });
        }
      } else if (property === 'recurrence') {
        try {
          const rruleText = this.convertToRRuleFormat(value);
          if (rruleText) {
            this.validateRRuleSyntax(rruleText);
            if (!('recurrence' in taskData)) taskData.recurrence = value;
          } else {
            throw new Error("No se pudo convertir al formato RRULE");
          }
        } catch (error) {
          errorMessage = this.i18n.t('errors.invalidRecurrencePattern', { emoji: keyLabel });
          console.error(error);
        }
      } else if (property === 'dependsOn') {
        const deps = value.split(',').map(d => d.trim()).filter(d => d.length > 0);
        if (deps.length > 0) {
          const existing = taskData.dependsOn;
          taskData.dependsOn = Array.isArray(existing) ? [...(existing), ...deps] : deps;
        }
      } else if (property === 'onCompletion') {
        if (/^(keep|delete)$/i.test(value)) {
          if (!('onCompletion' in taskData)) taskData.onCompletion = value.toLowerCase();
        } else {
          isValid = false;
          errorMessage = this.i18n.t('errors.invalidCompletion', { emoji: keyLabel });
        }
      } else {
        // id y otros campos simples
        if (!(property in taskData)) taskData[property] = value;
      }

      if (!isValid) {
        const errorProperty = `${property}_error`;
        taskData[errorProperty] = errorMessage;
        errors.push(errorMessage);
      }

      fields.push(fieldText);
    }

    return { fields, taskData, errors };
  }

  private validateRRuleSyntax(rrule: string): void {
    rrulestr(rrule); // Lanza excepción si es inválido
  }

  /**
 * Extrae el blockLink del texto completo.
 * @param text Texto completo de la tarea.
 * @returns El blockLink extraído o una cadena vacía si no se encuentra.
 */
  private extractBlockLink(text: string): string {
    // Buscar la última ocurrencia de ^ en el texto
    const blockLinkMatch = text.match(/\^([a-zA-Z0-9-]+)/);
    if (blockLinkMatch) {
      return blockLinkMatch[0]; // Devuelve el blockLink completo con el ^
    }
    return "";
  }

    /**
   * Convierte el formato de texto de recurrencia de Obsidian a formato RRULE
   * @param recurrenceText Texto de recurrencia en formato Obsidian (ejemplo: "every week")
   * @returns Texto en formato RRULE o null si no se pudo convertir
   */
  private convertToRRuleFormat(recurrenceText: string): string | null {
    // todo: Se debe de implementar un auto compelete para el texto de recurrencia
    // todo: Ejemplo: every 2 weeks until 2023-12-31 count 5 by weekdays
    try {
      let frequency = "";
      let interval = 1;
      let until = "";
      let count = 0;
      let byDay = "";
      
      const text = recurrenceText.toLowerCase().trim();
      
      // Verificar que comience con "every"
      if (!text.startsWith("every")) {
        console.warn("El patrón de recurrencia debe comenzar con 'every'");
        return null;
      }
      
      // Validar formato con expresión regular
      const validPatternRegex = /^every\s+(?:(\d+)\s+)?(day|days|week|weeks|month|months|year|years|weekday|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+.*)?$/i;
      
      if (!validPatternRegex.test(text)) {
        console.warn("Formato de recurrencia inválido");
        return null;
      }
      
      // Extraer frecuencia básica usando palabras completas con límites de palabra
      const timeWords = {
        day: /\b(day|days)\b/,
        week: /\b(week|weeks)\b/,
        month: /\b(month|months)\b/,
        year: /\b(year|years)\b/
      };
      
      if (timeWords.day.test(text)) frequency = "DAILY";
      else if (timeWords.week.test(text)) frequency = "WEEKLY";
      else if (timeWords.month.test(text)) frequency = "MONTHLY";
      else if (timeWords.year.test(text)) frequency = "YEARLY";
      else {
        // Si no es una frecuencia estándar, verificamos si es un día específico
        // que se considera frecuencia semanal
        const dayWords = /\b(weekday|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/;
        if (dayWords.test(text)) {
          frequency = "WEEKLY";
        } else {
          console.warn("Frecuencia no reconocida en el patrón de recurrencia");
          return null;
        }
      }
      
      // Extraer intervalo (cada X días/semanas/etc)
      const intervalMatch = text.match(/every\s+(\d+)\s+/);
      if (intervalMatch && intervalMatch[1]) {
        interval = parseInt(intervalMatch[1], 10);
      }
      
      // Extraer hasta cuándo (until)
      const untilMatch = text.match(/\buntil\s+(\d{4}-\d{2}-\d{2})\b/);
      if (untilMatch && untilMatch[1]) {
        const dateStr = untilMatch[1];
        until = `UNTIL=${dateStr.replace(/-/g, "")}T000000Z`;
      }
      
      // Extraer cuántas veces (count)
      const countMatch = text.match(/\b(\d+)\s+times\b/);
      if (countMatch && countMatch[1]) {
        count = parseInt(countMatch[1], 10);
      }
      
      // Extraer días específicos de la semana
      const weekdays = {
        monday: "MO",
        tuesday: "TU",
        wednesday: "WE",
        thursday: "TH",
        friday: "FR",
        saturday: "SA",
        sunday: "SU",
        weekday: "MO,TU,WE,TH,FR",
        weekend: "SA,SU"
      };
      
      for (const [day, abbr] of Object.entries(weekdays)) {
        // Usamos límites de palabra para evitar coincidencias parciales
        const dayRegex = new RegExp(`\\b${day}\\b`, 'i');
        if (dayRegex.test(text)) {
          byDay = `BYDAY=${abbr}`;
          break;
        }
      }
      
      // Construir la regla RRULE
      let rule = `RRULE:FREQ=${frequency}`;
      if (interval > 1) rule += `;INTERVAL=${interval}`;
      if (until) rule += `;${until}`;
      if (count > 0) rule += `;COUNT=${count}`;
      if (byDay) rule += `;${byDay}`;
      
      //console.log(`Convertido: "${text}" → "${rule}"`);
      return rule;
    } catch (error) {
      console.error("Error al convertir a formato RRULE:", error);
      return null;
    }
  }
}