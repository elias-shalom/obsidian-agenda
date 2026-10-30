---
name: "Arquitectura técnica - Agenda Tasks"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: task-management
archetype: engineer
status: active
related:
  - "[[README]]"
  - "[[Modelo de datos]]"
  - "[[PRD - Módulo Agenda Tasks]]"
created: 2026-09-25
tags:
  - obsidian-agenda
  - documentation
  - architecture
---

# Arquitectura técnica — Módulo Agenda Tasks

> Lectura previa recomendada: `docs/mejores-practicas.md` y `src/views/base-view.ts`.

## 1. Visión general

```
src/
├─ core/
│  ├─ task-manager.ts        # orquestador: extracción + cache + filtro + orden + queries
│  ├─ task-extractor.ts       # parsea archivos -> Task[]
│  ├─ task-filter.ts          # filtrado multi-criterio
│  ├─ task-sorter.ts          # ordenamiento y agrupación multi-campo
│  ├─ task-writer.ts          # anexa una línea de tarea nueva a un archivo
│  ├─ task-cache.ts           # cache de 2 niveles (por archivo + global) con TTL
│  ├─ task-query-handler.ts   # queries de conveniencia (hoy, vencidas, alta prioridad, …)
│  ├─ event-bus.ts            # singleton de eventos (mitt) para desacoplar cache/UI
│  ├─ view-manager.ts         # registro/activación de vistas (tareas + hábitos)
│  └─ modal-manager.ts        # apertura de modales (crear/editar tarea, captura rápida)
├─ entities/
│  ├─ task.ts                 # entidad Task (modelo final)
│  ├─ task-file.ts             # TasksFile (envoltura de TFile + metadatos)
│  └─ task-section.ts          # parser de línea (emoji + Dataview)
├─ types/
│  ├─ interfaces.ts            # ITask*, ViewData, TaskFilterCriteria, etc.
│  └─ enums.ts                 # CoreTaskStatus, TaskPriority, CalendarViewType, …
├─ views/
│  ├─ base-view.ts             # clase abstracta común a todas las vistas
│  ├─ overview-view.ts / list-view.ts / table-view.ts
│  ├─ calendar-view.ts (abstracta) + calendar-{day,week,workweek,month,year}-view.ts
│  ├─ timeline-view.ts / gantt-view.ts   (placeholders)
│  └─ templates/*.hbs
├─ modals/
│  ├─ task-modal.ts
│  └─ templates/create-task-modal.hbs
└─ settings/
   ├─ settings.ts              # AgendaPluginSettings + defaults
   └─ setting-tab.ts           # UI de configuración (declarativa + legacy)
```

## 2. Núcleo (`src/core/`)

### 2.1 `TaskManager`

Orquestador central. Compone internamente `TaskCache`, `TaskExtractor`, `TaskFilter`, `TaskSorter` y `TaskQueryHandler`.

| Método | Responsabilidad |
|---|---|
| `registerEvents(plugin)` | Suscribe listeners a `modify`/`create`/`delete`/`rename` de archivos `.md` del vault. |
| `invalidateFileCache(filePath)` | Borra el cache de un archivo puntual. |
| `invalidateCache()` | Borra todo el cache (global + por archivo). |
| `cleanup()` | Libera listeners/recursos al descargar el plugin. |
| `getAllTasks()` | Devuelve todas las tareas; usa el cache si es válido, si no dispara un refresco completo. |
| `getFilteredTasks(criteria?)` | Aplica `TaskFilter` + `TaskSorter` + límites/agrupación sobre el resultado de `getAllTasks()`. |
| `getPendingTasks()` / `getCompletedTasks()` / `getTodayTasks()` / `getOverdueTasks()` / `getHighPriorityTasks()` | Atajos que delegan en `TaskQueryHandler` con criterios predefinidos. |

**Refresco completo** (cuando el cache global no es válido):
1. Lista todos los archivos markdown del vault, ordenados por ruta.
2. Los procesa **en lotes de 10** (para no bloquear el hilo principal).
3. Por archivo: si ya hay cache de ese archivo lo reutiliza; si no, llama a `TaskExtractor.extractTasksFromFile()`.
4. Actualiza el cache por archivo y, al terminar, el cache global.

### 2.2 `TaskExtractor`

| Método | Descripción |
|---|---|
| `extractTasksFromFile(file)` | Punto de entrada: intenta usar `metadataCache` de Obsidian (`cache.listItems` filtrando `item.task !== undefined`); si no hay cache disponible, cae al método manual. |
| `extractTasksFromCache(file, cache, content)` (privado) | Camino rápido usando el índice de Obsidian. |
| `extractTasksTraditionally(file, content, frontmatter)` (privado) | Camino de respaldo: aplica `TaskSection.taskFormatRegex` línea por línea. |
| `createTaskFromLine(file, line, lineNumber, frontmatter)` (privado) | Ensambla el objeto `ITask` completo: llama `TaskSection.initialize()`, `Task.extractStatusFromHeader()`, `Task.extractTags()`, resuelve `root` de la ruta y arma `ITaskFile`/`ITaskLine`/`ITaskState`/`ITaskDate`/`ITaskSection`/`ITaskFlow`. |

### 2.3 `TaskFilter`

Método público `filterTasks(tasks, criteria?)`, apoyado en privados especializados por tipo de criterio: `matchesStatusFilters`, `matchesTextFilters`, `matchesTagFilters`, `matchesPriorityFilters`, `matchesDateFilters` (operadores `before`/`on`/`after` por campo de fecha, más los relativos `today`/`tomorrow`/`thisWeek`/`nextWeek`/`overdue`), `matchesLocationFilters` y `matchesAdvancedFilters` (recurrencia/dependencias).

### 2.4 `TaskSorter`

- `sortTasksByMultipleFields(tasks, sortFields[], directions[])` — ordena en cascada por varios `SortField`.
- `compareTasks(a, b, field)` / `compareDates(dateA, dateB)` (privados) — comparadores por campo, con nulos siempre al final.
- `groupTasks(tasks, groupField)` — agrupa por `status`/`priority`/`dueDate`/`path`/`tags`.

### 2.5 `TaskWriter`

- `appendTaskLine(filePath, line)` — normaliza la ruta, crea el archivo si no existe (`vault.create`) o lee+concatena+escribe si ya existe (`vault.read` + `vault.modify`), cuidando los saltos de línea al inicio/final. Genera el texto en formato emoji crudo (ej. `- [ ] Tarea 📅 2026-10-01 ⏫`).
- `updateTaskLine(filePath, lineNumber, transform)` (v1.1.4, Fase D) — reescribe **en su lugar** una línea de tarea existente: localiza el archivo, separa el contenido en líneas, valida que la línea indicada siga pareciendo una tarea (`isTaskLine`, por si el archivo cambió entre el render y la acción) y aplica `transform` solo a esa línea, dejando el resto del archivo intacto. Devuelve `false` sin escribir nada si el archivo no existe o la línea ya no es válida. Es el prerrequisito compartido por drag and drop (§7) y por la edición de tareas nativas (`"edit-task"`, implementada — ver §8).

### 2.6 `TaskCache`

- `tasksCache: Map<string, ITask[]>` (por archivo) + `allTasksCache: ITask[] | null` (global) + `lastRefreshTime` + `CACHE_TTL = 300000` (5 min).
- `isGlobalCacheValid()`, `getGlobalCache()/setGlobalCache()`, `hasFileCache()/getFileCache()/setFileCache()`.
- `invalidateFileCache(filePath)` / `invalidateAllCache()` — además de limpiar el Map, invalidan el cache global y emiten `TASKS_UPDATED` por el `EventBus`.
- `getCacheStats()` — `{ filesCached, globalCacheSize, lastRefreshTime, isValid }`, útil para depuración.

### 2.7 `EventBus`

Singleton (`EventBus.getInstance()`) construido sobre la librería `mitt`. Eventos definidos en `EVENTS`:

```ts
TASKS_UPDATED = 'tasks:updated'
TASK_ADDED = 'task:added'
TASK_MODIFIED = 'task:modified'
TASK_DELETED = 'task:deleted'
FOLDERS_UPDATED = 'folders:updated'
```

`TaskCache` emite `TASKS_UPDATED` al invalidar cualquier cache; el resto del sistema puede suscribirse con `.on()`/`.off()`.

### 2.8 `TaskQueryHandler`

Recibe por constructor un callback `filterTasks` (inyectado desde `TaskManager`) y expone queries predefinidas: `getPendingTasks`, `getCompletedTasks`, `getTodayTasks` (+ orden por prioridad/texto), `getTomorrowTasks`, `getOverdueTasks` (+ orden por `dueDate`), `getThisWeekTasks`, `getNextWeekTasks`, `getRecentlyCompletedTasks(days=7)`, `getHighPriorityTasks`, `getTasksByTags(tags[])`.

### 2.9 `ViewManager`

- `registerViews()` — llama `plugin.registerView()` para cada `VIEW_TYPE` (tareas y hábitos).
- `activateView(viewType, leaf?)` — crea/reutiliza un leaf, `setViewState()` y `workspace.revealLeaf()`.
- Vistas de tareas registradas: Overview, List, Table, Calendar (Month/Week/WorkWeek/Day/Year), Timeline, Gantt.

### 2.10 `ModalManager`

Tipos: `TASK_MODAL_TYPE = "create-task"`, `EDIT_TASK_MODAL_TYPE = "edit-task"`, `QUICK_CAPTURE_MODAL_TYPE = "quick-capture"`. Único método público `openModal(modalType, options?)` que instancia y abre un `TaskModal`.

## 3. Flujos clave

### 3.1 Carga y visualización (ej. Overview)

```
Vista.onOpen()
  → BaseView.showLoadingOverlay()
  → TaskManager.getAllTasks()
      → cache global válido? sí → return cache
                             no → refresco completo (lotes de 10, TaskExtractor por archivo)
  → vista calcula sus datos derivados (KPIs, agrupaciones, etc.)
  → BaseView.render(viewType, data, i18n, plugin, leaf)
      → renderiza header.hbs + <view-type>.hbs con Handlebars
  → setupViewSpecificEventListeners()
```

### 3.2 Invalidación de cache ante cambios del vault

```
Evento 'modify' | 'create' | 'delete' | 'rename' del vault (archivo .md)
  → listener registrado en TaskManager.registerEvents()
  → TaskManager.invalidateFileCache(filePath)
      → TaskCache: borra entrada del Map, anula el cache global, emite 'tasks:updated'
  → próxima llamada a getAllTasks() dispara un refresco
```

### 3.3 Parseo de una línea con campos emoji/Dataview

```
TaskSection.initialize(línea)
  → extractHeader()        # "[x] texto corto"
  → extractDescription()   # texto extendido antes de los campos
  → extractTasksFields()   # resuelve 📅🛫⏳➕✅❌ ⏬…⏫🔺▶️ 🔁 🆔 ⛔ 🏁
                            # y equivalentes Dataview (due:: / priority:: / repeat:: / …)
  → extractBlockLink()     # ^abc123 al final de la línea
→ Task.extractStatusFromHeader() + Task.extractTags()
→ Task.create({...})
```

## 4. Integración en `main.ts`

En el constructor de `ObsidianAgenda` se instancian, en orden: `I18n`, `TaskManager`, `HabitManager`, `ViewManager`, `ModalManager`. En `onload()`: se cargan settings e idioma, se agrega la pestaña de configuración, se registran los ribbon icons y comandos (incluido "crear tarea" vía `ModalManager.openModal(TASK_MODAL_TYPE)`), se llama `taskManager.registerEvents(this)` y `viewManager.registerViews()`. En `onunload()`: `viewManager.unregisterViews()`, `taskManager.cleanup()`, `habitManager.cleanup()`.

## 5. Configuración relacionada (`src/settings/settings.ts`)

| Setting | Tipo | Rol |
|---|---|---|
| `showOverviewTab` / `showListTab` / `showTableTab` / `showCalendarTab` | `boolean` | Visibilidad de cada grupo de vistas de tareas en el header. |
| `weekStartDay` | `number` (1–7, ISO) | Día de inicio de semana; al cambiarlo, `setting-tab.ts` sólo llama `refreshView()` sobre los leaves cuyas vistas son de tipo calendario (`CALENDAR_VIEW_TYPES`), no sobre todas las vistas abiertas. |
| `calendarShowDueDates` (default `true`) / `calendarShowStartDates` (default `false`) / `calendarShowScheduledDates` (default `true`) | `boolean` | Grupo **"Calendario"** (v1.1.4) — qué tipos de fecha ancla una tarea a un día del calendario (`CalendarView.getTasksForDate()`, prioridad `scheduled > due > start`, ADR-T4). |
| `calendarShowCompletedTasks` (default `true`) | `boolean` | Grupo "Calendario" (v1.1.4) — si `false`, las tareas completadas se excluyen por completo de las vistas de calendario en vez de solo atenuarse (ADR-T6). |

No existe (a diferencia de hábitos) una ruta configurable para las tareas ni ajustes de patrones de emoji personalizados. Los cuatro settings de "Calendario" refrescan las vistas de calendario abiertas al cambiar (`SettingTab.refreshCalendarViews()`), igual que `weekStartDay`.

## 6. Nueva superficie: inserción de campos desde el editor de notas (v1.1.4, implementado)

> Hasta hoy este plugin **nunca** interviene el editor de texto en vivo de Obsidian — todo es `ItemView` + Handlebars, vistas separadas de la nota. Esta es la primera funcionalidad que toca el editor de una nota mientras se escribe, así que merece su propia decisión de arquitectura (no es un cambio de datos, es una nueva superficie de integración).

### 6.1 Problema

Se quiere poder agregar `📅`/`🛫`/`⏳`/`🕐`/`⏱️`/prioridad/etc. a una línea de tarea **sin salir del editor** ni abrir el `TaskModal`, similar a como el plugin real [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) muestra un menú de iconos al escribir, o como Meta Bind ofrece opciones adicionales con un segundo clic sobre el elemento ya renderizado.

### 6.2 Opciones evaluadas

| Opción | Mecanismo (API de Obsidian) | Esfuerzo / riesgo |
|---|---|---|
| **B1 — `EditorSuggest` completo estilo Tasks** | Trigger al escribir (ej. tras el checkbox + espacio) abre un popup con la lista de iconos; elegir uno inserta el emoji y encadena a un selector de valor | **Alto**: subsistema nuevo completo (detección de contexto línea a línea, popup flotante, manejo de foco/teclado dentro de CodeMirror); es lo más "nativo" pero lo más caro de construir y mantener |
| **B2 — Menú contextual (clic derecho) sobre la línea** | `app.workspace.on('editor-menu', ...)`: si el cursor está en una línea que matchea el formato de tarea, se agregan ítems al menú nativo de clic derecho | **Medio-bajo**: API ya expuesta por Obsidian, no compite con CodeMirror; parecido a lo descrito de Meta Bind ("segundo clic") |
| **B3 — Comando + atajo de teclado con `Menu` nativo** | Un comando (ej. `Ctrl+Shift+D`) abre un `Menu` de Obsidian con las mismas opciones que B2, sin depender de dónde se hizo clic | **Bajo**: reutiliza el patrón de comandos que ya existe en `main.ts` (Ctrl+P) |
| **B4 — Captura del valor con `flatpickr`** | Al elegir "agregar fecha"/"agregar hora" en B2/B3, se abre un popup de `flatpickr` (con `enableTime: true` si aplica) anclado cerca del cursor | Bajo costo adicional: `flatpickr` ya es dependencia instalada (usada en `TaskModal`), solo hay que anclarla a una posición del editor en vez de a un modal |

