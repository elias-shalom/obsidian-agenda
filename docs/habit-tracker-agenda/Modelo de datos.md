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

> Las notas diarias de seguimiento (`daily plan/daily routine/habit tracker/YYYY-MM-DD.md`) **no** se leen ni escriben en v1 (ver ADR-002). El seguimiento por **ocurrencia** (`daytime`, hasta varias por día) vive en `completions` de la nota del hábito; `entries` se conserva como **espejo HT21 day-level** para compatibilidad con [[habit tracker]] (ADR-001/007).

## 2. Esquema de la nota de hábito

### 2.1 Ejemplo objetivo en el vault (`agua.md`)

```yaml
---
name: agua
description: hidratar al despertar
time: 5
area: physical            # string libre; ver §2.4 (ya no es un enum fijo)
frequency: everyday       # everyday | workweek | weekend | [monday, ...] — ver §2.5
priority: 4               # 1..5, default 3 — ver §2.6
daytime:
  - wake up
type: routine
type_group: knowledge
archetype: athlete
status: active
related:                         # opcional; varios wikilinks a notas de apoyo — ver §2.4-bis
  - "[[habit gen]]"
created: 2025-07-06
entries:                    # espejo HT21 day-level — fecha presente ⇔ día completo (§2.3)
  - 2026-07-12
  - 2026-07-13
completions:                # fuente canónica por ocurrencia (§2.7)
  2026-07-12:
    - wake up
  2026-07-13:
    - wake up
---
```

### 2.2 Campos soportados (unión HT21 + vault)

| Campo | Tipo | Fuente | Uso | Obligatorio |
|---|---|---|---|---|
| `title` | string | HT21 | Etiqueta visible. Fallback → basename | No |
| `color` | string | HT21 | Color de la celda (hex, rgb, nombre CSS) | No |
| `maxGap` | number | HT21 | Huecos permitidos dentro de una racha | No (defecto de settings) |
| `entries` | string[] | HT21 | **Espejo HT21 day-level**: fechas con el día **completado** (todas sus ocurrencias hechas). Autosincronizado desde `completions` (§2.3) | No (se asume `[]`) |
| `completions` | `Record<string, string[]>` | vault | **Fuente canónica** por ocurrencia: `{ "2026-07-12": ["morning", ...] }`, subconjunto de `daytime` (§2.7) | No (se asume `{}`) |
| `name` | string | vault | Nombre lógico (== basename normalmente) | No |
| `description` | string | vault | Descripción / notas de enlace | No |
| `time` | number | vault | Minutos estimados | No |
| `area` | string | vault | Área de vida, texto libre — §2.4 | No (fallback: `temporal`) |
| `related` | string[] | vault | Wikilinks (o links inline) a notas de apoyo del hábito — §2.4-bis | No |
| `frequency` | token/lista | vault | Días de la semana programados — §2.5 | No (default `everyday`) |
| `priority` | number (1–5) | vault | Importancia del hábito — §2.6 | No (default `3`) |
| `daytime` | string[] | vault | `wake up / morning / afternoon / evening` | No |
| `status` | string | vault | `active / ...` (se filtran inactivos) | No |
| `created` | string | vault | Fecha de creación | No |

### 2.3 Formato de `entries` (espejo HT21 day-level)

- `entries` **no es la fuente de escritura** del grid en v1: es un **espejo** que refleja las fechas donde el hábito se considera **completado al día** (todas sus ocurrencias hechas). Mantiene la compatibilidad con el plugin **Habit Tracker 21**, que lo lee a nivel raíz (ADR-007).
- Un `entry` presente ⇔ `dayCompleted(fecha)` (§2.7). Se **re-deriva** y reescribe junto con `completions` (§5.2); nunca divergen.
- Formato: arreglo de strings ISO `YYYY-MM-DD` (sin hora, zona local), **ordenado ascendente**, sin duplicados; fechas inválidas se ignoran al parsear.
- En notas **legacy** (con `entries` y sin `completions`) se usa como fuente temporal para sintetizar `completions` (§5.1) y migrar sin perder rachas.

### 2.4 Área (`area`) — string libre, no enum

> **Cambio respecto a la v1 original**: el área **ya no es un enum fijo de 10 valores validados**. `IHabit.area` es simplemente el valor crudo (recortado) de `frontmatter.area`; si la nota no trae `area` (o viene vacío) se usa el fallback `'temporal'`. El parser **no** normaliza alias (`intelectual`→`intellectual`, etc.) ni valida contra una lista — cualquier string es válido.

