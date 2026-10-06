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
- **Destino en Mes/Semana/Semana laboral** (`CalendarView`, clase base): las celdas de día (`.oa-calendar-month-day`, `.oa-calendar-week-day-container`) aceptan el drop y llaman a `handleTaskDayDrop()`, que resuelve la transformación de línea según `calendarDateType` (`due`/`start` → `upsertSimpleDate`, `scheduled` → `upsertScheduledDate`, preservando hora/duración ya existentes) y la aplica con `TaskWriter.updateTaskLine()`. Si la escritura falla (línea ya no válida), se muestra un `Notice` (`task_drag_drop_error`) en vez de fallar silenciosamente.
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

## 11. Doble clic para crear tarea en la vista Día (v1.1.9, diseño — no implementado)

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

## 13. Vista Día: modo de varios días 1/3/5 (v1.1.10, diseño — no implementado)

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

## 14. Manejo de estatus desde el calendario (v1.1.10, diseño — no implementado)

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

## 15. Selector de fecha unificado en el Task Modal (v1.1.10, diseño — no implementado)

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

## 16. Recurrencia: nueva ocurrencia al completar (v1.1.10, diseño — no implementado)

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

## 17. Vista de lista dentro del calendario (v1.1.10, diseño — no implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §4.10.

### 17.1 Datos

Nuevo `generateViewData()` análogo al de Semana pero sin alinear a `weekStartDay`: genera 14 `WeekDayData` (mismo shape ya usado por Semana/Semana laboral) a partir de la fecha de referencia hasta referencia + 13 días. Reutiliza `CalendarView.getTasksForDate()` tal cual.

### 17.2 Plantilla

Nueva `calendar-list-view.hbs`: una fila (`.oa-calendar-list-row`) por día, con cabecera (fecha + nombre del día, mismo formato que la cabecera de columna de Semana) y un contenedor de ancho completo que reutiliza el mismo bloque `{{#each tasksForDay}}` + clases `.oa-calendar-task` ya usado en Mes/Semana — sin plantilla ni CSS nuevos para las píldoras en sí, y sin mecanismo de "N more" (confirmado: mismo comportamiento que una celda de Mes/Semana, que hoy muestra todas las tareas del día).

### 17.3 Registro como vista

Nuevo `CalendarListView extends CalendarView` + `CALENDAR_LIST_VIEW_TYPE`, registrado en `ViewManager` igual que las otras 5. Un 7º botón en `.oa-calendar-view-segmented`, presente en las 6 plantillas de calendario.

### 17.4 Navegación

`navigateToPrevious()`/`navigateToNext()` mueven la ventana completa de 14 días (no día a día, a diferencia de Día).

### 17.5 Archivos afectados

| Área | Archivos |
|---|---|
| Vista | `src/views/calendar-list-view.ts` (nuevo) |
| Plantilla | `src/views/templates/calendar-list-view.hbs` (nuevo) |
| Estilos | `src/styles/views/_calendar-list.scss` (nuevo) |
| Registro | `src/core/view-manager.ts`, `src/views/index.ts` |
| Selector segmentado | las 6 plantillas de calendario (7º botón) |

## 18. Modal de duración con dial circular (v1.1.10, diseño — no implementado)

Comportamiento de usuario y decisiones: [[Especificación de vistas]] §7.7.

### 18.1 Extracción del dial compartido

`HabitEditorModal.attachTimeDial()` (hoy privado e inline, `TIME_DIAL_MAX_MINUTES = 120` fijo) se extrae a `src/core/time-dial.ts`, parametrizado por `maxMinutes` y `stepMinutes` (nuevo), siguiendo el mismo patrón de extracción ya usado para `CalendarDatePicker` (clase con `mount(root)`, callback `onChange`). El Habit Editor pasa `{ maxMinutes: 120, stepMinutes: 1 }` (sin cambios de comportamiento); `TaskDurationModal` pasa `{ maxMinutes: 1440, stepMinutes: 5 }`.

### 18.2 Snap a pasos de 5 minutos

`applyValue()` redondea al múltiplo de `stepMinutes` más cercano en vez de al entero más cercano; lo mismo aplica al manejo de teclado (flechas) y rueda del mouse.

### 18.3 Archivos afectados

| Área | Archivos |
|---|---|
| Componente | `src/core/time-dial.ts` (nuevo, extraído de `habit-editor.ts`) |
| Habit Editor | `src/habits/habit-editor.ts` (usa el componente en vez del código inline) |
| Modal de duración | `src/modals/task-duration-modal.ts` (usa el componente con `maxMinutes:1440, stepMinutes:5`) |
| Estilos | el SCSS del dial (hoy embebido en los estilos de hábitos) se mueve a un archivo compartido |