### 6.3 Decisión

**B2 + B3 + B4 combinados**; B1 queda diferido. Cubre tanto al usuario de mouse (clic derecho) como al de teclado (atajo, igual que ya tienen con Ctrl+P), sin construir un `EditorSuggest` desde cero ni pelear con los internals de CodeMirror. Si más adelante se quiere la experiencia idéntica a Tasks (menú al escribir), B1 queda anotado como posible fase 2, no bloquea v1.1.4.

Desglose de tareas de esta decisión: ver [[Plan de implementación]] — Fase B. El `TaskModal` (creación/edición) recibe por separado un modo básico/avanzado con los mismos campos — ver [[Especificación de vistas]] §7.

## 7. Drag and drop en las vistas de calendario (v1.1.4, Fase D, implementado)

### 7.1 Mecanismo

Se usa la [Drag and Drop API nativa del navegador](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) (`draggable`, `dragstart`/`dragover`/`drop`), no una librería externa — el plugin no la tenía como dependencia y el caso de uso (arrastrar una píldora a una celda dentro del mismo contenedor renderizado) no la necesita.

- **Origen del drag** (común a Mes/Semana/Semana laboral/Día, cableado una sola vez en `CalendarView.setupViewSpecificEventListeners`): cada `.oa-calendar-task` con `draggable="true"` serializa en `dataTransfer` (`application/json`) un payload `TaskDragPayload` — `filePath`, `lineNumber`, `calendarDateType` (`due`/`start`/`scheduled`, tomado de `data-date-type`) y `scheduledTime` (tomado de `data-scheduled-time`, solo presente en las franjas horarias de Día). `CalendarView.parseTaskDragPayload()` es el único punto que deserializa y valida ese payload.
- **Destino en Mes/Semana/Semana laboral** (`CalendarView`, clase base): las celdas de día (`.oa-calendar-month-day`, `.oa-calendar-week-day-container`) aceptan el drop y llaman a `handleTaskDayDrop()`, que resuelve la transformación de línea según `calendarDateType` (`due`/`start` → `upsertSimpleDate`, `scheduled` → `upsertScheduledDate`, preservando hora/duración ya existentes) y la aplica con `TaskWriter.updateTaskLine()`. Si la escritura falla (línea que ya no se puede localizar), se muestra un `Notice` (`task_line_changed`) en vez de fallar silenciosamente.
- **Destino en Día** (`CalendarDayView`, sobrescribe el mismo patrón): las franjas horarias (`.oa-calendar-hour-slot`) solo aceptan payloads con `calendarDateType === 'scheduled'` y llaman a `handleHourSlotDrop()`, que arma la nueva hora `HH:mm` combinando la hora de la franja destino con los minutos originales del payload, y la aplica con `upsertScheduledTime()`.
- Tras un drop exitoso, cada vista llama a `this.refreshView()` (mismo patrón que el resto de acciones del calendario) para re-renderizar con los datos actualizados del vault.

### 7.2 Limitaciones conocidas (anotadas, no bloquean la fase)

- **Vista Año**: sus celdas de día (`.oa-calendar-year-day`) solo muestran un contador de tareas, no píldoras individuales (ver [[Especificación de vistas]] §4.5) — no hay de dónde iniciar un drag, así que el arrastre de tareas no aplica ahí en la práctica, aunque el selector de destino compartido la incluya sin efecto negativo.
- **Redimensionar la duración arrastrando el borde inferior** (mencionado en el plan original) requiere que el bloque de una tarea programada ocupe visualmente varias franjas según su duración — eso está explícitamente fuera de alcance de v1.1.4 (ver [[Plan de implementación]], "Fuera de alcance"), así que esta fase implementa solo el cambio de hora por arrastre, no el redimensionado.

## 8. Edición de tareas existentes y refresco de vistas (implementado, 2026-09-27)

- **Modal reutilizado**: `"edit-task"` renderiza la misma plantilla que `"create-task"` (`TaskModal.buildTemplateData(task?)` decide los valores prefilled) y comparte casi toda la lógica de formulario (`attachTaskFormListeners()`), incluida la validación cruzada hora/duración. Solo cambia el guardado: `appendTaskLine` (crear) vs. `updateTaskLine` (editar, reconstruye la línea completa desde el formulario preservando el carácter de estado del checkbox y el `blockLink` original, que el formulario no expone). Detalle completo de los campos y la UI en [[Especificación de vistas]] §7.3.
- **Origen**: clic simple sobre una tarea en cualquier vista de calendario abre el modal (con la `ITask` ya en memoria, sin releer el archivo); doble clic sigue abriendo el archivo. Ambos gestos comparten el listener `click`/`dblclick` de `.oa-calendar-task`, desambiguados con un `setTimeout` de ~250ms (un doble clic real dispara dos `click` sueltos antes del `dblclick`).
- **Refresco tras guardar**: como ninguna vista se suscribe al `EventBus`/`TASKS_UPDATED` (los refrescos son siempre explícitos — botón, navegación, o el propio drag and drop llamando `refreshView()`), `TaskModal` acepta un callback opcional `ModalOptions.onSaved` y lo invoca justo tras un guardado exitoso. `CalendarView` lo usa para refrescarse a sí misma al crear o editar una tarea desde el calendario.

## 9. Fecha de referencia compartida y selector de fecha (v1.1.9, implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §4.6. Esta sección cubre el mecanismo y su impacto en el código.

### 9.1 Problema técnico

- Cada tipo de vista es una clase distinta; `CalendarView.switchToViewType()` llama a `leaf.setViewState()` y se crea una instancia nueva con `currentDate = DateTime.now()`. La fecha no viaja entre vistas.
- El único traspaso existente es `oa_navigate_to_date` en `localStorage`: lo escribe `navigateToDayView()` y solo `CalendarDayView.onOpen()` lo lee y lo borra.
- Cada subclase asigna `this.currentDate` directamente en sus `navigateToPrevious/Next/Today`.

### 9.2 Mecanismo propuesto

- **Estado compartido**: módulo `src/core/calendar-reference-date.ts` con `getReferenceDate()` y `setReferenceDate(date)`, en memoria y a nivel de módulo (vive mientras el plugin está cargado). Reemplaza `oa_navigate_to_date`.
- **Un único punto de escritura**: `CalendarView.setCurrentDate(date)` actualiza `currentDate` y la referencia. Las acciones de prev/next/hoy de las subclases, el clic en un número de día, el cambio de tipo de vista y el selector pasan por él.
- **Lectura**: `CalendarView.onOpen()` toma la referencia si existe. La lógica propia de `CalendarDayView.onOpen()` (leer y borrar la clave) desaparece.
- **Selección**: `isSelected = currentDate.hasSame(día, 'day')` se calcula en el `generateViewData()` de Mes, Semana, Semana laboral y Año, y se añade a `WeekDayData`, `MonthViewData` y `YearViewData` (`src/types/interfaces.ts`).

### 9.3 Componente selector

- Archivo `src/core/calendar-date-picker.ts` (DOM creado con `createEl`, sin plantilla Handlebars por vista) y estilos en `src/styles/components/_calendar-date-picker.scss`, importado desde `styles.scss`.
- El botón de apertura es la única pieza que se añade a las cinco plantillas (`.oa-calendar-nav-container`); el popover lo construye el componente.
- Máquina de estados de nivel: `days → years → months → days`, con mes/año de exploración propios (no tocan la referencia hasta elegir un día).
- Ciclo de vida: el popover se destruye al cerrar o cuando la vista se re-renderiza; los listeners de `Escape` y de clic fuera se registran al abrir y se retiran al cerrar (o con `registerDomEvent` de la vista) para no acumularlos.
- Posicionamiento: anclado al botón dentro de `.oa-calendar-container` (requiere `position: relative`) o fijo sobre el documento, según lo que no recorte `overflow` de los contenedores; se decide al implementar y se verifica en paneles estrechos.
- **Dos modos de montaje**: `popover` (Mes/Semana/Semana laboral/Año) con botón de apertura, posicionamiento anclado, cierre con `Escape`/clic fuera/al elegir día, y devolución de foco; y `docked` (Día) montado directamente en un contenedor fijo del sidebar, sin botón, sin cierre y siempre visible. Ambos modos comparten la máquina de estados de nivel y el constructor de rejilla; solo cambia cómo y dónde se monta el DOM del panel.

### 9.4 Código duplicado que se unifica

- **Letras de día fijas en español**: `generateMiniCalendarData()` define `const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']` a mano, siempre en español y siempre empezando en lunes, sin usar `CalendarView.getLocalizedDayNames()` (el método que ya usan Mes/Semana/Semana laboral/Año, que traduce los nombres vía i18n y los rota según `weekStartDay`). El componente común usa `getLocalizedDayNames()` igual que el resto.
- **Indicadores de tareas sin pasar por los settings**: la misma función arma un `Set` de fechas con tareas recorriendo `this.tasks` y comprobando directamente `task.date.due` y `task.date.scheduled`, sin pasar por `CalendarView.getTasksForDate()`/`resolveCalendarAnchor()`. Esto ignora `calendarShowDueDates`/`calendarShowStartDates`/`calendarShowScheduledDates` (un día se marca "con tareas" aunque el usuario haya apagado ese tipo de fecha), nunca considera `start` aunque esté activado, e ignora `calendarShowCompletedTasks` (cuenta tareas completadas aunque estén ocultas en el calendario). El componente común calcula `hasTasks` como `this.getTasksForDate(day).length > 0`, reutilizando tal cual el método de `CalendarView` (mismo filtro que usa Mes): un día sin tareas visibles bajo los settings actuales no muestra punto, ni en el selector ni en el mini-calendario de Día.
- Los mensajes de navegación del mini-calendario (`previous_month`/`next_month`) se reutilizan; se añaden claves nuevas para abrir el selector, elegir año/mes y navegar años y décadas en los seis locales (misma estructura de claves).

### 9.5 Archivos afectados

| Área | Archivos |
|---|---|
| Estado y base | `src/core/calendar-reference-date.ts` (nuevo), `src/views/calendar-view.ts` |
| Vistas | `calendar-day-view.ts`, `calendar-week-view.ts`, `calendar-workweek-view.ts`, `calendar-month-view.ts`, `calendar-year-view.ts` |
| Tipos | `src/types/interfaces.ts` |
| Plantillas | `calendar-month-view.hbs`, `calendar-week-view.hbs`, `calendar-workweek-view.hbs`, `calendar-year-view.hbs`, `calendar-day-view.hbs` |
| Estilos | `_calendar-common.scss`, `_calendar-month.scss`, `_calendar-week.scss`, `_calendar-workweek.scss`, `_calendar-year.scss`, `_calendar-day.scss`, `components/_calendar-date-picker.scss` (nuevo), `styles.scss` |
| Selector | `src/core/calendar-date-picker.ts` (nuevo) |
| i18n | `src/locales/{en,es,de,fr,it,pt}.json` |

### 9.6 Riesgos

- **Cambio de comportamiento visible**: cambiar de tipo de vista *dentro del calendario* deja de volver a hoy. Debe constar en el changelog de la versión.
- **La pestaña "Calendario" del encabezado no cambia**: sigue abriendo siempre Mes en la fecha actual (`BaseView.attachEventTabs()` activa `calendar-month-view` sin leer la referencia). Si el usuario navegó a una fecha lejana, cambió a Lista/Tabla/Hábitos y vuelve a Calendario por esa pestaña, verá Mes y hoy, no la última fecha — es la mitigación elegida para no "perder" el calendario en una fecha vieja al volver días después.
- **Recorte por `overflow`**: contenedores como `.oa-calendar-day-main-view` ocultan el desbordamiento; el popover debe probarse en todas las vistas.
- **Re-render completo**: cualquier cambio de fecha vuelve a dibujar la vista; el estado del selector no sobrevive, y es el comportamiento deseado.
- **Coste de `refreshView()`**: fuerza recarga de tareas en cada navegación. Para el selector se prefiere `refreshCalendar()` con las tareas ya cargadas (no se midió el coste real).
- **Inicio de semana inconsistente**: Semana usa semana ISO y Mes usa `weekStartDay`; con inicio en domingo el selector, Mes y Semana no coincidirían. Es preexistente y queda fuera de alcance.
- **Bug encontrado y corregido durante la implementación**: las 5 subclases de `CalendarView` (Mes/Semana/Semana laboral/Año/Día) definían su propio `onClose()` sin llamar a `super.onClose()`, sombreando por completo la limpieza de la clase base. Esto dejaba huérfano el popover del selector (nunca se cerraba) y, más notorio, el tooltip temático (`src/core/tooltips.ts`): su DOM vive en `document.body`, fuera del contenedor de la vista, así que al cambiar de tipo de vista (`switchToViewType()` destruye la instancia vieja sin pasar por `render()`/`clearTooltips()`) un tooltip visible quedaba flotando para siempre, visible junto a un segundo tooltip nuevo al volver a pasar el mouse por un botón similar en la vista nueva. Arreglado: `CalendarView.onClose()` ahora llama a `clearTooltips()` + `closeActiveDatePicker?.()`, y las 5 subclases llaman a `super.onClose()`.
- **Sidebar de Día colapsable (añadido durante la implementación, fuera del diseño original)**: una manija (`.oa-calendar-sidebar-toggle`) entre `.oa-calendar-day-main-view` y `.oa-calendar-mini-sidebar` alterna la clase `.oa-calendar-mini-sidebar--collapsed` (ancho/padding a 0 con transición); el layout usa flexbox puro (`flex-grow: 1` en la vista principal, sin `width: calc()`) para que el espacio se redistribuya solo. Estado persistido en `localStorage` (`calendar_day_sidebar_collapsed`) e incluido en `DayViewData.sidebarCollapsed` para que el primer render ya sea correcto.
- **Clic simple para seleccionar (decisión 3 de §4.6.7 revisada)**: inicialmente diferido, se implementó igual que el patrón ya usado para distinguir clic/doble clic en las tareas (`TASK_CLICK_DELAY_MS`): el `click` de una celda arma un `setTimeout`; si llega `dblclick` antes, se cancela y solo se crea la tarea; si no, se cumple y se llama `setCurrentDate()` + `refreshCalendar()`.
- **Ajustes visuales de la rejilla del selector** (no estaban en el diseño original, encontrados al revisar visualmente): `grid-template-rows` explícito en vez de `grid-auto-rows`/`aspect-ratio` (evita que la última fila quede recortada por el `overflow: hidden` del panel antes de que el navegador resuelva el alto); `row-gap`/`column-gap` distintos en la rejilla de días (las celdas quedan más anchas que altas); `.oa-has-tasks` recuperó el contorno de acento que tenía el mini-calendario original, no solo el punto; `.oa-date-picker--popover` ensanchado a 290px.

## 10. Bloques con duración en la vista por Día (v1.1.9, implementado)

Comportamiento de usuario y decisiones abiertas: [[Especificación de vistas]] §4.7.

### 10.1 Enfoque: píldora conectada, sin capa superpuesta

En vez de una capa `position: absolute` sobre toda la columna de 24 horas (lo planteado inicialmente), se reutiliza tal cual la técnica visual que ya usa Habit Grid para las rachas: clases `oa-habit-grid-cell--run-start`/`--run-middle`/`--run-end` (`src/styles/views/_habit-grid.scss`) que manipulan `border-radius` de un pseudo-elemento y eliminan el borde de unión entre celdas adyacentes para que se vean como una sola píldora continua. Ahí se aplica horizontalmente entre días; aquí se aplica verticalmente entre medias-horas dentro de `.oa-calendar-day-hours`.

