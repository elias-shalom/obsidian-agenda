import AgendaPlugin from '../main';
import { App, Notice, PluginSettingTab, Setting, SettingDefinitionItem, TFolder, debounce, setIcon } from 'obsidian';
import { I18n } from "../core/i18n";
import { BaseView } from '../views/base-view';
import type { AgendaPluginSettings } from './settings';
import { DEFAULT_SETTINGS } from './settings';
import { evaluateHabitFolderHint } from '../habits/habit-folder';
import { toggleNonWorkingDay } from '../core/non-working-days';
import { MAX_PROJECTION_COUNT } from '../core/task-projection';
import { isValidPeriod, type IHabitVacation } from '../habits/habit-calendar';
import { DateTime } from 'luxon';
import { createHolidayCalendar, getHolidayCountries, getHolidayCountry, type HolidayCalendarConfig } from '../core/holidays/holiday-calendar';

const CALENDAR_VIEW_TYPES = ['calendar-month-view', 'calendar-year-view', 'calendar-week-view', 'calendar-workweek-view', 'calendar-day-view'];
/** Vistas que cambian al tocar los días no laborables: el calendario completo (con la Lista) y el Gantt. */
const NON_WORKING_VIEW_TYPES = [...CALENDAR_VIEW_TYPES, 'calendar-list-view', 'gantt-view'];

/** Días ISO con la clave de traducción de su abreviatura, de lunes a domingo. */
const WEEKDAY_LABELS: readonly { iso: number; key: string }[] = [
  { iso: 1, key: 'day_mon' },
  { iso: 2, key: 'day_tue' },
  { iso: 3, key: 'day_wed' },
  { iso: 4, key: 'day_thu' },
  { iso: 5, key: 'day_fri' },
  { iso: 6, key: 'day_sat' },
  { iso: 7, key: 'day_sun' },
];

/** Las pestañas de la pantalla de ajustes (v1.1.15): General, Calendario y Hábitos. */
type SettingsSection = 'general' | 'calendar' | 'habits';
const SETTINGS_SECTIONS: readonly { id: SettingsSection; labelKey: string }[] = [
  { id: 'general', labelKey: 'settings_tab_general' },
  { id: 'calendar', labelKey: 'calendar_settings' },
  { id: 'habits', labelKey: 'habit_settings' },
];

export class SettingTab extends PluginSettingTab {
  plugin: AgendaPlugin;
  /** Pestaña abierta; se conserva mientras la pantalla de ajustes siga abierta y al volver a ella. */
  private activeSection: SettingsSection = 'general';


  constructor(app: App, plugin: AgendaPlugin, private i18n: I18n) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /** Refresca solo las vistas de calendario abiertas (usado por los settings de fechas y día de inicio de semana). */
  private refreshCalendarViews(): void {
    this.plugin.app.workspace.iterateAllLeaves((leaf) => {
      if (CALENDAR_VIEW_TYPES.includes(leaf.view.getViewType()) && leaf.view instanceof BaseView) {
        leaf.view.refreshView().catch(console.error);
      }
    });
  }

  /** Refresca las vistas que marcan días o proyectan recurrentes (no laborables, feriados y fantasmas): el calendario completo (con la Lista) y el Gantt, si están abiertos. */
  private refreshDayMarkingViews(): void {
    this.plugin.app.workspace.iterateAllLeaves((leaf) => {
      if (NON_WORKING_VIEW_TYPES.includes(leaf.view.getViewType()) && leaf.view instanceof BaseView) {
        leaf.view.refreshView().catch(console.error);
      }
    });
  }

