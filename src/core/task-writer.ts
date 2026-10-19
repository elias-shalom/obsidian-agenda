// src/core/task-writer.ts
import { App, TFile, normalizePath } from "obsidian";
import { isTaskLine } from "./task-line-fields";
import { locateTaskLine } from "./task-line-locator";

/** Dónde quedó escrita una línea: número (base 1) y texto resultante sin espacios en los extremos. */
export interface TaskLineWrite {
  lineNumber: number;
  text: string;
}

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
   * Reescribe en su lugar una línea de tarea existente, aplicando `transform` solo a esa línea y
   * preservando el resto del archivo intacto. Usado por drag and drop y edición en el lugar
   * (v1.1.4, Fase D). La línea se localiza por `expectedText` (el texto que tenía la tarea cuando
   * se dibujó la vista): se usa `lineNumber` (base 1) si todavía coincide y, si no, la única línea
   * del archivo con ese texto. Devuelve `null` sin modificar nada si el archivo no existe, la
   * línea no aparece o aparece varias veces, o ya no es una tarea (v1.1.12, escritura segura).
   */
  async updateTaskLine(
    filePath: string,
    lineNumber: number,
    expectedText: string,
    transform: (line: string) => string
  ): Promise<TaskLineWrite | null> {
    const normalized = normalizePath(filePath);
    const file = this.app.vault.getAbstractFileByPath(normalized);
    if (!(file instanceof TFile)) return null;

    const content = await this.app.vault.read(file);
    const lines = content.split("\n");
    const index = locateTaskLine(lines, lineNumber, expectedText);
    if (index === null || !isTaskLine(lines[index])) return null;

    lines[index] = transform(lines[index]);
    await this.app.vault.modify(file, lines.join("\n"));
    return { lineNumber: index + 1, text: lines[index].trim() };
  }

  /**
   * Inserta `newLine` una línea arriba de la línea de tarea `expectedText` (localizada igual que en
   * `updateTaskLine()`), sin modificar el resto del archivo. Usado para escribir la siguiente
   * ocurrencia de una tarea recurrente al completarla (v1.1.10, ADR-R1). Devuelve `false` sin
   * modificar nada si no se puede localizar la línea.
   */
  async insertLineAbove(filePath: string, lineNumber: number, expectedText: string, newLine: string): Promise<boolean> {
    const normalized = normalizePath(filePath);
    const file = this.app.vault.getAbstractFileByPath(normalized);
    if (!(file instanceof TFile)) return false;

    const content = await this.app.vault.read(file);
    const lines = content.split("\n");
    const index = locateTaskLine(lines, lineNumber, expectedText);
    if (index === null || !isTaskLine(lines[index])) return false;

    lines.splice(index, 0, newLine);
    await this.app.vault.modify(file, lines.join("\n"));
    return true;
  }
}