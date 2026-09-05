import { MarkdownView, Notice, Plugin } from 'obsidian';
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
					// Unhandled here, a thrown error would just vanish -- no Notice, no
					// console output the user can find without devtools attached. Surface
					// it instead of failing silently.
					exportNoteAsIcs(this.app, file, this.settings).catch((error: unknown) => {
						console.error('ics-exporter: export failed', error);
						new Notice(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
					});
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