  /**
   * Siete casillas, de lunes a domingo, con los días no laborables (v1.1.15, NL1). El ajuste exige al menos un día
   * marcado y uno sin marcar: la casilla que rompería la regla vuelve a su estado y un aviso lo explica.
   */
  private renderNonWorkingDays(setting: Setting): void {
    setting.settingEl.addClass('oa-non-working-days-setting');
    const row = setting.controlEl.createDiv({ cls: 'oa-non-working-days' });

    for (const { iso, key } of WEEKDAY_LABELS) {
      const label = row.createEl('label', { cls: 'oa-non-working-day' });
      label.createSpan({ text: this.i18n.t(key) });
      const box = label.createEl('input', { type: 'checkbox' });
      box.checked = this.plugin.settings.nonWorkingDays.includes(iso);

      box.addEventListener('change', () => {
        const result = toggleNonWorkingDay(this.plugin.settings.nonWorkingDays, iso);
        if (result.rejected) {
          box.checked = !box.checked;
          new Notice(this.i18n.t('non_working_days_min'));
          return;
        }
        this.plugin.settings.nonWorkingDays = result.days;
        this.plugin.saveSettings()
          .then(async () => {
            this.refreshDayMarkingViews();
            // Las frecuencias «Fin de semana» y «Lunes a viernes» se resuelven al leer cada hábito: se vuelven a leer
            await this.plugin.refreshHabits();
            document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'));
            new Notice(this.i18n.t('non_working_days_changed'));
          })
          .catch(console.error);
      });
    }
  }

  /**
   * Lista de calendarios de feriados (v1.1.15, FE2): una fila por calendario con país, región, las casillas Oficiales
   * y No oficiales, el color y quitar, más un botón para añadir. No hay ninguno por defecto. Cada cambio se guarda y
   * refresca el calendario y el Gantt abiertos; es solo visual.
   */
  private renderHolidayCalendars(setting: Setting): void {
    setting.settingEl.addClass('oa-holiday-calendars-setting');
    this.drawHolidayCalendars(setting.controlEl.createDiv({ cls: 'oa-holiday-calendars' }));
  }

  private drawHolidayCalendars(list: HTMLElement): void {
    list.empty();
    const calendars = this.plugin.settings.holidayCalendars;

    if (calendars.length === 0) list.createDiv({ cls: 'oa-holiday-empty', text: this.i18n.t('holiday_calendars_empty') });
    calendars.forEach((calendar, index) => this.drawHolidayCalendarRow(list, calendar, index));

    const add = list.createEl('button', { cls: 'oa-holiday-add', text: this.i18n.t('holiday_add_calendar'), attr: { type: 'button' } });
    add.addEventListener('click', () => {
      calendars.push(createHolidayCalendar(calendars.length));
      this.saveHolidayCalendars(list);
    });
  }

  private drawHolidayCalendarRow(list: HTMLElement, calendar: HolidayCalendarConfig, index: number): void {
    const row = list.createDiv({ cls: 'oa-holiday-calendar' });

    const country = row.createEl('select', { cls: 'dropdown', attr: { 'aria-label': this.i18n.t('holiday_country') } });
    for (const { country: code } of getHolidayCountries()) {
      country.createEl('option', { value: code, text: this.i18n.t(`holiday_country_${code.toLowerCase()}`) });
    }
    country.value = calendar.country;
    country.addEventListener('change', () => {
      calendar.country = country.value;
      delete calendar.region; // las regiones son de cada país
      this.saveHolidayCalendars(list);
    });

    const region = row.createEl('select', { cls: 'dropdown', attr: { 'aria-label': this.i18n.t('holiday_region') } });
    region.createEl('option', { value: '', text: this.i18n.t('holiday_region_national') });
    for (const { code, name } of getHolidayCountry(calendar.country)?.regions ?? []) {
      region.createEl('option', { value: code, text: name });
    }
    region.value = calendar.region ?? '';
    region.addEventListener('change', () => {
      if (region.value) calendar.region = region.value;
      else delete calendar.region;
      this.saveHolidayCalendars(list, false);
    });

    for (const category of ['official', 'unofficial'] as const) {
      const label = row.createEl('label', { cls: 'oa-holiday-category' });
      const box = label.createEl('input', { type: 'checkbox' });
      box.checked = calendar[category];
      label.createSpan({ text: this.i18n.t(`holiday_${category}`) });
      box.addEventListener('change', () => {
        calendar[category] = box.checked;
        this.saveHolidayCalendars(list, false);
      });
    }

    const color = row.createEl('input', { cls: 'oa-holiday-color', type: 'color', attr: { 'aria-label': this.i18n.t('holiday_color') } });
    color.value = calendar.color;
    color.addEventListener('change', () => {
      calendar.color = color.value;
      this.saveHolidayCalendars(list, false);
    });

    const remove = row.createEl('button', { cls: 'clickable-icon oa-holiday-remove', attr: { type: 'button', 'aria-label': this.i18n.t('holiday_remove_calendar') } });
    setIcon(remove, 'trash-2');
    remove.addEventListener('click', () => {
      this.plugin.settings.holidayCalendars.splice(index, 1);
      this.saveHolidayCalendars(list);
    });
  }

