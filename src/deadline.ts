// A note's Deadline, per CONTEXT.md: valid only as Obsidian's native Date
// (`YYYY-MM-DD`) or Date & time (`YYYY-MM-DDTHH:mm`) property shape.

export type Deadline =
	| { kind: 'date'; year: number; month: number; day: number }
	| { kind: 'datetime'; year: number; month: number; day: number; hour: number; minute: number };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Rejects things like 2026-02-30: components must round-trip through Date unchanged. */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
	const d = new Date(year, month - 1, day);
	return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/** Parses a `deadline` frontmatter value. Returns null for anything that isn't
 * exactly one of the two accepted shapes -- callers fall back to prompting. */
export function parseDeadline(raw: unknown): Deadline | null {
	if (typeof raw !== 'string') return null;

	const dateMatch = DATE_RE.exec(raw);
	if (dateMatch) {
		const year = Number(dateMatch[1]);
		const month = Number(dateMatch[2]);
		const day = Number(dateMatch[3]);
		if (!isValidCalendarDate(year, month, day)) return null;
		return { kind: 'date', year, month, day };
	}

	const dtMatch = DATETIME_RE.exec(raw);
	if (dtMatch) {
		const year = Number(dtMatch[1]);
		const month = Number(dtMatch[2]);
		const day = Number(dtMatch[3]);
		const hour = Number(dtMatch[4]);
		const minute = Number(dtMatch[5]);
		if (!isValidCalendarDate(year, month, day)) return null;
		if (hour > 23 || minute > 59) return null;
		return { kind: 'datetime', year, month, day, hour, minute };
	}

	return null;
}
