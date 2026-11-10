// src/core/area.ts
// Áreas y sub-áreas (v1.1.12, Fase AR1; ver docs/agenda-tasks/Arquitectura técnica.md §22).
// Módulo puro, sin dependencias de Obsidian. Compartido por Hábitos (área configurable) y
// tareas (el área es la ubicación física de la nota).

/** Áreas "conocidas" (compatibilidad con la paleta/i18n original); no limita qué carpetas son válidas */
export const HABIT_AREAS: readonly string[] = [
  "daily-plan", "emotional", "financial", "intellectual", "physical",
  "professional", "recreational", "relationship", "spiritual", "temporal",
];

/** Paleta curada para las áreas conocidas; el resto usa un color derivado del nombre (ver getAreaColor) */
export const HABIT_AREA_COLORS: Record<string, string> = {
  "daily-plan": "hsl(280, 67%, 63%)",
  emotional: "hsl(358, 67%, 55%)",
  financial: "hsl(24, 100%, 46%)",
  intellectual: "hsl(42, 100%, 55%)",
  physical: "hsl(151, 87%, 37%)",
  professional: "hsl(195, 87%, 42%)",
  recreational: "hsl(208, 93%, 47%)",
  relationship: "hsl(226, 59%, 51%)",
  spiritual: "hsl(249, 91%, 63%)",
  temporal: "hsl(323, 62%, 49%)",
};

