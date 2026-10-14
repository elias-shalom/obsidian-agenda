# 2. Installation

## Requirements

- Obsidian v0.13.0 or higher.
- No additional dependencies are required — the plugin is self-contained.

## From Obsidian Community Plugins (recommended)

1. Open **Obsidian Settings**.
2. Go to **Community Plugins** and make sure **Restricted Mode** is turned off.
3. Click **Browse** and search for **"Agenda"**.
4. Click **Install**, then **Enable**.

## Manual installation

Use this method if you want a specific release, or if the plugin isn't available in your Obsidian version's community list yet.

1. Download the latest release from the [releases page](https://github.com/elias-shalom/obsidian-agenda/releases).
2. Extract the downloaded files into your vault's `.obsidian/plugins/obsidian-agenda/` folder.
3. Confirm the folder contains these three files:
   - `main.js`
   - `styles.css`
   - `manifest.json`
4. In Obsidian, go to **Settings → Community Plugins** and enable **Agenda Tasks**.

## Checking your version

The installed version is shown next to the plugin's name in **Settings → Community Plugins**, and corresponds to the `version` field in `manifest.json`. Compare it against the [Changelog](../../../README.md#changelog) in the project README to see what's new.

## Updating

If installed from Community Plugins, Obsidian notifies you when an update is available; update it the same way as any other community plugin. If installed manually, repeat the **Manual installation** steps above with the new release's files, overwriting the old ones.

## Next step

Continue to [3. Getting Started](02-getting-started.md) to open the plugin for the first time.
