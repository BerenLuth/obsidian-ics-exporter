import { App, PluginSettingTab, Setting } from 'obsidian';
import IcsExporterPlugin from './main';

export interface IcsExporterSettings {
	openAfterExport: boolean;
}

export const DEFAULT_SETTINGS: IcsExporterSettings = {
	openAfterExport: true,
};

export class IcsExporterSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: IcsExporterPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Open after export')
			.setDesc(
				"After saving the .ics file, open it with your system's default app (e.g. your calendar) so the event is imported right away. Desktop only.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.openAfterExport).onChange(async (value) => {
					this.plugin.settings.openAfterExport = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
