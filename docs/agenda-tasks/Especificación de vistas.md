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

Interacciones: el botón superior alterna entre jerarquía de carpetas y vista plana; las carpetas se pueden contraer. El clic simple en una tarea abre el modal de edición y el doble clic abre su nota en la línea correspondiente. Las filas usan prioridad y fecha de vencimiento como señales secundarias, sin ocultar la descripción.

## 3. Table View (`table-view`)

**Icono**: `table`. Rol: tabla ordenable/filtrable de tareas.

Estado interno: `currentSortColumn`, `currentSortDirection` (`'asc' | 'desc'`). Datos expuestos: `tasks`, `uniqueFolders` (para el filtro por carpeta). Helpers: `equals`, `not`, `contains`, `inRange`, `dateTypeIcon` (mapea `TaskDateType` a su emoji). Interacciones: los encabezados ordenables (`th.oa-sortable`) cambian el orden ascendente/descendente con clic o con Enter/Espacio; el encabezado activo expone `aria-sort`. Búsqueda y filtros de prioridad, estado, carpeta y fecha se aplican en el cliente.

El estado de búsqueda, filtros y orden se guarda en el almacenamiento local de Obsidian y se restaura al volver a la vista, incluso después de editar una tarea. Las anchuras de las columnas se recalculan según el contenido de las filas visibles, con límites para evitar columnas desproporcionadas; en pantallas estrechas se conserva el desplazamiento horizontal. Columnas (v1.1.11): número de fila (44–50 px), prioridad, estado, tarea, carpeta, fechas (80–120 px) y etiquetas; la columna Archivo se quitó en v1.1.11. Pendiente: ajustar las columnas al ancho real del contenedor (v1.1.12, §14.3 y `docs/todo.md`). La presentación usa filas alternas sutiles, estados y prioridades diferenciados, fechas agrupadas y etiquetas compactas.

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

Vista de un único día con **24 franjas horarias** (`hourSlots`, cada una con `hour`, `formattedHour` y sus `tasks`) — hoy ninguna tarea tiene componente de hora, así que todas caen sin asignar a una franja específica. Incluye mini-calendario navegable del mes y persiste la fecha navegada en `localStorage` (`oa_navigate_to_date`). *(La fecha compartida entre vistas y el selector de fecha se rediseñan en §4.6, v1.1.9.)*

> **v1.1.4 (diseñado, ver ADR-T1/T2/T4 en [[Modelo de datos]])**:
> - `scheduled` con hora puebla la franja horaria correspondiente; si además tiene duración (modo bloque), la tarea ocupa un bloque visual de `[hora, hora + duración]` (posiblemente varias franjas), similar a un evento de calendario.
> - `due` y `start` (siempre de día completo) se muestran en **dos filas fijas separadas** "Todo el día" (una para `due`, otra para `start`), **expandidas por defecto** (colapsable manualmente), en vez de una franja horaria, para que ninguna tarea desaparezca de la vista Día.
> - Distintivo visual por tipo de fecha: icono (el mismo emoji 🛫/📅/⏳) + acento de color, consistente en todas las vistas de calendario (ver ADR-T4-bis en [[Modelo de datos]]).
> - Tareas superpuestas en la misma franja: se apilan verticalmente en v1.1.4 (ver ADR-T5); un layout en carriles lado a lado queda como mejora futura.
> - Bloques que cruzan medianoche: se recortan al final del día (ADR-T7).
> - Tareas completadas con bloque/hora: por defecto se muestran atenuadas, no se ocultan (ADR-T6); el setting `calendarShowCompletedTasks` permite ocultarlas por completo del calendario.
> - **Filtro de fechas visibles**: qué combinación de `start`/`due`/`scheduled` se muestra es configurable — un setting global (Settings ▸ **Calendario**, grupo nuevo) define el valor por defecto, y cada vista de calendario puede sobreescribirlo en su propio toolbar (checkboxes), sin necesidad de guardarlo.
> - **Drag and drop (planeado, no en el primer corte)**: arrastrar un bloque a otra franja reescribe la hora de `scheduled`; redimensionar su borde inferior reescribe la duración. Arrastrar una tarea entre días en Mes/Semana/Semana laboral/Año solo cambia el día de la fecha que la esté posicionando (según la prioridad `scheduled > due > start`). Requiere una capacidad nueva en `TaskWriter` para reescribir en su lugar una línea de tarea existente (hoy solo soporta anexar); comparte esa base con el ítem, también pendiente, de edición nativa de tareas — ver [[Plan de implementación]].

#### 4.4.1 Doble clic para crear tarea (v1.1.9 — implementado)

> **Estado**: implementado. Mecanismo: [[Arquitectura técnica]] §11.

**Bug actual**: Mes, Semana, Semana laboral y Año crean una tarea al hacer doble clic en una celda vacía (`CalendarView.setupViewSpecificEventListeners()`), pero el selector compartido incluye `.oa-calendar-day-column`, una clase de un diseño anterior de la vista Día que ya no existe en su plantilla actual (hoy usa `.oa-calendar-day-hours`/`.oa-calendar-hour-slot` y la sección "Todo el día"). Por eso el doble clic no hace nada en Día.

**Diseño**:
- Doble clic en una **franja horaria** (`.oa-calendar-hour-slot`) abre el modal de creación con la fecha **y la hora de esa franja** prellenadas en el campo `scheduled`.
- Doble clic en la sección **"Todo el día"** (`.oa-calendar-allday-content`) abre el mismo modal que usan Mes/Semana/Semana laboral/Año (`openCreateTaskForDate`), sin hora.
- Si el doble clic cae sobre una tarea existente (`.closest('.oa-calendar-task')`), se ignora — el doble clic sobre una tarea sigue abriendo su nota, igual que en las demás vistas; es el mismo guard que ya usan Mes/Semana.
- `.oa-calendar-allday-content` gana una altura mínima para que, aunque no haya ninguna tarea de todo el día ese día, quede un área vacía visible y fácil de encontrar donde hacer doble clic.

**Bug relacionado encontrado**: `TaskModal.buildTemplateData()` (rama de creación) siempre usa `DateTime.now()` para `scheduledDateValue`; nunca lee `modalOptions.today`, aunque `CalendarView.openCreateTaskForDate(dateStr)` ya se lo pasa. Es decir, **el doble clic para crear tarea en Mes/Semana/Semana laboral/Año hoy siempre prellena la fecha de hoy, sin importar en qué día se hizo doble clic** — bug preexistente, no introducido por este cambio. Para que el nuevo doble clic de Día prellene correctamente la fecha (y la hora, en las franjas), hace falta corregir `buildTemplateData()` para que lea `modalOptions.today` (ya se envía, nunca se usa) y una clave nueva `modalOptions.scheduledTime` (hora de la franja). Se propone corregir esto para las cinco vistas a la vez, ya que comparten el mismo modal.

#### 4.4.2 Decisiones

1. **Corregir el bug de `modalOptions.today` — decidido: sí.** Se corrige junto con esta fase, afecta también a Mes/Semana/Semana laboral/Año.

#### 4.4.3 Modo de varios días: 1/3/5 (v1.1.10 — implementado)

> **Estado**: implementado (pospuesto de v1.1.9 a v1.1.10). Mecanismo: [[Arquitectura técnica]] §13.

No es una vista nueva en el selector de §4.8: es un **modo dentro de la vista Día**, con su propio multi-botón (1/3/5) que solo aparece cuando Día está activa — mismo patrón que ya usan Semana/Semana laboral con su selector de estilo de grilla (`#oa-calendar-grid-style`, visible solo dentro de esas plantillas). "1 día" es la vista Día actual sin ningún cambio; "3" y "5" son las opciones nuevas.

- **Centrado**: el día de referencia (hoy o el seleccionado) queda en el centro de la ventana visible — 3 días: uno antes, el de referencia, uno después; 5 días: dos antes, el de referencia, dos después. No se construye la alternativa "anclado al inicio" en esta primera versión; queda anotada como posible ajuste configurable a futuro.
- **Navegación**: ◀▶ desplazan la ventana completa **un día a la vez** (no saltan de ventana en ventana), para poder "recorrer" los días de forma continua.
- **Hereda el diseño de Día**: mismo grid de horas y bloques con duración/carriles del §4.7, repetido por columna — una etiqueta de hora compartida a la izquierda y N columnas de día a la derecha dentro de cada `.oa-calendar-hour-row` (en vez de una sola celda).
- **Sin cruces entre días**: los cálculos de bloques con duración y de carriles (§4.7.3) son independientes por columna; ninguna tarea ni carril cruza de un día a otro, consistente con el recorte a medianoche ya acordado (ADR-T7).
- **Resaltados**: "hoy" y la fecha seleccionada (§4.6.3) se marcan en su columna correspondiente de forma independiente; si ambas coinciden con el día central, se aplican las dos marcas igual que en las demás vistas.

### 4.5 Calendar Year View (`calendar-year-view`)

12 mini-calendarios (uno por mes), cada día con `hasTasksDue`/`taskCount`. Clic en un número de día con tareas navega a la vista Día de esa fecha (`CalendarView.navigateToDayView()`, guarda la fecha en `localStorage` y cambia el tipo de vista de la hoja).

> **Extendido a Mes/Semana/Semana laboral (2026-09-27)**: el mismo clic-en-el-número-de-día para navegar a la vista Día se agregó también a Mes (`.oa-calendar-month-day-number`) y Semana/Semana laboral (`.oa-calendar-date`, comparten contenedor), cableado una sola vez en `CalendarView.setupViewSpecificEventListeners()` (a diferencia de Año, aquí aplica a **todos** los días, tengan tareas o no). `stopPropagation()` evita que el clic también dispare el `dblclick` de la celda (crear tarea en esa fecha).

### 4.6 Fecha de referencia compartida y selector de fecha (v1.1.9 — implementado)

> **Estado**: implementado. Lo descrito como "propuesto" ya existe en el código; "decidido" refleja la decisión final tomada durante la implementación. Mecanismo y archivos afectados: [[Arquitectura técnica]] §9. Fases: [[Plan de implementación]].

#### 4.6.1 Situación actual

