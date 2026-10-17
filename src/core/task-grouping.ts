// src/core/task-grouping.ts
// Agrupado genérico de tareas por campo (v1.1.12, Fase A; ver docs/agenda-tasks/Arquitectura
// técnica.md §20.2). Lo consumen Lista y Tabla y, en v1.1.13, Kanban y Gantt.
import { ITask, GroupField, FolderNode } from "../types/interfaces";
import { CoreTaskStatus } from "../types/enums";

export interface TaskGroup {
  /** Clave estable del grupo (para recordar su estado plegado o su orden). */
  key: string;
  /** Texto a mostrar; localizado si se pasó `translate`. */
  label: string;
  /** Tareas del propio grupo, en el orden recibido (sin las de los hijos). */
  tasks: ITask[];
  /** Subgrupos anidados; solo con `path`. */
  children?: TaskGroup[];
}

/** Estados en orden de flujo de trabajo, con su clave de traducción (el mismo orden que el menú de estado). */
const STATUS_COLUMNS: { status: CoreTaskStatus; labelKey: string }[] = [
  { status: CoreTaskStatus.Todo, labelKey: "status_todo" },
  { status: CoreTaskStatus.InProgress, labelKey: "status_in_progress" },
  { status: CoreTaskStatus.OnHold, labelKey: "status_on_hold" },
  { status: CoreTaskStatus.Done, labelKey: "status_done" },
  { status: CoreTaskStatus.Cancelled, labelKey: "status_cancelled" },
  { status: CoreTaskStatus.nonTask, labelKey: "status_non_task" },
];

/** De mayor a menor; lo que no coincide (`undefined`) va al final. */
const PRIORITY_ORDER = ["highest", "high", "medium", "normal", "low", "lowest"];

const NO_PRIORITY_KEY = "undefined";
const NO_TAG_KEY = "";
const NO_DATE_KEY = "";

/** Árbol de carpetas de las notas de las tareas: `A/B/nota.md` cuelga de `A` → `B`; una nota en la raíz va a «Root». */
export function groupTasksByFolder(tasks: ITask[]): Record<string, FolderNode> {
  const rootFolders: Record<string, FolderNode> = {};

  for (const task of tasks) {
    if (!task.file.path) continue;

    const folders = task.file.path.split("/").slice(0, -1);
    if (folders.length === 0) {
      rootFolders["Root"] ??= { name: "Root", fullPath: "Root", tasks: [], subfolders: {} };
      rootFolders["Root"].tasks.push(task);
      continue;
    }

    let level = rootFolders;
    let currentPath = "";
    folders.forEach((folderName, index) => {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      level[folderName] ??= { name: folderName, fullPath: currentPath, tasks: [], subfolders: {} };
      if (index === folders.length - 1) level[folderName].tasks.push(task);
      level = level[folderName].subfolders;
    });
  }

  return rootFolders;
}

function folderNodeToGroup(node: FolderNode): TaskGroup {
  return {
    key: node.fullPath,
    label: node.name,
    tasks: node.tasks,
    children: Object.values(node.subfolders)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(folderNodeToGroup),
  };
}

/** Agrupa tareas por un valor simple; los grupos salen en el orden que da `order` (claves ausentes, al final por texto). */
function groupByKey(
  tasks: ITask[],
  keyOf: (task: ITask) => string,
  labelOf: (key: string) => string,
  order: (a: string, b: string) => number
): TaskGroup[] {
  const groups = new Map<string, TaskGroup>();
  for (const task of tasks) {
    const key = keyOf(task);
    let group = groups.get(key);
    if (!group) {
      group = { key, label: labelOf(key), tasks: [] };
      groups.set(key, group);
    }
    group.tasks.push(task);
  }
  return [...groups.values()].sort((a, b) => order(a.key, b.key));
}

/**
 * Agrupa `tasks` por `field`. El orden de las tareas dentro de cada grupo es el de entrada: ordénalas antes.
 * - `status`: siempre los 6 estados, en orden de flujo, aunque estén vacíos (destinos de arrastre válidos).
 * - `priority`: de mayor a menor, con «sin prioridad» al final; solo los grupos con tareas.
 * - `dueDate`: por día de vencimiento ascendente, «sin fecha» al final.
 * - `tags`: por la primera etiqueta de la tarea, alfabético, «sin etiqueta» al final.
 * - `path`: árbol de carpetas (`children`), alfabético.
 */
export function groupTasksByField(
  tasks: ITask[],
  field: GroupField,
  translate: (key: string) => string = (key) => key
): TaskGroup[] {
  switch (field) {
    case "status": {
      const groups: TaskGroup[] = STATUS_COLUMNS.map(({ status, labelKey }) => ({
        key: status,
        label: translate(labelKey),
        tasks: [],
      }));
      for (const task of tasks) {
        const group = groups.find(candidate => candidate.key === task.state.status);
        (group ?? groups[0]).tasks.push(task);
      }
      return groups;
    }

    case "priority": {
      const rank = (key: string): number => {
        const index = PRIORITY_ORDER.indexOf(key);
        return index === -1 ? PRIORITY_ORDER.length : index;
      };
      return groupByKey(
        tasks,
        (task) => (PRIORITY_ORDER.includes(task.state.priority) ? task.state.priority : NO_PRIORITY_KEY),
        (key) => translate(key === NO_PRIORITY_KEY ? "no_priority" : key),
        (a, b) => rank(a) - rank(b)
      );
    }

    case "dueDate":
      return groupByKey(
        tasks,
        (task) => task.date.due?.toISODate() ?? NO_DATE_KEY,
        (key) => (key === NO_DATE_KEY ? translate("none") : key),
        (a, b) => (a === NO_DATE_KEY ? 1 : b === NO_DATE_KEY ? -1 : a.localeCompare(b))
      );

    case "tags":
      return groupByKey(
        tasks,
        (task) => task.section.tags[0] ?? NO_TAG_KEY,
        (key) => (key === NO_TAG_KEY ? translate("none") : key),
        (a, b) => (a === NO_TAG_KEY ? 1 : b === NO_TAG_KEY ? -1 : a.localeCompare(b))
      );

    case "path":
      return Object.values(groupTasksByFolder(tasks))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(folderNodeToGroup);
  }
}
