import { getLanguage, App } from "obsidian";

export class I18n {
  private translations: Record<string, unknown> = {};
  private currentLanguage: string = "en";
  private app: App; // Changed from any to App

  constructor(app: App) { // Changed from any to App
    this.app = app; // Initialize app in the constructor
  }

  private static readonly SUPPORTED_LOCALES = ["en", "es", "de", "fr", "it", "pt"] as const;
  private static readonly DEFAULT_LOCALE = "en";
  private static readonly LOCALE_LOADERS: Record<string, () => Promise<{ default?: Record<string, unknown> }>> = {
    "en": () => import("../locales/en.json"),
    "es": () => import("../locales/es.json"),
    "de": () => import("../locales/de.json"),
    "fr": () => import("../locales/fr.json"),
    "it": () => import("../locales/it.json"),
    "pt": () => import("../locales/pt.json"),
  };

  async loadLanguage(): Promise<void> {
    try {
      const detectedLanguage = getLanguage();
      const language = (I18n.SUPPORTED_LOCALES as readonly string[]).includes(detectedLanguage)
        ? detectedLanguage
        : I18n.DEFAULT_LOCALE;

      // Importar dinámicamente el archivo de idioma como módulo
      const loader = I18n.LOCALE_LOADERS[language] ?? I18n.LOCALE_LOADERS[I18n.DEFAULT_LOCALE];
      const localeModule = await loader();
      this.translations = (localeModule.default || localeModule) as Record<string, unknown>;
      this.currentLanguage = language;
    } catch (error) {
      console.error("Error loading translations:", error);
    }
  }

  t(key: string, params?: Record<string, string | number | boolean>): string {
    // Dividir la clave por puntos para navegar en la estructura jerárquica
    const keys = key.split('.');
    let result: unknown = this.translations;

    // Navegar a través del objeto de traducciones
    for (const k of keys) {
      if (result && typeof result === 'object' && result !== null && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        console.warn(`[i18n-${this.currentLanguage}] Translation key not found: "${key}"`);
        return key; // Devolver la clave si no se encuentra la traducción
      }
    }

    // Si el resultado no es un string, devolver la clave
    if (typeof result !== 'string') {
      console.warn(`Translation key does not resolve to a string: ${key}`);
      return key;
    }

    // Reemplazar los placeholders
    let translation = result;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translation = translation.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      }
    }

    return translation;
  }
}