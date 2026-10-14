# 1. Introduction

**Agenda Tasks** is a task management and calendar plugin for [Obsidian](https://obsidian.md). It turns your vault into a productivity system by reading the tasks you already write in your notes and presenting them through several dedicated views, without changing how you write tasks.

> This manual covers plugin version **1.1.10**. For a plain list of what changed between versions, see the Changelog section of the project [README](../../../README.md#changelog).

## What it does

- Scans your entire vault for checkbox tasks (`- [ ]`) and keeps them up to date in real time as you edit notes.
- Is fully compatible with the [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) plugin's metadata format (dates, priority, recurrence, tags, etc.), so existing notes keep working unchanged.
- Adds its own optional extensions on top of that format: a scheduled time and duration, a 6-state status (including "On Hold"), and automatic next-occurrence generation for recurring tasks.
- Offers five view families, each suited to a different way of working:
  - **Overview** — a dashboard with key metrics and quick access to upcoming/overdue tasks.
  - **List** — a compact list of tasks grouped by folder.
  - **Table** — a spreadsheet-style, sortable grid of tasks.
  - **Calendar** — six layouts (Day, Week, Work Week, Month, Year, List) to see tasks against a timeline.
  - **Habit Tracker** — a separate module (Grid, Daily Routine, Dashboard, Weekly, Table) to track recurring habits, independent from tasks.

## Who this manual is for

This manual is written for people **using** the plugin in their own vault. If you are looking for implementation details, architecture notes or contribution guidelines, see the developer documentation in [`docs/agenda-tasks/`](../../agenda-tasks/) and [`docs/habit-tracker-agenda/`](../../habit-tracker-agenda/) instead.

## How this manual is organized

| Chapter | Content |
|---|---|
| [2. Installation](01-installation.md) | Installing and enabling the plugin |
| [3. Getting Started](02-getting-started.md) | Opening the plugin and creating your first task |
| [4. Views Overview](03-views-overview.md) | Overview, List and Table views |
| [5. Calendar Views](04-calendar-views.md) | Day, Week, Work Week, Month, Year and List calendar views |
| [6. Habit Tracker](05-habit-tracker.md) | Creating habits and using the Habit Tracker views |
| [7. Task Format and Metadata](06-task-format.md) | Supported emoji metadata, examples, creating/editing tasks |
| [8. Gestures and Interactions](07-gestures.md) | Click/double-click/drag reference for every view |
| [9. Configuration](08-configuration.md) | All plugin settings, grouped by area |
| [10. FAQ and Support](09-faq-support.md) | Common questions and where to get help |

## Screenshots

Representative screenshots of each view are available in the project's [`screenshots/`](../../../screenshots/) folder and in the main [README](../../../README.md#screenshots).
