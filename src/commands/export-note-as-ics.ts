import { App, FileSystemAdapter, Notice, TFile } from 'obsidian';
import { parseDeadline } from '../deadline';
import { buildICS } from '../ics';
import { openWithDefaultApp } from '../open-with-default-app';
import { shareIcsFile } from '../share-ics-file';
import { IcsExporterSettings } from '../settings';
import { EventDetailsModal } from '../ui/event-details-modal';

/** Exports a note's Deadline as a calendar event (see CONTEXT.md). Prompts for
 * a date when `useDeadlineFromFrontmatter` is off, or the note's
 * `deadlinePropertyName` property is missing or doesn't match the accepted
 * shape; (per `saveDeadlineToFrontmatter`) writes a picked date back to that
 * same property so future exports don't need to ask again. Also prompts for a
 * title when `useFileNameAsEventTitle` is off -- in the same window as the
 * date prompt when both are needed, rather than two prompts back to back. */
export async function exportNoteAsIcs(app: App, file: TFile, settings: IcsExporterSettings): Promise<void> {
	const frontmatter: Record<string, unknown> | undefined = app.metadataCache.getFileCache(file)?.frontmatter;
	let deadline = settings.useDeadlineFromFrontmatter
		? parseDeadline(frontmatter?.[settings.deadlinePropertyName])
		: null;
	let title = settings.useFileNameAsEventTitle ? file.basename : undefined;

	if (!deadline || title === undefined) {
		const picked = await new EventDetailsModal(app, file.basename, title === undefined, !deadline).prompt();
		if (!picked) return; // user cancelled

		if (!deadline) {
			deadline = parseDeadline(picked.date);
			if (!deadline) {
				new Notice('Invalid date, export cancelled.');
				return;
			}

			if (settings.saveDeadlineToFrontmatter) {
				await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
					fm[settings.deadlinePropertyName] = picked.date;
				});
			}
		}

		if (title === undefined) {
			title = picked.title || file.basename;
		}
	}

	const noteBody = await readNoteBody(app, file);
	const ics = buildICS(file, title, deadline, app.vault.getName(), settings.descriptionContent, noteBody);
	const path = await writeIcsFile(app, file, ics, settings.exportFolder);

	if (!settings.openAfterExport) {
		new Notice(`Exported "${file.basename}" to ${path}`);
		return;
	}

	const { method, error } = await handOffIcsFile(app, file, path, ics);
	const pastTense = method === 'open' ? 'opened' : 'shared';
	new Notice(
		error
			? `Exported "${file.basename}" to ${path}, but couldn't ${method} it: ${error}`
			: `Exported "${file.basename}" to ${path} and ${pastTense} it`,
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
//
// Writes via `app.vault.adapter` (`exists`/`mkdir`/`write`) rather than
// `vault.getAbstractFileByPath`/`createFolder`/`create`: the latter go through
// Obsidian's in-memory file index, which can lag behind the adapter's actual
// state (seen on mobile right after a sync) -- `getAbstractFileByPath` says
// "doesn't exist" for something that already does, and `createFolder`/
// `create` then throw "already exists." The adapter talks to the filesystem
// directly (per its own `exists()` doc, this is the authoritative check vs.
// the vault's index) and `write()` unconditionally creates-or-overwrites, so
// there's no existence race to lose.
async function writeIcsFile(app: App, file: TFile, contents: string, folder: string): Promise<string> {
	const adapter = app.vault.adapter;
	if (!(await adapter.exists(folder))) {
		await adapter.mkdir(folder);
	}

	const path = `${folder}/${file.basename}.ics`;
	await adapter.write(path, contents);
	return path;
}

type HandoffMethod = 'open' | 'share';

// Desktop opens the .ics with the OS's default handler (Electron only); mobile
// has no equivalent for that, so it hands the file to the native share sheet
// instead, where the user can pick a calendar app themselves. See ADR 0004.
async function handOffIcsFile(
	app: App,
	file: TFile,
	vaultRelativePath: string,
	ics: string,
): Promise<{ method: HandoffMethod; error: string | null }> {
	if (app.vault.adapter instanceof FileSystemAdapter) {
		const fullPath = app.vault.adapter.getFullPath(vaultRelativePath);
		return { method: 'open', error: await openWithDefaultApp(fullPath) };
	}
	return { method: 'share', error: await shareIcsFile(`${file.basename}.ics`, ics) };
}
