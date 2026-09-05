# Export as .ics

Turn a note's deadline into a calendar event, in one command.

## How it works

Run **Export current note as .ics calendar event** from the command palette (or bind it to a hotkey in **Settings → Hotkeys**, like any other command). It reads the note's `deadline` frontmatter property:

- If it's a valid date (`YYYY-MM-DD`) or date & time (`YYYY-MM-DDTHH:mm`) — Obsidian's own Properties date formats — it's used directly.
- Otherwise you're asked to pick a date, which is then written back to `deadline`.

The event is saved as `<note name>.ics` inside an export folder in your vault, ready to import into whatever calendar app you use.

## Features

- Works entirely offline, inside your vault — no accounts, no syncing, no external services.
- On desktop, optionally opens the `.ics` with your system's default app right after export.
- On mobile, optionally shares it via your device's share sheet, so you can hand it straight to a calendar app.
- Re-exporting a note updates the same event instead of creating a duplicate.
- Choose what goes in the event description: a link back to the note, the note body, or both.

## Settings

- **Export folder** — vault folder exports are saved into (default `.ics/`).
- **Event description** — what to put in the exported event's description.
- **Save picked deadline to note** — writes a manually picked date back to the note's `deadline` property.
- **Open after export** — hands the file off immediately after saving (opens on desktop, shares on mobile).

## Developing

- `npm i` to install dependencies.
- `npm run dev` to compile `src/main.ts` to `main.js` in watch mode.
- `npm run build` to type-check and produce a production build.
- `npm run lint` to run ESLint.

## Manually installing

Copy `main.js` and `manifest.json` to `VaultFolder/.obsidian/plugins/ics-exporter/`, then enable the plugin in **Settings → Community plugins**.
