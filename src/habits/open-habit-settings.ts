// Abre la pantalla de ajustes en la pestaña del plugin (v1.1.15, HV1; ver docs/habit-tracker-agenda/Arquitectura
// técnica.md §10.4). `app.setting` es una API no documentada de Obsidian y no está en `obsidian.d.ts`: se usa con
// un acceso defensivo y quien llama avisa al usuario con la ruta si devuelve `false`.
import type { App } from 'obsidian';

interface ISettingModal {
  open?: () => void;
  openTabById?: (id: string) => unknown;
}

/** `true` si se abrieron los ajustes y se pidió la pestaña del plugin; `false` si la API no existe o falló. */
export function openPluginSettings(app: App, pluginId: string): boolean {
  const setting = (app as unknown as { setting?: ISettingModal }).setting;

  try {
    if (typeof setting?.open !== 'function' || typeof setting.openTabById !== 'function') return false;
    setting.open();
    // La pestaña es la propia del plugin, así que no puede faltar; el valor devuelto no está documentado y solo se
    // toma como fallo un `false` explícito
    return setting.openTabById(pluginId) !== false;
  } catch {
    return false;
  }
}
