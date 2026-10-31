// src/core/kanban-collapse.ts
// Plegado de las columnas del tablero Kanban (v1.1.13, Fase B2; ver docs/agenda-tasks/Arquitectura
// técnica.md §20.8). Módulo puro, sin dependencias de Obsidian.

/** Lo que el usuario eligió a mano para una columna; sin elección manda el valor por defecto. */
export type CollapseChoice = 'collapsed' | 'expanded';

const KEY_PREFIX = 'obsidian-agenda-kanban-collapsed';

/** Clave de almacenamiento: la elección vale para esa columna dentro de ese agrupado. */
export function collapseStorageKey(group: string, columnKey: string): string {
  return `${KEY_PREFIX}:${group}:${columnKey}`;
}

/** Lee lo guardado; cualquier otro valor cuenta como «sin elección». */
export function parseCollapseChoice(raw: unknown): CollapseChoice | undefined {
  return raw === 'collapsed' || raw === 'expanded' ? raw : undefined;
}

/** La elección del usuario manda; sin ella, una columna sin tareas arranca plegada. */
export function resolveCollapsed(taskCount: number, choice: CollapseChoice | undefined): boolean {
  return choice ? choice === 'collapsed' : taskCount === 0;
}
