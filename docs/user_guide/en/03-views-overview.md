# 4. Views Overview

This chapter covers the task views that are not calendars: Overview, the Tasks tab (List and Table), Kanban and Gantt. Calendar views are covered in their own chapter ([5. Calendar Views](04-calendar-views.md)), and the Habit Tracker module in [6. Habit Tracker](05-habit-tracker.md).

## Overview view

A dashboard-style summary of your tasks, meant to be the first thing you check. It includes:

- Key metrics and statistics about your tasks (totals, completion, overdue count, etc.).
- Quick access to upcoming deadlines.
- A breakdown of tasks by project/folder.
- Overdue tasks highlighted for visibility.
- Customizable widgets.

## The Tasks tab: List and Table

The List and Table views share one **Tasks** tab. A **List | Table** switch at the left of the toolbar changes mode, and everything you set — search, filters, grouping and sort order — carries over and is remembered, also when you come back from editing a task. The tab opens in the last mode you used. If you hide one of the two in **Settings ▸ Tab Visibility**, the switch disappears and the tab opens the one that remains.

Both views refresh by themselves shortly after a change in your notes, keeping your scroll position, filters and collapsed groups (see [Automatic refresh](#automatic-refresh)).

### Filter bar

- **Search** — type to filter by the task description. It stays on the right of the toolbar and moves to its own line on narrow windows.
- **+ Filter** — opens menus in steps: first the type, then the value. The types are **Priority**, **Status**, **Area** (it asks for a sub-area afterwards), **Start date**, **Scheduled date** and **Due date**.
- **Chips** — each active filter appears as a chip on a second row. Remove one with its ×, or use **Clear** to remove them all (the search text is kept).
- **Group:** and **Sort:** — two selectors, plus an ascending/descending toggle.

The three date filters offer the same values, compared by day: **With date**, **Overdue** (or **Past** for Start and Scheduled), **Today**, **Next 7 days**, **Future** and **No date**. For Due, *Overdue* counts only open tasks — a done or cancelled task is never overdue. Filters of different types combine with "and".

### Areas and sub-areas

A task's **area** is the first folder of the note it lives in, and its **sub-area** is the rest of the folder path, at any depth (`Work/Clients/Acme.md` → area `Work`, sub-area `Clients`). Notes in the vault root belong to **No area**. Nothing to configure — areas follow your folders.

- Pick an area in **+ Filter ▸ Area**, then optionally one of its sub-areas. Both menus end with a **Root** option: in Area it shows only notes outside any folder, and in Sub-area only the notes that sit directly in that area's folder.
- Group by **Area and sub-area** to get a tree with colored headers. Tasks that sit directly in the folder of an area (or sub-area) that also has sub-areas are listed last, under **No sub-area**.

### Grouping and sorting

- **Group by**: No grouping, Area and sub-area, Folder (one flat group per area), Status, Priority, Tags or Due date. Group headers collapse and expand, and each remembers its state. The List groups by area by default and the Table does not group by default.
- **Sort by**: Priority, Status, Task, Area, Start, Scheduled, Due, Closed or Tags. In the Table you can also click a column header. When you sort by a date, tasks without that date go last.

## List view

A compact list of tasks, best for working through your vault's tasks one by one.

- Compact rows with priority cues; each task shows its start (🛫), scheduled (⏳, with its time) and due (📅) dates when it has them, and the note's path when the grouping does not already show it.
- Grouped by area and sub-area by default; any other grouping is available from the selector.
- Click a task to edit it in the modal; double-click to open its note; right-click to change its status (see [8. Gestures and Interactions](07-gestures.md)).

## Table view

A spreadsheet-style grid, best when you want to scan, sort, and compare many tasks at a glance.

- Columns: priority, status, task (with the note's path below it), area, **Start**, **Scheduled**, **Due**, **Closed** and tags. Each date appears with its icon: Start shows the creation date (➕) below it, Scheduled shows its time and duration, and Closed shows the done (✅) or cancelled (❌) date. A date column is hidden when none of your tasks has that date, and overdue or due-today dates of open tasks are highlighted.
- The header of the first column shows the total number of tasks shown.
- Sortable and resizable columns — click a column header to sort, click again to reverse. Columns also shrink to fit the width of the window or device, down to a minimum width, so on a phone you may still scroll sideways.
- Quick entry and editing of task attributes directly in the grid.
- Status and priority cues, compact date/tag styling, conditional formatting.

## Kanban view

A board where every card is a real task from your notes: moving a card rewrites the task's line in its note. It has its own tab and the same filter bar as the Tasks tab (search, **+ Filter** and sort order), remembered separately from it.

- **Columns**: choose the grouping in the **Group:** selector — **Status** (the default, one column per status), **Priority**, **Tags** or **Folder** (the area). Status and priority columns always appear, even when empty, because they are where cards can be dropped.
- **Drag a card** to another column to change its status (moving it to Done adds the ✅ date, leaving Done removes it, and completing a recurring task creates its next occurrence) or its priority (the Normal column removes the priority icon). Tag and folder columns are read-only.
- **Fold a column**: click its header to shrink it to a thin bar with its name and task count, and click again to open it. Empty columns start folded, and only the choices you make by hand are remembered. A folded column still accepts a dropped card and opens by itself when it receives one.
- **Height**: a column grows with its cards up to the visible height of the panel; beyond that, the cards scroll inside the column while its header stays in place.
- Click a card to edit it, double-click to open its note and right-click to change its status.

## Gantt view

A timeline with one row per task, to see how your work spreads over days and weeks. It has its own tab and the same filter bar as the Kanban view. Rows are grouped by **area** and **sub-area** (collapsible, and each group remembers its state); notes outside any folder go to their own group.

- **What is drawn**: a task with two or more of 🛫 start, ⏳ scheduled and 📅 due is a **bar** from its start (🛫, or ⏳ if there is none) to its end (📅, or ⏳ if there is none), with a small notch for ⏳ when all three exist. A task with a single date is a **milestone** (a diamond). Tasks without any date wait below the chart in a collapsible **Tasks without a date** group, collapsed by default. A range written backwards (end before start) is drawn as a milestone with a ⚠ warning.
- **Zoom and navigation**: buttons for 7, 14 or 21 days or a calendar month; ◀ ▶ move the window, **Today** jumps to today, and the month tabs and year arrows jump to another month. The window follows the reference date shared with the calendar, and 7, 14 and 21-day windows start on your configured first weekday. A bar that leaves the window is cut at its edge.
- **Reading the chart**: thin vertical lines mark each day (stronger at the start of each week), weekends are shaded, a red line marks today and week bands show the week numbers. Each name shows the status icon, the priority icon and the title; 🔗 marks tasks with dependencies (hover it to see them). Hover a bar to see all of the task's dates.
- **Editing dates**: drag a bar to move all of its dates. Drag its left or right edge to change only the field that edge shows — a tooltip tells you which (🛫 start, ⏳ scheduled or 📅 due) — and a bar never ends before it starts. A milestone can be dragged to move it, and the handle beside it stretches it into a bar by creating the next date (start → scheduled → due; a milestone with only a due date creates a start date, on its left). Creation and done dates, 🆔 and ⛔ are never touched, and ⏳ keeps its time and duration.
- Click a row to edit the task, double-click to open its note and right-click to change its status.

## Automatic refresh

Views update on their own about half a second after something changes in your notes, so you don't need to switch tabs to see an edit made in another pane. Saving a note without touching a task does not redraw anything. Scroll position, search, filters and collapsed groups are kept, and the refresh waits while a modal, menu, date picker, drag or text field is in use. A view in a background tab updates when you return to it. At midnight, the views switch to the new day (the "today" marks, the Habit Routine) without any interaction.

## Next steps

- [5. Calendar Views](04-calendar-views.md) for the six calendar layouts.
- [9. Configuration](08-configuration.md) to customize which tabs are visible and how views behave.
