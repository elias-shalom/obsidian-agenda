// src/core/task-gestures.ts
// Gestos de tarea compartidos por calendario, Lista y Tabla (v1.1.12, Fase A; ver
// docs/agenda-tasks/Arquitectura técnica.md §20.3.1): clic edita, doble clic abre la nota y clic
// derecho abre el menú de estado.
import { Menu, Notice } from 'obsidian';
import { DateTime } from 'luxon';
import { ITask, AgendaPlugin } from '../types/interfaces';
import { CoreTaskStatus } from '../types/enums';
import { I18n } from './i18n';
import { TaskWriter } from './task-writer';
import { upsertTaskStatus } from './task-line-fields';
import { buildRecurrenceOccurrence } from './task-recurrence';
import { EDIT_TASK_MODAL_TYPE } from './modal-manager';
import { STATUS_OPTIONS } from './task-status-options';

/** Espera entre un `click` y un posible segundo `click` antes de asumir que no viene un `dblclick` (ms). */
export const TASK_CLICK_DELAY_MS = 250;

/** Elementos interactivos dentro de una fila de Lista/Tabla cuyos clics no deben abrir el modal de la tarea. */
export const TASK_GESTURE_IGNORE_SELECTOR = 'button, a, input, select';

export interface TaskGestureOptions {
  plugin: AgendaPlugin;
  i18n: I18n;
  taskWriter: TaskWriter;
  /** Tarea que representa el elemento, resuelta en el momento del gesto (no al cablear). */
  getTask: () => ITask | undefined;
  /** Refresco propio de la vista, tras guardar el modal o cambiar el estado. */
  onChanged: () => void | Promise<void>;
  /** Abre la nota de la tarea (`BaseView.openTaskFile`). */
  openFile: (filePath: string, lineNumber?: number) => Promise<void>;
  /** Los clics y clic derecho sobre elementos que coinciden se ignoran (botones, enlaces, campos). */
  ignoreSelector?: string;
}

/**
 * Cablea clic (modal de edición, con retardo para no chocar con el doble clic), doble clic (abre la
 * nota) y clic derecho (menú de estado) sobre `el`. El arrastre queda en cada vista.
 */
export function attachTaskGestures(el: HTMLElement, options: TaskGestureOptions): void {
  const { plugin, onChanged, ignoreSelector } = options;
  const isIgnored = (event: Event): boolean =>
    !!ignoreSelector && event.target instanceof Element && !!event.target.closest(ignoreSelector);
  const notifyChanged = (): void => {
    Promise.resolve(onChanged()).catch(console.error);
  };

  // Un doble clic real también dispara dos `click` sueltos antes del `dblclick`, así que el primer
  // clic espera un poco por si llega un segundo antes de abrir el modal.
  let pendingClickTimer: number | null = null;

  el.addEventListener('click', (event) => {
    if (isIgnored(event) || pendingClickTimer !== null) return;

    pendingClickTimer = window.setTimeout(() => {
      pendingClickTimer = null;
      const task = options.getTask();
      if (task) plugin.modalManager.openModal(EDIT_TASK_MODAL_TYPE, { task, onSaved: notifyChanged });
    }, TASK_CLICK_DELAY_MS);
  });

  el.addEventListener('dblclick', () => {
    if (pendingClickTimer !== null) {
      window.clearTimeout(pendingClickTimer);
      pendingClickTimer = null;
    }

    const task = options.getTask();
    if (task) options.openFile(task.file.path, task.line.number).catch(console.error);
  });

  el.addEventListener('contextmenu', (event) => {
    if (isIgnored(event)) return;
    event.preventDefault();
    const task = options.getTask();
    if (!task) return;

    const menu = new Menu();
    for (const { status, icon, labelKey } of STATUS_OPTIONS) {
      menu.addItem((menuItem) => menuItem
        .setTitle(`${icon} ${options.i18n.t(labelKey)}`)
        .onClick(() => {
          changeTaskStatus(task, status, options).then(changed => {
            if (changed) notifyChanged();
          }).catch(console.error);
        }));
    }
    menu.showAtMouseEvent(event);
  });
}

/** Reescribe el estado de la tarea; devuelve `false` (con aviso) si la nota cambió y no se pudo localizar la línea. */
export async function changeTaskStatus(
  task: ITask,
  status: CoreTaskStatus,
  options: Pick<TaskGestureOptions, 'taskWriter' | 'i18n'>
): Promise<boolean> {
  const { taskWriter, i18n } = options;
  const todayIso = DateTime.now().toFormat('yyyy-MM-dd');
  // Calculado antes de escribir: necesita la recurrencia/fechas tal como están ahora (ADR-R1).
  const nextOccurrenceLine = buildRecurrenceOccurrence(task, status);

  const written = await taskWriter.updateTaskLine(
    task.file.path, task.line.number, task.line.text, (line) => upsertTaskStatus(line, status, todayIso)
  );
  if (!written) {
    new Notice(i18n.t('task_line_changed'));
    return false;
  }

  if (nextOccurrenceLine) {
    await taskWriter.insertLineAbove(task.file.path, written.lineNumber, written.text, nextOccurrenceLine);
  }
  return true;
}
