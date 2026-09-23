import AgendaPlugin from '../main';
import { App, PluginSettingTab, Setting, SettingDefinitionItem } from 'obsidian';
import { I18n } from "../core/i18n";
import { BaseView } from '../views/base-view';
import type { AgendaPluginSettings } from './settings';

const CALENDAR_VIEW_TYPES = ['calendar-month-view', 'calendar-year-view', 'calendar-week-view', 'calendar-workweek-view', 'calendar-day-view'];

export class SettingTab extends PluginSettingTab {
  plugin: AgendaPlugin;


  constructor(app: App, plugin: AgendaPlugin, private i18n: I18n) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /** API declarativa (Obsidian 1.13+): permite que estos ajustes aparezcan en el buscador global de settings. */
  getSettingDefinitions(): SettingDefinitionItem<keyof AgendaPluginSettings>[] {
    return [
      {
        type: 'group',
        heading: this.i18n.t('tabs_visibility_settings'),
        items: [
          { name: this.i18n.t('show_overview_tab'), control: { type: 'toggle', key: 'showOverviewTab' } },
          { name: this.i18n.t('show_list_tab'), control: { type: 'toggle', key: 'showListTab' } },
          { name: this.i18n.t('show_table_tab'), control: { type: 'toggle', key: 'showTableTab' } },
          { name: this.i18n.t('show_calendar_tab'), control: { type: 'toggle', key: 'showCalendarTab' } },
          {
            name: this.i18n.t('week_start_day'),
            render: (setting) => {
              setting.addDropdown(drop => drop
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
                  this.plugin.app.workspace.iterateAllLeaves((leaf) => {
                    if (CALENDAR_VIEW_TYPES.includes(leaf.view.getViewType()) && leaf.view instanceof BaseView) {
                      leaf.view.refreshView().catch(console.error);
                    }
                  });
                }));
            },
          },
        ],
      },
      {
        type: 'group',
        heading: this.i18n.t('habit_settings'),
        items: [
          {
            name: this.i18n.t('habit_folder_path'),
            desc: this.i18n.t('habit_folder_path_desc'),
            control: { type: 'text', key: 'habitFolderPath', placeholder: 'daily plan/daily routine/habit' },
          },
          { name: this.i18n.t('habit_days_to_show'), control: { type: 'slider', key: 'habitDaysToShow', min: 7, max: 90, step: 1 } },
          { name: this.i18n.t('habit_show_streaks'), control: { type: 'toggle', key: 'habitShowStreaks' } },
          { name: this.i18n.t('habit_max_gap'), control: { type: 'slider', key: 'habitDefaultMaxGap', min: 0, max: 30, step: 1 } },
          { name: this.i18n.t('habit_default_priority'), control: { type: 'slider', key: 'habitDefaultPriority', min: 1, max: 5, step: 1 } },
          {
            name: this.i18n.t('habit_default_color'),
            desc: this.i18n.t('habit_default_color_desc'),
            control: { type: 'text', key: 'habitDefaultColor', placeholder: this.i18n.t('habit_default_color_placeholder') },
          },
        ],
      },
      {
        type: 'group',
        heading: this.i18n.t('habit_tab_visibility'),
        items: [
          { name: this.i18n.t('show_habit_grid_tab'), control: { type: 'toggle', key: 'showHabitGridTab' } },
          { name: this.i18n.t('show_habit_dashboard_tab'), control: { type: 'toggle', key: 'showHabitDashboardTab' } },
          { name: this.i18n.t('show_habit_routine_tab'), control: { type: 'toggle', key: 'showHabitRoutineTab' } },
          { name: this.i18n.t('show_habit_weekly_tab'), control: { type: 'toggle', key: 'showHabitWeeklyTab' } },
          { name: this.i18n.t('show_habit_list_tab'), control: { type: 'toggle', key: 'showHabitListTab' } },
          {
            name: this.i18n.t('habit_refresh'),
            action: () => {
              document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'));
            },
          },
        ],
      },
    ];
  }

  /** @deprecated Mantenido para Obsidian < 1.13.0, que no soporta getSettingDefinitions(). */
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
          this.plugin.app.workspace.iterateAllLeaves((leaf) => {
            if (CALENDAR_VIEW_TYPES.includes(leaf.view.getViewType()) && leaf.view instanceof BaseView) {
              leaf.view.refreshView().catch(console.error);
            }
          });
        }));

    new Setting(containerEl).setName(this.i18n.t("habit_settings")).setHeading();

    new Setting(containerEl)
      .setName(this.i18n.t("habit_folder_path"))
      .setDesc(this.i18n.t("habit_folder_path_desc"))
      .addText(text => text
        .setPlaceholder("daily plan/daily routine/habit")
        .setValue(this.plugin.settings.habitFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.habitFolderPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("habit_days_to_show"))
      .addSlider(slider => slider
        .setLimits(7, 90, 1)
        .setValue(this.plugin.settings.habitDaysToShow)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.habitDaysToShow = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("habit_show_streaks"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.habitShowStreaks)
        .onChange(async (value) => {
          this.plugin.settings.habitShowStreaks = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("habit_max_gap"))
      .addSlider(slider => slider
        .setLimits(0, 30, 1)
        .setValue(this.plugin.settings.habitDefaultMaxGap)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.habitDefaultMaxGap = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("habit_default_priority"))
      .addSlider(slider => slider
        .setLimits(1, 5, 1)
        .setValue(this.plugin.settings.habitDefaultPriority)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.habitDefaultPriority = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("habit_default_color"))
      .setDesc(this.i18n.t("habit_default_color_desc"))
      .addText(text => text
        .setPlaceholder(this.i18n.t("habit_default_color_placeholder"))
        .setValue(this.plugin.settings.habitDefaultColor)
        .onChange(async (value) => {
          this.plugin.settings.habitDefaultColor = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl).setName(this.i18n.t("habit_tab_visibility")).setHeading();

    new Setting(containerEl)
      .setName(this.i18n.t("show_habit_grid_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showHabitGridTab)
        .onChange(async (value) => {
          this.plugin.settings.showHabitGridTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("show_habit_dashboard_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showHabitDashboardTab)
        .onChange(async (value) => {
          this.plugin.settings.showHabitDashboardTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("show_habit_routine_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showHabitRoutineTab)
        .onChange(async (value) => {
          this.plugin.settings.showHabitRoutineTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("show_habit_weekly_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showHabitWeeklyTab)
        .onChange(async (value) => {
          this.plugin.settings.showHabitWeeklyTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("show_habit_list_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showHabitListTab)
        .onChange(async (value) => {
          this.plugin.settings.showHabitListTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .addButton(btn => btn
        .setButtonText(this.i18n.t("habit_refresh"))
        .setCta()
        .onClick(() => {
          document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'));
        }));
  }
}