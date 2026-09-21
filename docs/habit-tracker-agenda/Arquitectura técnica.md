---
name: "Arquitectura técnica - Habit Tracker Agenda"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: daily-routine
archetype: engineer
status: active
related:
  - "[[README]]"
  - "[[Modelo de datos]]"
  - "[[PRD - Módulo Habit Tracker]]"
created: 2026-09-21
tags:
  - obsidian-agenda
  - documentation
  - architecture
---

# Arquitectura técnica — Módulo Habit Tracker en obsidian-agenda

> Readme previo del stack del plugin (patrones existentes), requisito de lectura: `C:\Code\obsidian\obsidian-agenda\docs\mejores-practicas.md` y `src/views/base-view.ts`.

## 1. Visión general

Se agrega un módulo autocontenido `src/habits/` (data layer + engine de stats) y **5 vistas** que siguen el patrón de vistas existente (clase `BaseView` + template Handlebars `.hbs` + registro en `ViewManager` + tab en `header.hbs` + SCSS `_habit-*.scss`).

```
src/
├─ habits/
│  ├─ habit-manager.ts        # carga, cache, eventos de refresco
│  ├─ habit.ts                # tipos IHabit, IHabitCell, stats (modelo)
│  ├─ habit-parser.ts         # frontmatter -> IHabit (resiliente)
│  ├─ habit-streak.ts         # algoritmo de rachas (portado de HT21)
│  ├─ habit-stats.ts          # agregados área/daytime/rango
│  └─ habit-writer.ts         # toggle de entries (write-back)
├─ views/
│  ├─ habit-grid-view.ts      # Vista Grid (HT21)  + habit-grid-view.hbs
│  ├─ habit-routine-view.ts   # Rutina diaria      + habit-routine-view.hbs
│  ├─ habit-overview-view.ts  # Dashboard          + habit-overview-view.hbs
│  ├─ habit-weekly-view.ts    # Semanal            + habit-weekly-view.hbs
│  └─ habit-table-view.ts     # Lista/Tabla        + habit-table-view.hbs
└─ styles/views/_habit-grid.scss (…)
```

## 2. Data layer: `src/habits/`

### 2.1 `HabitManager`

```ts
export class HabitManager {
  constructor(private app: App, private settings: () => AgendaPluginSettings) {}

  getHabits(): IHabit[]                    // lista activa desde habitFolderPath
  getHabit(file: TFile): IHabit | null
  toggle(date: string): Promise<void>      // togglea en el hábito que corresponda
  computeDashboard(): HabitDashboardData
  // internos: watchPath, onVaultCreate/Delete/Rename/Modify
}
```

- Resolución de ruta (igual que HT21): admite carpeta, archivo, o `ruta.md`; los `.md` directos de la carpeta ordenados alfabéticamente; filtro: ignorar subcarpetas.
- Filtro de hábitos activos: `status === 'active'` OR sin `status` (defecto activo).
- **Cache**: map `path -> { habit, hashFm }` invalidado por eventos de vault (create/modify/delete/rename dentro de `habitFolderPath`).
- Reusar lo más posible `metadataCache.getFileCache(file)?.frontmatter`; relectura con `vault.read` + `parseYaml` cuando el evento `modify` exija.

### 2.2 `HabitManager.getHabits()` — algoritmo

```
source = app.vault.getAbstractFileByPath(path)
si es TFolder  -> files = children.filter(instanceof TFile); sort(by basename)
si es TFile    -> [source]
si null        -> probar path+".md"
si sigue null  -> []  (la vista muestra error)
```

### 2.3 `habit-streak.ts` — motor de rachas

Portar la lógica del bloque `renderedDates` de `Habit.svelte` de HT21 a TS puro (sin Svelte), **extendida con `frequency`**:

