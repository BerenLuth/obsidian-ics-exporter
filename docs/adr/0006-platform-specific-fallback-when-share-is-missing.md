# Fall back to platform-specific tricks when Web Share is unavailable

ADR 0004 bet on `navigator.share` as mobile's substitute for
`openWithDefaultApp`. On-device testing showed Obsidian's mobile WebView
doesn't expose it at all. Checking `window.Capacitor.Plugins` from inside the
plugin confirmed there's no bundled Capacitor `Share` plugin either (the
registered list was `App, KeepAwake, Device, Keyboard, SecureStorage,
StatusBar, RateApp, SplashScreen, Clipboard, Haptics, CapacitorCookies,
WebView, Filesystem, Preferences, CapacitorHttp, Browser`) -- so there's no
bridge call to reach for as a replacement, and (per ADR 0004) this plugin
still can't ship native code of its own to add one.

Two platform-specific tricks were considered, neither needing native code:

- **Android** -- tried and confirmed dead. `android-calendar-intent.ts`
  built an `intent://` URI encoding an `ACTION_INSERT` /
  `CalendarContract.Events` / `vnd.android.cursor.item/event` intent (the
  exact intent the user originally asked about, just expressed as a URI
  instead of a Java `Intent` object), betting that Capacitor's Android
  bridge would hand `intent://` navigations off to `Intent.parseUri` +
  `startActivity` the way Chrome's browser does. `adb logcat` while
  triggering it on a real device showed:
  ```
  ActivityTaskManager: START u0 {act=android.intent.action.VIEW dat=intent:///...} ... result code=-91
  ```
  `act=android.intent.action.VIEW`, not `INSERT` -- Obsidian's WebView
  doesn't parse `intent://` as an encoded Intent at all; it just falls back
  to a generic "unknown scheme -> fire `ACTION_VIEW` with the literal string
  as data" handler, which has nothing to resolve to. That's not something
  fixable from this plugin's JS -- it depends on how Obsidian's own
  WebViewClient handles unrecognized schemes. `android-calendar-intent.ts`
  was deleted; on Android, `shareIcsFile` now just returns a message telling
  the user to open the exported file from a file manager instead (Android's
  own "Open with" chooser is a different, unrelated mechanism -- a real
  implicit `ACTION_VIEW`/`ACTION_SEND` with a proper MIME type -- and isn't
  affected by any of this).
- **iOS** -- untested, kept. Navigating to a `data:text/calendar` URI bets on
  a WebKit rendering-engine behavior (recognizing a `text/calendar` payload
  and presenting its own native "Add to Calendar" sheet, the same thing that
  happens tapping an `.ics` link in Safari) rather than anything Obsidian's
  app shell has to opt into or intercept -- a meaningfully different
  mechanism than the Android attempt above, not just "the same idea on the
  other platform." Still needs on-device confirmation.

`shareIcsFile` tries `navigator.share` first (kept in case a future Obsidian
version adds it), then the iOS trick on `Platform.isIosApp`, and otherwise
gives up with a message pointing at the manual file-manager route.

## Consequences

- Mobile calendar handoff is not fully automatic on Android, and is
  unconfirmed on iOS. The vault-relative export path (ADR 0001) is the
  actual fallback users have on Android today -- worth making sure that path
  is easy to find/act on if this keeps mattering.
- The iOS fallback is still fire-and-forget: `window.location.href = ...`
  doesn't throw or reject regardless of whether anything on the other end
  actually handled it, so `shareIcsFile` reports success as soon as the
  attempt is made, with no way to detect a silent no-op (e.g. Obsidian's
  WKWebView navigation delegate blocking the `data:` navigation before
  WebKit gets to it). Same blind spot ADR 0004 already accepted for the Web
  Share path, just with less confidence backing it this time.
- If this iOS attempt also turns out dead on real hardware, there's no
  native-code-free trick left to try there either, and mobile calendar
  handoff becomes "point the user at the exported file" on both platforms.
