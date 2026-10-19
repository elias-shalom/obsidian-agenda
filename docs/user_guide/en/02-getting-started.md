# 3. Getting Started

## Opening the plugin

Click the **Agenda** icon in the left sidebar ribbon. This opens a new tab with the plugin's main interface, where you can switch between the different view families using the header tabs.

By default, all view families are visible. You can hide the ones you don't use from **Settings → Agenda Tasks → Tab Visibility** (see [9. Configuration](08-configuration.md)).

## The main view families

| Tab | What it's for |
|---|---|
| **Overview** | A dashboard with key metrics, upcoming/overdue tasks and progress widgets |
| **Tasks** | One tab with a **List \| Table** switch: a compact list grouped by area, or a spreadsheet-style grid, both with search, filters, grouping and sorting |
| **Calendar** | Six calendar layouts to see tasks against a timeline |
| **Habits** | The Habit Tracker module (separate from tasks — see [6. Habit Tracker](05-habit-tracker.md)) |

Your tasks populate automatically: the plugin scans your vault for checkbox lines (`- [ ] ...`) and parses their metadata — there's nothing to import or configure before you see your existing tasks.

## Creating your first task

You can create a task from any view:

- **Command palette**: press `Ctrl+P` (or `Cmd+P` on macOS), search for an Agenda Tasks "create task" command.
- **Calendar views**: double-click an empty day cell, hour slot, or the "All day" section to open the task creation modal prefilled with that date (and time, where relevant).
- **List/Table toolbar**: use the create button in the view's toolbar.

The creation modal opens with a basic set of fields (title, scheduled date, priority) and an optional "More fields" section for everything else — see [7. Task Format and Metadata](06-task-format.md) for the full field reference.

## Editing an existing task

Click a task (in any view) to open the same modal, prefilled with its current data. Double-clicking a task instead opens the underlying note directly, with the cursor on that line.

## Common actions at a glance

| Action | How |
|---|---|
| Filter tasks | **+ Filter** in the Tasks tab (List and Table) |
| Create a task | `Ctrl+P`, the create button, or double-click in a calendar view |
| Edit a task | Click the task |
| Open the note behind a task | Double-click the task |
| Sort tasks | The **Sort by** selector, or a column header (Table) |

## Next steps

- [4. Views Overview](03-views-overview.md) — a closer look at Overview, List and Table.
- [5. Calendar Views](04-calendar-views.md) — the six calendar layouts.
- [8. Gestures and Interactions](07-gestures.md) — the full click/double-click/drag reference.
