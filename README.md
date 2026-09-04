# ics-exporter

A Vibe-coded Obsidian plugin with one command: **Export current note as .ics calendar event**.

Run it from the command palette (or bind it to a hotkey in **Settings → Hotkeys**, like any other command). It reads the note's `deadline` frontmatter property:

- If it's a valid date (`YYYY-MM-DD`) or date & time (`YYYY-MM-DDTHH:mm`) — Obsidian's own Properties date formats — it's used directly.
- Otherwise you're asked to pick a date, which is then written back to `deadline`.

The event is written to `.ics/<note name>.ics` in the vault. See [CONTEXT.md](./CONTEXT.md) for terminology and `docs/adr/` for the reasoning behind a couple of non-obvious choices.

## Developing

- `npm i` to install dependencies.
- `npm run dev` to compile `src/main.ts` to `main.js` in watch mode.
- `npm run build` to type-check and produce a production build.
- `npm run lint` to run ESLint.

## Manually installing

Copy `main.js` and `manifest.json` to `VaultFolder/.obsidian/plugins/ics-exporter/`, then enable the plugin in **Settings → Community plugins**.
