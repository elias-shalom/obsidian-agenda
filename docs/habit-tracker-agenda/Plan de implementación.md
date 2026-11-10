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
- [x] **Normalización de campos**: `frequencyToSet` (tokens/nombres → `Set<number>` ISO), `clampPriority` (1–5, default 3), `relatedFile` (wikilink/link inline a nota de apoyo, reemplazó a `subArea`), `parseCompletions` ([[Arquitectura técnica]] §2.6). **`area` ya no se normaliza/valida** (string libre, fallback `temporal`) — cambio respecto al plan original.
- [x] `habit-streak.ts`: port TS del bloque `renderedDates` de HT21 → `computeCells` + `computeStats` (+ `computeOccurrenceCells`/`computeOccurrenceStats` para filas por ocurrencia), **con `isScheduled`** (los días no programados son neutrales; racha salta esos días) y **`dayCompleted`** (días parciales neutrales, ADR-008).
- [x] `habit-stats.ts`: stats por área/daytime y ventanas (30 días + `computeYearHistory` para el heatmap anual, no previsto originalmente) y `computeDashboard` con `pctWeighted` (`Σ done.priority / Σ scheduled.priority`).
- [x] `habit-completions.ts` (helpers puros: `dayCompleted`, `occurrencesFor`, `toggle`, `dayCompletedDates`) + `habit-writer.ts` (write-back que persiste `completions` y **re-deriva `entries`**).
- [x] `habit-manager.ts`: cache + eventos vault (`create/delete/rename/modify`) + evento de refresco global + `openEditor` + `getVaultRootFolders()` (sugerencias de área).
- [ ] **Timer de medianoche** — sigue sin implementarse; el refresco depende de eventos de vault o del evento global manual.
- [ ] Tests unitarios — siguen sin existir en el repo.

**Verificar**: `npm run build`; validado en esta sesión repetidamente, sin script de humo formal en `test-vault`.

## Fase 2 — Habit Creator (modal de crear/editar)

- [x] `habit-editor.ts`: `HabitEditorModal` con formulario (name, description, time **[dial circular]**, area **[select dinámico de carpetas]**, relatedFile **[picker de archivo con autocompletado, igual al modal de tareas; guarda wikilink]**, frequency, priority **[slider]**, daytime, status **[switch]**, maxGap **[slider]**, color **[default = acento del tema]**) — más rico que el spec original; sin campo `title` (se quitó por redundante con `name`); `subArea` fue reemplazado por `relatedFile`.
- [x] **Crear**: `app.vault.create` de `name.md` en `habitFolderPath` (defaults `frequency: everyday`, `priority: 3`, `status: active`).
- [ ] Plantilla `habit.md` opcional en el cuerpo — no implementada.
- [x] **Editar**: escritura única con `vault.process` que reconstruye un solo bloque frontmatter y preserva `completions`/`entries`; `fileManager.renameFile` si cambia el basename; borrado con confirmación de dos clics.
- [x] **Corrección**: evitar frontmatter duplicado causado por combinar `processFrontMatter` y `vault.process` en la misma edición; los hábitos afectados se normalizan al volver a editarlos.
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
- [x] `habit-table-view` (sortable por columna incl. prioridad/frecuencia/racha/%30d, doble-clic abre el **Habit Editor** — el clic simple no hace nada, columna Área con label/color dinámico + columna "Relacionado" con link a la nota de apoyo).
- [x] SCSS correspondientes.
- [ ] Comando/ribbon opcionales — no agregados.

**Verificar**: `npm run build`, `npm run lint`, smoke de todas las tabs en desktop y sidebar (tema claro/oscuro).

## Fase 7 — Cierre

