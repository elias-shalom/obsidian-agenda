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
│ Habit            │ 1  2  3  4  5  6  7 ... 20 21 │ ⏭ streak│ pct   │
├──────────────────┼─────────────────────────────────┼─────────┼───────┤
│ ▢ Agua           │ ▣ ▣ ▣ ▤ ▣ ▣ ▣ ... ▣ ▣          │ 5       │ 90%   │
│ ▢ Lectura 30m    │ ▣ ▢ ▣ ▢ ▤ ▣ ▢ ... ▣ ▢          │ 3       │ 57%   │
│ ▢ Meditación     │ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ... ▣ ▣          │ 12      │100%   │
│ ▢ Caminar        │ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ... ▢ ▢          │ 0       │  0%   │
└──────────────────┴─────────────────────────────────┴─────────┴───────┘
   header: día actual con flecha < > (navegación de ventana)
   ▣ marcada   ▤ gap en racha   ⚠ deadline fantasma (solo maxGap>0)
   · no programado (frequency) — celda deshabilitada/apagada
```

- **Filas**: hábitos activos ordenados alfabéticamente por basename.
- **Columnas**: ventana de `habitDaysToShow` días terminando en "hoy" (o el día navegado). Header con número (y tooltip día/mes).
- **Celda**: un `<button>`. `aria-label = "Habit Aug 12"` (formato i18n). Si el día **no está programado** para ese hábito (`frequency`, §2.5 del [[Modelo de datos]]), la celda se renderiza **deshabilitada y atenuada** (`--oa-unscheduled`): no invoca toggle desde el teclado pero acepta click (el toggle es permitido; ver §1.2).
- **Col X final — Racha**: si `habitShowStreaks`, contador actual al final de cada corrida (`🔥 5`). Si `maxGap>0`, se muestra `+` con tooltip deadline: "Last day to keep your streak". La racha **salta los días no programados**.
- **Col %**: cumplimiento de los **días programados** de la ventana visible.
- **Color**: fondo de celda marcada = color resuelto del hábito (ADR-003); `gap` = 40% opacidad; `deadline` = outline punteado/`--interactive-accent`; no programado = gris del tema + sin pointer por defecto.

### 1.2 Comportamiento (portado de HT21 `Habit.svelte`)

| Acción | Resultado |
|---|---|
| Click celda marcada | Elimina la fecha de `entries`; la celda se destilda; rachas se recalculan. |
| Click celda vacía | Agrega la fecha a `entries`; celda se tildea. |
| Click en nombre | (Doble-clic según configuración) abre la nota del hábito. |
| "Hoy" vacío | Celdas de hoy con outline destacado cuando es el día actual (cheked → resaltado). |
| `maxGap > 0` | Los huecos dentro de racha se pintan (gap); el día fantasma tras el final de la racha recibe `deadline`. |
| Día no programado | `scheduled: false` → celda `--oa-unscheduled`; el click es **permitido** (agrega/elimina `entries`) pero **no afecta** stats ni racha (ADR-005). |
| Drag selección / escribir en pasado | Fuera de alcance (= mismo comportamiento que click individual). |

### 1.3 Datos al template (Handlebars)

```
{
  habits: [ { id, name, title, color, cells: [IHabitCell], streak: number, pct, showGap: bool } ],
  columns: [ date, day, actual ]  // day = número, actual = es hoy
}
```

> `IHabitCell` incluye `scheduled` (ver [[Modelo de datos]] §3) para pintar celdas no programadas.

### 1.4 CSS mínimo

`.oa-habit-grid` → scroll horizontal (`.oa-habit-grid-scroll`), primera columna sticky, botones de celda `aspect-ratio:1`, borde redondeado, estados `--oa-ticked`, `--oa-gap`, `--oa-deadline`, `--oa-unscheduled`.

## 2. Vista Rutina diaria

**TYPE**: `habit-routine-view` · **Tab**: `oa-habit-routine-view-tab` · **Icon**: `sun`

Rol: ver hoy (o el día navegado) organizado por `daytime` y `area`, con barras de progreso. (Con ADR-001: cumplimiento a nivel de fecha.)

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
- **Li/checkbox**: cada hábito con su checkbox interactivo (toggle idéntico al grid) y botón de apertura de nota.
- **Barra de progreso**: `pct` (crudo) con tooltip del **ponderado** `Σ done.priority / Σ scheduled.priority` por daytime y por área (clase `oa-progress-bar`).
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

- **Toggle universal**: usa `HabitManager.toggle(date)` → `habit-writer`. Confirmar visual optimista + reconciliación con `modify`.
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
- Nunca mutar `entries` fuera de `app.fileManager.processFrontMatter`.
- Mantener el idioma del header (`formatDate`) alineado (helper `{{formatDate ...}}` existente) y los nombres de daytimes traducibles si aplica (v1: se muestran como están en frontmatter, con mapeo i18n opcional).
- Helpers Handlebars nuevos: `{{habitAreaLabel area}}` (etiqueta localizada del enum), `{{frequencyLabel set}}` (`everyday`/`workweek`/`weekend`/lista), `{{priorityBadge p}}`.