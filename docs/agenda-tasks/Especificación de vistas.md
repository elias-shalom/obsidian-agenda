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
> - `due` y `start` (siempre de día completo) se muestran en **dos filas fijas separadas** "Todo el día" (una para `due`, otra para `start`), **expandidas por defecto** (colapsable manualmente), en vez de una franja horaria, para que ninguna tarea desaparezca de la vista Día.
> - Distintivo visual por tipo de fecha: icono (el mismo emoji 🛫/📅/⏳) + acento de color, consistente en todas las vistas de calendario (ver ADR-T4-bis en [[Modelo de datos]]).
> - Tareas superpuestas en la misma franja: se apilan verticalmente en v1.1.4 (ver ADR-T5); un layout en carriles lado a lado queda como mejora futura.
> - Bloques que cruzan medianoche: se recortan al final del día (ADR-T7).
> - Tareas completadas con bloque/hora: por defecto se muestran atenuadas, no se ocultan (ADR-T6); el setting `calendarShowCompletedTasks` permite ocultarlas por completo del calendario.
> - **Filtro de fechas visibles**: qué combinación de `start`/`due`/`scheduled` se muestra es configurable — un setting global (Settings ▸ **Calendario**, grupo nuevo) define el valor por defecto, y cada vista de calendario puede sobreescribirlo en su propio toolbar (checkboxes), sin necesidad de guardarlo.
> - **Drag and drop (planeado, no en el primer corte)**: arrastrar un bloque a otra franja reescribe la hora de `scheduled`; redimensionar su borde inferior reescribe la duración. Arrastrar una tarea entre días en Mes/Semana/Semana laboral/Año solo cambia el día de la fecha que la esté posicionando (según la prioridad `scheduled > due > start`). Requiere una capacidad nueva en `TaskWriter` para reescribir en su lugar una línea de tarea existente (hoy solo soporta anexar); comparte esa base con el ítem, también pendiente, de edición nativa de tareas — ver [[Plan de implementación]].

### 4.5 Calendar Year View (`calendar-year-view`)

12 mini-calendarios (uno por mes), cada día con `hasTasksDue`/`taskCount`. Clic en un número de día con tareas navega a la vista Día de esa fecha (`CalendarView.navigateToDayView()`, guarda la fecha en `localStorage` y cambia el tipo de vista de la hoja).

> **Extendido a Mes/Semana/Semana laboral (2026-09-27)**: el mismo clic-en-el-número-de-día para navegar a la vista Día se agregó también a Mes (`.oa-calendar-month-day-number`) y Semana/Semana laboral (`.oa-calendar-date`, comparten contenedor), cableado una sola vez en `CalendarView.setupViewSpecificEventListeners()` (a diferencia de Año, aquí aplica a **todos** los días, tengan tareas o no). `stopPropagation()` evita que el clic también dispare el `dblclick` de la celda (crear tarea en esa fecha).

## 5. Timeline View (`timeline-view`) — placeholder

**Icono**: `calendar-check`. Estado: **incompleto**. `onOpen()` sólo carga todas las tareas (`getAllTasks`) y las pasa tal cual a su plantilla (`{ tasks }`), sin ningún cálculo de posicionamiento temporal, agrupación por fecha ni eje visual propio.

## 6. Gantt View (`gantt-view`) — placeholder

**Icono**: `calendar-days`. Estado: **incompleto**, mismo patrón que Timeline. Falta calcular duración (`start` → `due`), posicionar barras en un eje temporal y representar `dependsOn` visualmente.

## 7. Task Modal — creación/edición (`src/modals/task-modal.ts`)

Extiende `Modal` de Obsidian. Soporta 3 `ModalType`: `"create-task"` y `"edit-task"` (ambos implementados, comparten la misma plantilla `create-task-modal.hbs` con valores prefilled según el modo) y `"quick-capture"` (esqueleto).