- Solo existe la marca de "hoy" (`oa-calendar-today` en Mes/Semana/Semana laboral, `oa-year-today` en Año). Un día seleccionado distinto de hoy solo existe en el mini-calendario de Día (`oa-mini-selected`).
- Cada tipo de vista es una instancia nueva (`leaf.setViewState`) con su propio `currentDate`, inicializado en hoy. La fecha solo se transmite hacia Día (`oa_navigate_to_date`, clave que Día lee y borra), así que cambiar de Mes a Semana con el dropdown vuelve a hoy.
- La pestaña **Calendario** del encabezado (`BaseView.attachEventTabs()`) siempre activa `calendar-month-view` directamente, sin pasar por `currentDate` ni por ninguna fecha guardada.
- Para llegar a una fecha lejana solo hay flechas (±1 período) y el mini-calendario de Día (±1 mes).

#### 4.6.2 Fecha de referencia (propuesto)

- Hay **una sola fecha de referencia** (la que hoy es `currentDate`) compartida por las cinco vistas. Cada vista muestra el período que la contiene: Día → ese día, Semana/Semana laboral → su semana, Mes → su mes, Año → su año.
- **Cambiar de tipo de vista conserva la fecha.** Es un cambio de comportamiento respecto a hoy (antes volvía a hoy). El botón "Hoy" restablece la referencia a la fecha actual.
- **Excepción intencional**: la pestaña **Calendario** del encabezado sigue abriendo siempre Mes en la fecha actual (hoy), igual que hoy — no lee la fecha de referencia. Solo se conserva la fecha al navegar *dentro* del calendario (dropdown de vista, flechas, botón "Hoy", clic en un número de día, selector). Si vienes de Lista/Tabla/Hábitos y abres Calendario desde el encabezado, verás Mes y hoy, no la última fecha que dejaste.
- Las flechas mueven la referencia por la unidad de la vista (día, semana, mes, año). Luxon recorta a fin de mes (31 ene + 1 mes = 28 feb) y no recupera el 31 al volver; es el comportamiento actual y se acepta.
- La referencia vive en memoria mientras el plugin está cargado y no se guarda entre reinicios (ver §4.6.7, decisión 1).

#### 4.6.3 Resaltado de la fecha seleccionada (propuesto)

La fecha seleccionada es la fecha de referencia y se marca **de forma independiente de "hoy"**; si coinciden, se aplican ambas marcas. **El estilo de "hoy" no cambia**: se añade un marcador nuevo para la fecha seleccionada, no se sustituye el existente.

| Vista | Celda | Clase nueva | Nota |
|---|---|---|---|
| Mes | `oa-calendar-month-day` | `oa-calendar-selected` | También en días de meses adyacentes que completan la grilla. |
| Semana / Semana laboral | `oa-calendar-week-day-container` | `oa-calendar-selected` | Mismo contenedor en ambas. |
| Año | `oa-calendar-year-day` | `oa-year-selected` | Solo cuando `isCurrentMonth`: cada mes repite días de los meses vecinos y se marcaría dos veces. |
| Día | — | — | El encabezado ya muestra el día; el selector marca su fecha igual que las demás vistas. |

- Datos: `isSelected` (calculado como `currentDate.hasSame(día, 'day')`) en `WeekDayData`, en los días de `MonthViewData` y en los de `YearViewData`.
- Estilo: "hoy" conserva su borde de 2 px; la fecha seleccionada usa fondo tintado con el color de acento y el número en un círculo relleno. No depende solo del color, y usa variables del tema para claro y oscuro.

#### 4.6.4 Selector de fecha (propuesto)

- **Apertura**: un botón con icono de calendario en `.oa-calendar-nav-container` de las cinco plantillas, junto al dropdown de vista, con `aria-haspopup="dialog"` y `aria-expanded`. El selector está **oculto por defecto** y se muestra como popover anclado al botón.
- **Cierre**: elegir un día, `Escape` (devuelve el foco al botón), clic fuera o pulsar otra vez el botón. Cerrar sin elegir no cambia la fecha.
- **Estado propio**: el selector guarda su mes/año de exploración, independiente de la fecha seleccionada; se inicializa con la referencia al abrir. **Solo elegir un día cambia la fecha.**
- **Niveles** (`días → años → meses → días`):
  1. **Días**: el encabezado muestra mes y año y es un botón; ◀ ▶ cambian de mes. Pulsar el encabezado abre el nivel de años.
  2. **Años**: rejilla de 3×4 con una década (ej. 2020–2029, con 2019 y 2030 atenuados, como en la referencia visual); ◀ ▶ cambian de década. Elegir un año abre el nivel de meses.
  3. **Meses**: rejilla de 3×4 con los meses del año elegido (nombres abreviados y localizados); el encabezado muestra el año y vuelve al nivel de años; ◀ ▶ cambian de año. Elegir un mes vuelve al nivel de días de ese mes.
- **Rejilla de días**: 6 filas fijas para que el popover no cambie de alto entre meses. Respeta `weekStartDay` y usa los nombres de día localizados (`getLocalizedDayNames()`) — el mismo método que ya usan Mes/Semana/Semana laboral/Año. El mini-calendario de Día tiene hoy una lista de letras fija en español (`L M X J V S D`, lunes primero) sin importar el idioma del plugin; se reemplaza por `getLocalizedDayNames()` para que coincida con el idioma y el `weekStartDay` configurados.
- **Indicadores de tareas**: marca los días con tareas resolviendo cada día con el mismo criterio que usan las vistas (`CalendarView.getTasksForDate()`/`resolveCalendarAnchor()`, que respeta `calendarShowDueDates`/`StartDates`/`ScheduledDates` y `calendarShowCompletedTasks`). Hoy el mini-calendario de Día arma su propio punteado recorriendo `this.tasks` y mirando directamente `task.date.due`/`task.date.scheduled`, sin pasar por esos settings: nunca considera `start`, sigue marcando un día aunque el usuario haya apagado ese tipo de fecha en Settings ▸ Calendario, y cuenta tareas completadas aunque estén ocultas en el calendario principal. El selector reutiliza la lógica de la clase base para que el punteado coincida con lo que la vista activa realmente muestra. **Requisito**: un día se marca con punto si y solo si `getTasksForDate(día).length > 0` — el mismo cálculo que usa Mes. Si todas las tareas de un día están ocultas por los settings (tipo de fecha desactivado o completadas ocultas), ese día no debe mostrar punto, ni en el selector ni en el mini-calendario de Día.
- **Marcas**: "hoy" y la fecha seleccionada usan las reglas de §4.6.3.
- **Accesibilidad**: `role="dialog"`; días, meses y años son `<button>`; el foco inicial va a la fecha seleccionada. Navegar la rejilla con flechas queda como segunda iteración.
- **Idiomas**: meses y años localizados con Luxon (`setLocale(getLanguage())`, como la vista Año); textos nuevos en los 6 locales con las mismas claves.

#### 4.6.5 Al elegir una fecha (propuesto)

1. Se guarda la fecha como referencia y se cierra el selector.
2. La vista **mantiene su tipo** (el dropdown no cambia) y se re-renderiza en esa fecha.
3. Se prefiere re-renderizar con las tareas ya en memoria (`refreshCalendar()`); `refreshView()` fuerza una recarga completa de tareas (`_forceNextRefresh`) en cada navegación.

Nota: `CalendarWeekView` usa `startOf('week')` de Luxon (semana ISO, lunes) y no `weekStartDay`, a diferencia de Mes. "La semana que contiene la fecha" será la de Semana tal como funciona hoy; corregir esa discrepancia no forma parte de este cambio.

#### 4.6.6 Vista Día (decidido)

El mini-calendario lateral se reemplaza por el mismo componente selector, montado en **modo acoplado**: siempre visible en el mismo lugar del sidebar, sin botón de apertura y sin poder ocultarse (a diferencia del popover de las otras cuatro vistas). Mantiene los mismos niveles días → años → meses → días: pulsar el encabezado mes/año abre el nivel de años igual que en el popover, solo que el panel no se cierra solo ni requiere clic en un botón para mostrarse. Esto elimina la rejilla, las letras de día y el cálculo de indicadores duplicados de `generateMiniCalendarData()` (§9.4 de [[Arquitectura técnica]]), sin cambiar la experiencia visible de la vista Día.

El sidebar completo (selector acoplado incluido) es además **colapsable hacia la derecha** mediante una manija (`.oa-calendar-sidebar-toggle`) entre la vista principal y el sidebar: colapsa su ancho a 0 con una transición suave y la vista principal ocupa el espacio liberado (flexbox puro, sin recalcular anchos en JS). El estado (abierto/colapsado) se persiste en `localStorage` (`calendar_day_sidebar_collapsed`) y se incluye en los datos de la plantilla para que el primer render ya refleje el estado correcto, sin parpadeo.

#### 4.6.7 Decisiones

1. **Persistencia de la referencia — decidido: en memoria.** No sobrevive a un reinicio de Obsidian, para no abrir el calendario días después en una fecha vieja. No se usa `localStorage`.
2. **Vista Día — decidido: modo acoplado.** Usa el componente común siempre visible (ver §4.6.6), no el popover oculto de las demás vistas.
3. **Seleccionar con clic en una celda — implementado.** Un clic simple en una celda de día (Mes/Semana/Semana laboral/Año) selecciona y resalta esa fecha como referencia, re-renderizando con `refreshCalendar()`. Para no interrumpir el `dblclick` de crear tarea en la misma celda, el clic espera el mismo retardo ya usado para distinguir clic/doble clic en las píldoras de tarea (`TASK_CLICK_DELAY_MS`, 250 ms): si llega un `dblclick` antes de que venza el temporizador, se cancela la selección y solo se crea la tarea. Clic sobre una tarea existente (burbuja) no dispara la selección; clic sobre el número del día sigue navegando a la vista Día, sin seleccionar la celda (mismo `stopPropagation()` de antes).

#### 4.6.8 Fuera de alcance

Seleccionar un rango de fechas, escribir una fecha a mano, atajos de teclado globales, atajo por mes en Año, y corregir el inicio de semana de la vista Semana.

#### 4.6.9 Casos límite a verificar

- Diciembre ↔ enero y febrero bisiesto (29 feb); fechas de décadas pasadas y futuras.
- `weekStartDay` en lunes y en domingo, en el selector y en Mes.
- La referencia cae en un día de un mes adyacente en Mes, y en un mes distinto del visible en el selector.
- Cada cambio de tipo de vista entre las cinco, con una fecha distinta de hoy.
- Re-render con el selector abierto (se cierra) y foco devuelto.
- Los seis idiomas, tema claro y oscuro, y paneles estrechos (el popover no debe quedar recortado).
- Apagar `calendarShowDueDates`/`StartDates`/`ScheduledDates` o `calendarShowCompletedTasks` en Settings ▸ Calendario y confirmar que el punto de un día desaparece en el selector y en el mini-calendario de Día, igual que en Mes.

