# 2. Instalación

## Requisitos

- Obsidian v0.13.0 o superior.
- No se requieren dependencias adicionales — el plugin es autocontenido.

## Desde los plugins de comunidad de Obsidian (recomendado)

1. Abre **Configuración de Obsidian**.
2. Ve a **Plugins de la comunidad** y asegúrate de que el **modo restringido** esté desactivado.
3. Haz clic en **Explorar** y busca **"Agenda"**.
4. Haz clic en **Instalar** y luego en **Activar**.

## Instalación manual

Usa este método si quieres una versión específica, o si el plugin todavía no está disponible en el listado de la comunidad para tu versión de Obsidian.

1. Descarga la última versión desde la [página de releases](https://github.com/elias-shalom/obsidian-agenda/releases).
2. Extrae los archivos descargados en la carpeta `.obsidian/plugins/obsidian-agenda/` de tu bóveda.
3. Confirma que la carpeta contiene estos tres archivos:
   - `main.js`
   - `styles.css`
   - `manifest.json`
4. En Obsidian, ve a **Configuración → Plugins de la comunidad** y activa **Agenda Tasks**.

## Verificar tu versión

La versión instalada se muestra junto al nombre del plugin en **Configuración → Plugins de la comunidad**, y corresponde al campo `version` de `manifest.json`. Compárala con el [Changelog](../../../README.md#changelog) del README del proyecto para ver las novedades.

## Actualizar

Si lo instalaste desde los plugins de la comunidad, Obsidian te avisa cuando hay una actualización disponible; actualízalo igual que cualquier otro plugin de la comunidad. Si lo instalaste manualmente, repite los pasos de **Instalación manual** con los archivos de la nueva versión, sobrescribiendo los anteriores.

## Siguiente paso

Continúa con [3. Primeros pasos](02-getting-started.md) para abrir el plugin por primera vez.
