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
- **Carga inicial (fix 2026-09-29)**: `HabitManager` registra listeners en el constructor, pero difiere el primer `refreshCache()` hasta que una vista llama `waitForInitialCache()`. Esto es intencional: `HabitManager` se instancia en el constructor del plugin, mientras que `main.onload()` carga los settings guardados después. Iniciar el escaneo en el constructor podía consultar la ruta por defecto antes de conocer el `habitFolderPath` real. `HabitView.onOpen()` muestra el loading overlay, registra el listener de refresco, espera `waitForInitialCache()` y solo entonces lee `getHabits()`/`getAllHabits()` y renderiza. Así se evita mostrar cero hábitos o una carga parcial durante arranques/actualizaciones.

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
- `related` se lee como lista opcional (por defecto `[]`) — guarda múltiples wikilinks/links inline a notas de apoyo, resueltos por `HabitManager.resolveRelatedFile()` usando el primero (ver §2.4-bis en [[Modelo de datos]]).
- `parseCompletions(fm.completions, daytimes): ICompletions` — objeto → mapa validado (claves ISO, valores filtrados contra `daytimes`, sin duplicados); si es inválido → `{}`. **Fallback legacy**: si no hay `completions` pero sí `entries`, sintetiza `{ [date]: [...daytimes] }` (migración, §2.4).
- Todas las funciones devuelven valores validados; nunca lanzan (resiliencia §8).

## 3. Fábrica de vistas (patrón existente)

### 3.1 Paso a paso por vista nueva

1. **Clase** `export class HabitGridView extends BaseView` en `src/views/habit-grid-view.ts`:
   - `export const HABIT_GRID_VIEW_TYPE = 'habit-grid-view';`
   - `getViewType()`, `getDisplayText()` (usa `i18n.t`), `getIcon()` (propuesta: `'list-checks'`).
  - `async onOpen()`: `showLoadingOverlay()`, registrar listener `habits-refresh`, `await habitManager.waitForInitialCache()`, cargar `habitManager.getHabits()`, construir `data`, `await this.render(TYPE, data, i18n, plugin, this.leaf)`.
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
- **Editar** → `vault.process` lee y parsea el frontmatter YAML con `parseYaml`, actualiza los campos y escribe una única estructura `---...---` preservando `completions`/`entries`; si cambia el basename → `app.fileManager.renameFile`. Elegir un área distinta **solo** reescribe `frontmatter.area`, no mueve el archivo de carpeta.

**Corrección de frontmatter duplicado (2026-09-28)**: el flujo anterior ejecutaba primero `processFrontMatter` y después `vault.process` para actualizar la descripción. Esa doble escritura podía dejar un segundo bloque YAML como contenido del cuerpo, especialmente cuando el archivo ya estaba desincronizado con el `metadataCache`. La implementación actual hace una sola escritura con `vault.process`, reconstruye el frontmatter desde el YAML leído y reemplaza la descripción; al editar también normaliza hábitos que ya tenían bloques frontmatter duplicados.
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
  habitShowSingleDaytimeLabel: boolean; // true; muestra el daytime en Grid/Weekly si el hábito tiene uno solo
  // El orden seleccionado en Grid y Weekly se persiste por vista en localStorage, no como plugin setting.
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
  - `Toggle` para `habitShowSingleDaytimeLabel` (default `true`); al cambiarlo emite `obsidian-agenda:habits-refresh` para actualizar Grid/Weekly abiertas.
  - `Slider` para `habitDefaultMaxGap` (0–30).
  - `Slider` para `habitDefaultPriority` (1–5).
  - `Text` color para `habitDefaultColor`.
  - Toggles de visibilidad por pestaña de hábitos.
  - Botón "Refrescar" → emite `obsidian-agenda:habits-refresh`.

> **Ampliación v1.1.15 (diseño)**: ajuste `habitVacations` (lista de periodos de vacaciones) con su sección «Vacaciones» y el ajuste de días no laborables que comparten calendario, Gantt y frecuencias de hábitos; ver §10.3 y §10.6.

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
- **v1.1.13 (diseño)**: las cinco vistas muestran ese mensaje (hoy Rutina y Dashboard no); al guardar un hábito nuevo se pregunta por la carpeta y se crea; Ajustes avisa si la ruta no existe (ver `agenda-tasks/Arquitectura técnica.md` §25).
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

