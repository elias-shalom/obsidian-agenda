import { App, Modal, Notice, TFile, parseYaml, stringifyYaml } from 'obsidian';
import Handlebars from 'handlebars';
import type { I18n } from '../core/i18n';
import type { HabitManager } from './habit-manager';
import { getAreaLabel } from './habit';
import type { Daytime, HabitArea, IHabit } from './habit';
import { TimeDial } from '../core/time-dial';

// @ts-ignore: Plugin de esbuild maneja los archivos .hbs
import habitEditorTemplate from './templates/habit-editor-modal.hbs';

type HandlebarsTemplate = (data: Record<string, unknown>) => string;

const DAYTIME_OPTIONS: Daytime[] = ['wake up', 'morning', 'afternoon', 'evening', 'night'];
const TIME_DIAL_MAX_MINUTES = 120;
const WEEKDAY_OPTIONS: { key: string; iso: number }[] = [
  { key: 'monday', iso: 1 },
  { key: 'tuesday', iso: 2 },
  { key: 'wednesday', iso: 3 },
  { key: 'thursday', iso: 4 },
  { key: 'friday', iso: 5 },
  { key: 'saturday', iso: 6 },
  { key: 'sunday', iso: 7 },
];
const FREQUENCY_PRESETS: Record<'everyday' | 'workweek' | 'weekend', number[]> = {
  everyday: [1, 2, 3, 4, 5, 6, 7],
  workweek: [1, 2, 3, 4, 5],
  weekend: [6, 7],
};

function daytimeLabelKey(daytime: Daytime): string {
  return `habit_daytime_${daytime.replace(/\s+/g, '_')}`;
}

function sanitizeFileName(raw: string): string {
  return raw.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ');
}

interface HabitFormValues {
  name: string;
  description: string;
  time: number;
  priority: number;
  maxGap: number;
  color: string;
  status: string;
  area: HabitArea;
  subArea: string;
  relatedFiles: string[];
  frequency: unknown;
  daytimes: Daytime[];
}

export class HabitEditorModal extends Modal {
  private habit?: IHabit;
  private helpersRegistered = false;

  constructor(app: App, private habitManager: HabitManager, private i18n: I18n, habit?: IHabit) {
    super(app);
    this.habit = habit;
  }

