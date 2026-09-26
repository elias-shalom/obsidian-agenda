---
name: "Especificación de vistas - Agenda Tasks"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: task-management
archetype: engineer
status: active
related:
  - "[[README]]"
  - "[[Modelo de datos]]"
  - "[[Arquitectura técnica]]"
created: 2026-09-25
tags:
  - obsidian-agenda
  - documentation
  - specifications
---

# Especificación de vistas — Módulo Agenda Tasks

> Stack: Handlebars (`.hbs`) + TypeScript + Luxon + SCSS. Todas las cadenas visibles vía `i18n.t()`.

## 0. `BaseView` — patrón común a todas las vistas

Clase abstracta que extiende `ItemView` de Obsidian; todas las vistas de tareas (y de hábitos) heredan de ella.

| Miembro | Rol |
|---|---|
| `getAllTasks(taskManager)` | Usa el cache si es válido; fuerza un refresco si se marcó `_forceNextRefresh` (usado por `refreshView()`). |
| `refreshView()` (público) | Marca el flag de refresco forzado y vuelve a llamar `onOpen()`. |
| `groupTasksByFolder(tasks)` | Construye un árbol `Record<string, FolderNode>` (`{ name, fullPath, tasks, subfolders }`) — usado por Lista. |
| `toLocalMidnight(dateInput)` | Normaliza cualquier fecha a medianoche en zona horaria local (Luxon). |
| `registerHandlebarsHelpers(i18n)` / `registerViewSpecificHelpers(i18n)` (abstracto) | Helpers globales + helpers propios de cada vista concreta. |
| `render(viewType, data, i18n, plugin, leaf)` | Renderiza `header.hbs` + la plantilla propia de la vista. |
| `showLoadingOverlay(linesCount, hasHeader)` | Overlay tipo skeleton mientras se cargan los datos. |

**Ciclo de vida típico**: `onOpen()` → `showLoadingOverlay()` → carga de datos → `render()` → `registerViewSpecificHelpers()` → `setupViewSpecificEventListeners()` → (en algún momento) `onClose()`.

## 1. Overview View (`overview-view`)

**Icono**: `layout-dashboard`. Rol: panel/dashboard de KPIs de tareas.

Datos principales que calcula y expone a la plantilla: fecha del panel, contadores de completadas/pendientes de hoy, progreso semanal (`done`/`total`/`percentage`), próxima tarea crítica (menor `daysUntilDeadline`) y días restantes, totales globales (completadas/pendientes/en progreso), tareas de alta prioridad, tareas sin fecha, completadas en los últimos 7 días y tendencia, ratio de finalización, métricas de "consistencia"/"salud del sistema", y listas: tareas de hoy, vencidas, próximas, inválidas, más antiguas y agrupadas por proyecto/carpeta.

## 2. List View (`list-view`)

**Icono**: `list-todo`. Rol: listado de tareas, jerárquico por carpeta o plano, con toggle entre ambos modos (`isHierarchicalView`, `true` por defecto).

Expone a la plantilla: `tasks` (plana), `groupedTasks` (árbol de carpetas), `flattenedTasks` (variante aplanada de un nivel) e `isHierarchicalView`. Helpers propios: `totalTaskCount(folder)` (cuenta recursiva incluidas subcarpetas) y `renderFolderHierarchy(folder, options)` (recorre el árbol para el template).

## 3. Table View (`table-view`)

**Icono**: `table`. Rol: tabla ordenable/filtrable de tareas.

Estado interno: `currentSortColumn`, `currentSortDirection` (`'asc' | 'desc'`). Datos expuestos: `tasks`, `uniqueFolders` (para el filtro por carpeta). Helpers: `equals`, `not`, `contains`, `inRange`, `dateTypeIcon` (mapea `TaskDateType` a su emoji). Interacciones: clic en encabezado de columna ordenable (`th.oa-sortable`) dispara reordenamiento; input de búsqueda de texto y dropdowns de filtro reaplican el filtrado en el cliente.

## 4. Calendar View (abstracta, `calendar-view.ts`)

Base común de las 5 vistas de calendario. Mantiene `tasks` y `currentDate` (Luxon `DateTime`); define `generateViewData()` y `getViewType()` como abstractos, y resuelve en común: `onOpen()` (carga tareas + `refreshCalendar()`), `formatHour(hour)` (formato 12h AM/PM), `getWeekStartDay()` (desde settings), `getLocalizedDayNames()` (rotados según `weekStartDay`) y `getTasksForDate(date)` (filtra por `date.due` igual al día dado).

### 4.1 Calendar Month View (`calendar-month-view`)

Genera semanas completas (incluye días del mes anterior/siguiente para rellenar la grilla) con, por día: fecha, si pertenece al mes actual, si es hoy, día del mes y `tasksForDay`. Navegación `navigateToPrevious()`/`navigateToNext()` mueve `currentDate` un mes.

> **v1.1.4 (diseñado)**: hoy `tasksForDay` solo usa `date.due`; se planea ampliarlo a `start`/`due`/`scheduled` de forma configurable (mismo filtro y marcas visuales que la vista Día, ver §4.4), manteniendo `due` como comportamiento por defecto para no alterar el aspecto actual salvo que el usuario active los otros tipos.

### 4.2 Calendar Week View (`calendar-week-view`)

7 días con nombre e índice ISO de día de semana, fecha formateada y `tasksForDay`. Navegación ±1 semana. `periodName` tipo "Jan 13 – Jan 19, 2026".

