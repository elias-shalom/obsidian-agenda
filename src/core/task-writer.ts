// src/core/task-writer.ts
import { App, TFile, normalizePath } from "obsidian";

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
}