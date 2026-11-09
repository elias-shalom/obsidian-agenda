# 9. Configuration

Access every plugin setting via **Obsidian Settings → Community Plugins → Agenda Tasks**. The panel has three tabs at the top — **General**, **Calendar** and **Habits** — and each tab shows only its own settings, as listed below.

## General settings

- **Show what's new after an update** — opens a window with the news the first time you start Obsidian after updating the plugin (on by default). It appears once per update and, if you skipped several versions, lists them all.

## Tab Visibility

- Show/hide each top-level tab independently: **Overview**, **Tasks**, **Kanban**, **Gantt**, **Calendar** and **Habits**. **Show Tasks tab** replaces the old List and Table switches: the **List | Table** switch inside the tab always offers both modes (if you had hidden only one of them before, you now see both).
- **Show Habits tab** hides the whole Habits tab; it appears only when it is on and at least one habit view is on.
- Habit Tracker tabs have their own group (see **Habits** below).

## Calendar

- **Week starts on** — which weekday calendar views treat as the first day of the week.
- **Show Due/Start/Scheduled Dates** — independently choose which date types appear on calendar views, each with its own icon + color badge (see [7. Task Format and Metadata](06-task-format.md)).
- **Show Completed Tasks** — keep completed tasks dimmed on the calendar, or hide them entirely.
- **List view: days to show** — the rolling window size for the calendar's List view (minimum 7, maximum 14, default 14). See [5. Calendar Views](04-calendar-views.md).
- **Projected recurring tasks** — how many future occurrences of each recurring task (🔁) the calendar shows (0 to 50, default 10; 0 turns it off). They appear in the Month, Week, Work Week, Day and List views as outline-only pills (no fill, dashed border, italic title) with a 🔁 badge at the start, so they are not mistaken for completed tasks (which stay filled, faded and struck through). They are read-only: you cannot drag, resize, complete or change their status; click opens the real task and double click opens its note. Completing the real task writes the next occurrence as usual (the copy that took its place is then replaced by the new line), and a daily task stops being drawn after N days. Tasks that end in `when done` are not projected, and the calendar filters apply to the copies too. You can also hide all the copies at once with the **Recurring tasks** item of the calendar's **+ Filter** menu (ticked by default), without changing this setting.
- **Non-working days** — one checkbox per weekday, Monday to Sunday (Saturday and Sunday by default). The marked days are shaded in the calendar's Month, Week and List views and in the Gantt; the Work Week view hides them. They are also the days of the habit frequencies "Weekend" and "Work week" and of the recurrences `every weekend` and `every weekday`, so changing them changes habit streaks and percentages and the dates of those recurring tasks. At least one working day and one non-working day must remain; a checkbox that would break this stays as it was and a notice explains why.
- **Holiday calendars** — a list of public-holiday calendars (none is active by default). Each one has a country (Mexico or United States), an optional region (state) that adds that state's holidays to the national ones, the **Official** and **Unofficial** checkboxes (Mother's Day, Day of the Dead and Halloween are unofficial) and a color; use **Add holiday calendar** to add one and the trash button to remove it. Holidays are drawn with a soft tint of that color: a name label in Month, Week, Work Week and List, under the date in Day, a dot with a tooltip in Year and a tinted column in the Gantt. They are visual only: they do not affect the Work Week, habit streaks or tasks.

## Habits

- **Habits folder path** — the vault folder (scanned recursively) containing habit notes. Default: `daily plan/daily routine/habit`. Under the field, Settings tells you whether the folder exists (a missing folder does not stop you from saving). If it does not exist when you create your first habit, you are asked to create it, with an editable path.
- **Days to show in grid** — number of day-columns rendered in the Habit Grid and history charts.
- **Show streaks** — toggle streak indicators and counts.
- **Show daytime for single-daytime habits** — show a small localized daytime badge beside the habit name in Grid and Weekly (on by default; multi-daytime rows always show the badge).
- **Default max gap (days)** — default tolerance before a streak breaks, used as the starting value when creating a new habit.
- **Default priority** — starting priority value (1–5) for new habits.
- **Default color** and **sub-area field visibility** — additional Habit Creator defaults.

### Habit tabs visibility

- Show/hide each Habit Tracker view independently: **Grid**, **Dashboard**, **Daily Routine**, **Weekly**, **Table**.
- A manual **refresh** action to rebuild the habit cache, if a view looks out of date.

## Advanced / Task Modal behavior

- **Keyboard shortcuts** — customizable, including the command to insert a task field from the editor without opening a modal (see [7. Task Format and Metadata](06-task-format.md)).
- **Task Modal mode** — the "More fields" (advanced) section of the Create/Edit Task modal remembers whether you left it expanded or collapsed, per device.

## Next step

[10. FAQ and Support](09-faq-support.md) for common questions and where to get help if something isn't working as expected.
