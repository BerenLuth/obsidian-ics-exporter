import { MarkdownView, Plugin } from 'obsidian';
import { exportNoteAsIcs } from './commands/export-note-as-ics';
import { DEFAULT_SETTINGS, IcsExporterSettings, IcsExporterSettingTab } from './settings';

export default class IcsExporterPlugin extends Plugin {
	settings!: IcsExporterSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new IcsExporterSettingTab(this.app, this));

		this.addCommand({
			id: 'export-note-as-ics',
			name: 'Export current note as .ics calendar event',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveViewOfType(MarkdownView)?.file;
				if (!file) return false;

				if (!checking) {
					void exportNoteAsIcs(this.app, file, this.settings);
				}
				return true;
			},
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<IcsExporterSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