/** Nombre de área comparable: minúsculas y guiones (`Daily Plan` y `daily-plan` son la misma área). */
export function normalizeAreaName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Ruta de sub-área comparable: cada carpeta normalizada, separadas por `/`. */
export function normalizeSubAreaPath(path: string): string {
  return path.split('/').map(normalizeAreaName).filter(Boolean).join('/');
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Elige texto oscuro o claro según el brillo percibido (YIQ) del color de fondo dado */
export function getContrastTextColor(backgroundColor: string): string {
  const match = backgroundColor.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
  if (!match) return "#ffffff";

  const [, h, s, l] = match.map(Number);
  const [r, g, b] = hslToRgb(h, s, l);
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return brightness > 0.6 ? "#1a1a1a" : "#ffffff";
}

/** Hash simple y determinístico de un string a un entero no-negativo */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Color de un área: usa la paleta curada si el nombre coincide, si no genera un tono armonizado por hash */
export function getAreaColor(area: string): string {
  // Las áreas vienen de nombres de carpeta ("daily plan"); las claves de la paleta usan guiones ("daily-plan").
  const known = HABIT_AREA_COLORS[normalizeAreaName(area)];
  if (known) return known;

  const hue = hashString(area) % 360;
  return `hsl(${hue}, 62%, 55%)`;
}

/** Color de texto legible sobre getAreaColor(area) */
export function getAreaTextColor(area: string): string {
  return getContrastTextColor(getAreaColor(area));
}

/** Etiqueta localizada si el área coincide con las conocidas (habit_area_*); si no, el nombre de carpeta tal cual */
export function getAreaLabel(area: string, i18n: { t(key: string): string }): string {
  const key = `habit_area_${normalizeAreaName(area).replace(/-/g, '_')}`;
  const translated = i18n.t(key);
  return translated === key ? area : translated;
}

/** Área y sub-área de una tarea; ambas son cadenas vacías si la nota está en la raíz del vault («Sin área»). */
export interface TaskArea {
  area: string;
  subArea: string;
}

/**
 * Área de una tarea según la ruta de su nota: el área es la primera carpeta y la sub-área el resto
 * de la ruta de carpetas, completo y sin tope de niveles (`A/B/C/nota.md` → `A` y `B/C`).
 * Acepta barras normales o invertidas; ignora el nombre del archivo.
 */
export function resolveTaskArea(filePath: string): TaskArea {
  const folders = filePath.replace(/\\/g, '/').split('/').filter(Boolean).slice(0, -1);
  return { area: folders[0] ?? '', subArea: folders.slice(1).join('/') };
}

/**
 * ¿La nota en `filePath` está en el área y la sub-área elegidas? Un criterio vacío no filtra. El
 * área se compara por nombre normalizado y la sub-área por prefijo: `B` incluye `B` y `B/C`.
 * `ROOT_AREA` como área deja solo las notas fuera de cualquier carpeta (y no mira la sub-área); como
 * sub-área, solo las notas que están directamente en la carpeta del área.
 */
export function matchesTaskArea(filePath: string, selected: { area?: string; subArea?: string }): boolean {
  const { area, subArea } = resolveTaskArea(filePath);

  if (selected.area === ROOT_AREA) return area === '';

  if (selected.area && normalizeAreaName(area) !== normalizeAreaName(selected.area)) return false;

  if (selected.subArea === ROOT_AREA) return subArea === '';

  if (selected.subArea) {
    const wanted = normalizeSubAreaPath(selected.subArea);
    const actual = normalizeSubAreaPath(subArea);
    if (wanted && actual !== wanted && !actual.startsWith(`${wanted}/`)) return false;
  }

  return true;
}

/** Valor del filtro de área para «solo las notas fuera de cualquier carpeta» y del de sub-área para «solo las notas directas del área»; `/` no puede ser un nombre de carpeta. */
export const ROOT_AREA = '/';

/**
 * Ruta de filtro de área (v1.1.14, Fase M1; ver Arquitectura técnica §28.1). Una selección es una lista de rutas:
 * `Work` (toda el área), `Work/Proj/Sub` (una sub-área, con sus subcarpetas), `Work/` (solo las notas
 * directamente en la carpeta del área) y `ROOT_AREA` (las notas fuera de cualquier carpeta).
 */
export type AreaRoute =
  | { kind: 'root' }
  | { kind: 'area'; area: string }
  | { kind: 'direct'; area: string }
  | { kind: 'subArea'; area: string; subArea: string };

export function parseAreaRoute(route: string): AreaRoute {
  if (route === ROOT_AREA) return { kind: 'root' };
  const slash = route.indexOf('/');
  if (slash === -1) return { kind: 'area', area: route };
  const area = route.slice(0, slash);
  const subArea = route.slice(slash + 1);
  return subArea === '' ? { kind: 'direct', area } : { kind: 'subArea', area, subArea };
}

/** Ruta de un área y, opcionalmente, una sub-área; `ROOT_AREA` como sub-área son las notas directas del área. */
export function buildAreaRoute(area: string, subArea = ''): string {
  if (area === ROOT_AREA) return ROOT_AREA;
  if (subArea === ROOT_AREA) return `${area}/`;
  return subArea ? `${area}/${subArea}` : area;
}

/** Convierte el filtro de un solo área y sub-área, guardado antes de v1.1.14, en una lista de rutas. */
export function areaRoutesFromLegacy(area: unknown, subArea: unknown): string[] {
  if (typeof area !== 'string' || !area) return [];
  return [buildAreaRoute(area, typeof subArea === 'string' ? subArea : '')];
}

/** ¿Hay alguna ruta marcada de esa área (el área completa, una sub-área o sus notas directas)? */
export function isAreaMarked(routes: readonly string[], area: string): boolean {
  const key = normalizeAreaName(area);
  return routes.some(route => {
    const parsed = parseAreaRoute(route);
    return parsed.kind !== 'root' && normalizeAreaName(parsed.area) === key;
  });
}

/**
 * Marca o desmarca una ruta en la selección. Desmarcar un área quita también sus sub-áreas marcadas;
 * marcar una sub-área no toca el área, que sigue marcada (gana la más específica, ver `effectiveAreaRoutes`).
 */
export function toggleAreaRoute(routes: readonly string[], route: string): string[] {
  const parsed = parseAreaRoute(route);
  if (parsed.kind === 'area') {
    if (!isAreaMarked(routes, parsed.area)) return [...routes, route];
    const key = normalizeAreaName(parsed.area);
    return routes.filter(candidate => {
      const other = parseAreaRoute(candidate);
      return other.kind === 'root' || normalizeAreaName(other.area) !== key;
    });
  }
  return routes.includes(route) ? routes.filter(candidate => candidate !== route) : [...routes, route];
}

/** ¿`child` cuelga de `parent`? El área contiene a sus sub-áreas y a sus notas directas; una sub-área, a las más profundas. */
function isDescendantRoute(child: AreaRoute, parent: AreaRoute): boolean {
  if (child.kind === 'root' || parent.kind === 'root' || parent.kind === 'direct') return false;
  if (normalizeAreaName(child.area) !== normalizeAreaName(parent.area)) return false;
  if (parent.kind === 'area') return child.kind === 'direct' || child.kind === 'subArea';
  if (child.kind !== 'subArea') return false;
  return normalizeSubAreaPath(child.subArea).startsWith(`${normalizeSubAreaPath(parent.subArea)}/`);
}

/** Rutas que se usan de verdad: gana lo más específico, así que se descartan las que tienen otra marcada por debajo. */
export function effectiveAreaRoutes(routes: readonly string[]): string[] {
  const parsed = routes.map(parseAreaRoute);
  return routes.filter((_, index) => !parsed.some((other, otherIndex) => otherIndex !== index && isDescendantRoute(other, parsed[index])));
}

function matchesAreaRoute(task: TaskArea, route: AreaRoute): boolean {
  if (route.kind === 'root') return task.area === '';
  if (normalizeAreaName(task.area) !== normalizeAreaName(route.area)) return false;
  if (route.kind === 'area') return true;
  if (route.kind === 'direct') return task.subArea === '';

  const wanted = normalizeSubAreaPath(route.subArea);
  const actual = normalizeSubAreaPath(task.subArea);
  return actual === wanted || actual.startsWith(`${wanted}/`);
}

/** ¿Esa área y sub-área (la de una tarea o la de un hábito) cumple la selección? O entre las rutas efectivas; una lista vacía no filtra. */
export function matchesAreaRoutes(area: TaskArea, routes: readonly string[]): boolean {
  if (routes.length === 0) return true;
  return effectiveAreaRoutes(routes).some(route => matchesAreaRoute(area, parseAreaRoute(route)));
}

/** ¿La nota en `filePath` cumple la selección? O entre las rutas efectivas; una lista vacía no filtra. */
export function matchesTaskAreas(filePath: string, routes: readonly string[]): boolean {
  return matchesAreaRoutes(resolveTaskArea(filePath), routes);
}

/**
 * Descarta las rutas que ya no tienen ninguna nota (p. ej., una carpeta renombrada). Una sub-área o las
 * notas directas que ya no existen recaen en su área, como hacía la barra con un solo valor; si el
 * área tampoco tiene notas, la ruta se descarta. Sin repetidos.
 */
export function reconcileAreaRoutes(routes: readonly string[], filePaths: readonly string[]): string[] {
  const hasNotes = (route: string): boolean => filePaths.some(filePath => matchesTaskAreas(filePath, [route]));
  const result: string[] = [];

  for (const route of routes) {
    const parsed = parseAreaRoute(route);
    const kept = hasNotes(route) ? route : (parsed.kind === 'direct' || parsed.kind === 'subArea') && hasNotes(parsed.area) ? parsed.area : null;
    if (kept !== null && !result.includes(kept)) result.push(kept);
  }
  return result;
}

/** ¿Alguna nota está fuera de cualquier carpeta (en la raíz de la bóveda)? */
export function hasRootTasks(filePaths: string[]): boolean {
  return filePaths.some(filePath => resolveTaskArea(filePath).area === '');
}

/** ¿Alguna nota está directamente en la carpeta del área, sin subcarpeta? */
export function hasDirectTasks(filePaths: string[], area: string): boolean {
  const areaKey = normalizeAreaName(area);
  if (!areaKey) return false;
  return filePaths.some(filePath => {
    const resolved = resolveTaskArea(filePath);
    return normalizeAreaName(resolved.area) === areaKey && resolved.subArea === '';
  });
}

/** Áreas presentes en las rutas dadas, sin repetir (por nombre normalizado) y ordenadas; la raíz del vault no cuenta. */
export function listTaskAreas(filePaths: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const filePath of filePaths) {
    const { area } = resolveTaskArea(filePath);
    const key = normalizeAreaName(area);
    if (key && !byKey.has(key)) byKey.set(key, area);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * Sub-áreas presentes bajo `area`: cada ruta con tareas y también sus carpetas contenedoras
 * (con notas en `B/C/D` salen `B`, `B/C` y `B/C/D`), ya que la sub-área filtra por prefijo.
 */
export function listTaskSubAreas(filePaths: string[], area: string): string[] {
  const areaKey = normalizeAreaName(area);
  if (!areaKey) return [];

  const byKey = new Map<string, string>();
  for (const filePath of filePaths) {
    const resolved = resolveTaskArea(filePath);
    if (normalizeAreaName(resolved.area) !== areaKey) continue;

    const folders = resolved.subArea.split('/').filter(Boolean);
    for (let depth = 1; depth <= folders.length; depth += 1) {
      const path = folders.slice(0, depth).join('/');
      const key = normalizeSubAreaPath(path);
      if (key && !byKey.has(key)) byKey.set(key, path);
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}
