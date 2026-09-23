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

- **Filas**: hábitos activos. Si un hábito tiene **una sola** `daytime`, aparece como una fila (`Hábito`). Si tiene **varias**, se expande en **una fila por ocurrencia** (`Hábito (daytime)`), cada una con su propia racha y % independientes. Orden configurable desde el toolbar: alfabético (default), por área, por daytime, por prioridad, por racha o por % de cumplimiento.
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
- **Por área** y **Por daytime**: dos secciones lado a lado (`.oa-habit-overview-columns`, CSS Grid `auto-fit minmax(220px,1fr)`, se apilan en paneles angostos). Área ya **no** es el enum de 10 valores: cada barra usa `getAreaLabel`/`getAreaColor` (string libre con fallback determinístico, ver [[Modelo de datos]] §2.4); `subArea` solo como detalle en la Lista.
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
- Sortable por columna (prioridad por defecto desc).
- Click en fila abre la nota; doble-clic abre el Habit Editor.

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