### 10.2 Datos

`CalendarDayView.generateViewData()` calcula, para cada tarea con `scheduledTime`, un rango de índices de media-hora `[startHalfSlot, endHalfSlot)` (0–47 dentro del día) y un `segmentRole` (`'point' | 'half' | 'start' | 'middle' | 'end'`) por segmento. `HourSlot` (`src/types/interfaces.ts`) gana una forma de exponer sus tareas por mitad (superior/inferior) además de los segmentos que la cruzan completa.

### 10.3 Carriles (lanes)

Asignación greedy de intervalos: ordenar las tareas de un conglomerado de solapamiento por hora de inicio, asignar cada una al primer carril cuya última tarea no se solape; el ancho de columna de ese conglomerado es `100% / número de carriles`. El conglomerado (no el día completo) acota el cálculo, para no dividir en columnas las horas sin solapes.

**Implementado así**: `CalendarDayView.generateViewData()` calcula los rangos `[startHalfSlot, endHalfSlotExclusive)` de todas las tareas con duración, los ordena por inicio y los agrupa en conglomerados con un barrido simple (nueva tarea empieza antes de que termine el máximo acumulado del conglomerado actual → se une; si no, se cierra el conglomerado y empieza uno nuevo). Dentro de cada conglomerado, `laneIndex`/`laneCount` se calculan con el greedy de intervalos y se adjuntan a cada `DurationTaskSegment`. La plantilla escribe `style="--oa-lane-count: N; --oa-lane-index: i;"` en cada segmento (único uso de `style` inline del proyecto para este caso, ya que el valor es puramente dinámico por tarea); `.oa-calendar-task--duration` en `_calendar-day.scss` usa esas variables en `flex: 0 0 calc(100% / var(--oa-lane-count))` y `order: var(--oa-lane-index)` dentro de `.oa-calendar-half-slot` (`display: flex` en fila), de modo que los carriles sin tarea en una media-hora concreta quedan en blanco en vez de que la tarea presente se expanda a ocuparlos.

### 10.4 Redimensionar arrastrando

Listener `pointerdown`/`pointermove`/`pointerup` en la manija del segmento final (análogo al dial de hábitos en cuanto a patrón de arrastre, pero lineal no circular); snap a pasos de 30 minutos; escribe con `upsertScheduledDuration()` (ya existe en `src/core/task-line-fields.ts`) + `TaskWriter.updateTaskLine()`.

**Implementado así**: `.oa-calendar-resize-handle` se renderiza solo en el último segmento de cada tarea (roles `half`/`end`), con `draggable="false"` explícito para no disparar el `dragstart` nativo de la píldora contenedora (que sigue sirviendo para moverla a otra franja/día); el `pointerdown` también llama a `stopPropagation()` como refuerzo. El tamaño de un paso de 30 min se mide en vivo (`getBoundingClientRect().height` de `.oa-calendar-hour-row` dividido 2) en vez de un valor fijo, para no desalinearse si cambia el alto de fila. Mientras se arrastra, una insignia (`.oa-calendar-resize-tooltip`, creada/destruida en `document.body`, mismo patrón que el tooltip temático) muestra la duración en vivo junto al cursor; el cambio real solo se escribe en el archivo al soltar (`pointerup`), no en cada `pointermove` — mismo patrón de "aplicar al soltar" que el resto del drag and drop del calendario. Como las tareas sin duración ahora comparten el mismo sistema de segmentos (§10.2, revisado), también ganan una manija: arrastrar hacia abajo les asigna una duración por primera vez vía `upsertScheduledDuration()` (que solo requiere que ya exista una hora, no una duración previa).

### 10.5 Línea de media hora

`::after` con borde punteado al 50% de la altura de cada `.oa-calendar-hour-row`; puramente visual (SCSS), no toca el DOM de tareas.

### 10.6 Archivos afectados

| Área | Archivos |
|---|---|
| Vista | `src/views/calendar-day-view.ts` |
| Tipos | `src/types/interfaces.ts` (`HourSlot`) |
| Plantilla | `src/views/templates/calendar-day-view.hbs` |
| Estilos | `src/styles/views/_calendar-day.scss` (clases `--run-start/--run-middle/--run-end` adaptadas o reutilizadas desde `_habit-grid.scss`) |
| Escritura | `src/core/task-line-fields.ts` (`upsertScheduledDuration`, ya existe), `src/core/task-writer.ts` |

### 10.7 Riesgos

- **Aproximación visual, no exacta**: el redondeo hacia arriba del fin (§4.7.2 de [[Especificación de vistas]]) hace que el bloque dibujado pueda ser un poco más largo que la duración real; es intencional y debe quedar claro que no afecta el dato guardado.
- **Recalcular conglomerados en cada refresco**: el cálculo de carriles depende de qué tareas existen ese día; debe rehacerse en cada `refreshCalendar()`, igual que el resto de `generateViewData()`.
- **Arrastre de la tarea completa a otro día**: el drag and drop existente (v1.1.4, Fase D) sigue tomando la píldora como un solo origen de arrastre; con múltiples segmentos DOM por tarea, el `dragstart` debe quedar en el segmento `--run-start` (o en la celda única si es de menos de una hora), no duplicado en cada segmento.

## 11. Doble clic para crear tarea en la vista Día (v1.1.9, implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §4.4.1.

### 11.1 Causa raíz

`CalendarView.setupViewSpecificEventListeners()` cablea el doble-clic-para-crear sobre `container.querySelectorAll<HTMLElement>('.oa-calendar-month-day, .oa-calendar-week-day-container, .oa-calendar-day-column, .oa-calendar-year-day')`. `.oa-calendar-day-column` no existe en `calendar-day-view.hbs` (es una clase de un diseño anterior, todavía presente como CSS muerto en `_calendar-day.scss`); por eso el `querySelectorAll` nunca encuentra nada que coincida en Día.

### 11.2 Corrección

- Reemplazar `.oa-calendar-day-column` por `.oa-calendar-hour-slot` y `.oa-calendar-allday-content` en ese mismo selector compartido, o añadir un wiring específico en `CalendarDayView.setupViewSpecificEventListeners()` (ya existe y llama a `super`) si hace falta pasar la hora de la franja.
- El guard existente `if ((e.target as HTMLElement).closest('.oa-calendar-task')) return;` se mantiene igual.
- `CalendarView.openCreateTaskForDate(dateStr)` se reutiliza sin cambios para el doble clic en `.oa-calendar-allday-content`.
- Nuevo método (o parámetro opcional) para el caso de franja horaria, que además de `dateStr` pase la hora (`data-hour` de `.oa-calendar-hour-slot`) como `modalOptions.scheduledTime`.

### 11.3 Bug relacionado: `modalOptions.today` nunca se lee

`TaskModal.buildTemplateData()` (rama sin `task`, o sea creación) calcula `const today = DateTime.now().toFormat("yyyy-MM-dd")` y lo usa directamente para `scheduledDateValue`; nunca consulta `this.modalOptions?.today`, aunque `openCreateTaskForDate()` ya se lo pasa en el payload (`{ today: dateStr, onSaved }`). Esto significa que el doble clic para crear tarea en Mes/Semana/Semana laboral/Año **ya hoy** ignora el día de la celda y siempre prellena la fecha actual — bug preexistente, no introducido por v1.1.9. Corrección propuesta: `buildTemplateData()` debe usar `(this.modalOptions?.today as string | undefined) ?? DateTime.now().toFormat("yyyy-MM-dd")`, y de forma análoga leer una clave nueva `modalOptions.scheduledTime` para prellenar `scheduledTimeValue` en el caso de doble clic sobre una franja horaria de Día.

### 11.4 Altura mínima de la sección "Todo el día"

`.oa-calendar-allday-content` no tiene `min-height` hoy; si un día no tiene ninguna tarea de todo el día, el contenido queda sin filas (`.oa-calendar-allday-row` solo se renderiza condicionalmente por tipo), dejando un área casi inexistente para hacer doble clic. Se le añade un `min-height` fijo (a definir al implementar, orientativamente similar a una fila de tarea) para que siempre haya un área vacía reconocible.

## 12. Selector de tipo de vista: multi-botón segmentado (v1.1.9, implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §4.8.

### 12.1 Reutilización del patrón de la prioridad del Task Modal

`.oa-priority-segmented`/`.oa-priority-pill` (`src/styles/components/_modal.scss`) ya resuelve exactamente el mismo problema (6 botones planos, uno seleccionado a la vez) para la prioridad del Task Modal. El nuevo control reutiliza la misma base visual (sin fondo/borde hasta hover/activo, clase `.oa-active` para el botón seleccionado), con una variante compacta sin espacio entre botones (`.oa-calendar-view-segmented`, nueva clase) ya que aquí el objetivo es que se vean pegados como un único control, no píldoras sueltas.

### 12.2 Plantillas e íconos

Las 5 plantillas de calendario (pronto 6, con Lista) reemplazan su `<select id="oa-calendar-view-dropdown">` por el grupo de botones. Cada botón usa el ícono vía Obsidian `setIcon()` (Lucide) y un atributo `title` con la clave i18n del nombre de la vista (`year_view`/`month_view`/`week_view`/`workweek_view`/`day_view`/futura clave de Lista) — el `title` se convierte automáticamente en tooltip temático porque `installTooltips()` ya corre sobre todo el contenido renderizado por `BaseView.render()` (ver §8, tooltips del plugin), sin trabajo adicional en este cambio.

### 12.3 Lógica sin cambios

`CalendarView.setupViewSpecificEventListeners()` reemplaza el listener `change` del `<select>` por un `click` por botón, pero sigue llamando a `switchToViewType(viewType)` tal cual existe hoy — ningún otro método cambia.

### 12.4 Archivos afectados

| Área | Archivos |
|---|---|
| Plantillas | `calendar-month-view.hbs`, `-week-`, `-workweek-`, `-day-`, `-year-view.hbs` (y la vista Lista del calendario, pospuesta a v1.1.10) |
| Vista | `src/views/calendar-view.ts` (wiring de clic en vez de `change`) |
| Estilos | nueva clase `.oa-calendar-view-segmented` en `src/styles/views/_calendar-common.scss`, reutilizando variables/mixins de `.oa-priority-pill` |
| i18n | ninguna clave nueva si se reutilizan las existentes (`year_view`/`month_view`/etc.) para los `title` |

### 12.5 Riesgos

- **Ambigüedad Semana vs. Semana laboral solo con ícono**: mitigado por el tooltip obligatorio (§4.8.1, decisión 1). Set final: Año `calendar-range`, Mes `calendar-days`, Semana `columns-3`, Semana laboral `briefcase`, Día `calendar-clock`.
- **Compacidad en paneles estrechos**: 5 botones pegados (6 con Lista en v1.1.10) deben seguir cabiendo en el encabezado del calendario junto al resto de controles (fecha de referencia, selector de fecha, navegación); se verifica en el mismo caso límite de panel estrecho ya anotado en §4.6.9.

## 13. Vista Día: modo de varios días 1/3/5 (v1.1.10, implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §4.4.3. Pospuesto de v1.1.9 a v1.1.10.

### 13.1 Enfoque

`CalendarDayView` gana un modo interno `daysToShow: 1 | 3 | 5` (preferencia persistida en `localStorage`, mismo patrón que `calendar-grid-style`/`calendar-workweek-grid-style` de Semana/Semana laboral). No se registra ningún tipo de vista nuevo ni se toca el selector segmentado de §12; el multi-botón 1/3/5 se renderiza solo dentro de `calendar-day-view.hbs`.

### 13.2 Datos

`generateViewData()` calcula, a partir de la fecha de referencia y `daysToShow`, un rango centrado de fechas (`referencia - floor(N/2)` a `referencia + floor(N/2)`) y genera, para cada día del rango, la misma estructura que hoy produce un solo `DayViewData` (hour slots con segmentos de duración/carriles del §10, sección "todo el día"). El resultado es un arreglo de "columnas de día", reutilizando por columna toda la lógica de generación de segmentos ya definida para Día (sin capa superpuesta, carriles por conglomerado acotados a esa columna).

### 13.3 Plantilla

`.oa-calendar-hour-row` pasa de tener 1 `.oa-calendar-hour-label` + 1 `.oa-calendar-hour-slot` a 1 `.oa-calendar-hour-label` compartida + N `.oa-calendar-hour-slot` (una por columna visible), dispuestas en fila. La sección "todo el día" se repite igual, una por columna.

### 13.4 Navegación

`navigateToPrevious()`/`navigateToNext()` en este modo mueven la fecha de referencia ±1 día (no ±N), desplazando toda la ventana centrada un día a la vez.

### 13.5 Archivos afectados

| Área | Archivos |
|---|---|
| Vista | `src/views/calendar-day-view.ts` |
| Tipos | `src/types/interfaces.ts` (`DayViewData` → estructura multi-columna) |
| Plantilla | `src/views/templates/calendar-day-view.hbs` |
| Estilos | `src/styles/views/_calendar-day.scss` (fila de N columnas por hora) |

## 14. Manejo de estatus desde el calendario (v1.1.10, implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §4.9 y §7.5. Símbolos/ADRs: [[Modelo de datos]] §10.

### 14.1 Modelo de datos

- `CoreTaskStatus`/`CoreTaskStatusIcon` (`src/types/enums.ts`) ganan un sexto valor: `OnHold = "?"` / ícono `⏸️`. `Task.extractStatusFromHeader()` ya valida contra `Object.values(CoreTaskStatus)`, así que reconocer `?` no requiere tocar esa función — solo añadir el valor al enum.
- `getCoreTaskStatusName()`/`getCoreTaskStatusEmoji()` (`task-extractor.ts`) ganan el caso `OnHold` → `"OnHold"` / `CoreTaskStatusIcon.OnHold`, siguiendo el mismo patrón que `nonTask`.

### 14.2 Escritura: nuevo `upsertTaskStatus()`

Nueva función en `src/core/task-line-fields.ts`, análoga a las demás `upsertXxx`: recibe la línea completa y el símbolo nuevo (`CoreTaskStatus`), reemplaza el carácter entre `[` y `]`, y:
- si el símbolo nuevo es `Done` y la línea no tiene `✅`, agrega `✅ <hoy>`;
- si el símbolo anterior era `Done` y el nuevo no lo es, quita el campo `✅` existente (si lo hay).

Se usa tanto desde el menú contextual del calendario como desde el Task Modal, vía `TaskWriter.updateTaskLine()` (mismo patrón que el resto de ediciones en el calendario).

### 14.3 Menú contextual en el calendario

`CalendarView` agrega un listener `contextmenu` sobre `.oa-calendar-task` (mismo elemento que ya tiene `click`/`dblclick`/`dragstart`), que abre un `Menu` de Obsidian con las 6 opciones de estado (ícono + texto localizado), reutilizando el patrón ya existente en `task-field-menu.ts` (construcción de `Menu`, posicionamiento en el punto del clic). Al elegir una opción: `upsertTaskStatus()` + `TaskWriter.updateTaskLine()` + `refreshView()`.

### 14.4 Badge visual en las píldoras

Las plantillas de calendario (Mes/Semana/Semana laboral/Día) agregan el ícono de `state.emoji`/`state.icon` al inicio de `.oa-calendar-task`, igual que ya hace Tabla con `priorityIcon`/`state.icon`.