**Color y etiqueta** (`src/habits/habit.ts`):
- `HABIT_AREA_COLORS`: paleta curada `hsl(...)` para los 10 nombres "conocidos" (los mismos slugs históricos: `daily-plan`, `emotional`, `financial`, `intellectual`, `physical`, `professional`, `recreational`, `relationship`, `spiritual`, `temporal"`), todos con el mismo tono/saturación/luminosidad (solo cambia el matiz) para verse armonizados.
- `getAreaColor(area)`: devuelve el color curado si el nombre coincide (case-sensitive con el slug); si no, genera un `hsl(hue, 62%, 55%)` determinístico por hash del string — mismo área siempre da el mismo color, sin necesidad de registrarlo.
- `getAreaLabel(area, i18n)`: intenta traducir `habit_area_<slug>` (slug = `area` en minúsculas, espacios/símbolos → `_`); si la clave no existe, se muestra el `area` tal cual (el nombre de la carpeta/valor de frontmatter).
- `getAreaTextColor(area)`: color de texto (claro/oscuro) calculado por brillo percibido (YIQ) sobre `getAreaColor(area)`, para que la letra sea legible sobre cualquier color de fondo generado.

**Combobox de área en el Habit Editor**: `HabitManager.getVaultRootFolders()` lista las **carpetas raíz reales del vault** (`app.vault.getRoot().children`, filtradas a carpetas) — igual mecanismo que usan `list-view`/`table-view` con `TasksFile.root` para tareas — más cualquier valor de `area` ya usado por hábitos existentes (para no perder la selección al editar uno con un valor atípico). Elegir una opción **solo** escribe el string en `frontmatter.area`; **no mueve la nota de carpeta**.

**Áreas usadas actualmente en el vault** (referencia, no una lista cerrada): `daily-plan`, `emotional`, `financial`, `intellectual`, `physical`, `professional`, `recreational`, `relationship`, `spiritual`, `temporal` — y cualquier otro nombre que el usuario decida escribir (p. ej. los nombres de sus carpetas raíz tipo PARA: `config`, etc.).

### 2.4-bis Archivos relacionados (`related`)

- **Reemplaza a `subArea`** (eliminado): en vez de una subcategoría de texto libre, cada hábito puede enlazar **una nota de apoyo real del vault** (material de referencia, guías, checklists, etc.).
- Se guarda como **wikilink** (`[[Nota]]`) o **link inline** (`[Nota](Nota.md)`) según la preferencia de formato de link del usuario — generado con `app.fileManager.generateMarkdownLink(file, sourcePath)`, nunca como ruta cruda.
- Al ser un link real de Obsidian, **sobrevive a renombrados/movimientos** de la nota relacionada (Obsidian actualiza el link solo) y aparece en "Linked mentions"/backlinks y en el grafo — a diferencia de una ruta de texto plano.
- Resolución: `HabitManager.resolveRelatedFile(habit)` lee `metadataCache.getFileCache(habit.file).frontmatterLinks` (clave `relatedFile`) y resuelve con `getFirstLinkpathDest`; si el cache de links de frontmatter no está disponible, hace fallback manual (extrae el linktext de `[[...]]`/`[...](...)` o ruta cruda).
- **Habit Editor**: campo de ancho completo con el mismo picker que el modal de tareas (`oa-file-picker-group` + lista de sugerencias + hint), reutilizando los estilos globales de `_modal.scss`. Cada wikilink ocupa una línea y el picker agrega enlaces sin reemplazar los existentes. El hint avisa si alguna nota aún no existe (sin implicar que se creará sola).
- **Se muestra/abre** desde la vista Tabla (columna 🔗 "Relacionado") y desde la vista Rutina (botón de acción adicional, solo si el hábito tiene uno configurado).

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
- **Toggle en día no programado**: permitido (queda en `completions` y se refleja en el espejo `entries`) pero **no afecta** stats ni rachas.

> **Cambio v1.1.15 (implementado)**: `workweek` y `weekend` dejan de ser fijos (`{1..5}` y `{6,7}`) y siguen el ajuste de días no laborables; ver §8.6. Con el ajuste por defecto el resultado es el mismo.

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

### 2.7 Completaciones por ocurrencia (`completions`)

Un hábito puede aparecer **varias veces al día** (`daytime: [wake up, ...]`; p. ej. `higiene dental` con 4, `pray time` con 3, `work out` con 2). La fuente canónica guarda **qué ocurrencias se hicieron por fecha**:

```yaml
daytime: [morning, afternoon, evening]
completions:
  2026-07-12:
    - morning
    - afternoon      # la de "evening" NO se hizo → día parcial
```