### 4.7 Bloques con duración en la vista por Día (v1.1.9 — implementado)

> **Estado**: implementado (Fases A, B y C: segmentos conectados, carriles por solapamiento y redimensionar arrastrando el borde inferior). Mecanismo: [[Arquitectura técnica]] §10. Fases: [[Plan de implementación]]. Sustituye el enfoque de capa superpuesta (`position: absolute`) planteado inicialmente: en su lugar se reutiliza la misma técnica visual de "píldora conectada" que ya usan las rachas de hábitos (Grid), rotada de carriles horizontales de días a filas verticales de horas.

#### 4.7.1 Granularidad: medias horas

Cada `.oa-calendar-hour-row` (hoy una sola franja de 44px) se divide visualmente en dos mitades iguales, con una línea punteada en el punto medio (minuto :30) como guía. Esta división es puramente visual; `hourSlots` sigue teniendo una entrada por hora, no por media hora.

#### 4.7.2 Tamaño según duración

- **Sin duración** (tarea puntual, solo `scheduledTime`): ocupa la celda completa de su hora, igual que hoy — sin cambios.
- **Duración menor a 60 min**: ocupa media celda — la mitad superior si el minuto de inicio cae en los primeros 30 min de la hora (`:00`–`:29`), la mitad inferior si cae en los últimos 30 (`:30`–`:59`). Conserva la etiqueta de minutos (ej. "15m").
- **Duración de 60 min o más**: ocupa varias celdas de media hora **conectadas visualmente**, con las mismas clases que ya usa Habit Grid para las rachas (`oa-habit-grid-cell--run-start`/`--run-middle`/`--run-end`, manipulando `border-radius` y quitando el borde de unión): el primer segmento redondea sus esquinas superiores, los segmentos intermedios quedan cuadrados por ambos lados, y el último segmento redondea sus esquinas inferiores. No hace falta una capa superpuesta nueva.
- **Redondeo visual del fin**: el final del bloque se redondea hacia arriba al siguiente múltiplo de 30 min para decidir cuántos segmentos dibujar (ej. 14:15 + 50 min, termina 15:05, se dibuja hasta las 15:30). Esto es solo para el dibujo: `scheduledDuration` guardado en la tarea no cambia.

#### 4.7.3 Carriles para tareas solapadas (resuelve ADR-T5, ya no diferido)

Dos o más tareas que se solapan en el tiempo se muestran **una al lado de la otra en carriles**, nunca una tapando a la otra. Se calcula por conglomerado de tareas mutuamente solapadas (algoritmo greedy: ordenar por inicio, asignar el primer carril libre), no para el día completo — así las horas sin solapes no se dividen en columnas innecesarias. El ancho de cada carril es igual al número máximo de carriles simultáneos dentro de ese conglomerado.

#### 4.7.4 Redimensionar arrastrando el borde inferior

Una manija en el borde inferior del último segmento (`--run-end`, o la propia celda si la tarea dura menos de una hora) permite arrastrar para cambiar la duración, en pasos de 30 minutos. Al soltar, se escribe con `upsertScheduledDuration()` (ya existe en `task-line-fields.ts`) + `TaskWriter.updateTaskLine()` — mismo patrón que el resto de la edición en el calendario. Duración mínima al arrastrar: 30 minutos.

#### 4.7.5 Decisiones

1. **Redondeo del fin — decidido: hacia arriba.** Siempre al siguiente medio-hora (nunca hacia abajo), para que el bloque nunca se vea más corto que la duración real.
2. **Alcance de los carriles — decidido: por conglomerado.** El cálculo se hace por conglomerado de solapamiento, no con un número fijo de carriles para todo el día.

#### 4.7.6 Fuera de alcance

Redimensionar arrastrando el borde **superior** (cambiaría la hora de inicio, no la duración) — para mover la tarea completa ya existe el arrastre de toda la píldora (v1.1.4, Fase D). Posicionar una tarea sin duración dentro de la media hora exacta — sigue anclándose a la celda de su hora completa, como hoy.

### 4.8 Selector de tipo de vista: multi-botón segmentado (v1.1.9 — implementado)

> **Estado**: implementado. Cambio puramente visual: no toca `switchToViewType()` ni la lógica de navegación, solo cómo se dispara.

**Hoy**: cada plantilla de vista de calendario (`calendar-month-view.hbs`, `-week-`, `-workweek-`, `-day-`, `-year-view.hbs`) repite un `<select id="oa-calendar-view-dropdown">` con 5 `<option>`; `CalendarView.setupViewSpecificEventListeners()` escucha su evento `change` y llama a `switchToViewType()`.

**Propuesto**: reemplazar el `<select>` por un grupo de **6 botones pegados** (Año, Mes, Semana, Semana laboral, Día, y Lista — esta última se agrega en v1.1.10, pospuesta tras esta discusión), uno por tipo de vista, con un solo clic para cambiar. Se reutiliza el mismo lenguaje visual que ya existe en el Task Modal para la prioridad (`.oa-priority-segmented`/`.oa-priority-pill`, ver `src/styles/components/_modal.scss`): botones planos, sin fondo ni borde hasta hover/activo — pero en una fila continua y compacta (sin separación entre botones, bordes compartidos, esquinas redondeadas solo en los extremos del grupo), ya que son 6 opciones y deben quedar compactas en el encabezado del calendario.

- Cada botón lleva su **ícono** (Obsidian `setIcon()`/Lucide, igual que los iconos de pestaña que ya usa cada vista) más un atributo `title` con el nombre traducido de la vista — se convierte automáticamente en el tooltip temático ya construido (`installTooltips()` ya corre en cada `BaseView.render()`), sin trabajo adicional.
- Clic en un botón llama a la misma `switchToViewType()` que hoy dispara el `change` del `<select>`; la lógica de cambio de vista no cambia.
- El botón de la vista activa se marca visualmente (clase `.oa-active`, igual que la píldora de prioridad seleccionada).

#### 4.8.1 Decisiones

1. **Ícono + tooltip, no solo ícono — confirmado.** El tooltip con el nombre de la vista es obligatorio, no opcional.
2. **Set de íconos — confirmado**: Año `calendar-range`, Mes `calendar-days`, Semana `columns-3`, Semana laboral `briefcase`, Día `calendar-clock`. Lista (`list-todo`) se suma en v1.1.10 junto con la vista de lista del calendario; por ahora el grupo tiene 5 botones, no 6.

### 4.9 Manejo de estatus desde el calendario (v1.1.10 — implementado)

> **Estado**: implementado. Decisiones y símbolos: [[Modelo de datos]] §10 (ADR-S1 a S3). Mecanismo: [[Arquitectura técnica]] §14.

**Identificación visual**: cada píldora de tarea en el calendario (`.oa-calendar-task`, en Mes/Semana/Semana laboral/Día) muestra el ícono de su estado (⭕🛠️⏸️✅❌🗑️), igual que ya se ve en la vista Tabla — hoy solo se distingue completada/no completada (atenuado vía `.oa-calendar-task--done`).

**Cambiar el estado — dos vías**:
1. **Clic derecho (menú contextual)** sobre una píldora: abre un `Menu` nativo de Obsidian (mismo patrón que el menú de campos del editor, ver [[Arquitectura técnica]] §6) con las 6 opciones de estado, localizadas e iconadas. Elegir una reescribe el símbolo de la tarea.
2. **Task Modal**: nuevo campo de estado (ver §7.5), disponible tanto al crear como al editar.

**Efecto al marcar "Hecho"/desmarcar**: igual que el checkbox nativo de Obsidian — agrega la fecha ✅ al marcar `Done`, la quita al cambiar a cualquier otro estado (ADR-S3). No genera ninguna ocurrencia nueva de una tarea recurrente (eso se diseña aparte, ver roadmap de tareas recurrentes).

**Fuera de alcance**: filtrar el calendario por estado (ya existe `calendarShowCompletedTasks` para ocultar completadas); estados personalizados/configurables (ADR-S2).

### 4.10 Vista de lista dentro del calendario (v1.1.10 — implementado)

> **Estado**: implementado. Mecanismo: [[Arquitectura técnica]] §17.

Un 7º botón en el selector segmentado de §4.8, que muestra una fila por día en una ventana continua de días a partir de la fecha de referencia compartida (sin alinear a inicio de semana — confirmado). El tamaño de la ventana es configurable (Settings ▸ Calendario ▸ "Vista de lista: días a mostrar", `calendarListDaysToShow`): mínimo 7, máximo 14, por defecto 14 — revisado de "fijo en 14" a configurable. Cada fila reutiliza exactamente el mismo contenido y clases que ya renderiza una celda de día en Mes/Semana (`.oa-calendar-task`, mismo badge por tipo de fecha, mismo atenuado de completadas), solo que dispuesto como una fila de ancho completo en vez de una casilla de grilla — **sin un mecanismo nuevo de "N more"**: si hay muchas tareas ese día, se ven todas en la fila, igual que hoy pasa en una celda de Mes/Semana (confirmado).

- Imagen de referencia inicial (day-planner): `attachments/vista-lista.png` — se usó solo como inspiración del layout de fila-por-día; el contenido final de cada fila sigue el lenguaje visual existente del calendario (§4.1–§4.4), no el de la imagen.
- Gestos: mismos que el resto del calendario — clic en una tarea edita, doble clic abre la nota, doble clic en espacio vacío de la fila crea una tarea para ese día, clic en la fecha de la fila navega a la vista Día de ese día (igual que clic en el número de día de Mes/Semana).
- Drag and drop: igual que Mes/Semana, arrastrar una tarea a otra fila reprograma su fecha ancla (ADR-T4).
- Navegación ◀▶: desplaza la ventana completa (no día a día).

#### 4.10.1 Fuera de alcance
Un mecanismo de "N more"/colapsar tareas por fila.

