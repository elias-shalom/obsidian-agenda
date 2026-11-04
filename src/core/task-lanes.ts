// src/core/task-lanes.ts
// Núcleo de los carriles (Lanes / Filas; v1.1.14, Fase L1; ver docs/agenda-tasks/Especificación de vistas.md
// §20 y Arquitectura técnica.md §29). Un carril parte la vista en varios widgets independientes, uno por
// valor de un campo. Módulo puro, sin dependencias de Obsidian: lo comparten Lista, Tabla, Kanban y Gantt.
import { ITask, TaskGroupViewModel } from '../types/interfaces';
import { getStatusOptions } from './task-status-options';
import { PRIORITY_ORDER, groupTasksForView, toGroupViewModels } from './task-grouping';
import { ROOT_AREA, getAreaColor, normalizeAreaName, normalizeSubAreaPath, resolveTaskArea } from './area';

export type LaneField = 'area' | 'subArea' | 'status' | 'priority' | 'tag' | 'folder' | 'file';

/** «Ninguno»: sin carriles, la vista se dibuja como siempre. */
export const LANE_NONE = '';

/** Opciones del chip `Lanes`, con la clave de traducción de su nombre; «Ninguno» es la cadena vacía. */
export const LANE_OPTIONS: readonly { value: LaneField | typeof LANE_NONE; labelKey: string }[] = [
  { value: LANE_NONE, labelKey: 'none' },
  { value: 'area', labelKey: 'area' },
  { value: 'subArea', labelKey: 'lane_sub_area' },
  { value: 'status', labelKey: 'task_status' },
  { value: 'priority', labelKey: 'task_priority' },
  { value: 'tag', labelKey: 'tags' },
  { value: 'folder', labelKey: 'folder' },
  { value: 'file', labelKey: 'file' },
];

export function isLaneField(value: unknown): value is LaneField {
  return LANE_OPTIONS.some(option => option.value !== LANE_NONE && option.value === value);
}

export interface Lane {
  /** Estable entre dibujados y distinto en cada carril del campo; sirve de clave de plegado. */
  key: string;
  label: string;
  /** En el orden recibido: `buildLanes()` no reordena las tareas. */
  tasks: ITask[];
  /** Solo los carriles de área y sub-área llevan el color de su área. */
  color?: string;
}

type Translate = (key: string) => string;

/** Un carril en construcción, con lo que hace falta para ordenarlo. */
interface LaneDraft extends Lane {
  /** 1 = al final siempre («Raíz» del vault y «Sin etiqueta»). */
  rank: number;
  /** Posición lógica (Estado y Prioridad); sin ella, solo cuenta el texto. */
  order: number;
  /** Textos que desempatan, de más a menos importante; el vacío va primero. */
  sort: string[];
}

const compareText = (a: string, b: string): number => a.localeCompare(b, undefined, { sensitivity: 'base' });

function compareDrafts(a: LaneDraft, b: LaneDraft): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (a.order !== b.order) return a.order - b.order;
  for (let index = 0; index < Math.max(a.sort.length, b.sort.length); index += 1) {
    const result = compareText(a.sort[index] ?? '', b.sort[index] ?? '');
    if (result !== 0) return result;
  }
  return 0;
}

/**
 * Clave de un área: su nombre normalizado, con el nombre en minúsculas como respaldo. `normalizeAreaName()`
 * descarta lo que no es ASCII, y una carpeta llamada solo con kanji o con emojis daría una clave vacía que
 * fundiría áreas distintas en un carril.
 */
const areaKey = (name: string): string => normalizeAreaName(name) || name.toLowerCase();
const subAreaKey = (path: string): string => normalizeSubAreaPath(path) || path.toLowerCase();

/** Carpetas de la nota, de la raíz hacia dentro; vacío si está en la raíz del vault. */
const foldersOf = (task: ITask): string[] =>
  (task.file.path ?? '').replace(/\\/g, '/').split('/').filter(Boolean).slice(0, -1);

