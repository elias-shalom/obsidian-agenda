import AgendaPlugin from '../main';
import { App, PluginSettingTab, Setting } from 'obsidian';
import { I18n } from "../core/i18n";

export class SettingTab extends PluginSettingTab {
  plugin: AgendaPlugin;


  constructor(app: App, plugin: AgendaPlugin, private i18n: I18n) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName(this.i18n.t("general_settings")).setHeading();

    new Setting(containerEl)
      .setName(this.i18n.t('language'))
      .setDesc(this.i18n.t('language_description'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('en', this.i18n.t('english'))
          .addOption('es', this.i18n.t('spanish'))
          .addOption('fr', this.i18n.t('french'))
          .addOption('de', this.i18n.t('german'))
          .addOption('it', this.i18n.t('italian'))
          .addOption('pt', this.i18n.t('portuguese'))
          .onChange(async (value) => {
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
          })
      );

    /*new Setting(containerEl)
      .setName(this.i18n.t('colorScheme'))
      .setDesc(this.i18n.t('colorScheme_description'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('default', 'Default')
          .addOption('dark', 'Dark')
          .addOption('light', 'Light')
          .onChange(async (value) => {
            this.plugin.settings.colorScheme = value;
            await this.plugin.saveSettings();
          })
      );*/
  }
}