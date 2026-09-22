import { App, Modal, Notice, TFile, stringifyYaml } from 'obsidian';
import Handlebars from 'handlebars';
import type { I18n } from '../core/i18n';
import type { HabitManager } from './habit-manager';
import { HABIT_AREAS } from './habit';
import type { Daytime, HabitArea, IHabit } from './habit';

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
      subArea: habit?.subArea ?? '',
      statusActive: (habit?.status ?? 'active') === 'active',
      statusLabelText: (habit?.status ?? 'active') === 'active'
        ? this.i18n.t('habit_status_active')
        : this.i18n.t('habit_status_inactive'),
      areas: HABIT_AREAS.map(area => ({
        value: area,
        label: this.i18n.t(`habit_area_${area.replace(/-/g, '_')}`),
        selected: habit ? habit.area === area : area === 'temporal',
      })),
      frequencyOptions: [
        { value: 'everyday', label: this.i18n.t('habit_freq_everyday'), selected: frequencyMode === 'everyday' },
        { value: 'workweek', label: this.i18n.t('habit_freq_workweek'), selected: frequencyMode === 'workweek' },
        { value: 'weekend', label: this.i18n.t('habit_freq_weekend'), selected: frequencyMode === 'weekend' },
        { value: 'custom', label: this.i18n.t('habit_freq_custom'), selected: frequencyMode === 'custom' },
      ],
      isCustomFrequency: frequencyMode === 'custom',
      weekdays: WEEKDAY_OPTIONS.map(({ key, iso }) => ({
        key,
        label: this.i18n.t(`habit_freq_${key}`),
        checked: habit ? habit.frequencySet.has(iso) : false,
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

    const fragment = contentEl.ownerDocument.createDocumentFragment();
    Array.from(doc.body.children).forEach(element => {
      fragment.appendChild(contentEl.ownerDocument.importNode(element, true));
    });
    contentEl.appendChild(fragment);

    this.attachListeners();
  }

  private attachListeners(): void {
    const form = this.contentEl.querySelector<HTMLFormElement>('#oa-habit-form');
    const frequencySelect = this.contentEl.querySelector<HTMLSelectElement>('#oa-habit-frequency');
    const customDaysGroup = this.contentEl.querySelector<HTMLElement>('.oa-habit-form-weekdays');
    const cancelButton = this.contentEl.querySelector<HTMLButtonElement>('#oa-habit-cancel');
    const deleteButton = this.contentEl.querySelector<HTMLButtonElement>('#oa-habit-delete');
    const errorEl = this.contentEl.querySelector<HTMLElement>('#oa-habit-form-error');

    frequencySelect?.addEventListener('change', () => {
      const isCustom = frequencySelect.value === 'custom';
      customDaysGroup?.toggleClass('oa-hidden', !isCustom);
    });

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
      slider.style.setProperty('--oa-priority-percent', `${percent}%`);
      if (valueEl) valueEl.textContent = String(value);
    };
    slider.addEventListener('input', update);
    update();
  }

  /** Resuelve el color de acento activo del tema a un hex válido para <input type="color"> */
  private resolveAccentColorHex(): string {
    const probe = this.contentEl.ownerDocument.createElement('span');
    probe.style.color = 'var(--interactive-accent)';
    probe.style.display = 'none';
    this.contentEl.ownerDocument.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    probe.remove();

    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return '#7c3aed';

    const [r, g, b] = match.map(Number);
    return `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`;
  }

  private attachTimeDial(): void {
    const dial = this.contentEl.querySelector<HTMLElement>('#oa-habit-time-dial');
    const arc = this.contentEl.querySelector<SVGCircleElement>('#oa-habit-time-dial-arc');
    const thumb = this.contentEl.querySelector<HTMLElement>('#oa-habit-time-dial-thumb');
    const valueLabel = this.contentEl.querySelector<HTMLElement>('#oa-habit-time-dial-value');
    const hiddenInput = this.contentEl.querySelector<HTMLInputElement>('#oa-habit-time');
    if (!dial || !arc || !thumb || !hiddenInput) return;

    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    arc.style.strokeDasharray = `${circumference}`;

    let currentValue = Number(hiddenInput.value) || 0;

    const applyValue = (minutes: number) => {
      currentValue = Math.max(0, Math.min(TIME_DIAL_MAX_MINUTES, Math.round(minutes)));
      const percent = currentValue / TIME_DIAL_MAX_MINUTES;
      const angleDeg = percent * 360 - 90;
      const angleRad = angleDeg * (Math.PI / 180);

      arc.style.strokeDashoffset = `${circumference * (1 - percent)}`;
      thumb.style.left = `${((60 + radius * Math.cos(angleRad)) / 120) * 100}%`;
      thumb.style.top = `${((60 + radius * Math.sin(angleRad)) / 120) * 100}%`;
      if (valueLabel) valueLabel.textContent = String(currentValue);
      hiddenInput.value = String(currentValue);
      dial.setAttribute('aria-valuenow', String(currentValue));
    };

    const setValueFromPointer = (event: PointerEvent) => {
      const rect = dial.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      applyValue((angle / 360) * TIME_DIAL_MAX_MINUTES);
    };

    let dragging = false;
    dial.addEventListener('pointerdown', (event) => {
      dragging = true;
      dial.setPointerCapture(event.pointerId);
      setValueFromPointer(event);
    });
    dial.addEventListener('pointermove', (event) => {
      if (dragging) setValueFromPointer(event);
    });
    dial.addEventListener('pointerup', (event) => {
      dragging = false;
      dial.releasePointerCapture(event.pointerId);
    });
    dial.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
        event.preventDefault();
        applyValue(currentValue + 1);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
        event.preventDefault();
        applyValue(currentValue - 1);
      }
    });
    dial.addEventListener('wheel', (event) => {
      event.preventDefault();
      applyValue(currentValue + (event.deltaY < 0 ? 1 : -1));
    }, { passive: false });

    applyValue(currentValue);
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
    const area = (get<HTMLSelectElement>('oa-habit-area')?.value ?? 'temporal') as HabitArea;
    const subArea = get<HTMLInputElement>('oa-habit-sub-area')?.value.trim() ?? '';
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

    return { name, description, time, priority, maxGap, color, status, area, subArea, frequency, daytimes };
  }

  private async handleSubmit(form: HTMLFormElement): Promise<void> {
    const values = this.readForm(form);

    if (!values.name) {
      throw new Error(this.i18n.t('habit_name_required'));
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
      description: values.description,
      time: values.time,
      area: values.area,
      frequency: values.frequency,
      priority: values.priority,
      daytime: values.daytimes,
      status: values.status,
      maxGap: values.maxGap,
    };

    if (values.subArea) frontmatter.subArea = values.subArea;
    if (values.color) frontmatter.color = values.color;

    const content = `---\n${stringifyYaml(frontmatter)}---\n`;
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

    await this.app.fileManager.processFrontMatter(habit.file, (fm) => {
      fm.name = values.name;
      fm.description = values.description;
      fm.time = values.time;
      fm.area = values.area;
      if (values.subArea) {
        fm.subArea = values.subArea;
      } else {
        delete fm.subArea;
      }
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
    });

    if (renaming) {
      await this.app.fileManager.renameFile(habit.file, targetPath);
    }

    new Notice(this.i18n.t('habit_updated'));
  }

  private async deleteHabit(file: TFile): Promise<void> {
    await this.app.vault.delete(file);
    document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'));
    this.close();
  }
}