> **v1.1.4 (diseñado)**: las tareas con `scheduled` con hora muestran esa hora como etiqueta pequeña dentro de la misma cápsula/píldora que ya se usa hoy (sin rediseñar la vista). Una grilla horaria semanal completa (7 columnas × 24 filas, estilo Google Calendar) queda anotada como un ítem de roadmap propio y futuro, fuera de alcance de v1.1.4.

### 4.3 Calendar Work Week View (`calendar-workweek-view`)

Variante de 5 días (lunes–viernes). Calcula el lunes de la semana actual a partir de `currentDate.weekday` (ISO) y arma la grilla desde ahí.

### 4.4 Calendar Day View (`calendar-day-view`)

Vista de un único día con **24 franjas horarias** (`hourSlots`, cada una con `hour`, `formattedHour` y sus `tasks`) — hoy ninguna tarea tiene componente de hora, así que todas caen sin asignar a una franja específica. Incluye mini-calendario navegable del mes y persiste la fecha navegada en `localStorage` (`oa_navigate_to_date`).

> **v1.1.4 (diseñado, ver ADR-T1/T2/T4 en [[Modelo de datos]])**:
> - `scheduled` con hora puebla la franja horaria correspondiente; si además tiene duración (modo bloque), la tarea ocupa un bloque visual de `[hora, hora + duración]` (posiblemente varias franjas), similar a un evento de calendario.
> - `due` y `start` (siempre de día completo) se muestran en **dos filas fijas separadas** "Todo el día" (una para `due`, otra para `start`), **colapsadas por defecto**, en vez de una franja horaria, para que ninguna tarea desaparezca de la vista Día.
> - Distintivo visual por tipo de fecha: icono (el mismo emoji 🛫/📅/⏳) + acento de color, consistente en todas las vistas de calendario (ver ADR-T4-bis en [[Modelo de datos]]).
> - Tareas superpuestas en la misma franja: se apilan verticalmente en v1.1.4 (ver ADR-T5); un layout en carriles lado a lado queda como mejora futura.
> - Bloques que cruzan medianoche: se recortan al final del día (ADR-T7).
> - Tareas completadas con bloque/hora: se muestran atenuadas, no se ocultan (ADR-T6).
> - **Filtro de fechas visibles**: qué combinación de `start`/`due`/`scheduled` se muestra es configurable — un setting global (Settings ▸ **Calendario**, grupo nuevo) define el valor por defecto, y cada vista de calendario puede sobreescribirlo en su propio toolbar (checkboxes), sin necesidad de guardarlo.
> - **Drag and drop (planeado, no en el primer corte)**: arrastrar un bloque a otra franja reescribe la hora de `scheduled`; redimensionar su borde inferior reescribe la duración. Arrastrar una tarea entre días en Mes/Semana/Semana laboral/Año solo cambia el día de la fecha que la esté posicionando (según la prioridad `scheduled > due > start`). Requiere una capacidad nueva en `TaskWriter` para reescribir en su lugar una línea de tarea existente (hoy solo soporta anexar); comparte esa base con el ítem, también pendiente, de edición nativa de tareas — ver [[Plan de implementación]].

### 4.5 Calendar Year View (`calendar-year-view`)

12 mini-calendarios (uno por mes), cada día con `hasTasksDue`/`taskCount`. Clic en un día con tareas navega a la vista Día de esa fecha.

## 5. Timeline View (`timeline-view`) — placeholder

**Icono**: `calendar-check`. Estado: **incompleto**. `onOpen()` sólo carga todas las tareas (`getAllTasks`) y las pasa tal cual a su plantilla (`{ tasks }`), sin ningún cálculo de posicionamiento temporal, agrupación por fecha ni eje visual propio.

## 6. Gantt View (`gantt-view`) — placeholder

**Icono**: `calendar-days`. Estado: **incompleto**, mismo patrón que Timeline. Falta calcular duración (`start` → `due`), posicionar barras en un eje temporal y representar `dependsOn` visualmente.

## 7. Task Modal — creación/edición (`src/modals/task-modal.ts`)

Extiende `Modal` de Obsidian. Soporta 3 `ModalType`: `"create-task"` (implementado, con plantilla `create-task-modal.hbs`), `"edit-task"` (parcial) y `"quick-capture"` (esqueleto).

- `onOpen()` → registra helper `t` de i18n → `initializeModal()` → resuelve y carga la plantilla según `modalType` (`TEMPLATE_LOADERS`), la parsea a DOM y la inserta en `contentEl`.
- `attachModalListeners()` — engancha los listeners de guardado/cancelación según el tipo de modal.
- Campos del formulario de creación: título/descripción, fecha de vencimiento (con selector `flatpickr`), prioridad, tags y carpeta/archivo destino.
- Al guardar, delega en `TaskWriter.appendTaskLine()` para anexar la línea generada en formato emoji al archivo elegido (creándolo si no existe).

> **v1.1.4 (diseñado) — modo básico/avanzado**: el formulario actual se conserva tal cual como modo "básico" (sin fricción para quien no usa hora/duración). Debajo se agrega un enlace/toggle **"Mostrar opciones avanzadas ▾"** que despliega, en el mismo modal (sin navegar a otra pantalla), los campos de `start`, `scheduled` (+ hora + duración), recurrencia, dependencias, `onCompletion` e id. La preferencia de modo (básico/avanzado) **se recuerda** entre usos (persistida, no se resetea cada vez). Este mismo patrón básico/avanzado aplicará también al futuro modal de edición (`"edit-task"`) una vez se complete.