## 10. Periodo activo, vacaciones, selector circular y frecuencias con días no laborables (v1.1.15 — HA1, HV1 y HU1 implementadas el 2026-11-09 y frecuencias (NL2) el 2026-11-08)

Decidido el 2026-11-02 (hábitos en el calendario y widgets del Dashboard, en §10.7 y §10.8). Comportamiento en [[Especificación de vistas]] §11–§14; datos en [[Modelo de datos]] §8; fases HA1, HV1 y HU1 en [[Plan de implementación]]. Lo ya implementado (HA1, HV1, HU1 y NL2) se describe como es; los hábitos en el calendario y los widgets siguen siendo **diseño**, y los archivos y funciones marcados «por crear» son propuestas.

### 10.1 Archivos

| Archivo | Cambio |
|---|---|
| `src/habits/habit-calendar.ts` | Funciones puras, sin importar `obsidian`: `parseActiveDate()`, `isInPeriod()`, `isActiveOn()`, `isValidPeriod()`, `activeUntilForStatus()` (HA1), y `sanitizeVacations()`, `findVacation()`, `countsOn()` con los tipos `IHabitVacation`/`IHabitCalcContext` y `NO_VACATIONS` (HV1; [[Modelo de datos]] §8.2–§8.5). Es el único sitio con la regla; así se prueba con `node --test`. |
| `src/habits/open-habit-settings.ts` | `openPluginSettings(app, pluginId)`: acceso defensivo a `app.setting` (§10.4). |
| `src/habits/habit.ts` | `IHabit` gana `activeFrom`/`activeUntil`; `IHabitCell` gana `vacation`, `vacationName` y `markable`, e `IHabitDayStat` gana `vacation` y `vacationName`. `isScheduled()` se conserva (significa «toca ese día de la semana»). |
| `src/habits/habit-parser.ts` | Lee `from`/`until` (solo `AAAA-MM-DD`); `normalizeFrequencySet()` recibe los días no laborables y resuelve `weekend`/`workweek` con ellos (§10.6). |
| `src/habits/habit-manager.ts` | Nuevo `getHabitsForStats()` (activos + inactivos con `until`) y `getCalcContext()` (lee `habitVacations` de los ajustes). `getHabits()` no cambia. `computeDashboard()` usa ambos. |
| `src/habits/habit-streak.ts` | `computeCells`, `computeStats`, `computeOccurrenceCells`, `computeOccurrenceStats`, `isRunContinuous` e `isOccurrenceRunContinuous` reciben el contexto (parámetro opcional, por defecto sin vacaciones) y usan `countsOn()` donde hoy usan `isScheduled()` para decidir si un día cuenta. |
| `src/habits/habit-stats.ts` | `computeAreaStats`, `computeDaytimeStats`, `computeHistory30d`, `computeYearHistory` y `computeDashboard` usan `countsOn()` en el denominador y rellenan `vacation` en `IHabitDayStat`. |
| `src/habits/habit-editor.ts` | Dos `<input type="date">` (`from`, `until`) con botón de vaciar; el switch de `status` autocompleta/borra `until`; `FREQUENCY_PRESETS` y `resolveFrequencyMode()` salen de los días no laborables; escribe `from`/`until` en `createHabit()` y `updateHabit()` (y los borra si están vacíos). |
| `src/habits/habit-writer.ts` | **Sin cambios**: el toggle sigue escribiendo solo `completions` y `entries`; el cálculo decide después qué cuenta. |
| `src/views/habit-view.ts` | El `change` del `<select>` pasó a clic sobre los botones circulares (HU1, con `HABIT_VIEW_BUTTON_ICONS` de `src/habits/habit-view-icons.ts`); el botón «Vacaciones» (§10.4) (HV1), junto con `calcContext` y `vacationLabel()` para las vistas. |
| `src/views/templates/habit-{grid,overview,routine,weekly,table}-view.hbs` | El `<select id="oa-habit-view-dropdown">` se reemplazó por el grupo de botones (§10.5, HU1); el botón «Vacaciones» (🌴) está en las cinco (HV1). Grid y Weekly: clase `--vacation`, `title` con el nombre y `disabled` según `markable`; Overview: celdas del heatmap con `--vacation` y `tooltip`. |
| `src/views/habit-grid-view.ts`, `habit-weekly-view.ts`, `habit-routine-view.ts`, `habit-table-view.ts`, `habit-overview-view.ts` | Pasan el contexto de vacaciones a celdas, rachas y porcentajes; la Rutina deja en la lista los hábitos de un día de vacaciones pero solo cuenta (`counted`) los marcados. |
| `src/settings/settings.ts`, `setting-tab.ts` y `src/main.ts` | Ajuste `habitVacations` (cargado con `sanitizeVacations()`), su grupo con `render:` propio (§10.3) y `openHabitSettings()`. |
| `src/styles/_habit-common.scss`, `_habit-grid.scss`, `_habit-weekly.scss`, `_habit-overview.scss`, `components/_settings.scss` | Estado `--vacation` (atenuado + icono en celdas, rayas en el heatmap), botón «Vacaciones» y fila de la lista de vacaciones; el selector circular reutiliza `_calendar-common.scss` sin estilos nuevos. |
| `src/locales/*.json` (6 locales) | Claves nuevas (§10.9). |
| `tests/habit-*.test.cjs` | **Por crear** (§10.10). |