### 14.5 Campo de estado en el Task Modal

`create-task-modal.hbs` gana un segundo segmented control (`.oa-status-segmented`/`.oa-status-pill`, mismo patrón visual que `.oa-priority-segmented`), con las 6 opciones. Al crear, preseleccionado "Todo"; al editar, refleja `task.state.status`. El envío del formulario pasa por `upsertTaskStatus()` igual que el menú contextual, para no duplicar la lógica de agregar/quitar `✅`.

### 14.6 Fix relacionado: `task-filter.ts`

`isTaskCompleted` compara `task.state.status` (símbolo literal) contra las cadenas `'DONE'`/`'CANCELLED'` (que son valores de `state.text`) — nunca es verdadero. Se corrige para comparar `state.text` contra `'Done'`/`'Cancelled'` (los valores reales que produce `getCoreTaskStatusName()`). Se trata como un fix independiente dentro de esta misma fase, no como parte del diseño de estatus en sí.

### 14.7 Archivos afectados

| Área | Archivos |
|---|---|
| Enums | `src/types/enums.ts` (`CoreTaskStatus.OnHold`, `CoreTaskStatusIcon.OnHold`) |
| Extracción | `src/core/task-extractor.ts` (`getCoreTaskStatusName`/`getCoreTaskStatusEmoji`) |
| Escritura | `src/core/task-line-fields.ts` (`upsertTaskStatus`, nuevo) |
| Vista | `src/views/calendar-view.ts` (listener `contextmenu`) |
| Plantillas | `calendar-month-view.hbs`, `-week-`, `-workweek-`, `-day-view.hbs` (badge de estado) |
| Modal | `src/modals/task-modal.ts`, `src/modals/templates/create-task-modal.hbs` (campo de estado) |
| Fix | `src/core/task-filter.ts` (`isTaskCompleted`) |
| i18n | nombres de los 6 estados en los seis locales (algunos ya existen para los filtros de Tabla: `status_todo`, `status_in_progress`, `status_done`, `status_cancelled`, `status_non_task`; falta `status_on_hold`) |

## 15. Selector de fecha unificado en el Task Modal (v1.1.10, implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §7.6.

### 15.1 Enfoque

`TaskModal.setupSimpleDatePicker()` deja de llamar a `flatpickr(input, ...)` y en su lugar abre un popover de `CalendarDatePicker` (`src/core/calendar-date-picker.ts`, ya genérico y reutilizado por las 5 vistas de calendario) anclado al botón disparador existente de cada campo (`#oa-date-trigger`, `#oa-start-trigger`, `#oa-scheduled-trigger`), con el mismo patrón de posicionamiento/cierre que `CalendarView.openDatePickerPopover()` (Escape, clic fuera, reposicionamiento en `resize`, solo un popover abierto a la vez).

### 15.2 Dependencias nuevas de `CalendarDatePickerOptions`

A diferencia de las vistas de calendario (que extienden `CalendarView` y ya exponen `getWeekStartDay()`/`getLocalizedDayNames()`/`getTasksForDate()`), `TaskModal` no tiene hoy acceso a esos datos. Se resuelven igual que ya hace `CalendarView` (mismos settings del plugin vía `TaskManager`, ya inyectado en el modal) y se pasan como funciones a `CalendarDatePickerOptions.hasTasks`/`getWeekStartDay`/`getLocalizedDayNames`.

### 15.3 Alcance

Solo los 3 campos de fecha simple (due/start/scheduled). Los modales de hora (`TaskTimePickerModal`) y duración no cambian. La dependencia de `flatpickr` se mantiene instalada porque la sigue usando la inserción de campos desde el editor (§6).

### 15.4 Archivos afectados

| Área | Archivos |
|---|---|
| Modal | `src/modals/task-modal.ts` (`setupSimpleDatePicker` reemplazado por un popover de `CalendarDatePicker`) |
| Componente reutilizado | `src/core/calendar-date-picker.ts` (sin cambios de API, ya genérico) |
| Estilos | reutiliza `src/styles/components/_calendar-date-picker.scss` (sin cambios) |

### 15.5 Fuera de alcance

Quitar `flatpickr` como dependencia del proyecto (todavía se usa en §6); eso solo sería viable si esa superficie también migra a un componente propio, lo cual no está planeado en esta fase.

## 16. Recurrencia: nueva ocurrencia al completar (v1.1.10, implementado)

Comportamiento de usuario y decisiones: [[Modelo de datos]] §11.

### 16.1 Enfoque

Se engancha en el mismo punto de escritura que ADR-S3 (`upsertTaskStatus()` cambiando a `Done`): si `task.flow.repeat` no está vacío, además de reescribir la línea original con `✅`, se calcula y escribe una segunda línea con la siguiente ocurrencia.

### 16.2 Cálculo de la siguiente fecha

Nueva función `getNextOccurrenceDate(recurrenceText, referenceDate)` en `src/core/task-line-fields.ts` (o un nuevo módulo `src/core/task-recurrence.ts`):
1. Detecta y separa el sufijo `when done` del resto del texto de recurrencia.
2. Convierte el resto a RRULE con `convertToRRuleFormat()` (ya existe en `task-section.ts`, se expone/reutiliza).
3. `rrulestr(rrule).after(referenceDate)` (la librería `rrule` ya es dependencia) calcula la siguiente fecha válida, delegando los casos límite de fin de mes/año.
4. `referenceDate` es la fecha de la tarea con mayor prioridad según ADR-T4 (`scheduled > due > start`) salvo que el texto tenga `when done`, en cuyo caso es la fecha de hoy (ADR-R3).

### 16.3 Escritura de la nueva línea

Nueva función `buildNextOccurrenceLine(originalLine, nextDate, dateOffsets)` que:
- Copia la línea original.
- Reescribe cada fecha presente (`due`/`scheduled`/`start`) con el mismo desplazamiento relativo que tenían respecto a la fecha de referencia (ADR-R2, segundo punto).
- Elimina `🆔`/`⛔` (ADR-R4).
- Quita cualquier `✅` previo (no debería tener, pero por seguridad).

`TaskWriter` gana un nuevo método para insertar una línea completa en una posición específica (una línea arriba de la original), reutilizando el prerequisito de edición en el lugar ya construido en v1.1.4 (§8).

### 16.4 Integración con el manejo de estatus (v1.1.10)

Se ejecuta automáticamente como parte de cambiar el estado a `Done` (menú contextual del calendario o Task Modal, §14/§7.5) — no es una acción separada que el usuario deba invocar.

### 16.5 Archivos afectados

| Área | Archivos |
|---|---|
| Cálculo | `src/core/task-line-fields.ts` o nuevo `src/core/task-recurrence.ts` (`getNextOccurrenceDate`, `buildNextOccurrenceLine`) |
| Escritura | `src/core/task-writer.ts` (insertar línea nueva en una posición) |
| Integración | el mismo punto de `upsertTaskStatus()` usado por el manejo de estatus (§14) |
| Parser | `src/entities/task-section.ts` (`convertToRRuleFormat`, reconocer `when done`) |

### 16.6 Fuera de alcance
Ver [[Modelo de datos]] §11, Fuera de alcance.

## 17. Vista de lista dentro del calendario (v1.1.10, implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §4.10.

### 17.1 Datos

Nuevo `generateViewData()` análogo al de Semana pero sin alinear a `weekStartDay`: genera `daysToShow` `WeekDayData` (mismo shape ya usado por Semana/Semana laboral) a partir de la fecha de referencia hasta referencia + (`daysToShow` - 1) días, donde `daysToShow = plugin.settings.calendarListDaysToShow` (7–14, por defecto 14 — nuevo setting en Settings ▸ Calendario). Reutiliza `CalendarView.getTasksForDate()` tal cual.

### 17.2 Plantilla

Nueva `calendar-list-view.hbs`: una fila (`.oa-calendar-list-row`) por día, con cabecera (fecha + nombre del día, mismo formato que la cabecera de columna de Semana) y un contenedor de ancho completo que reutiliza el mismo bloque `{{#each tasksForDay}}` + clases `.oa-calendar-task` ya usado en Mes/Semana — sin plantilla ni CSS nuevos para las píldoras en sí, y sin mecanismo de "N more" (confirmado: mismo comportamiento que una celda de Mes/Semana, que hoy muestra todas las tareas del día).

### 17.3 Registro como vista

Nuevo `CalendarListView extends CalendarView` + `CALENDAR_LIST_VIEW_TYPE`, registrado en `ViewManager` igual que las otras 5. Un 7º botón en `.oa-calendar-view-segmented`, presente en las 6 plantillas de calendario.

### 17.4 Navegación

`navigateToPrevious()`/`navigateToNext()` mueven la ventana completa (`daysToShow` días, no día a día, a diferencia de Día).

### 17.5 Archivos afectados

| Área | Archivos |
|---|---|
| Vista | `src/views/calendar-list-view.ts` (nuevo) |
| Plantilla | `src/views/templates/calendar-list-view.hbs` (nuevo) |
| Estilos | `src/styles/views/_calendar-list.scss` (nuevo) |
| Setting | `src/settings/settings.ts` (`calendarListDaysToShow`, 7–14, por defecto 14), `src/settings/setting-tab.ts` (slider en ambas rutas, declarativa y `display()` legado) |
| Registro | `src/core/view-manager.ts`, `src/views/index.ts` |
| Selector segmentado | las 6 plantillas de calendario (7º botón) |

### 17.6 Ajustes posteriores

- Ícono del botón: `list-todo` en `CALENDAR_VIEW_BUTTON_ICONS` (`src/views/calendar-view.ts`); orden final del selector: Año/Mes/Semana/Semana laboral/Lista/Día (Lista antes que Día, no al final).
- Botón `.oa-calendar-date-picker-trigger` (popover de fecha) agregado también a `calendar-list-view.hbs` y `calendar-day-view.hbs` — ambos reutilizan el wiring genérico ya existente en `CalendarView.setupViewSpecificEventListeners()`, sin código nuevo.
- `CalendarListView` mantiene un `windowStart` propio, separado de `currentDate` (fecha seleccionada/resaltada): `generateViewData()` solo recentra la ventana si `currentDate` cae fuera de ella; un clic en una fila (que solo cambia `currentDate`) resalta el día sin mover la ventana, igual que Mes/Semana. `navigateToPrevious()/navigateToNext()` mueven `windowStart` explícitamente.

## 18. Modal de duración con dial circular (v1.1.10, implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §7.7.

### 18.1 Extracción del dial compartido

`HabitEditorModal.attachTimeDial()` (hoy privado e inline, `TIME_DIAL_MAX_MINUTES = 120` fijo) se extrae a `src/core/time-dial.ts`, parametrizado por `maxMinutes` y `stepMinutes` (nuevo), siguiendo el mismo patrón de extracción ya usado para `CalendarDatePicker` (clase con `mount(root)`, callback `onChange`). El Habit Editor pasa `{ maxMinutes: 120, stepMinutes: 1 }` (sin cambios de comportamiento); `TaskDurationModal` pasa `{ maxMinutes: 420, stepMinutes: 5 }` (7 horas).

### 18.2 Snap a pasos de 5 minutos

`applyValue()` redondea al múltiplo de `stepMinutes` más cercano en vez de al entero más cercano; lo mismo aplica al manejo de teclado (flechas) y rueda del mouse.

### 18.3 Archivos afectados

| Área | Archivos |
|---|---|
| Componente | `src/core/time-dial.ts` (nuevo, extraído de `habit-editor.ts`) |
| Habit Editor | `src/habits/habit-editor.ts` (usa el componente en vez del código inline) |
| Modal de duración | `src/modals/task-duration-modal.ts` (usa el componente con `maxMinutes:420, stepMinutes:5`) |
| Estilos | el SCSS del dial (hoy embebido en los estilos de hábitos) se mueve a un archivo compartido |

## 19. Modal de novedades al actualizar ("What's New") (v1.1.13, diseño — no implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §10. Investigado y diseñado a partir del mecanismo equivalente del plugin [QuickAdd](https://github.com/chhoumann/quickadd) (`src/main.ts` → `announceUpdate()` + `src/gui/UpdateModal/UpdateModal.ts`), adaptado a las diferencias de este proyecto (ver §19.4).

### 19.1 Disparador y versión vista

Nuevo campo persistido `lastSeenVersion` en `AgendaPluginSettings`/`DEFAULT_SETTINGS` (reutiliza el merge genérico ya existente en `main.ts` → `loadSettings()` — ver nota de memoria del repo sobre el bug de whitelist por campo; **no reintroducirlo**, un campo nuevo solo necesita sumarse a la interfaz + `DEFAULT_SETTINGS`). En `onload()`, después de cargar settings:

- Comparar `this.manifest.version` contra `settings.lastSeenVersion`.
- Si son iguales, no hacer nada (ya se vio esta versión).
- Si son distintas: actualizar `settings.lastSeenVersion = manifest.version` y guardar **de inmediato**, antes de decidir si se muestra el modal — igual que QuickAdd: así nunca se repite, aunque el usuario cierre el modal sin leerlo o aunque el ajuste esté desactivado.
- Si el ajuste **"Mostrar novedades al actualizar"** (`showWhatsNewOnUpdate`, nuevo, default `true`) está desactivado, no se abre el modal — pero el paso anterior ya corrió, así que no se acumula para una futura reactivación del ajuste.

### 19.2 Selección de contenido a mostrar

A diferencia de QuickAdd (que pagina hasta 100 releases desde la API de GitHub y filtra por semver en tiempo de ejecución), este plugin ya mantiene a mano un bloque "News" por versión en `README.md`. Se decide mostrar las entradas de **todas las versiones posteriores a `lastSeenVersion`**, concatenadas de la más reciente a la más antigua — mismo criterio acumulativo que QuickAdd (útil para quien se saltó varias versiones), pero sin ningún fetch de red.

### 19.3 Origen del texto — decisión: embebido y localizado, no fetch a GitHub

QuickAdd trae el texto en vivo desde la API pública de GitHub (`requestUrl` a `/repos/.../releases`, body en inglés, Markdown libre). Se decide **no** replicar ese enfoque aquí, por tres motivos:

1. El plugin ya tiene un sistema real de i18n (6 idiomas) — el *body* de un release de GitHub está siempre en inglés; traerlo en vivo no permite mostrarlo en el idioma de la UI de Obsidian del usuario sin trabajo adicional de traducción en tiempo real.
2. Evita una dependencia de red en cada arranque (límites de tasa de la API, timeouts, comportamiento con el vault en modo avión/offline).
3. El changelog por versión ya se redacta a mano en cada release (sección "News" de `README.md`); alcanza con espejar esas mismas entradas (resumidas) en `src/locales/*.json`, una clave por versión, igual que el resto de la UI del plugin.

Implica mantener, por cada versión publicada, una entrada corta equivalente en los 6 locales. Se evalúa en la fase de implementación si esto se automatiza (por ejemplo, un chequeo que valide que toda versión taggeada tiene su clave de "novedades" en los 6 idiomas) o se mantiene manual, igual que el resto del Changelog.

### 19.4 Diferencias deliberadas respecto a QuickAdd

