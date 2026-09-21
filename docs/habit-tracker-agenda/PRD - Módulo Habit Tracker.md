---
name: "PRD - Módulo Habit Tracker"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: daily-routine
archetype: manager
status: active
related:
  - "[[README]]"
  - "[[Modelo de datos]]"
  - "[[Especificación de vistas]]"
created: 2026-09-21
tags:
  - obsidian-agenda
  - documentation
  - prd
---

# PRD — Módulo Habit Tracker para obsidian-agenda

## 1. Objetivo

Proveer dentro del plugin **Obsidian Agenda** un conjunto de vistas de **hábitos** que:

1. Lean las **notas de hábito** desde una **ruta configurable** del vault.
2. Muestren el **estado, historial, rachas y progreso** de cada hábito (por `daytime` y por `area`).
3. Permitan **marcar/desmarcar** hábitos de forma **interactiva** (escribiendo en el vault) directamente desde la vista.
4. Se integren al patrón de UI existente del plugin (tabs, header, i18n, temas, móvil).

## 2. Alcance

### 2.1 Dentro de alcance (v1)

- [x] Ruta configurable de la carpeta de hábitos (`habitFolderPath`).
- [x] Lectura de notas de hábito y su frontmatter (`title/color/maxGap/entries` + `name/description/time/area/subArea/frequency/priority/daytime/status`).
- [x] Vistas:
  - **Grid** (estilo Habit Tracker 21) — principal.
  - **Rutina diaria**.
  - **Dashboard / Overview** de hábitos.
  - **Semanal** (matriz hábito × día).
  - **Lista / Tabla** de hábitos.
- [x] Interactividad: click en celda/toggle → escribir/eliminar fecha en `entries` de la nota del hábito.
- [x] Cálculo de **rachas** con tolerancia `maxGap` (portado de HT21).
- [x] Refresco reactivo ante cambios en el vault (create/modify/delete/rename dentro de la ruta) y a medianoche.
- [x] Soporte **i18n** en los 6 idiomas actuales del plugin.
- [x] Configuración de visibilidad de las pestañas de hábitos (patrón `show*Tab`).
- [x] Doble-clic en un hábito abre su nota; click en la fecha del encabezado abre la daily note (si existe/posible).

### 2.2 Fuera de alcance (fases posteriores)

- [ ] Escritura en las **notas diarias de seguimiento** (`habit tracker/YYYY-MM-DD.md`, toggles meta-bind y `pb*`) — se documenta como mejora futura.
- [ ] Generación de hábitos desde la vista (crear nota nueva).
- [ ] Vista heatmap estilo GitHub / Heatmap Tracker (se omite; la grid cumple el rol de historial visual).
- [ ] Sincronización bidireccional con calificaciones parciales (p. ej. intensidad 0–100 por día) vía deslizador.
- [ ] Notas de revisión (diaria/semanal/mensual) automáticas.
- [ ] Exportación CSV de hábitos.

## 3. Personas y user stories

**Persona**: Elías — usuario del sistema [[daily routine]] que construye hábitos en `daily plan/daily routine/habit`, registra avance en notas diarias y revisa visualización en [[habit tracker]].

