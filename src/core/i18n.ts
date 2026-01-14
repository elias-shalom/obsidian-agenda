import { getLanguage, App } from "obsidian";

export class I18n {
  private translations: Record<string, string> = {};
  private currentLanguage: string = "en";
  private app: App; // Changed from any to App

  constructor(app: App) { // Changed from any to App
    this.app = app; // Initialize app in the constructor
  }

  async loadLanguage(): Promise<void> {
    try {
      const language = getLanguage();
      // Importar dinámicamente el archivo de idioma como módulo
      // esbuild maneja los archivos .json como módulos
      const localeModule = await import(`../locales/${language}.json`);
      this.translations = localeModule.default || localeModule;
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
        console.warn(`Translation key not found: ${key}`);
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