| Aspecto | QuickAdd | Agenda Tasks (decidido) |
|---|---|---|
| Origen del texto | Fetch en vivo a GitHub Releases | Texto embebido en `src/locales/*.json`, localizado |
| Idioma | Solo inglés (el body del release) | Sigue el idioma de la UI de Obsidian (6 idiomas) |
| Preferencia de usuario | Dropdown de 3 valores (`none`/`major`/todas) | Un toggle simple `showWhatsNewOnUpdate` (se puede refinar después si hace falta) |
| Render | Markdown completo vía `MarkdownRenderer` (imágenes, video, código) | Texto/lista simple en la plantilla del modal — el contenido se autoría directamente, no se parsea como Markdown libre |
| Estado de carga | Placeholder "Fetching..." + guard contra cierre anticipado mientras carga | No aplica — sin red, el contenido está disponible de inmediato |
| Botón de cierre propio | Sí, crítico en iOS (el × del sistema puede caer en zona intocable del notch) | Se adopta igual, por consistencia y accesibilidad, independientemente de la plataforma |

### 19.5 Archivos afectados (estimado, sujeto a ajustes en la fase de implementación)

| Área | Archivos |
|---|---|
| Settings | `src/settings/settings.ts` (`lastSeenVersion`, `showWhatsNewOnUpdate`), `src/settings/setting-tab.ts` (toggle en Configuración general) |
| Modal | nuevo `src/modals/whats-new-modal.ts`, extiende `Modal` de Obsidian |
| Plantilla | nueva `src/modals/templates/whats-new-modal.hbs` |
| i18n | nuevas claves de "novedades" por versión en `src/locales/*.json` |
| Integración | `src/main.ts` → `onload()`, nueva llamada justo después de `loadSettings()` |

### 19.6 Fuera de alcance (v1.1.12)

Fetch en vivo desde GitHub Releases; renderizado de Markdown libre/imágenes/video embebidos; preferencia granular "solo versiones con funcionalidad nueva" (mayor/menor) vs. todas; cualquier mecanismo de feedback tipo formulario (QuickAdd lo incluye, no aplica a este proyecto).

## 20. Kanban View (v1.1.13, con las piezas compartidas en v1.1.12; diseño — no implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §11.

### 20.1 Registro como vista

Nuevo `KanbanView extends BaseView` + `KANBAN_VIEW_TYPE`, registrado en `ViewManager` y en `BaseView.TEMPLATE_LOADERS` (plantilla propia `kanban-view.hbs`), igual que las demás vistas de nivel superior. Nuevo ajuste `showKanbanTab` (default `true`) junto a `showListTab`/`showTableTab`, en ambas rutas de `setting-tab.ts` (declarativa y `display()` legado).

### 20.2 Motor de agrupado compartido

> Implementado (v1.1.12) en `src/core/task-grouping.ts`: `groupTasksByField(tasks, field, translate?)` devuelve `TaskGroup[]` (`key`, `label`, `tasks` y, solo con `path`, `children`), y `TaskSorter.groupTasksByField()` delega en él. `status`: los 6 estados en orden de flujo de trabajo, siempre; `priority`: de mayor a menor, solo los presentes, «sin prioridad» al final; `dueDate`: por día, «sin fecha» al final; `tags`: por la primera etiqueta; `path`: árbol de carpetas. `area` y `subArea` llegan con la fase AR2.

El tipo `GroupField = 'status' | 'priority' | 'dueDate' | 'path' | 'tags'` ya existe en `interfaces.ts` (campo `groupBy?` de la interfaz de filtros), pero no hay una implementación genérica: `ListView` solo agrupa por carpeta, de forma fija (`groupTasksByFolder()`). Se agrega a `TaskSorter` una función `groupTasksByField(tasks, field)` que devuelve grupos ordenados con su clave y etiqueta localizada; el agrupado por área y sub-área (§22.4) se deriva de la ruta del archivo. Kanban la usa para sus columnas; Lista y Tabla pueden adoptarla para ofrecer agrupado real más allá de carpeta. Orden dentro del grupo: `sortTasksByMultipleFields()` ya soporta ascendente/descendente.

Para `status`, las columnas siguen el orden fijo de `CoreTaskStatus` (no el alfabético), e incluyen siempre las 6, aunque estén vacías, para que sean destinos de arrastre válidos. Agrupar por fecha no se ofrece (una columna por fecha distinta dispersa el tablero).

### 20.3 Barra de filtros compartida

> Implementada (v1.1.12): `TaskFilterBar` en `src/core/task-filter-bar.ts` (`mount(root)`, `onChange`, `getState()`, `setSort()`), con el estado en `src/core/task-view-state.ts` y las opciones de estado en `src/core/task-status-options.ts`. Filtra con `filterTasksByViewState()`: prioridad, estado, área y vencimiento pasan por `TaskFilter`; la búsqueda y «con/sin fecha» son propias. «Esta semana» son los próximos 7 días y «futuras» las posteriores. La Tabla ya la usa; Lista, Kanban y Gantt, no.

La Tabla tiene hoy sus propios controles (`#oa-table-search-input`, `#oa-table-priority-filter`, `#oa-table-status-filter`, `#oa-table-folder-filter`, `#oa-table-due-filter`), con las 6 opciones de estado escritas a mano en `table-view.hbs` y su estado persistido en `localStorage` (`TABLE_VIEW_STATE_KEY`). Se generaliza a una barra reutilizable en `src/core/` (misma idea que `TimeDial`/`CalendarDatePicker`: clase con `mount(root)` y callback `onChange`) que recibe qué controles mostrar y una clave de persistencia propia por vista, y genera las opciones de estado desde `CoreTaskStatus` + i18n. La consumen Lista, Tabla, Kanban y Gantt; un cambio en las opciones se hace en un solo lugar.

### 20.3.1 Helper de gestos de tarea compartido

> Implementado (v1.1.12): `attachTaskGestures(el, opciones)` en `src/core/task-gestures.ts`, usado por calendario, Lista y Tabla. Recibe el plugin, `i18n`, el `TaskWriter`, `getTask`, `onChanged`, `openFile` e `ignoreSelector`; exporta `TASK_CLICK_DELAY_MS` y `TASK_GESTURE_IGNORE_SELECTOR`. El cambio de estado avisa con `task_line_changed` si la nota cambió. Overview, Kanban y Gantt aún no lo usan.

Hoy el clic (con retardo de 250 ms para distinguirlo del doble clic), el doble clic (abre la nota) y `openEditTaskModal()` están copiados en `calendar-view.ts`, `list-view.ts` y `table-view.ts`, cada uno con su propia constante `TASK_CLICK_DELAY_MS`. Overview solo tiene doble clic (en `BaseView`) y el menú de estado con clic derecho solo existe en el calendario.

Se extrae a `src/core/task-gestures.ts`: `attachTaskGestures(el, { getTask, onChanged, ignoreSelector })`, que cablea clic → modal de edición, doble clic → abrir la nota y clic derecho → menú de estado (con `STATUS_MENU_OPTIONS`, `upsertTaskStatus()` y la ocurrencia recurrente, hoy dentro de `calendar-view.ts`). `onChanged` es el refresco propio de cada vista (`refreshView()` en el calendario, `onOpen()` en Lista y Tabla) y `ignoreSelector` conserva la guarda de Lista y Tabla (`button, a, input, select`). El arrastre queda en cada vista.

Se migra primero el calendario, con la misma lógica de temporizador, y después Lista, Tabla, Kanban y Gantt. Lista y Tabla ganan el clic derecho sin escribir nada más.

### 20.3.2 Identidad de la tarea y escritura segura (v1.1.12, con la Fase A; implementado)

> Implementado: la ubicación de la línea es `locateTaskLine()` (`src/core/task-line-locator.ts`); `updateTaskLine()` devuelve el número y texto escritos para encadenar `insertLineAbove()`; en el calendario, `CalendarView.writeTaskLine()` toma el texto esperado de la tarea dibujada y avisa con `task_line_changed`. De paso se corrigió la numeración de líneas del extractor de respaldo. El texto de abajo describe el estado previo y el diseño.

**Estado actual.** `Task.id` se arma en `TaskExtractor.createTaskFromLine()` como el `🆔` de la línea si lo tiene y, si no, `ruta-línea`; no se guarda y se recalcula cada vez que se vuelve a extraer el archivo (al modificarse, crearse, borrarse o renombrarse, o con el botón de recarga, que llama a `forceRefreshTasks()` y relee todo el vault; el TTL de 5 minutos solo reconstruye la lista global con las tareas ya extraídas). En la práctica las vistas y los escritores localizan una tarea por `file.path` más `line.number`; `Task.id` solo lo usan el modal (`isAutoId`) y un atributo de la Tabla. Además, `TASKS_UPDATED` se emite al invalidar la caché pero ninguna vista se suscribe, así que una vista abierta conserva los números de línea anteriores a un cambio hasta que se refresca.

**Problemas.** El mismo campo cambia de significado (añadir un `🆔` cambia la identidad de la tarea), dos tareas con el mismo `🆔` (por ejemplo al copiar una línea) comparten id, el separador `-` es ambiguo en rutas como `mi-nota.md-12`, y `updateTaskLine()` e `insertLineAbove()` solo comprueban que la línea indicada sea una tarea, no que sea la misma: si el archivo cambió entre el render y el arrastre, se edita otra tarea.

**Cambios.**
- **Separar los ids**: `ITask.id` pasa a ser siempre la posición, `ruta#línea` (`#` no se permite en nombres de archivo de Obsidian), y el `🆔` va en `ITaskFlow.id`, como `dependsOn`. El modal lee `flow.id` en lugar de comparar contra `ruta-línea`. No cambia nada visible. `Task.id` no debe guardarse para nada persistente: para eso sirve el `🆔`, o una clave derivada de ruta y hash del texto.
- **Escritura segura**: `updateTaskLine()` e `insertLineAbove()` reciben el texto esperado de la línea (`task.line.text`, comparado sin espacios en los extremos). Si no coincide, buscan esa misma línea en el archivo: con una sola coincidencia la usan; si hay cero o varias, cancelan con un aviso («la nota cambió, actualiza la vista») y piden refrescar. Afecta a unos 10 sitios que escriben: arrastrar y soltar en Mes, Semana, Semana laboral y Día, redimensionar, el menú de estado y el modal.

Queda fuera, como mejora opcional: que las vistas se refresquen solas al cambiar un archivo (con retardo para no redibujar a cada tecla ni durante un arrastre), que encaja con «Refresco automático de la Rutina» del backlog.

### 20.4 Arrastrar y reordenar

- **Entre columnas (estado)**: reutiliza `upsertTaskStatus()` + `TaskWriter.updateTaskLine()` (v1.1.10, §14) y, al completar, `buildRecurrenceOccurrence()` + `insertLineAbove()` (§16), exactamente como el menú contextual del calendario. El payload de `dragstart` sigue el patrón de `TaskDragPayload` (`filePath`, `lineNumber`); `dragover` solo resalta la columna y llama a `preventDefault()` sin leer el payload (limitación de `dataTransfer.getData()` ya documentada para el calendario), y se valida en `drop`.
- **Entre columnas (prioridad/etiqueta/carpeta)**: usa `upsertPriority()` para prioridad. Etiqueta y carpeta no tienen todavía una operación de escritura equivalente; mover a otra carpeta implicaría mover la tarea de archivo, algo que el plugin no hace hoy (el campo de archivo es solo lectura al editar). **Decisión pendiente**: restringir el arrastre entre columnas a estado y prioridad, y dejar etiqueta/carpeta como agrupado de solo lectura.
- **Reordenar dentro de una columna**: requiere un orden manual persistido. La línea de la tarea no tiene un campo de orden y la posición en el archivo no sirve (cada tarea vive en su propia nota). **Decisión pendiente**: persistir el orden en `data.json` del plugin, por clave `ruta:línea` o por `🆔` cuando exista; el riesgo es que la clave `ruta:línea` queda obsoleta si se editan las notas. Se resuelve en la Fase C del plan.

### 20.5 Archivos afectados (estimado)

| Área | Archivos |
|---|---|
| Vista | nuevo `src/views/kanban-view.ts` |
| Plantilla | nuevo `src/views/templates/kanban-view.hbs` |
| Estilos | nuevo `src/styles/views/_kanban.scss` + `@use` en `styles.scss` |
| Agrupado | `src/core/task-sorter.ts` (`groupTasksByField()`) |
| Filtros | nueva barra de filtros en `src/core/` (extraída de `table-view.hbs`), consumida por Lista, Tabla, Kanban y Gantt |
| Gestos | nuevo `src/core/task-gestures.ts` (§20.3.1), consumido por calendario, Lista, Tabla, Kanban y Gantt |
| Registro | `src/core/view-manager.ts`, `src/views/index.ts`, `src/views/base-view.ts` (`TEMPLATE_LOADERS`) |
| Settings | `src/settings/settings.ts` (`showKanbanTab`), `src/settings/setting-tab.ts` |
| i18n | claves nuevas en los 6 locales (nombre de la vista, selector de agrupado, etiquetas de columna) |

### 20.6 Comparación con Tasks Kanban

| Aspecto | Tasks Kanban | Agenda Tasks (decidido) |
|---|---|---|
| Origen de las tarjetas | Tareas reales, vía el plugin Tasks | Tareas reales, vía `TaskExtractor` propio |
| Columnas | Por estado, o columnas personalizadas que mapean símbolos de estado | Por los 6 estados fijos; personalizables diferido (§11.1) |
| Agrupado (swimlanes) | Carriles plegables por estado/prioridad/etiqueta/ruta/carpeta/archivo | Selector de agrupado de las columnas por estado/prioridad/etiqueta/carpeta; sin carriles |
| Filtros | Subconjunto del lenguaje de query de Tasks (texto libre) | `TaskFilter` existente, misma UI que Lista/Tabla |
| Tableros guardados | Varios, cada uno en su pestaña | Uno solo por ahora |
| Arrastre | Entre columnas cambia el estado | Entre columnas cambia el estado/prioridad; además reordena dentro de la columna |

### 20.7 Fuera de alcance (v1.1.13)

Tableros múltiples guardados; mini-lenguaje de query propio; carriles (swimlanes) plegables; estados personalizables; unificar las pestañas Lista y Tabla.

## 21. Gantt View (v1.1.13, diseño — no implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §12. Comparte con Kanban el motor de agrupado (§20.2), la barra de filtros (§20.3) y el helper de gestos (§20.3.1).

### 21.1 Punto de partida y registro

`GanttView` existe pero está desconectada: el `registerView` en `view-manager.ts` y el botón de `header.hbs` están comentados, `gantt-view.hbs` está vacía, `onOpen()` no guarda el resultado de `getAllTasks()` y el constructor crea su propio `TaskManager` en vez de recibir el compartido. `TEMPLATE_LOADERS` y las claves i18n `gantt_view_tab`/`gantt_view_title` ya existen. Se reescribe siguiendo el patrón de `KanbanView`/`CalendarListView`: recibe el `taskManager` inyectado, se registra, se descomenta el botón y se agrega `showGanttTab` (default `true`) en ambas rutas de `setting-tab.ts`.

### 21.2 Cálculo de la barra

Función pura `resolveGanttSpan(task)` en `src/core/task-gantt.ts`, sin dependencias de Obsidian (se puede probar con un script de Node, como `task-recurrence.ts`). Devuelve `{ kind: 'bar' | 'milestone' | 'none', start, end, startField, endField, scheduledMark }`. Inicio = `start` y, si falta, `scheduled`; fin = `due` y, si falta, `scheduled`. `startField` y `endField` indican qué campo escribe cada borde al arrastrarlo.

### 21.3 Ventana y escala

