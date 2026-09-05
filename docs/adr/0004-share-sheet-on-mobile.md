# Use the Web Share API on mobile instead of opening the file

"Open after export" needs a mobile equivalent: `openWithDefaultApp` (ADR
0003) only works on desktop, since it depends on Electron's `shell` module via
`window.require`, which doesn't exist in Obsidian's Capacitor-based mobile
app. The obvious-looking alternative -- firing an Android intent directly
(`ACTION_INSERT` against `CalendarContract.Events.CONTENT_URI`) -- isn't
reachable from a community plugin at all: plugins only run as JS inside the
WebView Obsidian's mobile app already ships with, and firing a native
`Intent` requires Java/Kotlin code registered in that host app. There's no
bridge for it, and a plugin can't add native code to someone else's compiled
app.

What mobile's WebView *does* support is the standard Web Share API
(`navigator.share`, with the `files` array). `share-ics-file.ts` builds the
`.ics` as a `File` and passes it to `navigator.share`, which opens the native
share sheet on both Android and iOS -- the same UI a system "Share" button
would produce. From there the user picks whatever app on their device
accepts `text/calendar` (or handles files generically) to import the event.

`export-note-as-ics.ts` picks between `openWithDefaultApp` and
`shareIcsFile` using the same `FileSystemAdapter` check that already
distinguished desktop from mobile.

## Consequences

- Unlike desktop's `openWithDefaultApp`, which reliably launches the user's
  actual calendar app, the mobile share sheet just lists whatever's
  registered as a share target on that device. Not every calendar app
  registers for `text/calendar` shares -- the user may need to pick a viewer
  app first, or the calendar app of their choice may not show up at all.
  This is a platform limitation, not something this plugin can fix.
- `navigator.share` needs a feature check (older WebViews may lack it) and
  the user dismissing the share sheet without picking anything is treated as
  success, not an error -- there's no way to distinguish "cancelled" from
  "shared" via this API, same blind spot `openWithDefaultApp` already has
  around whether the calendar app actually imported the file.
- The `.ics` file is still written into the vault first either way (ADR
  0001) -- sharing doesn't require that, but keeping it means there's always
  a file the user can find again if the share sheet doesn't pan out.
