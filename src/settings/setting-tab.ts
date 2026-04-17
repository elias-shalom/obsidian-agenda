import AgendaPlugin from '../main';
//import { App, PluginSettingTab, Setting } from 'obsidian';
import { App, PluginSettingTab } from 'obsidian';
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

    //new Setting(containerEl).setName(this.i18n.t("general_settings")).setHeading();

  }
}