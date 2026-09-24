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
│  ├─ habit.ts                # tipos IHabit, IHabitCell, completions (modelo)
│  ├─ habit-parser.ts         # frontmatter -> IHabit (resiliente, migración legacy)
│  ├─ habit-streak.ts         # algoritmo de rachas (portado de HT21)
│  ├─ habit-stats.ts          # agregados área/daytime/rango
│  ├─ habit-completions.ts    # helpers puros de ocurrencias (dayCompleted, toggle, espejo)
│  ├─ habit-writer.ts         # write-back de completions + sync de entries
│  └─ habit-editor.ts         # HabitEditorModal (crear/editar hábitos)
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
  toggleOccurrence(file: TFile, date: string, daytime: Daytime): Promise<void>  // swap en completions + sync entries
  openEditor(habit?: IHabit): void         // abre HabitEditorModal (crear si habit nulo)
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

### 2.4 `habit-completions.ts` + `habit-writer.ts` — ocurrencias y write-back

`habit-completions.ts` (lógica **pura**, testeable):

```
dayCompleted(habit, date): boolean            // todas las daytimes en completions[date]
occurrencesFor(habit, date): IOccurrence[]    // { daytime, done }[] usado por la Vista Rutina (no por la Grid)
toggle(completions, habit, date, daytime)     // swap de ocurrencia; limpia arrays vacíos
dayCompletedDates(completions, habit): string[]  // fechas "día completo" -> espejo entries
```

`habit-writer.ts` (write-back): persiste `completions` y **re-deriva `entries` (espejo HT21)** en una sola `processFrontMatter`:

```ts
async function toggleOccurrence(app: App, file: TFile, h: IHabit, date: string, daytime: Daytime) {
  const completions = toggle(h.completions, h, date, daytime);
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm["completions"] = completions;
    fm["entries"] = dayCompletedDates(completions, h).sort();
  });
}
```

- **Migración legacy**: al primer write de una nota con `entries` y sin `completions`, `toggle()` parte de `completions` sintetizado (fechas → todas las daytimes) y la escritura persiste ambos campos ([[Modelo de datos]] §5.1/5.2).
- `HabitManager.toggleOccurrence(file, date, daytime)` resuelve el `IHabit` del cache, llama a `toggle()` y luego a este writer.

### 2.5 Eventos

- `app.vault.on('create' | 'delete' | 'rename')` → si la ruta está en el path vigilado, invalidar cache y notificar.
- `app.vault.on('modify')` → invalidar solo ese habit; las vistas recargan.
- Timer de medianoche: `setTimeout` al próximo `00:00:00` local (con re-agendado), emite refresco (el grid debe mostrar "hoy" actualizado).
- Evento de refresco global para settings: `document.dispatchEvent(new CustomEvent('obsidian-agenda:habits-refresh'))`.
- **Limpieza**: `offref` de todos los handlers en `onunload` / `onClose` (ver patrón en `HabitTracker.svelte.onDestroy` y `mejores-practicas.md` § "Gestión del Ciclo de Vida").

### 2.6 Normalización (`habit-parser.ts`)

- **`area`**: ya **no se normaliza ni valida** contra un enum. `parseHabit` toma `String(fm.area ?? '').trim() || 'temporal'` tal cual; cualquier string es válido (revisado, ver ADR-004 en [[Modelo de datos]]).
- `frequencyToSet(fm.frequency): Set<number>` — `everyday→{1..7}`, `workweek→{1..5}`, `weekend→{6,7}`, lista de nombres→números; tokens inválidos dentro de una lista se ignoran; lista vacía o campo ausente → `{1..7}` (ver ADR-005).
- `clampPriority(fm.priority): number` — `parseInt` + clamp `1..5`; `NaN` → `3`.
- `relatedFile` se lee como string opcional (por defecto `""`); reemplaza a `subArea` (eliminado) — guarda un wikilink/link inline a una nota de apoyo, resuelto vía `HabitManager.resolveRelatedFile()` (ver §2.4-bis en [[Modelo de datos]]).
- `parseCompletions(fm.completions, daytimes): ICompletions` — objeto → mapa validado (claves ISO, valores filtrados contra `daytimes`, sin duplicados); si es inválido → `{}`. **Fallback legacy**: si no hay `completions` pero sí `entries`, sintetiza `{ [date]: [...daytimes] }` (migración, §2.4).
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

### 3.3 Modal Habit Editor (crear/editar)

`src/habits/habit-editor.ts` exporta `HabitEditorModal extends obsidian.Modal` (no es una vista; se monta sobre el workspace):