- `computeCells(habit, dates, maxGap, showStreaks): IHabitCell[]`
  - Por cada fecha: `scheduled = isScheduled(habit, date)`; si no → celda neutral (`scheduled:false`, no rompe racha).
  - Pass 1 marcar `ticked/gap` (hueco solo entre entries consecutivos con separación ≤ maxGap+1, sobre días programados).
  - Pass 2 límites de corrida + `streakCount` (camino regresivo desde último tick; corta cuando `gapDays > maxGap`), **saltando días no programados**.
  - Pass 3 `deadline` fantasma (`lastEntry + (maxGap+1)`), relativo a hoy.
- `computeStats(habit): IHabitStreakStats` — racha actual (sobre todo el historial) y máxima.
- Trabajar siempre con filas de inicio de día local (`luxon DateTime.fromISO(date, { zone: 'local' })`), formatear `yyyy-MM-dd`; `isScheduled` usa `date.weekday` (ISO 1=Lunes).

Recomendación: extraer `differenceInCalendarDays` con luxon: `b.startOf('day').diff(a.startOf('day'), 'days').days`.

### 2.4 `habit-writer.ts` — toggle

```ts
async function toggleEntry(app: App, file: TFile, date: string, entries: Set<string>): Promise<void> {
  const next = new Set(entries);
  next.has(date) ? next.delete(date) : next.add(date);
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm["entries"] = [...next].sort();
  });
}
```

### 2.5 Eventos

- `app.vault.on('create' | 'delete' | 'rename')` → si la ruta está en el path vigilado, invalidar cache y notificar.
- `app.vault.on('modify')` → invalidar solo ese habit; las vistas recargan.
- Timer de medianoche: `setTimeout` al próximo `00:00:00` local (con re-agendado), emite refresco (el grid debe mostrar "hoy" actualizado).
- Evento de refresco global para settings: `document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'))`.
- **Limpieza**: `offref` de todos los handlers en `onunload` / `onClose` (ver patrón en `HabitTracker.svelte.onDestroy` y `mejores-practicas.md` § "Gestión del Ciclo de Vida").

### 2.6 Normalización (`habit-parser.ts`)

- `slugifyArea(raw): HabitArea` — `toLowerCase`, espacios→`-`, alias (`intelectual`→`intellectual`); validar contra `HABIT_AREAS`; fallback `temporal` + `console.warn`.
- `frequencyToSet(fm.frequency): Set<number>` — `everyday→{1..7}`, `workweek→{1..5}`, `weekend→{6,7}`, lista de nombres→números; tokens inválidos dentro de una lista se ignoran; lista vacía o campo ausente → `{1..7}` (ver ADR-005).
- `clampPriority(fm.priority): number` — `parseInt` + clamp `1..5`; `NaN` → `3`.
- `subArea` se lee como string opcional (por defecto `""`).
- Todas las funciones devuelven valores validados; nunca lanzan (resiliencia §8).

## 3. Fábrica de vistas (patrón existente)

### 3.1 Paso a paso por vista nueva

1. **Clase** `export class HabitGridView extends BaseView` en `src/views/habit-grid-view.ts`:
   - `export const HABIT_GRID_VIEW_TYPE = 'habit-grid-view';`
   - `getViewType()`, `getDisplayText()` (usa `i18n.t`), `getIcon()` (propuesta: `'list-checks'`).
   - `async onOpen()`: `showLoadingOverlay()`, cargar `habitManager.getHabits()`, construir `data`, `await this.render(TYPE, data, i18n, plugin, this.leaf)`.
   - `setupViewSpecificEventListeners(container, data)`: clics de celda, doble-clic en nombre, drag horizontal, tooltips.
   - Sobrescribir `registerViewSpecificHelpers` si se requieren helpers Handlebars (`formatDate` ya existe).
2. **Template** `src/views/templates/habit-grid-view.hbs` (Handlebars) con el HTML de la grid.
3. **Registro en `TEMPLATE_LOADERS`** de `base-view.ts`:
   ```ts
   "habit-grid-view": () => import("./templates/habit-grid-view.hbs"),
   ```