- `onOpen()` → registra helper `t` de i18n → `initializeModal()` → resuelve y carga la plantilla, la parsea a DOM y la inserta en `contentEl` (siempre `create-task-modal`, reutilizada también para editar).
- `attachModalListeners()` → despacha a `attachTaskFormListeners()` para ambos `"create-task"`/`"edit-task"` (misma lógica de formulario; solo difiere el guardado, ver §7.3). No hay botón de cerrar propio en el encabezado (se probó y se quitó, ver §7.4) — se usa la ✕ nativa que Obsidian ya dibuja en la esquina del `Modal`.
- Campos básicos (siempre visibles): título/descripción, carpeta/archivo destino, prioridad (segmented control de 6 píldoras, §7.1) y fecha **programada** (`scheduled`, + hora + duración en el mismo renglón) — es el campo de fecha por defecto, no `due` (§7.2).
- Al guardar: `TaskWriter.appendTaskLine()` (crear, anexa línea nueva) o `TaskWriter.updateTaskLine()` (editar, reescribe en el lugar — §7.3).

### 7.1 Modo básico/avanzado (v1.1.4, Fase E, implementado)

El formulario básico se conserva compacto (sin fricción para quien no usa hora/duración). Debajo del renglón de fecha programada hay un encabezado de sección colapsable, estilo acordeón (título fijo **"More fields" / "Más campos"** + caret grande a la **izquierda** que rota, sin cambiar de texto al expandir/colapsar — `#oa-advanced-toggle`, posición del caret revisada en §7.4) que despliega, en el mismo modal, una sección `#oa-advanced-fields` con: fecha de **vencimiento** (📅 `due`, movida aquí — ver §7.2), `start` (🛫, mismo selector `flatpickr` que `scheduled`), recurrencia (🔁, texto libre en lenguaje natural), dependencias + id personalizado (⛔/🆔, en el mismo renglón vía `.oa-form-row` — §7.4) y `onCompletion` (🏁, select keep/delete).

- **Preferencia recordada**: el estado expandido/colapsado se guarda en `localStorage` (`app.saveLocalStorage('oa_task_modal_advanced_mode', ...)`, mismo mecanismo que otras preferencias de UI del plugin como el estilo de grilla del calendario) y se restaura al abrir el modal de nuevo — salvo al editar una tarea que ya tiene datos avanzados, que fuerza la expansión (§7.3).
- **Validación cruzada al guardar** (ADR-T2/T3, mismos mensajes que el menú de inserción de campos de la Fase B): si se puso hora sin fecha programada, o duración sin hora, se muestra un `Notice` y se cancela el guardado — no se escribe una línea inconsistente.
- **Orden de escritura de la línea**: prioridad → recurrencia → `start` → `scheduled` (+ hora + duración) → `due` → dependencias → `onCompletion` → id. El orden es solo por legibilidad humana; el parser (`task-section.ts`) ya no depende de un orden específico entre campos (ver ADR-T3 revisado en [[Modelo de datos]]).

### 7.2 Fecha por defecto y prioridad (revisión de look & feel, 2026-09-27)

Tras el primer pase de la Fase E, inspirado en el modal real de **Obsidian Tasks** y en patrones comunes de secciones colapsables:

1. **Fecha por defecto = `scheduled`, no `due`**: el campo de fecha del formulario básico pasó de ser `due` (con hoy precargado) a ser `scheduled` (con hoy precargado); `due` se movió a la sección avanzada, sin precarga (vacío por defecto). Justificación: con la programación por hora del día como funcionalidad central de v1.1.4, `scheduled` es ahora el campo de planificación más usado; `due` (vencimiento) es más ocasional.
2. **Prioridad como segmented control**: se reemplazó el botón bandera + `<select>` oculto por 6 botones-píldora siempre visibles (Lowest/Low/Normal/Medium/High/Highest, en ese orden ascendente con Normal al centro), cada uno con su emoji real de Obsidian Tasks salvo Normal (icono iterado varias veces a gusto del usuario: 🚩 → ⚪ → ▶️, ver también §7.4 para el estilo final de las píldoras). Un clic selecciona directamente, sin abrir nada.
3. **Encabezado con botón de cerrar** (✕, arriba a la derecha) — **posteriormente eliminado** por ser redundante con la ✕ nativa de Obsidian (§7.4) — y **sección avanzada estilo acordeón**: título fijo ("More fields") con un borde superior a modo de separador y un caret que rota al expandir, en vez del enlace de texto con flecha usado en la primera versión.

