# Write via the adapter instead of the vault's index-backed API

`writeIcsFile` used to decide whether to create or overwrite the export
folder and the `.ics` file by checking `app.vault.getAbstractFileByPath()`
first, calling `vault.createFolder()`/`vault.create()` when it came back
empty. On mobile that check can say "doesn't exist" for something that
actually does -- the vault's in-memory file index can lag behind the
adapter's real state, most visibly right after a sync brings in a folder or
file created from another device. `createFolder`/`create` then throw
"already exists," and since that rejection wasn't handled anywhere up the
call chain, the whole export failed with that message and no file was
written.

A first pass at fixing this (catching exactly an "already exists" failure
and falling back to `getAbstractFileByPath` + `modify`) turned out not to be
enough: re-querying the index immediately after the failed `create` call can
still come back empty -- there's no guarantee the index has caught up by
then either, so the fallback's own lookup hit the same lag and re-threw.

`writeIcsFile` now bypasses the index-backed API entirely and talks to
`app.vault.adapter` directly: `adapter.exists()` is documented as the
authoritative, non-cached existence check (`getAbstractFileByPath` is the
"faster" but index-backed alternative per its own doc comment), and
`adapter.write()` unconditionally creates-or-overwrites -- there's no
"already exists" failure mode to hit in the first place.

## Consequences

- Writing through the adapter bypasses the vault's normal `create`/`modify`
  events. Nothing in this plugin listens for those on the export folder, so
  this doesn't currently matter, but it's a real difference from how the
  rest of the plugin touches vault files (e.g. `readNoteBody`'s
  `vault.cachedRead`) worth remembering if that ever changes.
- `adapter.mkdir()` on a folder that already exists (the same lag, just one
  level up) hasn't been observed throwing the way `vault.createFolder()` did
  -- if it ever does, the fix is the same idea applied there too.