4. **Export en `src/views/index.ts`**:
   `export { HabitGridView, HABIT_GRID_VIEW_TYPE } from './habit-grid-view';`
5. **Registro en `ViewManager.registerViews()`**:
   ```ts
   this.plugin.registerView(HABIT_GRID_VIEW_TYPE, (leaf) =>
     new HabitGridView(leaf, this.plugin as AgendaPlugin, this.i18n, this.taskManager, this.habitManager));
   ```
   > `ViewManager` recibe `HabitManager` en su constructor (creado en `main.ts`).
6. **Tab en `header.hbs`** con guard `{{#if settings.showHabitGridTab}}` e item en `attachEventTabs` de `base-view.ts`:
   ```ts
   { id: "oa-habit-grid-view-tab", view: "habit-grid-view" },
   ```
7. **Icono de pestaña**: SVG `<svg>` lucide inline, igual que pestañas actuales (p. ej. `lucide-calendar-check-2` para grid, `lucide-sun` para rutina, `lucide-chart-column` para dashboard, `lucide-calendar-range` para semanal, `lucide-table` para tabla).
8. **Ribbon + comando** opcional en `main.ts` (patrón `activateView` y `addCommand`).

### 3.2 Constantes de vista

| Vista | TYPE | Tab (id) | Icon sug. |
|---|---|---|---|
| Grid HT21 | `habit-grid-view` | `oa-habit-grid-view-tab` | `list-checks` / `calendar-check-2` |
| Rutina diaria | `habit-routine-view` | `oa-habit-routine-view-tab` | `sun` / `sunrise` |
| Dashboard | `habit-overview-view` | `oa-habit-overview-view-tab` | `chart-column` |
| Semanal | `habit-weekly-view` | `oa-habit-weekly-view-tab` | `calendar-range` |
| Lista/Tabla | `habit-table-view` | `oa-habit-table-view-tab` | `table` |

## 4. Configuración (`settings`)

En `src/settings/settings.ts` (y defaults):

```ts
export interface AgendaPluginSettings {
  // ...existentes
  habitFolderPath: string;         // "daily plan/daily routine/habit"
  habitDaysToShow: number;         // 21
  habitShowStreaks: boolean;       // true
  habitDefaultMaxGap: number;      // 0
  habitDefaultPriority: number;    // 3  (si la nota no trae priority)
  habitDefaultColor: string;       // ""
  showHabitGridTab: boolean;       // true
  showHabitDashboardTab: boolean;  // true
  showHabitRoutineTab: boolean;    // true
  showHabitWeeklyTab: boolean;     // true
  showHabitListTab: boolean;       // true
}
```

- `loadSettings`/`saveSettings` se extienden siguiendo el patrón actual de validación `typeof data.X === "boolean"` por campo.
- **SettingTab**: nueva sección "Hábitos" con:
  - `Text` para `habitFolderPath` (con hint del default).
  - `Slider` para `habitDaysToShow` (7–90).
  - `Toggle` para `habitShowStreaks`.
  - `Slider` para `habitDefaultMaxGap` (0–30).
  - `Slider` para `habitDefaultPriority` (1–5).
  - `Text` color para `habitDefaultColor`.
  - Toggles de visibilidad por pestaña de hábitos.
  - Botón "Refrescar" → emite `obsidian-agenda:habits-refresh`.

## 5. i18n

Agregar en los 6 locales (`en.json`, `es.json`, `de.json`, `fr.json`, `it.json`, `pt.json`):

