// Novedades al actualizar (v1.1.13): qué versiones mostrar y cuándo. Módulo puro, sin dependencias
// de Obsidian; ver docs/agenda-tasks/Arquitectura técnica.md §19.

/** Versiones con novedades redactadas en los locales (`whats_new.v<x_y_z>`), de la más antigua a la más reciente. */
export const WHATS_NEW_VERSIONS: readonly string[] = ['1.1.13'];

/** Última versión publicada antes de que existiera `lastSeenVersion`: de ahí parten quienes actualizan desde ella. */
export const PRE_WHATS_NEW_VERSION = '1.1.12';

export interface WhatsNewEntry {
  version: string;
  title: string;
  items: string[];
}

export interface UpdateAnnouncementPlan {
  /** Hay que guardar la versión actual como «vista». */
  persist: boolean;
  /** Hay que abrir el modal (si hay entradas que mostrar). */
  show: boolean;
  /** Se muestran las versiones posteriores a esta. */
  since: string;
}

function parseVersion(version: string): number[] {
  return version.split('.').map(part => {
    const value = parseInt(part, 10);
    return Number.isFinite(value) ? value : 0;
  });
}

/** Negativo si `a < b`, 0 si son iguales, positivo si `a > b`. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function whatsNewKey(version: string): string {
  return `whats_new.v${version.replace(/\./g, '_')}`;
}

/** Entradas posteriores a `since` y hasta `current`, de la más reciente a la más antigua. */
export function getWhatsNewEntries(
  since: string,
  current: string,
  translate: (key: string) => string
): WhatsNewEntry[] {
  return WHATS_NEW_VERSIONS
    .filter(version => compareVersions(version, since) > 0 && compareVersions(version, current) <= 0)
    .reverse()
    .map(version => {
      const key = whatsNewKey(version);
      return {
        version,
        title: translate(`${key}.title`),
        items: translate(`${key}.items`).split('\n').map(item => item.trim()).filter(Boolean),
      };
    });
}

/**
 * La versión vista se guarda siempre que cambie (aunque el ajuste esté apagado), para que no se acumule
 * el historial. En una instalación nueva se guarda sin mostrar nada.
 */
export function planUpdateAnnouncement(input: {
  lastSeenVersion: string;
  currentVersion: string;
  isFreshInstall: boolean;
  enabled: boolean;
}): UpdateAnnouncementPlan {
  const since = input.lastSeenVersion || PRE_WHATS_NEW_VERSION;
  if (input.lastSeenVersion === input.currentVersion) return { persist: false, show: false, since };
  if (input.isFreshInstall) return { persist: true, show: false, since };
  return { persist: true, show: input.enabled, since };
}
