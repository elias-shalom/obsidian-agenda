// src/core/task-recurrence.ts
// Calcula y construye la siguiente ocurrencia de una tarea recurrente (🔁) al marcarla "Hecho"
// (v1.1.10 — ver docs/agenda-tasks/Modelo de datos.md §11, ADR-R1 a R5, y
// docs/agenda-tasks/Arquitectura técnica.md §16).
import { DateTime } from "luxon";
import { rrulestr } from "rrule";
import { TaskSection } from "../entities/task-section";
import { ITask } from "../types/interfaces";
import { CoreTaskStatus } from "../types/enums";
import { upsertTaskStatus } from "./task-line-fields";

const WHEN_DONE_SUFFIX_REGEX = /\s+when\s+done\s*$/i;
const DATE_FIELD_REGEX: Record<"📅" | "🛫" | "⏳", RegExp> = {
  "📅": /📅\s*(\d{4}-\d{2}-\d{2})/,
  "🛫": /🛫\s*(\d{4}-\d{2}-\d{2})/,
  "⏳": /⏳\s*(\d{4}-\d{2}-\d{2})/,
};
const ID_CHUNK_REGEX = /\s*🆔\s*\S+/;
const DEPENDS_CHUNK_REGEX = /\s*⛔\s*\S+/;

/** `rrule` ancla los patrones `BYDAY`/`BYMONTHDAY` etc. a un `DTSTART`; sin uno explícito, usa
 * el momento de construcción (aprox. "ahora") en vez de la fecha de referencia real de la tarea,
 * lo que hace que `.after(fecha_pasada)` ignore esa fecha y devuelva una ocurrencia relativa a hoy. */
function buildRRuleWithDtStart(rrule: string, from: DateTime): string {
  const dtStart = `DTSTART:${from.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")}`;
  return `${dtStart}\n${rrule}`;
}

/** Calcula la fecha de la siguiente ocurrencia a partir del texto de recurrencia (🔁) y la fecha
 * de referencia (ADR-R2: `scheduled > due > start`, ya resuelta por quien llama). Si el texto
 * termina en `when done`, la fecha base para la regla es hoy en vez de `referenceDate` (ADR-R3).
 * Delega los casos límite (fin de mes/año) en la librería `rrule`. `null` si el texto de
 * recurrencia o la regla resultante son inválidos. */
export function getNextOccurrenceDate(recurrenceText: string, referenceDate: DateTime): DateTime | null {
  const isWhenDone = WHEN_DONE_SUFFIX_REGEX.test(recurrenceText);
  const baseText = recurrenceText.replace(WHEN_DONE_SUFFIX_REGEX, "").trim();

  const rrule = TaskSection.convertToRRuleFormat(baseText);
  if (!rrule) return null;

  const from = (isWhenDone ? DateTime.now() : referenceDate).startOf("day");

  try {
    const rule = rrulestr(buildRRuleWithDtStart(rrule, from));
    const next = rule.after(from.toJSDate(), false);
    return next ? DateTime.fromJSDate(next) : null;
  } catch {
    return null;
  }
}

/** Construye la línea de la siguiente ocurrencia a partir de `originalLine` (ya reiniciada a
 * `Todo`, sin ✅): desplaza cada fecha presente (📅/🛫/⏳) la misma cantidad de días entre
 * `referenceDate` y `nextDate`, preservando su distancia relativa original (ADR-R2), y quita
 * 🆔/⛔ (ADR-R4). */
export function buildNextOccurrenceLine(originalLine: string, referenceDate: DateTime, nextDate: DateTime): string {
  const deltaDays = nextDate.startOf("day").diff(referenceDate.startOf("day"), "days").days;

  let line = originalLine;
  (Object.keys(DATE_FIELD_REGEX) as Array<keyof typeof DATE_FIELD_REGEX>).forEach(emoji => {
    const regex = DATE_FIELD_REGEX[emoji];
    const match = line.match(regex);
    if (!match) return;
    const shifted = DateTime.fromISO(match[1]).plus({ days: deltaDays }).toISODate();
    line = line.replace(regex, `${emoji} ${shifted}`);
  });

  return line.replace(ID_CHUNK_REGEX, "").replace(DEPENDS_CHUNK_REGEX, "").replace(/\s{2,}/g, " ").trimEnd();
}

/** Si `task` tiene recurrencia y el nuevo estado es `Done`, calcula la línea de la siguiente
 * ocurrencia a insertar una línea arriba de la original (ADR-R1). `null` si no aplica (sin
 * recurrencia, sin ninguna fecha presente, o texto/regla de recurrencia inválidos). */
export function buildRecurrenceOccurrence(task: ITask, newStatus: CoreTaskStatus): string | null {
  if (newStatus !== CoreTaskStatus.Done) return null;
  if (!task.flow.repeat) return null;

  const referenceDate = task.date.scheduled ?? task.date.due ?? task.date.start;
  if (!referenceDate) return null;

  const nextDate = getNextOccurrenceDate(task.flow.repeat, referenceDate);
  if (!nextDate) return null;

  const resetLine = upsertTaskStatus(task.line.text, CoreTaskStatus.Todo, "");
  return buildNextOccurrenceLine(resetLine, referenceDate, nextDate);
}