### 7.3 Edición de tareas existentes (implementado, 2026-09-27)

El modal `"edit-task"` reutiliza la misma plantilla y la mayoría de la lógica de `"create-task"` (`TaskModal.attachTaskFormListeners()`), con estas diferencias:

- **Origen**: clic simple sobre una píldora de tarea en cualquier vista de calendario (`CalendarView`, base compartida por Mes/Semana/Semana laboral/Día) abre `modalManager.openModal(EDIT_TASK_MODAL_TYPE, { task, onSaved })` con la `ITask` completa ya cargada en memoria — no hace falta releer el archivo. **Doble clic sigue abriendo el archivo** en el editor (como antes); para distinguir ambos gestos, el primer clic espera ~250ms por si llega un segundo clic (patrón estándar de desambiguación clic/doble clic) antes de abrir el modal.
- **Prefilled**: título, prioridad (mapeada de nombre a emoji), archivo (mostrado pero de solo lectura — mover una tarea de archivo no es parte de esta funcionalidad), due/start/scheduled (+ hora + duración), recurrencia, dependencias, `onCompletion` e id (solo si fue escrito explícitamente con 🆔; el id autogenerado `archivo-línea` no se prefilled). La sección "More fields" se **expande automáticamente** si la tarea ya tiene algún campo avanzado con valor.
- **Guardado**: en vez de `TaskWriter.appendTaskLine`, usa `TaskWriter.updateTaskLine(filePath, lineNumber, () => nuevaLinea)` (Fase D) — reescribe la línea completa reconstruida desde el formulario, preservando el carácter de estado del checkbox (`state.status`) y el `blockLink` (`^id`) originales, que el formulario no expone.
- **Refresco tras guardar**: `TaskModal` invoca el callback opcional `modalOptions.onSaved()` justo después de un guardado exitoso (crear o editar). Ninguna vista se suscribe al `EventBus`/`TASKS_UPDATED` hoy, así que sin este callback el calendario que abrió el modal se quedaba con datos obsoletos hasta una acción manual; `CalendarView` pasa `onSaved: () => this.refreshView()` tanto al crear (`openCreateTaskForDate`) como al editar (`openEditTaskModal`).

### 7.4 Ajustes de layout adicionales (2026-09-27)

Iteraciones puntuales de "look and feel" a pedido del usuario, tras las revisiones de §7.2/§7.3:

- **Fecha programada + hora + duración en un solo renglón**: los 3 controles (⏳/🕐/⏱️) comparten ahora el mismo `.oa-date-picker-group`, en vez de tres filas separadas.
- **Dependencias + Id en un solo renglón**: nueva clase reutilizable `.oa-form-row` (`display:flex; gap:1rem`, hijos `.oa-form-group` a `flex:1`) agrupa ambos campos lado a lado; queda disponible para futuros pares de campos.
- **Píldoras de prioridad aplanadas**: mismo tratamiento visual que los botones-ícono de fecha (`.oa-date-trigger`) — sin fondo/borde/outline visibles hasta hover o selección (`background-color`/`border`/`outline`/`box-shadow` forzados a `none`/`transparent` con `!important` en todos los estados, incluyendo `:focus`/`:active`, porque el `<button>` nativo de Obsidian pinta un fondo propio que gana si no se fuerza), y más angostas (`width: 2rem` fijo en vez de `flex:1` estirándose).
- **Botones de campo (fecha/hora/duración) sin contorno**: mismo tratamiento — sin outline/box-shadow visibles, mimetizados con el fondo del modal.
- **Toggle "More fields"**: el caret pasó del lado derecho al izquierdo del texto y se agrandó (`font-size: 1.3rem`).
- **Botón ✕ del encabezado eliminado**: ver nota en §7.2 — Obsidian ya provee su propio botón de cierre nativo en el `Modal`, hacía el custom redundante.
