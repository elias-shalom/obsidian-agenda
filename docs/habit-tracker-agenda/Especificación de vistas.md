---
name: "Especificación de vistas - Habit Tracker Agenda"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: daily-routine
archetype: engineer
status: active
related:
  - "[[README]]"
  - "[[Modelo de datos]]"
  - "[[Arquitectura técnica]]"
created: 2026-09-21
tags:
  - obsidian-agenda
  - documentation
  - specifications
---

# Especificación de vistas — Módulo Habit Tracker

> Stack: Handlebars (`.hbs`) + TS + luxon + SCSS. Todas las cadenas visibles vía `i18n.t()`.
> Convenciones de interacción/responsividad descritas en §8.
> **Ampliaciones v1.1.15–v1.1.16**: §11 a §13 implementadas en v1.1.15 (selector de subvistas con botones circulares, periodo activo, vacaciones y frecuencias que siguen los días no laborables, y hábitos en el calendario); §14 widgets de hábitos en el Dashboard, diseño de v1.1.16, no implementado. Plan por fases HA1, HV1 y HU1 en [[Plan de implementación]]; modelo en [[Modelo de datos]] §8; mecanismo en [[Arquitectura técnica]] §10.

## 1. Vista Grid (estilo Habit Tracker 21) — PRINCIPAL

**TYPE**: `habit-grid-view` · **Tab**: `oa-habit-grid-view-tab` · **Icon**: `list-checks`

Rol: historial interactivo por día, equivalente al plugin Habit Tracker 21, integrado en el plugin.

### 1.1 Wireframe

```
┌──────────────────────────────────────────────────────────────┬────────┐
│ Habit                   │ 1  2  3  4  5  6  7 ... 20 21 │ ⏭ streak│ pct   │
├─────────────────────────┼─────────────────────────────────┼─────────┼───────┤
│ Agua                    │ ▣ ▣ ▣ ▤ ▣ ▣ ▣ ... ▣ ▣          │ 5       │ 90%   │
│ Lectura 30m             │ ▣ ▢ ▣ ▢ ▤ ▣ ▢ ... ▣ ▢          │ 3       │ 57%   │
│ Dog time (morning)      │ ▣ ▣ ▢ ▣ ▣ ▣ ▣ ... ▣ ▣          │ 4       │ 90%   │
│ Dog time (afternoon)    │ ▢ ▣ ▣ ▢ ▣ ▣ ▢ ... ▣ ▢          │ 2       │ 60%   │
│ Caminar                 │ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ... ▢ ▢          │ 0       │  0%   │
└─────────────────────────┴─────────────────────────────────┴─────────┴───────┘
   header: día actual con flecha < > (navegación de ventana)
   ▣ completa (racha fusionada en píldora)   ▤ gap en racha   ⚠ deadline fantasma (solo maxGap>0)
   · no programado (frequency) — celda deshabilitada/apagada
```

- **Filas**: hábitos activos. Si un hábito tiene **una sola** `daytime`, aparece como una fila (`Hábito`) y, por defecto, muestra una etiqueta compacta localizada junto al nombre; se puede desactivar con `habitShowSingleDaytimeLabel`. Si tiene **varias**, se expande en **una fila por ocurrencia**, cada una con su propia racha y % independientes, y muestra el daytime con la misma etiqueta compacta junto al nombre. Así ambas variantes usan el mismo patrón visual y no se repite el daytime dentro del título. Orden configurable desde el toolbar: alfabético (default), por área, por daytime, por prioridad, por racha o por % de cumplimiento; Grid recuerda la última selección.
- **Columnas**: ventana de `habitDaysToShow` días terminando en "hoy" (o el día navegado). Header con número (y tooltip día/mes).
- **Celda**: un `<button>`. `aria-label = "Habit Aug 12"` (formato i18n). Si el día **no está programado** para ese hábito (`frequency`, §2.5 del [[Modelo de datos]]), la celda se renderiza **deshabilitada y atenuada** (`--oa-unscheduled`): no invoca toggle desde el teclado pero acepta click (el toggle es permitido; ver §1.2).
- **Col X final — Racha**: si `habitShowStreaks`, contador actual al final de cada corrida (`🔥 5`). Si `maxGap>0`, se muestra `+` con tooltip deadline: "Last day to keep your streak". La racha **salta los días no programados**.
- **Col %**: cumplimiento de los **días programados** de la ventana visible.
- **Color**: fondo de celda marcada = color resuelto del hábito (ADR-003); `gap` = 40% opacidad; `deadline` = outline punteado/`--interactive-accent`; no programado = gris del tema + sin pointer por defecto.

### 1.2 Comportamiento (portado de HT21 `Habit.svelte`)

| Acción | Resultado |
|---|---|
| Click celda (cualquier fila) | Toggle directo de esa ocurrencia (la `daytime` específica de la fila) → actualiza `completions` y re-deriva `entries` ([[Modelo de datos]] §5.2). |
| Click en nombre | Abre el **Habit Editor** (`HabitManager.openEditor(habit)`) precargado con los datos de ese hábito — el nombre se renderiza como un link (`<a href="#">` con `preventDefault`), no como texto plano. |
| "Hoy" vacío | Celdas de hoy con outline destacado cuando es el día actual (cheked → resaltado). |
| `maxGap > 0` | Los huecos dentro de racha se pintan (gap); el día fantasma tras el final de la racha recibe `deadline`. |
| Día no programado | `scheduled: false` → celda `--oa-unscheduled`; el click es **permitido** (actualiza `completions`) pero **no afecta** stats ni racha (ADR-005). |
| Cambiar orden | El selector "Ordenar por" del toolbar reordena las filas (alfabético/área/daytime/prioridad/racha/%) sin recargar datos. |
| Drag selección / escribir en pasado | Fuera de alcance (= mismo comportamiento que click individual). |