### 10.2 Periodo activo

1. **Parser**: `parseHabit()` añade `activeFrom`/`activeUntil` = `fm.from`/`fm.until` si son cadenas `AAAA-MM-DD` válidas (también la fecha real, `DateTime.isValid`); si no, `null`. Sin fechas y con `status` activo, nada cambia.
2. **Manager**: `getHabits()` (filas de Grid, Semanal, Rutina y Dashboard «hoy») sigue filtrando por `status`. `getHabitsForStats()` devuelve además los inactivos con `until`, para que los porcentajes de días pasados no cambien al desactivar un hábito (ADR-DM1 de [[Modelo de datos]]). `getAllHabits()` (Lista) no cambia.
3. **Cálculo**: cada función de `habit-stats.ts` y `habit-streak.ts` filtra por `isActiveOn(habit, iso)` dentro de `countsOn()`; los días fuera del periodo son neutrales, igual que los no programados.
4. **Editor**: al **apagar** el switch de `status` se rellena el selector `until` con la fecha de hoy; al **encender** se vacía `until` (y se conserva `from`). El guardado valida `from ≤ until` con mensaje inline (`habit_period_invalid`). `updateHabit()` ya reconstruye un solo bloque YAML con `vault.process` (§3.3): se añaden `fm.from`/`fm.until` o `delete` si están vacíos; `completions` y `entries` no se tocan.
5. **Refresco**: sin eventos nuevos; el guardado ya llama a `refreshHabits()` y emite `obsidian-agenda:habits-refresh`.

> **ADR-AR1 — La regla vive en `habit-calendar.ts` y no en cada función de cálculo**: `countsOn()` es el único lugar que decide si un día cuenta (programado, activo, vacaciones). Racional: hoy `isScheduled()` se repite en 11 funciones de `habit-streak.ts` y `habit-stats.ts`; añadir dos reglas en cada una las haría divergir. Consecuencia: el parámetro de contexto se propaga a todas.

