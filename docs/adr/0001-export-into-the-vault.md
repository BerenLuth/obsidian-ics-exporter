# Export into the vault instead of an OS save dialog

`manifest.json` sets `isDesktopOnly: false`, so the plugin can't rely on
Electron/Node-only APIs like a native "Save As" dialog, which only exist on
desktop. Instead, `.ics` files are written into the vault (`.ics/<note>.ics`)
via `app.vault.create()` / `app.vault.modify()`, which works identically on
desktop and mobile. The trade-off: there's no picker for exporting to an
arbitrary location outside the vault -- the destination is fixed.