  /** Guarda los calendarios de feriados y refresca las vistas; `redraw` vuelve a dibujar la lista (alta, baja o país). */
  private saveHolidayCalendars(list: HTMLElement, redraw = true): void {
    this.plugin.saveSettings()
      .then(() => {
        this.refreshDayMarkingViews();
        if (redraw) this.drawHolidayCalendars(list);
      })
      .catch(console.error);
  }

  /**
   * Lista de vacaciones de hábitos (v1.1.15, HV1): una fila por periodo con desde, hasta, nombre opcional y quitar,
   * más un botón para añadir. Es la fuente única de todos los hábitos; cada cambio se guarda y refresca las vistas
   * de hábitos abiertas. Un periodo con `hasta` anterior a `desde` se rechaza y el campo vuelve a su valor.
   */
  private renderHabitVacations(setting: Setting): void {
    setting.settingEl.addClass('oa-habit-vacations-setting');
    this.drawHabitVacations(setting.controlEl.createDiv({ cls: 'oa-habit-vacations' }));
  }

  private drawHabitVacations(list: HTMLElement): void {
    list.empty();
    const vacations = this.plugin.settings.habitVacations;

    if (vacations.length === 0) list.createDiv({ cls: 'oa-holiday-empty', text: this.i18n.t('habit_vacations_empty') });
    vacations.forEach((vacation, index) => this.drawHabitVacationRow(list, vacation, index));

    const add = list.createEl('button', { cls: 'oa-holiday-add', text: this.i18n.t('habit_vacation_add'), attr: { type: 'button' } });
    add.addEventListener('click', () => {
      const today = DateTime.local().toISODate() ?? '';
      vacations.push({ from: today, to: today });
      this.saveHabitVacations(list);
    });
  }

  private drawHabitVacationRow(list: HTMLElement, vacation: IHabitVacation, index: number): void {
    const row = list.createDiv({ cls: 'oa-holiday-calendar oa-habit-vacation' });

    for (const field of ['from', 'to'] as const) {
      const input = row.createEl('input', {
        cls: 'oa-habit-vacation-date',
        type: 'date',
        attr: { 'aria-label': this.i18n.t(`habit_vacation_${field}`) },
      });
      input.value = vacation[field];
      input.addEventListener('change', () => {
        const next = { ...vacation, [field]: input.value };
        if (!input.value || !isValidPeriod(next.from, next.to)) {
          input.value = vacation[field];
          new Notice(this.i18n.t('habit_vacation_invalid'));
          return;
        }
        vacation[field] = input.value;
        this.saveHabitVacations(list, false);
      });
    }

    const name = row.createEl('input', {
      cls: 'oa-habit-vacation-name',
      type: 'text',
      attr: { placeholder: this.i18n.t('habit_vacation_name'), 'aria-label': this.i18n.t('habit_vacation_name') },
    });
    name.value = vacation.name ?? '';
    name.addEventListener('change', () => {
      const value = name.value.trim();
      if (value) vacation.name = value;
      else delete vacation.name;
      this.saveHabitVacations(list, false);
    });

    const remove = row.createEl('button', { cls: 'clickable-icon oa-holiday-remove', attr: { type: 'button', 'aria-label': this.i18n.t('habit_vacation_remove') } });
    setIcon(remove, 'trash-2');
    remove.addEventListener('click', () => {
      this.plugin.settings.habitVacations.splice(index, 1);
      this.saveHabitVacations(list);
    });
  }

  /** Guarda las vacaciones y refresca las vistas de hábitos abiertas; `redraw` vuelve a dibujar la lista (alta o baja). */
  private saveHabitVacations(list: HTMLElement, redraw = true): void {
    this.plugin.saveSettings()
      .then(() => {
        document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'));
        if (redraw) this.drawHabitVacations(list);
      })
      .catch(console.error);
  }

