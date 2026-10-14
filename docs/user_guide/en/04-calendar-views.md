# 5. Calendar Views

The Calendar tab offers **six layouts** for the same underlying tasks: **Day**, **Week**, **Work Week**, **Month**, **Year**, and **List**. You can switch between them at any time using the row of icon buttons in the calendar header — the currently selected date is kept when you switch, so you don't lose your place.

## Shared concepts

These apply across every calendar layout:

- **Reference date** — the date currently selected/highlighted. It's shared across all six layouts: pick a date in one view and it stays selected if you switch to another.
- **Date types** — a task can appear on the calendar anchored to its `due` 📅, `start` 🛫, or `scheduled` ⏳ date (priority `scheduled` > `due` > `start` when more than one is set). Each type has its own icon + color badge on the task pill. You can choose which date types appear from **Settings ▸ Calendar** (see [9. Configuration](08-configuration.md)).
- **Completed tasks** — dimmed by default; you can hide them entirely from the same settings group.
- **Task pills** — the small blocks representing a task. Click to edit, double-click to open the note, right-click to change its status, drag to reschedule (see [8. Gestures and Interactions](07-gestures.md) for the full list of gestures).
- **Date picker** — click the calendar icon button in the header to open a popover and jump to any day, month, or year; days that already have tasks are marked with a dot.

## Day view

Shows a hierarchy of hourly slots for one day, plus a collapsible "All day" section for tasks that don't have a specific time (`due`, `start`, and `scheduled` tasks without a time).

- Scheduled tasks render as blocks sized to their duration (when set): connected across hours for 60+ minute tasks, half-cell for shorter ones.
- Overlapping tasks are placed in side-by-side lanes instead of covering each other.
- Drag the bottom edge of a task block to resize its duration (30-minute steps, 30-minute minimum).
- Drag a task to a different hour slot to reschedule its time (snaps to `:00`/`:30`).
- A mini-calendar sidebar is always visible next to the hour grid (it can be collapsed with the handle at its edge).

### Multi-day mode (1/3/5)

A small 1/3/5 button group (visible only in Day view) lets you see more than one day at once:

- **1** — the standard single-day view.
- **3** — the reference day, one day before, and one day after.
- **5** — the reference day, two days before, and two days after.

Each visible day is its own column, sharing the same hour grid; no task or lane crosses between columns. Dragging a task to another column reschedules it to that day (and, if dropped on a different hour, to that time too).

## Week view / Work Week view

A 7-day (Week) or 5-day (Work Week, Monday–Friday) grid, one column per day, with task pills stacked inside each day. The same drag-and-drop, click-to-edit, and double-click-to-create gestures apply as everywhere else in the calendar.

## Month view

A traditional month grid (weeks as rows, days as columns), with every task for a day shown as a pill inside that day's cell. Clicking a day number jumps to the Day view for that date.

## Year view

A yearly overview with one mini-month per month; days with tasks are marked so you can spot busy periods at a glance, and clicking a day number jumps to the Day view for that date.

## List view

A row-per-day layout showing a **continuous window of days** starting at the reference date (not aligned to the start of a week). Each row reuses the exact same task pills as Month/Week — there's no "N more" truncation, every task for that day is shown.

- The window size is configurable from **Settings ▸ Calendar ▸ List view: days to show** (minimum 7, maximum 14, default 14).
- The ◀ / ▶ navigation buttons move the whole window by that many days at once (not day by day).
- Clicking a row selects/highlights that day without moving the window; the window only re-centers if you jump to a date outside it (for example, via the date picker).

## Next steps

- [6. Habit Tracker](05-habit-tracker.md) for the separate habit-tracking module.
- [8. Gestures and Interactions](07-gestures.md) for the complete gesture reference.
- [9. Configuration](08-configuration.md) for all calendar-related settings.
