---
name: "Modelo de datos - Habit Tracker Agenda"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: daily-routine
archetype: manager
status: active
related:
  - "[[README]]"
  - "[[PRD - Módulo Habit Tracker]]"
  - "[[Arquitectura técnica]]"
created: 2026-09-21
tags:
  - obsidian-agenda
  - documentation
  - data-model
---

# Modelo de datos — Módulo Habit Tracker

## 1. Fuente de datos

La **única fuente de verdad** v1 son las **notas de hábito** (`*.md`) dentro de la **ruta configurable** `habitFolderPath` (defecto: `daily plan/daily routine/habit`).

> Las notas diarias de seguimiento (`daily plan/daily routine/habit tracker/YYYY-MM-DD.md`) **no** se leen ni escriben en v1 (ver ADR-002). El modelado con `entries` coincide con el plugin **Habit Tracker 21**, que ya se usa en [[habit tracker]].

## 2. Esquema de la nota de hábito

### 2.1 Ejemplo objetivo en el vault (`agua.md`)

```yaml
---
name: agua
description: hidratar al despertar
time: 5
area: physical            # enum de 10 áreas — ver §2.4
subArea: feed             # opcional; conserva la subcategoría antigua
frequency: everyday       # everyday | workweek | weekend | [monday, ...] — ver §2.5
priority: 4               # 1..5, default 3 — ver §2.6
daytime:
  - wake up
type: routine
type_group: knowledge
archetype: athlete
status: active
related: "[[habit gen]]"
created: 2025-07-06
entries:
  - 2026-07-12
  - 2026-07-13
---
```

### 2.2 Campos soportados (unión HT21 + vault)

| Campo | Tipo | Fuente | Uso | Obligatorio |
|---|---|---|---|---|
| `title` | string | HT21 | Etiqueta visible. Fallback → basename | No |
| `color` | string | HT21 | Color de la celda (hex, rgb, nombre CSS) | No |
| `maxGap` | number | HT21 | Huecos permitidos dentro de una racha | No (defecto de settings) |
| `entries` | string[] | HT21 | Fechas completadas `YYYY-MM-DD` | No (se asume `[]`) |
| `name` | string | vault | Nombre lógico (== basename normalmente) | No |
| `description` | string | vault | Descripción / notas de enlace | No |
| `time` | number | vault | Minutos estimados | No |
| `area` | enum (10) | vault | Área de vida (slug inglés) — §2.4 | Sí (fallback: derivada o `temporal`) |
| `subArea` | string | vault | Subcategoría opcional (p. ej. `feed`, `skill - language`) — §2.4 | No |
| `frequency` | token/lista | vault | Días de la semana programados — §2.5 | No (default `everyday`) |
| `priority` | number (1–5) | vault | Importancia del hábito — §2.6 | No (default `3`) |
| `daytime` | string[] | vault | `wake up / morning / afternoon / evening` | No |
| `status` | string | vault | `active / ...` (se filtran inactivos) | No |
| `related` | string \| string[] | vault | Wikilinks | No |
| `created` | string | vault | Fecha de creación | No |

### 2.3 Formato de `entries`

- Arreglo de strings ISO `YYYY-MM-DD` (sin hora, zona local).
- Se mantiene **ordenado ascendente** (set + sort) al leer y al escribir.
- Fechas inválidas → se ignoran al parsear (regla de resiliencia).
- Duplicados → se eliminan.

### 2.4 Enumeración de áreas (`area`)

Los 10 slugs (en inglés, canon) son:

| Slug | Área (etiqueta i18n) | Color sugerido | Habitos actuales del vault |
|---|---|---|---|
| `daily-plan` | Plan diario | `#b660e0` | (ver `misc`, pendiente) |
| `emotional` | Emocional | `#d93d42` | — |
| `financial` | Financiera | `#ed5f00` | — |
| `intellectual` | Intelectual | `#ffba1a` | `intelectual - skill - language`, `intelectual - art` |
| `physical` | Física | `#00b499` | `physical - feed`, `physical - clean`, `physical - training` |
| `professional` | Profesional | `#0e9888` | `work time` |
| `recreational` | Recreativa | `#0880ea` | — |
| `relationship` | Relacional | `#3a5ccc` | `couple`, `dog time`, `relatives` |
| `spiritual` | Espiritual | `#553ed0` | `pray time`, `write the day` |
| `temporal` | Temporal | `#9383f7` (propuesta) | (`misc` → candidato, pendiente) |

