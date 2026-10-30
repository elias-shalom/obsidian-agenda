// Validación de la ruta de la carpeta de hábitos y creación de su ruta (v1.1.13, S2).
// Módulo puro, sin dependencias de Obsidian: ver docs/agenda-tasks/Arquitectura técnica.md §25.2.

export type HabitFolderInvalidReason = 'absolute' | 'parent' | 'chars';

export type HabitFolderNormalization =
  | { ok: true; path: string }
  | { ok: false; reason: HabitFolderInvalidReason };

export type HabitFolderHint =
  | { state: 'ok' }
  | { state: 'missing'; path: string }
  | { state: 'invalid'; reason: HabitFolderInvalidReason };

// eslint-disable-next-line no-control-regex -- los caracteres de control no son válidos en nombres de carpeta
const INVALID_CHARS = /[:*?"<>|\u0000-\u001f]/;

/** Ruta relativa a la bóveda, con `/` como separador y sin `/` inicial ni final; vacía usa `fallback`. */
export function normalizeHabitFolderPath(input: string, fallback: string): HabitFolderNormalization {
  const unified = input.trim().replace(/\\/g, '/');
  if (!unified) return { ok: true, path: fallback };

  if (unified.startsWith('/') || /^[A-Za-z]:/.test(unified)) return { ok: false, reason: 'absolute' };

  const segments = unified.split('/').map(segment => segment.trim()).filter(segment => segment && segment !== '.');
  if (segments.includes('..')) return { ok: false, reason: 'parent' };
  if (segments.some(segment => INVALID_CHARS.test(segment))) return { ok: false, reason: 'chars' };

  return { ok: true, path: segments.length > 0 ? segments.join('/') : fallback };
}

/** Aviso bajo el campo de Ajustes: sin aviso (`ok`), carpeta que se creará (`missing`) o ruta no válida. */
export function evaluateHabitFolderHint(
  input: string,
  fallback: string,
  folderExists: (path: string) => boolean
): HabitFolderHint {
  const normalized = normalizeHabitFolderPath(input, fallback);
  if (!normalized.ok) return { state: 'invalid', reason: normalized.reason };
  return folderExists(normalized.path) ? { state: 'ok' } : { state: 'missing', path: normalized.path };
}

/** Lo mínimo que necesita `ensureFolderPath()` del vault (permite probarlo sin Obsidian). */
export interface FolderVault {
  /** Qué hay en esa ruta: una carpeta, un archivo o nada. */
  kindAt(path: string): 'folder' | 'file' | null;
  createFolder(path: string): Promise<void>;
}

/** Crea cada segmento de la ruta que falte; falla si un segmento existe como archivo. */
export async function ensureFolderPath(vault: FolderVault, path: string): Promise<void> {
  let current = '';
  for (const segment of path.split('/')) {
    current = current ? `${current}/${segment}` : segment;

    const kind = vault.kindAt(current);
    if (kind === 'folder') continue;
    if (kind === 'file') throw new Error(`"${current}" is a file, not a folder`);

    try {
      await vault.createFolder(current);
    } catch (error) {
      // Una carrera con otra creación no es un error si la carpeta ya está.
      if (vault.kindAt(current) !== 'folder') throw error;
    }
  }
}
