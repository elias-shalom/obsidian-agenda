// src/core/task-field-menu.ts
// Construye las opciones de campo (fecha, hora, duración, prioridad) que se agregan
// al Menu nativo de Obsidian, ya sea desde el comando/atajo o desde el menú contextual
// (v1.1.4, Fase B — ver docs/agenda-tasks/Arquitectura técnica.md §6, decisión B2+B3+B4).
import { App, Editor, Menu, Notice } from "obsidian";
import { DateTime } from "luxon";
import flatpickr from "flatpickr";
import { I18n } from "./i18n";
import { TaskDurationModal } from "../modals/task-duration-modal";
import { TaskTimePickerModal } from "../modals/task-time-picker-modal";
import {
  PriorityEmoji,
  isTaskLine,
  parseScheduledChunk,
  upsertPriority,
  upsertScheduledDate,
  upsertScheduledDuration,
  upsertScheduledTime,
  upsertSimpleDate,
} from "./task-line-fields";

const PRIORITY_OPTIONS: { emoji: PriorityEmoji; labelKey: string }[] = [
  { emoji: "🔺", labelKey: "highest_priority" },
  { emoji: "⏫", labelKey: "high_priority" },
  { emoji: "🔼", labelKey: "medium_priority" },
  { emoji: "🔽", labelKey: "low_priority" },
  { emoji: "⏬", labelKey: "lowest_priority" },
];

/** Abre un flatpickr "headless" (sin campo visible) y resuelve con la fecha elegida, o null si se cerró sin elegir. */
function openFlatpickrPicker(options: { enableTime: boolean; noCalendar?: boolean; defaultDate?: Date }): Promise<Date | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "text";
    input.addClass("oa-flatpickr-hidden-input");
    document.body.appendChild(input);

    const instance = flatpickr(input, {
      enableTime: options.enableTime,
      noCalendar: options.noCalendar ?? false,
      dateFormat: options.noCalendar ? "H:i" : options.enableTime ? "Y-m-d H:i" : "Y-m-d",
      defaultDate: options.defaultDate,
      onOpen: (_selectedDates, _dateStr, fp) => {
        fp.calendarContainer.addClass("oa-flatpickr-centered");
      },
      onClose: (selectedDates) => {
        resolve(selectedDates.length > 0 ? selectedDates[0] : null);
        instance.destroy();
        input.remove();
      },
    });
    instance.open();
  });
}

function formatIsoDate(date: Date): string {
  return DateTime.fromJSDate(date).toFormat("yyyy-MM-dd");
}

/** Agrega al `menu` los ítems de campo para la línea de tarea `lineNumber`; no hace nada si esa línea no es una tarea. */
export function addTaskFieldMenuItems(menu: Menu, editor: Editor, lineNumber: number, i18n: I18n, app: App): void {
  if (!isTaskLine(editor.getLine(lineNumber))) return;

  const setLine = (newLine: string) => editor.setLine(lineNumber, newLine);

  menu.addItem((item) => item
    .setTitle(i18n.t("task_field_menu_set_due"))
    .setIcon("calendar")
    .onClick(() => {
      void openFlatpickrPicker({ enableTime: false }).then((date) => {
        if (!date) return;
        setLine(upsertSimpleDate(editor.getLine(lineNumber), "📅", formatIsoDate(date)));
      });
    }));

  menu.addItem((item) => item
    .setTitle(i18n.t("task_field_menu_set_start"))
    .setIcon("plane-takeoff")
    .onClick(() => {
      void openFlatpickrPicker({ enableTime: false }).then((date) => {
        if (!date) return;
        setLine(upsertSimpleDate(editor.getLine(lineNumber), "🛫", formatIsoDate(date)));
      });
    }));

  menu.addItem((item) => item
    .setTitle(i18n.t("task_field_menu_set_scheduled"))
    .setIcon("hourglass")
    .onClick(() => {
      void openFlatpickrPicker({ enableTime: false }).then((date) => {
        if (!date) return;
        setLine(upsertScheduledDate(editor.getLine(lineNumber), formatIsoDate(date)));
      });
    }));

  menu.addSeparator();

  menu.addItem((item) => item
    .setTitle(i18n.t("task_field_menu_set_scheduled_time"))
    .setIcon("clock")
    .onClick(() => {
      const currentLine = editor.getLine(lineNumber);
      const scheduled = parseScheduledChunk(currentLine);
      if (!scheduled) {
        new Notice(i18n.t("task_field_menu_need_scheduled_date"));
        return;
      }
      new TaskTimePickerModal(app, i18n, scheduled.time, (time) => {
        const result = upsertScheduledTime(editor.getLine(lineNumber), time);
        if (result.ok) setLine(result.line);
      }).open();
    }));

  menu.addItem((item) => item
    .setTitle(i18n.t("task_field_menu_set_duration"))
    .setIcon("timer")
    .onClick(() => {
      const currentLine = editor.getLine(lineNumber);
      const scheduled = parseScheduledChunk(currentLine);
      if (!scheduled?.time) {
        new Notice(i18n.t("task_field_menu_need_scheduled_time"));
        return;
      }
      new TaskDurationModal(app, i18n, scheduled.duration, (minutes) => {
        const result = upsertScheduledDuration(editor.getLine(lineNumber), minutes);
        if (result.ok) setLine(result.line);
      }).open();
    }));

  menu.addSeparator();

  for (const { emoji, labelKey } of PRIORITY_OPTIONS) {
    menu.addItem((item) => item
      .setTitle(`${emoji} ${i18n.t(labelKey)}`)
      .onClick(() => setLine(upsertPriority(editor.getLine(lineNumber), emoji))));
  }
}