  /** Deja elegida la pestaña Hábitos antes de abrir los ajustes (botón «Vacaciones»). */
  prepareHabitSettings(): void {
    this.activeSection = 'habits';
  }

  /**
   * Con los ajustes ya abiertos, repinta la pestaña elegida si hace falta y lleva la vista a la lista de vacaciones.
   * `refreshDomState` solo existe en Obsidian >= 1.13.
   */
  revealVacations(): void {
    (this as { refreshDomState?: () => void }).refreshDomState?.();
    window.setTimeout(() => {
      this.containerEl.querySelector('.oa-habit-vacations-setting')?.scrollIntoView({ block: 'center' });
    }, 200);
  }

  /**
   * Barra con las pestañas General, Calendario y Hábitos. Al elegir una, `onSelect` hace que la pantalla muestre
   * solo sus ajustes: en la ruta declarativa vuelve a evaluar `visible` de cada grupo y en `display()` repinta.
   */
  private renderSectionTabs(parent: HTMLElement, onSelect: () => void): void {
    const bar = parent.createDiv({ cls: 'oa-settings-tabs', attr: { role: 'tablist', 'aria-label': this.i18n.t('settings_sections') } });

    for (const section of SETTINGS_SECTIONS) {
      const button = bar.createEl('button', {
        cls: 'oa-settings-tab',
        text: this.i18n.t(section.labelKey),
        attr: { type: 'button', role: 'tab', 'data-section': section.id },
      });

      button.addEventListener('click', () => {
        if (section.id === this.activeSection) return;
        this.activeSection = section.id;
        this.markActiveSectionTab(bar);
        onSelect();
      });
    }

    this.markActiveSectionTab(bar);
  }

