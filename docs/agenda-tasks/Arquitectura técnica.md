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

Único método: `appendTaskLine(filePath, line)`. Normaliza la ruta, crea el archivo si no existe (`vault.create`) o lee+concatena+escribe si ya existe (`vault.read` + `vault.modify`), cuidando los saltos de línea al inicio/final. Genera el texto en formato emoji crudo (ej. `- [ ] Tarea 📅 2026-10-01 ⏫`).

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

No existe (a diferencia de hábitos) una ruta configurable para las tareas ni ajustes de patrones de emoji personalizados.

> **v1.1.4 (diseñado)**: nuevo grupo de settings **"Calendario"** con checkboxes para elegir qué fechas (`start`/`due`/`scheduled`) se muestran por defecto en las vistas de calendario (ver ADR-T4 en [[Modelo de datos]]).

## 6. Nueva superficie: inserción de campos desde el editor de notas (v1.1.4, diseñado)

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