- [x] i18n audit formal: los 6 locales (`en/es/de/fr/it/pt`) tienen exactamente el mismo conjunto de 290 claves (sin huérfanas ni faltantes entre sí). De paso se detectaron y corrigieron 3 claves usadas en código pero ausentes en **todos** los locales (`no_invalid_tasks`, `no_old_tasks`, `no_project_tasks`, en `overview-view.hbs` — bug pre-existente no relacionado con Habit Tracker, corregido igualmente). Quedan 54 claves definidas pero no referenciadas en código (no investigado a fondo, prioridad baja).
- [ ] Migración de notas de hábito al nuevo esquema — **ya no aplica** migrar `area` a un enum cerrado (es texto libre); sigue pendiente decidir si ofrecer una migración/organización asistida de notas legado.
- [x] `docs/todo.md` actualizado: "Habit tracker" y "Rutina diaria" marcados como hechos (v1.1.0); "Visualización de rachas de hábitos" marcado como hecho (v2.x-v3.x).
- [x] Changelog/MANIFEST bump: versión `1.1.0` en `package.json`/`manifest.json`/`versions.json` (mismo `minAppVersion: 1.8.7`). De paso se corrigió un bug en `version-bump.mjs` (rutas relativas `../manifest.json`/`../versions.json` apuntaban fuera del repo porque el script corre con cwd = raíz del paquete, no `src/`).
- [ ] Prueba de escritura en vault real (hacer toggle en un hábito de prueba y revertir) — **pendiente, requiere verificación manual**: no hay un `test-vault` en este workspace ni forma de automatizar la escritura real sobre un vault de Obsidian desde aquí; todo lo verificado en esta sesión fue vía `npm run build`.

## Ampliaciones v1.1.15–v1.1.16 (HA1, HV1 y HU1 implementadas en v1.1.15)

Decididas el 2026-11-02 y organizadas por fases con prefijo propio (`HA1`, `HV1`, `HU1`), independientes de las fases 0–7. Especificación en [[Especificación de vistas]] §11–§14, datos en [[Modelo de datos]] §8 y mecanismo en [[Arquitectura técnica]] §10. **Orden recomendado**: HA1 → HV1 (HU1 puede ir en cualquier momento). Las tres pertenecen a v1.1.15 y cada una se puede probar a mano completa.

### Fase HA1 — Periodo activo (v1.1.15) — **implementada y probada el 2026-11-09**

**Dependencias**: ninguna. **Verificable por separado**: sí (con vacaciones aún sin implementar).

- [x] `src/habits/habit-calendar.ts` (puro, sin `obsidian`): `parseActiveDate()`, `isInPeriod()`, `isActiveOn()`, `countsOn()`, `isValidPeriod()` y `activeUntilForStatus()`. El contexto de vacaciones (`IHabitCalcContext`) se añade en HV1, no se dejó un parámetro vacío por adelantado.
- [x] `habit.ts` y `habit-parser.ts`: `activeFrom`/`activeUntil` desde `from`/`until` (solo `AAAA-MM-DD` válido, también como fecha real; inválido = ausente).
- [x] `HabitManager.getHabitsForStats()` (activos + inactivos con `until`); `getHabits()` y `getAllHabits()` no cambian. `computeDashboard()` y el heatmap anual lo usan.
- [x] `habit-stats.ts` y `habit-streak.ts`: usar `countsOn()` en denominadores y rachas (los días fuera del periodo son neutrales); también la Rutina (lista del día) y la Tabla (`pct30d`).
- [x] `habit-editor.ts`: selectores `from` y `until` con botón de vaciar, el switch de estado escribe `until` = hoy al desactivar (un `until` anterior a hoy se respeta, uno futuro pasa a hoy) y lo borra al reactivar, validación `from ≤ until`; `createHabit()`/`updateHabit()` escriben o borran los campos sin tocar `completions`/`entries`.
- [x] i18n en los 6 locales (`habit_active_from`, `habit_active_until`, `habit_period_invalid`, `habit_period_clear`).
- [x] Pruebas Node `tests/habit-period.test.cjs` (22): lectura de las fechas, extremos inclusivos, `inactive` con y sin `until`, reglas del editor, rachas y celdas con días fuera del periodo, historial estable al desactivar, Dashboard con la lista de estadísticas y traducciones.

**Verificar**: `npm run build`, `npm run lint`, `node --test tests`; manual: desactivar y reactivar un hábito de prueba y comprobar que el porcentaje de fechas pasadas no cambia y que una nota sin fechas se comporta igual que antes.

