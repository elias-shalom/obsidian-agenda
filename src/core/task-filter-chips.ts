// src/core/task-filter-chips.ts
// Lógica pura (sin Obsidian) de los chips de filtro de la barra compartida (v1.1.12, Fase U6; ver
// docs/agenda-tasks/Arquitectura técnica.md §23.7). Un filtro está activo si su valor no es «todos».
import { TaskViewState } from './task-view-state';
import { getStatusOptions } from './task-status-options';
import { ROOT_AREA, buildAreaRoute, isAreaMarked, parseAreaRoute } from './area';
import type { FilterPopoverOption, FilterPopoverSection } from './task-filter-popover';

export type FilterChipId = 'priority' | 'status' | 'area' | 'start' | 'scheduled' | 'due' | 'projected' | 'habits' | 'holidays';

/** Tipos de filtro, en el orden en que se ofrecen y se muestran. La sub-área va dentro del de área. `projected`, `habits` y `holidays` solo los ofrece el calendario. */
export const FILTER_CHIP_IDS: readonly FilterChipId[] = ['priority', 'status', 'area', 'start', 'scheduled', 'due'];

/** Claves de `TaskViewState` que editan los filtros. */
export const FILTER_STATE_KEYS: readonly (keyof TaskViewState)[] = ['priority', 'status', 'areas', 'start', 'scheduled', 'due', 'projected', 'habits', 'holidays'];

const TYPE_LABEL_KEYS: Record<FilterChipId, string> = {
  priority: 'task_priority',
  status: 'task_status',
  area: 'area',
  start: 'start_date',
  scheduled: 'scheduled_date',
  due: 'due_date',
  projected: 'filter_recurring_tasks',
  habits: 'filter_habits',
  holidays: 'filter_holidays',
};

const PRIORITY_OPTIONS = [
  { value: 'highest', labelKey: 'highest_priority', emoji: ' 🔺' },
  { value: 'high', labelKey: 'high_priority', emoji: ' ⏫' },
  { value: 'medium', labelKey: 'medium_priority', emoji: ' 🔼' },
  { value: 'normal', labelKey: 'normal_priority', emoji: ' ▶️' },
  { value: 'low', labelKey: 'low_priority', emoji: ' 🔽' },
  { value: 'lowest', labelKey: 'lowest_priority', emoji: ' ⏬' },
  { value: 'none', labelKey: 'no_priority', emoji: '' },
];

/** Vencimiento: «vencidas» tiene sentido solo aquí, y «hoy» y «semana» hablan de cuándo vence. */
const DUE_OPTIONS = [
  { value: 'hasdate', labelKey: 'has_any_date' },
  { value: 'overdue', labelKey: 'overdue' },
  { value: 'today', labelKey: 'due_today' },
  { value: 'thisweek', labelKey: 'due_this_week' },
  { value: 'future', labelKey: 'date_future' },
  { value: 'nodate', labelKey: 'no_date' },
];

/** Inicio y programada comparten los mismos textos. */
const DATE_OPTIONS = [
  { value: 'hasdate', labelKey: 'has_any_date' },
  { value: 'overdue', labelKey: 'date_past' },
  { value: 'today', labelKey: 'date_today' },
  { value: 'thisweek', labelKey: 'date_this_week' },
  { value: 'future', labelKey: 'date_future' },
  { value: 'nodate', labelKey: 'no_date' },
];

export interface FilterValueOption {
  value: string;
  label: string;
}

export interface FilterChip {
  id: FilterChipId;
  typeLabel: string;
  /** Un valor se muestra por su nombre; con dos o más, solo el número («Estado: 2»). */
  valueLabel: string;
  /** «Tipo: todos los valores», para el tooltip del chip. */
  title: string;
}

type Translate = (key: string) => string;

/** Valores de un filtro simple, sin «todos» (quitar el chip es «todos»). El área sale de las tareas cargadas. */
export function getFilterValueOptions(id: Exclude<FilterChipId, 'area'>, translate: Translate): FilterValueOption[] {
  switch (id) {
    case 'priority':
      return PRIORITY_OPTIONS.map(({ value, labelKey, emoji }) => ({ value, label: `${translate(labelKey)}${emoji}` }));
    case 'status':
      // Una función y no la constante: los estados personalizados (v1.1.17) cambian el origen sin tocar esta fase
      return getStatusOptions().map(({ name, labelKey }) => ({ value: name, label: translate(labelKey) }));
    case 'due':
      return DUE_OPTIONS.map(({ value, labelKey }) => ({ value, label: translate(labelKey) }));
    case 'start':
    case 'scheduled':
      return DATE_OPTIONS.map(({ value, labelKey }) => ({ value, label: translate(labelKey) }));
    case 'projected':
      // Su único valor activo es «ocultas»: por defecto el filtro está en «mostrar» y no tiene chip
      return [{ value: 'hide', label: translate('filter_recurring_hidden') }];
    case 'habits':
      return [{ value: 'hide', label: translate('filter_habits_hidden') }];
    case 'holidays':
      return [{ value: 'hide', label: translate('filter_holidays_hidden') }];
  }
}

export function getFilterTypeLabel(id: FilterChipId, translate: Translate): string {
  return translate(TYPE_LABEL_KEYS[id]);
}

/**
 * Marca o desmarca un valor de una lista de filtro. El resultado sigue el orden de `order` (el de las
 * opciones del popover), no el de las marcas, para que el chip no cambie según qué se marcó primero.
 */
