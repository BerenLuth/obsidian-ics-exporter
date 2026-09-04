import { TFile } from 'obsidian';
import { Deadline } from './deadline';
import { DescriptionContent } from './settings';

function pad(n: number, width = 2): string {
	return String(n).padStart(width, '0');
}

/** Deterministic FNV-1a hash of the note's vault-relative path, so re-exporting
 * the same note reuses the same UID (see ADR 0002) instead of a random one that
 * would duplicate the event on every re-import. Not cryptographic -- doesn't need
 * to be, it just needs to be stable and cheap with no extra dependency. */
function hashPath(path: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < path.length; i++) {
		hash ^= path.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Escapes TEXT-valued fields per RFC 5545 §3.3.11. */
function escapeText(text: string): string {
	return text
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\n/g, '\\n');
}

function addDays(year: number, month: number, day: number, amount: number) {
	const d = new Date(year, month - 1, day);
	d.setDate(d.getDate() + amount);
	return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function obsidianUri(vaultName: string, file: TFile): string {
	// Not URLSearchParams: its `.toString()` percent-encodes spaces as `+`
	// (form encoding), which a URI decoder reads back literally as a "+"
	// character rather than a space -- breaking the link for any filename
	// with a space in it. encodeURIComponent uses %20, which round-trips.
	const vault = encodeURIComponent(vaultName);
	const path = encodeURIComponent(file.path);
	return `obsidian://open?vault=${vault}&file=${path}`;
}

/** Assembles the event's DESCRIPTION per the `descriptionContent` setting.
 * `noteBody` is the note's content with its frontmatter stripped (see
 * CONTEXT.md) -- ignored entirely when the setting is 'link'. */
function buildDescription(vaultName: string, file: TFile, content: DescriptionContent, noteBody: string): string {
	const link = obsidianUri(vaultName, file);
	switch (content) {
		case 'link':
			return link;
		case 'note-body':
			return noteBody;
		case 'link-and-body':
			return `${link}\n\n${noteBody}`;
	}
}

/** Builds a single-event .ics file for a note's Deadline (see CONTEXT.md). */
export function buildICS(
	file: TFile,
	deadline: Deadline,
	vaultName: string,
	descriptionContent: DescriptionContent,
	noteBody: string,
): string {
	const uid = `${hashPath(file.path)}@ics-exporter`;

	const now = new Date();
	const dtstamp =
		`${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T` +
		`${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

	let dtstartLine: string;
	let dtendLine: string;

	if (deadline.kind === 'date') {
		// Date-only deadline -> all-day event. DTEND is exclusive per RFC 5545,
		// so a one-day event ends the following day.
		const start = `${deadline.year}${pad(deadline.month)}${pad(deadline.day)}`;
		const end = addDays(deadline.year, deadline.month, deadline.day, 1);
		dtstartLine = `DTSTART;VALUE=DATE:${start}`;
		dtendLine = `DTEND;VALUE=DATE:${end.year}${pad(end.month)}${pad(end.day)}`;
	} else {
		// Date-time deadline -> timed event at that exact moment, floating local
		// time (no TZID/Z) so the importing calendar renders it in its own local
		// time and the plugin never has to do timezone conversion.
		const start = `${deadline.year}${pad(deadline.month)}${pad(deadline.day)}T${pad(deadline.hour)}${pad(deadline.minute)}00`;
		const endDate = new Date(deadline.year, deadline.month - 1, deadline.day, deadline.hour, deadline.minute);
		endDate.setHours(endDate.getHours() + 1); // default 1-hour block
		const end =
			`${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}` +
			`T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
		dtstartLine = `DTSTART:${start}`;
		dtendLine = `DTEND:${end}`;
	}

	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//ics-exporter//Obsidian Plugin//EN',
		'BEGIN:VEVENT',
		`UID:${uid}`,
		`DTSTAMP:${dtstamp}`,
		dtstartLine,
		dtendLine,
		`SUMMARY:${escapeText(file.basename)}`,
		`DESCRIPTION:${escapeText(buildDescription(vaultName, file, descriptionContent, noteBody))}`,
		'END:VEVENT',
		'END:VCALENDAR',
	];

	return lines.join('\r\n') + '\r\n';
}
