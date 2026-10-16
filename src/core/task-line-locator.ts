// src/core/task-line-locator.ts
// Helper puro (sin dependencias de Obsidian) para localizar una línea de tarea antes de escribirla
// (v1.1.12, Fase A; ver docs/agenda-tasks/Arquitectura técnica.md §20.3.2).

/**
 * Índice (base 0) de la línea cuyo texto, sin espacios en los extremos, es `expectedText`.
 * Prefiere la línea indicada (`lineNumber`, base 1); si ya no coincide busca en todo el archivo y
 * solo acepta una única coincidencia. Devuelve `null` si no hay ninguna o hay varias.
 */
export function locateTaskLine(lines: string[], lineNumber: number, expectedText: string): number | null {
  const expected = expectedText.trim();
  if (!expected) return null;

  const index = lineNumber - 1;
  if (lines[index]?.trim() === expected) return index;

  let found = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== expected) continue;
    if (found !== -1) return null;
    found = i;
  }
  return found === -1 ? null : found;
}
