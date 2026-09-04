import { App, Modal } from 'obsidian';

/** Asks for a date (no time -- see CONTEXT.md / ADR on "generic dates") when a
 * note's `deadline` frontmatter is missing or doesn't match the accepted shape. */
export class DeadlineModal extends Modal {
	private resolve!: (value: string | null) => void;

	constructor(
		app: App,
		private noteName: string,
	) {
		super(app);
	}

	/** Resolves to a `YYYY-MM-DD` string, or null if the user cancelled. */
	promptForDate(): Promise<string | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: `Deadline for "${this.noteName}"` });
		contentEl.createEl('p', {
			text: 'This note has no valid "deadline" property. Pick a date to export as a calendar event.',
		});

		const input = contentEl.createEl('input', {
			type: 'date',
			cls: 'ics-exporter-date-input',
		});

		const buttonRow = contentEl.createDiv({ cls: 'modal-button-container' });
		const exportButton = buttonRow.createEl('button', { text: 'Export', cls: 'mod-cta' });

		const submit = () => {
			if (!input.value) {
				input.focus();
				return;
			}
			// Resolve before close(): onClose() also resolves (to null, for the
			// cancel path), and a Promise only honors its first settlement.
			this.resolve(input.value);
			this.close();
		};

		exportButton.addEventListener('click', submit);
		input.addEventListener('keydown', (evt) => {
			if (evt.key === 'Enter') {
				evt.preventDefault();
				submit();
			}
		});

		window.setTimeout(() => input.focus());
	}

	onClose() {
		this.contentEl.empty();
		this.resolve(null);
	}
}