  onOpen(): void {
    this.registerHelpers();
    void this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private registerHelpers(): void {
    if (this.helpersRegistered) return;
    Handlebars.registerHelper('t', (key: string) => this.i18n.t(key));
    this.helpersRegistered = true;
  }

  private resolveFrequencyMode(habit?: IHabit): 'everyday' | 'workweek' | 'weekend' | 'custom' {
    if (!habit) return 'everyday';

    const set = habit.frequencySet;
    if (set.size === 7 && [1, 2, 3, 4, 5, 6, 7].every(day => set.has(day))) return 'everyday';
    if (set.size === 5 && [1, 2, 3, 4, 5].every(day => set.has(day))) return 'workweek';
    if (set.size === 2 && [6, 7].every(day => set.has(day))) return 'weekend';
    return 'custom';
  }

  /** Opciones del combobox de sub-área: subcarpetas de 2º/3er nivel del área + opción vacía + valor legado si ya no existe como carpeta */
  private buildSubAreaOptions(area: string, selectedValue: string): { value: string; label: string; selected: boolean }[] {
    const options = this.habitManager.getSubAreaOptions(area);
    if (selectedValue && !options.includes(selectedValue)) {
      options.push(selectedValue);
      options.sort((a, b) => a.localeCompare(b));
    }

    return [
      { value: '', label: this.i18n.t('habit_sub_area_none'), selected: !selectedValue },
      ...options.map(value => ({ value, label: value, selected: value === selectedValue })),
    ];
  }

  private async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('oa-habit-form-modal');

    const habit = this.habit;
    const frequencyMode = this.resolveFrequencyMode(habit);

    const data = {
      isEdit: !!habit,
      heading: habit ? this.i18n.t('habit_edit_habit') : this.i18n.t('habit_new_habit'),
      name: habit?.name ?? '',
      description: habit?.description ?? '',
      time: habit?.time ?? 0,
      timeDialMax: TIME_DIAL_MAX_MINUTES,
      priority: habit?.priority ?? 3,
      maxGap: habit?.maxGap ?? 0,
      color: habit?.color ?? '',
      relatedFiles: habit?.related ?? [],
      statusActive: (habit?.status ?? 'active') === 'active',
      statusLabelText: (habit?.status ?? 'active') === 'active'
        ? this.i18n.t('habit_status_active')
        : this.i18n.t('habit_status_inactive'),
      areas: this.habitManager.getVaultRootFolders().map(area => ({
        value: area,
        label: getAreaLabel(area, this.i18n),
        selected: habit ? habit.area === area : area === 'temporal',
      })),
      showSubArea: this.habitManager.getSettings().showHabitSubAreaField,
      subAreaOptions: this.buildSubAreaOptions(habit?.area ?? 'temporal', habit?.subArea ?? ''),
      frequencyOptions: [
        { value: 'everyday', label: this.i18n.t('habit_freq_everyday'), selected: frequencyMode === 'everyday' },
        { value: 'workweek', label: this.i18n.t('habit_freq_workweek'), selected: frequencyMode === 'workweek' },
        { value: 'weekend', label: this.i18n.t('habit_freq_weekend'), selected: frequencyMode === 'weekend' },
        { value: 'custom', label: this.i18n.t('habit_freq_custom'), selected: frequencyMode === 'custom' },
      ],
      weekdays: WEEKDAY_OPTIONS.map(({ key, iso }) => ({
        key,
        label: this.i18n.t(`habit_freq_${key}`),
        checked: habit
          ? habit.frequencySet.has(iso)
          : (FREQUENCY_PRESETS[frequencyMode as keyof typeof FREQUENCY_PRESETS]?.includes(iso) ?? false),
      })),
      daytimes: DAYTIME_OPTIONS.map(daytime => ({
        value: daytime,
        slug: daytime.replace(/\s+/g, '_'),
        label: this.i18n.t(daytimeLabelKey(daytime)),
        checked: habit ? habit.daytimes.includes(daytime) : daytime === 'morning',
      })),
    };

    const html = (habitEditorTemplate as HandlebarsTemplate)(data);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    Array.from(doc.body.children).forEach(element => {
      contentEl.appendChild(contentEl.ownerDocument.importNode(element, true));
    });

    this.attachListeners();
  }