#### 4.10.2 Ajustes posteriores a la primera implementación
- Ícono `list-todo` para el botón de la vista, ubicado a la izquierda del botón de Día (no al final del grupo).
- Botón de selector de fecha (popover) agregado también a esta vista y a la vista Día, igual que Mes/Semana/Semana laboral/Año (antes solo Día tenía el modo acoplado del sidebar).
- Filas al doble de alto que una píldora sola, para que quepan 2 píldoras apiladas antes de necesitar más espacio; el contenedor ajusta su altura a la cantidad de días mostrados en vez de estirarse siempre al 100% del panel.
- **Fix de gestos**: un clic en una fila recentraba toda la ventana para que empezara en ese día, en vez de solo resaltarlo — corregido separando el inicio de la ventana mostrada de la fecha seleccionada/resaltada, igual que Mes/Semana/Año (la ventana solo se recentra si la fecha seleccionada queda fuera de ella).
- **Fix (v1.1.11)**: la ventana continua puede cruzar un límite de mes (p. ej. 28 de octubre a 3 de noviembre) sin ninguna indicación de a qué mes pertenece cada fila; se agrega la abreviatura de mes localizada junto a la fecha de cada fila (`.oa-calendar-list-row-month`).

## 5. Timeline View (`timeline-view`) — placeholder

**Icono**: `calendar-check`. Estado: **incompleto**. `onOpen()` sólo carga todas las tareas (`getAllTasks`) y las pasa tal cual a su plantilla (`{ tasks }`), sin ningún cálculo de posicionamiento temporal, agrupación por fecha ni eje visual propio.

## 6. Gantt View (`gantt-view`) — placeholder (rediseño en §12)

Estado: **sin registrar ni visible**. La clase `GanttView` existe, pero su registro en `ViewManager` y su botón en `header.hbs` están comentados, la plantilla `gantt-view.hbs` está vacía y `onOpen()` descarta el resultado de `getAllTasks()`, así que renderizaría una lista vacía. Se reconstruye según §12 (v1.1.13).

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

### 7.5 Campo de estado (v1.1.10 — implementado)

Nuevo campo en el formulario del Task Modal, visible tanto al crear como al editar: segmented control de 6 píldoras (mismo lenguaje visual que la prioridad, §7.2), una por Status Type (Todo/En progreso/En espera/Hecho/Cancelada/No es tarea). Al crear una tarea, "Todo" queda preseleccionado por defecto, pero se puede elegir cualquier otro estado antes de guardar. Al editar, refleja el estado actual de la tarea. Mismo efecto de agregar/quitar fecha ✅ que el cambio desde el calendario (ver §4.9).

### 7.6 Selector de fecha unificado (v1.1.10 — implementado)

> **Estado**: implementado. Mecanismo: [[Arquitectura técnica]] §15.

Los campos de fecha 📅 vencimiento, 🛫 inicio y ⏳ programada usan hoy `flatpickr` (librería externa), con un estilo visual distinto al selector construido en v1.1.9 para las vistas de calendario (`CalendarDatePicker`, §4.6.4). Se reemplaza `flatpickr` por ese mismo componente en los 3 campos, abierto como popover anclado a cada botón disparador existente (mismo patrón que `CalendarView.openDatePickerPopover()`).

- Cada campo (due/start/scheduled) abre su propio popover de forma independiente; solo uno puede estar abierto a la vez (se cierra el anterior al abrir otro, igual que ya ocurre entre vistas de calendario).
- Los días con tareas existentes se marcan con el mismo punto indicador que ya usa el calendario (`hasTasks`), para dar contexto de carga de trabajo al elegir fecha — **confirmado**.
- La hora (🕐) y la duración (⏱️) conservan sus modales dedicados existentes (`TaskTimePickerModal`, modal de duración); no forman parte de este cambio — **confirmado, alcance limitado a los 3 campos de fecha**.
- El input de texto subyacente (`#oa-task-due`/`#oa-task-start`/`#oa-task-scheduled`) y su formato (`YYYY-MM-DD`) no cambian, solo la UI para elegirlo.

#### 7.6.1 Fuera de alcance
El selector de hora/duración y la captura de fecha desde el menú contextual del editor ([[Arquitectura técnica]] §6, inserción de campos) siguen usando `flatpickr`; no se tocan en esta fase. Quitar `flatpickr` como dependencia del proyecto tampoco es parte de esta fase (sigue en uso ahí).

### 7.7 Modal de duración con dial circular (v1.1.10 — implementado)

> **Estado**: implementado. Mecanismo: [[Arquitectura técnica]] §18.

`TaskDurationModal` reemplaza su `<input type="number">` simple por el mismo dial circular que ya usa el Habit Editor para elegir minutos (arrastre, teclado, rueda del mouse), extraído a un componente compartido y reutilizado aquí con una configuración distinta: máximo 420 minutos (7 horas) en vez de 120, y pasos de 5 minutos en vez de 1 — confirmado.

## 8. Tooltips del plugin

Las vistas renderizadas por `BaseView` y el modal de tareas convierten sus atributos `title` en tooltips propios del plugin. Se muestran al pasar el puntero o enfocar con teclado, incluyen una tarjeta temática con flecha y texto explicativo, y no modifican los tooltips del resto de Obsidian. La relación con el control se expone mediante `aria-describedby`; no incluyen acciones ni botones.

## 9. Manual de usuario (v1.1.11 — implementado)

Manual de usuario final (distinto de esta documentación de desarrollo), en `docs/user_guide/`, en dos versiones completas y paralelas — inglés (`en/`) y español (`es/`) — con 10 capítulos idénticos en estructura: Introducción, Instalación, Primeros pasos, Vistas generales, Vistas de calendario, Seguimiento de hábitos, Formato de tareas y metadatos, Gestos e interacciones, Configuración, y Preguntas frecuentes y soporte. Un `docs/user_guide/README.md` enlaza ambas versiones y documenta cómo agregar un nuevo idioma (duplicar una carpeta de idioma y traducir manteniendo los mismos nombres de archivo). No requiere ningún cambio en el plugin: es documentación en Markdown plano, sin paso de build ni empaquetado — "generar" una versión es simplemente leer/exportar los archivos de esa carpeta.

## 10. Modal de novedades al actualizar ("What's New") (v1.1.13 — diseño, no implementado)

> **Estado**: diseño acordado, nada implementado todavía. Mecanismo: [[Arquitectura técnica]] §19.

Tras actualizar el plugin a una versión nueva, en el primer arranque se abre **una sola vez** un modal con las novedades desde la última versión que el usuario tenía instalada — si se saltó varias versiones, se muestran todas acumuladas, de la más reciente a la más antigua (no solo la última). El contenido está **localizado** (sigue el idioma de la interfaz de Obsidian, igual que el resto del plugin) y **no requiere conexión a internet** (ver justificación y comparación con el plugin que inspiró esta función, QuickAdd, en [[Arquitectura técnica]] §19).

- Un nuevo ajuste **"Mostrar novedades al actualizar"** (activado por defecto, en Configuración general) permite desactivar el modal por completo.
- El modal siempre tiene un botón de cierre propio, visible dentro del contenido (no depende únicamente del cierre nativo del modal de Obsidian).
- Si el ajuste está desactivado, el modal simplemente no se abre — pero la versión "vista" se actualiza igual, para que no vuelva a aparecer al reactivar el ajuste más adelante (evita mostrar de golpe el historial acumulado).

### 10.1 Fuera de alcance
Traer el contenido en vivo desde los releases de GitHub; renderizado de Markdown libre (imágenes, video, bloques de código embebidos); una preferencia granular de "solo versiones con funcionalidad nueva" (mayor/menor) vs. todas (puede evaluarse más adelante); cualquier mecanismo de feedback tipo formulario.

## 11. Kanban View (v1.1.13, con las piezas compartidas en v1.1.12 — diseño, no implementado)