### Fase HV1 — Vacaciones (v1.1.15) — **implementada y probada a mano el 2026-11-09**

**Dependencias**: HA1 (comparte `habit-calendar.ts` y la propagación del contexto). **Verificable por separado**: sí, con los hábitos mostrados solo en Cuadrícula, Semanal y heatmap.

- [x] Ajuste `habitVacations` en `settings.ts` (defecto `[]`), `sanitizeVacations()` al cargar (`main.ts`) y `findVacation()` en `habit-calendar.ts`.
- [x] Sección «Vacaciones» en `setting-tab.ts` (con `render:`), como grupo propio de la pestaña Hábitos en `getSettingDefinitions()` y en el `display()` de respaldo; cada cambio guarda y emite `obsidian-agenda:habits-refresh` (no hace falta `refreshHabits()`: las vacaciones no intervienen en el parseo y `HabitManager.getCalcContext()` las lee en vivo).
- [x] Cálculo: `countsOn(habit, date, done, ctx)` con `IHabitCalcContext`; `computeCells`, `computeOccurrenceCells`, `computeStats`, `computeOccurrenceStats`, los porcentajes por área y franja (por ocurrencia), `computeHistory30d`, `computeYearHistory` y `computeDashboard` reciben el contexto (opcional, por defecto sin vacaciones). La Rutina mantiene en la lista los hábitos de un día de vacaciones, para poder marcarlos, pero no los cuenta en sus porcentajes si no están marcados; la Tabla usa el contexto en `streak` y `pct30d`.
- [x] Cuadrícula y Semanal: `IHabitCell.vacation`, `vacationName` y `markable`, clase `--vacation` (atenuado + 🌴 + tooltip con el nombre) y SCSS; la celda de vacaciones sigue siendo marcable.
- [x] Heatmap del Dashboard: `IHabitDayStat.vacation` y `vacationName`; un día de vacaciones sin marcas se dibuja con rayas diagonales (la celda mide 11 px y no cabe un icono) y el tooltip lleva el nombre.
- [x] Botón «Vacaciones» (🌴) en las cinco plantillas; `openPluginSettings()` (`open-habit-settings.ts`) con `app.setting.open()`/`openTabById()` y `Notice` de respaldo con la ruta; `ObsidianAgenda.openHabitSettings()` deja elegida la pestaña Hábitos y desplaza la vista hasta la lista.
- [x] i18n en los 6 locales (12 claves `habit_vacation*`).
- [x] Pruebas Node `habit-vacations.test.cjs` (36): lista (`sanitizeVacations`, `findVacation`, solapes), `countsOn`, rachas (con `maxGap`), celdas y píldora de racha, porcentajes por área y franja, historial, heatmap, Dashboard, `openPluginSettings` y traducciones.

**Verificar**: `npm run build`, `npm run lint`, `node --test tests`; manual: vacaciones que incluyan hoy con un hábito marcado y otro no, y botón «Vacaciones» en escritorio y móvil (la API es no documentada; probar también el camino del `Notice`).

### Fase HU1 — Selector circular de subvistas (v1.1.15) — **implementada y probada a mano el 2026-11-09**

**Dependencias**: ninguna. **Verificable por separado**: sí.

