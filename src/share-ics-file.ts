/** Hands an .ics file to the OS's native share sheet via the Web Share API, so
 * the user can pick a calendar app (or anything else that accepts
 * `text/calendar`) to import it into. This is the mobile counterpart to
 * `openWithDefaultApp`: Obsidian's mobile apps are Capacitor-based WebViews
 * with no Electron/Node access, but `navigator.share` is a standard web API
 * that the system WebView supports on both Android and iOS. See ADR 0004.
 *
 * Resolves to an error message on failure, or null on success. Success only
 * means the share sheet was shown -- same as `openWithDefaultApp`, there's no
 * way to know what the user picked afterwards, or whether an import actually
 * happened. */
export async function shareIcsFile(filename: string, contents: string): Promise<string | null> {
	if (!navigator.share) return "Sharing isn't supported on this platform.";

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
