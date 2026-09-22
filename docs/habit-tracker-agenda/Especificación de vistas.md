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
| Click en nombre | (Doble-clic según configuración) abre la nota del hábito. |
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

`.oa-habit-grid` → scroll horizontal (`.oa-habit-grid-scroll`), primera columna sticky, celdas de tamaño fijo (`$habit-grid-cell-size`), estados `--oa-ticked`, `--oa-gap`, `--oa-deadline`, `--oa-unscheduled`. Las rachas consecutivas se fusionan visualmente en una "píldora" redondeada usando `--run-single/start/middle/end` (derivados de `streakStart`/`streakEnd`/`streakCount`), con el conteo mostrado solo al final de cada racha de 2+ días. Filas alternas reciben un sombreado sutil (`--alt`) en vez de líneas divisorias. No se requiere `_habit-popover.scss`.

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

- **Secciones**: por `daytime` (wake up, morning, afternoon, evening) en el orden de [[daily routine]].
- **Solo hábitos programados ese día**: `frequency` filtra qué aparece (ADR-005). Los hábitos con un `daytime` cuyo día no les corresponde pueden listarse al final con nota "(no programado hoy)" de forma opcional/plegable.
- **Orden**: `priority` **desc** dentro de cada sección; indicador `[prioridad]` junto al checkbox.
- **Li/checkbox**: cada hábito con su checkbox interactivo (toggle por **ocurrencia** — en la rutina el hábito ya aparece expandido por su `daytime`, así que cada checkbox es una ocurrencia concreta) y botón de apertura de nota.
- **Barra de progreso**: `pct` (crudo) con tooltip del **ponderado** `Σ done.priority / Σ scheduled.priority` por daytime y por área (clase `oa-progress-bar`). Se usa `dayCompleted` (día completo); un día **parcial** muestra nota "en progreso" sin sumar ni romper (ADR-008).
- **Navegación**: flechas `◀ ▶` y botón "Hoy" (dentro de una ventana navegable del día).
- **Estado vacío**: si el día no tiene hábitos activos → texto `habit_no_habits`.

## 3. Vista Dashboard / Overview

**TYPE**: `habit-overview-view` · **Tab**: `oa-habit-overview-view-tab` · **Icon**: `chart-column`

Rol: métricas globales agregadas.

### 3.1 Contenido

```
┌ Dashboard Hábitos ───────────────────────────────────────────────────┐
│ {hoy crudo}  {hoy ponderado}  {racha actual}  {racha máx}  {hábitos}│
│ ── Por área ──  ▨▨▨▨ 75% p100% ·  ▨▨▨ 30% p28%  ...                  │
│ ── Por daytime ──  Wake 80% | Morning 50% | Evening 40%             │
│ ── Cumplimiento últimos 30 días (ponderado) ── barra por día ─────  │
└──────────────────────────────────────────────────────────────────────┘
```

- Cards: cumplimiento de hoy **crudo** (`pbdaily` equivalente) y **ponderado** (`pctWeighted`), racha actual global (máximo entre hábitos), racha máxima, número de hábitos.
- Por área: % (crudo y ponderado) de hábitos **programados** cumplidos hoy agrupados por el **enum de 10 áreas** (etiquetas localizadas; `subArea` solo como detalle en la Lista).
- Por daytime: idem con `daytime`.
- Grafo de 30 días: barra por día con el **% ponderado** (`IHabitDayStat.pctWeighted`, ver [[Modelo de datos]] §3). Sin librerías; barras CSS sobre `oa-highlight-view` existente o el patrón de `task-highlights`.
- Datos: `HabitManager.computeDashboard()`.

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

- **Área**: etiqueta localizada del enum (10 áreas); `SubÁrea` detalle opcional.
- **Frecuencia / Prio**: tokens humanos de `frequency` y `priority 1–5` (sortable por prioridad).
- Sortable por columna (prioridad por defecto desc).
- Click en fila abre la nota (hover con `--interactive-hover`).

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
- Helpers Handlebars nuevos: `{{habitAreaLabel area}}` (etiqueta localizada del enum), `{{frequencyLabel set}}` (`everyday`/`workweek`/`weekend`/lista), `{{priorityBadge p}}`.

## 9. Modal Habit Editor (crear / editar hábito)

**Componente**: `HabitEditorModal` (extiende `Modal` de Obsidian) · disparo: comandos "Nuevo/Editar hábito", botón `+` del header de hábitos, doble-clic en la Lista.

### 9.1 Wireframe

```
┌ Habit Editor ───────────────────────────────────────────────┐
│ Nombre *        [ ______________ ]   (slug: higiene-dental) │
│ Etiqueta        [ ______________ ]   (title, opcional)      │
│ Descripción     [ ______________ ]                          │
│ Tiempo (min)    [ 5 ]   Prioridad [ 1..5 ]  Status [ ⚙ ]   │
│ Área            [ Physical ▼ ]   SubÁrea [ feed ]           │
│ Frecuencia      [ everyday ▼ ] / [lu][ma][mi][ju][vi][sá][do]│
│ Daytimes        [x] wake up [x] morning [ ] afternoon [ ]   │
│ HT21            Color [ ■ ]  MaxGap [ 2 ]                   │
│ [ Guardar ]  [ Cancelar ]   (edición: [ Eliminar ])         │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Comportamiento

| Campo | Regla |
|---|---|
| name | Obligatorio; sanitiza a filename (slug), valida **unicidad** en `habitFolderPath` al crear. |
| title / etiqueta | Opcional; si coincide con el basename se omite al guardar. |
| area | Dropdown de las **10 áreas** del enum (etiquetas i18n, valor = slug). |
| frequency | Select (`everyday/workweek/weekend`) o multi-check de 7 días. |
| priority | Stepper/slider 1–5, default 3. |
| daytime | Multi-check (`wake up`, `morning`, `afternoon`, `evening`); multi permitido; si queda vacío se asume `morning` con aviso. |
| maxGap / color | Grupo HT21 (top-level, ADR-007): stepper 0–30 y color picker. |
| Crear | Crea `name.md` en `habitFolderPath` con el frontmatter (defaults `frequency: everyday`, `priority: 3`, `status: active`); aplica opcionalmente la plantilla `habit.md` en el cuerpo. |
| Editar | `processFrontMatter` (preserva `completions` y `entries`); si cambia el basename, `fileManager.rename` conservando el historial. |
| Eliminar | Solo edición, con `confirm`; borra la nota. |

- Validación inline (campo en rojo + tooltip) y `Notice` en errores de escritura (readonly/sync).
- Guardar exitoso → emite `obsidian-agenda:habits-refresh` y cierra el modal.