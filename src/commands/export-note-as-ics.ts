import { App, FileSystemAdapter, Notice, TFile } from 'obsidian';
import { parseDeadline } from '../deadline';
import { buildICS } from '../ics';
import { openWithDefaultApp } from '../open-with-default-app';
import { IcsExporterSettings } from '../settings';
import { DeadlineModal } from '../ui/deadline-modal';

/** Exports a note's Deadline as a calendar event (see CONTEXT.md). Prompts for
 * a date when `deadline` is missing or doesn't match the accepted shape, and
 * (per `saveDeadlineToFrontmatter`) writes it back to frontmatter so future
 * exports don't need to ask again. */
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

		if (settings.saveDeadlineToFrontmatter) {
			await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
				fm.deadline = picked;
			});
		}
	}

	const noteBody = await readNoteBody(app, file);
	const ics = buildICS(file, deadline, app.vault.getName(), settings.descriptionContent, noteBody);
	const path = await writeIcsFile(app, file, ics, settings.exportFolder);

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

// Strips the frontmatter block (if any) so it never leaks into the exported
// description -- readers care about the note's content, not its `deadline`
// property staring back at them.
async function readNoteBody(app: App, file: TFile): Promise<string> {
	const raw = await app.vault.cachedRead(file);
	const frontmatterEnd = app.metadataCache.getFileCache(file)?.frontmatterPosition?.end.offset;
	return (frontmatterEnd ? raw.slice(frontmatterEnd) : raw).trim();
}

// Same filename as the note, in a flat export folder (configurable, default
// `.ics/`). Two notes with the same basename in different vault folders will
// overwrite each other here -- that collision is accepted for simplicity (see
// grilling session, Q11). Returns the vault-relative path that was written.
async function writeIcsFile(app: App, file: TFile, contents: string, folder: string): Promise<string> {
	if (!app.vault.getAbstractFileByPath(folder)) {
		await app.vault.createFolder(folder);
	}

	const path = `${folder}/${file.basename}.ics`;
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