/** Reparte `tasks` en los carriles de `field`; cada campo decide en qué carril o carriles cae una tarea. */
function placeTasks(tasks: ITask[], field: LaneField, translate: Translate): LaneDraft[] {
  const lanes = new Map<string, LaneDraft>();
  const put = (task: ITask, key: string, make: () => Omit<LaneDraft, 'key' | 'tasks'>): void => {
    let lane = lanes.get(key);
    if (!lane) {
      lane = { key, tasks: [], ...make() };
      lanes.set(key, lane);
    }
    if (!lane.tasks.includes(task)) lane.tasks.push(task);
  };

  const statusOptions = getStatusOptions();

  for (const task of tasks) {
    switch (field) {
      case 'area': {
        const { area } = resolveTaskArea(task.file.path ?? '');
        if (area === '') {
          put(task, ROOT_AREA, () => ({ label: translate('area_root'), rank: 1, order: 0, sort: [] }));
        } else {
          put(task, areaKey(area), () => ({ label: area, color: getAreaColor(area), rank: 0, order: 0, sort: [area] }));
        }
        break;
      }

      case 'subArea': {
        const { area, subArea } = resolveTaskArea(task.file.path ?? '');
        if (area === '') {
          put(task, ROOT_AREA, () => ({ label: translate('area_root'), rank: 1, order: 0, sort: [] }));
        } else if (subArea === '') {
          // Las notas directamente en la carpeta del área van primero dentro de su área
          put(task, `${areaKey(area)}/`, () => ({
            label: `${area} › ${translate('area_root')}`, color: getAreaColor(area), rank: 0, order: 0, sort: [area, ''],
          }));
        } else {
          put(task, `${areaKey(area)}/${subAreaKey(subArea)}`, () => ({
            label: `${area} › ${subArea.split('/').join(' › ')}`, color: getAreaColor(area), rank: 0, order: 0, sort: [area, subArea],
          }));
        }
        break;
      }

      case 'status': {
        // Un símbolo desconocido se lee como Pendiente, como en el agrupado (`groupTasksByField`)
        const index = Math.max(0, statusOptions.findIndex(option => String(option.status) === task.state.status));
        const option = statusOptions[index];
        put(task, option.name, () => ({ label: translate(option.labelKey), rank: 0, order: index, sort: [] }));
        break;
      }

      case 'priority': {
        const known = PRIORITY_ORDER.indexOf(task.state.priority);
        const index = known === -1 ? PRIORITY_ORDER.length : known;
        const key = known === -1 ? 'none' : task.state.priority;
        put(task, key, () => ({ label: translate(known === -1 ? 'no_priority' : key), rank: 0, order: index, sort: [] }));
        break;
      }

      case 'tag': {
        const tags = task.section.tags ?? [];
        if (tags.length === 0) {
          put(task, '', () => ({ label: translate('lane_no_tag'), rank: 1, order: 0, sort: [] }));
        }
        // Las etiquetas de Obsidian no distinguen mayúsculas; la tarea entra una sola vez por carril
        for (const tag of tags) {
          put(task, tag.toLowerCase(), () => ({ label: tag, rank: 0, order: 0, sort: [tag] }));
        }
        break;
      }

      case 'folder': {
        const folders = foldersOf(task);
        if (folders.length === 0) {
          put(task, ROOT_AREA, () => ({ label: translate('area_root'), rank: 1, order: 0, sort: [] }));
        } else {
          const path = folders.join('/');
          put(task, path, () => ({ label: path, rank: 0, order: 0, sort: [path] }));
        }
        break;
      }

      case 'file': {
        const path = task.file.path ?? '';
        put(task, path, () => ({ label: task.file.name, rank: 0, order: 0, sort: [task.file.name, path] }));
        break;
      }
    }
  }

  return [...lanes.values()];
}

