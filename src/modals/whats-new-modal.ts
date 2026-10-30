import { App, Modal } from 'obsidian';
import type { I18n } from '../core/i18n';
import type { WhatsNewEntry } from '../core/whats-new';

// @ts-ignore: Plugin de esbuild maneja los archivos .hbs
import whatsNewTemplate from './templates/whats-new-modal.hbs';

type HandlebarsTemplate = (data: Record<string, unknown>) => string;

/** Novedades de las versiones instaladas desde la última vez (v1.1.13; ver Arquitectura técnica §19). */
export class WhatsNewModal extends Modal {
  constructor(app: App, private i18n: I18n, private entries: WhatsNewEntry[]) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    const html = (whatsNewTemplate as HandlebarsTemplate)({
      heading: this.i18n.t('whats_new.title'),
      closeLabel: this.i18n.t('whats_new.close'),
      entries: this.entries,
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    Array.from(doc.body.children).forEach(element => {
      contentEl.appendChild(contentEl.ownerDocument.importNode(element, true));
    });

    contentEl.querySelector('#oa-whats-new-close')?.addEventListener('click', () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
