import { App, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
import IcsExporterPlugin from './main';

/** What goes into the exported event's DESCRIPTION field. */
export type DescriptionContent = 'link' | 'note-body' | 'link-and-body';

export interface IcsExporterSettings {
	openAfterExport: boolean;
	exportFolder: string;
	descriptionContent: DescriptionContent;
	saveDeadlineToFrontmatter: boolean;
	useFileNameAsEventTitle: boolean;
	useDeadlineFromFrontmatter: boolean;
	deadlinePropertyName: string;
}

export const DEFAULT_SETTINGS: IcsExporterSettings = {
	openAfterExport: true,
	exportFolder: '.ics',
	descriptionContent: 'link',
	saveDeadlineToFrontmatter: true,
	useFileNameAsEventTitle: true,
	useDeadlineFromFrontmatter: true,
	deadlinePropertyName: 'deadline',
};

/** Strips leading/trailing slashes so the stored value is always a clean
 * vault-relative folder path, falling back to the default if that leaves
 * nothing (e.g. the setting was cleared to an empty string). */
export function normalizeFolderPath(raw: string): string {
	const trimmed = raw.trim().replace(/^\/+|\/+$/g, '');
	return trimmed || DEFAULT_SETTINGS.exportFolder;
}

/** Trims the stored frontmatter property name, falling back to the default
 * (`deadline`) if that leaves nothing (e.g. the setting was cleared to an
 * empty string). */
export function normalizeDeadlinePropertyName(raw: string): string {
	return raw.trim() || DEFAULT_SETTINGS.deadlinePropertyName;
}

export class IcsExporterSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: IcsExporterPlugin,
	) {
		super(app, plugin);
	}

	/** Declarative settings (Obsidian 1.13+): drives both rendering and
	 * settings search. `display()` below is kept only as a fallback for
	 * Obsidian versions older than 1.13 (see manifest.json's minAppVersion) --
	 * it's bypassed entirely once this is implemented on a new-enough app. */
	getSettingDefinitions(): SettingDefinitionItem<keyof IcsExporterSettings>[] {
		return [
			{
				name: 'Export folder',
				desc: "Vault folder to save exported .ics files into. Created automatically if it doesn't exist yet.",
				control: {
					type: 'text',
					key: 'exportFolder',
					placeholder: DEFAULT_SETTINGS.exportFolder,
				},
			},
			{
				name: 'Event description',
				desc: "What to put in the exported event's description field.",
				control: {
					type: 'dropdown',
					key: 'descriptionContent',
					options: {
						link: 'Link that opens the note',
						'note-body': 'Note body',
						'link-and-body': 'Note body + link that opens the note',
					},
				},
			},
			{
				name: 'Deadline property name',
				desc: "Name of the frontmatter property the Deadline is read from and written to (see 'Use deadline from note' and 'Save picked deadline to note' below).",
				control: {
					type: 'text',
					key: 'deadlinePropertyName',
					placeholder: DEFAULT_SETTINGS.deadlinePropertyName,
				},
			},
			{
				name: 'Use deadline from note',
				desc:
					`The event date comes from the note's \`${this.plugin.settings.deadlinePropertyName}\` property when it's valid. ` +
					'Turn this off to always be prompted for a date instead.',
				control: { type: 'toggle', key: 'useDeadlineFromFrontmatter' },
			},
			{
				name: 'Save picked deadline to note',
				desc:
					`When a note has no Deadline and you pick a date in the prompt, write it back to the note's \`${this.plugin.settings.deadlinePropertyName}\` property. ` +
					'Turn this off to use the picked date for this export only, without modifying the note.',
				control: { type: 'toggle', key: 'saveDeadlineToFrontmatter' },
			},
			{
				name: 'Open after export',
				desc: "After saving the .ics file, hand it off right away so the event can be imported: opens it with your system's default app on desktop, or shares it via your device's share sheet on mobile.",
				control: { type: 'toggle', key: 'openAfterExport' },
			},
			{
				name: 'Use file name as title',
				desc:
					'The event title matches the file name. ' +
					'Turn this off to be prompted every time for the event title.',
				control: { type: 'toggle', key: 'useFileNameAsEventTitle' },
			},
		];
	}

	getControlValue(key: string): unknown {
		return (this.plugin.settings as unknown as Record<string, unknown>)[key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		let normalized = value;
		if (key === 'exportFolder') normalized = normalizeFolderPath(value as string);
		if (key === 'deadlinePropertyName') normalized = normalizeDeadlinePropertyName(value as string);

		(this.plugin.settings as unknown as Record<string, unknown>)[key] = normalized;
		await this.plugin.saveSettings();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Export folder')
			.setDesc('Vault folder to save exported .ics files into. Created automatically if it doesn\'t exist yet.')
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.exportFolder)
					.setValue(this.plugin.settings.exportFolder)
					.onChange(async (value) => {
						this.plugin.settings.exportFolder = normalizeFolderPath(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Event description')
			.setDesc('What to put in the exported event\'s description field.')
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						link: 'Link that opens the note',
						'note-body': 'Note body',
						'link-and-body': 'Note body + link that opens the note',
					})
					.setValue(this.plugin.settings.descriptionContent)
					.onChange(async (value) => {
						this.plugin.settings.descriptionContent = value as DescriptionContent;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Deadline property name')
			.setDesc(
				"Name of the frontmatter property the Deadline is read from and written to " +
					"(see 'Use deadline from note' and 'Save picked deadline to note' below).",
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.deadlinePropertyName)
					.setValue(this.plugin.settings.deadlinePropertyName)
					.onChange(async (value) => {
						this.plugin.settings.deadlinePropertyName = normalizeDeadlinePropertyName(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Use deadline from note')
			.setDesc(
				`The event date comes from the note's \`${this.plugin.settings.deadlinePropertyName}\` property when it's valid. ` +
					'Turn this off to always be prompted for a date instead.',
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useDeadlineFromFrontmatter).onChange(async (value) => {
					this.plugin.settings.useDeadlineFromFrontmatter = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Save picked deadline to note')
			.setDesc(
				`When a note has no Deadline and you pick a date in the prompt, write it back to the note's \`${this.plugin.settings.deadlinePropertyName}\` property. ` +
					"Turn this off to use the picked date for this export only, without modifying the note.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.saveDeadlineToFrontmatter).onChange(async (value) => {
					this.plugin.settings.saveDeadlineToFrontmatter = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Open after export')
			.setDesc(
				"After saving the .ics file, hand it off right away so the event can be imported: opens it with your system's default app on desktop, or shares it via your device's share sheet on mobile.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.openAfterExport).onChange(async (value) => {
					this.plugin.settings.openAfterExport = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName('Use file name as title')
			.setDesc(
				'The event title matches the file name. ' +
					'Turn this off to be prompted every time for the event title.',
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useFileNameAsEventTitle).onChange(async (value) => {
					this.plugin.settings.useFileNameAsEventTitle = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
