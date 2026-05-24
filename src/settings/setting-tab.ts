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

    new Setting(containerEl).setName(this.i18n.t("tabs_visibility_settings")).setHeading();

    new Setting(containerEl)
      .setName(this.i18n.t("show_overview_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showOverviewTab)
        .onChange(async (value) => {
          this.plugin.settings.showOverviewTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("show_list_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showListTab)
        .onChange(async (value) => {
          this.plugin.settings.showListTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("show_table_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTableTab)
        .onChange(async (value) => {
          this.plugin.settings.showTableTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("show_calendar_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showCalendarTab)
        .onChange(async (value) => {
          this.plugin.settings.showCalendarTab = value;
          await this.plugin.saveSettings();
        }));
  }
}