**Reglas**:
- Los **slugs se guardan en inglés** en YAML; las **etiquetas visibles** salen del i18n (`habit_area_daily_plan`, ...). Los colores se reusan en grid/rutina/dashboard.
- La **`subArea` opcional** conserva la granularidad antigua sin perder agrupación por el enum: `area: physical` + `subArea: feed` (antes `physical - feed`).
- **Migración de notas actuales**:
  - `physical - feed/clean/training` → `area: physical`, `subArea: feed/clean/training`.
  - `intelectual - skill - language` / `intelectual - art` → `area: intellectual`, `subArea: skill - language` / `art`.
  - `relationship`, `spiritual`, `professional` → se mantienen.
  - `misc` (`clima`, `power nap`, `wake up time`) → **decisión pendiente**: candidatos `temporal` o `daily-plan` (ver ADR-004).
- Un `area` con valor desconocido: el parser lo **deriva** (normaliza espacios→guiones y acentos), si es irreconocible cae a `temporal` y se loguea un warn.

### 2.5 Frecuencia (`frequency`)

Qué días de la semana está **programado** el hábito. Formato en YAML (tokens o nombres):

| Valor | Significado |
|---|---|
| `everyday` (default) | Lunes a domingo |
| `workweek` | Lunes a viernes |
| `weekend` | Sábado y domingo |
| `[monday, wednesday]` | Subset de nombres de días en inglés (orden libre) |

**Reglas**:
- Internamente se normaliza a `Set<number>` ISO (**1=lunes … 7=domingo**), coherente con `luxon.weekday`.
- Interpretación fonética: `everyday → {1..7}`, `workweek → {1..5}`, `weekend → {6,7}`, nombres → `{monday:1, …, sunday:7}`. Valor ausente o inválido → `{1..7}`.
- **Día no programado** (`!isScheduled`): es **neutral** — no cuenta como cumplido ni como falta, no rompe racha, y en las vistas se atenúa (grid/semanal) o se oculta (rutina → solo hábitos programados ese día).
- **Toggle en día no programado**: permitido (visual, queda en `entries`) pero **no afecta** stats ni rachas.

### 2.6 Prioridad (`priority`)

Importancia de realizar el hábito, escala **1–5** (entero):

| Valor | Sentido |
|---|---|
| 5 | Crítico |
| 4 | Muy importante |
| 3 (default) | Importancia media / neutra |
| 2 | Poco importante |
| 1 | Opcional |

- Ausente/inválido → `3`.
- **Ponderación**: el cumplimiento % del día se pondera por prioridad:
  `pctWeighted = Σ done.priority / Σ scheduled.priority` (ver §4.3).
- La **Vista Rutina** ordena los hábitos del día por `priority` desc (luego por `daytime`).
- La **Vista Tabla** tiene columna de prioridad.

## 3. Interfaz TypeScript

```ts
// src/habits/habit.ts
export type Daytime = "wake up" | "morning" | "afternoon" | "evening" | "night";

export type HabitArea =
  | "daily-plan" | "emotional" | "financial" | "intellectual" | "physical"
  | "professional" | "recreational" | "relationship" | "spiritual" | "temporal";

export const HABIT_AREAS: readonly HabitArea[] = [
  "daily-plan", "emotional", "financial", "intellectual", "physical",
  "professional", "recreational", "relationship", "spiritual", "temporal",
];

export type FrequencyToken = "everyday" | "workweek" | "weekend";
export type WeekdayName = "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";
// YAML: FrequencyToken | WeekdayName[]

export interface IHabit {
  file: TFile;
  name: string;           // basename
  title: string;          // frontmatter.title || basename
  description: string;
  time: number;           // minutos
  area: HabitArea;        // slug del enum (§2.4)
  subArea: string;        // "" si no hay
  frequencySet: Set<number>; // ISO weekdays 1=Mon..7=Sun (§2.5)
  priority: number;       // 1..5 (resuelto ?? 3) (§2.6)
  daytimes: Daytime[];
  color: string;          // "" = hereda de settings/tema
  maxGap: number;         // resuelto: fm.maxGap ?? settings.habitDefaultMaxGap
  status: string;
  entries: Set<string>;   // ISO yyyy-MM-dd
}

export function isScheduled(h: Pick<IHabit, "frequencySet">, d: DateTime): boolean {
  return h.frequencySet.has(d.weekday); // luxon weekday = ISO 1=Monday..7=Sunday
}

export const priorityWeight = (h: Pick<IHabit, "priority">): number => h.priority;

export interface IHabitCell {
  date: string;
  ticked: boolean;
  scheduled: boolean;     // false => día no programado (neutral, atenuado)
  gap: boolean;           // dentro de racha pero no contado
  streakStart: boolean;
  streakEnd: boolean;
  streakCount: number;
  deadline: boolean;      // "último día para no perder la racha"
  classes: string;
}

export interface IHabitStreakStats {
  current: number;        // incluye hoy si está marcado
  max: number;
  lastDate: string | null;
}

export interface IHabitDayStat {
  date: string;
  done: number;            // programados cumplidos
  total: number;           // programados ese día
  pct: number;             // crudo: done/total
  weightDone: number;      // Σ priority(done)
  weightTotal: number;     // Σ priority(scheduled)
  pctWeighted: number;     // weightDone/weightTotal (0 si total 0)
}
```