  private markActiveSectionTab(bar: HTMLElement): void {
    bar.querySelectorAll<HTMLElement>('.oa-settings-tab').forEach(button => {
      const active = button.dataset.section === this.activeSection;
      button.toggleClass('oa-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  /** Campo de la carpeta de hábitos con un aviso informativo debajo (v1.1.13, S4); no impide guardar. */
  private renderHabitFolderField(setting: Setting): void {
    const hintEl = setting.infoEl.createDiv({ cls: 'oa-habit-folder-hint' });

    const updateHint = (value: string): void => {
      const hint = evaluateHabitFolderHint(
        value,
        DEFAULT_SETTINGS.habitFolderPath,
        (path) => this.app.vault.getAbstractFileByPath(path) instanceof TFolder
      );
      hintEl.empty();
      hintEl.toggleClass('oa-habit-folder-hint--error', hint.state === 'invalid');
      if (hint.state === 'missing') {
        hintEl.setText(this.i18n.t('habit_folder_missing_hint', { path: hint.path }));
      } else if (hint.state === 'invalid') {
        hintEl.setText(this.i18n.t(`habit_folder_invalid_${hint.reason}`));
      }
    };
    const updateHintDebounced = debounce(updateHint, 500, true);

    setting.addText(text => text
      .setPlaceholder(DEFAULT_SETTINGS.habitFolderPath)
      .setValue(this.plugin.settings.habitFolderPath)
      .onChange(async (value) => {
        this.plugin.settings.habitFolderPath = value;
        await this.plugin.saveSettings();
        updateHintDebounced(value);
      }));

    updateHint(this.plugin.settings.habitFolderPath);
  }

  /** API declarativa (Obsidian 1.13+): permite que estos ajustes aparezcan en el buscador global de settings. */
  getSettingDefinitions(): SettingDefinitionItem<keyof AgendaPluginSettings>[] {
    return [
      {
        // Barra de pestañas (v1.1.15): cada grupo de abajo se muestra solo en su pestaña
        name: this.i18n.t('settings_sections'),
        searchable: false,
        render: (setting) => {
          setting.settingEl.addClass('oa-settings-tabs-row');
          // refreshDomState solo existe en Obsidian >= 1.13, la única versión que usa esta ruta declarativa
          this.renderSectionTabs(setting.controlEl, () => (this as { refreshDomState?: () => void }).refreshDomState?.());
        },
      },
      {
        type: 'group',
        heading: this.i18n.t('general_settings'),
        visible: () => this.activeSection === 'general',
        items: [
          {
            name: this.i18n.t('show_whats_new_on_update'),
            desc: this.i18n.t('show_whats_new_on_update_desc'),
            control: { type: 'toggle', key: 'showWhatsNewOnUpdate' },
          },
        ],
      },
      {
        type: 'group',
        heading: this.i18n.t('tabs_visibility_settings'),
        visible: () => this.activeSection === 'general',
        items: [
          { name: this.i18n.t('show_overview_tab'), control: { type: 'toggle', key: 'showOverviewTab' } },
          { name: this.i18n.t('show_tasks_tab'), control: { type: 'toggle', key: 'showTasksTab' } },
          { name: this.i18n.t('show_kanban_tab'), control: { type: 'toggle', key: 'showKanbanTab' } },
          { name: this.i18n.t('show_gantt_tab'), control: { type: 'toggle', key: 'showGanttTab' } },
          { name: this.i18n.t('show_calendar_tab'), control: { type: 'toggle', key: 'showCalendarTab' } },
          { name: this.i18n.t('show_habit_tab'), control: { type: 'toggle', key: 'showHabitTab' } },
        ],
      },
      {
        type: 'group',
        heading: this.i18n.t('calendar_settings'),
        visible: () => this.activeSection === 'calendar',
        items: [
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
          {
            name: this.i18n.t('calendar_show_due_dates'),
            render: (setting) => {
              setting.addToggle(toggle => toggle
                .setValue(this.plugin.settings.calendarShowDueDates)
                .onChange(async (value) => {
                  this.plugin.settings.calendarShowDueDates = value;
                  await this.plugin.saveSettings();
                  this.refreshCalendarViews();
                }));
            },
          },
          {
            name: this.i18n.t('calendar_show_start_dates'),
            render: (setting) => {
              setting.addToggle(toggle => toggle
                .setValue(this.plugin.settings.calendarShowStartDates)
                .onChange(async (value) => {
                  this.plugin.settings.calendarShowStartDates = value;
                  await this.plugin.saveSettings();
                  this.refreshCalendarViews();
                }));
            },
          },
          {
            name: this.i18n.t('calendar_show_scheduled_dates'),
            render: (setting) => {
              setting.addToggle(toggle => toggle
                .setValue(this.plugin.settings.calendarShowScheduledDates)
                .onChange(async (value) => {
                  this.plugin.settings.calendarShowScheduledDates = value;
                  await this.plugin.saveSettings();
                  this.refreshCalendarViews();
                }));
            },
          },
          {
            name: this.i18n.t('calendar_show_completed_tasks'),
            render: (setting) => {
              setting.addToggle(toggle => toggle
                .setValue(this.plugin.settings.calendarShowCompletedTasks)
                .onChange(async (value) => {
                  this.plugin.settings.calendarShowCompletedTasks = value;
                  await this.plugin.saveSettings();
                  this.refreshCalendarViews();
                }));
            },
          },
          {
            name: this.i18n.t('calendar_list_days_to_show'),
            desc: this.i18n.t('calendar_list_days_to_show_desc'),
            render: (setting) => {
              setting.addSlider(slider => slider
                .setLimits(7, 14, 1)
                .setValue(this.plugin.settings.calendarListDaysToShow)
                .onChange(async (value) => {
                  this.plugin.settings.calendarListDaysToShow = value;
                  await this.plugin.saveSettings();
                  this.refreshCalendarViews();
                }));
            },
          },
          {
            name: this.i18n.t('calendar_projection_count'),
            desc: this.i18n.t('calendar_projection_count_desc'),
            render: (setting) => {
              setting.addSlider(slider => slider
                .setLimits(0, MAX_PROJECTION_COUNT, 1)
                .setValue(this.plugin.settings.calendarProjectionCount)
                .onChange(async (value) => {
                  this.plugin.settings.calendarProjectionCount = value;
                  await this.plugin.saveSettings();
                  this.refreshDayMarkingViews();
                }));
            },
          },
          {
            name: this.i18n.t('non_working_days'),
            desc: this.i18n.t('non_working_days_desc'),
            render: (setting) => this.renderNonWorkingDays(setting),
          },
          {
            name: this.i18n.t('holiday_calendars'),
            desc: this.i18n.t('holiday_calendars_desc'),
            render: (setting) => this.renderHolidayCalendars(setting),
          },
        ],
      },
      {
        type: 'group',
        heading: this.i18n.t('habit_settings'),
        visible: () => this.activeSection === 'habits',
        items: [
          {
            name: this.i18n.t('habit_folder_path'),
            desc: this.i18n.t('habit_folder_path_desc'),
            render: (setting) => this.renderHabitFolderField(setting),
          },
          { name: this.i18n.t('habit_days_to_show'), control: { type: 'slider', key: 'habitDaysToShow', min: 7, max: 90, step: 1 } },
          { name: this.i18n.t('habit_show_streaks'), control: { type: 'toggle', key: 'habitShowStreaks' } },
          {
            name: this.i18n.t('habit_show_single_daytime_label'),
            desc: this.i18n.t('habit_show_single_daytime_label_desc'),
            render: (setting) => {
              setting.addToggle(toggle => toggle
                .setValue(this.plugin.settings.habitShowSingleDaytimeLabel)
                .onChange(async (value) => {
                  this.plugin.settings.habitShowSingleDaytimeLabel = value;
                  await this.plugin.saveSettings();
                  document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'));
                }));
            },
          },
          { name: this.i18n.t('habit_max_gap'), control: { type: 'slider', key: 'habitDefaultMaxGap', min: 0, max: 30, step: 1 } },
          { name: this.i18n.t('habit_default_priority'), control: { type: 'slider', key: 'habitDefaultPriority', min: 1, max: 5, step: 1 } },
          {
            name: this.i18n.t('habit_default_color'),
            desc: this.i18n.t('habit_default_color_desc'),
            control: { type: 'text', key: 'habitDefaultColor', placeholder: this.i18n.t('habit_default_color_placeholder') },
          },
          {
            name: this.i18n.t('show_habit_sub_area_field'),
            desc: this.i18n.t('show_habit_sub_area_field_desc'),
            control: { type: 'toggle', key: 'showHabitSubAreaField' },
          },
        ],
      },
      {
        type: 'group',
        heading: this.i18n.t('habit_vacations'),
        visible: () => this.activeSection === 'habits',
        items: [
          {
            name: this.i18n.t('habit_vacations_periods'),
            desc: this.i18n.t('habit_vacations_desc'),
            render: (setting) => this.renderHabitVacations(setting),
          },
        ],
      },
      {
        type: 'group',
        heading: this.i18n.t('habit_tab_visibility'),
        visible: () => this.activeSection === 'habits',
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
    const { containerEl } = this;

    containerEl.empty();

    // Barra de pestañas y, debajo, los ajustes de la pestaña elegida; al cambiar de pestaña solo se repinta esa zona
    const sectionEl = createDiv();
    this.renderSectionTabs(containerEl, () => this.displaySection(sectionEl));
    containerEl.appendChild(sectionEl);
    this.displaySection(sectionEl);
  }

  private displaySection(containerEl: HTMLElement): void {
    containerEl.empty();
    if (this.activeSection === 'calendar') this.displayCalendarSection(containerEl);
    else if (this.activeSection === 'habits') this.displayHabitsSection(containerEl);
    else this.displayGeneralSection(containerEl);
  }

  private displayGeneralSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(this.i18n.t("general_settings")).setHeading();

    new Setting(containerEl)
      .setName(this.i18n.t("show_whats_new_on_update"))
      .setDesc(this.i18n.t("show_whats_new_on_update_desc"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showWhatsNewOnUpdate)
        .onChange(async (value) => {
          this.plugin.settings.showWhatsNewOnUpdate = value;
          await this.plugin.saveSettings();
        }));

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
      .setName(this.i18n.t("show_tasks_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTasksTab)
        .onChange(async (value) => {
          this.plugin.settings.showTasksTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("show_kanban_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showKanbanTab)
        .onChange(async (value) => {
          this.plugin.settings.showKanbanTab = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("show_gantt_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showGanttTab)
        .onChange(async (value) => {
          this.plugin.settings.showGanttTab = value;
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
      .setName(this.i18n.t("show_habit_tab"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showHabitTab)
        .onChange(async (value) => {
          this.plugin.settings.showHabitTab = value;
          await this.plugin.saveSettings();
        }));
  }

  private displayCalendarSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(this.i18n.t("calendar_settings")).setHeading();

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

    new Setting(containerEl)
      .setName(this.i18n.t("calendar_show_due_dates"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.calendarShowDueDates)
        .onChange(async (value) => {
          this.plugin.settings.calendarShowDueDates = value;
          await this.plugin.saveSettings();
          this.refreshCalendarViews();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("calendar_show_start_dates"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.calendarShowStartDates)
        .onChange(async (value) => {
          this.plugin.settings.calendarShowStartDates = value;
          await this.plugin.saveSettings();
          this.refreshCalendarViews();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("calendar_show_scheduled_dates"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.calendarShowScheduledDates)
        .onChange(async (value) => {
          this.plugin.settings.calendarShowScheduledDates = value;
          await this.plugin.saveSettings();
          this.refreshCalendarViews();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("calendar_show_completed_tasks"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.calendarShowCompletedTasks)
        .onChange(async (value) => {
          this.plugin.settings.calendarShowCompletedTasks = value;
          await this.plugin.saveSettings();
          this.refreshCalendarViews();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("calendar_list_days_to_show"))
      .setDesc(this.i18n.t("calendar_list_days_to_show_desc"))
      .addSlider(slider => slider
        .setLimits(7, 14, 1)
        .setValue(this.plugin.settings.calendarListDaysToShow)
        .onChange(async (value) => {
          this.plugin.settings.calendarListDaysToShow = value;
          await this.plugin.saveSettings();
          this.refreshCalendarViews();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("calendar_projection_count"))
      .setDesc(this.i18n.t("calendar_projection_count_desc"))
      .addSlider(slider => slider
        .setLimits(0, MAX_PROJECTION_COUNT, 1)
        .setValue(this.plugin.settings.calendarProjectionCount)
        .onChange(async (value) => {
          this.plugin.settings.calendarProjectionCount = value;
          await this.plugin.saveSettings();
          this.refreshDayMarkingViews();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("non_working_days"))
      .setDesc(this.i18n.t("non_working_days_desc"))
      .then(setting => this.renderNonWorkingDays(setting));

    new Setting(containerEl)
      .setName(this.i18n.t("holiday_calendars"))
      .setDesc(this.i18n.t("holiday_calendars_desc"))
      .then(setting => this.renderHolidayCalendars(setting));
  }

  private displayHabitsSection(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(this.i18n.t("habit_settings")).setHeading();

    new Setting(containerEl)
      .setName(this.i18n.t("habit_folder_path"))
      .setDesc(this.i18n.t("habit_folder_path_desc"))
      .then(setting => this.renderHabitFolderField(setting));

    new Setting(containerEl)
      .setName(this.i18n.t("habit_days_to_show"))
      .addSlider(slider => slider
        .setLimits(7, 90, 1)
        .setValue(this.plugin.settings.habitDaysToShow)
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
      .setName(this.i18n.t('habit_show_single_daytime_label'))
      .setDesc(this.i18n.t('habit_show_single_daytime_label_desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.habitShowSingleDaytimeLabel)
        .onChange(async (value) => {
          this.plugin.settings.habitShowSingleDaytimeLabel = value;
          await this.plugin.saveSettings();
          document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'));
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("habit_max_gap"))
      .addSlider(slider => slider
        .setLimits(0, 30, 1)
        .setValue(this.plugin.settings.habitDefaultMaxGap)
        .onChange(async (value) => {
          this.plugin.settings.habitDefaultMaxGap = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(this.i18n.t("habit_default_priority"))
      .addSlider(slider => slider
        .setLimits(1, 5, 1)
        .setValue(this.plugin.settings.habitDefaultPriority)
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

    new Setting(containerEl)
      .setName(this.i18n.t("show_habit_sub_area_field"))
      .setDesc(this.i18n.t("show_habit_sub_area_field_desc"))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showHabitSubAreaField)
        .onChange(async (value) => {
          this.plugin.settings.showHabitSubAreaField = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl).setName(this.i18n.t("habit_vacations")).setHeading();

    new Setting(containerEl)
      .setName(this.i18n.t("habit_vacations_periods"))
      .setDesc(this.i18n.t("habit_vacations_desc"))
      .then(setting => this.renderHabitVacations(setting));

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