`GanttZoom = 7 | 14 | 21 | 'month'`. Para `'month'` la ventana es `startOf('month')` con `daysInMonth` de Luxon (28 a 31); para los demás, N días desde la fecha de referencia (ver decisión abierta 1 en la Especificación). La posición de cada barra se precalcula en TypeScript como porcentaje de la ventana (`left = desfase / N`, `width = días / N`), de modo que el largo del mes no importa y se evita `calc()` con variables anidadas en el SCSS, que el minificador rompe. Navegación: ◀▶ mueven N días, o un mes en modo `'month'`. Usa `getReferenceDate()`/`setReferenceDate()` de `calendar-reference-date.ts`; el zoom se guarda en `localStorage` (`oa_gantt_zoom`).

### 21.4 Agrupado por área y sub-área

`groupTasksByField(tasks, 'area')` (§22.4) devuelve un árbol área → sub-área (anidado por carpeta, sin tope de niveles). La barra resumen de cada grupo es el mínimo de inicios y el máximo de fines de sus tareas con barra. El estado plegado se guarda por grupo en `localStorage` (`oa_gantt_collapsed:<ruta>`), como los grupos de Rutina.

### 21.5 Edición de fechas

Eventos de puntero (no arrastre HTML5), para redimensionar con precisión de un día; mismo enfoque que la manija de redimensionar de la vista Día. Escritura con `TaskWriter.updateTaskLine()`:

- **Redimensionar**: `upsertSimpleDate()` para 🛫/📅 y `upsertScheduledDate()` para ⏳, según `startField`/`endField`.
- **Mover**: desplaza 🛫, ⏳ y 📅 el mismo número de días. `buildNextOccurrenceLine()` ya desplaza fechas pero también elimina `🆔`/`⛔`, así que se extrae su parte de desplazamiento a `shiftTaskDates(line, deltaDays)`, que no toca ➕ ni ✅.
- Se bloquea el arrastre que deje el fin antes del inicio. Las manijas llaman a `stopPropagation()` en el clic, como la manija de la vista Día.

### 21.6 Dependencias

`id` y `dependsOn` ya se parsean. En esta versión solo se agrega la insignia 🔗 con la tooltip «depende de». Las flechas requieren una capa SVG recalculada al hacer scroll, cambiar el zoom o plegar grupos, y quedan para una versión posterior.

### 21.7 Archivos afectados (estimado)

| Área | Archivos |
|---|---|
| Vista | `src/views/gantt-view.ts` (reescrita) |
| Plantilla | `src/views/templates/gantt-view.hbs` (hoy vacía) |
| Estilos | nuevo `src/styles/views/_gantt.scss` + `@use` en `styles.scss` |
| Lógica | nuevo `src/core/task-gantt.ts`; `shiftTaskDates()` extraída de `src/core/task-recurrence.ts` |
| Agrupado | `src/core/task-sorter.ts` (árbol para `path`) |
| Registro | `src/core/view-manager.ts`, `src/views/templates/header.hbs` |
| Settings | `src/settings/settings.ts` (`showGanttTab`), `src/settings/setting-tab.ts` |
| i18n | claves nuevas en los 6 locales (zoom, «sin fecha», tooltips de borde) |

### 21.8 Fuera de alcance (v1.1.13)

Flechas de dependencia y aviso de rotura; desplazamiento en cascada de dependientes; zoom por día; Timeline view.

## 22. Áreas y sub-áreas de tareas (v1.1.12, diseño — núcleo implementado)

> Implementado el núcleo (fase AR1): `src/core/area.ts` con `normalizeAreaName()`, `resolveTaskArea()`, `matchesTaskArea()` y la paleta y colores movidos desde `habit.ts`, y los criterios `location.area`/`location.subArea` de `TaskFilter`. Pendiente la fase AR2 (barra, agrupado y vistas). Para la raíz del vault `resolveTaskArea()` devuelve cadenas vacías; la etiqueta «Sin área» la pone la interfaz.

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §13. Lo consumen la barra de filtros (§20.3), Lista, Kanban (§20) y Gantt (§21).

### 22.1 Módulo compartido

La lógica de áreas vive hoy en `src/habits/habit.ts`: `getAreaColor`, `getAreaTextColor`, `getAreaLabel` y `getContrastTextColor`, además de dos normalizaciones casi iguales del nombre (guiones para el color, guión bajo para la clave i18n `habit_area_*`). Se mueve a un módulo neutro `src/core/area.ts`, con una única función de normalización; `habit.ts` la re-exporta para no romper los imports de `src/habits/index.ts`. Las claves i18n `habit_area_*` no se renombran, para no tocar los 6 locales.

Se agrega `resolveTaskArea(filePath)`, pura y sin dependencias de Obsidian: normaliza las barras, parte la ruta y devuelve `{ area, subArea }` según la tabla de [[Especificación de vistas]] §13.1: `area` es el nombre de la primera carpeta y `subArea` la ruta restante completa, sin tope de niveles. No reutiliza `file.root`, que conserva la barra final y devuelve `/` para la raíz.

### 22.2 Criterios en `TaskFilter`

Criterios nuevos `location.area` y `location.subArea`, comparados por nombre normalizado. La sub-área coincide por prefijo: `subArea === sel || subArea.startsWith(sel + '/')`. El criterio `location.folder` (prefijo de ruta) se mantiene.

### 22.3 Barra de filtros

Los combobox de Área y Sub-área forman parte de la barra compartida (§20.3). Las opciones de Área son los nombres de primera carpeta presentes en las tareas cargadas; las de Sub-área, las rutas presentes bajo el área elegida más cada una de sus carpetas contenedoras, ya que la coincidencia es por prefijo. No salen de las carpetas del vault: a diferencia del Habit Editor, que usa `getVaultRootFolders()`/`getSubAreaOptions()` porque ahí se elige un valor, aquí se filtra y una opción sin tareas solo estorba.

La barra filtra sobre los datos con `TaskFilter`. La Tabla hoy filtra ocultando filas del DOM (`filterTasks()` lee `#oa-table-folder-filter` y el texto de `.oa-folder-name`), y ese enfoque no sirve para Kanban ni Gantt. La migración incluye convertir el valor `folder` que la Tabla guarda en `localStorage` (`TABLE_VIEW_STATE_KEY`).

### 22.4 Agrupado

> Implementado en la Lista (v1.1.12): `groupTasksByField(tasks, 'area')` reutiliza el árbol de carpetas, pone el color del área en cada grupo y deja «Sin área» al final. `'subArea'` queda para Kanban y Gantt.

`GroupField` (hoy `'status' | 'priority' | 'dueDate' | 'path' | 'tags'`) gana `'area'` y `'subArea'`, los mismos valores de los combos. `groupTasksByField(tasks, 'area')` devuelve un árbol área → sub-área, ordenado, con el nombre y el color de cada grupo; el árbol anida la sub-área por carpeta, partiendo la ruta por `/`. Con `'subArea'` y sin un área elegida, la clave de grupo incluye el área para no mezclar carpetas homónimas de áreas distintas. Lista deja de usar `groupTasksByFolder()` y consume este árbol, conservando su modo plano. Kanban lo usa para sus columnas y Gantt para sus filas.

### 22.5 Archivos afectados (estimado)

| Área | Archivos |
|---|---|
| Módulo | nuevo `src/core/area.ts` (movido desde `src/habits/habit.ts`, más `resolveTaskArea()`) |
| Hábitos | `src/habits/habit.ts` (re-exporta), `src/habits/index.ts` |
| Filtro | `src/core/task-filter.ts` (`location.area`, `location.subArea`), tipos en `src/types/interfaces.ts` |
| Agrupado | `src/core/task-sorter.ts` (`'area'`), `src/types/interfaces.ts` (`GroupField`) |
| Vistas | `src/views/list-view.ts` (deja `groupTasksByFolder()`), `src/views/table-view.ts` y `table-view.hbs` (filtro de carpeta) |
| i18n | claves nuevas en los 6 locales (Área, Sub-área, «Sin área») |

### 22.6 Fuera de alcance (v1.1.12)

Área configurable por tarea o por nota; mover tareas entre áreas arrastrando; áreas sin carpeta.

## 23. Lista y Tabla en una sola pestaña (v1.1.12, diseño — no implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §14. Se apoya en la barra de filtros (§20.3), el helper de gestos (§20.3.1) y las áreas (§22).

### 23.1 Estado compartido

> Implementado en `src/core/task-view-state.ts` (búsqueda, prioridad, estado, área, sub-área, vencimiento, agrupado y orden; la clave es `obsidian-agenda-task-view-state`). El campo `mode` llega con el conmutador (U4).

Nuevo módulo `src/core/task-view-state.ts` con `TaskViewState`: búsqueda, filtros (prioridad, estado, área, sub-área, vencimiento), agrupado, orden (campo y dirección) y modo. Se persiste con `app.saveLocalStorage` bajo una única clave, en lugar de la clave propia de la Tabla (`obsidian-agenda-task-table-state`, hoy en `table-view.ts`). Ambos modos lo leen al abrir y lo escriben al cambiar. Migración: la clave antigua se lee una vez, se convierte (`folder` → `area`, §22.3) y se elimina.

### 23.2 Conmutador de modo

> Implementado (v1.1.12): `TaskModeSwitch` en la barra (`buildTaskModeSwitch()`), con `TaskViewState.mode` y `saveTaskViewMode()`; usa directamente las clases `.oa-calendar-view-segmented` y `.oa-calendar-view-btn` y cambia de vista con `viewManager.activateView()`.

Control segmentado dentro de la barra compartida, solo en Lista y Tabla. Reutiliza los estilos y las clases del selector del calendario (`.oa-calendar-view-segmented`, `.oa-calendar-view-btn`); renombrarlas a un nombre neutro es una limpieza opcional. Íconos `list-todo` y `table`, los mismos de las pestañas actuales, con tooltip. Al hacer clic llama a `leaf.setViewState()` con el otro tipo de vista, como `CalendarView.switchToViewType()`; ambas vistas leen `TaskViewState` al abrir.

### 23.3 Pestaña única

> Implementado (v1.1.12): ver `header.hbs` (`oa-tasks-view-tab`), `TASKS_VIEW_TYPES` y `getDefaultTasksView()` en `base-view.ts`.

En `header.hbs` los botones de Lista y Tabla se reemplazan por uno, `oa-tasks-view-tab`, que se muestra con `(or settings.showListTab settings.showTableTab)`. `attachEventTabs()` lo apunta al último modo usado (`TaskViewState.mode`), con el mismo patrón que `getDefaultHabitView()`. El resaltado de la pestaña activa necesita una excepción como la que ya existe para `calendar-*` y `habit-*` en `base-view.ts`, porque tanto `list-view` como `table-view` deben iluminar la pestaña «Tareas».

### 23.4 Agrupado y orden

> La Lista ya usa la barra con agrupado y orden (v1.1.12): el agrupado vacío en `TaskViewState` significa «el de cada vista» (Área en la Lista), `sortTasksByColumn()` (`src/core/task-column-sort.ts`) ordena sobre datos y, al cambiar un control, `ListView.refreshBody()` redibuja solo el cuerpo. La Tabla falta (U3).

La barra incorpora un combo de agrupado y un control de orden. El agrupado usa `groupTasksByField()` (§22.4); sus valores sustituyen el botón `.oa-view-toggle-button` de la Lista (`isHierarchicalView`). La Tabla recibe filas de cabecera de grupo plegables, con el estado plegado en `localStorage` (`oa_tasks_collapsed:<clave>`). Los encabezados `th.oa-sortable` de la Tabla actualizan el orden compartido en vez de uno propio (`currentSortColumn`/`currentSortDirection`). Los dos modos filtran sobre los datos con `TaskFilter`, no sobre filas del DOM.

### 23.5 Archivos afectados (estimado)

| Área | Archivos |
|---|---|
| Estado | nuevo `src/core/task-view-state.ts` |
| Vistas | `src/views/list-view.ts` y `list-view.hbs` (adopta la barra), `src/views/table-view.ts` y `table-view.hbs` (adopta la barra, agrupado, orden compartido) |
| Pestaña | `src/views/templates/header.hbs`, `src/views/base-view.ts` (`attachEventTabs()` y resaltado) |
| Estilos | `_list-view.scss`, `_table-view.scss` (cabeceras de grupo en la Tabla) |
| i18n | claves nuevas en los 6 locales (pestaña «Tareas», valores del agrupado, orden) |

### 23.6 Fuera de alcance (v1.1.12)

Una clase única `TasksView`; Kanban y Gantt como modos del conmutador; acciones masivas.

### 23.7 Barra de filtros con chips (v1.1.12, implementado y probado a mano)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §14.4. Es un cambio solo de la capa de interfaz de `TaskFilterBar`: `TaskViewState`, `filterTasksByViewState()` y las vistas no cambian.

**Módulo puro nuevo `src/core/task-filter-chips.ts`** (sin dependencias de Obsidian, para probarlo con scripts de Node):
- `FilterChipId = 'priority' | 'status' | 'area' | 'due'`.
- `getActiveFilterChips(state, translate)` devuelve los chips activos, en ese orden, con `id`, `typeLabel` y `valueLabel`; el de `area` junta Área y Sub-área («Área › Sub-área») y el valor «sin prioridad» usa `no_priority`. Un filtro está activo si su valor no es `'all'` (o `''` en área y sub-área).
- `clearFilterChip(state, id)` y `clearAllFilters(state)` devuelven el estado sin ese filtro (quitar `area` reinicia también `subArea`); no tocan la búsqueda, el agrupado ni el orden.
- `getFilterValueOptions(id, ...)` con los valores de cada tipo, sin la opción «Todos»: las constantes `PRIORITY_OPTIONS` y `DUE_OPTIONS` y la lista de estados salen hoy de `task-filter-bar.ts` y `STATUS_OPTIONS`, y se mueven aquí; las áreas y sub-áreas siguen saliendo de `listTaskAreas()` y `listTaskSubAreas()`.

**`TaskFilterBar`** (`src/core/task-filter-bar.ts`):
- `mount()` construye la fila principal (`.oa-filter-bar__main`: conmutador de modo, botón + Filtro, agrupado, orden y dirección, búsqueda con `margin-left: auto`) y la fila de chips (`.oa-filter-bar__chips`), que solo se muestra con chips activos. Los cinco `<select>` de filtro desaparecen; agrupado y orden conservan los suyos.
- Menús con `Menu` de Obsidian, colocados con `showAtPosition({ x, y })` bajo el botón o el chip pulsado (`getBoundingClientRect()`), con `setChecked()` en el valor actual. Se encadenan: el primer menú elige el tipo, el segundo el valor y, para Área con sub-áreas, un tercero la sub-área. No se usan submenús: los tipos de Obsidian 1.14.4 instalados no exponen `setSubmenu()`, y `minAppVersion` es 1.8.7.
- `renderChips()` se llama desde `update()`, que es el único punto por donde pasan los cambios; no hay estado propio de la barra aparte de `TaskViewState`. `reconcileArea()` sigue reajustando un área guardada que ya no tiene tareas, ahora antes de dibujar los chips.
- Cada chip es un `<button>` (`.oa-filter-chip`) con una × interna enfocable (`.oa-filter-chip__remove`) y `aria-label` con i18n; `Limpiar` es `.oa-filter-bar__clear`.