## 4. Métricas derivadas

### 4.1 Cumplimiento del día ("ticked")

`habit.entries.has(date)` con `date = yyyy-MM-dd` local.

Un hábito **solo "cuenta"** el día si `isScheduled(habit, date)`; si no, la celda es neutra (§2.5).

### 4.2 Racha con `maxGap` (portado de HT21 + frecuencia)

Algoritmo por hábito, sobre el rango visible de fechas:

1. **Pass 1 — marcar días**: por cada fecha del rango:
   - `scheduled = isScheduled(habit, fecha)`; si no es programado → celda neutral (no rompe racha).
   - `ticked = entries.has(fecha)`; si no está marcado, `scheduled` es true y `maxGap > 0`, se marca como `gap` cuando queda **entre dos entries consecutivos** cuya separación `<= maxGap + 1`.
2. **Pass 2 — límites de racha**: agrupar corridas continuas de `ticked || gap`, **saltando los días no programados**. El inicio/fin real se calcula comparando con el entry previo/siguiente fuera del rango. El **contador** camina hacia atrás desde el último `ticked` visible contando mientras `gapDays <= maxGap` (sobre días programados).
3. **Pass 3 — deadline fantasma**: si `maxGap > 0`, el día `últimoEntry + (maxGap+1)` se marca `deadline` (punto fantasma con tooltip "último día para mantener la racha").

> Con frecuencia, un hábito con `frequency: workweek` que marca de lunes a viernes no se "pierde la racha" el fin de semana: los sábados/domingo son neutros.

Referencia de algoritmo: `src/Habit.svelte` → bloque `renderedDates` de `zincplusplus/habit-tracker` (extendido con `scheduled`).

### 4.3 Por área y por daytime (ponderado)

Todo % usa como **denominador los hábitos programados** (`scheduled`) de esa fecha/rango:

- **% área (crudo)**: `done / scheduled` entre hábitos con esa `area`.
- **% área (ponderado)**: `Σ done.priority / Σ scheduled.priority` (mismo subconjunto). Si denominador 0 → sin dato.
- **% daytime (crudo y ponderado)**: mismo principio para hábitos que contienen ese `daytime`.
- Mismo principio para **semana** (7 días) y para **rango** (grid).

### 4.4 Agregados de historial

- **Racha actual**: última corrida (con `maxGap`, sin contar días no programados) terminando en hoy o en el último día con datos.
- **Racha máxima**: máximo de corridas en todo el historial.
- **Frecuencia 21d / 30d**: % de **días programados** completados en la ventana.
- **Ponderación diaria**: `IHabitDayStat.pctWeighted` para el dashboard.

## 5. Lectura y escritura

### 5.1 Lectura

- Preferir `app.metadataCache.getFileCache(file)?.frontmatter` para el grid y stats (rápido, cacheado por Obsidian).
- Usar `app.vault.read(file)` + `parseYaml` solo para casos de relectura puntual o cuando cache se considere sucia.
- Resolución de `entries`: `Array.isArray(fm.entries)` → `new Set(fm.entries.filter(validISO))`.
- **Normalización de `area`**: slugificar (`toLowerCase`, espacios→`-`, `intelectual`→`intellectual`) y validar contra `HABIT_AREAS`; desconocido → `temporal` + warn.
- **Normalización de `frequency`**: tokens y nombres → `Set<number>` ISO (ver §2.5); ausente/inválido → `{1..7}`.
- **Normalización de `priority`**: `parseInt` + clamp `1..5`; ausente/inválido → `3`.

### 5.2 Escritura (toggle)

```ts
await app.fileManager.processFrontMatter(file, (fm) => {
  const arr = Array.isArray(fm["entries"]) ? fm["entries"] as string[] : [];
  fm["entries"] = ticked ? arr.filter(d => d !== date).sort() : [...arr, date].sort();
});
```

