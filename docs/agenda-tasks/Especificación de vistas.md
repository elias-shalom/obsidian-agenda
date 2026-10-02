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

El estado de búsqueda, filtros y orden se guarda en el almacenamiento local de Obsidian y se restaura al volver a la vista, incluso después de editar una tarea. Las anchuras de las columnas se recalculan según el contenido de las filas visibles, con límites para evitar columnas desproporcionadas; en pantallas estrechas se conserva el desplazamiento horizontal. La presentación usa filas alternas sutiles, estados y prioridades diferenciados, fechas agrupadas y etiquetas compactas.

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

#### 4.4.1 Doble clic para crear tarea (v1.1.9 — diseño, corrige bug)

> **Estado**: diseño acordado, nada implementado todavía. Mecanismo: [[Arquitectura técnica]] §11.

**Bug actual**: Mes, Semana, Semana laboral y Año crean una tarea al hacer doble clic en una celda vacía (`CalendarView.setupViewSpecificEventListeners()`), pero el selector compartido incluye `.oa-calendar-day-column`, una clase de un diseño anterior de la vista Día que ya no existe en su plantilla actual (hoy usa `.oa-calendar-day-hours`/`.oa-calendar-hour-slot` y la sección "Todo el día"). Por eso el doble clic no hace nada en Día.

**Diseño**:
- Doble clic en una **franja horaria** (`.oa-calendar-hour-slot`) abre el modal de creación con la fecha **y la hora de esa franja** prellenadas en el campo `scheduled`.
- Doble clic en la sección **"Todo el día"** (`.oa-calendar-allday-content`) abre el mismo modal que usan Mes/Semana/Semana laboral/Año (`openCreateTaskForDate`), sin hora.
- Si el doble clic cae sobre una tarea existente (`.closest('.oa-calendar-task')`), se ignora — el doble clic sobre una tarea sigue abriendo su nota, igual que en las demás vistas; es el mismo guard que ya usan Mes/Semana.
- `.oa-calendar-allday-content` gana una altura mínima para que, aunque no haya ninguna tarea de todo el día ese día, quede un área vacía visible y fácil de encontrar donde hacer doble clic.

**Bug relacionado encontrado**: `TaskModal.buildTemplateData()` (rama de creación) siempre usa `DateTime.now()` para `scheduledDateValue`; nunca lee `modalOptions.today`, aunque `CalendarView.openCreateTaskForDate(dateStr)` ya se lo pasa. Es decir, **el doble clic para crear tarea en Mes/Semana/Semana laboral/Año hoy siempre prellena la fecha de hoy, sin importar en qué día se hizo doble clic** — bug preexistente, no introducido por este cambio. Para que el nuevo doble clic de Día prellene correctamente la fecha (y la hora, en las franjas), hace falta corregir `buildTemplateData()` para que lea `modalOptions.today` (ya se envía, nunca se usa) y una clave nueva `modalOptions.scheduledTime` (hora de la franja). Se propone corregir esto para las cinco vistas a la vez, ya que comparten el mismo modal.

#### 4.4.2 Decisiones

1. **Corregir el bug de `modalOptions.today` — decidido: sí.** Se corrige junto con esta fase, afecta también a Mes/Semana/Semana laboral/Año.

#### 4.4.3 Modo de varios días: 1/3/5 (v1.1.9 — diseño, no implementado)

> **Estado**: diseño acordado, nada implementado todavía. Mecanismo: [[Arquitectura técnica]] §13.

No es una vista nueva en el selector de §4.8: es un **modo dentro de la vista Día**, con su propio multi-botón (1/3/5) que solo aparece cuando Día está activa — mismo patrón que ya usan Semana/Semana laboral con su selector de estilo de grilla (`#oa-calendar-grid-style`, visible solo dentro de esas plantillas). "1 día" es la vista Día actual sin ningún cambio; "3" y "5" son las opciones nuevas.

