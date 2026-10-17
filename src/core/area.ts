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
 */
export function matchesTaskArea(filePath: string, selected: { area?: string; subArea?: string }): boolean {
  const { area, subArea } = resolveTaskArea(filePath);

  if (selected.area && normalizeAreaName(area) !== normalizeAreaName(selected.area)) return false;

  if (selected.subArea) {
    const wanted = normalizeSubAreaPath(selected.subArea);
    const actual = normalizeSubAreaPath(subArea);
    if (wanted && actual !== wanted && !actual.startsWith(`${wanted}/`)) return false;
  }

  return true;
}