**Reglas**:
- Claves = fechas ISO `YYYY-MM-DD` local; valores = array de **daytimes hechas**, subconjunto de `daytime` del hábito, sin duplicados, orden estable = el de `habit.daytime`.
- Array vacío o valor inválido → la clave se elimina al escribir; si queda `{}` se elimina el campo.
- Un `daytime` en `completions` que **no pertenezca** a `habit.daytime` se ignora al parsear (resiliencia §7).
- **`dayCompleted(date)`** = `completions[date]` contiene **todas** las daytimes del hábito. Es el criterio de "día cumplido" para rachas, % y para el espejo `entries` (§2.3). Un hábito con `daytimes.length = 0` nunca está completo.
- **`pending(date)`** = día **programado** con ≥1 ocurrencia hecha pero **incompleto** (parcial): no cuenta en el % ni rompe la racha (ADR-008); en el grid se ve como celda "en progreso" (§vistas).
- **Toggle**: `toggleOccurrence(date, daytime)` agrega/elimina esa ocurrencia y re-deriva `entries` (§5.2). La **Vista Grid** representa cada ocurrencia como una **fila independiente** (`Hábito (daytime)`), así que el clic siempre es un `toggleOccurrence` directo sobre esa fila — no existe popover ni ambigüedad de a cuál ocurrencia afecta (§vistas).
- **Migración legacy** (nota con `entries` y sin `completions`): se convierte `entries[date] = todas las daytimes` (preserva rachas); el archivo se migra formalmente en el primer write (§5.1/§5.2).

## 3. Interfaz TypeScript

```ts
// src/habits/habit.ts
export type Daytime = "wake up" | "morning" | "afternoon" | "evening" | "night";

/** El área ya no es un enum fijo: es el string crudo de frontmatter.area (fallback 'temporal') */
export type HabitArea = string;

/** Áreas "conocidas" (compatibilidad con la paleta curada / i18n); no limita qué valores son válidos */
export const HABIT_AREAS: readonly HabitArea[] = [
  "daily-plan", "emotional", "financial", "intellectual", "physical",
  "professional", "recreational", "relationship", "spiritual", "temporal",
];

export type FrequencyToken = "everyday" | "workweek" | "weekend";
export type WeekdayName = "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";
// YAML: FrequencyToken | WeekdayName[]

export interface ICompletions { [date: string]: Daytime[] }  // (§2.7)

export interface IOccurrence {
  daytime: Daytime;
  done: boolean;          // completions[date].includes(daytime)
}

export interface IHabit {
  file: TFile;
  name: string;           // basename
  title: string;          // frontmatter.title || basename
  description: string;
  time: number;           // minutos
  area: HabitArea;        // string libre desde frontmatter.area, fallback 'temporal' (§2.4)
  relatedFile: string;    // "" si no hay; wikilink/link inline a una nota de apoyo (§2.4-bis)
  frequencySet: Set<number>; // ISO weekdays 1=Mon..7=Sun (§2.5)
  priority: number;       // 1..5 (resuelto ?? 3) (§2.6)
  daytimes: Daytime[];
  color: string;          // "" = hereda de settings/tema
  maxGap: number;         // resuelto: fm.maxGap ?? settings.habitDefaultMaxGap
  status: string;
  completions: ICompletions;  // fuente canónica por ocurrencia (§2.7)
  entries: Set<string>;       // espejo HT21 day-level, derivado de completions (§2.3)
}

export function isScheduled(h: Pick<IHabit, "frequencySet">, d: DateTime): boolean {
  return h.frequencySet.has(d.weekday); // luxon weekday = ISO 1=Monday..7=Sunday
}

// §2.7 — "día cumplido" = todas las ocurrencias hechas
export function dayCompleted(h: Pick<IHabit, "completions" | "daytimes">, date: string): boolean {
  const done = h.completions[date] ?? [];
  return h.daytimes.length > 0 && h.daytimes.every((dt) => done.includes(dt));
}

// §2.7 — ocurrencias del día (usado por la Vista Rutina; la Grid ya no lo necesita, ver §vistas)
export function occurrencesFor(h: IHabit, date: string): IOccurrence[] {
  const done = h.completions[date] ?? [];
  return h.daytimes.map((daytime) => ({ daytime, done: done.includes(daytime) }));
}

export const priorityWeight = (h: Pick<IHabit, "priority">): number => h.priority;

export interface IHabitCell {
  date: string;
  ticked: boolean;          // dayCompleted(date) — todas las ocurrencias (§2.7)
  scheduled: boolean;       // false => día no programado (neutral, atenuado)
  partial: boolean;         // programado con ≥1 ocurrencia pero incompleto (§2.7, ADR-008)
  progress: { done: number; total: number };  // ocurrencias hechas / daytimes.length
  multiDaytime: boolean;    // daytimes.length > 1 (informativo; la Grid ya no lo usa para abrir popover, ver §vistas)
  gap: boolean;             // dentro de racha pero no contado
  streakStart: boolean;
  streakEnd: boolean;
  streakCount: number;
  deadline: boolean;        // "último día para no perder la racha"
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

`ticked = dayCompleted(habit, date)` = **todas** las ocurrencias del día hechas (`completions[date] ⊇ daytimes`), con `date = yyyy-MM-dd` local (§2.7).

- Un hábito **solo "cuenta"** el día si `isScheduled(habit, date)`; si no, la celda es neutra (§2.5).
- Día **parcial** (`pending`): concepto que aplica al **hábito completo** (usado por Dashboard/Rutina vía `dayCompleted`) — no cuenta como cumplido ni como falta, **no rompe la racha** (ADR-008). La **Vista Grid** ya no representa este estado como celda parcial: al mostrar una fila por ocurrencia, cada celda es simplemente hecha/no hecha para esa `daytime` específica.

### 4.2 Racha con `maxGap` (portado de HT21 + frecuencia)

Algoritmo por hábito, sobre el rango visible de fechas:

1. **Pass 1 — marcar días**: por cada fecha del rango:
   - `scheduled = isScheduled(habit, fecha)`; si no es programado → celda neutral (no rompe racha).
   - `ticked = dayCompleted(habit, fecha)`; un día **parcial** (alguna ocurrencia pero no todas) es **neutral para la racha** (no rompe ni cuenta; ADR-008) — esto aplica al cómputo **agregado por hábito** (Dashboard); la **Grid** calcula la racha por ocurrencia directamente (`completions[date].includes(daytime)`), sin estado parcial. Si no está marcado, `scheduled` es true y `maxGap > 0`, se marca como `gap` cuando queda **entre dos entries consecutivos** cuya separación `<= maxGap + 1`.
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
- **Resolución de `completions`**: si `fm.completions` es un objeto válido → `ICompletions` (claves ISO válidas; valores filtrados contra `habit.daytimes`, sin duplicados). Si falta o es inválido → `{}`.
- **Migración legacy**: si **no hay `completions`** pero sí `entries` legibles, se sintetiza en memoria `completions[date] = [...habit.daytimes]` (el día queda "completo", no se pierden rachas); el archivo se migra formalmente en el primer write (§5.2).
- **Resolución de `entries` (espejo)**: al final del parse, `IHabit.entries` se **deriva** de `completions` (`dayCompletedDates`), no se confía en el valor en disco (siempre coherente; ver §5.2).
- **Normalización de `area`**: slugificar (`toLowerCase`, espacios→`-`, `intelectual`→`intellectual`) y validar contra `HABIT_AREAS`; desconocido → `temporal` + warn.
- **Normalización de `frequency`**: tokens y nombres → `Set<number>` ISO (ver §2.5); ausente/inválido → `{1..7}`.
- **Normalización de `priority`**: `parseInt` + clamp `1..5`; ausente/inválido → `3`.

### 5.2 Escritura (toggle por ocurrencia)

La escritura canónica es por **ocurrencia**; el espejo `entries` se re-deriva y se persiste en la **misma transacción** (nunca divergen):

```ts
// toggle de UNA ocurrencia (date, daytime) — helper puro: habit-completions.ts
function toggle(completions: ICompletions, h: { daytimes: Daytime[] }, date: string, daytime: Daytime): ICompletions {
  const next = new Set(completions[date] ?? []);
  next.has(daytime) ? next.delete(daytime) : next.add(daytime);
  const out = { ...completions, [date]: h.daytimes.filter((dt) => next.has(dt)) };
  if (out[date].length === 0) delete out[date];
  return out;
}

