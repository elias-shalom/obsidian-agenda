---
name: "Plan de implementación - Habit Tracker Agenda"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: daily-routine
archetype: engineer
status: active
related:
  - "[[README]]"
  - "[[Arquitectura técnica]]"
  - "[[Especificación de vistas]]"
created: 2026-09-21
tags:
  - obsidian-agenda
  - documentation
  - plan
---

# Plan de implementación — Módulo Habit Tracker en obsidian-agenda

> Repo: `C:\Code\obsidian\obsidian-agenda`. Pre-requisito de lectura: `docs/mejores-practicas.md`, `docs/todo.md` y los documentos [[README]] / [[Arquitectura técnica]].

## Fase 0 — Preparación raíz (sin lógica)

- [ ] `src/habits/` creado con barrel `index.ts`.
- [ ] Tipos y enums en `src/habits/habit.ts` (interfaces del [[Modelo de datos]] §3, incluye `HabitArea`, `frequencySet`, `priority`).
- [ ] Extender `AgendaPluginSettings` + defaults ([[Arquitectura técnica]] §4).
- [ ] Claves de i18n en los **6** locales (`en`, `es`, `de`, `fr`, `it`, `pt`).
- [ ] Ficheros SCSS `_habit-grid.scss`, `_habit-routine.scss`, `_habit-overview.scss`, `_habit-weekly.scss`, `_habit-table.scss` creados (vacíos o con el namespace base) e importados en `styles.scss`.

**Verificar**: `npm run build`, `npm run lint`.

## Fase 1 — Data layer + motor de rachas (sin UI)

- [ ] `habit-parser.ts`: lee `metadataCache`/`vault.read`, valida `completions` (+ **migración legacy `entries`** → `completions` sintética), resuelve `maxGap`/`color`/`title`, filtra activos, resiliencia (casos del §7 Modelo de datos).
- [ ] **Normalización de nuevos campos**: `slugifyArea` (enum `HabitArea`, alias, fallback), `frequencyToSet` (tokens/nombres → `Set<number>` ISO), `clampPriority` (1–5, default 3), `subArea`, `parseCompletions` ([[Arquitectura técnica]] §2.6).
- [ ] `habit-streak.ts`: port TS del bloque `renderedDates` de HT21 → `computeCells` + `computeStats`, **con `isScheduled`** (los días no programados son neutrales; racha salta esos días) y **`dayCompleted`** (días parciales neutrales, ADR-008).
- [ ] `habit-stats.ts`: stats por área/daytime y ventanas (7/21/30 días) y `computeDashboard` con `pctWeighted` (`Σ done.priority / Σ scheduled.priority`).
- [ ] `habit-completions.ts` (helpers puros: `dayCompleted`, `occurrencesFor`, `toggle`, `dayCompletedDates`) + `habit-writer.ts` (write-back que persiste `completions` y **re-deriva `entries`**).
- [ ] `habit-manager.ts`: cache + eventos vault (`create/delete/rename/modify`) + timer de medianoche + evento de refresco global + `openEditor`.
- [ ] Tests unitarios (si la configuración del repo lo permite) para `habit-streak` con fixtures de HT21 (incluye casos `gap`, deadline, DST) **y frecuencia/ocurrencias** (`workweek` no rompe racha el fin de semana; toggle en día no programado no cuenta; `dayCompleted` con multi-daytime; día parcial no rompe racha; migración legacy).

**Verificar**: `npm run build`; script de humo en `test-vault` (reabrir plugin, log de `getHabits()`).

## Fase 2 — Habit Creator (modal de crear/editar)

- [ ] `habit-editor.ts`: `HabitEditorModal` (`obsidian.Modal`) con formulario completo (name, title, description, time, area, subArea, frequency, priority, daytime, status, maxGap, color) — spec [[Especificación de vistas]] §9.
- [ ] **Crear**: `app.vault.create` de `name.md` en `habitFolderPath` (defaults `frequency: everyday`, `priority: 3`, `status: active`); aplica opcionalmente la plantilla `habit.md`.
- [ ] **Editar**: `processFrontMatter` preservando `completions`/`entries`; `fileManager.rename` si cambia el basename; borrado con confirmación.
- [ ] Validación (unicidad de nombre, clamps) + `Notice` de errores; `obsidian-agenda:habits-refresh` al guardar.
- [ ] Disparadores: comandos `oa-habit-new`/`oa-habit-edit`, botón `+` en el header de hábitos, doble-clic en la Lista.
- [ ] SCSS `_habit-form.scss`.

**Verificar**: crear y editar un hábito de prueba en el test vault; los cambios se reflejan en el grid tras refresco.

## Fase 3 — Vista Grid (HT21) — MVP accionable

- [x] `habit-grid-view.hbs` + `habit-grid-view.ts` (patrón BaseView), registro en `TEMPLATE_LOADERS`, `views/index.ts`, `ViewManager`, marcador de tab en `header.hbs`, `attachEventTabs`.
- [x] Escucha de clics → `HabitManager.toggleOccurrence` → refresh optimista; reconciliación con `modify`.
- [x] **Multi-daytime resuelto con una fila por ocurrencia** (`Hábito (daytime)`), en vez de popover: cada fila calcula su propia racha/celdas con `computeOccurrenceCells`/`computeOccurrenceStats` y togglea directo, sin UI adicional.
- [x] Celdas **no programadas** (`--oa-unscheduled`) habilitadas con `scheduled:false` (toggle permitido, no afecta stats).
- [x] Navegación de ventana de días (`◀ ▶`), tooltips, streak y deadline, col % (sobre días programados).
- [x] Rachas consecutivas fusionadas visualmente en una **píldora** redondeada (`--run-single/start/middle/end`), con el conteo mostrado al final de cada racha de 2+ días.
- [x] Orden configurable de filas: alfabético, área, daytime, prioridad, racha, % de cumplimiento (selector en el toolbar).
- [x] SCSS `_habit-grid.scss` completo (sticky col, scroll horizontal, estados `--oa-ticked/gap/deadline/unscheduled`, fusión de píldoras, sombreado de fila alterna).
- [x] Empty states y ruta inexistente.
- [ ] ~~Celdas parciales (`--oa-partial`, `◐`)~~ — **ya no aplica**: al mostrar una fila por ocurrencia, no existe estado intermedio dentro de una fila.