**Estilos** (`src/styles/components/_task-filter-bar.scss`):
- La barra pasa de rejilla de dos columnas a dos contenedores flex. La búsqueda se queda a la derecha de la fila 1 con ancho `clamp(180px, 25%, 300px)`; con `container-type: inline-size` en la barra y un `@container` bajo ~560 px, la búsqueda pasa a su propia línea a todo el ancho. Los contenedores se miden por el ancho de la hoja y no por el de la ventana, que en Obsidian cambia con los paneles laterales. Si el WebView no soportara `@container`, la barra sigue funcionando porque ya tiene `flex-wrap`.
- Chips y × llevan `padding: … !important`: en tableta, `.is-tablet button:not(.clickable-icon)` de Obsidian impone 20 px laterales y deformaba los botones pequeños (misma causa que los arreglos de la 1.1.11). Los chips usan un `max-width` con puntos suspensivos para que un área de nombre largo no ensanche la fila.
- Se eliminan las reglas de los selectores de filtro; `.oa-filter-bar__select` queda para agrupado y orden. El cambio de claves de estilo de la Tabla/Lista no hace falta: ambas ya usan `.oa-filter-bar`.

**i18n**: claves nuevas en los 6 idiomas: `filter_add` («+ Filtro»), `filter_clear` («Limpiar») y `filter_remove` (etiqueta accesible de la ×, con el nombre del filtro como parámetro). Los nombres de tipo reutilizan `task_priority`, `task_status`, `area` y `due_date`, y «Todas las sub-áreas» reutiliza `all_sub_areas`. Quedan sin uso y se eliminan `all_priorities`, `all_tasks`, `all_areas` y `all_dates` (comprobar con una búsqueda antes de borrar).

**Archivos afectados**

| Área | Archivos |
|---|---|
| Lógica pura | nuevo `src/core/task-filter-chips.ts` |
| Barra | `src/core/task-filter-bar.ts` (mount, menús, chips) |
| Estilos | `src/styles/components/_task-filter-bar.scss` |
| i18n | `src/locales/*.json` (3 claves nuevas, 4 eliminadas) |
| Vistas y estado | sin cambios |

**Riesgos**: la posición y el cierre de los menús en móvil (se resuelven con el `Menu` nativo, pero hay que probarlos en tableta y teléfono); el foco del teclado al volver de un menú (no se devuelve al botón o chip que lo abrió: al elegir un valor el chip se redibuja; si molesta, se mejora después); y que quien está acostumbrado a los combos no encuentre los filtros (el botón + Filtro lleva texto, no solo ícono).

### 23.8 Columnas de fechas y filtros por fecha (v1.1.12, implementado y probado a mano)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §14.5. Amplía §23.1 (estado), §23.7 (chips) y la plantilla de la Tabla.

**Estado y filtrado** (`src/core/task-view-state.ts`):
- `TaskViewState` gana `start` y `scheduled` (`'all'` por defecto), junto al `due` actual; `parseTaskViewState()` los valida con `DUE_FILTER_VALUES`, que se reutiliza para los tres. Los valores guardados de `due` siguen siendo válidos, así que no hay migración.
- Nueva función pura `matchesDateFilter(date, value, isOpen, today)` que decide un valor de filtro sobre una fecha (`DateTime | null`) comparando por día con `startOf('day')`: `hasdate`, `overdue` (anterior a hoy; para el vencimiento, además con tarea abierta), `today`, `thisweek` (de hoy a hoy + 7 días), `future` (más de 7 días) y `nodate`. `filterTasksByViewState()` la aplica a `due`, `start` y `scheduled`; deja de usar `dueDateRelative` y el apaño de `dueDate.exists` de §22.2. Una tarea está abierta si su estado no es Hecho, Cancelada ni No es tarea.
- `hasAnyDate()` desaparece: «Con fecha» y «Sin fecha» pasan a ser por tipo.

**Chips** (`src/core/task-filter-chips.ts`): `FilterChipId` pasa a `'priority' | 'status' | 'area' | 'start' | 'scheduled' | 'due'`, con `FILTER_CHIP_IDS` en ese orden y `FILTER_STATE_KEYS` con las dos claves nuevas. `getFilterValueOptions()` recibe el tipo y devuelve los textos de Vencimiento («Vencidas», «Vencen hoy», «Vencen en los próximos 7 días») o los de Inicio y Programada («Pasadas», «Hoy», «Próximos 7 días»); los nombres de tipo reutilizan `start_date`, `scheduled_date` y `due_date`. La barra no cambia: los menús y los chips se derivan de esa lista.

**Orden** (`src/core/task-column-sort.ts`): `TASK_SORT_COLUMNS` gana `start`, `scheduled` y `closed` (y `due` pasa a llamarse con la clave `due_date`); `sortTasksByColumn()` los trata como `due`: por fecha, sin fecha al final en las dos direcciones. La fecha de cierre es la de hecha o, si no, la de cancelada. Se elimina la clave de texto `dates`.

**Modelo de columnas** (nuevo `src/core/task-table-columns.ts`, puro): una lista ordenada con `id`, clave de texto, clave de orden, `{ min, max }` de ancho y, para las cuatro de fechas, una función `hasValue(task)` que dice si la tarea tiene algún valor que esa columna mostraría. `getColumnVisibility(tasks)` devuelve un mapa `id` → visible: las columnas fijas siempre y las de fechas solo si alguna tarea cargada (sin filtrar) cumple `hasValue`. Es la base de la fase U5: allí se le sumará la elección del usuario.

**La Tabla** (`src/views/table-view.ts`, `table-view.hbs`, `_table-view.scss`):
- `TableViewData` incluye `columns` (mapa de visibilidad por `id`) y `columnCount`; la plantilla pinta cada encabezado y cada celda solo si su columna es visible, con `data-column="<id>"`, y las cabeceras de grupo usan `colspan="{{columnCount}}"` en lugar de 7.
- Se elimina el número de fila (`.oa-row-number` y el campo `number` de `TableTaskRow`): la primera celda queda vacía y el encabezado conserva el total.
- Las celdas de fechas muestran el emoji y el valor, y debajo, en una segunda línea más pequeña, la fecha secundaria (creación en Inicio; hora y duración en Programada). El estado de vencida o de hoy se calcula en TypeScript, para tareas abiertas, y se pasa a la plantilla (hoy `isOverdue` y `isDueToday` no los pone nadie).
- `resizeColumns()` deja de usar el índice de la columna y busca el límite por `data-column` en el modelo; el reparto proporcional al ancho del contenedor no cambia.
- Los anchos del modelo son los de §14.5 («Tarea» 170–380, «Prioridad» y «Estado» 36–44, etc.).

**i18n**: claves nuevas en los 6 idiomas para los valores de Inicio y Programada (`date_past`, `date_today`, `date_this_week`, `date_future`), los nombres de las columnas (`column_start`, `column_scheduled`, `column_due`, `column_closed`) y los textos corregidos de Vencimiento (`due_today`, `due_this_week`) y de «Con fecha» (`has_any_date`). Se eliminan `dates` y `future_tasks`, sin otros usos.

**Archivos afectados**

| Área | Archivos |
|---|---|
| Estado y filtrado | `src/core/task-view-state.ts` |
| Chips | `src/core/task-filter-chips.ts` |
| Orden | `src/core/task-column-sort.ts` |
| Columnas | nuevo `src/core/task-table-columns.ts` |
| Tabla | `src/views/table-view.ts`, `src/views/templates/table-view.hbs`, `src/types/interfaces.ts` (`TableViewData`, `TableTaskRow`), `src/styles/views/_table-view.scss` |
| i18n | `src/locales/*.json` |

**Riesgos**: `table-layout: fixed` con columnas que aparecen y desaparecen (los anchos deben salir de las columnas visibles, no de las siete de antes); que la Lista comparta el combo de orden y muestre las columnas nuevas (Cerrada) aunque ella no las dibuja; y el cambio de significado de «Con fecha» y «Sin fecha» en estados ya guardados (el valor se conserva, pero ahora se aplica solo al vencimiento).

### 23.9 Refresco automático de las vistas (v1.1.12, implementado y probado a mano)

Comportamiento y decisiones: [[Especificación de vistas]] §14.6.

**Punto de partida.** `TaskManager` y `HabitManager` ya invalidan sus cachés con los eventos del vault, y `TaskCache` emite `TASKS_UPDATED` al invalidar, pero nadie lo escucha. Cuidado con un bucle: `refreshView()` fuerza la recarga (`forceRefreshTasks()` invalida y vuelve a emitir), así que reaccionar a cada invalidación redibujaría tras cada refresco manual.

