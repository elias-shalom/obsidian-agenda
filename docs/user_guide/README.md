# Agenda Tasks — User Guide

This folder contains the end-user manual for the **Agenda Tasks** Obsidian plugin, kept separate from the developer documentation in `docs/agenda-tasks/` and `docs/habit-tracker-agenda/`.

The manual is written once per language, in its own subfolder, with the same chapter files and the same order so the two versions stay easy to compare and keep in sync.

## Available versions

| Language | Folder |
|---|---|
| 🇬🇧 English | [en/](en/00-introduction.md) |
| 🇪🇸 Español | [es/](es/00-introduction.md) |

## Chapters

1. Introduction
2. Installation
3. Getting Started
4. Views Overview (Overview, List, Table)
5. Calendar Views
6. Habit Tracker
7. Task Format and Metadata
8. Gestures and Interactions
9. Configuration
10. FAQ and Support

## Adding a new language

1. Duplicate the `en/` folder and rename it to the target [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes) (the plugin's own UI locales in `src/locales/` use the same codes: `en`, `es`, `de`, `fr`, `it`, `pt`).
2. Translate each file, keeping the file names, headings order and internal links unchanged so cross-references between chapters keep working.
3. Add a row for the new language to the table above.

The manual is plain Markdown with no build step — "generating" a given language version just means reading (or exporting/printing) the files under that language's folder.
