# 10. FAQ and Support

## Frequently asked questions

**I don't see a task I just wrote — why?**
Make sure the line uses Obsidian's checkbox syntax exactly (`- [ ] ...`, with the space inside the brackets for an incomplete task). The plugin re-scans notes as you edit them, so this is usually immediate; if a view still looks stale, switch tabs and back, or use the Habit Tracker's manual refresh action (Habits settings group) if the issue is on a habit instead of a task.

**How do I change the plugin's language?**
Agenda Tasks follows Obsidian's own display language setting (**Settings → General → Language**). It currently ships translations for English, Spanish, German, French, Italian, and Portuguese.

**Can I use this alongside the Obsidian Tasks plugin?**
Yes — Agenda Tasks reads the same emoji metadata format, so tasks written by either plugin (or by hand) are understood the same way. See [7. Task Format and Metadata](06-task-format.md).

**Why did my recurring task's next occurrence not appear where I expected?**
Check which date you used as the task's recurrence anchor: the next occurrence is computed from whichever date is set, with priority `scheduled` > `due` > `start`. If the recurrence rule ends in `when done`, the next date is computed from **today**, not from the original date.

**A calendar view looks empty even though I have tasks on that day.**
Check **Settings ▸ Calendar**: completed tasks might be hidden, or the date type your task uses (`due`/`start`/`scheduled`) might be turned off for display.

**Habits and tasks look unrelated — is that intentional?**
Yes. The Habit Tracker is a separate module for recurring habits (backed by their own notes), independent from the task views. See [6. Habit Tracker](05-habit-tracker.md).

**The "what's new" window appeared after an update — can I turn it off?**
Yes: turn off **Show what's new after an update** in **Settings ▸ Agenda Tasks**. The window appears once per update and is shown in your language.

**Why can't I drop a Kanban card on another tag or folder column?**
Tag and folder columns are read-only: moving a task to another folder would mean moving it to another note. Group by **Status** or **Priority** to change those by dragging.

**Why does a task not appear in the Gantt chart?**
A task needs at least one of 🛫, ⏳ or 📅. Tasks without any date are listed in the **Tasks without a date** group below the chart (collapsed by default), and a task outside the visible window shows up when you move the window or change the zoom.

## Getting help

- 📖 Check the project [Wiki](https://github.com/elias-shalom/obsidian-agenda/wiki).
- 🐛 Report bugs on [GitHub Issues](https://github.com/elias-shalom/obsidian-agenda/issues).
- 💡 Suggest features via GitHub Discussions on the same repository.

## Giving feedback

Feature requests, bug reports, usage suggestions, and translation improvements are all welcome through the same GitHub Issues/Discussions channels above.

## Supporting the project

If you find the plugin useful, consider starring the [GitHub repository](https://github.com/elias-shalom/obsidian-agenda), sharing it with others, or leaving a review in the Obsidian Community Plugins browser.