// write-back: persistir completions + re-derivar el espejo entries (habit-writer.ts)
await app.fileManager.processFrontMatter(file, (fm) => {
  fm["completions"] = completions;
  fm["entries"] = dayCompletedDates(completions, habit).sort();  // espejo HT21 (§2.3)
});
```

> **Nota sobre la edición del hábito**: el modal de edición usa una escritura única con `vault.process` para actualizar frontmatter y descripción juntos. No debe combinar `processFrontMatter` con un `vault.process` posterior sobre el mismo guardado: ese patrón podía duplicar el bloque YAML (`---...---`) y dejar el frontmatter anterior como contenido de la nota. La escritura actual reconstruye un solo bloque y repara duplicados existentes al editar.

- **Grid**: cada hábito se expande en **una fila por `daytime`** (ej. `dog time (morning)`, `dog time (afternoon)`); el clic en cualquiera de esas filas llama `toggleOccurrence(date, esaDaytime)` directo — sin popover, sin ambigüedad. El día del hábito se marca completo (`dayCompleted`, espejo `entries`) solo cuando **todas** sus filas/ocurrencias quedan marcadas (§2.7).
- No se toca ningún otro campo del frontmatter (preservación de metadata). En una nota **legacy** (sin `completions`), el primer write además **migra** el campo (§5.1).
- Después de escribir, emitir evento de refresco y permitir que el `modify` listener recargue (guardia anti-bucle).

## 6. Decisiones de diseño (ADR)

### ADR-001 — Granularidad por daytime (ocurrencias)

- **Problema**: varios hábitos aparecen varias veces al día (`daytime: [wake up, ...]`; p. ej. `higiene dental` [4], `pray time` [3], `relatives` [3], `work out` [2]) y la nota diaria ya distingue por ocurrencia (`<habito>-<area>-<daytime>`). Un `entries` de fechas puras no puede representar "hice la de la mañana pero no la de la tarde".
- **Decisión (revisada)**: la **fuente canónica** es `completions = { "YYYY-MM-DD": [daytime, ...] }` (§2.7). El "día cumplido" = `dayCompleted` (todas las ocurrencias). `entries` se conserva **top-level** como **espejo HT21 day-level** autosincronizado (ADR-007), nunca divergente.
- **Racional**: permite marcar ocurrencias individuales (grid con **una fila por daytime** + rutina), mantiene la compatibilidad con el plugin HT21 y migra los `entries` legados (fecha → todas las daytimes) sin perder rachas.

### ADR-002 — Notas diarias de seguimiento (`habit tracker/`)

- **Problema**: el seguimiento actual vive en notas por día con toggles meta-bind y métricas `pb*`.
- **Decisión v1**: esas notas **no** se leen ni se escriben desde el plugin para evitar conflictos de doble fuente. El plugin escribe en `entries` de la nota del hábito.
- **Nota**: la plantilla `config/templates/daily routine.md` seguirá funcionando para el flujo de la nota diaria; la escritura dual (entries + toggle de la daily) queda como integración futura con estrategia de conflicto definida.

### ADR-003 — Color y tema

- Resolución de color de un hábito: `fm.color` → `userSettings.color` (por tracker) → `settings.habitDefaultColor` → variable de tema `--interactive-accent` / `--checkbox-color`.
- Validar con técnica `isValidCSSColor` (crear elemento, asignar `style.color`, comprobar que no quede vacío).

### ADR-004 — Área como string libre (revisado, ya no es enum)

- **Decisión original (v1)**: `area` se fijaba como **enum de 10 slugs en inglés** (`daily-plan…temporal`) validado por el parser.
- **Decisión revisada (implementación actual)**: `area` es el **string libre** que traiga `frontmatter.area` (fallback `'temporal'` si falta). El parser **ya no valida ni normaliza alias** contra una lista cerrada. El combobox del Habit Editor sugiere valores tomados de las **carpetas raíz del vault** (`HabitManager.getVaultRootFolders()`) más las áreas ya usadas, pero cualquier texto es aceptado.
- **Racional del cambio**: el enum fijo obligaba a decidir de antemano una taxonomía cerrada (bloqueando casos como `misc`) y no se adaptaba a la organización real (carpetas tipo PARA) de cada vault. Con string libre + color/etiqueta con fallback determinístico (`getAreaColor`/`getAreaLabel`, ADR-003-bis) se mantiene la consistencia visual sin imponer una lista cerrada.
- **`subArea` fue eliminado y reemplazado por `relatedFile`** (§2.4-bis): en vez de una subcategoría de texto libre, el hábito enlaza una nota real del vault como wikilink — el campo `related` (wikilink) que este documento planeaba originalmente quedó implementado bajo el nombre `relatedFile`.
- **Ya no aplica**: la migración forzosa de hábitos `misc` a un slug del enum — un `area: misc` es simplemente un área más, sin decisión pendiente.

### ADR-005 — Frecuencia como días programados

- **Decisión**: `frequency` en YAML con tokens (`everyday`/`workweek`/`weekend`) o lista de nombres; internamente `Set<number>` ISO. Los **días no programados son neutrales**: ni cuentan ni rompen racha.
- **Racional**: coherente con `luxon.weekday` y con la rutina actual (actividades distintas por día); evita castigar automáticamente hábitos "de fin de semana" o "laborales".

### ADR-006 — Prioridad y ponderación

- **Decisión**: `priority: 1..5` (default `3`); el cumplimiento % (día/área/daytime) se **pondera** por prioridad además del crudo.
- **Racional**: que los hábitos críticos pesen más al evaluar el día, sin borrar la métrica simple.

### ADR-007 — Compatibilidad Habit Tracker 21 (campos top-level + espejo)

- **Decisión**: los campos de la extensión HT21 se **dejan como están** en el frontmatter (top-level: `title`, `color`, `maxGap`, `entries`). `entries` cambia de rol a **espejo day-level** autosincronizado (fechas con el día completo), derivado de `completions` (§5.2).
- **Racional**: no se reestructura el YAML de las notas existentes; los code blocks `#habittracker` de [[habit tracker]] siguen leyendo `entries` y funcionan; en el plugin la lectura canónica es `completions`, sin doble fuente desincronizada. Decisión de usuario: "dejar los campos HT21 como están".

