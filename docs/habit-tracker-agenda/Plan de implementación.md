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

- [x] `src/habits/` creado con barrel `index.ts`.
- [x] Tipos y enums en `src/habits/habit.ts` (interfaces del [[Modelo de datos]] §3, incluye `frequencySet`, `priority`; `HabitArea` es ahora `string`, ver §2.4 revisado).
- [x] Extender `AgendaPluginSettings` + defaults ([[Arquitectura técnica]] §4).
- [x] Claves de i18n en los **6** locales (`en`, `es`, `de`, `fr`, `it`, `pt`).
- [x] Ficheros SCSS `_habit-grid.scss`, `_habit-routine.scss`, `_habit-overview.scss`, `_habit-weekly.scss`, `_habit-table.scss` creados e importados en `styles.scss` (+ `_habit-form.scss` para el editor, no previsto originalmente).

**Verificar**: `npm run build`, `npm run lint`.

## Fase 1 — Data layer + motor de rachas (sin UI)

- [x] `habit-parser.ts`: lee `metadataCache`/`vault.read`, valida `completions` (+ **migración legacy `entries`** → `completions` sintética), resuelve `maxGap`/`color`/`title`, filtra activos, resiliencia (casos del §7 Modelo de datos).
- [x] **Normalización de campos**: `frequencyToSet` (tokens/nombres → `Set<number>` ISO), `clampPriority` (1–5, default 3), `subArea`, `parseCompletions` ([[Arquitectura técnica]] §2.6). **`area` ya no se normaliza/valida** (string libre, fallback `temporal`) — cambio respecto al plan original.
- [x] `habit-streak.ts`: port TS del bloque `renderedDates` de HT21 → `computeCells` + `computeStats` (+ `computeOccurrenceCells`/`computeOccurrenceStats` para filas por ocurrencia), **con `isScheduled`** (los días no programados son neutrales; racha salta esos días) y **`dayCompleted`** (días parciales neutrales, ADR-008).
- [x] `habit-stats.ts`: stats por área/daytime y ventanas (30 días + `computeYearHistory` para el heatmap anual, no previsto originalmente) y `computeDashboard` con `pctWeighted` (`Σ done.priority / Σ scheduled.priority`).
- [x] `habit-completions.ts` (helpers puros: `dayCompleted`, `occurrencesFor`, `toggle`, `dayCompletedDates`) + `habit-writer.ts` (write-back que persiste `completions` y **re-deriva `entries`**).
- [x] `habit-manager.ts`: cache + eventos vault (`create/delete/rename/modify`) + evento de refresco global + `openEditor` + `getVaultRootFolders()` (sugerencias de área).
- [ ] **Timer de medianoche** — sigue sin implementarse; el refresco depende de eventos de vault o del evento global manual.
- [ ] Tests unitarios — siguen sin existir en el repo.

**Verificar**: `npm run build`; validado en esta sesión repetidamente, sin script de humo formal en `test-vault`.

## Fase 2 — Habit Creator (modal de crear/editar)

- [x] `habit-editor.ts`: `HabitEditorModal` con formulario (name, description, time **[dial circular]**, area **[select dinámico de carpetas]**, subArea, frequency, priority **[slider]**, daytime, status **[switch]**, maxGap **[slider]**, color **[default = acento del tema]**) — más rico que el spec original; sin campo `title` (se quitó por redundante con `name`).
- [x] **Crear**: `app.vault.create` de `name.md` en `habitFolderPath` (defaults `frequency: everyday`, `priority: 3`, `status: active`).
- [ ] Plantilla `habit.md` opcional en el cuerpo — no implementada.
- [x] **Editar**: `processFrontMatter` preservando `completions`/`entries`; `fileManager.renameFile` si cambia el basename; borrado con confirmación de dos clics.
- [x] Validación (unicidad de nombre, clamps) + `Notice` de errores; `obsidian-agenda:habits-refresh` al guardar.
- [x] Disparadores: comandos `oa-habit-new`/`oa-habit-edit`, botón `+` en el header (las 5 vistas), click en el nombre (Grid/Weekly), doble-clic en fila (Lista/Tabla), botón "Edit habit" (Rutina).
- [x] SCSS `_habit-form.scss`.

**Verificar**: crear y editar un hábito de prueba en el test vault; los cambios se reflejan en el grid tras refresco.

## Fase 3 — Vista Grid (HT21) — MVP accionable

- [x] `habit-grid-view.hbs` + `habit-grid-view.ts` (patrón BaseView), registro en `TEMPLATE_LOADERS`, `views/index.ts`, `ViewManager`, marcador de tab en `header.hbs`, `attachEventTabs`.
- [x] Escucha de clics → `HabitManager.toggleOccurrence` → refresh optimista; reconciliación con `modify`.
- [x] **Multi-daytime resuelto con una fila por ocurrencia** (`Hábito (daytime)`), en vez de popover: cada fila calcula su propia racha/celdas con `computeOccurrenceCells`/`computeOccurrenceStats` y togglea directo, sin UI adicional.
- [x] Celdas **no programadas** (`--oa-unscheduled`) habilitadas con `scheduled:false` (toggle permitido, no afecta stats).
- [x] Navegación de ventana de días (`◀ ▶`), tooltips, streak y deadline, col % (sobre días programados).
- [x] Rachas consecutivas fusionadas visualmente en una **píldora delgada** (`--run-single/start/middle/end`), con círculo más grande para días sueltos, conteo mostrado al final de cada racha de 2+ días; color de `deadline` ligado a `--habit-color`.
- [x] Orden configurable de filas: alfabético, área, daytime, prioridad, racha, % de cumplimiento (selector en el toolbar).
- [x] Nombre del hábito como link que abre el Habit Editor precargado.
- [x] SCSS `_habit-grid.scss` completo (sticky col, scroll horizontal, marco/borde propio, estados `--oa-ticked/gap/deadline/unscheduled`, fusión de píldoras, sombreado de fila alterna).
- [x] Empty states y ruta inexistente.
- [ ] ~~Celdas parciales (`--oa-partial`, `◐`)~~ — **ya no aplica**: al mostrar una fila por ocurrencia, no existe estado intermedio dentro de una fila.

