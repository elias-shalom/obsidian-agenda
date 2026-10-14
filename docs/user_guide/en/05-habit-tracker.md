# 6. Habit Tracker

The **Habit Tracker** is a separate module from tasks, focused on recurring habits you want to track day by day (for example, "exercise", "read 20 minutes", "drink water"). It lives under its own **Habits** tab.

## What is a habit note

Each habit is backed by a Markdown note inside a configurable vault folder (default: `daily plan/daily routine/habit`, changeable from **Settings ▸ Habits ▸ Habits folder path**). The note's frontmatter stores the habit's metadata (name, description, schedule, priority, etc.) and its completion history.

You don't need to create or edit these notes by hand — the **Habit Creator** modal does it for you.

## Creating and editing a habit

Open the Habit Creator (from any Habit Tracker view, via its "create" action or by clicking an existing habit to edit it) to set:

- **Name** and **description**.
- **Time** — a circular time dial to pick a time of day.
- **Daytime(s)** — morning/afternoon/evening/etc.; a habit can be scheduled more than once a day across different daytimes.
- **Frequency** — every day, work week, weekend, or specific weekdays (checkboxes and the frequency dropdown stay in sync with each other).
- **Priority** — a 1–5 slider, used for weighted completion percentages on the Dashboard.
- **Max gap** — a slider setting how many days a streak tolerates missing before it breaks.
- **Area** — a free-form field (not a fixed list) suggested from your vault's root folders.
- **Related files** — optional wikilinks to supporting notes, added and removed individually.
- **Active/Inactive** — a switch to pause a habit without deleting it.

## The five views

### Habit Grid

A GitHub-style day-by-day grid: rows are habits (or one row per occurrence, for multi-daytime habits), columns are days. Click a cell to toggle that day as done/not done. Completed streaks are rendered as a single merged "pill" with a configurable sort order (alphabetical, area, daytime, priority, streak, completion %).

### Daily Routine

Today's habits (or any navigable day), grouped by daytime or by area (toggle between the two), ordered by priority, with weighted progress bars. Each habit has quick actions to open its note or open the Habit Editor. Groups can be collapsed independently, and the collapsed state is remembered.

### Habit Dashboard (default view)

The at-a-glance summary:

- Today's raw and priority-weighted completion percentage.
- Current and best streaks.
- Side-by-side breakdowns by area and by daytime.
- A 30-day history chart.
- A GitHub-style yearly heatmap, navigable by year.

### Weekly view

A 7-day matrix (habit × day of the week) sharing the same visual language as the Grid (pills, circles, sorting). Days outside a habit's frequency are dimmed.

### Habit Table/List

A sortable catalog of all habits (including inactive ones, shown read-only) with columns for area, related-file link, frequency, priority, daytime, time, and streak.

## Streaks and gaps

A streak counts consecutive completed occurrences. The **max gap** setting controls how many unscheduled/missed days in a row are still tolerated before the streak resets — useful for habits that aren't scheduled every single day. A habit completed on a day that's since been removed from its frequency shows a distinct "conflict" marker instead of silently breaking the streak.

## Next steps

- [8. Gestures and Interactions](07-gestures.md) for the Habit Tracker gesture reference.
- [9. Configuration](08-configuration.md) for all Habit Tracker settings.
