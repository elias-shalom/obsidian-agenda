import { OnCompletion } from "../types/enums.ts";

export class TaskSection {
  header: string; // Representa el encabezado de la tarea
  description: string; // Representa la descripción de la tarea
  tasksFields: string[]; // Representa los campos específicos de la tarea como un arreglo de strings

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
  headerRegex: RegExp;
  taskFormatRegex: RegExp;
  iconRegex: RegExp;

  constructor() {
      // Inicializar las propiedades como cadenas vacías
      this.header = "";
      this.description = "";
      this.tasksFields = [];        
      this.headerRegex = /^[\t ]*(>*)\s*(-|\*|\+|\d+[.)]) {0,4}\[(.)\] {0,4}/;
      this.taskFormatRegex = /^[\t ]*(>*)\s*(-|\*|\+|\d+[.)]) {0,4}\[(.)\] {0,4}\S.+/g;
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
          this.description = this.extractDescription(remainingText);
          remainingText = this.removeText(remainingText, this.description);
          this.tasksFields = this.extractTasksFields(remainingText);
      } catch (error) {
          // Si ocurre un error, inicializar todo como vacío
          console.warn("Error al inicializar TaskSection:", error.message);
          this.header = "";
          this.description = "";
          this.tasksFields = [];
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
   * @returns Un arreglo de cadenas, donde cada entrada comienza con un ícono.
   */
  private extractTasksFields(text: string): string[] {
    const fields: string[] = [];
    const iconDateRegex = /(📅|🛫|⏳|✅|❌|➕)\s*(\d{4}-\d{2}-\d{2})\s*$/g // Ícono seguido de una fecha en formato YYYY-MM-DD
    const iconEmptyRegex = /(⏬|⏫|🔼|🔽|🔺)\s*$/g; // Ícono seguido solo por espacios o tabulaciones
    const iconCompletionRegex = /🏁\s*(keep|delete)/g; // Ícono 🏁 seguido de valores válidos de OnCompletion
    const otherIconsRegex = /(🔁|🆔|⛔)\s*(.*)/g; // Otros íconos que no requieren validación adicional

    const matches = Array.from(text.matchAll(this.iconRegex)); // Encontrar todas las coincidencias de íconos

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const matchIndex = match.index!;
      const nextMatchIndex = i + 1 < matches.length ? matches[i + 1].index! : text.length;

      // Extraer el texto desde el inicio del ícono actual hasta justo antes del siguiente ícono
      let fieldText = text.slice(matchIndex, nextMatchIndex).trim();
      console.log("a Field text extracted:", fieldText); // Debugging line

      const icon = match[0]; // Obtener el ícono actual
      switch (icon) {
        case "📅":
        case "🛫":
        case "⏳":
        case "✅":
        case "❌":
        case "➕":
          // Validar que el texto contenga una fecha válida
          if (!fieldText.match(iconDateRegex)) {
              console.log("b Field text :", fieldText);
              fieldText = `${fieldText} @invalid El ícono ${icon} no está seguido por una fecha válida o contiene texto adicional.`;
          }
          break;
        case "⏬":
        case "⏫":
        case "🔼":
        case "🔽":
        case "🔺":
          // Validar que el texto contenga solo espacios o tabulaciones
          if (!fieldText.match(iconEmptyRegex)) {
            fieldText = `${fieldText} @invalid El ícono ${icon} no está seguido solo por espacios o tabulaciones.`;
          }
          break;
        case "🏁":
          // Validar que el texto contenga un valor válido de OnCompletion
          if (!fieldText.match(iconCompletionRegex)) {
              fieldText = `${fieldText} @invalid El ícono ${icon} no está seguido por un valor válido de OnCompletion.`;
          }
          break;
        default:
          break;
      }

      // Agregar el texto extraído al arreglo
      fields.push(fieldText);
    }
    return fields;
  }
}