- **Centrado**: el día de referencia (hoy o el seleccionado) queda en el centro de la ventana visible — 3 días: uno antes, el de referencia, uno después; 5 días: dos antes, el de referencia, dos después. No se construye la alternativa "anclado al inicio" en esta primera versión; queda anotada como posible ajuste configurable a futuro.
- **Navegación**: ◀▶ desplazan la ventana completa **un día a la vez** (no saltan de ventana en ventana), para poder "recorrer" los días de forma continua.
- **Hereda el diseño de Día**: mismo grid de horas y bloques con duración/carriles del §4.7, repetido por columna — una etiqueta de hora compartida a la izquierda y N columnas de día a la derecha dentro de cada `.oa-calendar-hour-row` (en vez de una sola celda).
- **Sin cruces entre días**: los cálculos de bloques con duración y de carriles (§4.7.3) son independientes por columna; ninguna tarea ni carril cruza de un día a otro, consistente con el recorte a medianoche ya acordado (ADR-T7).
- **Resaltados**: "hoy" y la fecha seleccionada (§4.6.3) se marcan en su columna correspondiente de forma independiente; si ambas coinciden con el día central, se aplican las dos marcas igual que en las demás vistas.

### 4.5 Calendar Year View (`calendar-year-view`)

12 mini-calendarios (uno por mes), cada día con `hasTasksDue`/`taskCount`. Clic en un número de día con tareas navega a la vista Día de esa fecha (`CalendarView.navigateToDayView()`, guarda la fecha en `localStorage` y cambia el tipo de vista de la hoja).

> **Extendido a Mes/Semana/Semana laboral (2026-09-27)**: el mismo clic-en-el-número-de-día para navegar a la vista Día se agregó también a Mes (`.oa-calendar-month-day-number`) y Semana/Semana laboral (`.oa-calendar-date`, comparten contenedor), cableado una sola vez en `CalendarView.setupViewSpecificEventListeners()` (a diferencia de Año, aquí aplica a **todos** los días, tengan tareas o no). `stopPropagation()` evita que el clic también dispare el `dblclick` de la celda (crear tarea en esa fecha).

### 4.6 Fecha de referencia compartida y selector de fecha (v1.1.9 — diseño, no implementado)

> **Estado**: diseño para la v1.1.9, nada de esto está implementado todavía. Lo descrito como "propuesto" o "decidido" aún no existe en el código; lo marcado como "hoy" es el comportamiento actual. Decisiones en §4.6.7 (todas resueltas salvo la 3, diferida). Mecanismo y archivos afectados: [[Arquitectura técnica]] §9. Fases: [[Plan de implementación]].

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

#### 4.6.7 Decisiones

1. **Persistencia de la referencia — decidido: en memoria.** No sobrevive a un reinicio de Obsidian, para no abrir el calendario días después en una fecha vieja. No se usa `localStorage`.
2. **Vista Día — decidido: modo acoplado.** Usa el componente común siempre visible (ver §4.6.6), no el popover oculto de las demás vistas.
3. **Seleccionar con clic en una celda**: diferido, fuera del primer corte. El `dblclick` de la celda crea una tarea, y un clic que re-renderice la vista lo interrumpiría; habría que marcar sin re-renderizar.

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

### 4.7 Bloques con duración en la vista por Día (v1.1.9 — diseño, no implementado)

> **Estado**: diseño acordado con el usuario, nada implementado todavía. Mecanismo: [[Arquitectura técnica]] §10. Fases: [[Plan de implementación]]. Sustituye el enfoque de capa superpuesta (`position: absolute`) planteado inicialmente: en su lugar se reutiliza la misma técnica visual de "píldora conectada" que ya usan las rachas de hábitos (Grid), rotada de carriles horizontales de días a filas verticales de horas.

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

### 4.8 Selector de tipo de vista: multi-botón segmentado (v1.1.9 — diseño, no implementado)

> **Estado**: diseño en curso, nada implementado todavía. Cambio puramente visual: no toca `switchToViewType()` ni la lógica de navegación, solo cómo se dispara.

**Hoy**: cada plantilla de vista de calendario (`calendar-month-view.hbs`, `-week-`, `-workweek-`, `-day-`, `-year-view.hbs`) repite un `<select id="oa-calendar-view-dropdown">` con 5 `<option>`; `CalendarView.setupViewSpecificEventListeners()` escucha su evento `change` y llama a `switchToViewType()`.

**Propuesto**: reemplazar el `<select>` por un grupo de **6 botones pegados** (Año, Mes, Semana, Semana laboral, Día, y Lista — esta última se agrega en v1.1.10, pospuesta tras esta discusión), uno por tipo de vista, con un solo clic para cambiar. Se reutiliza el mismo lenguaje visual que ya existe en el Task Modal para la prioridad (`.oa-priority-segmented`/`.oa-priority-pill`, ver `src/styles/components/_modal.scss`): botones planos, sin fondo ni borde hasta hover/activo — pero en una fila continua y compacta (sin separación entre botones, bordes compartidos, esquinas redondeadas solo en los extremos del grupo), ya que son 6 opciones y deben quedar compactas en el encabezado del calendario.