- No se toca ningún otro campo del frontmatter (preservación de metadata).
- Después de escribir, emitir evento de refresco y permitir que el `modify` listener recargue (guardia anti-bucle).

## 6. Decisiones de diseño (ADR)

### ADR-001 — Granularidad de `entries` por daytime

- **Problema**: en las notas diarias existe distinción por daytime (`<habito>-<area>-<daytime>`). Los `entries` de HT21 son por **fecha**, sin daytime.
- **Decisión v1**: `entries` solo contiene fechas (`YYYY-MM-DD`). La **Vista Rutina diaria** interpreta "cumplido" a nivel de día (sin distinguir qué horario). Simple, compatible con HT21 y con las notas existentes.
- **Alternativa futura** (si se necesita precisión por horario): campo adicional `entriesByDaytime: Record<string, string[]>` (`{ "2026-07-12": ["morning"] }`) o sufijo `YYYY-MM-DD#morning`, migrando de manera incremental y sin romper HT21.

### ADR-002 — Notas diarias de seguimiento (`habit tracker/`)

- **Problema**: el seguimiento actual vive en notas por día con toggles meta-bind y métricas `pb*`.
- **Decisión v1**: esas notas **no** se leen ni se escriben desde el plugin para evitar conflictos de doble fuente. El plugin escribe en `entries` de la nota del hábito.
- **Nota**: la plantilla `config/templates/daily routine.md` seguirá funcionando para el flujo de la nota diaria; la escritura dual (entries + toggle de la daily) queda como integración futura con estrategia de conflicto definida.

### ADR-003 — Color y tema

- Resolución de color de un hábito: `fm.color` → `userSettings.color` (por tracker) → `settings.habitDefaultColor` → variable de tema `--interactive-accent` / `--checkbox-color`.
- Validar con técnica `isValidCSSColor` (crear elemento, asignar `style.color`, comprobar que no quede vacío).

### ADR-004 — Áreas estándar y `subArea`

- **Decisión**: `area` se fija como **enum de 10 slugs en inglés** (`daily-plan…temporal`); etiquetas visibles **vía i18n**; `subArea` opcional preserva la granularidad antigua (`area: physical` + `subArea: feed`).
- **Racional**: agrupar/filtrar/colorear de forma estable en el código y en todas las vistas, sin perder la información fina ya existente.
- **Pendiente**: los hábitos `misc` (`clima`, `power nap`, `wake up time`) deben migrar a un área del enum. Candidatos: `temporal` (se hacen "según el tiempo disponible") o `daily-plan` (organización del día). Se decide en la migración de datos.

### ADR-005 — Frecuencia como días programados

- **Decisión**: `frequency` en YAML con tokens (`everyday`/`workweek`/`weekend`) o lista de nombres; internamente `Set<number>` ISO. Los **días no programados son neutrales**: ni cuentan ni rompen racha.
- **Racional**: coherente con `luxon.weekday` y con la rutina actual (actividades distintas por día); evita castigar automáticamente hábitos "de fin de semana" o "laborales".

### ADR-006 — Prioridad y ponderación

- **Decisión**: `priority: 1..5` (default `3`); el cumplimiento % (día/área/daytime) se **pondera** por prioridad además del crudo.
- **Racional**: que los hábitos críticos pesen más al evaluar el día, sin borrar la métrica simple.

## 7. Casos límite (resiliencia)

Provenientes de `test-vault/broken-habits/` de HT21:

| Caso | Comportamiento v1 |
|---|---|
| YAML corrupto / malformado | El hábito se omite; aviso en consola (debug). No rompe el grid. |
| `entries` con fechas inválidas | Se descartan al parsear. |
| `entries` duplicadas | Set → se eliminan. |
| Sin frontmatter | Se trata como hábito con `entries: []`. |
| Sin `entries` | Se asume `[]`. |
| `area` desconocido | Slugify y validar; si falla → `temporal` + warn en consola. |
| `frequency` ausente/inválido | `everyday` (`{1..7}`). |
| `frequency` con tokens mezclados (`[workweek, saturday]`) | Se ignora el token no soportado dentro de una lista; si queda vacía → `everyday`. |
| `priority` ausente/no numérico/fuera de rango | `3`, clamp a `1..5`. |
| Rutina: hábito sin `daytime` | Se asume en `morning` para la vista de rutina (advertencia visual). |
| Ruta inexistente | Estado "No habits found at '{ruta}'" en la vista. |
| Nombre con caracteres especiales | OK (por basename). |
| Zona horaria / DST | Trabajar siempre con fechas **locales** `yyyy-MM-dd` (no UTC) para evitar `ticked` de un día diferente. |