```
habit_grid_tab / habit_grid_title / habit_dashboard_tab / habit_dashboard_title
habit_routine_tab / habit_routine_title / habit_weekly_tab / habit_weekly_title
habit_list_tab / habit_list_title
habit_no_habits / habit_no_habits_at / habit_today / habit_streak
habit_streak_deadline_tooltip / habit_days_to_show / habit_folder_path
habit_show_streaks / habit_max_gap / habit_tab_visibility / habit_area / habit_daytime
habit_completed_today / habit_current_streak / habit_best_streak / habit_by_area / habit_by_daytime
habit_priority / habit_frequency / habit_sub_area / habit_habits_total
habit_completed_today_weighted / habit_pct_weighted        // "Cumplimiento (ponderado)"
habit_area_daily_plan / habit_area_emotional / habit_area_financial / habit_area_intellectual
habit_area_physical / habit_area_professional / habit_area_recreational / habit_area_relationship
habit_area_spiritual / habit_area_temporal                 // etiquetas de las 10 áreas
habit_freq_everyday / habit_freq_workweek / habit_freq_weekend
habit_freq_monday / habit_freq_tuesday / habit_freq_wednesday / habit_freq_thursday
habit_freq_friday / habit_freq_saturday / habit_freq_sunday
habit_not_scheduled_today / habit_unscheduled               // "no programado" / atenuado
```

Regla: ninguna cadena visible hardcodeada; todo vía `i18n.t(key)` (helper `{{t "key"}}` en Handlebars).

## 6. Estilos (SCSS)

- Nuevos archivos en `src/styles/views/`, importados en `styles.scss`:
  - `_habit-grid.scss`     → `.oa-habit-grid` (columnas `--date-columns`, celdas `--habit-bg-ticked`).
  - `_habit-routine.scss`  → `.oa-habit-routine` (tablas por daytime/área + barras de progreso).
  - `_habit-overview.scss` → `.oa-habit-overview` (widgets tipo dashboard, reutiliza `.oa-stat-card`).
  - `_habit-weekly.scss`   → `.oa-habit-weekly`.
  - `_habit-table.scss`    → `.oa-habit-table`.
- Namespace de clases **prefijo `oa-habit-`** para aislar estilos (mejores-practicas § Encapsulación).
- Variables de tema: colores de éxito/checkbox heredados de `--checkbox-color` / `--interactive-accent`; usar `color-mix()` para estados suaves; respetar `prefers-reduced-motion`.
- Celdas della grid: ancho fijo (p. ej. `clamp(14px, 3vw, 22px)`), fila con scroll horizontal, primera columna "sticky".
- **Estado `--oa-unscheduled`**: celda de día no programado (gris del tema, `opacity` baja, `cursor: default`). **Badge de prioridad**: `.oa-habit-priority[data-lvl="1..5"]` (color por nivel).

## 7. App wiring (`main.ts`)

```ts
this.habitManager = new HabitManager(app, () => this.settings);

// en ViewManager
this.viewManager = new ViewManager(this, this.i18n, this.taskManager, this.habitManager);

this.viewManager.registerViews();

// limpieza en onunload
this.habitManager.cleanup();
```

## 8. Manejo de errores y estados

- Ruta inexistente → la vista muestra `habit_no_habits_at '{habitFolderPath}'` (patrón `fatalError` de HT21).
- Frontmatter corrupto → se omite el hábito con log `console.warn` (debug).
- Campo `area`/`frequency`/`priority` inválido → normalización silenciosa a defaults (`temporal` / `everyday` / `3`), ver §2.6 y [[Modelo de datos]] §7.
- Sin hábitos → estado vacío con instrucción: crear nota en la ruta o ir a [[habit gen]].
- Errores de escritura (readonly, sync pendiente) → `Notice` con mensaje i18n.

## 9. Checklist de integración

- [ ] `src/habits/*` compila sin dependencias nuevas (solo `obsidian` + `luxon` ya presentes).
- [ ] Vistas registradas y exportadas; `TEMPLATE_LOADERS` actualizado.
- [ ] Tabs renderizan y navedición entre vistas funciona (incluye `activateView`).
- [ ] i18n completo en 6 idiomas (sin warnings de key).
- [ ] SCSS importado; namespace `oa-habit-`.
- [ ] `npm run build` y `npm run lint` en verde.
- [ ] Limpieza de listeners en `onunload`/`onClose`.