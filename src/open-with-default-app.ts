interface ElectronShell {
	openPath(path: string): Promise<string>;
}

/** Opens a file with the OS's default handler for its extension (e.g. launches
 * the user's calendar app to import an .ics). Electron-only: Obsidian doesn't
 * expose this itself, and mobile has no equivalent -- callers should already be
 * gating on desktop (see the `FileSystemAdapter` check in export-note-as-ics.ts).
 * See ADR 0003 for why this reaches into Electron via the global `require`
 * instead of an `electron` dependency.
 *
 * Resolves to an error message on failure, or null on success. */
export async function openWithDefaultApp(absolutePath: string): Promise<string | null> {
	const req = (window as unknown as { require?: (id: string) => unknown }).require;
	if (!req) return "Opening files isn't supported on this platform.";

	const electron = req('electron') as { shell: ElectronShell };
	// shell.openPath resolves with an error message on failure, '' on success.
	const error = await electron.shell.openPath(absolutePath);
	return error || null;
}
