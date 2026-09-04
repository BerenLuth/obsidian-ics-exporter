import { App, FileSystemAdapter, Notice, TFile } from 'obsidian';
import { parseDeadline } from '../deadline';
import { buildICS } from '../ics';
import { openWithDefaultApp } from '../open-with-default-app';
import { IcsExporterSettings } from '../settings';
import { DeadlineModal } from '../ui/deadline-modal';

const EXPORT_FOLDER = '.ics';

/** Exports a note's Deadline as a calendar event (see CONTEXT.md). Prompts for
 * a date -- and writes it back to frontmatter -- when `deadline` is missing or
 * doesn't match the accepted shape. */
export async function exportNoteAsIcs(app: App, file: TFile, settings: IcsExporterSettings): Promise<void> {
	const frontmatter: Record<string, unknown> | undefined = app.metadataCache.getFileCache(file)?.frontmatter;
	let deadline = parseDeadline(frontmatter?.deadline);

	if (!deadline) {
		const picked = await new DeadlineModal(app, file.basename).promptForDate();
		if (!picked) return; // user cancelled

		deadline = parseDeadline(picked);
		if (!deadline) {
			new Notice('Invalid date, export cancelled.');
			return;
		}

		await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			fm.deadline = picked;
		});
	}

	const ics = buildICS(file, deadline, app.vault.getName());
	const path = await writeIcsFile(app, file, ics);

	if (!settings.openAfterExport) {
		new Notice(`Exported "${file.basename}" to ${path}`);
		return;
	}

	const openError = await tryOpen(app, path);
	new Notice(
		openError
			? `Exported "${file.basename}" to ${path}, but couldn't open it: ${openError}`
			: `Exported "${file.basename}" to ${path} and opened it`,
	);
}

// Same filename as the note, in a flat `.ics/` folder. Two notes with the same
// basename in different vault folders will overwrite each other here -- that
// collision is accepted for simplicity (see grilling session, Q11). Returns
// the vault-relative path that was written.
async function writeIcsFile(app: App, file: TFile, contents: string): Promise<string> {
	if (!app.vault.getAbstractFileByPath(EXPORT_FOLDER)) {
		await app.vault.createFolder(EXPORT_FOLDER);
	}

	const path = `${EXPORT_FOLDER}/${file.basename}.ics`;
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) {
		await app.vault.modify(existing, contents);
	} else {
		await app.vault.create(path, contents);
	}
	return path;
}

async function tryOpen(app: App, vaultRelativePath: string): Promise<string | null> {
	if (!(app.vault.adapter instanceof FileSystemAdapter)) {
		return "opening isn't supported on mobile";
	}
	const fullPath = app.vault.adapter.getFullPath(vaultRelativePath);
	return openWithDefaultApp(fullPath);
}