### ADR-008 — Día completo vs. día parcial (rachas y %)

- **Problema**: con varias daytimes un día puede quedar **parcialmente** cumplido (p. ej. 1 de 3 ocurrencias).
- **Decisión**: rachas y % **solo cuentan días completos** (`dayCompleted` = todas las ocurrencias) a nivel de **hábito agregado** (Dashboard/Rutina). Un día **parcial no rompe la racha** pero tampoco suma. La **Vista Grid** no necesita representar este estado visualmente: al mostrar una fila por ocurrencia, no existe la noción de "parcial" dentro de una fila (está hecha o no).
- **Racional**: no castigar el esfuerzo parcial (mantiene la racha viva) ni inflar métricas (no suma al %); semántica acordada en diseño.

## 7. Casos límite (resiliencia)

Provenientes de `test-vault/broken-habits/` de HT21:

| Caso | Comportamiento v1 |
|---|---|
| YAML corrupto / malformado | El hábito se omite; aviso en consola (debug). No rompe el grid. |
| `entries` con fechas inválidas | Se descartan al parsear. |
| `entries` duplicadas | Set → se eliminan. |
| Sin frontmatter | Se trata como hábito con `completions: {}` / `entries: []`. |
| Sin `entries` | Se asume `[]`. |
| Sin `completions` | Se asume `{}` (o se sintetiza desde `entries` legacy → migración §5.1). |
| `completions` mal formado (no objeto / valores no array) | Se ignora el campo → fallback legacy o `{}`. |
| `completions[date]` con daytimes fuera de `habit.daytime` | Se descartan al parsear. |
| `completions[date]` con array vacío | La clave se elimina al escribir. |
| Día parcial (≥1 ocurrencia, sin cubrir todas) | A nivel de hábito agregado (Dashboard/Rutina): "en progreso", no rompe racha ni cuenta en el % (ADR-008). En la Grid no aplica (cada fila es una sola ocurrencia). |
| `area` desconocido | Slugify y validar; si falla → `temporal` + warn en consola. |
| `frequency` ausente/inválido | `everyday` (`{1..7}`). |
| `frequency` con tokens mezclados (`[workweek, saturday]`) | Se ignora el token no soportado dentro de una lista; si queda vacía → `everyday`. |
| `priority` ausente/no numérico/fuera de rango | `3`, clamp a `1..5`. |
| Rutina: hábito sin `daytime` | Se asume en `morning` para la vista de rutina (advertencia visual). |
| Ruta inexistente | Estado "No habits found at '{ruta}'" en la vista. |
| Nombre con caracteres especiales | OK (por basename). |
| Zona horaria / DST | Trabajar siempre con fechas **locales** `yyyy-MM-dd` (no UTC) para evitar `ticked` de un día diferente. |