**Implementado el 2026-11-09 (Fase HA1)**:
- **`habit-calendar.ts`** (puro): `parseActiveDate()` (cadena `AAAA-MM-DD` o `Date` de YAML, con fecha real de calendario; si no, `null`), `isInPeriod()` (extremos inclusivos; uno ausente no limita), `isActiveOn()` (la regla de §8.3 del Modelo de datos con el `status`), `countsOn()` (toca por la frecuencia **y** cae en el periodo), `isValidPeriod()` y `activeUntilForStatus()` (la regla del switch del editor).
- **`countsOn()` no mira `status`** a propósito: quien arma la lista decide qué hábitos entran (`getHabits()` los activos, `getHabitsForStats()` también los desactivados con `until`, la Tabla todos). Si lo mirara, los hábitos inactivos de la Tabla perderían su racha y su `% 30 d`. `isActiveOn()` queda para los consumidores que sí necesitan el estado (HC1).
- **Sustituciones**: las funciones de `habit-streak.ts` (celdas, racha, continuidad) y `habit-stats.ts` (por área, por daytime, 30 días, año, hoy) usan `countsOn()` donde usaban `isScheduled()`; también la lista del día de la Rutina y el `% 30 d` de la Tabla. En las celdas, `scheduled` pasa a significar «cuenta»: un día fuera del periodo se ve como no programado (`--oa-unscheduled`), y una marca guardada fuera del periodo no cuenta.
- **`getHabitsForStats()`** (`HabitManager`) y **`computeDashboard(habits, statsHabits = habits)`**: los porcentajes (hoy, por área y daytime, 30 días) salen de `statsHabits`; las rachas y `totalHabits`, de `habits` (solo los activos, así la racha de un hábito desactivado hace meses no entra en la «actual»). El heatmap anual de la vista Dashboard usa `getHabitsForStats()`.
- **Habit Creator**: dos `<input type="date">` con botón de vaciar (`data-clear-for`); el `change` del switch de estado pone `until` = hoy al desactivar (un `until` ya anterior a hoy se respeta, uno futuro pasa a hoy) y lo vacía al reactivar; el guardado valida `from ≤ until` (`habit_period_invalid`) y escribe o borra `from`/`until` en `createHabit()` y `updateHabit()` sin tocar `completions` ni `entries`.
- **Limitación asumida**: la Rutina, el Grid y el Semanal siguen mostrando solo hábitos activos, así que el porcentaje de una fecha pasada **en la Rutina** (que sale de sus filas) sí cambia al desactivar un hábito; el historial estable es el del Dashboard y el heatmap.

### 10.3 Vacaciones: ajustes y cálculo

- **Estado guardado**: `habitVacations: IHabitVacation[]` en `data.json`, defecto `[]`; se valida al cargar con `sanitizeVacations()` (se descartan filas con fechas inválidas o `to < from`; el patrón por campo de `loadSettings`). No usa `localStorage`.
- **Sección «Vacaciones»** en la pestaña Hábitos de los ajustes (grupo propio entre «Hábitos» y «Visibilidad de pestañas» en `setting-tab.ts`): un elemento con `render: (setting) => …` (como `renderHabitFolderField()`) que pinta la lista (dos `<input type="date">`, nombre opcional y papelera por fila, reutilizando la fila de los feriados) y el botón «Añadir periodo». Existe tanto en `getSettingDefinitions()` como en el `display()` de respaldo (Obsidian < 1.13). Un fin anterior al inicio se rechaza con un `Notice` y el campo vuelve a su valor.
- **Al cambiar la lista**: guarda ajustes y emite `obsidian-agenda:habits-refresh`. No hace falta `refreshHabits()`: las vacaciones no intervienen en el parseo y `getCalcContext()` las lee de los ajustes en vivo.
- **Contexto de cálculo**: `HabitManager.getCalcContext()` devuelve `{ vacations }`; `HabitView` lo expone como `calcContext` y lo pasan las vistas a las funciones puras (celdas, rachas, porcentajes); estas nunca leen los ajustes. El parámetro es opcional y, sin él, no hay vacaciones.
- **Cuadrícula y Semanal**: `IHabitCell.vacation` añade la clase `--vacation` (atenuado + 🌴 + tooltip con el nombre del periodo); la celda de vacaciones sin marcar es neutral (`scheduled = false`) pero sigue siendo **marcable** (`markable`, que ignora las vacaciones): el botón solo se deshabilita si el día no toca por frecuencia o cae fuera del periodo. Si la celda está marcada conserva `--ticked` y cuenta como programada. El `%` de la fila usa `countsOn()` con el contexto.
- **Rutina**: un hábito que toca ese día sigue en la lista aunque sea de vacaciones (si no, no se podría marcar); `counted` (`countsOn` con el contexto) decide si entra en los porcentajes de la sección y del área.
- **Heatmap**: `IHabitDayStat.vacation` (y `vacationName`) → un día de vacaciones sin marcas (`total` 0) se dibuja con rayas diagonales en vez de 0 % (la celda mide 11 px: no cabe un icono) y el tooltip lleva el nombre (§10.8 para HM1).
- **Racha con `maxGap`**: los días de vacaciones sin marca no consumen hueco (igual que los no programados). El «día límite» fantasma (`lastTick + maxGap + 1` en días naturales, `habit-streak.ts`) hoy tampoco salta los días no programados: **por resolver** si debe saltar vacaciones y días no laborables (en HV1 no lo salta; un día límite que cae en vacaciones sin marcar simplemente no se dibuja).