- API: `new HabitEditorModal(plugin, habitManager, i18n, habit?: IHabit).open()`.
- Formulario: name, description, time (dial circular), area (dropdown **poblado dinámicamente** con `HabitManager.getVaultRootFolders()` + áreas ya usadas — ya no es un enum fijo de 10, ver ADR-004 en [[Modelo de datos]]), relatedFile (picker de archivo con autocompletado, idéntico al del modal de tareas — guarda un wikilink, ver §2.4-bis en [[Modelo de datos]]), frequency (select/lista), priority (slider 1–5), daytime (multi-check), status (switch), maxGap (slider 0–14), color (picker, default = `--interactive-accent` del tema) — spec en [[Especificación de vistas]] §9.
- **Crear** → `app.vault.create` de `name.md` en `habitFolderPath` con el frontmatter (incluye `area` como string libre; plantilla `habit.md` en el cuerpo **pendiente**, no implementada).
- **Editar** → `processFrontMatter` preservando `completions`/`entries`; si cambia el basename → `app.fileManager.renameFile`. Elegir un área distinta **solo** reescribe `frontmatter.area`, no mueve el archivo de carpeta.
- Validación: unicidad de nombre en la ruta, clamps numéricos, confirmación de borrado.
- Al guardar → emite `obsidian-agenda:habits-refresh`.
- Disparadores: comandos (`oa-habit-new`, `oa-habit-edit`), botón `+` del header de hábitos, doble-clic en la Lista.

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
habit_priority / habit_frequency / habit_related_file / habit_habits_total
habit_completed_today_weighted / habit_pct_weighted        // "Cumplimiento (ponderado)"
habit_area_daily_plan / habit_area_emotional / habit_area_financial / habit_area_intellectual
habit_area_physical / habit_area_professional / habit_area_recreational / habit_area_relationship
habit_area_spiritual / habit_area_temporal                 // etiquetas de las 10 áreas "conocidas"
                                                             // (getAreaLabel usa el valor crudo como fallback
                                                             // para cualquier otra área que no tenga clave)
habit_freq_everyday / habit_freq_workweek / habit_freq_weekend
habit_freq_monday / habit_freq_tuesday / habit_freq_wednesday / habit_freq_thursday
habit_freq_friday / habit_freq_saturday / habit_freq_sunday
habit_freq_custom
habit_not_scheduled_today / habit_unscheduled               // "no programado" / atenuado
habit_new_habit / habit_edit_habit / habit_save / habit_cancel / habit_delete
habit_field_name / habit_field_description / habit_field_time
habit_field_area / habit_field_related_file / habit_field_frequency / habit_field_priority
habit_field_daytime / habit_field_status / habit_field_max_gap / habit_field_color
habit_time_unit_minutes
habit_name_required / habit_name_exists / habit_daytime_required / habit_created / habit_updated
habit_delete_confirm / habit_status_active / habit_status_inactive
habit_sort_alphabetical / habit_sort_area / habit_sort_daytime / habit_sort_priority
habit_sort_streak / habit_sort_pct                          // opciones del combobox de orden
                                                             // (presente en Grid, Weekly y Routine)
habit_year_heatmap_title                                    // título del heatmap anual del Dashboard
open_file / edit_task / edit_file                           // botones "abrir nota" / "editar hábito"
```

Regla: ninguna cadena visible hardcodeada; todo vía `i18n.t(key)` (helper `{{t "key"}}` en Handlebars). El campo `habit_field_title` fue **eliminado** (se quitó el campo "Título/etiqueta" del editor por ser redundante con `name`).

## 6. Estilos (SCSS)

- Nuevos archivos en `src/styles/views/`, importados en `styles.scss`:
  - `_habit-grid.scss`     → `.oa-habit-grid` (columnas `--date-columns`, filas por ocurrencia, celdas fusionadas en píldora `--run-*`).
  - `_habit-form.scss`     → `.oa-habit-form` (modal Habit Editor: grid de campos, validación inline).
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

// comandos Habit Creator (modal, §3.3)
this.addCommand({ id: "oa-habit-new", name: this.i18n.t("habit_new_habit"),
  callback: () => this.habitManager.openEditor() });
this.addCommand({ id: "oa-habit-edit", name: this.i18n.t("habit_edit_habit"),
  callback: () => { const habit = /* hábito activo/del foco */; if (habit) this.habitManager.openEditor(habit); } });
```

## 8. Manejo de errores y estados

- Ruta inexistente → la vista muestra `habit_no_habits_at '{habitFolderPath}'` (patrón `fatalError` de HT21).
- Frontmatter corrupto → se omite el hábito con log `console.warn` (debug).
- Campo `area`/`frequency`/`priority` inválido → normalización silenciosa a defaults (`temporal` / `everyday` / `3`), ver §2.6 y [[Modelo de datos]] §7.
- Sin hábitos → estado vacío con instrucción: crear nota en la ruta, usar el **Habit Creator** (`+`/comando) o ir a [[habit gen]].
- Errores de escritura (readonly, sync pendiente) → `Notice` con mensaje i18n.
- Errores de edición (nombre duplicado/ilegal, nota readonly) → validación inline del modal + `Notice` i18n (§3.3).

## 9. Checklist de integración

- [ ] `src/habits/*` compila sin dependencias nuevas (solo `obsidian` + `luxon` ya presentes).
- [ ] Vistas registradas y exportadas; `TEMPLATE_LOADERS` actualizado.
- [ ] Tabs renderizan y navegación entre vistas funciona (incluye `activateView`).
- [ ] Comandos "Nuevo/Editar hábito" registrados y botón `+` en el header de hábitos.
- [ ] Modal Habit Editor crea/edita notas sin romper `completions`/`entries` (migración legacy incluida).
- [x] Grid multi-daytime resuelto con **una fila por ocurrencia** (sin popover).
- [ ] i18n completo en 6 idiomas (sin warnings de key).
- [ ] SCSS importado; namespace `oa-habit-`.
- [ ] `npm run build` y `npm run lint` en verde.
- [ ] Limpieza de listeners en `onunload`/`onClose`.