import { OnCompletion, TaskPriority } from "../types/enums.ts";
import { I18n } from "../core/i18n";
import { RRule, rrulestr } from 'rrule';

export class TaskSection {
  header: string; // Representa el encabezado de la tarea
  description: string; // Representa la descripción de la tarea
  tasksFields: string[]; // Representa los campos específicos de la tarea como un arreglo de strings
  blockLink: string;
  taskData: Record<string, any> = {};

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
  private iconRegex: RegExp;

  // Nueva propiedad estática para el formato de tareas
  static readonly taskFormatRegex: RegExp = /^[\t ]*(>*)\s*(-|\*|\+|\d+[.)]) {0,4}\[(.)\] {0,4}\S.+/g;

  private readonly iconMapping = {
    // Iconos de fechas
    "📅": { type: "date", property: "dueDate", format: "YYYY-MM-DD" },
    "🛫": { type: "date", property: "startDate", format: "YYYY-MM-DD" },
    "⏳": { type: "date", property: "scheduledDate", format: "YYYY-MM-DD" },
    "✅": { type: "date", property: "doneDate", format: "YYYY-MM-DD" },
    "❌": { type: "date", property: "cancelledDate", format: "YYYY-MM-DD" },
    "➕": { type: "date", property: "createdDate", format: "YYYY-MM-DD" },
    
    // Iconos de prioridad con nombre legible
    "⏬": { type: "priority", property: "priority", value: TaskPriority.Lowest, name: "lowest" },
    "🔽": { type: "priority", property: "priority", value: TaskPriority.Low, name: "low" },
    "🔼": { type: "priority", property: "priority", value: TaskPriority.Medium, name: "medium" },
    "⏫": { type: "priority", property: "priority", value: TaskPriority.High, name: "high" },
    "🔺": { type: "priority", property: "priority", value: TaskPriority.Highest, name: "highest" },
    
    // Otros iconos
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
      this.iconRegex = /📅|🛫|⏳|✅|❌|➕|⏬|⏫|🔼|🔽|🔺|🔁|🆔|⛔|🏁/g;
  iconRegex: RegExp;

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
          console.warn(this.i18n.t('errors.initializeTaskSection', { error: error.message }));
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
  let textWithoutTags = text.replace(/#[a-zA-Z0-9_\-\/]+\b/g, '');

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

    // Buscar todas las coincidencias de los íconos
    const matches = text.matchAll(this.iconRegex);

    for (const match of matches) {
        const index = match.index!;
        if (index < smallestIndex) {
            smallestIndex = index; // Actualizar el índice más pequeño
        }
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
   * @param text Texto restante después de eliminar el encabezado.
   * @returns Un objeto que contiene el arreglo de campos y los datos estructurados extraídos.
   */
  private extractTasksFields(text: string): { fields: string[], taskData: Record<string, any> } {
    const fields: string[] = [];
    const taskData: Record<string, any> = {};
    const errors: string[] = [];

    const iconDateRegex = /(📅|🛫|⏳|✅|❌|➕)\s*(\d{4}-\d{2}-\d{2})\s*$/g // Ícono seguido de una fecha en formato YYYY-MM-DD
    const iconEmptyRegex = /(⏬|⏫|🔼|🔽|🔺)\s*$/g; // Ícono seguido solo por espacios o tabulaciones
    const iconCompletionRegex = /🏁\s*(keep|delete)/g; // Ícono 🏁 seguido de valores válidos de OnCompletion
    const iconBlockedRegex = /⛔\s*(.*)/g; // Ícono bloqueado seguido de una cadena de identificadores
    const iconRecurrenceRegex = /🔁\s*(.*)/g; // Ícono de recurrencia seguido de una cadena de texto
    const idIconsRegex = /🆔\s*(.*)/g; // Otros íconos que no requieren validación adicional

    const matches = Array.from(text.matchAll(this.iconRegex)); // Encontrar todas las coincidencias de íconos

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const matchIndex = match.index!;
      const nextMatchIndex = i + 1 < matches.length ? matches[i + 1].index! : text.length;

      // Extraer el texto desde el inicio del ícono actual hasta justo antes del siguiente ícono
      let fieldText = text.slice(matchIndex, nextMatchIndex).trim();
      
      const icon = match[0]; // Obtener el ícono actual

      // Obtener la configuración del icono desde el mapeo
      const iconConfig = this.iconMapping[icon];

      if (iconConfig) {
        let isValid = true;
        let extractedValue: string | null = null;
        let errorMessage = "";

        switch (iconConfig.type) {
          case "date":
            // Reiniciar la expresión regular (debido a 'g')
            iconDateRegex.lastIndex = 0;

            // Verificar si el campo es válido usando la expresión regular específica
            if (iconDateRegex.test(fieldText)) {
              // Extraer la fecha YYYY-MM-DD
              const dateMatch = fieldText.match(/\d{4}-\d{2}-\d{2}/);
              if (dateMatch) {
                extractedValue = dateMatch[0];
              }
            } else {
              isValid = false;
              errorMessage = this.i18n.t('errors.invalidDate', { icon: icon });
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;

          case "priority":
            // Reiniciar la expresión regular (debido a 'g')
            iconEmptyRegex.lastIndex = 0;

            // Verificar si el campo es válido usando la expresión regular específica
            if (iconEmptyRegex.test(fieldText)) {
              extractedValue = iconConfig.name || "normal";
            } else {
              isValid = false;
              errorMessage = this.i18n.t('errors.invalidPriority', { icon: icon });
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;

          case "completion":
            // Reiniciar la expresión regular (debido a 'g')
            iconCompletionRegex.lastIndex = 0;

            // Verificar si el campo es válido usando la expresión regular específica
            if (iconCompletionRegex.test(fieldText)) {
              const completionMatch = fieldText.match(/keep|delete/i);
              if (completionMatch) {
                extractedValue = completionMatch[0].toLowerCase();
              }
            } else {
              isValid = false;
              errorMessage = this.i18n.t('errors.invalidCompletion', { icon: icon });;
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;
          case "blocked":
            // Reiniciar la expresión regular (debido a 'g')
            iconBlockedRegex.lastIndex = 0;

            if (iconBlockedRegex.test(fieldText) ) {
              extractedValue = fieldText.substring(icon.length).trim();
              const dependencies = extractedValue.split(',').map(dep => dep.trim()).filter(dep => dep.length > 0);
              
              // Asignar como array en lugar de string
              if (dependencies.length > 0) {
                taskData.dependsOn = dependencies;
              }
            } else {
              isValid = false;
              errorMessage = this.i18n.t('errors.invalidDependency', { icon: icon });
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;
          case "recurrence":
            // ! Error en la recurrencia no invalida la tarea
            // Reiniciar la expresión regular (debido a 'g')
            iconRecurrenceRegex.lastIndex = 0;

            if (iconRecurrenceRegex.test(fieldText)) {
              const recurrenceText = fieldText.substring(icon.length).trim();

              try {
                // Convertir texto de recurrencia al formato RRULE
                const rruleText = this.convertToRRuleFormat(recurrenceText);               

                if (rruleText) {
                  // Intentar crear un objeto RRule para validar
                  const rule = rrulestr(rruleText);
                  // Si llegamos aquí, el patrón es válido
                  extractedValue = recurrenceText;
                } else {
                  throw new Error("No se pudo convertir al formato RRULE");
                }
              } catch (e) {                
                errorMessage = this.i18n.t('errors.invalidRecurrencePattern', { icon });
                fieldText = `${fieldText} @${errorMessage}`;
              }
            } else {              
              errorMessage = this.i18n.t('errors.invalidRecurrence', { icon });
              fieldText = `${fieldText} @${errorMessage}`;
            }
            break;
          case "id":
            // Reiniciar la expresión regular (debido a 'g')
            idIconsRegex.lastIndex = 0;

            // Para otros tipos de iconos, usar la expresión regular de otros iconos
            const otherMatch = idIconsRegex.exec(fieldText);
            if (otherMatch && otherMatch[2] !== undefined) {
              extractedValue = otherMatch[2].trim();
            } else {
              extractedValue = fieldText.substring(icon.length).trim();
            }
            break;
        }

        // Si el campo es válido y tiene una propiedad definida, guardarla en taskData
        if (isValid && iconConfig.property) {
          taskData[iconConfig.property] = extractedValue;
        } else if (!isValid) {
          // Si el campo es inválido, guardar el error en taskData
          const errorProperty = `${iconConfig.property || 'field'}_error`;
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

    return { fields, taskData };
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
      
      console.log(`Convertido: "${text}" → "${rule}"`);
      return rule;
    } catch (error) {
      console.error("Error al convertir a formato RRULE:", error);
      return null;
    }
  }
}