### 1.3 Filas por ocurrencia (hábitos multi-daytime)

- Un hábito con `daytimes.length > 1` **no** usa un popover: se expande directamente en **N filas**, una por cada `daytime` (ej. `dog time (morning)` y `dog time (afternoon)`).
- Cada fila calcula su propia racha, `%` y celdas de forma independiente (`computeOccurrenceCells`/`computeOccurrenceStats`, [[Arquitectura técnica]] §2.3), usando solo `completions[date].includes(daytime)` como criterio de "hecho" — no hay estado parcial dentro de una fila.
- El título de la fila usa la etiqueta i18n de la `daytime` (`habit_daytime_wake_up`, `habit_daytime_morning`, etc.): `"{{habit.title}} ({{t (daytimeLabelKey daytime)}})"`.
- El `id` interno de la fila codifica `archivo::daytime` para que el clic sepa exactamente qué ocurrencia togglear, sin ambigüedad ni UI adicional.
- Accesibilidad: cada fila es un conjunto de botones normal (mismo patrón que una fila de una sola daytime); no requiere manejo de foco/cierre especial como un popover.

### 1.4 Datos al template (Handlebars)

```
{
  habits: [
    { id: "archivo::daytime", title, color, cells: [IHabitCell], streak: number, pct, area, priority, daytime, alt: bool }
  ],
  columns: [ date, day, actual ],  // day = número, actual = es hoy
  sortBy: "alphabetical" | "area" | "daytime" | "priority" | "streak" | "pct"
}
```

> Cada entrada de `habits` es **una ocurrencia** (fila), no un hábito completo — un hábito con 2 daytimes genera 2 entradas. `IHabitCell` usa `scheduled`/`ticked`/`gap`/`deadline`/`streakStart`/`streakEnd`/`streakCount` para pintar la celda y fusionar rachas en píldora; `partial`/`progress`/`multiDaytime` siguen existiendo en el tipo (usados por `dayCompleted` a nivel de hábito agregado, ver [[Modelo de datos]] §3) pero la Grid no los consume.

### 1.5 CSS mínimo

`.oa-habit-grid` → scroll horizontal (`.oa-habit-grid-scroll`, con marco/borde redondeado propio y separación respecto al toolbar), primera columna sticky, celdas de tamaño fijo (`$habit-grid-cell-size`), estados `--oa-ticked`, `--oa-gap`, `--oa-deadline`, `--oa-unscheduled`. Las rachas consecutivas se fusionan visualmente en una **píldora delgada** (dibujada en un `::after` centrado verticalmente dentro de la celda, no ocupando toda su altura) usando `--run-single/start/middle/end` (derivados de `streakStart`/`streakEnd`/`streakCount`); un día suelto (`run-single`) se renderiza como un **círculo** (más grande que el grosor de la píldora), con el conteo mostrado solo al final de cada racha de 2+ días. El color del outline `--oa-deadline` usa la variable `--habit-color` de la fila (no un color fijo del tema). Filas alternas reciben un sombreado sutil (`--alt`) en vez de líneas divisorias. No se requiere `_habit-popover.scss`.

## 2. Vista Rutina diaria

**TYPE**: `habit-routine-view` · **Tab**: `oa-habit-routine-view-tab` · **Icon**: `sun`

Rol: ver hoy (o el día navegado) organizado por `daytime` y `area`, con barras de progreso. Cumplimiento por **ocurrencia** (ADR-001/008).

### 2.1 Wireframe

```
┌─ Día: 2026-07-12   ◀ ▶ Hoy ─────────────────────────────────────┐
│ Wake up                          ⚡4  ponderado 3.6/4.6 (78%)  ▣▣▣▣▢│
│   ☑ Agua  [4]                       📄 5m                        │
│   ☐ Meditación  [5]                 📄 10m                       │
│   ☑ Lectura  [2]                    📄 20m                       │
│ Morning                           ponderado 1/3 (33%)  ▣▢▢       │
│   ☐ Caminar  [2]                    📄 30m   · (no programado)   │
│   ☐ Power nap  [3]   · hoy no programado (weekend)               │
│ ...
│ Por área:  Physical 75%  Spiritual 80%  ...                     │
└──────────────────────────────────────────────────────────────────┘
```

- **Secciones**: por `daytime` (wake up, morning, afternoon, evening, night) **o por área**, según el selector "Agrupar por" del toolbar (`groupBy`, default `daytime`) — no está fijo al `daytime` como en el diseño original. Cuando se agrupa por área, el encabezado de sección muestra el color del área y cada fila oculta el tag de área (redundante) mostrando en su lugar un tag de `daytime`.
- **Grupos colapsables** (implementado, 2026-09-29): cada encabezado de sección funciona como un botón con caret e indicador `aria-expanded`; permite ocultar/mostrar los hábitos de ese grupo. El estado colapsado se persiste en el almacenamiento local por modo y clave de grupo, por lo que sobrevive a los refrescos de la vista y a la navegación entre fechas.
- **Solo hábitos programados ese día**: `frequency` filtra qué aparece (ADR-005). No se implementó el listado plegable de "no programado hoy" (queda fuera del filtro directamente).
- **Orden dentro de cada sección**: configurable desde el selector "Ordenar por" del toolbar — alfabético, por área, por daytime, por prioridad (default), por racha o por % de cumplimiento (mismo combobox que Grid/Weekly). `racha`/`%` se calculan por ocurrencia sobre una ventana de `habitDaysToShow` días (mismo mecanismo que la Grid).
- **Li/checkbox**: cada hábito con su checkbox interactivo (toggle por **ocurrencia**) y dos botones: **"Open file"** (abre la nota) y **"Edit habit"** (abre el Habit Editor precargado).
- **Barra de progreso**: `pct` (crudo) con tooltip del **ponderado** `Σ done.priority / Σ scheduled.priority` por daytime y por área (clase `oa-progress-bar`). Se usa `dayCompleted` (día completo); un día **parcial** muestra nota "en progreso" sin sumar ni romper (ADR-008).
- **Navegación**: flechas `◀ ▶` y botón "Hoy" (dentro de una ventana navegable del día).
- **Estado vacío**: si el día no tiene hábitos activos → texto `habit_no_habits`.

