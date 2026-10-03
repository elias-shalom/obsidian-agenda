import { DateTime } from 'luxon';

/**
 * Fecha de referencia compartida entre los cinco tipos de vista de calendario (v1.1.9, §9 Arquitectura técnica).
 * Vive en memoria mientras el plugin está cargado; no se persiste entre reinicios (decisión §4.6.7).
 */
let referenceDate: DateTime | null = null;

export function getReferenceDate(): DateTime | null {
  return referenceDate;
}

export function setReferenceDate(date: DateTime): void {
  referenceDate = date;
}
