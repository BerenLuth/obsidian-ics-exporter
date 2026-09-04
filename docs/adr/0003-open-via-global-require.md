# Reach Electron's `shell.openPath` via the global `require`

"Open after export" (a settings toggle, default on) opens the saved `.ics`
file with the OS's default handler, so a calendar app can import it right
away. There's no Obsidian API for this and no `electron` npm dependency in
this project (no `@types/electron`, and `esbuild.config.mjs` already treats
`electron` as external) -- so `open-with-default-app.ts` reaches Electron's
`shell` module through the `require` that Obsidian's desktop renderer exposes
globally, a pattern already common among Obsidian plugins that need one-off
Electron/Node access without bundling the whole API surface.

## Consequences

This only works in the Electron-based desktop app -- `window.require` doesn't
exist in the Capacitor-based mobile app, so the feature silently no-ops there
(surfaced to the user via the export Notice, not a settings-tab restriction).
If a future Obsidian sandboxing change removes this global, the fix is
contained to this one file.