| # | Historia de usuario | Criterio de aceptación |
|---|---|---|
| US-1 | Como usuario, quiero ver de un vistazo en qué días cumplí cada hábito | La vista **Grid** muestra una fila por hábito y una columna por día; las celdas cumplidas se distinguen visualmente. |
| US-2 | Como usuario, quiero marcar o desmarcar un hábito del día con un clic | Un click en una celda del grid agrega/elimina la fecha en `entries` de la nota del hábito y la UI se actualiza. |
| US-3 | Como usuario, quiero conocer mi racha y si voy a perderla | El grid muestra el contador de racha al final de cada secuencia y un indicador de "fecha límite para mantener la racha" cuando `maxGap` lo permite. |
| US-4 | Como usuario, quiero ver mi cumplimiento de hoy | La vista **Rutina diaria** muestra los hábitos de hoy organizados por `daytime` y por `area` con porcentaje de avance. |
| US-5 | Como usuario, quiero métricas globales | El **Dashboard** muestra cumplimiento de hoy, racha actual, racha máxima, % por área y % por daytime. |
| US-6 | Como usuario, quiero revisar la semana de un vistazo | La vista **Semanal** muestra matriz hábito × día (7 columnas). |
| US-7 | Como usuario, quiero el catálogo de mis hábitos con su metadata | La vista **Lista/Tabla** lista hábitos con área, daytime, tiempo estimado y rachas. |
| US-8 | Como usuario, quiero cambiar la carpeta de hábitos sin tocar código | Un campo **Ruta de hábitos** en la configuración del plugin. |
| US-9 | Como usuario, quiero abrir la nota de un hábito desde la vista | Doble-clic en el nombre del hábito abre su nota `.md`. |
| US-10 | Como usuario, quiero definir en qué días de la semana se realiza cada hábito | Algunos hábitos son diarios, otros solo entre semana o fines de semana; el campo `frequency` (de la nota) controla que en la **Rutina** solo aparezcan los programados para ese día y que los días no programados **no rompan la racha** en el grid. |
| US-11 | Como usuario, quiero que los hábitos importantes tengan más peso | El campo `priority` (1–5) pondera el % de cumplimiento del día (`Σ done.priority / Σ scheduled.priority`) y ordena la **Rutina** por importancia. |
| US-12 | Como usuario, quiero agrupar por áreas estándar | El `area` se limita a 10 áreas (`daily-plan…temporal`) con etiquetas locales; `subArea` conserva el detalle (`feed`, `clean`, …). El dashboard agrupa por estas 10 áreas. |

## 4. Requerimientos funcionales

### RF-1 Configuración (`settings`)

- Campo `habitFolderPath: string` — ruta de la carpeta donde están las notas de hábito. Valor por defecto: `daily plan/daily routine/habit`.
- `habitDaysToShow: number` — columnas de días del grid. Defecto `21`.
- `habitShowStreaks: boolean` — mostrar indicadores y conteos de racha. Defecto `true`.
- `habitDefaultMaxGap: number` — tolerancia de huecos por defecto (0 = ninguno).
- `showHabitGridTab`, `showHabitDashboardTab`, `showHabitRoutineTab`, `showHabitWeeklyTab`, `showHabitListTab: boolean` — visibilidad de pestañas (patrón existente).

### RF-2 Carga de datos

- El plugin resuelve la ruta configurada contra el vault (`app.vault.getAbstractFileByPath`).
- Si es una **carpeta**: se leen solo los `.md` directos (se ignoran subcarpetas), ordenados alfabéticamente por basename.
- Si es un **archivo**: se trata como un único hábito (compatibilidad con rutas a nota individual).
- Si la ruta no existe: estado de error visible ("No habits found at 'ruta'"), sin romper el plugin.

### RF-3 Modelo de hábito

- Campos HT21: `title` (etiqueta, fallback = basename), `color` (color de celda), `maxGap` (tolerancia), `entries` (array ISO `YYYY-MM-DD`, la **única** fuente de "habit completado el día X").
- Campos propios (ver [[Modelo de datos]] §2): `description`, `time` (min), `area` (**enum de 10**, slug inglés + etiqueta i18n), `subArea` (opcional), `frequency` (días programados, token/lista), `priority` (1–5, default 3), `daytime[]`, `status`, `related`.
- Normalización (ver [[Modelo de datos]] §5.1): `entries` ordenada ascendente; fechas inválidas ignoradas; duplicados eliminados; `area` slugificada; `frequency` → `Set<number>` ISO; `priority` clamp 1–5.
- **Día no programado** de un hábito es neutro en stats/racha (no rompe racha) — definido en ADR-005.

### RF-4 Interacción de escritura (write-back)

- Click en celda vacía → agrega `YYYY-MM-DD` a `entries`.
- Click en celda marcada → elimina la fecha de `entries`.
- La escritura usa `app.fileManager.processFrontMatter(file, fm => ...)` y **no** toca el resto del frontmatter.
- La UI actualiza de forma optimista y se reconcilia con el evento `modify` (guardia contra bucles).
- El toggle se permite siempre (también en días no programados); el efecto en stats queda definido por `isScheduled`.

