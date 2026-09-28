// src/core/task-line-fields.ts
// Helpers puros (sin dependencias de Obsidian) para insertar/actualizar campos
// de una línea de tarea en formato emoji. Usados por el menú de inserción
// del editor (v1.1.4, Fase B — ver docs/agenda-tasks/Arquitectura técnica.md §6).
import { TaskSection } from "../entities/task-section";

const BLOCK_LINK_TRAIL_REGEX = /\s*\^[a-zA-Z0-9-]+\s*$/;
const DATE_CHUNK_REGEX: Record<"📅" | "🛫", RegExp> = {
  "📅": /📅\s*\d{4}-\d{2}-\d{2}/,
  "🛫": /🛫\s*\d{4}-\d{2}-\d{2}/,
};
const SCHEDULED_CHUNK_REGEX = /⏳\s*\d{4}-\d{2}-\d{2}(?:\s*🕐\s*[0-2]\d:[0-5]\d)?(?:\s*⏱️\s*\d+m)?/;
const SCHEDULED_PARSE_REGEX = /⏳\s*(\d{4}-\d{2}-\d{2})(?:\s*🕐\s*([0-2]\d:[0-5]\d))?(?:\s*⏱️\s*(\d+)m)?/;
const PRIORITY_CHUNK_REGEX = /(?:⏬|🔽|🔼|⏫|🔺)\s*/;

export type PriorityEmoji = "⏬" | "🔽" | "🔼" | "⏫" | "🔺";

export interface ScheduledParts {
  date: string;
  time: string | null;
  duration: number | null;
}

/** Verifica si el texto de una línea matchea el formato de tarea (instancia fresca, sin estado del flag `g`). */
export function isTaskLine(line: string): boolean {
  const regex = new RegExp(TaskSection.taskFormatRegex.source);
  return regex.test(line);
}

function stripTrailingBlockLink(line: string): { body: string; blockLink: string } {
  const match = line.match(BLOCK_LINK_TRAIL_REGEX);
  if (!match || match.index === undefined) return { body: line, blockLink: "" };
  return { body: line.slice(0, match.index), blockLink: match[0] };
}

function appendChunk(line: string, chunk: string): string {
  const { body, blockLink } = stripTrailingBlockLink(line);
  const trimmedBody = body.trimEnd();
  return `${trimmedBody} ${chunk}${blockLink}`;
}

function removeChunk(line: string, regex: RegExp): string {
  return line.replace(regex, "").replace(/\s{2,}/g, " ").trimEnd();
}

/** Inserta o reemplaza la fecha de `due`/`start` (siempre día completo, sin hora — ADR-T1). */
export function upsertSimpleDate(line: string, emoji: "📅" | "🛫", isoDate: string): string {
  const withoutField = removeChunk(line, DATE_CHUNK_REGEX[emoji]);
  return appendChunk(withoutField, `${emoji} ${isoDate}`);
}

/** Extrae la fecha/hora/duración de `⏳ scheduled` ya presentes en la línea, si las hay. */
export function parseScheduledChunk(line: string): ScheduledParts | null {
  const match = line.match(SCHEDULED_PARSE_REGEX);
  if (!match) return null;
  return {
    date: match[1],
    time: match[2] ?? null,
    duration: match[3] ? Number(match[3]) : null,
  };
}

function buildScheduledChunk(parts: ScheduledParts): string {
  let chunk = `⏳ ${parts.date}`;
  if (parts.time) chunk += ` 🕐 ${parts.time}`;
  if (parts.time && parts.duration) chunk += ` ⏱️ ${parts.duration}m`;
  return chunk;
}

function replaceScheduledChunk(line: string, parts: ScheduledParts): string {
  const withoutField = removeChunk(line, SCHEDULED_CHUNK_REGEX);
  return appendChunk(withoutField, buildScheduledChunk(parts));
}

/** Inserta o reemplaza solo la fecha de `scheduled`, preservando hora/duración ya existentes. */
export function upsertScheduledDate(line: string, isoDate: string): string {
  const existing = parseScheduledChunk(line);
  return replaceScheduledChunk(line, { date: isoDate, time: existing?.time ?? null, duration: existing?.duration ?? null });
}

/** Inserta o reemplaza la hora (🕐) de `scheduled`. Requiere que ya exista una fecha (`ok: false` si no). */
export function upsertScheduledTime(line: string, time: string): { line: string; ok: boolean } {
  const existing = parseScheduledChunk(line);
  if (!existing) return { line, ok: false };
  return { line: replaceScheduledChunk(line, { ...existing, time }), ok: true };
}

/** Inserta o reemplaza la duración (⏱️, modo bloque). Requiere que ya exista una hora (`ok: false` si no — ADR-T2). */
export function upsertScheduledDuration(line: string, minutes: number): { line: string; ok: boolean } {
  const existing = parseScheduledChunk(line);
  if (!existing || !existing.time) return { line, ok: false };
  return { line: replaceScheduledChunk(line, { ...existing, duration: minutes }), ok: true };
}

/** Inserta o reemplaza el emoji de prioridad de la tarea. */
export function upsertPriority(line: string, emoji: PriorityEmoji): string {
  const withoutField = removeChunk(line, PRIORITY_CHUNK_REGEX);
  return appendChunk(withoutField, emoji);
}

/** Quita el emoji de prioridad de la tarea, si existe. */
export function clearPriority(line: string): string {
  return removeChunk(line, PRIORITY_CHUNK_REGEX);
}