export function toggleFilterValue(current: readonly string[], value: string, order: readonly string[]): string[] {
  const next = current.includes(value) ? current.filter(candidate => candidate !== value) : [...current, value];
  const rank = (candidate: string): number => {
    const index = order.indexOf(candidate);
    return index === -1 ? order.length : index;
  };
  return [...next].sort((a, b) => rank(a) - rank(b));
}

export interface AreaFilterSectionsInput {
  routes: readonly string[];
  /** Áreas con tareas, ordenadas. */
  areas: readonly string[];
  hasRootTasks: boolean;
  subAreasOf: (area: string) => string[];
  hasDirectTasks: (area: string) => boolean;
  translate: Translate;
}

/**
 * Secciones del popover del área: arriba las áreas (con «Raíz» para las notas fuera de cualquier carpeta)
 * y, debajo, las sub-áreas de las áreas marcadas, con el área por delante y las notas directas de cada
 * una como «Área › Raíz».
 */
export function buildAreaFilterSections(input: AreaFilterSectionsInput): FilterPopoverSection[] {
  const { routes, areas, translate } = input;

  const areaOptions: FilterPopoverOption[] = areas.map(area => ({ value: area, label: area, checked: isAreaMarked(routes, area) }));
  if (input.hasRootTasks) {
    areaOptions.push({ value: ROOT_AREA, label: translate('area_root'), checked: routes.includes(ROOT_AREA) });
  }

  const subAreaOptions: FilterPopoverOption[] = [];
  for (const area of areas.filter(candidate => isAreaMarked(routes, candidate))) {
    const subRoutes = input.subAreasOf(area).map(path => buildAreaRoute(area, path));
    if (input.hasDirectTasks(area)) subRoutes.unshift(buildAreaRoute(area, ROOT_AREA));
    for (const route of subRoutes) {
      subAreaOptions.push({ value: route, label: areaRouteLabel(route, translate), checked: routes.includes(route) });
    }
  }

  const sections: FilterPopoverSection[] = [{ options: areaOptions }];
  if (subAreaOptions.length > 0) sections.push({ title: translate('filter_sub_areas'), options: subAreaOptions });
  return sections;
}

/** Texto de una ruta de área: «Work», «Work › Proj › Sub» con sub-área o «Work › Raíz»; «Raíz» sola para las notas fuera de cualquier carpeta. */
export function areaRouteLabel(route: string, translate: Translate): string {
  const parsed = parseAreaRoute(route);
  switch (parsed.kind) {
    case 'root': return translate('area_root');
    case 'area': return parsed.area;
    case 'direct': return `${parsed.area} › ${translate('area_root')}`;
    case 'subArea': return `${parsed.area} › ${parsed.subArea.split('/').join(' › ')}`;
  }
}

/** Chips de los filtros activos, en el orden de `FILTER_CHIP_IDS`. Con dos o más valores el chip muestra solo el número, para que no crezca, y el tooltip los lista. */
export function getActiveFilterChips(state: TaskViewState, translate: Translate): FilterChip[] {
  const chips: FilterChip[] = [];
  const add = (id: FilterChipId, labels: readonly string[]): void => {
    const typeLabel = getFilterTypeLabel(id, translate);
    const joined = labels.join(', ');
    chips.push({ id, typeLabel, valueLabel: labels.length > 1 ? String(labels.length) : joined, title: `${typeLabel}: ${joined}` });
  };
  const labelOf = (id: Exclude<FilterChipId, 'area'>, value: string): string =>
    getFilterValueOptions(id, translate).find(option => option.value === value)?.label ?? value;

  if (state.priority.length > 0) add('priority', state.priority.map(value => labelOf('priority', value)));
  if (state.status.length > 0) add('status', state.status.map(value => labelOf('status', value)));
  if (state.areas.length > 0) add('area', state.areas.map(route => areaRouteLabel(route, translate)));
  if (state.start !== 'all') add('start', [labelOf('start', state.start)]);
  if (state.scheduled !== 'all') add('scheduled', [labelOf('scheduled', state.scheduled)]);
  if (state.due !== 'all') add('due', [labelOf('due', state.due)]);
  if (state.projected === 'hide') add('projected', [labelOf('projected', 'hide')]);
  if (state.habits === 'hide') add('habits', [labelOf('habits', 'hide')]);
  if (state.holidays === 'hide') add('holidays', [labelOf('holidays', 'hide')]);
  return chips;
}

/** El estado sin ese filtro. No toca la búsqueda, el agrupado ni el orden. */
export function clearFilterChip(state: TaskViewState, id: FilterChipId): TaskViewState {
  switch (id) {
    case 'priority': return { ...state, priority: [] };
    case 'status': return { ...state, status: [] };
    case 'area': return { ...state, areas: [] };
    case 'start': return { ...state, start: 'all' };
    case 'scheduled': return { ...state, scheduled: 'all' };
    case 'due': return { ...state, due: 'all' };
    case 'projected': return { ...state, projected: 'show' };
    case 'habits': return { ...state, habits: 'show' };
    case 'holidays': return { ...state, holidays: 'show' };
  }
}

/** El estado sin ningún filtro; no toca la búsqueda, el agrupado ni el orden. */
export function clearAllFilters(state: TaskViewState): TaskViewState {
  return [...FILTER_CHIP_IDS, 'projected' as const, 'habits' as const, 'holidays' as const].reduce(clearFilterChip, state);
}
