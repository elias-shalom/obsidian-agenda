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
3. Permitan **marcar/desmarcar** hábitos de forma **interactiva** (escribiendo en el vault) directamente desde la vista, con precisión de **ocurrencia** (`daytime`).
4. Se integren al patrón de UI existente del plugin (tabs, header, i18n, temas, móvil).
5. Permitan **crear y editar hábitos** desde el plugin (Habit Creator, modal).

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
- [x] **Habit Creator**: modal para **crear y editar** hábitos (nota nueva en la ruta / actualización de frontmatter), con validación y preservación de `completions`.
- [x] Interactividad: click en celda → toggle directo por ocurrencia; hábitos multi-daytime se muestran como **una fila por daytime** (no popover); escribe `completions` y sincroniza el espejo `entries`.
- [x] Cálculo de **rachas** con tolerancia `maxGap` (portado de HT21).
- [x] Refresco reactivo ante cambios en el vault (create/modify/delete/rename dentro de la ruta) y a medianoche.
- [x] Soporte **i18n** en los 6 idiomas actuales del plugin.
- [x] Configuración de visibilidad de las pestañas de hábitos (patrón `show*Tab`).
- [x] Doble-clic en un hábito abre su nota; click en la fecha del encabezado abre la daily note (si existe/posible).

### 2.2 Fuera de alcance (fases posteriores)

- [ ] Escritura en las **notas diarias de seguimiento** (`habit tracker/YYYY-MM-DD.md`, toggles meta-bind y `pb*`) — se documenta como mejora futura.
- [ ] Vista heatmap estilo GitHub / Heatmap Tracker (se omite; la grid cumple el rol de historial visual).
- [ ] Sincronización bidireccional con calificaciones parciales (p. ej. intensidad 0–100 por día) vía deslizador.
- [ ] Notas de revisión (diaria/semanal/mensual) automáticas.
- [ ] Exportación CSV de hábitos.

## 3. Personas y user stories

**Persona**: Elías — usuario del sistema [[daily routine]] que construye hábitos en `daily plan/daily routine/habit`, registra avance en notas diarias y revisa visualización en [[habit tracker]].

| # | Historia de usuario | Criterio de aceptación |
|---|---|---|
| US-1 | Como usuario, quiero ver de un vistazo en qué días cumplí cada hábito | La vista **Grid** muestra una fila por hábito y una columna por día; las celdas cumplidas se distinguen visualmente. |
| US-2 | Como usuario, quiero marcar o desmarcar un hábito del día con un clic | Un click en una celda del grid actualiza directamente esa **ocurrencia**: si el hábito tiene varias `daytime`, aparece como **filas separadas** (`Hábito (daytime)`) y cada una se marca con un clic simple. |
| US-3 | Como usuario, quiero conocer mi racha y si voy a perderla | El grid muestra el contador de racha al final de cada secuencia y un indicador de "fecha límite para mantener la racha" cuando `maxGap` lo permite. |
| US-4 | Como usuario, quiero ver mi cumplimiento de hoy | La vista **Rutina diaria** muestra los hábitos de hoy organizados por `daytime` y por `area` con porcentaje de avance. |
| US-5 | Como usuario, quiero métricas globales | El **Dashboard** muestra cumplimiento de hoy, racha actual, racha máxima, % por área y % por daytime. |
| US-6 | Como usuario, quiero revisar la semana de un vistazo | La vista **Semanal** muestra matriz hábito × día (7 columnas). |
| US-7 | Como usuario, quiero el catálogo de mis hábitos con su metadata | La vista **Lista/Tabla** lista hábitos con área, daytime, tiempo estimado y rachas. |
| US-8 | Como usuario, quiero cambiar la carpeta de hábitos sin tocar código | Un campo **Ruta de hábitos** en la configuración del plugin. |
| US-9 | Como usuario, quiero abrir la nota de un hábito desde la vista | Doble-clic en el nombre del hábito abre su nota `.md`. |
| US-10 | Como usuario, quiero definir en qué días de la semana se realiza cada hábito | Algunos hábitos son diarios, otros solo entre semana o fines de semana; el campo `frequency` (de la nota) controla que en la **Rutina** solo aparezcan los programados para ese día y que los días no programados **no rompan la racha** en el grid. |
| US-11 | Como usuario, quiero que los hábitos importantes tengan más peso | El campo `priority` (1–5) pondera el % de cumplimiento del día (`Σ done.priority / Σ scheduled.priority`) y ordena la **Rutina** por importancia. |
| US-12 | Como usuario, quiero agrupar por áreas de mi vault | `area` es un **string libre** tomado del frontmatter (ya no un enum cerrado); el combobox del editor sugiere las **carpetas raíz del vault** + áreas ya usadas. Colores/etiquetas tienen fallback determinístico para áreas sin traducción conocida. `subArea` conserva el detalle (`feed`, `clean`, …). El dashboard agrupa por estas áreas (lado a lado con "por daytime"). |
| US-13 | Como usuario, quiero crear y editar mis hábitos desde el plugin | Un **modal** permite crear (nota nueva en la ruta) y editar (frontmatter) un hábito: name, description, time (dial), área (string libre sugerido por carpetas del vault), subÁrea, frecuencia, prioridad (slider 1–5), daytime (multi), status (switch), maxGap (slider) y color (default = acento del tema); se preservan `completions`. |
| US-14 | Como usuario, quiero marcar solo las ocurrencias que hice | En un hábito multi-daytime, el grid muestra **una fila por `daytime`** (`morning`/`afternoon`/…) para marcarlas de forma independiente; `entries` solo refleja los días con **todas** las ocurrencias. |
| US-15 | Como usuario, quiero que un día parcial no me rompa la racha | Marcar 1 de 3 ocurrencias no completa el día (`entries`/racha del hábito agregado en Dashboard), pero **no corta** la racha; en la Grid, cada ocurrencia lleva su propia racha independiente. |