**Verificar**: probar en test vault con `habitFolderPath` real → la grid muestra ~36+ filas (una por hábito de 1 daytime, o una por ocurrencia en multi-daytime) con sus `completions` (migrados desde `entries` el primer write).

## Fase 4 — Vista Rutina diaria

- [x] `habit-routine-view.hbs/.ts`: secciones por daytime **o por área** (selector "Agrupar por", no previsto originalmente), **solo hábitos programados ese día**, orden configurable (mismo combobox que Grid: alfabético/área/daytime/**prioridad [default]**/racha/%) + badge, checkboxes interactivos (**toggle por ocurrencia**), navegación de día, barras de progreso por daytime y área (crudo + tooltip ponderado); día parcial muestra "en progreso" (ADR-008).
- [x] SCSS `_habit-routine.scss`.
- [x] Integración del `pb`/% y del **% ponderado** sobre el día seleccionado.
- [x] Botones "Open file" (abre nota) y "Edit habit" (abre el Habit Editor) — no previsto originalmente.

**Verificar**: togglar desde la rutina y ver el cambio reflejado en el grid y en la nota.

## Fase 5 — Dashboard / Overview

- [x] `habit-overview-view.hbs/.ts`: cards (hoy crudo + **hoy ponderado**, rachas globales, nº hábitos), % ponderado por **área** (string libre, ya no enum) y por daytime — mostrados **lado a lado**; barras ponderadas de 30 días **con leyendas de eje X/Y**; **heatmap anual global estilo GitHub** navegable por año (no previsto originalmente).
- [x] SCSS `_habit-overview.scss` (reusar widget cards).
- [x] Es la **vista inicial por defecto** de la pestaña de Hábitos (antes era la Grid).

**Verificar**: valores coherentes con un día marcado a mano.

## Fase 6 — Semanal + Lista/Tabla

- [x] `habit-weekly-view` (matriz 7 días, reutiliza celdas/filas por ocurrencia de la Grid; días no programados → `·`; mismo look and feel visual que la Grid — píldora delgada, círculo, sombreado alterno, marco; combobox de orden; nombre como link al editor).
- [x] `habit-table-view` (sortable por columna incl. prioridad/frecuencia/racha/%30d, clicks abren nota — y doble-clic el **Habit Editor**, columna Área con label/color dinámico + SubÁrea en columna propia).
- [x] SCSS correspondientes.
- [ ] Comando/ribbon opcionales — no agregados.

**Verificar**: `npm run build`, `npm run lint`, smoke de todas las tabs en desktop y sidebar (tema claro/oscuro).

## Fase 7 — Cierre

- [x] i18n audit formal: los 6 locales (`en/es/de/fr/it/pt`) tienen exactamente el mismo conjunto de 290 claves (sin huérfanas ni faltantes entre sí). De paso se detectaron y corrigieron 3 claves usadas en código pero ausentes en **todos** los locales (`no_invalid_tasks`, `no_old_tasks`, `no_project_tasks`, en `overview-view.hbs` — bug pre-existente no relacionado con Habit Tracker, corregido igualmente). Quedan 54 claves definidas pero no referenciadas en código (no investigado a fondo, prioridad baja).
- [ ] Migración de notas de hábito al nuevo esquema — **ya no aplica** migrar `area` a un enum cerrado (es texto libre); sigue pendiente decidir si ofrecer una migración/organización asistida de notas legado.
- [x] `docs/todo.md` actualizado: "Habit tracker" y "Rutina diaria" marcados como hechos (v1.1.0); "Visualización de rachas de hábitos" marcado como hecho (v2.x-v3.x).
- [x] Changelog/MANIFEST bump: versión `1.1.0` en `package.json`/`manifest.json`/`versions.json` (mismo `minAppVersion: 1.8.7`). De paso se corrigió un bug en `version-bump.mjs` (rutas relativas `../manifest.json`/`../versions.json` apuntaban fuera del repo porque el script corre con cwd = raíz del paquete, no `src/`).
- [ ] Prueba de escritura en vault real (hacer toggle en un hábito de prueba y revertir) — **pendiente, requiere verificación manual**: no hay un `test-vault` en este workspace ni forma de automatizar la escritura real sobre un vault de Obsidian desde aquí; todo lo verificado en esta sesión fue vía `npm run build`.

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
| Áreas sin taxonomía cerrada generan nombres inconsistentes | Mitigado parcialmente: el combobox del editor sugiere las carpetas raíz del vault + áreas ya usadas; colores/etiquetas tienen fallback determinístico para cualquier string. |
| Cambios de vault concurrentes (sync) | Ignorar errores de `cache` estaleado + re-intento único tras `modify`. Listener `offref` limpio en `onunload`. |

## Orden de commits sugerido

1. `feat(habits): types, settings, i18n y ediciones base` (Fase 0)
2. `feat(habits): data layer + streak engine + completions` (Fase 1)
3. `feat(habits): habit editor modal (crear/editar)` (Fase 2)
4. `feat(habits): vista grid HT21` (Fase 3)
5. `feat(habits): vista rutina diaria` (Fase 4)
6. `feat(habits): dashboard overview` (Fase 5)
7. `feat(habits): vistas semanal y lista` (Fase 6)