/** Dos notas con el mismo nombre en carpetas distintas son carriles distintos: se distinguen por su carpeta. */
function disambiguateFileLanes(lanes: LaneDraft[], tasks: ITask[]): void {
  const counts = new Map<string, number>();
  for (const lane of lanes) counts.set(lane.label, (counts.get(lane.label) ?? 0) + 1);

  for (const lane of lanes) {
    if ((counts.get(lane.label) ?? 0) < 2) continue;
    const folder = foldersOf(tasks.find(task => (task.file.path ?? '') === lane.key) as ITask).join('/');
    if (folder) lane.label = `${lane.label} (${folder})`;
  }
}

/**
 * Parte `tasks` en carriles según `field`; «Ninguno» (o un campo desconocido) devuelve una lista vacía y la
 * vista se dibuja como siempre.
 * - Una tarea cae en un solo carril, salvo por etiqueta, donde cae en cada una de las suyas.
 * - Los carriles sin tareas no salen, tampoco en Estado y Prioridad.
 * - Orden: Estado en el orden de flujo y Prioridad de mayor a menor; el resto, alfabético sin distinguir
 *   mayúsculas. «Raíz» y «Sin etiqueta» van siempre al final. En sub-área, las notas directas del área van
 *   las primeras de su área.
 * - Las tareas de cada carril conservan el orden recibido: ordénalas antes (`sortTasksByColumn()`).
 */
export function buildLanes(tasks: ITask[], field: string, translate: Translate = key => key): Lane[] {
  if (!isLaneField(field)) return [];

  const drafts = placeTasks(tasks, field, translate);
  if (field === 'file') disambiguateFileLanes(drafts, tasks);

  return drafts
    .sort(compareDrafts)
    .map(({ key, label, tasks: laneTasks, color }) => (color === undefined ? { key, label, tasks: laneTasks } : { key, label, tasks: laneTasks, color }));
}

// --- Carriles listos para dibujar (Lista y Tabla) ------------------------------------------------

/** Un carril de Lista o Tabla: su encabezado plegable y, dentro, las tareas ya agrupadas por `Group`. */
export interface LaneViewModel {
  label: string;
  /** Clave del plegado en `localStorage`; lleva el campo como prefijo para no perder lo plegado al cambiar de campo. */
  storageKey: string;
  color?: string;
  /** Tareas del carril; con etiquetas, la suma de los carriles puede superar el total de tareas. */
  count: number;
  /** Vacío si `Group` es Ninguno: entonces se dibuja `tasks` sin cabeceras. */
  groups: TaskGroupViewModel[];
  tasks: ITask[];
}

/**
 * Los carriles de `field` con el agrupado `group` aplicado dentro de cada uno. Las tareas deben llegar ya
 * filtradas y ordenadas: ni los carriles ni su contenido se reordenan aquí. Sin campo de carril devuelve `[]`.
 */
export function toLaneViewModels(tasks: ITask[], field: string, group: string, translate: Translate = key => key): LaneViewModel[] {
  return buildLanes(tasks, field, translate).map(lane => {
    const model: LaneViewModel = {
      label: lane.label,
      storageKey: `lane:${field}:${lane.key}`,
      count: lane.tasks.length,
      groups: toGroupViewModels(groupTasksForView(lane.tasks, group, translate), group),
      tasks: lane.tasks,
    };
    if (lane.color !== undefined) model.color = lane.color;
    return model;
  });
}

// --- Exclusión entre Lanes y Group ---------------------------------------------------------------

/**
 * Qué «campo» ocupa cada opción. Chocan las opciones de la misma familia: Estado con Estado, Prioridad con
 * Prioridad, Etiqueta con Etiquetas, Archivo con Archivo, y toda la familia de ruta (Área, Sub-área y
 * Carpeta) entre sí, porque `Group: Área` es un árbol que ya anida las sub-áreas y `Group: Carpeta` agrupa
 * por la primera carpeta, igual que `Lanes: Área`. Vencimiento y «Ninguno» no tienen familia.
 */
