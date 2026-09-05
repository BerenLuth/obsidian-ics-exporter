# Try Android's own download flow before giving up

ADR 0006 ruled out the `intent://` URI trick on Android (confirmed dead via
`adb logcat` -- Obsidian's WebView doesn't parse it as an encoded Intent) and
left Android with no automatic fallback, just a message pointing at manually
opening the file from a file manager.

There's a different, untested mechanism worth trying first: Android's
`WebView.setDownloadListener()`. When a hosting app has one registered (the
normal way apps hand a non-renderable resource off to Android's own
`DownloadManager`), a page asking to download something -- the standard way
being a synthetic click on an `<a download>` element -- becomes a real
downloaded file, complete with the OS's own "download complete" notification.
Tapping that notification opens the file via a normal `ACTION_VIEW` intent
with the right MIME type, same as tapping a downloaded `.ics` from any
browser -- which is exactly the flow the plugin author asked for after ADR
0006's dead end. This is a genuinely different code path from the `intent://`
attempt (Android's download machinery vs. its scheme-based external-app
resolution), so ADR 0006's negative result doesn't say anything about
whether this works.

`tryDownloadFallback` (in `share-ics-file.ts`) builds a `data:text/calendar`
URI and, on Android, creates a detached `<a download>` pointing at it and
clicks it. The `download` attribute is what signals "hand this to the
download flow, don't try to navigate/render it" -- without it, this would
just be a plain navigation attempt (which is deliberately what the iOS branch
still does instead, since iOS's fallback depends on the opposite: WebKit
recognizing the payload as inline content, not a forced download).

## Consequences

- **Update, on-device testing**: confirmed dead. Clearing `adb logcat`,
  triggering the export, and filtering for `ActivityTaskManager`,
  `DownloadManager`, `chromium`, `WebView`, `console`, and `csp` turned up
  nothing related at all -- not even a failed attempt (contrast the
  `intent://` test in ADR 0006, which at least produced a visible
  `ActivityTaskManager: START` line). The click produced literally no
  observable effect at the OS or WebView-console level, consistent with
  Obsidian's Android WebView simply having no `DownloadListener` registered
  -- `data:` is a scheme WebView can normally load itself, so with no
  listener to hand non-renderable content to, it's silently dropped rather
  than triggering any fallback path the way an unrecognized scheme does.
  `tryDownloadFallback`'s Android branch was removed; the fallback message
  ("open it from a file manager") applies there now.
- This closes out the native-code-free options for Android: `navigator.share`
  (absent), a bundled Capacitor `Share` plugin (not registered), `intent://`
  (ADR 0006, misparsed), and this download trick are all confirmed dead.
  There is no fifth idea queued -- automatic calendar handoff on Android
  would need either native plugin code (not possible for this plugin, see
  ADR 0004) or a service-specific, network-dependent approach (e.g. a
  Google Calendar "quick add" web link opened via Capacitor's bundled
  `Browser` plugin, which was considered and deliberately not pursued: it
  only helps Google Calendar users, needs network + a signed-in account, and
  breaks this plugin's local/offline design -- a product trade-off, not a
  technical one, left for the plugin author to decide on separately if it
  ever comes up again).
- The iOS fallback (see ADR 0006) is unaffected by this finding -- it
  depends on WebKit's own content-type handling, not on Obsidian's WebView
  having a `DownloadListener`, so it remains a genuinely open question until
  tested on an iOS device.
