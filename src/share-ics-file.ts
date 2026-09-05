import { Platform } from 'obsidian';

/** Hands an event off to the OS so the user can add it to a calendar, without
 * any native plugin code of this plugin's own -- see ADR 0004 (mobile has no
 * Electron/Node access, so `openWithDefaultApp` doesn't work there) and ADR
 * 0006/0007 (why direct Android/iOS calendar APIs aren't reachable either,
 * and what this falls back to instead).
 *
 * Tries the Web Share API first; Obsidian's mobile WebView doesn't currently
 * expose it (confirmed -- see ADR 0006), but the check costs nothing and
 * covers a future Obsidian version that does. Below that, tries an iOS-
 * specific trick per ADR 0006/0007; Android has no remaining option (both
 * ADRs -- confirmed dead on-device).
 *
 * Resolves to an error message on failure, or null on success -- "success"
 * for the iOS fallback only means the attempt was made; unlike the Web Share
 * path, there's no signal at all for whether it landed anywhere. */
export async function shareIcsFile(filename: string, contents: string): Promise<string | null> {
	if (!navigator.share) return tryIosFallback(contents);
	return shareViaWebShare(filename, contents);
}

async function shareViaWebShare(filename: string, contents: string): Promise<string | null> {
	const file = new File([contents], filename, { type: 'text/calendar' });
	if (navigator.canShare && !navigator.canShare({ files: [file] })) {
		return "This device can't share this file.";
	}

	try {
		await navigator.share({ files: [file] });
		return null;
	} catch (error) {
		// Dismissing the share sheet without picking anything rejects the
		// promise with an AbortError -- that's a cancel, not a failure.
		if (error instanceof Error && error.name === 'AbortError') return null;
		return error instanceof Error ? error.message : String(error);
	}
}

function tryIosFallback(contents: string): string | null {
	// No Android path here -- see ADR 0006 (the `intent://` URI trick) and ADR
	// 0007 (a forced download via `<a download>`), both tried and confirmed
	// dead on-device.
	if (Platform.isIosApp) {
		// WebKit recognizes a `text/calendar` payload and offers its own native
		// "Add to Calendar" sheet on a plain navigation -- a rendering-engine
		// behavior, not something that depends on Obsidian's app shell
		// intercepting anything. Untested on-device as of ADR 0006/0007.
		window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(contents)}`;
		return null;
	}

	return "Automatically handing the file to another app isn't supported here -- open it from a file manager to add it to your calendar.";
}