### 10.4 Botón «Vacaciones» y `app.setting.open()` (implementado en HV1)

```ts
// src/habits/open-habit-settings.ts
export function openPluginSettings(app: App, pluginId: string): boolean {
  const setting = (app as unknown as { setting?: { open?: () => void; openTabById?: (id: string) => unknown } }).setting;
  try {
    if (typeof setting?.open !== 'function' || typeof setting.openTabById !== 'function') return false;
    setting.open();
    return setting.openTabById(pluginId) !== false;   // pluginId = manifest.id ('agenda-tasks')
  } catch {
    return false;
  }
}
// si devuelve false: new Notice(i18n.t('habit_vacations_open_failed'))  → «Ajustes → Agenda Tasks → Vacaciones»
```

- **API no documentada de Obsidian**: `app.setting` no está en `obsidian.d.ts`; es la primera vez que el plugin la usa. Por eso se accede con un cast defensivo y se avisa con un `Notice` si falla. Puede cambiar entre versiones de Obsidian. El valor que devuelve `openTabById` tampoco está documentado: solo un `false` explícito se toma como fallo (la pestaña es la del propio plugin, así que no puede faltar).
- El botón (🌴, `#oa-habit-vacations-btn`) vive en la barra de Hábitos (las cinco plantillas) junto al botón `+` y se cablea en `HabitView.setupViewSpecificEventListeners()`; llama a `plugin.openHabitSettings()` (`main.ts`), que hace `SettingTab.prepareHabitSettings()` (deja elegida la pestaña Hábitos), `openPluginSettings()` y, si abrió, `SettingTab.revealVacations()` (`refreshDomState()` si existe, para repintar con la ruta declarativa, y `scrollIntoView` hasta la lista a los 200 ms).
- **Resuelto en HV1**: la sección «Vacaciones» es un grupo propio de la pestaña Hábitos (no hay una pestaña aparte), así que «abrirla» es elegir esa pestaña y desplazar la vista; funciona igual con `getSettingDefinitions()` (1.13) y con `display()`. Falta la prueba manual en escritorio y móvil.

### 10.5 Selector de subvistas con botones circulares (HU1, implementado el 2026-11-09)

- **Plantillas**: en cada `habit-*-view.hbs`, el `<div class="oa-habit-view-selector">` con el `<select id="oa-habit-view-dropdown">` pasó a:

```hbs
<div class="oa-calendar-view-segmented" role="group" aria-label="{{t 'habit_view_tab'}}">
  {{#if settings.showHabitDashboardTab}}<button type="button" class="oa-calendar-view-btn{{#eq viewSubtype "dashboard"}} oa-active{{/eq}}" data-habit-subtype="dashboard" title="{{t 'habit_dashboard_tab'}}" aria-label="{{t 'habit_dashboard_tab'}}"></button>{{/if}}
  {{!-- idem routine, weekly, grid, table con sus claves --}}
</div>
```

  El plugin **no registra parciales** de Handlebars, así que el bloque se repite en las cinco plantillas (igual que antes el `<select>`); si se prefiere un parcial, hay que registrarlo en `BaseView`.
