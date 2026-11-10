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
- **Active period** — optional **Active from** and **Active until** dates (each with a button to clear it). Days outside that period are neutral for the habit, like days it is not scheduled: they do not break or add to a streak and do not count in its percentages. With no dates the habit behaves as before.
- **Active/Inactive** — a switch to pause a habit without deleting it. Turning it **off** fills **Active until** with today (a date earlier than today that you had already set is kept) and turning it **on** clears it, so deactivating a habit does not change the percentages of past dates in the Dashboard and the heatmap: the habit keeps counting up to that day. Days between deactivating and reactivating count as missed.

## The five views

Switch between them with the row of round icon buttons at the right of the toolbar (hover or long-press a button to see its name); the current view is highlighted. Which buttons appear depends on the **Habit tabs visibility** settings.

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

## Vacations

Define vacation periods in **Settings → Agenda Tasks → Habits → Vacations** (each period has a start date, an end date and an optional name, such as "Christmas"), or click the **🌴** button in the Habit Tracker toolbar to jump straight there. They apply to **all** habits:

- A vacation day you **didn't** tick is neutral: it doesn't break the streak, doesn't count as missed and doesn't lower any percentage.
- A vacation day you **did** tick counts, but only for that habit: it extends its streak and enters its percentage.
- The Grid and Weekly views show vacation days dimmed with a 🌴 icon (the tooltip shows the period name), and the yearly heatmap shows untouched vacation days with diagonal stripes instead of 0%. You can still tick any dimmed cell.

If the button can't open the settings (it relies on an undocumented Obsidian API), a notice shows the path to follow by hand.

## Habits in the calendar

The Calendar tab shows a small chip on each day with the habits done out of those due that day, so you can see them next to your tasks. Click it to tick habits and open their notes without leaving the calendar; hide it with the **Habits** item of the calendar's **+ Filter** menu. It is shown by default and only offered when you have habits and the Habits tab is visible. See [5. Calendar Views](04-calendar-views.md) for the details.

## Next steps

- [8. Gestures and Interactions](07-gestures.md) for the Habit Tracker gesture reference.
- [9. Configuration](08-configuration.md) for all Habit Tracker settings.
