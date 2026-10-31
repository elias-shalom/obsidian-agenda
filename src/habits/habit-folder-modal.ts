import { App, Modal } from 'obsidian';
import type { I18n } from '../core/i18n';
import { DEFAULT_SETTINGS } from '../settings/settings';
import { normalizeHabitFolderPath } from './habit-folder';

/** Pregunta dónde crear la carpeta de hábitos que no existe (v1.1.13, S2; ver Arquitectura técnica §25.2). */
export class HabitFolderModal extends Modal {
  private result: string | null = null;

  private constructor(
    app: App,
    private i18n: I18n,
    private missingPath: string,
    private resolve: (path: string | null) => void
  ) {
    super(app);
  }

  /** Devuelve la ruta confirmada (ya normalizada) o `null` si se cancela. */
  static ask(app: App, i18n: I18n, missingPath: string): Promise<string | null> {
    return new Promise(resolve => new HabitFolderModal(app, i18n, missingPath, resolve).open());
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('oa-task-modal');

    contentEl.createEl('h2', { text: this.i18n.t('habit_folder_modal_title') });
    contentEl.createEl('p', { text: this.i18n.t('habit_folder_modal_desc', { path: this.missingPath }) });

    const form = contentEl.createEl('form', { cls: 'oa-task-modal__form' });
    const group = form.createDiv({ cls: 'oa-form-group' });
    group.createEl('label', { text: this.i18n.t('habit_folder_path'), cls: 'oa-form-label' });
    const input = group.createEl('input', { type: 'text', cls: 'oa-form-input' });
    input.value = this.missingPath;
    input.placeholder = DEFAULT_SETTINGS.habitFolderPath;
    const errorEl = group.createDiv({ cls: 'oa-habit-folder-hint oa-habit-folder-hint--error' });

    const actions = form.createDiv({ cls: 'oa-task-modal__actions' });
    const createBtn = actions.createEl('button', { type: 'submit', text: this.i18n.t('habit_folder_create'), cls: 'oa-btn oa-btn--primary' });
    const cancelBtn = actions.createEl('button', { type: 'button', text: this.i18n.t('cancel'), cls: 'oa-btn oa-btn--secondary' });

    const validate = (): string | null => {
      const normalized = normalizeHabitFolderPath(input.value, DEFAULT_SETTINGS.habitFolderPath);
      errorEl.setText(normalized.ok ? '' : this.i18n.t(`habit_folder_invalid_${normalized.reason}`));
      createBtn.disabled = !normalized.ok;
      return normalized.ok ? normalized.path : null;
    };

    input.addEventListener('input', validate);
    cancelBtn.addEventListener('click', () => this.close());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const path = validate();
      if (path === null) return;
      this.result = path;
      this.close();
    });

    validate();
    input.focus();
    input.select();
  }

  onClose(): void {
    this.contentEl.empty();
    this.resolve(this.result);
  }
}
