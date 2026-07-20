import AgendaPlugin from '../main';
import { App, PluginSettingTab, Setting } from 'obsidian';
import { I18n } from "../core/i18n";
import { BaseView } from '../views/base-view';

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

    new Setting(containerEl)
      .setName(this.i18n.t("week_start_day"))
      .addDropdown(drop => drop
        .addOption('1', this.i18n.t('day_mon'))
        .addOption('2', this.i18n.t('day_tue'))
        .addOption('3', this.i18n.t('day_wed'))
        .addOption('4', this.i18n.t('day_thu'))
        .addOption('5', this.i18n.t('day_fri'))
        .addOption('6', this.i18n.t('day_sat'))
        .addOption('7', this.i18n.t('day_sun'))
        .setValue(String(this.plugin.settings.weekStartDay))
        .onChange(async (value) => {
          this.plugin.settings.weekStartDay = Number(value);
          await this.plugin.saveSettings();
          const calTypes = ['calendar-month-view', 'calendar-year-view', 'calendar-week-view', 'calendar-workweek-view', 'calendar-day-view'];
          this.plugin.app.workspace.iterateAllLeaves((leaf) => {
            if (calTypes.includes(leaf.view.getViewType()) && leaf.view instanceof BaseView) {
              leaf.view.refreshView().catch(console.error);
            }
          });
        }));
  }
}