- Cada botón lleva su **ícono** (Obsidian `setIcon()`/Lucide, igual que los iconos de pestaña que ya usa cada vista) más un atributo `title` con el nombre traducido de la vista — se convierte automáticamente en el tooltip temático ya construido (`installTooltips()` ya corre en cada `BaseView.render()`), sin trabajo adicional.
- Clic en un botón llama a la misma `switchToViewType()` que hoy dispara el `change` del `<select>`; la lógica de cambio de vista no cambia.
- El botón de la vista activa se marca visualmente (clase `.oa-active`, igual que la píldora de prioridad seleccionada).

#### 4.8.1 Decisiones por confirmar

1. **Ícono + tooltip, no solo ícono**: con 6 opciones y dos de ellas muy parecidas (Semana / Semana laboral), un ícono sin texto puede ser ambiguo a primera vista; se propone que el tooltip con el nombre de la vista sea obligatorio, no opcional.
2. **Set de íconos** (propuesta, a revisar visualmente al implementar): Año `calendar-range`, Mes `calendar-days` (ya es el ícono por defecto de `CalendarView.getIcon()`), Semana y Semana laboral con íconos claramente distintos entre sí (a elegir, ej. columnas vs. maletín), Día `calendar-clock`, Lista `list-todo` (mismo ícono que ya usa `ListView.getIcon()`).

### 4.9 Manejo de estatus desde el calendario (v1.1.9 — diseño, no implementado)

> **Estado**: diseño acordado, nada implementado todavía. Decisiones y símbolos: [[Modelo de datos]] §10 (ADR-S1 a S3). Mecanismo: [[Arquitectura técnica]] §14.

**Identificación visual**: cada píldora de tarea en el calendario (`.oa-calendar-task`, en Mes/Semana/Semana laboral/Día) muestra el ícono de su estado (⭕🛠️⏸️✅❌🗑️), igual que ya se ve en la vista Tabla — hoy solo se distingue completada/no completada (atenuado vía `.oa-calendar-task--done`).

**Cambiar el estado — dos vías**:
1. **Clic derecho (menú contextual)** sobre una píldora: abre un `Menu` nativo de Obsidian (mismo patrón que el menú de campos del editor, ver [[Arquitectura técnica]] §6) con las 6 opciones de estado, localizadas e iconadas. Elegir una reescribe el símbolo de la tarea.
2. **Task Modal**: nuevo campo de estado (ver §7.5), disponible tanto al crear como al editar.

**Efecto al marcar "Hecho"/desmarcar**: igual que el checkbox nativo de Obsidian — agrega la fecha ✅ al marcar `Done`, la quita al cambiar a cualquier otro estado (ADR-S3). No genera ninguna ocurrencia nueva de una tarea recurrente (eso se diseña aparte, ver roadmap de tareas recurrentes).

**Fuera de alcance**: filtrar el calendario por estado (ya existe `calendarShowCompletedTasks` para ocultar completadas); estados personalizados/configurables (ADR-S2).

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

### 7.5 Campo de estado (v1.1.9 — diseño, no implementado)

Nuevo campo en el formulario del Task Modal, visible tanto al crear como al editar: segmented control de 6 píldoras (mismo lenguaje visual que la prioridad, §7.2), una por Status Type (Todo/En progreso/En espera/Hecho/Cancelada/No es tarea). Al crear una tarea, "Todo" queda preseleccionado por defecto, pero se puede elegir cualquier otro estado antes de guardar. Al editar, refleja el estado actual de la tarea. Mismo efecto de agregar/quitar fecha ✅ que el cambio desde el calendario (ver §4.9).

## 8. Tooltips del plugin

Las vistas renderizadas por `BaseView` y el modal de tareas convierten sus atributos `title` en tooltips propios del plugin. Se muestran al pasar el puntero o enfocar con teclado, incluyen una tarjeta temática con flecha y texto explicativo, y no modifican los tooltips del resto de Obsidian. La relación con el control se expone mediante `aria-describedby`; no incluyen acciones ni botones.