**Verificar**: probar en test vault con `habitFolderPath` real → la grid muestra ~36+ filas (una por hábito de 1 daytime, o una por ocurrencia en multi-daytime) con sus `completions` (migrados desde `entries` el primer write).

## Fase 4 — Vista Rutina diaria

- [ ] `habit-routine-view.hbs/.ts`: secciones por daytime, **solo hábitos programados ese día**, **orden por `priority` desc** + badge, checkboxes interactivos (**toggle por ocurrencia** — cada fila ya está expandida por su daytime), navegación de día, barras de progreso por daytime y área (crudo + tooltip ponderado); día parcial muestra "en progreso" (ADR-008).
- [ ] SCSS `_habit-routine.scss`.
- [ ] Integración del `pb`/% y del **% ponderado** sobre el día seleccionado.

**Verificar**: togglar desde la rutina y ver el cambio reflejado en el grid y en la nota.

## Fase 5 — Dashboard / Overview

- [ ] `habit-overview-view.hbs/.ts`: cards (hoy crudo + **hoy ponderado**, rachas globales, nº hábitos), % ponderado por **enum de áreas** y por daytime, barras ponderadas de 30 días.
- [ ] SCSS `_habit-overview.scss` (reusar widget cards).

**Verificar**: valores coherentes con un día marcado a mano.

## Fase 6 — Semanal + Lista/Tabla

- [ ] `habit-weekly-view` (matriz 7 días, reutiliza celdas/filas por ocurrencia de la Grid; días no programados → `·`).
- [ ] `habit-table-view` (sortable incl. prioridad/frecuencia, clicks abren nota — y doble-clic el **Habit Editor**, columna Área localizada + SubÁrea).
- [ ] SCSS correspondientes.
- [ ] Comando/ribbon opcionales.

**Verificar**: `npm run build`, `npm run lint`, smoke de todas las tabs en desktop y sidebar (tema claro/oscuro).

## Fase 7 — Cierre

- [ ] i18n audit (sin keys sueltas; incluye 10 áreas + tokens frecuencia + prioridad + **editor** + etiquetas de daytime + opciones de orden).
- [ ] Migración de notas de hábito al nuevo esquema (`area` enum + `subArea` + `frequency` + `priority` + **`entries`→`completions`/espejo**) — pendiente de decisión del destino de `misc` (ADR-004).
- [ ] `docs/todo.md` actualizado (desmarcar tareas de v1.1.0 según estado).
- [ ] Changelog/MANIFEST bump si corresponde.
- [ ] Prueba de escritura en vault real (hacer toggle en un hábito de prueba y revertir).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| DST/zona horaria rompe "ticked de hoy" | Fechas siempre locales (`luxon DateTime.local().toFormat('yyyy-MM-dd')`). |
| Bucles de refresco por `modify` propio | Flag `writing` + comparar hash; reconciliar una sola vez. |
| Rendimiento del grid con muchos días | Re-render por caché y `vault.getAbstractFileByPath` barato; `daysToShow` configurable. |
| Temas que rompen colores de celda | Resolución ADR-003 + `color-mix` y variables de tema. |
| Conflicto con plugin Habit Tracker 21 (comparten `entries`) | `entries` es **espejo** derivado de `completions` y se escribe en la misma `processFrontMatter` (ADR-001/007); test de idempotencia (write → re-read → mismo estado). |
| Doble fuente `completions`/`entries` desincronizada | `entries` siempre se re-deriva de `completions` al escribir; el parser nunca confía en `entries` si hay `completions`. |
| `frequency` no reflejado en rachas/% (inconsistencia) | `isScheduled` centralizado en el modelo; tests específicos (workweek/weekend). |
| Zona horaria al computar el weekday | `DateTime.local()` con `weekday` ISO; nunca UTC. |
| Multi-daytime con muchas filas alarga la Grid | Aceptado: cada ocurrencia es una fila real, más legible que un popover; el orden por área/daytime ayuda a agrupar visualmente. |
| Hábitos `misc` sin migrar | No bloquea: el parser asigna fallback (`temporal`) con warn; migración formal pendiente (ADR-004). |
| Cambios de vault concurrentes (sync) | Ignorar errores de `cache` estaleado + re-intento único tras `modify`. Listener `offref` limpio en `onunload`. |

## Orden de commits sugerido

1. `feat(habits): types, settings, i18n y ediciones base` (Fase 0)
2. `feat(habits): data layer + streak engine + completions` (Fase 1)
3. `feat(habits): habit editor modal (crear/editar)` (Fase 2)
4. `feat(habits): vista grid HT21` (Fase 3)
5. `feat(habits): vista rutina diaria` (Fase 4)
6. `feat(habits): dashboard overview` (Fase 5)
7. `feat(habits): vistas semanal y lista` (Fase 6)