## 8. Periodo activo, vacaciones y frecuencias con días no laborables (v1.1.15 — periodo activo (§8.1 a §8.3) y vacaciones (§8.4 y §8.5) implementados el 2026-11-09 en `src/habits/habit-calendar.ts`; frecuencias (§8.6) en NL2)

Decidido el 2026-11-02. Añade dos campos opcionales al frontmatter (`from`, `until`), una lista global de vacaciones en los ajustes y un cambio en cómo se resuelven los tokens de `frequency`. Comportamiento visible en [[Especificación de vistas]] §12; mecanismo en [[Arquitectura técnica]] §10. Lo descrito aquí existe en `src/habits/`; los nombres que aún digan «por crear» o «propuesta» son los de lo que falta.

### 8.1 Campos nuevos de la nota (frontmatter)

| Campo | Tipo | Uso | Obligatorio |
|---|---|---|---|
| `from` | string `AAAA-MM-DD` | Primer día en que el hábito está activo | No |
| `until` | string `AAAA-MM-DD` | Último día en que el hábito está activo | No |

```yaml
status: inactive          # el plugin lo escribe al desactivar…
until: 2026-11-02         # …junto con `until` = hoy; al reactivar se borra `until`
from: 2026-03-01          # opcional
```

Las claves van en inglés (`from`, `until`), como el resto del frontmatter del hábito (decidido el 2026-11-09; en las primeras pruebas se llamaron `desde` y `hasta`, que ya no se leen).

- Lectura: igual que `entries` (§2.3): solo se aceptan cadenas `AAAA-MM-DD`; cualquier otro valor se ignora y el campo cuenta como ausente.
- **Sin ninguna de las dos fechas el hábito se comporta como hoy** (activo si `status` no es `inactive`).
- Un solo periodo por hábito; no hay lista de periodos.
- La escritura la hace el Habit Creator (`vault.process`, [[Especificación de vistas]] §9) junto con el resto del frontmatter; `habit-writer.ts` (toggle de `completions`/`entries`) **no cambia**.

### 8.2 Interfaz TypeScript