  private attachListeners(): void {
    const form = this.contentEl.querySelector<HTMLFormElement>('#oa-habit-form');
    const cancelButton = this.contentEl.querySelector<HTMLButtonElement>('#oa-habit-cancel');
    const deleteButton = this.contentEl.querySelector<HTMLButtonElement>('#oa-habit-delete');
    const errorEl = this.contentEl.querySelector<HTMLElement>('#oa-habit-form-error');

    this.attachFrequencySync();

    const statusCheckbox = this.contentEl.querySelector<HTMLInputElement>('#oa-habit-status');
    const statusLabel = this.contentEl.querySelector<HTMLElement>('#oa-habit-status-label');
    statusCheckbox?.addEventListener('change', () => {
      if (statusLabel) {
        statusLabel.textContent = statusCheckbox.checked
          ? this.i18n.t('habit_status_active')
          : this.i18n.t('habit_status_inactive');
      }
    });

    this.wireRangeSlider('oa-habit-priority', 'oa-habit-priority-value');
    this.wireRangeSlider('oa-habit-max-gap', 'oa-habit-max-gap-value');

    this.attachSubAreaSync();
    this.attachRelatedFileField();

    const colorInput = this.contentEl.querySelector<HTMLInputElement>('#oa-habit-color');
    if (colorInput && colorInput.dataset.hasColor !== 'true') {
      colorInput.value = this.resolveAccentColorHex();
    }

    this.attachTimeDial();

    cancelButton?.addEventListener('click', () => this.close());

    deleteButton?.addEventListener('click', () => {
      if (!this.habit) return;

      if (deleteButton.dataset.confirm === 'true') {
        this.deleteHabit(this.habit.file).catch(console.error);
        return;
      }

      deleteButton.dataset.confirm = 'true';
      const originalText = deleteButton.textContent;
      deleteButton.textContent = this.i18n.t('habit_delete_confirm');
      window.setTimeout(() => {
        deleteButton.dataset.confirm = 'false';
        deleteButton.textContent = originalText;
      }, 3000);
    });

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (errorEl) errorEl.textContent = '';
      this.handleSubmit(form).catch(error => {
        const message = error instanceof Error ? error.message : String(error);
        if (errorEl) errorEl.textContent = message;
      });
    });
  }

  /** Sincroniza el relleno visual y la etiqueta numérica de un <input type="range"> */
  private wireRangeSlider(inputId: string, valueId: string): void {
    const slider = this.contentEl.querySelector<HTMLInputElement>(`#${inputId}`);
    const valueEl = this.contentEl.querySelector<HTMLElement>(`#${valueId}`);
    if (!slider) return;

    const update = () => {
      const min = Number(slider.min) || 0;
      const max = Number(slider.max) || 100;
      const value = Number(slider.value) || min;
      const percent = ((value - min) / (max - min)) * 100;
      slider.setCssProps({ '--oa-priority-percent': `${percent}%` });
      if (valueEl) valueEl.textContent = String(value);
    };
    slider.addEventListener('input', update);
    update();
  }

  /** Sincroniza en ambas direcciones el combo de frecuencia y los checkboxes de días */
  private attachFrequencySync(): void {
    const select = this.contentEl.querySelector<HTMLSelectElement>('#oa-habit-frequency');
    if (!select) return;

    const checkboxes = WEEKDAY_OPTIONS.map(({ key, iso }) => ({
      iso,
      input: this.contentEl.querySelector<HTMLInputElement>(`#oa-habit-freq-${key}`),
    }));

    const applyPreset = (mode: string) => {
      const days = FREQUENCY_PRESETS[mode as keyof typeof FREQUENCY_PRESETS];
      if (!days) return;
      checkboxes.forEach(({ iso, input }) => {
        if (input) input.checked = days.includes(iso);
      });
    };

    const computeModeFromCheckboxes = (): 'everyday' | 'workweek' | 'weekend' | 'custom' => {
      const checked = checkboxes.filter(({ input }) => input?.checked).map(({ iso }) => iso).sort();
      const matches = (days: number[]) => checked.length === days.length && days.every(day => checked.includes(day));

      if (matches(FREQUENCY_PRESETS.everyday)) return 'everyday';
      if (matches(FREQUENCY_PRESETS.workweek)) return 'workweek';
      if (matches(FREQUENCY_PRESETS.weekend)) return 'weekend';
      return 'custom';
    };

    select.addEventListener('change', () => {
      if (select.value !== 'custom') applyPreset(select.value);
    });

    checkboxes.forEach(({ input }) => {
      input?.addEventListener('change', () => {
        select.value = computeModeFromCheckboxes();
      });
    });
  }

  /** Resuelve el color de acento activo del tema a un hex válido para <input type="color"> */
  private resolveAccentColorHex(): string {
    const probe = this.contentEl.ownerDocument.body.createEl('span');
    probe.setCssStyles({ color: 'var(--interactive-accent)', display: 'none' });
    const rgb = getComputedStyle(probe).color;
    probe.remove();

    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return '#7c3aed';

    const [r, g, b] = match.map(Number);
    return `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`;
  }

  /** Extrae el linktext de un wikilink `[[Nota|Alias]]`, un link inline `[Texto](Nota.md)` o una ruta cruda */
  private resolveLinktext(raw: string): string {
    const inlineMatch = raw.match(/^\[.*?\]\((.*?)\)$/);
    if (inlineMatch) {
      try { return decodeURIComponent(inlineMatch[1]); } catch { return inlineMatch[1]; }
    }
    return raw.replace(/^\[\[|\]\]$/g, '').split('|')[0].split('#')[0];
  }

  /** Recalcula las opciones de sub-área cuando cambia el combobox de área */
  private attachSubAreaSync(): void {
    const areaSelect = this.contentEl.querySelector<HTMLSelectElement>('#oa-habit-area');
    const subAreaSelect = this.contentEl.querySelector<HTMLSelectElement>('#oa-habit-sub-area');
    if (!areaSelect || !subAreaSelect) return;

    areaSelect.addEventListener('change', () => {
      const options = this.buildSubAreaOptions(areaSelect.value, '');
      subAreaSelect.innerHTML = '';
      options.forEach(option => {
        const opt = subAreaSelect.createEl('option', { value: option.value, text: option.label });
        if (option.selected) opt.selected = true;
      });
    });
  }

  /** Autocompletado + chips removibles del campo "Archivos relacionados", replicando el picker del modal de tareas */
  private attachRelatedFileField(): void {
    const input = this.contentEl.querySelector<HTMLInputElement>('#oa-habit-related-file');
    const suggestionsList = this.contentEl.querySelector<HTMLUListElement>('#oa-habit-related-file-suggestions');
    const hintEl = this.contentEl.querySelector<HTMLElement>('#oa-habit-related-file-hint');
    const chipsContainer = this.contentEl.querySelector<HTMLElement>('#oa-habit-related-file-chips');
    if (!input || !chipsContainer) return;

    const markdownFiles = this.app.vault.getMarkdownFiles();

    const hideSuggestions = () => {
      suggestionsList?.addClass('oa-hidden');
    };

    const getChipLinks = (): string[] =>
      Array.from(chipsContainer.querySelectorAll<HTMLElement>('[data-link]')).map(el => el.dataset.link ?? '');

    const updateHint = () => {
      if (!hintEl) return;
      const links = getChipLinks();
      if (links.length === 0) {
        hintEl.textContent = '';
        hintEl.className = 'oa-file-hint';
        return;
      }

      const sourcePath = this.habit?.file.path ?? '';
      const hasUnresolvedLink = links.some(value => {
        const linktext = this.resolveLinktext(value);
        return !this.app.metadataCache.getFirstLinkpathDest(linktext, sourcePath)
          && !this.app.vault.getAbstractFileByPath(linktext);
      });
      hintEl.textContent = hasUnresolvedLink ? this.i18n.t('habit_related_file_hint_missing') : '';
      hintEl.className = hasUnresolvedLink ? 'oa-file-hint oa-file-hint--new' : 'oa-file-hint';
    };

    const addChip = (link: string) => {
      const trimmed = link.trim();
      if (!trimmed || getChipLinks().includes(trimmed)) return;

      const chip = chipsContainer.createEl('span', { cls: 'oa-related-chip' });
      chip.dataset.link = trimmed;

      chip.createEl('span', { cls: 'oa-related-chip__label', text: trimmed });

      chip.createEl('button', {
        cls: 'oa-related-chip__remove',
        type: 'button',
        text: '×',
        attr: { 'aria-label': this.i18n.t('habit_related_file_remove') },
      });

      updateHint();
    };

    chipsContainer.addEventListener('click', (event) => {
      const removeBtn = (event.target as HTMLElement).closest<HTMLButtonElement>('.oa-related-chip__remove');
      if (!removeBtn) return;
      removeBtn.closest('.oa-related-chip')?.remove();
      updateHint();
    });

    const showSuggestions = (query: string) => {
      if (!suggestionsList) return;
      suggestionsList.innerHTML = '';

      if (!query) { hideSuggestions(); return; }

      const parts = query.toLowerCase().split('/');
      const matches = markdownFiles
        .filter(f => parts.every(part => f.path.toLowerCase().includes(part)))
        .slice(0, 10);

      if (matches.length === 0) { hideSuggestions(); return; }

      matches.forEach(file => {
        const li = suggestionsList.createEl('li', { cls: 'oa-file-suggestion-item', text: file.path });
        li.addEventListener('mousedown', (event) => {
          event.preventDefault();
          const sourcePath = this.habit?.file.path ?? `${this.habitManager.getFolderPath()}/untitled.md`;
          addChip(this.app.fileManager.generateMarkdownLink(file, sourcePath));
          input.value = '';
          hideSuggestions();
        });
      });

      suggestionsList.removeClass('oa-hidden');
    };

    input.addEventListener('input', () => {
      showSuggestions(input.value.trim());
    });

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      addChip(input.value);
      input.value = '';
      hideSuggestions();
    });

    input.addEventListener('blur', () => {
      window.setTimeout(hideSuggestions, 150);
    });

    updateHint();
  }

  private attachTimeDial(): void {
    const dial = this.contentEl.querySelector<HTMLElement>('#oa-habit-time-dial');
    const hiddenInput = this.contentEl.querySelector<HTMLInputElement>('#oa-habit-time');
    if (!dial || !hiddenInput) return;

    new TimeDial({
      maxMinutes: TIME_DIAL_MAX_MINUTES,
      initialMinutes: Number(hiddenInput.value) || 0,
      unitLabel: this.i18n.t('habit_time_unit_minutes'),
      ariaLabel: this.i18n.t('habit_field_time'),
      onChange: (minutes) => { hiddenInput.value = String(minutes); },
    }).mount(dial);
  }

  private readForm(form: HTMLFormElement): HabitFormValues {
    const get = <T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id: string) =>
      form.querySelector<T>(`#${id}`);

    const name = sanitizeFileName(get<HTMLInputElement>('oa-habit-name')?.value ?? '');
    const description = get<HTMLTextAreaElement>('oa-habit-description')?.value.trim() ?? '';
    const time = Number(get<HTMLInputElement>('oa-habit-time')?.value ?? 0) || 0;
    const priority = Math.min(5, Math.max(1, Number(get<HTMLInputElement>('oa-habit-priority')?.value ?? 3) || 3));
    const maxGap = Math.max(0, Number(get<HTMLInputElement>('oa-habit-max-gap')?.value ?? 0) || 0);
    const color = get<HTMLInputElement>('oa-habit-color')?.value.trim() ?? '';
    const status = get<HTMLInputElement>('oa-habit-status')?.checked ? 'active' : 'inactive';
    const area = get<HTMLSelectElement>('oa-habit-area')?.value ?? 'temporal';
    const subAreaSelect = get<HTMLSelectElement>('oa-habit-sub-area');
    const subArea = subAreaSelect ? subAreaSelect.value : (this.habit?.subArea ?? '');
    const relatedFiles = Array.from(form.querySelectorAll<HTMLElement>('#oa-habit-related-file-chips [data-link]'))
      .map(el => el.dataset.link ?? '')
      .filter(Boolean);
    const frequencyMode = get<HTMLSelectElement>('oa-habit-frequency')?.value ?? 'everyday';

    let frequency: unknown = frequencyMode;
    if (frequencyMode === 'custom') {
      frequency = WEEKDAY_OPTIONS
        .filter(({ key }) => form.querySelector<HTMLInputElement>(`#oa-habit-freq-${key}`)?.checked)
        .map(({ key }) => key);
    }

    const daytimes = DAYTIME_OPTIONS.filter(daytime =>
      form.querySelector<HTMLInputElement>(`#oa-habit-daytime-${daytime.replace(/\s+/g, '_')}`)?.checked
    );

    return { name, description, time, priority, maxGap, color, status, area, subArea, relatedFiles, frequency, daytimes };
  }

  private async handleSubmit(form: HTMLFormElement): Promise<void> {
    const values = this.readForm(form);

    if (!values.name) {
      throw new Error(this.i18n.t('habit_name_required'));
    }

    if (Array.isArray(values.frequency) && values.frequency.length === 0) {
      throw new Error(this.i18n.t('habit_frequency_required'));
    }

    if (values.daytimes.length === 0) {
      new Notice(this.i18n.t('habit_daytime_required'));
      values.daytimes.push('morning');
    }

    if (this.habit) {
      await this.updateHabit(this.habit, values);
    } else {
      await this.createHabit(values);
    }

    await this.habitManager.refreshHabits();
    document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'));
    this.close();
  }

  private async createHabit(values: HabitFormValues): Promise<void> {
    const folderPath = this.habitManager.getFolderPath();
    const filePath = `${folderPath}/${values.name}.md`;

    if (this.app.vault.getAbstractFileByPath(filePath)) {
      throw new Error(this.i18n.t('habit_name_exists'));
    }

    const frontmatter: Record<string, unknown> = {
      name: values.name,
      time: values.time,
      area: values.area,
      frequency: values.frequency,
      priority: values.priority,
      daytime: values.daytimes,
      status: values.status,
      maxGap: values.maxGap,
    };

    if (values.subArea) frontmatter['sub-area'] = values.subArea;
    if (values.relatedFiles.length > 0) frontmatter.related = values.relatedFiles;
    if (values.color) frontmatter.color = values.color;

    const content = `---\n${stringifyYaml(frontmatter)}---\n${values.description ? `${values.description}\n` : ''}`;
    await this.app.vault.create(filePath, content);
    new Notice(this.i18n.t('habit_created'));
  }

  private async updateHabit(habit: IHabit, values: HabitFormValues): Promise<void> {
    const folderPath = this.habitManager.getFolderPath();
    const targetPath = `${folderPath}/${values.name}.md`;
    const renaming = values.name !== habit.file.basename;

    if (renaming && this.app.vault.getAbstractFileByPath(targetPath)) {
      throw new Error(this.i18n.t('habit_name_exists'));
    }

    await this.app.vault.process(habit.file, content => {
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
      const parsedFrontmatter: unknown = frontmatterMatch ? parseYaml(frontmatterMatch[1]) : {};
      const fm: Record<string, unknown> = parsedFrontmatter && typeof parsedFrontmatter === 'object'
        ? { ...(parsedFrontmatter as Record<string, unknown>) }
        : {};

      fm.name = values.name;
      delete fm.description;
      fm.time = values.time;
      fm.area = values.area;
      if (values.subArea) {
        fm['sub-area'] = values.subArea;
      } else {
        delete fm['sub-area'];
      }
      if (values.relatedFiles.length > 0) {
        fm.related = values.relatedFiles;
      } else {
        delete fm.related;
      }
      delete fm.relatedFile;
      fm.frequency = values.frequency;
      fm.priority = values.priority;
      fm.daytime = values.daytimes;
      fm.status = values.status;
      fm.maxGap = values.maxGap;
      if (values.color) {
        fm.color = values.color;
      } else {
        delete fm.color;
      }
      // completions/entries no se tocan: se preservan tal cual estaban.
      return `---\n${stringifyYaml(fm)}---\n${values.description ? `${values.description}\n` : ''}`;
    });

    if (renaming) {
      await this.app.fileManager.renameFile(habit.file, targetPath);
    }

    new Notice(this.i18n.t('habit_updated'));
  }

  private async deleteHabit(file: TFile): Promise<void> {
    await this.app.fileManager.trashFile(file);
    await this.habitManager.refreshHabits();
    document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'));
    this.close();
  }
}
