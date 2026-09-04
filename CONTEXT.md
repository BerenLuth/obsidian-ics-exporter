# ics-exporter

An Obsidian plugin that exports a note's deadline as a calendar event.

## Language

**Deadline**:
The `deadline` frontmatter property on a note. Valid only as Obsidian's native Date (`YYYY-MM-DD`) or Date & time (`YYYY-MM-DDTHH:mm`) property shape — anything else is not a Deadline, it's just unrecognized text sitting in that field.
_Avoid_: due date, date

**Export**:
Turning a note's Deadline into a calendar event (VEVENT) and writing it to an `.ics` file inside the vault's export folder (a setting, default `.ics/`).
_Avoid_: download, save as
