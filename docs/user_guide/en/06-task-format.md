# 7. Task Format and Metadata

Agenda Tasks reads standard Obsidian checkbox tasks (`- [ ] ...`) and is fully compatible with the [Obsidian Tasks plugin](https://github.com/obsidian-tasks-group/obsidian-tasks)'s emoji metadata format. You can keep using Obsidian Tasks (or write tasks by hand) — nothing about how you write a task line needs to change.

## Supported metadata

| Metadata | Icon | Example | Notes |
|---|---|---|---|
| Due date | 📅 | `- [ ] Task 📅 2024-12-31` | Always a whole day |
| Scheduled date | ⏳ | `- [ ] Task ⏳ 2024-06-15` | The only date that can carry a time/duration |
| Scheduled time | 🕐 | `- [ ] Task ⏳ 2024-06-15 🕐 14:30` | Optional, 24h `HH:mm`; requires a scheduled date |
| Duration | ⏱️ | `- [ ] Task ⏳ 2024-06-15 🕐 14:30 ⏱️ 90m` | Optional, minutes; requires a scheduled time |
| Start date | 🛫 | `- [ ] Task 🛫 2024-06-01` | Always a whole day |
| Priority | ⏬🔽🔼⏫🔺 | `- [ ] Task ⏫` | Lowest / Low / (Normal, no icon) / Medium / High / Highest |
| Recurrence | 🔁 | `- [ ] Task 🔁 every day` | Natural-language recurrence; see **Recurring tasks** below |
| Depends on | ⛔ | `- [ ] Task ⛔ abc123,def456` | Comma-separated task IDs |
| On completion | 🏁 | `- [ ] Task 🏁 delete` | `keep` or `delete` |
| ID | 🆔 | `- [ ] Task 🆔 abc123` | Referenced by `⛔` on other tasks |
| Tags | `#tag` | `- [ ] Task #project #urgent` | Standard Obsidian tags |

> Scheduled time and duration (and every field above) are recognized **anywhere on the line**, in any order — they don't need to be adjacent to each other or in a specific sequence.

## Example tasks

```markdown
- [ ] Complete project documentation 📅 2024-12-31 ⏫ #project #documentation
- [ ] Review pull requests ⏳ 2024-06-15 #code-review
- [ ] Team standup ⏳ 2024-06-16 🕐 09:00 ⏱️ 15m 🔁 every weekday
- [x] Submit final report 🛫 2024-06-01 ✅
```

## Task status

Every task has one of **six** statuses, shown as a status icon on its calendar pill and selectable from a right-click menu or the Task Modal:

| Status | Symbol | Icon |
|---|---|---|
| Todo | ` ` | ⭕ |
| In Progress | `/` | 🛠️ |
| On Hold | `?` | ⏸️ |
| Done | `x` | ✅ |
| Cancelled | `-` | ❌ |
| Not a task | other | 🗑️ |

Marking a task **Done** adds its completion date (✅); changing it away from Done removes that date again — the same behavior as ticking the native Obsidian checkbox.

## Creating and editing tasks

### The Task Modal

Opened when you create a task (see [3. Getting Started](02-getting-started.md)) or click an existing one. It has:

- **Basic fields** — title, scheduled date, priority (one-click segmented selector), status.
- **A "More fields" section** (remembers whether you left it expanded or collapsed) with: start date, due date, scheduled time/duration, recurrence, dependencies, on-completion behavior, and a custom ID.
- The due/start/scheduled fields all open the same calendar-style date picker used in calendar views, with a dot marking days that already have tasks.

### Inserting or editing a field from the editor

You don't have to open a modal to add or change a field on a task line you're already editing:

- **Right-click** on a task line to get a context menu with field options (date, time, duration, priority, etc.).
- Or use the **"Insert task field"** command (bindable to a keyboard shortcut) from the command palette.

Both use the same native-feeling date picker and an iOS-style scroll wheel for the time.

## Recurring tasks

Give a task a recurrence rule (🔁, e.g. `every day`, `every week`, `every month when done`) and, when you mark it **Done**, the plugin automatically inserts a new line right above it with the next occurrence:

- The next date is computed from whichever date anchors the task, with priority `scheduled` > `due` > `start`.
- A `when done` suffix computes the next occurrence from **today** instead of the original date — useful for tasks like "water the plants" where the schedule should restart from when you actually did it.
- The new occurrence drops the `🆔` and `⛔` fields (an ID/dependency shouldn't be duplicated) and keeps every other field shifted by the same relative amount.

## Next steps

- [8. Gestures and Interactions](07-gestures.md) for how to trigger all of this with clicks, double-clicks, and drags.
- [9. Configuration](08-configuration.md) for calendar date-type and completed-task display settings.
