# 8. Gestures and Interactions

A quick reference of every click, double-click, right-click, and drag across the plugin.

## Calendar views (Day / Week / Work Week / Month / Year / List)

| Gesture | Where | Result |
|---|---|---|
| Click | A task pill | Opens the **Edit Task** modal, prefilled with that task's data |
| Double-click | A task pill | Opens the underlying note, cursor on that line |
| Right-click | A task pill | Opens a context menu to change the task's status |
| Click | A view-type icon button (header) | Switches to that calendar view (Day/Week/Work Week/Month/Year/List), keeping the current reference date |
| Click | A day cell/row (Month/Week/Work Week/Year/List) | Selects and highlights that date as the shared reference date |
| Click | A day number (Month/Week/Work Week/Year/List) | Jumps to the **Day view** for that date |
| Double-click | Empty space in a day cell/row | Opens **Create Task** prefilled with that date |
| Click | The date picker trigger (header, any calendar view) | Opens a popover to jump to any day, month, or year |
| Click | A date in the date picker (popover or Day view sidebar) | Jumps to that date, updating the shared reference date |
| Click | The 1/3/5 day-count buttons (Day view) | Shows that many day columns at once, centered on the reference day |
| Drag | A task pill to another day/column | Reschedules the task to that day (moves whichever date anchors it: `scheduled` > `due` > `start`) |
| Drag | A task pill to another hour slot (Day view) | Changes the task's scheduled time, snapping to the exact half-hour (`:00`/`:30`) under the pointer |
| Drag | The bottom edge of a task block (Day view) | Resizes the task's duration in 30-minute steps (30-minute minimum) |
| Double-click | Empty space in an hour slot or the "All day" section (Day view) | Opens **Create Task** prefilled with that date/time |
| Click | The "All day" section header (Day view) | Expands/collapses the due/start section |
| Click | The sidebar collapse handle (Day view) | Collapses/expands the mini-calendar sidebar |
| Click | ◀ / ▶ (List view) | Moves the whole displayed window by its configured number of days |

## List, Table, and Overview

| Gesture | Where | Result |
|---|---|---|
| Click | A task row/item (List or Table view) | Opens the **Edit Task** modal, prefilled with that task's data |
| Double-click | A task row/item | Opens the underlying note, cursor on that line |
| Right-click | A task row/item | Opens a context menu to change the task's status |
| Click | The **List \| Table** switch | Switches mode, keeping search, filters, grouping and sort order |
| Click | **+ Filter** | Opens menus to pick a filter type and a value (Area also asks for a sub-area) |
| Click | A filter chip's ×, or **Clear** | Removes that filter, or all of them (the search text is kept) |
| Click | A group header | Collapses or expands that group; its state is remembered |
| Click | A column header (Table view) | Sorts by that column; click again to reverse. Also keyboard-accessible with Enter or Space |
| Hover / keyboard focus | A control or widget with a tooltip | Shows a themed tooltip with its explanatory text |

Search, filters, grouping, and sort order are shared by the List and Table views and remembered when you return from editing a task or switch views; column widths adapt to the rows visible after filtering.

## Habit Tracker

| Gesture | Where | Result |
|---|---|---|
| Click | A grid cell or a routine checkbox | Toggles the habit as done/not done for that day |
| Click | A group header (Daily Routine view) | Collapses or expands that group; its state is remembered |
| Click | A habit's name (Grid/Weekly view) | Opens the **Habit Editor** |
| Double-click | A habit's name (Grid/Weekly view) | Opens the habit's underlying note |
| Click | A habit row (List/Table view) | Opens the **Habit Editor** |
| Double-click | A habit row (List/Table view) | Opens the habit's underlying note |
| Click | "Open note" action (Routine view) | Opens the habit's own note |
| Click | "Open related file" action (Routine/Table view) | Opens the file linked in the habit's related-files field |
| Click | A column header (Table view) | Sorts by that column |

## Next step

[9. Configuration](08-configuration.md) covers every setting mentioned across these chapters in one place.