## 3. Vista Dashboard / Overview

**TYPE**: `habit-overview-view` · **Tab**: `oa-habit-overview-view-tab` · **Icon**: `chart-column`

Rol: métricas globales agregadas. **Es la vista inicial por defecto** al abrir la pestaña de Hábitos (antes era la Grid; ver `getDefaultHabitView()` en `base-view.ts`).

### 3.1 Contenido

```
┌ Dashboard Hábitos ───────────────────────────────────────────────────┐
│ {hoy crudo}  {hoy ponderado}  {racha actual}  {racha máx}  {hábitos}│
│ ── Por área ──────────────┐  ┌── Por daytime ──────────────        │
│ ▨▨▨▨ 75% p100% ·  ▨▨▨ 30% p28%│  Wake 80% | Morning 50% | Evening 40%│
│ (lado a lado, grid responsive) └──────────────────────────────      │
│ ── Cumplimiento últimos 30 días (ponderado) ── con eje X/Y ───────  │
│ ── Heatmap anual global (estilo GitHub) ◀ 2026 ▶ ─────────────────  │
└──────────────────────────────────────────────────────────────────────┘
```

- Cards: cumplimiento de hoy **crudo** (`pbdaily` equivalente) y **ponderado** (`pctWeighted`), racha actual global (máximo entre hábitos), racha máxima, número de hábitos.
- **Por área** y **Por daytime**: dos secciones lado a lado (`.oa-habit-overview-columns`, CSS Grid `auto-fit minmax(220px,1fr)`, se apilan en paneles angostos). Sus porcentajes cuentan **ocurrencias**: completar `morning` aporta al área y a `morning` aunque `afternoon` siga pendiente; el ponderado suma la prioridad por ocurrencia. El porcentaje global de día completo e historial diario siguen considerando el hábito completo. Área ya **no** es el enum de 10 valores: cada barra usa `getAreaLabel`/`getAreaColor` (string libre con fallback determinístico, ver [[Modelo de datos]] §2.4).
- **Gráfico de 30 días**: barra por día con el **% ponderado** (`IHabitDayStat.pctWeighted`). Incluye **leyendas**: eje Y (`100%`/`50%`/`0%`) y eje X (fecha de inicio, punto medio y fin del rango), además del tooltip por barra con fecha+%.
- **Heatmap anual global** (nuevo, no estaba en el diseño original): cuadrícula estilo GitHub, una columna por semana (domingo arriba/sábado abajo), etiquetas de mes y de día de semana, navegable por año (`◀ AÑO ▶`), 5 niveles de color según `pctWeighted` del día (`computeYearHistory(habits, year)` en `habit-stats.ts`), con el día actual resaltado y tooltip por celda.
- Datos: `HabitManager.computeDashboard()` + `computeYearHistory()`.

## 4. Vista Semanal

**TYPE**: `habit-weekly-view` · **Tab**: `oa-habit-weekly-view-tab` · **Icon**: `calendar-range`

Rol: matriz hábito × 7 días (semana actual navegable).

```
┌ Semana 28 - Jul ──────────────────────────────────────────────┐
│ Habit       │ L   M   X   J   V   S   D │ streak │ pct        │
│ Agua        │ ▣   ▣   ▤   ▣   ▣   ·   · │ 5      │ 71%       │
│ Lectura     │ ▣   ▢   ▣   ▢   ▢   ·   · │ 2      │ 40%       │
└─────────────┴────────────────────────────┴────────┴───────────┘
```

- Mismas celdas/hechos que la Grid pero con exactamente 7 columnas (días de la semana).
- Usa el mismo badge localizado que Grid para identificar el daytime junto al nombre de cada hábito. En hábitos con varios daytimes el badge siempre aparece; `habitShowSingleDaytimeLabel` permite controlar solo la etiqueta de hábitos con un único daytime.
- El orden del toolbar es independiente de Grid y recuerda la última selección.
- La grilla conserva sus anchos de columna; el scrollbar horizontal se oculta visualmente, pero el contenido sigue pudiéndose desplazar si no cabe en el panel.
- Los días **no programados** para un hábito se muestran `·` (`--oa-unscheduled`): no afectan el `pct` semanal (que usa los días programados).
- Header con `◀ · MMM · ▶` (ventana semanal).

## 5. Vista Lista / Tabla

**TYPE**: `habit-table-view` · **Tab**: `oa-habit-table-view-tab` · **Icon**: `table`

Rol: catálogo de hábitos con metadata y stats.

```
┌ Habit │ Área        │ SubÁrea │ Frecuencia │ Prio │ Daytime    │ Tiempo │ Racha │ 30d │
│ Agua  │ Physical    │ feed    │ everyday   │ 4    │ wake up    │ 5m     │ 5     │ 90% │
│ Caminar│ Physical   │ move    │ workweek   │ 2    │ afternoon  │ 30m    │ 0     │ 12% │
└────────┴─────────────┴─────────┴────────────┴──────┴────────────┴────────┴───────┴─────┘
```