### RF-5 Refresco reactivo

- Suscripción a eventos `vault.on('create' | 'delete' | 'rename')` filtrando por la ruta vigilada.
- Suscripción a `vault.on('modify')` para recargar la nota cambiada.
- Recarga a medianoche (para que "hoy" se actualice solo).
- Evento global `obsidian-agenda:habits-refresh` para refresco desde settings.

### RF-6 Métricas por prioridad

- `pctWeighted` diario/área/daytime = `Σ done.priority / Σ scheduled.priority`.
- Denominatorios siempre sobre hábitos **programados** ese día.
- La **Rutina** ordena por `priority` desc; el **Dashboard** muestra ponderado (+ crudo opcional).

## 5. Requerimientos no funcionales

| RNF | Descripción |
|---|---|
| Rendimiento | Carga inicial < 250 ms para ≤ 40 hábitos; re-render solo de lo afectado; usar `metadataCache` cuando baste y `vault.read` solo al escribir. |
| Temas | Usar variables CSS de Obsidian (`--checkbox-color`, `--backg**`, etc.) y namespace `oa-habit-*`; sin colores hardcodeados salvo los `color`/`defaultColor` del usuario. |
| Responsivo | Funciona en sidebar estrecha y vista completa; el grid usa scroll horizontal con las columnas de fechas. |
| i18n | Todas las cadenas visibles pasan por `i18n.t()`; claves nuevas en `en/es/de/fr/it/pt`. |
| Móvil | `isDesktopOnly: false`; interacciones compatibles con touch (click simple). |
| Resiliencia | Notas con YAML corrupto, `entries` mal formado o fechas inválidas no rompen el grid (se ignoran o se muestran con aviso; ver casos de `test-vault/broken-habits` de HT21). |
| Accesibilidad | Celdas con `aria-label` (fecha + hábito), foco visible, respeto a `prefers-reduced-motion`. |

## 6. Criterios de aceptación generales

1. Con `habitFolderPath` apuntando a `daily plan/daily routine/habit`, el grid muestra ~36 hábitos y su historial real (`entries` de `agua`, `breathing`, etc.).
2. Marcar una celda refleja de inmediato la fecha en `entries` de la nota y el countdown de racha.
3. Un hábito con `frequency: workweek` NO pierde la racha por no marcar sábado/domingo; esos días se ven atenuados.
4. Al editar/renombrar/borrar una nota dentro de la carpeta, las vistas se actualizan sin reabrir el plugin.
5. El % de cumplimiento de hoy del dashboard coincide con `Σ done.priority / Σ scheduled.priority` (y se muestra también el crudo).
6. Todas las cadenas están traducidas en los 6 idiomas (incluye 10 etiquetas de área y tokens de frecuencia); sin claves sin traducir en consola.
7. `npm run build` y `npm run lint` pasan sin errores.
8. El plugin sigue funcionando si la ruta no existe (mensaje claro, sin crash).

## 7. Fuera de alcance explicado

- La **escritura en notas diarias de seguimiento** se deja fuera porque la fuente única v1 es `entries`. Documentado en [[Modelo de datos]] (ADR-002).
- La **granularidad por daytime en `entries`** no se implementa en v1 (ADR-001); la rutina muestra el estado del día completo. La precisión por horario queda como mejora.
- El **heatmap mensual** se reemplaza por la **grid** (más accionable y alineada a la referencia HT21).
- El destino final de los hábitos `misc` (`clima`, `power nap`, `wake up time`) dentro del enum de áreas queda **pendiente de decisión** (candidatos `temporal`/`daily-plan`, ADR-004) y se resuelve en la migración de datos, no bloquea el desarrollo.

## 8. Referencias

- Referencia de código: `github.com/zincplusplus/habit-tracker` (MIT) — vista grid.
- Roadmap del plugin: `C:\Code\obsidian\obsidian-agenda\docs\todo.md` (v1.1.0).
- Arquitectura y estilo: `C:\Code\obsidian\obsidian-agenda\docs\mejores-practicas.md`.