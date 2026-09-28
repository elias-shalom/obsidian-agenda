// src/core/task-writer.ts
import { App, TFile, normalizePath } from "obsidian";
import { isTaskLine } from "./task-line-fields";

export class TaskWriter {
  constructor(private app: App) {}

  /**
   * Añade una línea de tarea a un archivo (crea si no existe)
   */
  async appendTaskLine(filePath: string, line: string): Promise<void> {
    const normalized = normalizePath(filePath);
    const existing = this.app.vault.getAbstractFileByPath(normalized);

    if (!existing) {
      await this.app.vault.create(normalized, `${line}\n`);
      return;
    }

    if (!(existing instanceof TFile)) {
      throw new Error(`${filePath} no es un archivo markdown`);
    }

    const content = await this.app.vault.read(existing);
    const nextContent = content.endsWith("\n")
      ? `${content}${line}\n`
      : `${content}\n${line}\n`;

    await this.app.vault.modify(existing, nextContent);
  }

  /**
   * Reescribe en su lugar una línea de tarea existente (localizada por archivo + número de
   * línea, en base 1 como `ITaskLine.number`), aplicando `transform` solo a esa línea y
   * preservando el resto del archivo intacto. Usado por drag and drop y edición en el lugar
   * (v1.1.4, Fase D). Devuelve `false` sin modificar nada si el archivo no existe o la línea
   * indicada ya no es una tarea (p. ej. el archivo cambió entre el render y el drop).
   */
  async updateTaskLine(filePath: string, lineNumber: number, transform: (line: string) => string): Promise<boolean> {
    const normalized = normalizePath(filePath);
    const file = this.app.vault.getAbstractFileByPath(normalized);
    if (!(file instanceof TFile)) return false;

    const content = await this.app.vault.read(file);
    const lines = content.split("\n");
    const index = lineNumber - 1;
    const currentLine = lines[index];
    if (currentLine === undefined || !isTaskLine(currentLine)) return false;

    lines[index] = transform(currentLine);
    await this.app.vault.modify(file, lines.join("\n"));
    return true;
  }
}