```ts
// src/habits/habit.ts — campos nuevos
export interface IHabit {
  // ...existentes (§3)
  activeFrom: string | null;   // fm.from válido o null
  activeUntil: string | null;  // fm.until válido o null
}

// src/habits/habit-calendar.ts (funciones puras, sin `obsidian`)
export interface IHabitVacation { from: string; to: string; name?: string }   // fechas ISO inclusivas
export interface IHabitCalcContext { vacations: readonly IHabitVacation[] }   // NO_VACATIONS = { vacations: [] }

// settings (data.json): habitVacations: IHabitVacation[]  — defecto []

// campos nuevos de salida para las vistas
interface IHabitCell    { /* ...§3 */ vacation: boolean; vacationName?: string; markable: boolean }
interface IHabitDayStat { /* ...§3 */ vacation: boolean; vacationName?: string }   // día de vacaciones del heatmap
```

`markable` indica que la celda se puede marcar: el día toca por frecuencia y cae en el periodo activo, **aunque sea de vacaciones**. Hace falta porque una celda de vacaciones sin marcar es neutral (`scheduled = false`, no cuenta) y, sin `markable`, la Cuadrícula y el Semanal la deshabilitarían como a un día no programado.

### 8.3 Periodo activo: `isActiveOn`

```ts
// por crear — habit-calendar.ts; las fechas ISO se comparan como cadenas
export function isActiveOn(h: Pick<IHabit, 'status' | 'activeFrom' | 'activeUntil'>, date: string): boolean {
  if (h.status === 'inactive' && !h.activeUntil) return false;   // comportamiento actual
  if (h.activeFrom && date < h.activeFrom) return false;
  if (h.activeUntil && date > h.activeUntil) return false;
  return true;
}
```

| `status` | `from` / `until` | Activo en la fecha `d` |
|---|---|---|
| `active` | ninguna | Siempre (igual que hoy) |
| `active` | `from` y/o `until` | `from ≤ d ≤ until` (extremos ausentes = sin límite) |
| `inactive` | sin `until` | Nunca (igual que hoy: ni filas ni porcentajes) |
| `inactive` | con `until` | `d ≤ until` (y `d ≥ from` si existe): así desactivar hoy no cambia el historial |

> **ADR-DM1 — `status: inactive` con `until` sigue contando en el historial**: hoy `HabitManager.getHabits()` descarta los inactivos y el porcentaje de fechas pasadas cambia retroactivamente. Decisión: el plugin, al desactivar, escribe `status: inactive` **y** `until` = hoy; el cálculo histórico usa una lista que incluye los inactivos con `until` (por crear: `HabitManager.getHabitsForStats()`), y cada día se filtra con `isActiveOn`. Las filas de Grid, Semanal y Rutina siguen saliendo de `getHabits()` (solo `status` activo). Racional: no rompe ninguna vista existente y las notas antiguas sin fechas no cambian.

### 8.4 Vacaciones

- **Fuente única**: `habitVacations` en `data.json` (ajustes del plugin, sincronizado entre dispositivos), nunca en las notas de hábito ni en `localStorage`.
- Un periodo es `{ from, to, name? }`, fechas ISO **inclusivas**. Los solapados se dejan como están: un día es de vacaciones si cae en alguno. Al leer `data.json`, `sanitizeVacations()` descarta las filas que no son objetos, con fechas inválidas o con `to < from`, y recorta el nombre; la pantalla de ajustes rechaza un `to` anterior a `from` al editarlo.
- `findVacation(vacations, date)` devuelve el periodo que contiene la fecha o `null`; es lo que alimenta el atenuado, el icono y el tooltip con el nombre.

### 8.5 Regla de cálculo: cuándo cuenta un día

Hoy «cuenta» un día de un hábito si está **programado** (`isScheduled`, §2.5). Pasa a contar si además está **activo** y, en vacaciones, solo si está **marcado**:

```ts
// habit-calendar.ts. `done` = la ocurrencia (o el día completo, según el agregado) está marcada
export function countsOn(habit, date: DateTime, done = false, ctx: IHabitCalcContext = NO_VACATIONS): boolean {
  const iso = date.toISODate()!;
  if (!isScheduled(habit, date) || !isInPeriod(habit, iso)) return false;  // neutral, como un día no programado
  return done || findVacation(ctx.vacations, iso) === null;                // vacaciones: solo si está marcado
}
```

`countsOn()` no mira `status` (ver HA1): quien arma la lista de hábitos ya decidió cuáles entran. Sin `ctx` no hay vacaciones, así que el comportamiento anterior a HV1 se conserva.

| Día | Hábito sin marcar | Hábito marcado |
|---|---|---|
| Normal, programado y activo | Cuenta como **incumplido** | Cuenta como **cumplido** |
| Vacaciones, programado y activo | **Neutral**: no rompe ni suma a la racha, no entra en el denominador | Cuenta como **cumplido solo para ese hábito**: suma a su racha y entra en su porcentaje |
| No programado, o fuera del periodo activo | Neutral | Neutral (queda en `completions`, no afecta a stats ni rachas; ADR-005) |

**Dónde se aplica** (las fórmulas de §4 cambian solo el criterio del denominador):