- [x] Las 5 plantillas `habit-*-view.hbs`: el `<select id="oa-habit-view-dropdown">` pasa a `oa-calendar-view-segmented` con un `oa-calendar-view-btn` por subvista, solo icono con `title` y `aria-label`.
- [x] `HabitView.setupViewSpecificEventListeners()`: mapa de iconos `HABIT_VIEW_BUTTON_ICONS` (`src/habits/habit-view-icons.ts`: `layout-dashboard`, `sunrise`, `calendar-check-2`, `layout-grid`, `list-checks`) con `setIcon` y clic → `switchToViewType()`.
- [x] Tras la prueba manual: el icono de la Cuadrícula pasó de `grid-3x3` (inexistente en Obsidian) a `layout-grid`, y los selectores de orden y agrupado pasaron a chips `oa-axis-chip` con el aspecto de Sort/Group de las tareas (ver [[Arquitectura técnica]] §10.5).
- [x] Respeta `showHabitDashboardTab`, `showHabitRoutineTab`, `showHabitWeeklyTab`, `showHabitGridTab` y `showHabitListTab`; casos de un botón y de ninguno.
- [x] Los selectores de orden y agrupado con etiqueta pasaron a chips `oa-axis-chip` (como Sort/Group de las tareas); se retiraron los estilos del `<select>` que quedaron huérfanos.
- [x] Pruebas Node `habit-view-selector.test.cjs` (8): compila las cinco plantillas y comprueba un botón por subvista en orden, solo el actual con `oa-active`, solo icono con `title`/`aria-label`, `role="group"`, ningún `<select>` de vista, cada `showHabit*Tab` en cada plantilla, un botón y ninguno, el mapa de iconos y las traducciones.

**Verificar**: `npm run build`, `npm run lint`; manual: recorrer las 5 subvistas, combinar los `showHabit*Tab`, comprobar tooltip y `aria-label`, la pulsación larga en móvil y que los cinco iconos se ven.

### Fases relacionadas en el Plan de agenda-tasks

Estas fases viven en `docs/agenda-tasks/Plan de implementación.md` y tocan hábitos; no se duplican aquí:

- **NL2** (v1.1.15; depende de NL1): las frecuencias «Fin de semana» y «Lunes a viernes» siguen el ajuste de días no laborables (`habit-parser.ts` y `habit-editor.ts`), con aviso. Es independiente de HA1, HV1 y HU1; su prueba Node es `habit-frequency.test.cjs`.
- **HC1** (v1.1.15; depende de HA1 y HV1): hábitos en el calendario como entradas virtuales.
- **HM1** (v1.1.16): componente de heatmap reutilizable; el heatmap de hábitos migra y debe quedar idéntico, conservando la marca de vacaciones de HV1 (`habit-heatmap-parity.test.cjs`).
- **DW1** (v1.1.16; depende de HM1): widgets de hábitos en el Dashboard.

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
| **(v1.1.15)** El ajuste de días no laborables **altera rachas y porcentajes** de los hábitos `weekend`/`workweek` | Aviso fijo y `Notice` en el ajuste; los tokens no reescriben notas; con el ajuste por defecto el resultado es idéntico; pruebas Node de regresión (`habit-frequency.test.cjs`). |
| **(v1.1.15)** `app.setting.open()` y `openTabById()` son **API no documentada** de Obsidian | Acceso defensivo con comprobación de tipos y `try/catch`; `Notice` con la ruta «Ajustes → Agenda Tasks → Vacaciones»; probar en la versión mínima y en la actual. |
| **(v1.1.15)** Desactivar un hábito cambiaba el porcentaje de fechas pasadas | `until` = hoy al desactivar y `getHabitsForStats()`; prueba de historial estable (HA1). |
| **(v1.1.16)** La **migración del heatmap** de hábitos al componente reutilizable (HM1) cambia su aspecto o valores, o pierde la marca de vacaciones | Criterio «idéntico» con prueba de paridad de la métrica y revisión visual en claro/oscuro; la marca de vacaciones forma parte del contrato del componente. |

## Orden de commits sugerido

1. `feat(habits): types, settings, i18n y ediciones base` (Fase 0)
2. `feat(habits): data layer + streak engine + completions` (Fase 1)
3. `feat(habits): habit editor modal (crear/editar)` (Fase 2)
4. `feat(habits): vista grid HT21` (Fase 3)
5. `feat(habits): vista rutina diaria` (Fase 4)
6. `feat(habits): dashboard overview` (Fase 5)
7. `feat(habits): vistas semanal y lista` (Fase 6)

Ampliaciones v1.1.15 (una por fase, en este orden):

8. `feat(habits): periodo activo from/until` (HA1)
9. `feat(habits): vacaciones globales y botón de ajustes` (HV1; implementado)
10. `feat(habits): selector circular de subvistas` (HU1; implementado)