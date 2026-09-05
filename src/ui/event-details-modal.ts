import { App, Modal } from 'obsidian';

export interface EventDetailsResult {
	/** Only set (and only meaningful) when the modal was asked to collect it. */
	title?: string;
	/** A `YYYY-MM-DD` string. Only set (and only meaningful) when the modal was
	 * asked to collect it -- see CONTEXT.md / ADR on "generic dates". */
	date?: string;
}

/** Prompts for whichever of the event's title and deadline date the caller
 * doesn't already have -- a missing/invalid `deadline` property (date), and
 * the `useFileNameAsEventTitle` setting being off (title). Shows both fields
 * in the same window when both are needed, rather than two prompts back to
 * back. */
export class EventDetailsModal extends Modal {
	private resolve!: (value: EventDetailsResult | null) => void;

	constructor(
		app: App,
		private noteName: string,
		private askTitle: boolean,
		private askDate: boolean,
	) {
		super(app);
	}

	/** Resolves to the value(s) asked for, or null if the user cancelled. */
	prompt(): Promise<EventDetailsResult | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: `Export "${this.noteName}" as a calendar event` });

		let titleInput: HTMLInputElement | undefined;
		if (this.askTitle) {
			contentEl.createEl('p', { text: 'Event title:' });
			titleInput = contentEl.createEl('input', {
				type: 'text',
				value: this.noteName,
				cls: 'ics-exporter-title-input',
			});
		}

		let dateInput: HTMLInputElement | undefined;
		if (this.askDate) {
			contentEl.createEl('p', {
				text: 'This note has no valid "deadline" property. Pick a date to export as a calendar event.',
			});
			dateInput = contentEl.createEl('input', {
				type: 'date',
				cls: 'ics-exporter-date-input',
			});
		}

		const buttonRow = contentEl.createDiv({ cls: 'modal-button-container' });
		const exportButton = buttonRow.createEl('button', { text: 'Export', cls: 'mod-cta' });

		const submit = () => {
			if (titleInput && !titleInput.value.trim()) {
				titleInput.focus();
				return;
			}
			if (dateInput && !dateInput.value) {
				dateInput.focus();
				return;
			}
			// Resolve before close(): onClose() also resolves (to null, for the
			// cancel path), and a Promise only honors its first settlement.
			this.resolve({ title: titleInput?.value.trim(), date: dateInput?.value });
			this.close();
		};

		const submitOnEnter = (evt: KeyboardEvent) => {
			if (evt.key === 'Enter') {
				evt.preventDefault();
				submit();
			}
		};

		exportButton.addEventListener('click', submit);
		titleInput?.addEventListener('keydown', submitOnEnter);
		dateInput?.addEventListener('keydown', submitOnEnter);

		window.setTimeout(() => (titleInput ?? dateInput)?.focus());
	}

	onClose() {
		this.contentEl.empty();
		this.resolve(null);
	}
}