- **§4.1 / §4.2 Racha**: en `computeCells`, `computeStats`, `computeOccurrenceCells` y `computeOccurrenceStats`, los días que no cuentan se tratan como los no programados (no abren, no cierran ni cuentan la racha; no consumen `maxGap`). Un día de vacaciones marcado es un `ticked` normal.
- **§4.3 % por área y por daytime (crudo y ponderado)** y **§4.4 % de ventana y heatmap**: el denominador son las ocurrencias/hábitos para los que `countsOn` es verdadero. Un día de vacaciones sin ninguna marca queda con denominador 0 y se marca `vacation: true` (el heatmap lo atenúa en lugar de pintarlo como 0 %).
- **Día parcial** (ADR-008): sigue siendo neutral; en vacaciones también.
- **Hábito con varias daytimes**: la regla se evalúa por **ocurrencia** en los agregados por daytime/área y en las filas de la Grid, y por **día completo** (`dayCompleted`) en los agregados por hábito.

> **ADR-DM2 — Marcar en vacaciones cuenta solo para ese hábito**: el denominador del día incluye únicamente los hábitos marcados, nunca los demás. Racional: ver ADR-VAC1 en [[Especificación de vistas]] §12.2. Consecuencia: un día de vacaciones con una sola marca puede mostrar 100 % para ese día.

### 8.6 Frecuencias que siguen los días no laborables

`frequencyToSet` (en el código, `normalizeFrequencySet()` de `habit-parser.ts`) recibe ahora el conjunto de días no laborables del ajuste de [[Especificación de vistas]] §12.3 (por crear en NL1; nombre propuesto `nonWorkingDays: number[]`, ISO 1–7, defecto `[6, 7]`):

| Token | Hoy | Desde v1.1.15 |
|---|---|---|
| `everyday` | `{1..7}` | Sin cambio |
| `weekend` | `{6, 7}` fijo | `nonWorkingDays` |
| `workweek` | `{1..5}` fijo | `{1..7} \ nonWorkingDays` |
| Lista de nombres (`[monday, wednesday]`) | `{…}` | Sin cambio |

- El Habit Creator sustituye su constante `FREQUENCY_PRESETS` (`weekend: [6, 7]`, `workweek: [1..5]`) por los mismos conjuntos calculados, y `resolveFrequencyMode()` compara contra ellos al editar.
- **El token se guarda tal cual** en `frequency`; el conjunto se **resuelve al leer** (`parseHabit` ya recibe `settings`). Al cambiar el ajuste hay que re-parsear los hábitos (`HabitManager.refreshHabits()` y evento `obsidian-agenda:habits-refresh`), porque `IHabit.frequencySet` se calcula en el parseo.
- Con el ajuste por defecto el conjunto es idéntico al actual; con otro, cambia el historial de rachas y porcentajes de los hábitos `weekend`/`workweek` (por eso el aviso).
- **Resuelto el 2026-11-03**: el ajuste exige al menos un día marcado y uno sin marcar (ver [[Especificación de vistas]] §12.6 y `docs/agenda-tasks/Especificación de vistas.md` §21.1), así que no existen el conjunto vacío de `weekend` ni el de `workweek`; el caso de «conjunto vacío cae a `{1..7}`» deja de poder darse por esta vía.

> **ADR-DM3 — Los tokens se resuelven al leer, no al escribir**: no se reescriben las notas al cambiar el ajuste. Racional: una sola fuente de verdad (el ajuste) y cero migraciones. Alternativa descartada: guardar la lista de días en cada nota (rompería la semántica de «Fin de semana» y exigiría migrar).

### 8.7 Casos límite

| Caso | Comportamiento (propuesto) |
|---|---|
| `from` > `until` | El hábito nunca está activo; el Habit Creator lo impide al guardar con validación inline. |
| `until` < hoy con `status: active` (editada a mano) | Activo hasta `until`; la fila sigue saliendo (el `status` manda para las filas, ADR-DM1). |
| Reactivar un hábito | Se borra `until`; `from` se conserva. El hueco entre `until` y hoy cuenta como días sin cumplir. |
| Fecha de vacaciones inexistente (`2026-02-30`) | Se descarta el periodo. |
| Vacaciones vacías o ausentes en `data.json` | `[]` (comportamiento actual). |
| Vacaciones sobre un día no programado | Neutral de todos modos (§8.5). |
| Frecuencia en lista de nombres con ajuste modificado | No cambia. |

### 8.8 Impacto en `IHabitDayStat` y el heatmap

`computeHistory30d`, `computeYearHistory` y `computeDashboard` (`habit-stats.ts`) reciben `IHabitCalcContext` y la lista de `getHabitsForStats()`. `IHabitDayStat` gana `vacation: boolean`. Cuando el heatmap migre al componente reutilizable (HM1, v1.1.16), esa marca debe poder expresarse sin que el componente sepa de hábitos ([[Arquitectura técnica]] §10.8).