- **Área**: `getAreaLabel(area, i18n)` — traduce si coincide con un área conocida, si no muestra el string crudo (ya no es un enum cerrado); `SubÁrea` en columna propia.
- **Frecuencia / Prio**: tokens humanos de `frequency` y `priority 1–5` (sortable por prioridad).
- Sortable por columna, incluida la columna de estatus (prioridad por defecto desc).
- Clic simple en fila abre el Habit Editor; doble-clic abre la nota del hábito.

## 6. Interacciones comunes (todas las vistas)

- **Toggle universal**: usa `HabitManager.toggleOccurrence(file, date, daytime)` (grid: directo sobre la fila de esa ocurrencia; rutina: directo por ocurrencia). Optimista + reconciliación con `modify`.
- **Habit editor**: botón `+` en el header de las vistas de hábitos y comando abren el **modal Habit Editor** (§9); en la Lista/Tabla, doble-clic en una fila abre el mismo modal en modo edición.
- **Abrir nota**: `app.workspace.openLinkText(file.basename, file.path, 'tab')` (patrón del plugin).
- **Navegación de ventana día/semana**: pares flechas con `luxon`.
- **Resumen desde otra vista**: al activarse `onOpen`, refresca.
- **Tooltips**: `title`/`data-tooltip` en rachas/deadline y fechas del header.
- **Empty state y error de ruta**: ver § Arquitectura (estado `habit_no_habits_at`).

## 7. Responsividad

- Sidebar estrecha: relist scroll horizontal; ocultar columna % en grid; reducir `daysToShow` visual de forma automática (CSS `max-width` con `overflow-x`).
- Móvil: celdas ≥ 32px toca.

## 8. Notas de implementación clave

- No añadir dependencias nuevas; `luxon` ya está en el plugin.
- Nunca mutar `completions`/`entries` fuera de `app.fileManager.processFrontMatter` (el writer actualiza ambos en una transacción, [[Modelo de datos]] §5.2).
- Mantener el idioma del header (`formatDate`) alineado (helper `{{formatDate ...}}` existente) y los nombres de daytimes traducibles si aplica (v1: se muestran como están en frontmatter, con mapeo i18n opcional).
- Helpers Handlebars nuevos: `{{habitAreaLabel area}}` (etiqueta localizada si coincide con un área conocida, si no el string crudo), `{{frequencyLabel set}}` (`everyday`/`workweek`/`weekend`/lista), `{{priorityBadge p}}`.

## 9. Modal Habit Editor (crear / editar hábito)

**Componente**: `HabitEditorModal` (extiende `Modal` de Obsidian) · disparo: comandos "Nuevo/Editar hábito", botón `+` del header de hábitos, click en el nombre (Grid/Weekly) o doble-clic en fila (Lista/Tabla) o botón "Edit habit" (Rutina).

> **Revisado respecto al diseño original**: se quitó el campo "Título/etiqueta" (redundante con `name`); `time` es un dial circular (no un input numérico); `priority` y `maxGap` son sliders (no steppers); `status` es un switch (no un select); `color` tiene como valor por defecto el acento del tema (`--interactive-accent`) en vez de negro; `area` es un `<select>` **poblado dinámicamente** con las carpetas raíz del vault + áreas ya usadas, no un enum fijo.

### 9.1 Wireframe (actual)

```
┌ Habit Editor ───────────────────────────────────────────────┐
│ Nombre *        [ ______________ ]   (slug: higiene-dental) │
│ Descripción     [ ______________ ]                          │
│ ┌ Tiempo (dial) ┐   Prioridad  [ ●───── ] 1..5              │
│ │   ⏱ 15 min    │   Status     [ ⚪──⚫ ] Activo             │
│ └───────────────┘                                           │
│ Área            [ physical ▼ ]   SubÁrea [ feed ]           │
│ Frecuencia      [ everyday ▼ ] / [lu][ma][mi][ju][vi][sá][do]│
│ Daytimes        [x] wake up [x] morning [ ] afternoon [ ]   │
│ MaxGap [ ●───── ] 0..14        Color [ ■ ] (default = tema) │
│ [ Guardar ]  [ Cancelar ]   (edición: [ Eliminar ])         │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Comportamiento

| Campo | Regla |
|---|---|
| name | Obligatorio; sanitiza a filename (slug), valida **unicidad** en `habitFolderPath` al crear. |
| area | `<select>` poblado con `HabitManager.getVaultRootFolders()` (carpetas raíz reales del vault) + cualquier área ya usada por hábitos existentes. Elegir una opción **solo** escribe el string en `frontmatter.area`; no mueve la nota de carpeta. Cualquier texto es válido (ya no hay validación contra un enum). |
| frequency | Select (`everyday/workweek/weekend`) o multi-check de 7 días. |
| time | Dial circular (SVG, arco de progreso + thumb draggable), rango 0–120 min. |
| priority | Slider 1–5, default 3. |
| status | Switch (activo/inactivo), no un select. |
| daytime | Multi-check (`wake up`, `morning`, `afternoon`, `evening`, `night`); multi permitido; si queda vacío se asume `morning` con aviso. |
| maxGap | Slider 0–14. |
| color | Color picker; si la nota no trae color, el valor por defecto mostrado es el acento del tema resuelto en tiempo real (`getComputedStyle` sobre `--interactive-accent`), no negro. |
| Crear | Crea `name.md` en `habitFolderPath` con el frontmatter (defaults `frequency: everyday`, `priority: 3`, `status: active`); **la plantilla `habit.md` opcional en el cuerpo no está implementada** (pendiente). |
| Editar | `processFrontMatter` (preserva `completions` y `entries`); si cambia el basename, `fileManager.renameFile` conservando enlaces. |
| Eliminar | Solo edición, con confirmación de dos clics; borra la nota. |

- Validación inline (mensaje de error bajo el formulario) y `Notice` en errores de escritura (nombre duplicado, etc.).
- Guardar exitoso → emite `obsidian-agenda:habits-refresh` y cierra el modal.

> **Ampliación v1.1.15**: el modal gana dos selectores de fecha (`from` y `until`) y el switch de `status` pasa a escribir/borrar `until`; ver §12.1. Las frecuencias «Fin de semana» y «Lunes a viernes» pasan a seguir el ajuste de días no laborables; ver §12.3.

## 11. Selector de subvistas con botones circulares (v1.1.15 — implementado el 2026-11-09)

Decidido el 2026-11-02. Antes las cinco subvistas de hábitos se conmutaban con un `<select id="oa-habit-view-dropdown" class="oa-habit-view-dropdown">` repetido en las cinco plantillas (`habit-grid-view.hbs`, `habit-overview-view.hbs`, `habit-routine-view.hbs`, `habit-weekly-view.hbs`, `habit-table-view.hbs`, en `src/views/templates/`). Ahora es un grupo de **botones circulares con solo icono**, el mismo componente que usan el selector de vista del calendario y el conmutador Lista | Tabla.

### 11.1 Wireframe

```
Antes:  ┌ Dashboard Hábitos ──────────────  [Cuadrícula ▼] ┐
Ahora:  ┌ Dashboard Hábitos [+] ──  (◫)(☀)(✓)(▦)(☰)       ┐   ← el activo resaltado
         Grid, Semanal y Rutina: ◀ ▶ y los selectores de orden/agrupado conservan su sitio