- **Iconos**: se inyectan con `setIcon(button, iconId)` desde el mapa `HABIT_VIEW_BUTTON_ICONS` (`src/habits/habit-view-icons.ts`, un archivo sin `obsidian` para poder probarlo en Node; análogo a `CALENDAR_VIEW_BUTTON_ICONS` de `calendar-view.ts`): `dashboard → layout-dashboard`, `routine → sunrise`, `weekly → calendar-check-2`, `grid → layout-grid` (corregido tras la prueba manual: `grid-3x3` no existe en Obsidian, que trae ese icono como `grid-3x-3`), `table → list-checks`.
- **Orden y agrupado como chips**: tras la prueba manual los `<select>` de orden (Cuadrícula, Semanal y Rutina) y de agrupado (Rutina) pasaron a chips `oa-axis-chip` con el mismo aspecto que Sort y Group de las tareas (texto «Orden: Prioridad», borde, hover y menú nativo con la opción actual marcada); `HabitView.mountChipMenu()` abre el menú, y `sortLabel`/`groupLabel` llevan el valor actual en el texto. No tienen flecha de dirección: el orden de cada modo es fijo. Las reglas `.oa-axis-chip*` salieron de `.oa-filter-bar` a un bloque compartido con `.oa-habit-toolbar` en `_task-filter-bar.scss`, y se retiraron de `_habit-common.scss` las reglas del `<select>` (`.oa-habit-view-selector`, `--labeled` y `.oa-habit-view-dropdown`), que quedaron huérfanas.
- **TS**: `HabitView.setupViewSpecificEventListeners()` recorre `.oa-calendar-view-btn[data-habit-subtype]` (`setIcon` + clic → `switchToViewType()`, que no hace nada si ya es la subvista actual); los comentarios de clase se actualizaron.
- **Estilos**: el selector circular no añade ninguno (reutiliza `_calendar-common.scss`). Los chips de orden y agrupado usan las reglas `.oa-axis-chip*` de `_task-filter-bar.scss`, ahora compartidas con `.oa-habit-toolbar`; las del `<select>` (`.oa-habit-view-selector`, `--labeled` y `.oa-habit-view-dropdown`) se retiraron de `_habit-common.scss`.
- **Pruebas**: `habit-view-selector.test.cjs` compila las cinco plantillas con Handlebars (mismo helper `eq` que `BaseView`).
- **Riesgos**: iconos inexistentes en la versión de Lucide de la `minAppVersion` (`setIcon` no lanza: deja el botón vacío; probar los cinco). Con una sola subvista visible el grupo se mantiene, y con ninguna queda vacío. Si la subvista abierta está oculta por su ajuste, no hay botón activo (igual que antes con la `<option>`).

### 10.6 Frecuencias con días no laborables (NL2)

- `normalizeFrequencySet(value, nonWorkingDays)` (`habit-parser.ts`): `weekend` → `nonWorkingDays`, `workweek` → `{1..7} \ nonWorkingDays`; `everyday` y la lista de nombres no cambian. `parseHabit()` ya recibe `settings`, así que lee el ajuste (nombre propuesto `nonWorkingDays`, el que defina NL1 en `docs/agenda-tasks/Arquitectura técnica.md` §30).
- `habit-editor.ts`: `FREQUENCY_PRESETS` se calcula con una función pura compartida (`frequencyPresets(nonWorkingDays)`, por crear) y `resolveFrequencyMode()` se extrae como función pura `(set, nonWorkingDays) => modo` para poder probarla en Node.
- **Re-parseo**: `IHabit.frequencySet` se calcula al parsear; al cambiar el ajuste de días no laborables hay que llamar a `habitManager.refreshHabits()` y emitir `obsidian-agenda:habits-refresh`.
- **Aviso**: texto fijo y `Notice` los pone el ajuste (NL1); aquí solo se añade la clave de la parte de hábitos.
- **Resuelto el 2026-11-03**: el ajuste exige al menos un día marcado y uno sin marcar (`sanitizeNonWorkingDays()`, ver [[Modelo de datos]] §8.6), así que `weekend` y `workweek` nunca quedan vacíos; ya no hace falta decidir el caso de conjunto vacío.

### 10.7 Hábitos en el calendario (HC1, v1.1.15) — resumen

El detalle (cómo se pintan las entradas virtuales en cada vista, el chip `🔁 3/5` con popover, la sección «Hábitos» por franja en Día, el ajuste «Mostrar hábitos en el calendario» y los filtros) está en `docs/agenda-tasks/Arquitectura técnica.md` §30. Desde el lado de hábitos:

- Los datos salen de `HabitManager`: `getHabits()` para las filas y `isScheduled()`/`countsOn()`/`getCalcContext()` para decidir qué «toca» cada día, respetando periodo activo y vacaciones.
- Marcar o desmarcar reutiliza `HabitManager.toggleOccurrence()` → `habit-writer.ts` (§2.4); **no se escribe nada más** en archivos y los hábitos no entran en `TaskManager`.
- Depende de HA1 y HV1; el calendario **no** marca los días de vacaciones (por ahora).

