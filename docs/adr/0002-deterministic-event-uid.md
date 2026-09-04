# Derive each event's UID from the note's vault-relative path

Each exported VEVENT's `UID` is a hash of the note's vault-relative path,
not a random value. Re-exporting a note after its deadline changes and
re-importing the `.ics` file into a calendar app updates the existing event
instead of creating a duplicate -- matching the "re-export overwrites the
same file" behavior the plugin already has for the `.ics/` file itself.

## Consequences

If a note is renamed or moved, its next export gets a *new* UID (the path
changed). Any calendar that already imported the old file will end up with
two events -- the old one and the renamed note's new one -- rather than the
old one being updated. This is a known, accepted gap: fixing it would need
a stable per-note identifier independent of path, which the plugin doesn't
otherwise need.