> **Estado**: diseño acordado en sesión de discusión, nada implementado todavía. Mecanismo: [[Arquitectura técnica]] §20. Referencia investigada: el plugin [Tasks Kanban](https://community.obsidian.md/plugins/tasks-kanban) (ver comparación en §20.6).

Un tablero donde cada tarjeta es una tarea real del vault (la misma `.oa-calendar-task`-style de las demás vistas, no una copia ni una nota aparte) y cada columna agrupa tareas por un criterio. Mover una tarjeta reescribe la línea de la tarea en su archivo origen.

- **Ubicación**: nueva pestaña de nivel superior, junto a Overview/Lista/Tabla/Calendario/Hábitos, con su propio ajuste de visibilidad (mismo patrón que `showListTab`/`showTableTab`).
- **Columnas**: por defecto, una por cada uno de los 6 estados fijos (`CoreTaskStatus`: Todo, En progreso, En espera, Hecho, Cancelada, No es tarea). Un selector permite agrupar en cambio por **prioridad**, **etiqueta** o **área** (con sus sub-áreas, ver §13).
- **Filtros y orden**: los mismos que ya usan Lista/Tabla (`TaskFilter`/`TaskSorter`), incluyendo orden ascendente/descendente. No hay un lenguaje de query propio.
- **Filtros**: una barra compartida y configurable, usada por Lista, Tabla, Kanban y Gantt, que incluye el filtro por estado (hoy la Tabla tiene sus propios controles, hardcodeados en su plantilla; se reemplazan por esta barra común).
- **Arrastrar entre columnas** (agrupando por estado): cambia el estado de la tarea al de la columna destino, con el mismo efecto que el menú contextual del calendario (§4.9): marcar "Hecho" agrega ✅, salir de "Hecho" lo quita, y completar una tarea recurrente genera su siguiente ocurrencia.
- **Arrastrar entre columnas** (agrupando por prioridad/etiqueta/carpeta): cambia el campo correspondiente de la tarea. El detalle por criterio (¿cómo se "mueve" una tarea a otra etiqueta o carpeta?) queda por resolver en la fase de diseño técnico.
- **Reordenar dentro de una columna**: sí, arrastrando una tarjeta a otra posición de la misma columna. Requiere persistir un orden manual (ver §20.4, decisión pendiente).
- **Gestos de tarjeta**: iguales al resto del plugin — clic edita, doble clic abre la nota, clic derecho abre el menú de estado.
- **Un solo tablero**: sin tableros guardados/nombrados múltiples por ahora.

### 11.1 Estados personalizables (relacionado, fuera de alcance)
Kanban v1 usa solo los 6 estados fijos. Que el usuario defina estados propios (símbolo + nombre + `type`, como los [Custom Statuses de Tasks](https://publish.obsidian.md/tasks/Getting+Started/Statuses/Custom+Statuses)) es un ítem propio, candidato a v1.1.14. A favor de este plugin: sus vistas dibujan sus propios íconos, así que un estado personalizado no necesita que el usuario instale un tema CSS (a diferencia de Tasks). En contra: el enum fijo está repetido en el Task Modal, el menú contextual, el badge del calendario, el filtro de Tabla y las claves i18n, y los nombres personalizados no se pueden traducir.

### 11.2 Fuera de alcance
Tableros múltiples guardados/nombrados; mini-lenguaje de query propio; estados personalizables (§11.1); agrupar por fecha (una columna por fecha distinta dispersa el tablero); unificar las pestañas Lista y Tabla (ver `docs/todo.md`, se evalúa aparte).

## 12. Gantt View (v1.1.13 — diseño, no implementado)

> **Estado**: diseño acordado en sesión de discusión, nada implementado todavía. Mecanismo: [[Arquitectura técnica]] §21. Reemplaza al placeholder de §6. Referencia visual: la vista de semanas y estancias del plugin Timelineal (captura aportada en la discusión, no incluida en el repositorio).

Un diagrama de tareas sobre un eje de tiempo, pensado para proyectos largos: una fila por tarea, con una barra que va de su fecha de inicio a su fecha de fin. Mismos filtros y orden que Tabla y Kanban (barra de filtros compartida, §11), y los mismos gestos de tarea que el calendario.

- **Ubicación**: pestaña de nivel superior, con ajuste de visibilidad `showGanttTab`. El botón ya existe comentado en `header.hbs` (ícono `chart-gantt`).

### 12.1 Qué se dibuja para cada tarea

La barra necesita dos fechas, pero la mayoría de las tareas solo tiene una (el Task Modal solo precarga `scheduled`). Por eso una tarea con una fecha no se oculta:

| Fechas presentes | Resultado |
|---|---|
| `start` y `due` (con o sin `scheduled`) | Barra de `start` a `due`; si hay `scheduled`, una muesca dentro de la barra |
| `start` y `scheduled` | Barra de `start` a `scheduled` |
| `scheduled` y `due` | Barra de `scheduled` a `due` |
| Una sola de las tres | Hito (marcador sin duración) en esa fecha |
| Ninguna | Fuera del diagrama; un contador «N tareas sin fecha» con un toggle para mostrarlas aparte |

Regla general: el **inicio** es 🛫 `start` y, si falta, ⏳ `scheduled`; el **fin** es 📅 `due` y, si falta, ⏳ `scheduled`. La hora y la duración de `scheduled` se ignoran: en una escala de días no se ven. Una barra cuyo inicio y fin caen el mismo día ocupa una columna.

El calendario ancla una tarea a un día con la prioridad `scheduled` > `due` > `start` (ADR-T4). El Gantt dibuja un rango, no un día, y por eso usa esta regla propia; no es una inconsistencia.

### 12.2 Escala y navegación

- **Zoom**: 7, 14 o 21 días, o **mes natural**. No hay zoom por día: un Gantt sirve para proyectos largos.
- **Mes natural**: la ventana tiene los días reales del mes (28, 29, 30 o 31). Las columnas se reparten el ancho disponible, así que el largo del mes no rompe nada. ◀▶ y las pestañas de mes se mueven por mes.
- **7/14/21 días**: ◀▶ mueven la ventana completa.
- **Cabecera** (tomada de la referencia): pestañas de mes con el actual subrayado, año con flechas, franja de números de día con hoy resaltado, bandas de semana con su número y una línea vertical de «hoy».
- Una barra que sale de la ventana se recorta e indica que continúa.
- La ventana parte de la fecha de referencia compartida (v1.1.9) y el zoom se recuerda, igual que el modo 1/3/5 de la vista Día.

### 12.3 Agrupado por área y sub-área

Según §13: el grupo principal es el **área** (nombre de la primera carpeta) y debajo van las **sub-áreas** (el resto de la ruta, anidado por carpeta). Cada grupo es plegable, recuerda su estado y muestra en su cabecera una barra resumen, del inicio más temprano al fin más tardío de sus tareas. Las tareas de archivos sin carpeta van a un grupo propio.

### 12.4 Editar fechas desde la vista

- **Mover la barra**: arrastrarla desplaza el mismo número de días las fechas 🛫, ⏳ y 📅 que tenga la tarea. No se tocan ➕ creada ni ✅ hecha.
- **Redimensionar**: arrastrar el borde izquierdo o derecho reescribe el campo que define ese borde. Una tooltip indica cuál (por ejemplo «📅 vencimiento»), para que no se edite `scheduled` sin que el usuario lo sepa.
- **Hito**: arrastrarlo mueve su única fecha.
- No se permite dejar el fin antes del inicio.
- Todo en pasos de un día.

### 12.5 Gestos

Iguales a los del calendario, mediante el helper compartido ([[Arquitectura técnica]] §20.3.1): clic edita, doble clic abre la nota, clic derecho abre el menú de estado. Las manijas de redimensionar detienen la propagación del clic para no abrir el modal al soltar.

### 12.6 Dependencias

Una insignia 🔗 en la barra de las tareas con `🆔`/`⛔`, con una tooltip «depende de: …». Las flechas entre barras y el aviso de dependencias rotas quedan fuera de esta versión.

### 12.7 Decisiones abiertas

1. Alineación de las ventanas de 7/14/21 días: propuesta de que empiecen en el inicio de semana configurado (`weekStartDay`) que contiene la fecha de referencia, para que coincidan con las bandas de semana. Sin confirmar.
2. Convertir un hito en barra arrastrando. Mientras tanto, la segunda fecha se agrega desde el modal de edición (clic).
3. Fin anterior al inicio en datos ya escritos a mano: propuesta de tratarlo como hito en `start` con un aviso.

### 12.8 Fuera de alcance
Flechas de dependencia y su aviso de rotura; desplazar en cascada las tareas dependientes; zoom por día; tareas de varios archivos o proyectos como entidad propia (el agrupado se resuelve con áreas y sub-áreas, §13).

## 13. Áreas y sub-áreas de tareas (v1.1.12 — diseño, no implementado)

> **Estado**: diseño acordado en sesión de discusión, nada implementado todavía. Mecanismo: [[Arquitectura técnica]] §22. Resuelve la idea de «Grupos de tareas» de `docs/todo.md`.

Las tareas y los hábitos comparten el concepto de **área** y **sub-área** para agrupar y filtrar, con una diferencia de origen:

- **Hábitos**: configurable. El área y la sub-área se eligen en el Habit Editor y se guardan en el frontmatter, porque un hábito vive en `daily plan` pero apunta a otra área.
- **Tareas**: no configurable. La ubicación física de la nota es su área; no hay frontmatter ni campo nuevo en la línea. Mover una nota de carpeta cambia el área de sus tareas.

### 13.1 Regla para tareas

Partiendo de la ruta del archivo:

| Ruta | Área | Sub-área |
|---|---|---|
| `nota.md` (raíz del vault) | «Sin área» | — |
| `A/nota.md` | `A` | — |
| `A/B/nota.md` | `A` | `B` |
| `A/B/C/nota.md` | `A` | `B/C` |
| `A/B/C/D/nota.md` | `A` | `B/C/D` |

El **área** es solo el nombre de la primera carpeta; la **sub-área** es la ruta de carpetas sin la primera, completa y sin tope de niveles. A diferencia del combobox de sub-área de Hábitos (2.º y 3.er nivel), aquí no se recorta nada. Ambos valores se usan tal cual en los filtros y en el agrupado. La comparación usa el nombre normalizado (`daily plan` y `daily-plan` son la misma área) y se muestra el nombre original o su etiqueta localizada.

### 13.2 Filtros

La barra de filtros compartida (§11, §20.3) incluye:

- **Área**: un combobox con «Todas» más el nombre de la primera carpeta de cada área que tiene tareas.
- **Sub-área**: un segundo combobox, con la ruta sin la primera carpeta. Aparece solo cuando se elige un área y ofrece las sub-áreas de esa área: cada ruta presente y también sus carpetas contenedoras (con tareas en `B/C/D` se ofrecen `B`, `B/C` y `B/C/D`). Se reinicia al cambiar de área y se oculta si el área no tiene sub-áreas. Elegir `B` incluye las tareas de `B` y de `B/*`; elegir `B/C` solo las de `B/C` y `B/C/*`.
- Reemplaza al filtro de «carpeta» de la Tabla, que hoy es un filtro plano por carpeta de primer nivel. El valor que la Tabla tenía guardado se convierte al área equivalente, o se reinicia si no coincide.
- Se usa en Lista, Tabla, Kanban y Gantt, y se recuerda por vista.

### 13.3 Agrupado y color

- **Área** y **sub-área** son dos campos de agrupado, los mismos valores de los combos. Lista, Kanban y Gantt agrupan por área y, dentro de cada una, por sub-área anidada según las carpetas de la ruta. Agrupar solo por sub-área sin un área elegida distingue los grupos por área y sub-área (etiqueta «Área · sub-área»), para no mezclar dos carpetas que se llamen igual en áreas distintas. Lista conserva su modo plano y su profundidad actual, con el área como grupo principal.
- La cabecera de cada grupo usa el color del área, igual que en Hábitos.

### 13.4 Decisiones abiertas
1. Qué muestra la Tabla en lugar de la columna de carpeta: propuesta de dos columnas, Área (chip con el color del área) y Sub-área, con los mismos valores que los combos. Sin confirmar.

### 13.5 Fuera de alcance
Área configurable por tarea o por nota (frontmatter, etiqueta o campo en la línea); mover tareas entre áreas arrastrando (implicaría mover la tarea de archivo); áreas sin carpeta.

## 14. Lista y Tabla en una sola pestaña (v1.1.12 — diseño, no implementado)

> **Estado**: diseño acordado en sesión de discusión, nada implementado todavía. Mecanismo: [[Arquitectura técnica]] §23. Depende de la barra de filtros compartida (§11, §20.3) y de las áreas (§13).

**Situación actual**: Lista y Tabla son dos pestañas con sus propios controles. La Tabla tiene búsqueda, cuatro filtros, orden por encabezado y un estado propio guardado. La Lista solo tiene el botón que alterna entre vista jerárquica y plana: no tiene búsqueda, filtros ni orden.

**Diseño**: una sola pestaña, **Tareas**, con un control segmentado de modo, **Lista | Tabla**, igual que el selector de vistas del calendario: botones pegados con ícono y tooltip, con el modo activo resaltado. Cambiar de modo conserva la búsqueda, los filtros, el agrupado y el orden.

- **Barra común** a ambos modos: búsqueda, filtros (estado, prioridad, Área, Sub-área, vencimiento), agrupado y orden (campo y ascendente/descendente). Lista gana así lo que no tenía.
- **Agrupado**: un combo. El botón jerárquico/plano de la Lista pasa a ser valores de este combo: Área y sub-área (anidado, por defecto), Carpeta (plano, ruta completa) y Sin agrupar. La Tabla puede agrupar por primera vez: muestra una fila de cabecera plegable por grupo.
- **Orden**: un solo orden compartido. Clic en un encabezado de la Tabla actualiza ese orden; en Lista se aplica dentro de cada grupo.
- **Pestaña y ajustes**: `showListTab` y `showTableTab` se conservan como visibilidad de cada modo. La pestaña se muestra si alguno está activo y abre el último modo usado, igual que la pestaña de Hábitos.
- **Gestos**: los mismos en los dos modos, mediante el helper compartido (§20.3.1).
- **Propio de cada modo**: redimensionar columnas (Tabla) y plegar grupos con el estado recordado.
- **Kanban y Gantt** siguen en sus propias pestañas (§11, §12); no son modos de este conmutador.

### 14.1 Decisión de implementación

Se mantienen registrados los dos tipos de vista (`list-view` y `table-view`) y el conmutador cambia de uno a otro, como `switchToViewType()` en el calendario. Así no cambia el tipo de vista que Obsidian guarda en los espacios de trabajo. El costo es que cambiar de modo recrea la vista, con su pantalla de carga. Fusionarlas en una clase con el modo por dentro queda como mejora posterior si el cambio se siente lento.

### 14.2 Fuera de alcance
Una clase única `TasksView`; Kanban y Gantt como modos del conmutador; acciones masivas.

### 14.3 Funciones de la Tabla ya anunciadas y ajuste de columnas (por diseñar)

El ajuste de las columnas al ancho disponible, decidido durante la 1.1.11, se implementa en v1.1.12: la referencia es el ancho real del contenedor (la ventana en escritorio y el ancho del dispositivo en tableta y teléfono), y las columnas flexibles se reducen en proporción sin bajar de su mínimo.

El README y el manual de usuario anuncian para la Tabla **columnas y diseño personalizables** y **exportación a CSV**, que no existen en el código. Se decidió agregarlos en v1.1.12 como parte de las actualizaciones de Lista y Tabla. Sin diseño todavía; a decidir: qué columnas se pueden mostrar, ocultar y reordenar, dónde se guarda esa elección (hoy el estado de la Tabla va en `TABLE_VIEW_STATE_KEY`, §3), qué filas y columnas exporta el CSV (todas o solo las visibles tras filtrar), el separador y la codificación, y dónde se guarda o descarga el archivo.

## 15. Sincronía con Google Calendar (v1.1.15 — diseño, no implementado)

> **Estado**: diseño acordado en sesión de discusión, nada implementado todavía. Mecanismo: [[Arquitectura técnica]] §24. Referencias estudiadas: Full Calendar (remastered), `pubcyberry/obsidian-google-cal-sync` y `mcuste/obsidian-gcal-sync`.

Sincronía **bidireccional desde la primera versión** entre Google Calendar y las tareas del plugin. Google Tasks, Microsoft y el plugin Tasks quedan para después, sobre la misma arquitectura. Es la primera vez que el plugin usa la red.

### 15.1 Conexión

- Un grupo **Integraciones** en los ajustes, con la sincronía **apagada por defecto**.
- **Credenciales propias de cada usuario**: un Client ID (y el Client Secret, si Google lo exige para ese tipo de cliente) de un proyecto de Google Cloud, con un cliente tipo «Desktop app». Se incluye una lista de pasos en los ajustes: crear el proyecto, activar la API de Calendar, configurar la pantalla de consentimiento, **publicar la app** (un proyecto externo en estado «Testing» recibe tokens que caducan a los 7 días) y crear el cliente. Un botón directo «Conectar con Google» sin credenciales propias exigiría verificar la app ante Google y queda para más adelante.
- Botones **Conectar** y **Desconectar** (revoca el token en Google). El estado siempre es visible: Sin sesión, Bloqueado (falta la frase de sincronización), Conectado, Token caducado, o Iniciar sesión en el escritorio.
- **Inicio de sesión solo en escritorio.** El móvil reutiliza esa sesión: el token viaja cifrado con la sincronización de la bóveda y en cada dispositivo se escribe una vez una **frase de sincronización** elegida por el usuario. Un flujo de copiar y pegar para iniciar sesión desde el móvil queda para después.
- Requiere **Obsidian 1.11.4 o superior** (`secretStorage`); `minAppVersion` pasa de 1.8.7 a 1.11.4 al implementarse.
- **Una sola cuenta de Google** en esta versión. El campo `agenda-account` del frontmatter (§15.4) es opcional y queda reservado para soportar varias cuentas más adelante sin cambiar el formato.

### 15.2 Calendarios

Una cuenta de Google puede tener varios calendarios: el principal (su id es el correo), los propios, los compartidos y los suscritos. Los ajustes muestran la lista de calendarios de la cuenta solo como **catálogo**, con un botón **Añadir calendario** que crea la nota espejo de ese calendario (§15.4). Una nota espejo existe = ese calendario se sincroniza; no hay interruptor de visibilidad. Se puede **leer** cualquier calendario. La **escritura** va por defecto solo a un **calendario dedicado** que crea el plugin (por ejemplo «Obsidian Agenda»); «Añadir calendario» también ofrece crearlo. El permiso de edición de cada calendario es `agenda-allow-edit` en el frontmatter de su nota y empieza en `false`, salvo en el calendario dedicado del plugin, cuya nota se crea con `true`.

### 15.3 Correspondencia evento ↔ tarea

| Evento de Google | Línea de tarea |
|---|---|
| Título | Descripción de la tarea |
| Inicio y fin con hora | `⏳` fecha, `🕐` hora y `⏱️` duración |
| Un día completo | `⏳` sin hora |
| Varios días completos | Rango `🛫` → `📅`; el fin de Google es exclusivo (un evento del 10 al 12 llega con fin el 13), así que se resta un día al importar y se suma al enviar |
| Id del evento | `🆔`: el id tal cual para los eventos nacidos en Google; para las tareas locales, el id del evento se deriva del `🆔` (§17.3) |
| Descripción, lugar, invitados, recordatorios, enlace de Meet, color | No se guardan en la línea; se conservan en Google porque solo se parchean los campos propios |

### 15.4 Qué va a Google

Solo las líneas de las **notas de sincronización**, que declaran en su frontmatter de dónde vienen sus tareas. Todas las claves llevan el prefijo `agenda-` porque el frontmatter es un espacio compartido por todo el vault y claves como `calendar` u `origin` podrían chocar con otros usos. Hay dos tipos de nota.

**Nota espejo** (origen `google-calendar`): una por calendario, la crea «Añadir calendario» en `temporal/agenda/` (carpeta configurable; área `temporal` y sub-área `agenda`, §13). Ejemplo, `temporal/agenda/Personal.md`:

```yaml
---
agenda-origin: google-calendar
agenda-calendar: abc123@group.calendar.google.com
agenda-allow-edit: false
---
```

Allí aterrizan los eventos nuevos del calendario, y se sincronizan todas sus líneas con fecha.

**Nota local** (origen `agenda-task`): cualquier nota del vault donde nacen tareas del plugin y que quiere reflejarlas en Google. Ejemplo, `proyectos/viaje.md`:

```yaml
---
agenda-origin: agenda-task
agenda-sync: google-calendar
agenda-calendar: abc123@group.calendar.google.com
---
```

Solo se sincronizan las líneas vinculadas (aquellas cuyo `🆔` coincide con un evento del plugin en ese calendario, §17.6) y no se importan eventos a ella. La línea nunca se mueve: conserva su origen, su jerarquía de subtareas y sus enlaces.

Claves:
- `agenda-origin`: dónde nacen las tareas de la nota, `google-calendar` o `agenda-task`.
- `agenda-sync`: el sistema con el que se sincroniza; solo hace falta en las notas locales (en una espejo vale lo mismo que el origen). El valor lo reservan las sincronías futuras (Google Tasks, Microsoft).
- `agenda-calendar`: el id del calendario de Google.
- `agenda-account`: opcional; hoy hay una sola cuenta.
- `agenda-allow-edit`: si el plugin puede escribir en ese calendario (`false` por defecto).

Una nota = un calendario. Si en una misma nota se quieren tareas para calendarios distintos, hace falta otra nota.

No van al frontmatter los tokens ni la frase de cifrado (siguen en `data.json` cifrado y en `secretStorage`), ni el `syncToken` de Google, que es estado por dispositivo y generaría conflictos al sincronizar la nota entre dispositivos.

Hay como máximo una nota espejo por calendario (si hay dos, se avisa y solo se sincroniza la primera) y puede haber varias notas locales que envíen al mismo calendario. Si el frontmatter es inválido o falta `agenda-calendar`, la nota se salta con un aviso y no se borra nada.

**Enviar una tarea.** «Enviar a Google Calendar» (menú contextual y Task Modal) escribe el `🆔` en la línea (si no lo tenía, lo genera) sin moverla y crea el evento en el calendario de la nota, con el id derivado del `🆔` (§17.3). Si la nota aún no declara origen y calendario, la acción pregunta el calendario (por defecto el dedicado del plugin) y los guarda en su frontmatter. Un evento de Google no es una tarea de Google (no tiene estado): la tarea sigue siendo la línea de Obsidian y el evento es su reflejo, de modo que en las vistas aparece una sola vez. Las tareas de Google Tasks, que sí tienen estado, son otra sincronía (ítem aparte).

**Sin duplicados.** El `🆔` es el vínculo entre la línea y el evento. Al importar, antes de crear una línea se busca el id (con su calendario) en todo el vault: si ya existe en una nota local, no se crea otra en la espejo. Si el mismo `🆔` aparece en dos líneas (por ejemplo al copiar una línea), se avisa y solo se sincroniza la primera. El `🆔` nace en la nota: se escribe primero y el evento se crea con un id derivado de él (§17.3), así dos dispositivos que lo intenten a la vez no duplican el evento. No se exportan todas las tareas con fecha.

### 15.5 Reglas de sincronía

- **Campos que se sincronizan**: título, inicio y fin. Todo lo demás del evento se conserva.
- **Conflictos**: sin fusión; si cambió el mismo campo en ambos lados desde la última sincronización gana el cambio más reciente, y se avisa.
- **Recurrentes**: las instancias se importan como líneas individuales dentro de la ventana de descarga; la serie se edita solo en Google. No se convierte `🔁` ↔ RRULE.
- **Estado**: los eventos no tienen «hecho», así que `[x]` no se sincroniza.
- **Cancelados y rechazados**: un evento cancelado o borrado en Google se queda en la nota con el estado `[-]` Cancelada, y uno que el usuario rechazó con el estado `[~]` No es tarea; en ningún caso desaparece la línea.
- **Borrados desde la nota**: si se borra la línea, solo se borra el evento si lo creó el plugin; los demás se desvinculan.
- **Barreras de seguridad**: 5 o más borrados, o 25 o más cambios, esperan la aprobación del usuario en un diálogo con los conteos (una sincronización en segundo plano no cambia nada y avisa). Más de 200 cambios se rechazan. Una nota con una línea inválida se omite sin borrar nada. Nunca se notifica a los invitados.

### 15.6 Cuándo se sincroniza

Al arrancar, cada 5 minutos, poco después de cambiar una línea gestionada y con el comando «Sincronizar ahora». Una sincronización a la vez, y las automáticas esperan al menos 30 segundos entre sí.

### 15.7 Red y privacidad

El plugin contacta solo con Google (`accounts.google.com`, `oauth2.googleapis.com` y `www.googleapis.com/calendar/v3`), sin telemetría ni servidor propio. A Google solo viajan el título, el inicio, el fin, la zona horaria y el id. El README debe declarar este uso de red.

### 15.8 Decisiones abiertas
1. Ninguna. Decidido: una línea está enviada si existe un evento del plugin cuyo id deriva de su `🆔`, mediante la acción explícita «Enviar a Google Calendar» (§17.6).

Decidido: notas de sincronización con frontmatter prefijado `agenda-`, de dos tipos según el origen (espejo `google-calendar` y local `agenda-task`); la línea nunca se mueve; una nota = un calendario; las espejo en `temporal/agenda/` por defecto; una sola cuenta por ahora; fin exclusivo de los eventos de varios días (restar un día al importar, sumarlo al enviar); cancelados como `[-]` y rechazados como `[~]`.

### 15.9 Fuera de alcance
Google Tasks, Microsoft y el plugin Tasks; varias cuentas de Google; conversión `🔁` ↔ RRULE y edición de series; invitados, recordatorios y enlaces de reunión; el botón «Conectar con Google» sin credenciales propias (requiere verificación); inicio de sesión por copiar y pegar en móvil; sincronizar el estado hecho.

---

## 16. Tareas de TaskNotes (backlog, sin versión — diseño preliminar, no implementado)

> **Estado**: movido al backlog tras la discusión. Se conserva todo lo decidido por si se retoma (§16.8). Basado en el README y la documentación de TaskNotes 4.13.8 (tasknotes.dev), sin revisar aún su especificación formal. TaskNotes es un plugin distinto del plugin Tasks. No hay arquitectura ni plan escritos.

Idea: quien ya usa TaskNotes podría **ver sus tareas en las vistas de este plugin**, para poder usarlo más. La dirección es migrar hacia este plugin, no al revés. Si se retoma, empieza **solo en lectura** (§16.8); la edición se descartó por ahora.

### 16.1 Qué es TaskNotes

Cada tarea es una nota Markdown con frontmatter (`title`, `status`, `priority`, `due`, `scheduled` con fecha o fecha y hora, `contexts`, `projects`, `timeEstimate` en minutos, `recurrence` en RRULE con `complete_instances`). Los nombres de las propiedades, los estados y las prioridades son configurables. Sus vistas son consultas de Obsidian Bases. La nota es la tarea: no hay dos copias que vincular, a diferencia de Google Calendar (§15).

### 16.2 Alcance

- **Solo lectura** en la primera versión; **no** se crean notas de TaskNotes desde este plugin. Las tareas nuevas se siguen creando como líneas.
- Una tarea de TaskNotes aparece **una sola vez** en las vistas (calendario, Lista/Tabla, Kanban, Gantt); su identidad es la ruta del archivo, sin número de línea ni `🆔`.
- Como no se escribe, no se edita desde las vistas: el clic abre el archivo en lugar del modal de edición, no hay arrastre ni menú de estado, y se muestra una marca visual para que se entienda por qué. Desde la píldora siempre se puede abrir la nota con doble clic.

### 16.3 Cómo se reconocen

Igual que TaskNotes: por **etiqueta** (por ejemplo `task`) o por **propiedad** (por ejemplo `isTask: true`), no por carpeta, con carpetas excluidas. Las notas pueden estar en cualquier parte del vault: la carpeta por defecto de TaskNotes (`TaskNotes/Tasks/`) admite variables como `{{currentNotePath}}` y fechas, y las tareas archivadas se mueven a otra carpeta.

### 16.4 Área y sub-área

Se aplica la regla de §13 sin excepción: la ubicación física de la nota. Si las notas están concentradas (por defecto `TaskNotes/Tasks/`), el área es `TaskNotes` y la sub-área `Tasks`; si están repartidas, el área es su primera carpeta y la sub-área el resto de la ruta. `projects` y `contexts` quedan como campos de agrupado y filtro (§11, §14), no como áreas.

### 16.5 Mapeo de campos (preliminar)

| TaskNotes | Tarea de este plugin |
|---|---|
| `title` | Descripción |
| `status` | Estado (depende de los estados personalizados, v1.1.14) |
| `priority` | Prioridad |
| `due` | `📅` vencimiento |
| `scheduled` | `⏳` programada, con hora si trae hora |
| `timeEstimate` | `⏱️` duración en minutos |
| `tags`, `projects`, `contexts` | Etiquetas y campos de agrupado |
| `recurrence` + `complete_instances` | Próxima ocurrencia con la insignia `🔁` (§16.5.1) |

Los nombres de las propiedades se configuran en los ajustes, con los de TaskNotes como valores por defecto. No se ha confirmado un equivalente de `🛫` inicio.

### 16.5.1 Recurrencia

TaskNotes guarda **una sola nota por serie**: `recurrence` es una regla RRULE con `DTSTART` (por ejemplo `DTSTART:20250804T090000Z;FREQ=DAILY`), `scheduled` es la próxima ocurrencia pendiente (se puede reprogramar incluso fuera del patrón) y el historial va en `complete_instances` y `skipped_instances`. Completar no crea nada: añade la fecha a `complete_instances` y avanza `scheduled`; este plugin, en cambio, inserta una línea nueva. Existen además notas por ocurrencia (tareas normales con `recurrence_parent` y `occurrence_date`), que TaskNotes usa en lugar de la ocurrencia virtual de la serie para esa fecha.

- **Lectura**: la tarea se muestra en su próxima ocurrencia (`scheduled`) como una tarea normal, con la insignia `🔁` y la regla en el tooltip. **No se proyectan** las ocurrencias futuras, igual que con las tareas de línea (este plugin solo calcula la siguiente, con `rrule`).
- **Notas de ocurrencia**: se leen como tareas normales. Si existe una para la fecha de la próxima ocurrencia de la serie, la entrada de la serie se oculta para no verla duplicada.
- **Regla**: se reutiliza `buildRRuleWithDtStart`; hay que aceptar el formato `DTSTART:...;FREQ=...` de TaskNotes, tratar las fechas como UTC sin desfases de día, usar `scheduled` como ancla si la regla no trae `DTSTART` y, con el formato de objeto antiguo, mostrar solo la próxima ocurrencia sin regla.
- **Edición**: ninguna en la primera versión (solo lectura), tampoco mover la próxima ocurrencia ni cambiar la regla.
- **Completar la serie**: queda fuera con la edición. Si algún día se retoma, añade la fecha a `complete_instances` y avanza `scheduled` a la siguiente ocurrencia no completada, en el mismo archivo y sin crear líneas ni notas, y solo si el cálculo se **valida contra las pruebas de conformidad** del repositorio de TaskNotes (directorio `conformance`), porque un cálculo distinto haría que los dos plugins escriban resultados diferentes.
- **Fuera de la primera versión**: todo lo que escribe (completar, mover, omitir ocurrencias con `skipped_instances`, editar la regla, mantener el desplazamiento del vencimiento al avanzar) y completar una nota de ocurrencia (exige actualizar la serie y la nota a la vez, y TaskNotes podría no generar la siguiente nota que su política «crear la siguiente al completar» produce).

### 16.6 Decisiones abiertas
1. **Recurrentes**: lectura decidida en §16.5.1. Si se retoma la escritura, queda comprobar que la validación contra `conformance` es viable y decidir el desplazamiento del vencimiento.
2. **Estados**: cómo se mapean los estados personalizados de TaskNotes a los de este plugin; depende de los estados personalizados (v1.1.14, antes).
3. **Nombres de propiedades**: si se leen de la configuración de TaskNotes o solo de la propia.
4. **Dependencias y jerarquía**: la relación con `⛔` y con las subtareas.
5. **Modelo interno**: en solo lectura basta con un extractor de notas y protecciones en los gestos (§16.8); la escritura exigiría una clave de tarea común y operaciones semánticas de escritura.
6. **Distinción visual** entre una tarea de línea y una de nota.
7. Revisar la especificación formal de TaskNotes antes de cerrar el mapeo.

### 16.7 Fuera de la primera versión

Crear notas de TaskNotes; toda edición (§16.5.1); **migrar** de TaskNotes a este plugin (nota → línea, por ejemplo con un comando «Migrar tareas de TaskNotes»), previsto para una versión posterior; la API HTTP de TaskNotes; sus tiempos de seguimiento y su temporizador Pomodoro; sus sincronías de calendario.

### 16.8 Modelo interno y decisión de backlog

**Modelo actual.** Una tarea (`ITask`) agrupa `file`, `line` (con `number` y `text`), `state`, `date`, `section` y `flow`; su identidad es archivo más número de línea (`id = ruta-línea`). `TaskExtractor` lee los `listItems` de `metadataCache` y la caché es por archivo; `TaskWriter` reescribe una línea con `updateTaskLine(ruta, número de línea, transform)` y `vault.modify`; las vistas localizan una tarea con `data-file-path` y `data-line-number` (unas 40 apariciones en 9 plantillas y 6 búsquedas en las vistas); el modal de edición construye la línea completa y la sustituye.

**Lo que no encaja con una nota-tarea**: la identidad (solo el archivo), la lectura (frontmatter en lugar de `listItems`), la escritura (propiedades en lugar de reescribir una línea), los campos (`due`, `scheduled`, `status` en lugar de emojis) y el abrir (el archivo, sin línea).

**Si se escribiera** habría que cambiar bastante: una clave de tarea común (`source` y `key`) con `data-task-key` en las plantillas; **escritura semántica** (la vista dice «pon la fecha programada de esta tarea en X» con algo como `taskService.update(task, { scheduled })` y cada origen decide cómo escribirlo, con `upsertScheduledDate` en una línea o con la propiedad `scheduled` del frontmatter en una nota), que toca unos 10 sitios (arrastrar, redimensionar, estado, menú contextual, modal); un escritor de frontmatter con `processFrontMatter` en una sola llamada por edición (ya hubo un bug de YAML duplicado en hábitos al combinarlo con `vault.process`); y que el modal produzca un conjunto de cambios en lugar de una línea. Esos cambios tocan el mismo código que la Fase A de v1.1.12.

**Si solo se lee** el coste baja mucho: un extractor que reconozca las notas por etiqueta o propiedad (leyendo el frontmatter del contenido, como en hábitos, para no depender de la actualización asíncrona de `metadataCache`), protecciones en los gestos centralizadas en la Fase A y una marca visual. El `line.number` puede quedar en 0 porque nunca se escribe con él.

**Pregunta pendiente si se retoma**: una nota de TaskNotes puede tener checkboxes en su cuerpo, que hoy se leerían como tareas de línea independientes; decidir si se dejan o se excluyen.

**Decisión**: se descarta la edición por ahora y el resto pasa al backlog sin versión. Motivos: la lógica es muy distinta a la de este plugin; TaskNotes publica versiones casi semanalmente (más de 150 hasta ahora), así que el mapeo habría que mantenerlo; en solo lectura el valor es limitado (no se podría completar, mover ni editar nada) y compite con funcionalidades propias. Se reevalúa cuando estén listos el Kanban y el Gantt, para ver si hay demanda y si entonces hay más que ofrecer a quien venga de TaskNotes.

---

## 17. Compatibilidad con el plugin Tasks (v1.1.14 — diseño preliminar, no implementado)

> **Estado**: decisiones de la discusión; falta cerrar el filtro global (§17.4). Basado en la documentación del plugin Tasks (publish.obsidian.md/tasks) y en el código de este plugin. Arquitectura y plan por escribir al cerrar el diseño.

No hay sincronía que construir: el plugin Tasks y este escriben en el mismo archivo con el mismo formato de línea. El trabajo es de **compatibilidad de comportamiento**, para que quien use los dos obtenga los mismos resultados.

### 17.1 Lo que ya coincide

Los emojis de fechas, prioridades, `🔁`, `🆔`, `⛔` y `🏁`; el formato Dataview; la nueva ocurrencia una línea arriba (valor por defecto de Tasks); la eliminación de `🆔` y `⛔` en la nueva ocurrencia (ADR-R4, igual que Tasks, que lo hace para no duplicar ids y bloquear para siempre a las tareas dependientes); y `when done`.

### 17.2 Decisiones

| Punto | Decisión |
|---|---|
| Alcance | El ítem pasa a llamarse **compatibilidad con el plugin Tasks**; no es una sincronía. |
| Fecha de referencia de la recurrencia | **Se mantiene la nuestra** (`scheduled > due > start`, ADR-R2). Tasks usa `due > scheduled > start`; con reglas como `every month on the last` y fechas distintas, completar la misma tarea en uno u otro plugin puede dar fechas distintas. Se advierte en el manual de usuario. |
| `🕐` y `⏱️` al final de la línea | **Verificado** el 2026-10-09 en un vault con Tasks instalado: con `⏳ 2026-10-19 🕐 09:00 ⏱️ 30m` al final, Tasks sigue reconociendo `📅` y `⏳`. No hay cambio. |
| `🆔` y Google Calendar | El `🆔` sigue siendo el vínculo, con el id del evento derivado de él (§17.3); una línea está **enviada** si existe un evento del plugin cuyo id deriva de su `🆔` (§17.6). |
| Id interno de la tarea y escritura segura | **Se hacen en v1.1.12** con la Fase A: `Task.id` pasa a ser siempre la posición (`ruta#línea`), el `🆔` va en su propio campo (`flow.id`) y los escritores comprueban el texto de la línea antes de escribir (Arquitectura §20.3.2). |
| Filtro global de Tasks | **Descartado**: no se incluye (§17.4). |
| `🏁 delete` y `🏁 keep` | **Se implementan**, con una advertencia en el modal al elegir `delete` (§17.5). |
| Estados personalizados | Ítem propio de v1.1.14, con el modelo de Tasks (símbolo, nombre, siguiente símbolo y tipo): se **configuran** en los ajustes y se pueden **importar** una vez desde los ajustes de Tasks con un botón; la importación no se mantiene sincronizada y, si no reconoce el formato, avisa sin romper nada. |
| `🆔` al crear una tarea | El modal **no** asigna `🆔`: se genera cuando hace falta (enviar a Google, elegir una dependencia), como Tasks. El campo `🆔` del modal tiene un botón **Generar** (§17.5). |
| Ajustes menores de Tasks (insertar la nueva ocurrencia debajo, quitar la fecha programada al repetir, añadir `➕`) | Fuera de alcance. |

### 17.3 El `🆔` y los ids de evento de Google

Un `id` de Tasks admite letras mayúsculas y minúsculas, dígitos, `_` y `-`; un id de evento de Google solo admite `a–v` y `0–9`, de 5 a 1024 caracteres. Los ids que genera Tasks son de base 36 (por ejemplo `4ijuhy`, `hftw84745`, `0h17ye`), así que muchos no caben como id de evento.

Regla: para una tarea que nace en Obsidian, el id del evento es un **prefijo fijo** (de al menos 3 caracteres, para cumplir el mínimo de 5) seguido del **hexadecimal** del texto del `🆔` en UTF-8. El hexadecimal conserva las mayúsculas, solo usa `0–9` y `a–f`, y se decodifica de vuelta. Los eventos creados por el plugin se reconocen por el prefijo y por la propiedad privada que ya los marca (§15.5). Los eventos nacidos en Google conservan su id tal cual como `🆔`, que ya es válido para Tasks. Una tarea local sin `🆔` recibe uno nuevo en el formato que usa Tasks (base 36, 6 caracteres). Así el `🆔` y los `⛔` que apuntan a él no cambian nunca y siguen siendo válidos para Tasks.

### 17.4 Filtro global de Tasks (descartado)

El filtro global es un texto, normalmente una etiqueta como `#task`, con el que Tasks solo trata como tarea los checkboxes que lo contienen. Se valoró darle soporte (añadirlo al crear una tarea y, opcionalmente, mostrar solo los checkboxes que lo contienen), pero **se decidió no incluirlo**. Efecto conocido: quien lo use en Tasks verá en las vistas de este plugin todos los checkboxes, y las tareas creadas en nuestro modal no llevarán la etiqueta.

### 17.5 `🏁 delete`, `🏁 keep` y el botón Generar del `🆔`

**`🏁`**: se implementa. Hoy se lee y se escribe, pero nada lo ejecuta al completar. Al completar una tarea (menú de estado del calendario y modal), con `🏁 delete` se borra la línea de la tarea completada (solo esa línea; las subtareas indentadas quedan en el archivo); con `keep` o sin campo no cambia nada. En una recurrente se inserta primero la nueva ocurrencia y después se borra la original, ajustando el número de línea que cambia al insertar. Requiere un método para borrar líneas en `TaskWriter` y pruebas de Node del cálculo de líneas, porque la operación es destructiva y no se puede probar con Tasks.

**Advertencia en el modal**: al elegir `delete` en el campo de finalización, tanto al crear como al editar una tarea, el modal muestra que la línea se borrará del archivo cuando la tarea se complete.

**Botón Generar**: el campo `🆔` del modal tiene un botón que genera uno válido, por si el usuario quiere tenerlo desde el inicio. Usa el formato de Tasks (base 36, 6 caracteres) y comprueba que no exista ya en el vault. El modal no asigna `🆔` por defecto: ensuciaría todas las líneas, las recurrentes lo pierden en la nueva ocurrencia y las tareas escritas a mano o por Tasks seguirían sin él.

### 17.6 Regla de «enviada» y mecanismo de envío a Google

El `🆔` también lo asigna el plugin Tasks (para dependencias) y lo genera el botón Generar del modal, así que **tener `🆔` no significa estar enviada**. Se descartó la regla original «una línea está enviada si lleva `🆔`» y también un campo propio para el vínculo (`🔗 gcal:<id>`), que añadía un campo más a la línea.

**Regla**: una línea está **enviada** si existe en Google un evento creado por este plugin cuyo id se deriva de su `🆔` (§17.3). El mecanismo es explícito:
1. La acción «Enviar a Google Calendar» escribe el `🆔` en la línea si le faltaba, crea el evento con el id derivado en el calendario de la nota y lo marca como propio.
2. En cada sincronización se descargan los eventos, se reconocen los del plugin por el prefijo y la propiedad privada, y se decodifican sus `🆔`. Las líneas cuyo `🆔` está en ese conjunto están **vinculadas**: su título, inicio y fin se sincronizan en los dos sentidos.
3. Un `🆔` sin evento correspondiente no hace nada; es solo un id de dependencias.

En las notas espejo siguen sincronizándose todas las líneas con fecha (§15.4). Nada se envía sin una acción explícita; las reglas automáticas por nota, etiqueta o área quedan descartadas por ahora.

Ventajas: no hay marca extra en la línea, el `🆔` se puede crear libremente, funciona entre dispositivos porque el vínculo está en Google y no en un índice local, y las vistas pueden mostrar una insignia de «sincronizada» calculada sin tocar la línea.

Límites: un evento fuera de la ventana descargada (de −3 a +6 meses) no se reconoce como vinculado, lo que solo afecta a eventos lejanos que de todos modos no se sincronizan; y si se edita a mano el `🆔` de una línea ya enviada, el evento queda huérfano. Un evento del plugin sin ninguna línea que lo reclame (línea borrada o `🆔` editado) se borra de Google, y esa operación siempre pide aprobación.