### 10.8 Widgets de hábitos y heatmap compartido (HM1 y DW1, v1.1.16) — resumen

Detalle en `docs/agenda-tasks/Arquitectura técnica.md` §31. Desde el lado de hábitos:

- Los widgets «Hábitos de hoy», «Racha actual», «Esta semana» y el heatmap anual consumen `computeDashboard()`, `computeStats()` y `computeYearHistory()` con el contexto de §10.3, de modo que heredan periodo activo y vacaciones.
- **Migración del heatmap**: el heatmap anual de hábitos (`oa-habit-heatmap-*` en `habit-overview-view`) pasa al componente reutilizable con la métrica «% cumplido» (`fecha → pctWeighted`) y **debe quedar idéntico** (5 niveles, columnas por semana, etiquetas, año navegable, día actual resaltado, tooltip). Se elimina el código duplicado.
- **Marca de vacaciones**: el componente es agnóstico, así que su contrato de métrica debe admitir una marca por celda («atenuada con icono y tooltip») además del valor. Si HV1 (v1.1.15) llega antes que HM1, la marca se implementa primero en el heatmap actual y HM1 debe reproducirla.
- Sin la pestaña Hábitos (`showHabitTab`), los widgets salen del catálogo (lo gestiona el registro de paneles, §31).

### 10.9 i18n (6 locales)

Claves de vacaciones (HV1, implementadas en los 6 locales): `habit_vacations`, `habit_vacations_periods`, `habit_vacations_desc`, `habit_vacations_empty`, `habit_vacation_add`, `habit_vacation_from`, `habit_vacation_to`, `habit_vacation_name`, `habit_vacation_remove`, `habit_vacation_invalid`, `habit_vacation` (etiqueta del tooltip) y `habit_vacations_open_failed` (con la ruta «Ajustes → Agenda Tasks → Vacaciones»). Las del periodo activo (`habit_active_from`, `habit_active_until`, `habit_period_invalid`, `habit_period_clear`) ya existen; la propuesta `habit_freq_nonworking_hint` es de NL2. Los botones circulares (HU1) reutilizarán `habit_dashboard_tab`, `habit_routine_tab`, `habit_weekly_tab`, `habit_grid_tab` y `habit_list_tab`. Regla de siempre: ninguna cadena visible fuera de `i18n.t()`; los 6 locales con el mismo conjunto de claves.

### 10.10 Pruebas

**Node (`node --test`)**, en `tests/`, con el patrón de `calendar-weekday-labels.test.cjs` (transpilar el `.ts` con `typescript` y stubs de `obsidian`; las funciones de `habit-calendar.ts` no importan `obsidian`). `parseHabit()` se usa con un `file` simulado para generar `frequencySet`. Propuestos:

