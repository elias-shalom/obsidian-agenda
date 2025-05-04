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

  t(key: string): string {
    return this.translations[key] || key;
  }
}