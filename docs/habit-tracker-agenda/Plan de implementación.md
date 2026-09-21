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

- [ ] `habit-parser.ts`: lee `metadataCache`/`vault.read`, valida `entries`, resuelve `maxGap`/`color`/`title`, filtra activos, resiliencia (casos del §7 Modelo de datos).
- [ ] **Normalización de nuevos campos**: `slugifyArea` (enum `HabitArea`, alias, fallback), `frequencyToSet` (tokens/nombres → `Set<number>` ISO), `clampPriority` (1–5, default 3), `subArea` ([[Arquitectura técnica]] §2.6).
- [ ] `habit-streak.ts`: port TS del bloque `renderedDates` de HT21 → `computeCells` + `computeStats`, **con `isScheduled`** (los días no programados son neutrales; racha salta esos días).
- [ ] `habit-stats.ts`: stats por área/daytime y ventanas (7/21/30 días) y `computeDashboard` con `pctWeighted` (`Σ done.priority / Σ scheduled.priority`).
- [ ] `habit-writer.ts`: `toggleEntry` con `processFrontMatter`.
- [ ] `habit-manager.ts`: cache + eventos vault (`create/delete/rename/modify`) + timer de medianoche + evento de refresco global.
- [ ] Tests unitarios (si la configuración del repo lo permite) para `habit-streak` con fixtures de HT21 (incluye casos `gap`, deadline, DST) **y frecuencia** (`workweek` no rompe racha el fin de semana; toggle en día no programado no cuenta).

**Verificar**: `npm run build`; script de humo en `test-vault` (reabrir plugin, log de `getHabits()`).

## Fase 2 — Vista Grid (HT21) — MVP accionable

- [ ] `habit-grid-view.hbs` + `habit-grid-view.ts` (patrón BaseView), registro en `TEMPLATE_LOADERS`, `views/index.ts`, `ViewManager`, marcador de tab en `header.hbs`, `attachEventTabs`.
- [ ] Escucha de clics → `HabitManager.toggle` → refresh optimista; reconciliación con `modify`.
- [ ] Navegación de ventana de días (`◀ ▶`), tooltips, streak y deadline, col % (sobre días programados).
- [ ] Celdas **no programadas** (`--oa-unscheduled`) habilitadas con `scheduled:false` (toggle permitido, no afecta stats).
- [ ] SCSS `_habit-grid.scss` completo (sticky col, scroll horizontal, estados `--oa-ticked/gap/deadline/unscheduled`).
- [ ] Empty states y ruta inexistente.

**Verificar**: probar en test vault con `habitFolderPath` real → la grid muestra los ~36 hábitos con sus `entries`.

## Fase 3 — Vista Rutina diaria

- [ ] `habit-routine-view.hbs/.ts`: secciones por daytime, **solo hábitos programados ese día**, **orden por `priority` desc** + badge, checkboxes interactivos (mismo toggle), navegación de día, barras de progreso por daytime y área (crudo + tooltip ponderado).
- [ ] SCSS `_habit-routine.scss`.
- [ ] Integración del `pb`/% y del **% ponderado** sobre el día seleccionado.

**Verificar**: togglar desde la rutina y ver el cambio reflejado en el grid y en la nota.

## Fase 4 — Dashboard / Overview

- [ ] `habit-overview-view.hbs/.ts`: cards (hoy crudo + **hoy ponderado**, rachas globales, nº hábitos), % ponderado por **enum de áreas** y por daytime, barras ponderadas de 30 días.
- [ ] SCSS `_habit-overview.scss` (reusar widget cards).

**Verificar**: valores coherentes con un día marcado a mano.

## Fase 5 — Semanal + Lista/Tabla

- [ ] `habit-weekly-view` (matriz 7 días, reutiliza células de grid; días no programados → `·`).
- [ ] `habit-table-view` (sortable incl. prioridad/frecuencia, clicks abren nota, columna Área localizada + SubÁrea).
- [ ] SCSS correspondientes.
- [ ] Comando/ribbon opcionales.

**Verificar**: `npm run build`, `npm run lint`, smoke de todas las tabs en desktop y sidebar (tema claro/oscuro).

## Fase 6 — Cierre

- [ ] i18n audit (sin keys sueltas; incluye 10 áreas + tokens frecuencia + prioridad).
- [ ] Migración de notas de hábito al nuevo esquema (`area` enum + `subArea` + `frequency` + `priority`) — pendiente de decisión del destino de `misc` (ADR-004).
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
| Conflicto con plugin Habit Tracker 21 (comparten `entries`) | Modelo idéntico; escritura serializada (`processFrontMatter`); documentado en [[Modelo de datos]] ADR-001/002. |
| `frequency` no reflejado en rachas/% (inconsistencia) | `isScheduled` centralizado en el modelo; tests específicos (workweek/weekend). |
| Zona horaria al computar el weekday | `DateTime.local()` con `weekday` ISO; nunca UTC. |
| Hábitos `misc` sin migrar | No bloquea: el parser asigna fallback (`temporal`) con warn; migración formal pendiente (ADR-004). |
| Cambios de vault concurrentes (sync) | Ignorar errores de `cache` estaleado + re-intento único tras `modify`. Listener `offref` limpio en `onunload`. |

## Orden de commits sugerido

1. `feat(habits): types, settings, i18n y ediciones base` (Fase 0)
2. `feat(habits): data layer + streak engine` (Fase 1)
3. `feat(habits): vista grid HT21` (Fase 2)
4. `feat(habits): vista rutina diaria` (Fase 3)
5. `feat(habits): dashboard overview` (Fase 4)
6. `feat(habits): vistas semanal y lista` (Fase 5)