const GROUP_FAMILY: Record<string, string> = {
  status: 'status', priority: 'priority', tags: 'tag', area: 'path', folder: 'path', file: 'file',
};
const LANE_FAMILY: Record<LaneField, string> = {
  status: 'status', priority: 'priority', tag: 'tag', area: 'path', subArea: 'path', folder: 'path', file: 'file',
};

const groupFamily = (group: string): string | undefined => GROUP_FAMILY[group];
const laneFamily = (lanes: string): string | undefined => (isLaneField(lanes) ? LANE_FAMILY[lanes] : undefined);

/** ¿La opción de `Group` choca con el campo que usan los carriles? Si sí, se ofrece atenuada. */
export function isGroupOptionInUse(groupOption: string, lanes: string): boolean {
  const family = laneFamily(lanes);
  return family !== undefined && family === groupFamily(groupOption);
}

/** ¿La opción de `Lanes` choca con el campo que usa `Group`? Si sí, se ofrece atenuada. */
export function isLaneOptionInUse(laneOption: string, group: string): boolean {
  const family = laneFamily(laneOption);
  return family !== undefined && family === groupFamily(group);
}

export interface LaneAxes {
  group: string;
  lanes: string;
}

export interface AxisChange extends LaneAxes {
  /** La elección chocaba y la vista no permite resolverla sola: no se aplicó. */
  blocked: boolean;
}

export interface AxisConflictOptions {
  /** Kanban: las columnas son obligatorias y no existe «Ninguno», así que la opción en uso no se puede elegir. */
  requiresGroup?: boolean;
  /** Agrupado que la vista usa con `group` vacío (Lista: `'area'`; Tabla: `'none'`), para comparar con el valor real. */
  defaultGroup?: string;
}

/**
 * Ajusta un estado guardado que repite campo entre Lanes y Group (Lista y Tabla comparten el estado, pero cada
 * una tiene su agrupado por defecto: Lanes: Área en la Tabla choca con el Área por defecto de la Lista). Gana
 * Lanes, que es la elección explícita, y el agrupado pasa a Ninguno. Devuelve el agrupado efectivo.
 */
export function repairAxes(axes: LaneAxes, defaultGroup: string): LaneAxes {
  const group = axes.group || defaultGroup;
  return { lanes: axes.lanes, group: isGroupOptionInUse(group, axes.lanes) ? 'none' : group };
}

/**
 * Aplica la elección de un chip. Sin choque se aplica tal cual. Con choque: en Kanban (`requiresGroup`) no se
 * permite y todo queda igual; en Lista, Tabla y Gantt se acepta y el **otro** chip pasa a Ninguno
 * (`group: 'none'` escrito de forma explícita, porque `''` significa «el de la vista» y reintroduciría el choque).
 */
export function resolveAxisConflict(
  current: LaneAxes,
  pick: { axis: 'lanes' | 'group'; value: string },
  options: AxisConflictOptions = {},
): AxisChange {
  const { requiresGroup = false, defaultGroup = '' } = options;
  const effectiveGroup = (group: string): string => group || defaultGroup;

  if (pick.axis === 'lanes') {
    const next = { group: current.group, lanes: pick.value };
    if (!isLaneOptionInUse(pick.value, effectiveGroup(current.group))) return { ...next, blocked: false };
    return requiresGroup ? { ...current, blocked: true } : { group: 'none', lanes: pick.value, blocked: false };
  }

  const next = { group: pick.value, lanes: current.lanes };
  if (!isGroupOptionInUse(effectiveGroup(pick.value), current.lanes)) return { ...next, blocked: false };
  return requiresGroup ? { ...current, blocked: true } : { group: pick.value, lanes: LANE_NONE, blocked: false };
}