| Archivo (por crear) | Casos |
|---|---|
| `habit-period.test.cjs` | **Periodo activo**: `isActiveOn` en los extremos (`from`/`until` inclusivos); sin fechas siempre activo; `inactive` sin `until` nunca; `inactive` con `until`; fechas inválidas = ausentes; `from > until` nunca activo. **Historial estable**: dos hábitos, uno desactivado con `until` = 10 de marzo; el porcentaje del 5 de marzo es igual antes y después de desactivar, y el del 15 solo cuenta al otro. Racha: los días antes de `from` no rompen ni suman. |
| `habit-vacations.test.cjs` (36, implementado) | **Vacaciones**: `sanitizeVacations` (válidos, inválidos, nombre recortado, no-lista, sin compartir referencia) y `findVacation` con extremos inclusivos y solapados. `countsOn`: sin marcar no cuenta, marcado sí, día no programado o fuera del periodo neutral aunque esté marcado, sin contexto igual que antes. Rachas: sin marcar no rompe (con `maxGap` 0 y 1; sin vacaciones se corta); marcado suma solo para ese hábito; por ocurrencia. Celdas: `vacation`, `vacationName`, `markable`, marcada conserva `ticked`, píldora de racha continua y rayas de conexión; día completo parcial neutral. Porcentajes: por área y franja solo cuentan las ocurrencias marcadas (multi-daytime), sin marcas no hay dato. Historial: `total` 0 y `vacation: true` con nombre, una marca da 100 % (ADR-DM2), los demás días no cambian, historial de 30 días. Dashboard con y sin vacaciones. `openPluginSettings` (API presente, ausente, incompleta, con error) y las 12 claves en los 6 locales. |
| `habit-frequency.test.cjs` | **Frecuencias**: con `[6, 7]` el resultado es idéntico al actual (`weekend` `{6,7}`, `workweek` `{1..5}`); con `[5, 6]` → `weekend` `{5,6}` y `workweek` `{1,2,3,4,7}`; con `[7]`; `everyday` y la lista de nombres no cambian; `resolveFrequencyMode` extraída. **Racha**: un hábito `workweek` marcado de lunes a viernes mantiene la racha el sábado con `[6, 7]` y la rompe con `[7]` (documenta el riesgo). Casos de ajuste en extremo: ya no se dan, porque el ajuste rechaza «ningún día marcado» y «los siete marcados» (prueba de `sanitizeNonWorkingDays()` en el Plan de agenda-tasks, NL1). |
| `habit-heatmap-parity.test.cjs` (HM1) | La métrica del heatmap migrado devuelve los mismos valores y niveles que `computeYearHistory()` para un conjunto fijo de hábitos (comparación con un resultado guardado antes de migrar). |

**Manuales** (vault de prueba): desactivar y reactivar un hábito y ver que el historial no cambia; crear vacaciones que incluyan hoy, marcar un hábito y comprobar racha y porcentaje; botón «Vacaciones» en escritorio y móvil (y simulando la falla de `app.setting` para ver el `Notice`); los cinco botones circulares con los ajustes `showHabit*Tab` combinados y el tooltip/aria-label; cambiar los días no laborables y ver el aviso y el cambio de rachas; heatmap con vacaciones en claro y oscuro.

### 10.11 Riesgos

| Riesgo | Mitigación |
|---|---|
| Cambiar el ajuste de días no laborables **altera rachas y porcentajes** de los hábitos `weekend`/`workweek` | Aviso fijo y `Notice` en el ajuste; el token no reescribe notas; los valores por defecto dan el mismo resultado que hoy. |
| `app.setting.open()`/`openTabById()` son **API no documentada** y pueden cambiar | Acceso defensivo con comprobación de tipos y `try/catch`; `Notice` con la ruta; probar en cada versión mínima y actual de Obsidian. |
| La **migración del heatmap** (HM1) cambia su aspecto o sus valores | Criterio de aceptación «idéntico»: prueba de paridad de la métrica y comparación visual en claro/oscuro; la marca de vacaciones forma parte del contrato del componente. |
| La regla de conteo se **duplica** en muchas funciones y diverge | `countsOn()` único en `habit-calendar.ts` (ADR-AR1) y pruebas de la tabla de [[Modelo de datos]] §8.5. |
| Hábitos antiguos con `status: inactive` y sin `until` | Siguen excluidos de porcentajes (comportamiento actual); no se migran notas. |
| `frequencySet` calculado al parsear queda **obsoleto** al cambiar el ajuste | Re-parseo con `refreshHabits()` + evento de refresco al cambiar el ajuste. |
| Dos dispositivos con **ajustes distintos** (`data.json` sincronizado) | El ajuste y la lista de vacaciones viajan en `data.json`; se asume el último guardado. |

### 10.12 Checklist de integración (v1.1.15)

- [x] HA1: `from`/`until` leídos y escritos; el porcentaje de días pasados no cambia al desactivar (implementada y probada el 2026-11-09).
- [x] HV1: lista de vacaciones en ajustes, cálculo, atenuado en Cuadrícula/Semanal/heatmap y botón «Vacaciones» (implementada el 2026-11-09; falta la prueba manual).
- [x] HU1: cinco plantillas con botones circulares y `showHabit*Tab` respetados (implementada el 2026-11-09; falta la prueba manual).
- [ ] NL2 (Plan de agenda-tasks): frecuencias `weekend`/`workweek` siguen los días no laborables, con aviso.
- [ ] i18n en los 6 locales; `npm run build` y `npm run lint` en verde; `node --test tests` en verde.