## 4. Requerimientos funcionales

### RF-1 Configuración (`settings`)

- Campo `habitFolderPath: string` — ruta de la carpeta donde están las notas de hábito. Valor por defecto: `daily plan/daily routine/habit`.
- `habitDaysToShow: number` — columnas de días del grid. Defecto `21`.
- `habitShowStreaks: boolean` — mostrar indicadores y conteos de racha. Defecto `true`.
- `habitDefaultMaxGap: number` — tolerancia de huecos por defecto (0 = ninguno).
- `showHabitGridTab`, `showHabitDashboardTab`, `showHabitRoutineTab`, `showHabitWeeklyTab`, `showHabitListTab: boolean` — visibilidad de pestañas (patrón existente).

### RF-2 Carga de datos

- El plugin resuelve la ruta configurada contra el vault (`app.vault.getAbstractFileByPath`).
- Si es una **carpeta**: se leen los `.md` de forma **recursiva** (incluye subcarpetas), ordenados alfabéticamente por basename.
- Si es un **archivo**: se trata como un único hábito (compatibilidad con rutas a nota individual).
- Si la ruta no existe: estado de error visible ("No habits found at 'ruta'"), sin romper el plugin.

### RF-3 Modelo de hábito

- Campos HT21 (se mantienen **top-level**, ver ADR-007): `title` (etiqueta, fallback = basename), `color` (color de celda), `maxGap` (tolerancia), `entries` (**espejo** day-level autosincronizado desde `completions`).
- Campos propios del seguimiento: `completions = { "YYYY-MM-DD": [daytime, ...] }` — **fuente canónica** por ocurrencia; `dayCompleted` = "todas las daytimes hechas" ([[Modelo de datos]] §2.7).
- Campos propios (ver [[Modelo de datos]] §2): `description`, `time` (min), `area` (**string libre** desde frontmatter, fallback `temporal`; ya no es un enum validado), `subArea` (opcional), `frequency` (días programados, token/lista), `priority` (1–5, default 3), `daytime[]`, `status`, `related`.
- Normalización (ver [[Modelo de datos]] §5.1): `completions` validada (claves ISO; daytimes contra `habit.daytime`), `entries` **derivada** de `completions`; fechas inválidas ignoradas; duplicados eliminados; `area` **ya no se slugifica/valida** (se usa tal cual); `frequency` → `Set<number>` ISO; `priority` clamp 1–5.
- **Día no programado** de un hábito es neutro en stats/racha (no rompe racha) — definido en ADR-005. **Día parcial** tampoco rompe (ADR-008).

### RF-4 Interacción de escritura (write-back por ocurrencia)

- **Hábito de una sola daytime**: click en celda vacía → marca esa ocurrencia; click en marcada → la desmarca (toggle directo).
- **Hábito multi-daytime**: se muestra como **una fila por `daytime`** (`Hábito (morning)`, `Hábito (afternoon)`, …); cada fila es un toggle directo sobre su propia ocurrencia, sin popover (ver [[Especificación de vistas]] §1.3).
- La escritura usa `app.fileManager.processFrontMatter` y actualiza **`completions` + re-deriva `entries`** (espejo HT21) en la misma transacción; **no** toca el resto del frontmatter.
- La UI actualiza de forma optimista y se reconcilia con el evento `modify` (guardia contra bucles).
- El toggle se permite siempre (también en días no programados); el efecto en stats queda definido por `isScheduled` y `dayCompleted`.
- **Migración legacy**: al primer write de una nota con `entries` y sin `completions`, se migra (`completions[date] = todas las daytimes`) y se reescriben ambos campos.

