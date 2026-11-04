// src/core/task-axis-chips.ts
// Modelo puro de los chips `Lanes`, `Group` y `Sort` de la barra (v1.1.14, Fase L2; ver
// docs/agenda-tasks/Especificación de vistas.md §20.2 y Arquitectura técnica.md §29.2). Dice qué muestra cada
// chip, qué opciones están atenuadas o bloqueadas y qué cambia al elegir; la barra solo lo dibuja.
import type { TaskViewState } from './task-view-state';
import { LANE_NONE, isGroupOptionInUse, isLaneOptionInUse, resolveAxisConflict } from './task-lanes';
import type { AxisConflictOptions } from './task-lanes';

export type AxisId = 'lanes' | 'group' | 'sort';

export interface AxisOption {
  value: string;
  label: string;
}

export interface AxisPopoverOption extends AxisOption {
  checked: boolean;
  /** Choca con el otro chip; se ve atenuada. */
  muted: boolean;
  /** Choca y la vista no permite resolverlo sola (Kanban): no se puede elegir. */
  disabled: boolean;
  title?: string;
}

export interface AxisChipModel {
  id: AxisId;
  /** «Rótulo: valor», p. ej. «Grupo: Estado». */
  text: string;
  /** Lanes = Ninguno se ve atenuado: no hay carriles activos. */
  muted: boolean;
  /** Tooltip del chip; solo Lanes lo tiene. */
  tooltip?: string;
  ariaLabel: string;
  options: AxisPopoverOption[];
  /** Solo `Sort`: la flecha ↑/↓ de dentro del chip. */
  direction?: 'asc' | 'desc';
}

export interface AxisChipsInput {
  state: Pick<TaskViewState, 'lanes' | 'group' | 'sortColumn' | 'sortDirection'>;
  /** Si no se pasan, el chip no existe en esa vista. */
  laneOptions?: readonly AxisOption[];
  groupOptions?: readonly AxisOption[];
  sortOptions?: readonly AxisOption[];
  /** Qué hace la vista con un campo en uso: Kanban lo bloquea; las demás lo resuelven solas. */
  rules?: AxisConflictOptions;
  translate: (key: string) => string;
}

const labelOf = (options: readonly AxisOption[], value: string): string =>
  (options.find(option => option.value === value) ?? options[0])?.label ?? '';

/** Los chips que la vista ofrece, en el orden de la barra: Lanes, Group y Sort. */
export function buildAxisChips(input: AxisChipsInput): AxisChipModel[] {
  const { state, laneOptions, groupOptions, sortOptions, translate } = input;
  const rules = input.rules ?? {};
  const requiresGroup = Boolean(rules.requiresGroup);
  const group = state.group || rules.defaultGroup || '';
  const chips: AxisChipModel[] = [];

  if (laneOptions) {
    chips.push({
      id: 'lanes',
      text: `${translate('lanes_label')} ${labelOf(laneOptions, state.lanes)}`,
      muted: state.lanes === LANE_NONE,
      tooltip: translate('lanes_tooltip'),
      ariaLabel: translate('lanes_label'),
      options: laneOptions.map(option => {
        const inUse = isLaneOptionInUse(option.value, group);
        return {
          ...option,
          checked: option.value === state.lanes,
          muted: inUse,
          disabled: inUse && requiresGroup,
          ...(inUse ? { title: translate(requiresGroup ? 'axis_in_use_by_group' : 'axis_in_use_by_group_swap') } : {}),
        };
      }),
    });
  }

  if (groupOptions) {
    chips.push({
      id: 'group',
      text: `${translate('group_label')} ${labelOf(groupOptions, state.group)}`,
      muted: false,
      ariaLabel: translate('group_by'),
      options: groupOptions.map(option => {
        const inUse = isGroupOptionInUse(option.value || rules.defaultGroup || '', state.lanes);
        return {
          ...option,
          checked: option.value === state.group,
          muted: inUse,
          disabled: inUse && requiresGroup,
          ...(inUse ? { title: translate(requiresGroup ? 'axis_in_use_by_lanes' : 'axis_in_use_by_lanes_swap') } : {}),
        };
      }),
    });
  }

  if (sortOptions) {
    chips.push({
      id: 'sort',
      text: `${translate('sort_label')} ${labelOf(sortOptions, state.sortColumn)}`,
      muted: false,
      ariaLabel: translate('sort_by'),
      direction: state.sortDirection,
      options: sortOptions.map(option => ({ ...option, checked: option.value === state.sortColumn, muted: false, disabled: false })),
    });
  }

  return chips;
}

/**
 * Los cambios del estado al elegir una opción de un chip, o `null` si no cambia nada (la misma opción o una
 * bloqueada). Elegir un campo en uso en Lista, Tabla o Gantt también cambia el otro chip, de modo que el
 * resultado puede incluir `group` o `lanes` además del propio.
 */
export function pickAxisOption(
  input: Pick<AxisChipsInput, 'state' | 'rules'>,
  axis: AxisId,
  value: string,
): Partial<Pick<TaskViewState, 'lanes' | 'group' | 'sortColumn'>> | null {
  const { state } = input;

  if (axis === 'sort') return value === state.sortColumn ? null : { sortColumn: value };

  const current = axis === 'lanes' ? state.lanes : state.group;
  if (value === current) return null;

  const result = resolveAxisConflict({ group: state.group, lanes: state.lanes }, { axis, value }, input.rules);
  if (result.blocked) return null;

  const changes: Partial<Pick<TaskViewState, 'lanes' | 'group'>> = {};
  if (result.lanes !== state.lanes) changes.lanes = result.lanes;
  if (result.group !== state.group) changes.group = result.group;
  return changes;
}

/** El cambio de dirección del orden, para la flecha de dentro del chip `Sort`. */
export function toggleSortDirection(state: Pick<TaskViewState, 'sortDirection'>): 'asc' | 'desc' {
  return state.sortDirection === 'asc' ? 'desc' : 'asc';
}