**Piezas puras** (en `src/core/`, probables con un script de Node):
- `refresh-scheduler.ts`: `RefreshScheduler` con `request()`, `cancel()` y `dispose()`. Agrupa las peticiones con un retardo (0,4 s, reinicia con cada petición); al cumplirse, si `isBusy()` es verdadero reintenta cada 0,4 s, y si hay una ejecución en curso, repite una vez al terminar. Los temporizadores se inyectan para poder probarlo.
- `task-signature.ts`: `tasksSignature(tasks)` une `id` (ruta#línea) y el texto de la línea (`task.line.text`) de cada tarea; es lo que cambia si cambia algo visible de una tarea.
- `day-change.ts`: `msUntilNextMidnight(now)` (Luxon, correcto en cambios de horario) y `DayChangeWatcher`, un único temporizador que, a la medianoche local, emite `day:changed` y se reprograma; también compara el día en `visibilitychange` por si el equipo estuvo suspendido.
- `scroll-state.ts`: `captureScroll(root)` y `restoreScroll(root, snapshot)`; guardan el desplazamiento de la raíz y de cada elemento desplazado, identificado por su clase y su posición entre los de la misma clase.

**Eventos** (`EventBus`): se añaden `tasks:changed` (con `{ signature }`), `habits:updated` y `day:changed`, y `listenerCount(evento)`.

**Tareas** (`TaskManager`): escucha su propio `TASKS_UPDATED` (y `metadataCache.on('changed')`, que invalida el archivo cuando los metadatos ya están al día) y, tras 0,4 s, si hay alguien escuchando `tasks:changed`, pide `getAllTasks()`, calcula la firma y emite solo si difiere de la última notificada. Así una nota sin cambios en tareas no redibuja nada, y se calcula una vez, no por vista.

**Hábitos** (`HabitManager`): `refreshCache()` calcula una huella de las notas de la carpeta de hábitos (ruta y hash del contenido) y emite `habits:updated` solo si cambió.

**Medianoche** (`main.ts`): el complemento inicia `DayChangeWatcher` al cargar y lo detiene al descargar.

**Vistas** (`BaseView`, de la que cuelgan todas):
- El constructor se suscribe a `tasks:changed`, `habits:updated` y `day:changed` y se da de baja con `register()`. `getAllTasks()` guarda la firma de lo cargado (`loadedSignature`); un `tasks:changed` con esa misma firma se ignora (la edición ya la hizo esta vista), y una vista que nunca cargó tareas lo ignora.
- Cada vista tiene su `RefreshScheduler`. Si la vista no está visible (`containerEl.isShown()`) se marca como pendiente y se refresca al activarse (`active-leaf-change`).
- `isBusy()`: hay un `.modal-container`, un `.menu` o un `.flatpickr-calendar.open` en el documento, un `.oa-dragging` o `.oa-resizing` en la vista, o el foco está en un `input`, `textarea` o `select` de la vista.
- `runAutoRefresh()`: captura el scroll, ejecuta `performAutoRefresh()` sin pantalla de carga (`showLoadingOverlay()` no hace nada mientras dura) y restaura el scroll. Por defecto `performAutoRefresh()` vuelve a ejecutar `onOpen()` sin forzar la recarga, así que se reconstruyen la Lista y la Tabla con el estado guardado; `HabitView` lo sobreescribe (recarga los hábitos y llama a `refreshHabitView()`).
- `refreshView()` cancela la petición pendiente al terminar (como `cancelAutoRefresh()`, que usa `HabitView`), para no redibujar justo después de un refresco manual.
- El evento DOM `obsidian-agenda:habits-refresh` (editor y ajustes) también cancela la petición pendiente.

**Archivos afectados**

| Área | Archivos |
|---|---|
| Núcleo | nuevos `src/core/refresh-scheduler.ts`, `task-signature.ts`, `day-change.ts`, `scroll-state.ts`; `event-bus.ts` |
| Gestores | `src/core/task-manager.ts`, `src/habits/habit-manager.ts` |
| Plugin | `src/main.ts` |
| Vistas | `src/views/base-view.ts`, `src/views/habit-view.ts` |

**Riesgos**: redibujar una vista con el foco en la búsqueda (por eso `isBusy()`); parpadeo al reconstruir con `onOpen()` (se espera poco, porque no hay pantalla de carga); que la firma no cubra algo que se dibuja y no esté en la línea de la tarea (hoy no hay nada así: área y subárea salen de la ruta, que está en el `id`); rendimiento en vaults muy grandes (la firma recorre todas las tareas una vez por cambio, y solo si hay vistas abiertas); y que `metadataCache` tarde en indexar (por eso se escucha su evento `changed`).

## 24. Sincronía con Google Calendar (v1.1.15, diseño — no implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §15. Diseño basado en `pubcyberry/obsidian-google-cal-sync` (inicio de sesión, almacenamiento del token, sincronización incremental) y `mcuste/obsidian-gcal-sync` (permisos mínimos, barreras de seguridad), adaptado a un modelo bidireccional sobre líneas de tarea.

### 24.1 Módulos

Nuevo directorio `src/integrations/google/`, con la lógica pura separada de la que depende de Obsidian para poder probarla con scripts de Node:

| Archivo | Responsabilidad | Pura |
|---|---|---|
| `auth.ts` | OAuth con redirección local y PKCE, renovación y revocación del token | no |
| `crypto.ts` | Cifrado del refresh token con una frase | sí |
| `client.ts` | Peticiones con `requestUrl`: reintentos, errores, `If-Match`, 410, 412 y 429 | no |
| `calendar-sync.ts` | Descarga incremental y caché | no |
| `event-mapping.ts` | Evento de Google ↔ campos de la tarea (§15.3) | sí |
| `sync-planner.ts` | Compara los dos lados y produce una lista de acciones, con las reglas y las barreras | sí |
| `managed-notes.ts` | Detecta las notas de sincronización por su frontmatter (`metadataCache`) y escribe en ellas con `TaskWriter` | no |

### 24.2 Autenticación

- Cliente tipo Desktop, flujo de código con **PKCE (S256)** y parámetro `state`. Google no admite `obsidian://` como redirección ni el copiar y pegar manual, y el flujo de dispositivos no permite el permiso de Calendar.
- Un servidor HTTP local temporal en `127.0.0.1` con puerto aleatorio recibe el código. Se carga con `require` dinámico dentro de `Platform.isDesktop`, se cierra al recibir el código, al cancelar, al salir de los ajustes o a los 2 minutos, e ignora las peticiones sin el `state` de este inicio de sesión.
- **Permisos mínimos**: `calendar.events`, `calendar.calendarlist.readonly` y `calendar.app.created`. Se descarta el permiso `calendar` completo porque incluye compartir y borrar calendarios enteros, que el plugin no necesita, y porque Google indica que cuantos más permisos se piden menos probable es la aceptación. Google no admite autorización incremental en apps instaladas: ampliar permisos obligaría a reconectar.
- El access token vive solo en memoria y se renueva 60 segundos antes de caducar o tras un 401; las renovaciones concurrentes comparten una sola petición.
- Al desconectar se borra el token local y se revoca en `oauth2.googleapis.com/revoke`. Un `invalid_grant` lleva al estado «Token caducado» con un mensaje para volver a conectar.

### 24.2.1 Cifrado del refresh token

`crypto.ts` cifra el token con la frase de sincronización: clave de 256 bits derivada con PBKDF2-HMAC-SHA256 (600.000 iteraciones, sal aleatoria de 16 bytes) y AES-256-GCM con un IV aleatorio de 12 bytes, con sal e IV nuevos en cada escritura. Se guarda como `enc1.<sal>.<iv>.<cifrado>` en base64url. GCM autentica, así que una frase incorrecta se detecta. Todo con `crypto.subtle`, sin librerías. Protege contra quien lea el archivo o una copia sin la frase; no contra quien tenga ambos, y la frase debe ser fuerte.

### 24.3 Almacenamiento

| Dónde | Qué | Se sincroniza |
|---|---|---|
| `data.json` | `clientId`, `clientSecret` (Google trata el de una app de escritorio como público), refresh token cifrado, cuenta, catálogo de calendarios (id y nombre), carpeta de creación de notas e intervalo | Sí; se escribe lo menos posible para evitar copias en conflicto |
| `app.secretStorage` | La frase de sincronización (id en minúsculas, números y guiones) | **No**: es por dispositivo, por lo que el escritorio no le da el token al móvil y cada dispositivo escribe la frase una vez |
| `localStorage` (por dispositivo) | Caché de eventos, `syncToken` e índice id → ruta de la sincronización anterior | No; cambia en cada sincronización |

`secretStorage` existe desde Obsidian 1.11.4, por eso sube `minAppVersion`.

### 24.4 Descarga

`events.list` con `syncToken` (una petición por calendario con nota de sincronización). La primera descarga cubre de −3 a +6 meses con `singleEvents=true`. Un 410 borra la caché y hace una descarga completa. Los eventos cancelados se descartan. La lista de calendarios se pide al conectar y bajo demanda.

### 24.5 Identidad

- `🆔` toma un solo token sin espacios, pero un id de Tasks admite letras mayúsculas, `_` y `-`, y un id de evento de Google solo `a–v` y `0–9` (de 5 a 1024 caracteres). Para eventos nacidos en Google, el `🆔` es el id del evento tal cual (válido para Tasks). Para tareas locales, el id del evento es un prefijo fijo de al menos 3 caracteres más el hexadecimal del texto del `🆔` en UTF-8, reversible y sin cambiar nunca el `🆔` ni los `⛔` que apuntan a él (Especificación §17.3); una tarea sin `🆔` recibe uno nuevo en el formato de Tasks (base 36, 6 caracteres). Un 409 por id duplicado se resuelve actualizando.
- Los eventos creados por el plugin llevan una propiedad privada (`extendedProperties.private`) que los marca. Solo esos se borran; los demás solo se desvinculan.
- La ocurrencia siguiente de una tarea recurrente ya elimina `🆔` (ADR-R4), así que no hereda el id.
- El vínculo es el par (calendario, `🆔`): un id solo es único dentro de su calendario. El índice de la sincronización anterior se indexa por ese par, y la importación lo consulta sobre todas las notas antes de crear una línea. Un `🆔` repetido en dos líneas se avisa y solo se sincroniza la primera. Una línea está vinculada si existe en la caché de Google un evento del plugin (prefijo y propiedad privada) cuyo id decodificado es su `🆔`; ese conjunto sale de los eventos descargados, no de un índice local (Especificación §17.6). Un solo `🆔` guarda el id de un único sistema; sincronizar una misma tarea con varios sistemas requerirá revisar este formato en esas discusiones.

### 24.6 Planificador

`sync-planner.ts` recibe las líneas gestionadas, la caché de Google y el índice de la sincronización anterior, y devuelve acciones (crear, actualizar o borrar en Google; crear, actualizar o marcar `[-]` en la nota) con sus conteos. Título, inicio y fin tienen dos escritores: el desempate compara el `updated` de Google con la fecha de modificación del archivo. Cada parche lleva `If-Match` con el etag; un 412 refresca y reintenta una vez. Todo lo demás del evento solo lo escribe Google y se conserva. Los parches usan `sendUpdates=none`. Una línea con `🆔` sin evento correspondiente no genera acciones; un evento del plugin que ninguna línea reclama (línea borrada o `🆔` editado) se planifica para borrar y siempre requiere aprobación.

### 24.7 Barreras de seguridad

Aprobación con 5 o más borrados o 25 o más cambios, con un diálogo de revisión; en segundo plano no se aplica nada y se muestra un aviso. Rechazo por encima de 200 cambios. Una nota con una línea inválida se omite entera. Si una nota nunca se leyó bien, no se ejecutan borrados. Los límites son ajustables.

### 24.8 Escritura en las notas

Solo con `TaskWriter` (`updateTaskLine()`, `appendTaskLine()`, `insertLineAbove()`) y los helpers de `task-line-fields.ts`. Solo se tocan las notas de sincronización y las líneas vinculadas (su `🆔` coincide con un evento del plugin, §24.5). Cada nota es una conexión: su frontmatter (`agenda-origin`, `agenda-sync`, `agenda-calendar`, `agenda-allow-edit` y `agenda-account` opcional, Especificación §15.4) se lee de `metadataCache` y se vuelve a leer al cambiar el archivo. Todas las claves llevan el prefijo `agenda-` para no chocar con otros usos del frontmatter. El origen define el comportamiento: en una nota con `agenda-origin: google-calendar` (espejo) se sincronizan todas las líneas con fecha y aterrizan los eventos nuevos; en una con `agenda-origin: agenda-task` (local) solo las líneas vinculadas y no se importa nada. Se saltan con un aviso las notas con el frontmatter inválido o sin `agenda-calendar`, y si dos notas espejo apuntan al mismo calendario solo se sincroniza la primera (las notas locales pueden repetir calendario). Los tokens, la frase y el `syncToken` no van en el frontmatter (§24.3). La carpeta `temporal/agenda/` solo es donde «Añadir calendario» crea las notas espejo; el reconocimiento no depende de la ruta. Estados: un evento cancelado en Google pasa a `[-]` y uno rechazado por el usuario a `[~]`; el resto no recibe estado de Google. Una sola cuenta: `account` se lee pero se ignora hasta soportar varias.

### 24.9 Disparadores

Arranque, intervalo (5 minutos), cambio de una línea gestionada (con retardo de 1 a 1,5 s), el comando «Sincronizar ahora» y el foco de la ventana. Una sincronización a la vez (peticiones compartidas) y un mínimo de 30 s entre automáticas.

### 24.10 Escritorio y móvil

Un solo paquete, con `isDesktopOnly: false`. Lo único exclusivo del escritorio es el servidor local, protegido con `Platform.isDesktop`; todo lo demás usa `requestUrl`. La pantalla de ajustes tiene una rama por plataforma: en móvil muestra «Inicia sesión en el escritorio» o «Escribe la frase de sincronización». Hay que comprobar que `esbuild.config.mjs` no empaquete `http` para móvil.

### 24.11 Pruebas

El repo no tiene pruebas automatizadas y un error de sincronización escribe en datos reales, así que esta función las necesita desde el inicio: scripts de Node (como los de `task-recurrence.ts`) para los módulos puros (mapeo, planificador, cifrado con ida y vuelta y frase incorrecta, PKCE) y un transporte falso de Google inyectado en `client.ts` para probar la descarga, los 410, 412 y 409 y las barreras.

### 24.12 Archivos afectados (estimado)

| Área | Archivos |
|---|---|
| Integración | nuevo `src/integrations/google/` (§24.1) |
| Ajustes | `src/settings/settings.ts`, `src/settings/setting-tab.ts` (grupo Integraciones, ambas rutas) |
| Comandos y menú | `src/main.ts` («Sincronizar ahora», «Enviar a Google Calendar»), `src/core/task-field-menu.ts` |
| Modal | `src/modals/task-modal.ts` (elige el calendario destino y lo guarda en el frontmatter de la nota) |
| Versión mínima | `manifest.json` y `versions.json` (`minAppVersion` 1.11.4) |
| Compilación | `src/esbuild.config.mjs` (`http` fuera del paquete de móvil) |
| i18n | claves nuevas en los 6 locales |
| Docs | README: declaración del uso de red |

### 24.13 Fuera de alcance (v1.1.15)

Google Tasks, Microsoft y el plugin Tasks; varias cuentas de Google; `🔁` ↔ RRULE; el botón directo sin credenciales propias; inicio de sesión por copiar y pegar en móvil.


## 25. Ajustes de pestañas y carpeta de hábitos (v1.1.13, diseño — no implementado)

Comportamiento y decisiones: [[Especificación de vistas]] §18.

### 25.1 Visibilidad de pestañas

- `AgendaPluginSettings` gana `showTasksTab` y `showHabitTab` (ambos `true` por defecto) y pierde `showListTab` y `showTableTab`.
- **Migración** en una función pura `migrateTabSettings(saved)` de `settings.ts`, llamada desde `loadSettings()` tras el merge `{ ...DEFAULT_SETTINGS, ...data }`: si lo guardado no trae `showTasksTab`, se calcula como `!(saved.showListTab === false && saved.showTableTab === false)`; después se borran las dos claves antiguas del objeto.
- Consumidores: `header.hbs` (`{{#if settings.showTasksTab}}` y `{{#if settings.showHabitTab}}` envolviendo el `(or ...)` actual de las cinco subvistas; el helper `and` no existe), `buildTaskModeSwitch()` en `task-filter-bar.ts` (siempre Lista y Tabla; desaparece el caso de un solo modo) y `getDefaultTasksView()` en `base-view.ts` (sin comprobar visibilidad).
- `setting-tab.ts`: los dos interruptores nuevos en `getSettingDefinitions()` y en `display()`; se eliminan los de List y Table.

### 25.2 Carpeta de hábitos

- **Módulo puro** `src/habits/habit-folder.ts`: `normalizeHabitFolderPath(input, fallback)` devuelve `{ ok: true, path }` o `{ ok: false, reason }` con `reason` en `absolute`, `parent` o `chars` (claves i18n `habit_folder_invalid_*`); y `evaluateHabitFolderHint(input, exists)` devuelve `ok`, `missing` o `invalid` para Ajustes.
- **`HabitManager.ensureFolder(path)`**: recorre los segmentos acumulados y llama a `vault.createFolder()` en los que no existen; si un segmento existe como archivo, lanza un error; tolera que la carpeta ya exista por una carrera. `HabitManager` recibe un cuarto parámetro `saveSettings` para guardar la ruta nueva (hoy solo recibe un lector de ajustes).
- **`HabitFolderModal`** (`src/habits/habit-folder-modal.ts`): modal de Obsidian con un campo de texto, validación en vivo con la misma función, **Crear** deshabilitado mientras la ruta no sea válida, Intro para confirmar y Esc para cancelar; reutiliza las clases `.oa-btn` y de campo del Habit Editor. `open()` devuelve una promesa con la ruta confirmada o `null`.
- **Flujo** en `HabitEditorModal.save()`, solo al crear: si `habitManager.folderExists()` es falso, se abre el modal; con `null` se sale sin guardar; con una ruta, `ensureFolder()` y, si cambió, se guarda en `habitFolderPath` antes de `createHabit()`. Un error al crear se muestra con `Notice` y no se guarda el hábito.

### 25.3 Vistas sin hábitos

`HabitView` ofrece `getEmptyMessage()` (`habit_no_habits`, o `habit_no_habits_at` con la ruta si la carpeta no existe) y las cinco vistas lo usan. Rutina y Dashboard pasan a recibir `emptyMessage` en sus datos y sus plantillas sustituyen `{{t "habit_no_habits"}}` por `{{emptyMessage}}`, como ya hacen Grid, Tabla y Semanal; el código repetido de esas tres se elimina.

### 25.4 Aviso en Ajustes

El campo de la ruta pasa de un control `text` con `key` a un `render` personalizado, igual que `week_start_day`, que dibuja el campo y un texto de aviso debajo. El aviso se recalcula al abrir y con `debounce` (500 ms) al escribir. Al ser un control propio, guarda `habitFolderPath` a mano con `saveSettings()`. `display()` (Obsidian anterior a 1.13) obtiene el mismo resultado con `Setting` y un elemento hijo.

### 25.5 i18n y pruebas

- **Claves nuevas** en los 6 idiomas: `show_tasks_tab`, `show_habit_tab`, `habit_folder_modal_title`, `habit_folder_modal_desc`, `habit_folder_create`, `habit_folder_missing_hint`, `habit_folder_invalid_absolute`, `habit_folder_invalid_parent`, `habit_folder_invalid_chars` y `habit_folder_create_failed`; se eliminan `show_list_tab` y `show_table_tab`.
- **Pruebas** con scripts de Node (el repo no tiene framework): `normalizeHabitFolderPath()` con rutas válidas, absolutas, con `..`, con caracteres no permitidos y vacías; `migrateTabSettings()` con las cuatro combinaciones de los ajustes antiguos y con ajustes nuevos; `evaluateHabitFolderHint()`; y `ensureFolder()` con un vault simulado (orden de creación, carpeta existente y choque con un archivo).

### 25.6 Archivos afectados

| Área | Archivos |
|---|---|
| Ajustes | `src/settings/settings.ts`, `src/settings/setting-tab.ts`, `src/main.ts` (`loadSettings()`) |
| Pestañas | `src/views/templates/header.hbs`, `src/core/task-filter-bar.ts`, `src/views/base-view.ts` |
| Carpeta de hábitos | nuevos `src/habits/habit-folder.ts` y `habit-folder-modal.ts`; `habit-manager.ts`, `habit-editor.ts`, `habit-view.ts` y las vistas de hábitos con sus plantillas |
| i18n y docs | `src/locales/*.json`, README, manual de usuario en/es y `docs/todo.md` |

### 25.7 Riesgos

- Quien había ocultado solo uno de los dos modos ve ahora ambos (cambio aceptado, se anuncia en la novedad de la versión).
- El `render` personalizado deja fuera el enlace automático de la clave de Ajustes: hay que guardar y refrescar a mano.
- Los caracteres inválidos difieren entre sistemas operativos: se usa el conjunto más estricto (Windows) para que una ruta valga en todos.
- Si cambia el orden de carga (los ajustes se leen después del constructor del `HabitManager`), la carpeta se calcula siempre con el lector de ajustes y no con una copia.

### 25.8 Rótulos de los combos de hábitos

Comportamiento: [[Especificación de vistas]] §18.6.

- **Plantillas** `habit-grid-view.hbs`, `habit-weekly-view.hbs` y `habit-routine-view.hbs`: el contenedor `.oa-habit-view-selector` del combo de orden (y del de agrupar en Rutina) gana `data-label="{{t 'habit_sort_label'}}"` (o `habit_group_label`) y una clase modificadora para el prefijo; el `<select>` gana `aria-label` y `title` con el mismo texto.
- **Estilos** en `_habit-common.scss`: el prefijo se dibuja con `::before { content: attr(data-label) }` dentro del control, sin elementos nuevos en el DOM; debe caber en `is-tablet` e `is-phone` (si no, se acorta con una variante de la clase).
- **Opciones del combo de agrupar** de Rutina: `habit_daytime` y `habit_area` en lugar de `habit_sort_daytime` y `habit_sort_area`. No cambian los valores de las opciones, así que el código de `habit-routine-view.ts` y lo guardado quedan igual.
- **i18n**: claves nuevas `habit_sort_label` y `habit_group_label` en los 6 idiomas; en español `habit_sort_daytime` pasa a «Por momento del día».
- **Riesgo**: el texto de `::before` no lo anuncian los lectores de pantalla ni se puede seleccionar, por eso el `aria-label` y el `title`.