### RF-5 Refresco reactivo

- Suscripción a eventos `vault.on('create' | 'delete' | 'rename')` filtrando por la ruta vigilada.
- Suscripción a `vault.on('modify')` para recargar la nota cambiada.
- **Pendiente**: recarga automática a medianoche (para que "hoy" se actualice sin interacción) — no implementada; hoy el refresco ocurre por eventos de vault o el evento global manual.
- Evento global `obsidian-agenda:habits-refresh` para refresco desde settings.

### RF-6 Métricas por prioridad

- `pctWeighted` diario/área/daytime = `Σ done.priority / Σ scheduled.priority`.
- Denominadores siempre sobre hábitos **programados** ese día.
- La **Rutina** ordena por `priority` desc; el **Dashboard** muestra ponderado (+ crudo opcional).

### RF-7 Habit Creator (crear/editar hábitos)

- **Modal reutilizable** (`HabitEditorModal`): crea o edita una nota de hábito. Se abre desde:
  - Comandos **"Nuevo hábito"** y **"Editar hábito"**.
  - Botón **`+`** en el header de las vistas de hábitos.
  - Doble-clic en una fila de la vista **Lista/Tabla** (abre el modal en modo edición).
- **Campos del formulario**: name (basename), `description`, `time` (dial circular, min), `area` (`<select>` poblado con carpetas raíz del vault + áreas usadas, texto libre), `subArea` (texto), `frequency` (select `everyday/workweek/weekend` o multi-check de días), `priority` (slider 1–5), `daytime` (multi-check `wake up/morning/afternoon/evening/night`), `status` (switch activo/inactivo), `maxGap` (slider 0–14), `color` (color picker, default = acento del tema).
- **Crear**: valida `name` (sanitizado para filename, **único** en la ruta), genera el frontmatter inicial (defaults `frequency: everyday`, `priority: 3`, `status: active`), crea la nota en `habitFolderPath`. **La plantilla `habit.md` opcional en el cuerpo no está implementada** (pendiente).
- **Editar**: `processFrontMatter` sobre la nota existente; **preserva `completions` y `entries`**; si cambia el basename → `app.fileManager.renameFile`.
- Al guardar, `HabitManager` invalida el cache y las vistas se refrescan (se reutiliza el flujo de `modify`/refresco global).

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
6. Todas las cadenas están traducidas en los 6 idiomas (incluye etiquetas de las áreas conocidas, tokens de frecuencia, opciones de orden/agrupado); sin claves sin traducir en consola.
7. `npm run build` y `npm run lint` pasan sin errores.
8. El plugin sigue funcionando si la ruta no existe (mensaje claro, sin crash).
9. En un hábito con 2+ daytimes, la Grid muestra una fila por cada `daytime`; marcar una sola fila NO completa el día agregado del hábito — `entries` solo contiene la fecha cuando **todas** las filas/ocurrencias quedan marcadas.
10. Crear un hábito desde el modal genera la nota en la ruta configurada con su frontmatter completo; editar preserva `completions`.

## 7. Fuera de alcance explicado

- La **escritura en las notas diarias de seguimiento** (`habit tracker/YYYY-MM-DD.md`, toggles meta-bind y `pb*`) se mantiene fuera; la **única fuente v1** es `completions` (+ espejo `entries`) en la nota del hábito (ADR-001/002).
- El **heatmap mensual** se reemplaza por la **grid** para el seguimiento diario; adicionalmente el Dashboard incorpora un **heatmap anual global** estilo GitHub (agregado, no estaba en el alcance original).
- **Ya no aplica**: la decisión sobre el destino de los hábitos `misc` dentro de un enum de áreas — el área es texto libre, así que `area: misc` es simplemente un valor más (ver ADR-004 revisado en [[Modelo de datos]]).

## 8. Referencias

- Referencia de código: `github.com/zincplusplus/habit-tracker` (MIT) — vista grid.
- Roadmap del plugin: `C:\Code\obsidian\obsidian-agenda\docs\todo.md` (v1.1.0).
- Arquitectura y estilo: `C:\Code\obsidian\obsidian-agenda\docs\mejores-practicas.md`.