```

### 11.2 Comportamiento

- **Componente reutilizado**: contenedor `oa-calendar-view-segmented` (`role="group"`) con un `oa-calendar-view-btn` por subvista (la clase `oa-active` marca la actual). No se crea un componente nuevo ni se duplican estilos: los de `_calendar-common.scss` ya dan el aspecto circular, el resaltado con el color de acento y el atenuado al pasar el ratón.
- **Solo icono**: cada botón lleva `title` (tooltip) y `aria-label` con el nombre de la subvista (claves existentes `habit_dashboard_tab`, `habit_routine_tab`, `habit_weekly_tab`, `habit_grid_tab`, `habit_list_tab`). En móvil el nombre aparece al mantener pulsado (comportamiento del `title`).
- **Posición**: igual que hoy, en el extremo derecho de la barra, a la derecha del título y del botón `+`; el resto de controles de la barra no se mueven.
- **Visibilidad**: respeta los ajustes `showHabitDashboardTab`, `showHabitRoutineTab`, `showHabitWeeklyTab`, `showHabitGridTab` y `showHabitListTab` (mismos `{{#if settings.…}}` que ya tienen las `<option>`); un botón por subvista visible, en el orden actual: Dashboard, Rutina, Semanal, Cuadrícula, Lista.
- **Iconos (Lucide)**:

| Subvista | `viewSubtype` | Icono |
|---|---|---|
| Dashboard | `dashboard` | `layout-dashboard` |
| Rutina | `routine` | `sunrise` |
| Semanal | `weekly` | `calendar-check-2` |
| Cuadrícula | `grid` | `layout-grid` |
| Lista | `table` | `list-checks` |

- **Clic**: conmuta la subvista igual que el `change` del `<select>` actual (`HabitView.switchToViewType()`); pulsar la subvista activa no hace nada.
- **Orden y agrupado** (cambio posterior a la prueba manual del 2026-11-09): los selectores de **orden** (`oa-habit-grid-sort`, `oa-habit-weekly-sort`, `oa-habit-routine-sort`) y de **agrupado** (`oa-habit-routine-group`) pasaron de `<select>` a chips `oa-axis-chip`, con el mismo aspecto y el mismo menú con la opción marcada que Sort y Group de las listas y tablas de tareas («Orden: Prioridad»); sin flecha de dirección, porque el sentido de cada modo es fijo.

> **ADR-SUB1 — Reutilizar el segmentado del calendario**: se reutiliza `oa-calendar-view-segmented`/`oa-calendar-view-btn` en vez de un componente propio de hábitos. Racional: un solo aspecto circular en calendario, Lista | Tabla y hábitos; cero estilos nuevos. Consecuencia: el selector de hábitos hereda cualquier cambio futuro de ese componente.

### 11.3 Casos límite

- Con **una sola** subvista visible se muestra un único botón activo (no se oculta el grupo, para no mover la barra).
- Con **todas** ocultas no se renderiza el grupo (hoy el `<select>` quedaría vacío).
- Si la subvista actual está oculta por ajustes, no hay botón activo; los botones visibles siguen funcionando.

### 11.4 Fuera de alcance

Cambiar el orden de las subvistas, mostrar la etiqueta junto al icono, y tocar los selectores de orden o agrupado.

### 11.5 Por resolver al diseñar

- Los iconos de Lucide (`calendar-check-2`, `layout-grid`…) deben existir en la versión de Lucide que incluye el `minAppVersion` del plugin; si alguno no existe, se elige el alias vigente. Ya pasó con `grid-3x3`, que Obsidian trae como `grid-3x-3`: se cambió a `layout-grid`.

## 12. Periodo activo y vacaciones (v1.1.15 — periodo activo y vacaciones implementados el 2026-11-09 (HA1 y HV1))

Decidido el 2026-11-02. Dos mecanismos distintos que evitan que cambiar el estado de un hábito o salir de viaje altere el historial: el **periodo activo** (por hábito, en su nota) y las **vacaciones** (global, en los ajustes). Modelo en [[Modelo de datos]] §8; mecanismo en [[Arquitectura técnica]] §10.

### 12.1 Periodo activo (`from` / `until`)

- **Campos opcionales en el frontmatter** del hábito, además del `status` actual: `from` (primer día activo) y `until` (último día activo), fechas `AAAA-MM-DD`. **Sin fechas, el hábito se comporta como hoy.**
- **El porcentaje de una fecha o de un rango cuenta solo los hábitos activos ese día.** Desactivar un hábito hoy no cambia el historial: hoy `HabitManager.getHabits()` descarta los inactivos y el porcentaje de días pasados cambia retroactivamente.
- **Un solo periodo**, no una lista. Al **desactivar** un hábito (switch de estado del Habit Creator) el plugin escribe `until` = hoy; al **reactivarlo** lo borra. Las pausas temporales se resuelven con las vacaciones (§12.2).
- **Consecuencia asumida**: si alguien desactiva y reactiva un hábito sin usar vacaciones, el hueco cuenta como días sin cumplir.
- **Habit Creator**: dos selectores de fecha (`from` y `until`), con botón para vaciarlos.

```
│ Frecuencia      [ everyday ▼ ] / [lu][ma][mi][ju][vi][sá][do]│
│ Periodo activo  Desde [ 2026-03-01 ✕ ]   Hasta [ 2026-09-30 ✕ ]│   ← nuevo
│ Status          [ ⚪──⚫ ] Activo                              │
```

> **ADR-PER1 — Un periodo, no una lista**: un único par `from`/`until` por hábito. Racional: cubre «empecé este hábito» y «lo dejé» sin una interfaz de rangos múltiples; las pausas puntuales ya tienen su mecanismo (vacaciones). Alternativa descartada: lista de periodos por hábito.

### 12.2 Vacaciones

- **Lista global de periodos en los ajustes de hábitos** (implementada el 2026-11-09, grupo «Vacaciones» de la pestaña Hábitos): cada periodo tiene `from`, `to` y un **nombre opcional** (p. ej. «Navidad: 20 dic → 2 ene»), con botones para añadir y borrar. Aplica a **todos** los hábitos y es la **fuente única**: la lista vive solo en los ajustes.
- **Regla del día de vacaciones**:

| Situación en un día de vacaciones | Racha | Porcentaje |
|---|---|---|
| Hábito **sin marcar** | Neutral: ni suma ni rompe | No entra en el denominador (ni cumplido ni incumplido) |
| Hábito **marcado** por el usuario | Suma a la racha de **ese** hábito | Entra en el porcentaje de **ese** hábito (numerador y denominador) |

  El porcentaje global del día (y por área/franja) se calcula entonces solo con los hábitos marcados ese día; si ninguno lo está, el día no tiene dato (no es 0 %).
- **Vistas**: los días de vacaciones se muestran **atenuados y con un icono** (🌴) en la **Cuadrícula** (§1) y el **Semanal** (§4), con el nombre del periodo en el tooltip; la celda sigue siendo marcable y, si está marcada, conserva el color del hábito. En el **heatmap** anual (§3.1) un día de vacaciones **sin ninguna marca** se dibuja con rayas diagonales (la celda mide 11 px y no cabe un icono) en vez de como 0 %, y el tooltip lleva el nombre; con marcas se pinta con su porcentaje. La **Rutina** deja en su lista los hábitos de un día de vacaciones, para poder marcarlos, pero no cuenta en sus porcentajes los que no están marcados.
- **Botón «Vacaciones»** (🌴) en la barra de Hábitos: abre los ajustes del plugin en la pestaña Hábitos con `app.setting.open()` y `app.setting.openTabById('agenda-tasks')`, y lleva la vista a la lista. **Es una API no documentada de Obsidian** (es la primera vez que el plugin la usa); si falla, un `Notice` indica la ruta: «Ajustes → Agenda Tasks → Vacaciones».

```
Ajustes → Agenda Tasks → Vacaciones
  [ 2026-12-20 ] → [ 2027-01-02 ]  [ Navidad          ]  [🗑]
  [ + Añadir periodo ]

Cuadrícula:   Agua   ▣ ▣ ▒🌴 ▒🌴 ▣(marcado en vacaciones) ▣     ▒ = atenuado con icono
```

> **ADR-VAC1 — Un día de vacaciones marcado cuenta solo para ese hábito**: marcar en vacaciones no obliga a marcar los demás ni los penaliza. Racional: premia al usuario que mantiene un hábito de viaje sin convertir el resto en incumplidos. Alternativa descartada: dar por cumplidos o saltados todos los hábitos del día.

> **ADR-VAC2 — Lista solo en ajustes, con acceso directo desde Hábitos**: no hay editor de vacaciones dentro de las vistas de hábitos; el botón «Vacaciones» solo navega a los ajustes. Racional: una fuente única y menos interfaz que mantener.

### 12.3 Frecuencias y días no laborables (se implementa en NL2)

- Las frecuencias **«Fin de semana»** (`weekend`) y **«Lunes a viernes»** (`workweek`) **pasan a seguir el ajuste de días no laborables** (siete casillas, por defecto sábado y domingo; lo define NL1 en `docs/agenda-tasks/Especificación de vistas.md` §21): «Fin de semana» = los días marcados como no laborables y «Lunes a viernes» = los demás. Hoy ambas están fijas en `[6, 7]` y `[1..5]` en `habit-parser.ts` y `habit-editor.ts`.
- Con el ajuste por defecto el resultado es idéntico al actual; solo cambia para quien modifique los días no laborables.
- **Las listas de días explícitas** (`[monday, wednesday]`, modo «Personalizado» del Habit Creator) y `everyday` **no cambian**.
- **Aviso** porque afecta a rachas y porcentajes: el ajuste muestra un **texto fijo** bajo las casillas y un **`Notice`** breve al cambiarlo (el texto exacto se define en NL1, con claves `habit_*` para la parte de hábitos).
- El Habit Creator sigue mostrando «Fin de semana» y «Lunes a viernes» en el selector de frecuencia; el modo detectado al editar se calcula contra los conjuntos que resultan del ajuste vigente.

> **ADR-FRQ1 — Los tokens siguen al ajuste; las listas no**: el token (`weekend`/`workweek`) se guarda tal cual en la nota y se resuelve al leerla. Racional: no se reescriben notas al cambiar el ajuste. Consecuencia: cambiar el ajuste reescribe, en el cálculo, el historial de rachas y porcentajes de esos hábitos (de ahí el aviso).

### 12.4 Casos límite

| Caso | Comportamiento |
|---|---|
| Hábito sin `from`/`until` y `status: active` | Siempre activo (igual que hoy). |
| `status: inactive` sin `until` (nota anterior a v1.1.15) | Nunca activo: ni en filas ni en porcentajes (igual que hoy). |
| `status: inactive` con `until` | Activo hasta `until` en el cálculo histórico; no aparece como fila en Cuadrícula, Semanal ni Rutina (igual que un inactivo hoy). |
| Fecha con formato inválido | Se ignora ese campo (patrón de `entries` inválidas). |
| Día marcado fuera del periodo activo | No cuenta (mismo criterio que un día no programado, ADR-005 de [[Modelo de datos]]). |
| Día de vacaciones **no programado** para el hábito | Sigue siendo neutral aunque esté marcado (el día no programado prevalece). |
| Periodos de vacaciones solapados | Se unen; un día es de vacaciones si cae en alguno. |
| Periodo de vacaciones con `to` < `from` | Se rechaza al editarlo en ajustes (aviso y el campo vuelve a su valor); al leer `data.json` se ignora. |

### 12.5 Fuera de alcance

Lista de periodos activos por hábito; vacaciones por hábito o por área; que el calendario marque los días de vacaciones (por ahora no); recordatorios de vacaciones (el aviso de unas vacaciones que empiezan lo da, si aplica, el panel «Resumen del día» del Dashboard, ver `docs/agenda-tasks/Especificación de vistas.md` §22).

### 12.6 Por resolver al diseñar

- **Apertura directa de la sección «Vacaciones»**: resuelto el 2026-11-09 (HV1): es un grupo propio de la pestaña Hábitos, tanto en la ruta declarativa (`getSettingDefinitions()`) como en el `display()` de respaldo; el botón deja elegida esa pestaña y desplaza la vista hasta la lista. Falta probarlo a mano en escritorio y móvil.
- **Extremos del periodo**: resuelto el 2026-11-09 (HA1): `from` y `until` son inclusivos.
- **Visibilidad de filas**: resuelto el 2026-11-09 (HA1): la Cuadrícula, la Semanal y la Rutina siguen mostrando solo los hábitos con `status: active` (un hábito activo con `until` pasado sigue en las filas) y los días fuera del periodo se ven neutrales y atenuados, como los no programados.
- **Icono de vacaciones y su botón**: icono (se propone `tree-palm` de Lucide), posición exacta del botón en la barra y cómo cabe el icono en las celdas pequeñas del heatmap (si no cabe, solo atenuado con tooltip).
- **Cómo se ve un hábito marcado en vacaciones** en la Cuadrícula (se propone: celda marcada normal con el icono pequeño) y las rachas con `maxGap` > 0 (el «día límite» fantasma se calcula hoy por días naturales; falta decidir si salta vacaciones y días no laborables).
- **Frecuencias con casillas extremas**: resuelto el 2026-11-03: el ajuste exige al menos un día marcado y uno sin marcar, así que «Fin de semana» y «Lunes a viernes» siempre tienen días.
- **Habit Creator**: si el usuario ya fijó un `until` futuro y apaga el switch, se sobrescribe con hoy (resuelto el 2026-11-09); un `until` anterior a hoy se respeta.
- **Rutina diaria** en un día de vacaciones: qué lista y qué porcentaje muestra (los hábitos sin marcar no cuentan; falta decidir si se listan atenuados u ocultos) y el de la Lista/Tabla (columnas de racha y 30 d).

## 13. Hábitos en el calendario (v1.1.15 — implementado el 2026-11-09)

> Resumen; **el detalle (dibujo en cada vista, chip, popover, filtros y ajuste) está en `docs/agenda-tasks/Especificación de vistas.md` §21 y la arquitectura en `docs/agenda-tasks/Arquitectura técnica.md` §30**. Fase HC1 del Plan de agenda-tasks, que depende de HA1 y HV1 de [[Plan de implementación]].

Decidido el 2026-11-02; reemplaza al ítem «ajuste para que los hábitos generen o no tareas concluidas».

- **Entradas virtuales**: los hábitos se dibujan en el calendario sin escribir nada en ningún archivo (mismo enfoque que las recurrentes proyectadas). Cada día en que «toca» un hábito aparece una entrada con su nombre, en su franja (`daytime`) y con el color de su área; respeta el **periodo activo** (§12.1) y los **días de vacaciones** (§12.2).
- **No son tareas**: no aparecen en Lista, Tabla, Kanban ni Gantt, ni en los conteos de tareas (para eso están los widgets y el heatmap, §14).
- **Interacción**: clic marca o desmarca (reutiliza la escritura de `completions` de `habit-writer.ts`, [[Arquitectura técnica]] §2.4); para abrir la nota, un botón ↗ por fila del popover (el doble clic sobre una casilla marcaría y desmarcaría).
- **Vistas**: Mes, Semana, Semana laboral, Día y Lista del calendario; **no** en Año.
- **Presentación**: en Mes, Semana, Semana laboral y Lista, un **chip resumen por día** (`🌅 3/5`, cumplidos de los que tocan ese día; el icono es el `sunrise` de la vista Rutina) que abre un **popover** con la lista de hábitos de ese día y su casilla; en **Día**, el mismo chip en el encabezado de cada columna (sin sección aparte; decidido el 2026-11-09).
- **Filtro, no ajuste** (decidido el 2026-11-09): el interruptor es el ítem «Hábitos» al final del menú «+ Filtro» del calendario, **marcado por defecto**, como «Tareas recurrentes»; al desmarcarlo aparece el chip «Hábitos: Ocultos». No se ofrece si la pestaña Hábitos está oculta.
- **Filtros**: la barra de filtros del calendario los afecta por **área** (el área del hábito) y por **búsqueda** (su nombre); prioridad y estado no aplican y no los ocultan.

> **ADR-CAL1 — Entradas virtuales, no líneas `[x]`**: descartado escribir líneas `[x]` en la nota del hábito (riesgo de duplicados, líneas editadas a mano y notas que crecen) y descartado que cada ocurrencia sea una tarea. Racional: el estado del hábito ya vive en `completions`; el calendario solo lo muestra y lo edita por el mismo camino que las demás vistas.

**Fuera de alcance**: que los hábitos generen tareas (descartado); hábitos en Año, Gantt, Lista, Tabla o Kanban; que el calendario marque los días de vacaciones (por ahora no).

**Resuelto el 2026-11-09 — hábitos en un día de vacaciones**: el calendario **no** marca el día, pero la entrada del hábito lleva una **marca visual de vacaciones (🌴)**, la misma que ya usan la Cuadrícula y el Semanal (HV1). Se aplica la regla de [[Modelo de datos]] §8.5: en un día de vacaciones el hábito sin marcar es neutral (no entra en `total` del chip `🌅 x/y`, pero se puede marcar) y el marcado cuenta solo para sí mismo. Detalle en `docs/agenda-tasks/Especificación de vistas.md` §21.4.

**Por resolver al implementar**: que la vista de calendario escuche `EVENTS.HABITS_UPDATED` para refrescarse cuando se marca un hábito desde otra vista.

## 14. Widgets de hábitos y heatmap compartido en el Dashboard (v1.1.16 — diseño, no implementado)

> Resumen; **el detalle (panel de vida, pestañas, arrastre, catálogo de paneles y heatmap reutilizable) está en `docs/agenda-tasks/Especificación de vistas.md` §22 y la arquitectura en `docs/agenda-tasks/Arquitectura técnica.md` §31**. Fases HM1 y DW1 del Plan de agenda-tasks.

Decidido el 2026-11-01 (en lo principal) y el 2026-11-02. El Overview de tareas incorpora widgets de hábitos que reutilizan el cálculo de `habit-stats.ts` y `habit-streak.ts`, por lo que **heredan el periodo activo y las vacaciones** de §12 sin lógica propia.

| Widget | Muestra |
|---|---|
| **Hábitos de hoy** | Cumplidos de los que tocan hoy (p. ej. `3/5`), con barra. |
| **Racha actual** | La mejor racha entre los hábitos activos, con la máxima de subtítulo. |
| **Esta semana** | Siete anillos (uno por día) con el porcentaje semanal, como la imagen «Tu semana». |
| **Heatmap anual de hábitos** | El del Dashboard de hábitos (§3.1), ahora como componente compartido. |

- Cada uno es un panel del catálogo del panel de vida (hoy, una casilla del panel de widgets).
- **Sin la pestaña Hábitos** (`showHabitTab` desactivado), los widgets de hábitos no aparecen en «Añadir panel» y los ya añadidos se ocultan sin perder su sitio en la disposición; vuelven al reactivar la pestaña.
- **El heatmap de hábitos migra al componente de heatmap reutilizable** (métrica «% cumplido»; agnóstico: recibe una función `fecha → valor`, su escala de color y el texto del tooltip) y **debe quedar idéntico al actual**: 5 niveles según `pctWeighted`, columnas por semana, etiquetas de mes y día, año navegable `◀ AÑO ▶`, día actual resaltado y tooltip por celda. Se elimina el código duplicado `oa-habit-heatmap-*`.
- El marcado de **vacaciones** del heatmap (§12.2) debe sobrevivir a la migración: el componente necesita una forma de marcar una celda como «atenuada con icono» sin saber de hábitos (ver [[Arquitectura técnica]] §10.8).

> **ADR-DSH1 — Un componente de heatmap para tareas y hábitos**: el heatmap de hábitos es el primer consumidor del componente reutilizable y el criterio de aceptación es que no cambie. Racional: evitar dos implementaciones; el heatmap de tareas (DT1) se apoya en el mismo.

**Fuera de alcance**: filtros globales del Dashboard (más adelante); que los widgets de hábitos existan sin la pestaña Hábitos.

**Por resolver al diseñar**: cómo se relaciona visualmente el heatmap de hábitos con el de tareas dentro del panel de vida; qué muestra «Hábitos de hoy» cuando hoy es un día de vacaciones sin hábitos marcados (denominador 0, §12.2).