// src/core/task-filter-chips.ts
// Lógica pura (sin Obsidian) de los chips de filtro de la barra compartida (v1.1.12, Fase U6; ver
// docs/agenda-tasks/Arquitectura técnica.md §23.7). Un filtro está activo si su valor no es «todos».
import { TaskViewState } from './task-view-state';
import { STATUS_OPTIONS } from './task-status-options';
import { ROOT_AREA } from './area';

export type FilterChipId = 'priority' | 'status' | 'area' | 'start' | 'scheduled' | 'due';

/** Tipos de filtro, en el orden en que se ofrecen y se muestran. La sub-área va dentro del de área. */
export const FILTER_CHIP_IDS: readonly FilterChipId[] = ['priority', 'status', 'area', 'start', 'scheduled', 'due'];

/** Claves de `TaskViewState` que editan los filtros. */
export const FILTER_STATE_KEYS: readonly (keyof TaskViewState)[] = ['priority', 'status', 'area', 'subArea', 'start', 'scheduled', 'due'];

const TYPE_LABEL_KEYS: Record<FilterChipId, string> = {
  priority: 'task_priority',
  status: 'task_status',
  area: 'area',
  start: 'start_date',
  scheduled: 'scheduled_date',
  due: 'due_date',
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
  valueLabel: string;
}

type Translate = (key: string) => string;

/** Valores de un filtro simple, sin «todos» (quitar el chip es «todos»). El área sale de las tareas cargadas. */
export function getFilterValueOptions(id: Exclude<FilterChipId, 'area'>, translate: Translate): FilterValueOption[] {
  switch (id) {
    case 'priority':
      return PRIORITY_OPTIONS.map(({ value, labelKey, emoji }) => ({ value, label: `${translate(labelKey)}${emoji}` }));
    case 'status':
      return STATUS_OPTIONS.map(({ name, labelKey }) => ({ value: name, label: translate(labelKey) }));
    case 'due':
      return DUE_OPTIONS.map(({ value, labelKey }) => ({ value, label: translate(labelKey) }));
    case 'start':
    case 'scheduled':
      return DATE_OPTIONS.map(({ value, labelKey }) => ({ value, label: translate(labelKey) }));
  }
}

export function getFilterTypeLabel(id: FilterChipId, translate: Translate): string {
  return translate(TYPE_LABEL_KEYS[id]);
}

/** Texto del valor de área: «Work», «Work › Proj › Sub» con sub-área o «Work › Raíz»; «Raíz» sola para las notas fuera de cualquier carpeta. */
function areaValueLabel(area: string, subArea: string, translate: Translate): string {
  if (area === ROOT_AREA) return translate('area_root');
  if (!subArea) return area;
  const parts = subArea === ROOT_AREA ? [translate('area_root')] : subArea.split('/');
  return `${area} › ${parts.join(' › ')}`;
}

/** Chips de los filtros activos, en el orden de `FILTER_CHIP_IDS`. */
export function getActiveFilterChips(state: TaskViewState, translate: Translate): FilterChip[] {
  const chips: FilterChip[] = [];
  const add = (id: FilterChipId, valueLabel: string): void => {
    chips.push({ id, typeLabel: getFilterTypeLabel(id, translate), valueLabel });
  };
  const labelOf = (id: Exclude<FilterChipId, 'area'>, value: string): string =>
    getFilterValueOptions(id, translate).find(option => option.value === value)?.label ?? value;

  if (state.priority !== 'all') add('priority', labelOf('priority', state.priority));
  if (state.status !== 'all') add('status', labelOf('status', state.status));
  if (state.area) add('area', areaValueLabel(state.area, state.subArea, translate));
  if (state.start !== 'all') add('start', labelOf('start', state.start));
  if (state.scheduled !== 'all') add('scheduled', labelOf('scheduled', state.scheduled));
  if (state.due !== 'all') add('due', labelOf('due', state.due));
  return chips;
}

/** El estado sin ese filtro; quitar el área quita también la sub-área. No toca la búsqueda, el agrupado ni el orden. */
export function clearFilterChip(state: TaskViewState, id: FilterChipId): TaskViewState {
  switch (id) {
    case 'priority': return { ...state, priority: 'all' };
    case 'status': return { ...state, status: 'all' };
    case 'area': return { ...state, area: '', subArea: '' };
    case 'start': return { ...state, start: 'all' };
    case 'scheduled': return { ...state, scheduled: 'all' };
    case 'due': return { ...state, due: 'all' };
  }
}

/** El estado sin ningún filtro; no toca la búsqueda, el agrupado ni el orden. */
export function clearAllFilters(state: TaskViewState): TaskViewState {
  return FILTER_CHIP_IDS.reduce(clearFilterChip, state);
}
