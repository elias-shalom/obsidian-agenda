export class I18n {
  private translations: Record<string, string> = {};
  private currentLanguage: string = "en";
  private app: any; // Add a property for app

  constructor(app: any) {
    this.app = app; // Initialize app in the constructor
  }

  async loadLanguage(language: string): Promise<void> {
    try {

      const templatePath = this.app.vault.adapter.getResourcePath(`.obsidian/plugins/obsidian-agenda/locales/${language}.json`);
      console.log("Ruta generada con getResourcePath:", templatePath);
      const response = await fetch(templatePath);
      if (!response.ok) {
        throw new Error(`Error loading language file: ${response.statusText}`);
      }
      this.translations = await response.json();
      this.currentLanguage = language;
    } catch (error) {
      console.error("Error loading translations:", error);
    }
  }

  t(key: string, params?: Record<string, any>): string {
    // Dividir la clave por puntos para navegar en la estructura jerárquica
  const keys = key.split('.');
  let result: any = this.translations;
  
  // Navegar a través del objeto de traducciones
  for (const k of keys) {
    if (result && result[k] !== undefined) {
      result = result[k];
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