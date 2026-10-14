---
name: "Plan de implementación - Agenda Tasks"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: task-management
archetype: engineer
status: active
related:
  - "[[README]]"
  - "[[Arquitectura técnica]]"
  - "[[Especificación de vistas]]"
created: 2026-09-25
tags:
  - obsidian-agenda
  - documentation
  - plan
---

# Plan de implementación — Módulo Agenda Tasks

> A diferencia del plan de hábitos (que planificó un módulo antes de construirlo), este documento es **retrospectivo**: resume qué se implementó y en qué versión (según `docs/todo.md`), y qué queda pendiente — en particular, como preparación para la v1.1.4.

## Fases ya completadas (histórico por versión)

### v1.0.0 — v1.0.1
- [x] Extracción y visualización base de tareas del vault (formato emoji de Obsidian Tasks).
- [x] Compatibilidad con el formato **Dataview** del plugin de Tareas.
- [x] Soporte de tareas recursivas/repetitivas (🔁) a nivel de parseo (`flow.repeat` / `convertToRRuleFormat`).
- [x] Compatibilidad con dispositivos móviles.

### v1.0.2 — v1.0.3
- [x] Vista de Calendario — variante por año.
- [x] Mejoras de diseño en los contenedores de tareas.
- [x] Configuración de qué pestañas aparecen en el encabezado (`showOverviewTab`, etc.).
- [x] Fecha de hoy visible en el panel Overview; número de semana en la vista Semanal.

### v1.0.4
- [x] Creación de tareas nativas desde las vistas de Agenda Tasks (modal + `TaskWriter`).
- [x] Atajo de paleta de comandos (Ctrl+P) para crear tareas.
- [x] Botón de recarga de tareas, resaltado al pasar el mouse en Lista, orden alfabético en Lista, línea del día actual en la vista Mes, navegación de vista Año → vista Día.

### v1.0.5
- [x] Skeleton loading en reemplazo del spinner (`BaseView.showLoadingOverlay`).
- [x] Mejoras estéticas y distinción visual de prioridades en la vista Lista.
- [x] Nuevo widget "hero" en el Overview.

### v1.1.1
- [x] Configuración de settings migrada a la API declarativa de Obsidian 1.13+ (`getSettingDefinitions()`), con `display()` legacy como fallback.
- [x] Icono propio por pestaña principal (Overview, List, Table, Calendar) en vez de un icono compartido.

**Verificación histórica**: `npm run build` tras cada cambio; no existe `test-vault/` en el repo, por lo que la validación funcional siempre fue manual en un vault real.

## Deuda técnica / trabajo incompleto (estado actual del código)

- [ ] **Timeline view**: no registrada — el registro en `ViewManager` y el botón del encabezado (`header.hbs`) están comentados; sin lógica de posicionamiento temporal. Pendiente de diseño de datos (eje de tiempo, agrupación por rango) y de plantilla propia.
- [ ] **Gantt view**: no registrada (registro y botón comentados, plantilla `gantt-view.hbs` vacía, `onOpen()` descarta el resultado de `getAllTasks()`). Se rediseña en v1.1.13, ver [[Especificación de vistas]] §12.
- [x] **Edición de tareas existentes** desde el modal (`"edit-task"`): implementada (2026-09-27) reutilizando `TaskModal`/`TaskWriter.updateTaskLine`; ver [[Especificación de vistas]] §7.3. Origen: clic simple sobre una tarea en las vistas de calendario (doble clic sigue abriendo el archivo).
- [ ] Tests unitarios: siguen sin existir en el repo para este módulo (igual que para hábitos).

## Próxima fase — v1.1.4: programación por hora del día (diseño acordado)

> Decisiones de diseño completas y acordadas en sesión de brainstorming previa a tocar código; ver ADR-T1 a T6 en [[Modelo de datos]] §9 y el detalle por vista en [[Especificación de vistas]] §4. Este plan desglosa esas decisiones en fases de implementación.

### Resumen de las decisiones (no repetir, ver [[Modelo de datos]] §9 para el detalle)

- `due` siempre día completo (ADR-T1); `scheduled` es el único campo con hora, en modo punto o bloque con duración en **minutos** (ADR-T2); `🕐` (24h `HH:mm`) / `⏱️` son campos de primer nivel independientes, detectados en cualquier posición del renglón, opcionales y aditivos, Dataview equivalente `time::`/`duration::` (ADR-T3); calendario configurable (setting **"Calendario"**) para mostrar `start`/`due`/`scheduled` con prioridad `scheduled > due > start`, distintivo visual icono+color por tipo (ADR-T4/T4-bis); solapes diferidos (ADR-T5); completadas atenuadas, no ocultas (ADR-T6); bloques que cruzan medianoche se recortan al final del día (ADR-T7).

### Fase A — Modelo de datos y parser
- [ ] `ITaskDate`/`ITaskFlow` (`src/types/interfaces.ts`): agregar `scheduledTime` (o equivalente) y `duration` (minutos) como campos opcionales.
- [x] `TaskSection` (`src/entities/task-section.ts`): reconocer `🕐 HH:mm` y `⏱️` (duración) como campos de primer nivel independientes, detectados en cualquier posición del renglón (revisado 2026-09-27, ver ADR-T3); no debe alterar el parseo de notas sin estos iconos (compatibilidad retro).
- [ ] `TaskExtractor`/`Task.create` (`src/core/task-extractor.ts`, `src/entities/task.ts`): propagar los campos nuevos al objeto `Task` final.

### Fase B — Escritura: insertar desde el archivo

> Ver la comparación de opciones y el porqué de la decisión (B2+B3+B4 sobre B1) en [[Arquitectura técnica]] §6.
- [x] Registrar un comando + atajo de teclado que abra un `Menu` nativo de Obsidian con las opciones de campo (fecha, hora, duración, prioridad, etc.) sobre la línea de tarea actual.
- [x] Agregar las mismas opciones al menú contextual (clic derecho) vía `app.workspace.on('editor-menu', ...)` cuando el cursor está sobre una línea de tarea.
- [x] Ambas vías reutilizan `flatpickr` (ya es dependencia del proyecto) para capturar el valor, con `enableTime` cuando corresponda, e insertan el texto resultante en la posición correcta de la línea.
- [ ] *(Diferido, no en esta fase)* `EditorSuggest` estilo Tasks (menú al escribir espacio) — anotado como posible fase 2 si se quiere esa experiencia exacta.

### Fase C — Vistas de calendario
- [x] `CalendarDayView`: puebla `hourSlots` desde `scheduled` (hora); fila "Todo el día" para `due`/`start` (dos filas separadas, ADR-T4-bis), **expandida por defecto** (revertido de D10, colapsable manualmente) + una tercera para `scheduled` sin hora asignada (caso límite). **Simplificación**: el modo bloque (⏱️ duración) muestra la duración como etiqueta ("90m") en la franja de inicio, pero **no** expande visualmente la tarea a lo largo de varias franjas todavía — queda anotado como pulido visual futuro.
- [x] `CalendarWeekView`/`CalendarWorkWeekView`: etiqueta de hora dentro de la cápsula existente (sin rediseño de grilla).
- [x] `CalendarMonthView`/`CalendarWorkWeekView`/`CalendarYearView`: extendidas de "solo `due`" a "`start`/`due`/`scheduled` configurables" (vía `CalendarView.getTasksForDate()` centralizado), con marca visual icono+color por tipo.
- [x] Nuevo setting global (Settings ▸ Calendario) con checkboxes de qué fechas mostrar por defecto — el control por vista (toolbar) que lo sobreescribe en sesión queda diferido (ver D9, no se construyó en esta fase).
- [x] Tratamiento visual atenuado para tareas completadas (`isTaskDone` helper + clase `.oa-calendar-task--done`), aplicado en Día/Semana/Semana laboral/Mes; se agregó además `calendarShowCompletedTasks` para poder ocultarlas por completo en vez de solo atenuarlas.

### Fase D — Edición en el lugar y drag and drop (dependencia compartida)
- [x] Nueva capacidad en `TaskWriter`: reescribir en su lugar una línea de tarea existente (localizar por archivo + número de línea, modificar solo el campo tocado, preservar el resto). Es prerrequisito tanto de "Edición de tareas nativas" como de "Drag and drop", ambos ya listados en el roadmap de v1.1.4.
- [x] Drag and drop en Mes/Semana/Semana laboral: cambia solo el día de la fecha que posiciona la tarea (según prioridad ADR-T4). **Año queda fuera en la práctica**: sus celdas solo muestran un contador de tareas, no hay píldoras individuales de las que iniciar el arrastre (ver [[Especificación de vistas]] §4.5).
- [x] Drag and drop en Día: arrastrar cambia la hora de `scheduled` (preservando los minutos originales). **Redimensionar el borde inferior para cambiar la duración queda diferido**: depende de la expansión visual multi-franja de bloques con duración, ya anotada como fuera de alcance de v1.1.4 (ver más abajo).

### Fase E — Task Modal: modo básico/avanzado
- [x] Agregar enlace/toggle "Mostrar opciones avanzadas ▾" al formulario de creación existente, que despliega en el mismo modal: `start`, `scheduled` (+ hora + duración), recurrencia, dependencias, `onCompletion`, id.
- [x] Persistir la preferencia de modo (básico/avanzado) del usuario (`localStorage`) para que el modal recuerde el último modo usado.
- [x] Aplicar el mismo patrón al modal de edición (`"edit-task"`) — completado el mismo día que la edición de tareas nativas (ver deuda técnica arriba).

### Fuera de alcance de v1.1.4 (anotado para más adelante)
- Expansión visual multi-franja de bloques con duración en la vista Día (hoy solo se muestra la duración como etiqueta en la franja de inicio).
- Vista Semana horaria completa (grilla 7×24 estilo Google Calendar).
- Layout en carriles para tareas superpuestas en la misma franja (hoy: apiladas).
- Kanban view y terminar Gantt view (quedan técnicamente más fáciles una vez exista `scheduled`+`duration`, pero no se abordan en esta fase).
- `EditorSuggest` estilo Tasks (menú al escribir espacio) — la Fase B cubre el mismo resultado funcional con menor esfuerzo (menú contextual + comando).
- Recurrencia (`🔁`) combinada con hora/duración — ver nota en [[Modelo de datos]] §9 ("Diferido para una próxima versión").
- Soporte móvil del menú de inserción y del drag-and-drop (v1.1.4 se enfoca en desktop/web; se valida más adelante).

## Próxima fase — v1.1.9: fecha de referencia y selector de fecha (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.6. Mecanismo y archivos: [[Arquitectura técnica]] §9. Decisiones 1 y 2 de §4.6.7: referencia en memoria; Vista Día usa el componente común en modo acoplado (siempre visible, sin botón). Decisión 3 (clic para seleccionar) revisada de "diferido" a implementado.

### Fase A — Fecha de referencia y resaltado (base, sin UI nueva)
- [x] Módulo `src/core/calendar-reference-date.ts` y `CalendarView.setCurrentDate()` como único punto de escritura de `currentDate`.
- [x] `CalendarView.onOpen()` toma la referencia; quitar de `CalendarDayView.onOpen()` la lectura y borrado de `oa_navigate_to_date`, y de `navigateToDayView()` su escritura.
- [x] `switchToViewType()` conserva la fecha; el botón "Hoy" restablece la referencia.
- [x] `isSelected` en `WeekDayData`, `MonthViewData` y `YearViewData`, calculado en cada `generateViewData()` (en Año solo si `isCurrentMonth`).
- [x] Clases `oa-calendar-selected` / `oa-year-selected` en las cuatro plantillas y su estilo, independiente del de "hoy".
- [x] Mantener sin cambios la pestaña "Calendario" del encabezado (`BaseView.attachEventTabs()`): sigue activando `calendar-month-view` directamente, sin leer la referencia — es la mitigación decidida para no reabrir el calendario en una fecha vieja.
- [x] Verificable sola: cambiar de vista con una fecha distinta de hoy y ver la fecha marcada en Mes, Semana, Semana laboral y Año.

### Fase B — Componente selector (depende de A)
- [x] `src/core/calendar-date-picker.ts` con los niveles días → años → meses → días y estado de exploración propio.
- [x] Constructor de rejilla común (6 filas, `weekStartDay`, nombres localizados) y cálculo de "día con tareas" reutilizando `CalendarView.getTasksForDate(día).length > 0` (mismo criterio que Mes; respeta `calendarShowDueDates`/`StartDates`/`ScheduledDates` y `calendarShowCompletedTasks`).
- [x] Botón de apertura en las cuatro plantillas con popover (Mes/Semana/Semana laboral/Año); popover con `aria-expanded`, cierre con `Escape`, clic fuera y al elegir día; foco devuelto al botón.
- [x] Al elegir un día: `setCurrentDate()` y re-render del mismo tipo de vista, con `refreshCalendar()`.
- [x] Estilos `components/_calendar-date-picker.scss` y claves de i18n nuevas en los seis locales.

### Fase C — Vista Día: componente común en modo acoplado
- [x] Montar el componente selector en modo `docked` dentro del sidebar actual de Día (mismo lugar, siempre visible, sin botón de apertura ni opción de ocultarlo).
- [x] Sustituir `generateMiniCalendarData()` por el constructor de rejilla común: quita el lunes fijo, las letras en español y el punteado de tareas que ignora los settings de calendario (ver [[Arquitectura técnica]] §9.4).
- [x] Conservar los niveles días → años → meses → días al pulsar el encabezado mes/año, igual que en el popover de las otras vistas.

### Fase D — Cierre
- [x] Actualizar README (News, Changelog, Gestures) y `docs/todo.md`, indicando el cambio de comportamiento al cambiar de vista.
- [x] Subir versión a 1.1.9 al terminar (`npm version 1.1.9 --no-git-tag-version`).

### Validación manual (no hay framework de pruebas ni vault de prueba)
- [x] Casos de §4.6.9 de [[Especificación de vistas]]: fin de año y bisiesto, inicio de semana en lunes y domingo, las cinco vistas con fecha distinta de hoy, seis idiomas, tema claro y oscuro, panel estrecho.
- [x] `npm run build` y ESLint sobre los archivos tocados.

## Próxima fase — v1.1.9 (cont.): bloques con duración en la vista por Día (Fases A y B implementadas)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.7. Mecanismo y archivos: [[Arquitectura técnica]] §10. Decisiones 1 y 2 de §4.7.5 ya resueltas: redondeo del fin hacia arriba; carriles calculados por conglomerado de solapamiento. **Fases A y B implementadas; Fase C (redimensionar) pendiente.**

### Fase A — Segmentos conectados (sin carriles ni resize todavía)
- [x] `CalendarDayView.generateViewData()` calcula `[startHalfSlot, endHalfSlot)` y `segmentRole` por tarea con `scheduledTime`.
- [x] Plantilla y SCSS: adaptar/reutilizar `oa-habit-grid-cell--run-start/--run-middle/--run-end` para las celdas de hora; franja sin duración ocupa la celda completa (sin cambios); duración < 60 min ocupa media celda con su etiqueta.
- [x] Línea punteada a la media hora en cada `.oa-calendar-hour-row` (§4.7.1).
- [x] Verificable sola: una tarea de 30, 60, 90 y 120 minutos se ve con el tamaño correcto, sin carriles ni resize.

### Fase B — Carriles para tareas solapadas (depende de A)
- [x] Algoritmo de conglomerados + asignación greedy de carriles (§4.7.3); ancho de columna por conglomerado, no por todo el día.
- [x] Verificable sola: dos tareas que se solapan se ven una junto a la otra, nunca una tapando a la otra.

### Fase C — Redimensionar arrastrando el borde inferior (depende de A)
- [x] Manija en el segmento final; arrastre con snap a 30 minutos; escribe con `upsertScheduledDuration()` + `TaskWriter.updateTaskLine()`.
- [x] Duración mínima de 30 minutos al arrastrar.
- [x] Revisar que el `dragstart` de mover la tarea completa a otro día (ya existente) siga funcionando con el segmento `--run-start` como origen.

### Validación manual
- [x] Tareas de distinta duración (sin duración, <30min, 30–59min, 60min, >120min) en las mismas horas, con y sin solape.
- [x] Redimensionar hasta el límite mínimo (30 min) y hasta cruzar medianoche (se recorta al final del día, ADR-T7).
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Redimensionar arrastrando el borde superior (cambia la hora de inicio, no la duración); posicionar tareas sin duración dentro de la media hora exacta.

## Próxima fase — v1.1.9 (cont.): doble clic para crear tarea en la vista Día (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.4.1. Mecanismo: [[Arquitectura técnica]] §11. **Implementado.** Decisión 1 de §4.4.2 confirmada: se corrige `modalOptions.today` junto con esta fase.

### Fase Única
- [x] Corregir `TaskModal.buildTemplateData()` para leer `modalOptions.today` (bug preexistente que afecta también a Mes/Semana/Semana laboral/Año) y una clave nueva `modalOptions.scheduledTime`.
- [x] Reemplazar `.oa-calendar-day-column` por `.oa-calendar-hour-slot`/`.oa-calendar-allday-content` en el selector compartido de `CalendarView.setupViewSpecificEventListeners()`, o cablear un listener específico en `CalendarDayView`.
- [x] Doble clic en franja horaria: abre creación con fecha + hora prellenadas. Doble clic en "Todo el día": reutiliza `openCreateTaskForDate()` sin cambios.
- [x] `min-height` en `.oa-calendar-allday-content` para que el área vacía siga siendo un blanco de doble clic aunque no haya tareas de todo el día ese día.
- [x] Verificable sola: doble clic en una franja horaria de un día distinto a hoy prellena la fecha Y la hora correctas; doble clic en Mes/Semana para un día distinto a hoy ya no prellena "hoy" por error.
- [x] `npm run build` y ESLint sobre los archivos tocados.

## Próxima fase — v1.1.9 (cont.): selector de tipo de vista como multi-botón segmentado (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.8. Mecanismo: [[Arquitectura técnica]] §12. Decisiones de §4.8.1 confirmadas: tooltip obligatorio; set de íconos (calendar-range/calendar-days/columns-3/briefcase/calendar-clock).

### Fase Única
- [x] Nueva clase `.oa-calendar-view-segmented` (variante compacta, sin espacio entre botones, de `.oa-priority-segmented`/`.oa-priority-pill`).
- [x] Reemplazar el `<select id="oa-calendar-view-dropdown">` por el grupo de botones en las 5 plantillas de calendario (serán 6 cuando se sume la vista Lista en v1.1.10).
- [x] Cada botón: ícono vía `setIcon()` + `title` con la clave i18n existente de la vista (se vuelve tooltip automáticamente).
- [x] `CalendarView.setupViewSpecificEventListeners()`: cambiar el listener `change` del `<select>` por `click` por botón, llamando a la misma `switchToViewType()`.
- [x] Verificable sola: un clic cambia de vista igual que hoy el dropdown; el botón activo se marca visualmente; los 5 botones caben en el encabezado sin desbordarse.
- [x] `npm run build` y ESLint sobre los archivos tocados.

## Próxima fase — v1.1.10: vista Día, modo de varios días 1/3/5 (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.4.3. Mecanismo: [[Arquitectura técnica]] §13. Dependía de las Fases A/B/C del §4.7 (bloques con duración, carriles y redimensionar), ya implementadas.

## Próxima fase — v1.1.10: manejo de estatus desde el calendario (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.9 y §7.5. Símbolos: [[Modelo de datos]] §10 (ADR-S1 a S3). Mecanismo: [[Arquitectura técnica]] §14. **Pospuesto de v1.1.9 a v1.1.10.**

### Fase A — Modelo de datos y escritura
- [x] `CoreTaskStatus.OnHold = "?"` / `CoreTaskStatusIcon.OnHold = "⏸️"` en `src/types/enums.ts`.
- [x] `getCoreTaskStatusName`/`getCoreTaskStatusEmoji` (`task-extractor.ts`): caso `OnHold`.
- [x] Nueva `upsertTaskStatus(line, status, todayIso)` en `task-line-fields.ts`: reescribe el símbolo y agrega/quita `✅` según corresponda (ADR-S3).
- [x] Fix de `task-filter.ts`: `isTaskCompleted` debe comparar `state.text`, no `state.status`.
- [x] Claves i18n nuevas (`status_on_hold`) en los seis locales; reutilizar las existentes para los otros 5 estados. También agregado al filtro de estado existente de la vista Tabla (`table-view.hbs`).

### Fase B — Badge visual en el calendario (depende de A)
- [x] Ícono de estado en `.oa-calendar-task` de Mes/Semana/Semana laboral/Día.
- [x] Verificable sola: cada píldora muestra el ícono correcto de su estado.

### Fase C — Menú contextual en el calendario (depende de A)
- [x] Listener `contextmenu` en `.oa-calendar-task` (`CalendarView`), `Menu` con las 6 opciones, reutilizando el patrón de `task-field-menu.ts`.
- [x] Elegir una opción reescribe el símbolo con `upsertTaskStatus()` + `TaskWriter.updateTaskLine()` + `refreshView()`.
- [x] Verificable sola: clic derecho sobre una tarea del calendario permite cambiar su estado; marcar `Done` agrega `✅`, desmarcar la quita.

### Fase D — Campo de estado en el Task Modal (depende de A)
- [x] Segmented control de 6 píldoras en `create-task-modal.hbs`, mismo patrón visual que prioridad.
- [x] Preseleccionado "Todo" al crear; refleja el estado real al editar.
- [x] El guardado usa `upsertTaskStatus()`, no lógica duplicada.

### Validación manual
- [x] Los 6 estados se reconocen correctamente al parsear una nota existente con cada símbolo.
- [x] Cambiar a `Done` agrega `✅ <hoy>`; cambiar desde `Done` a cualquier otro estado la quita.
- [x] El fix de `task-filter.ts` no rompe ningún filtro existente que dependiera (sin saberlo) del bug.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Filtrar el calendario por estado; estados personalizados/configurables; generación de nuevas ocurrencias de tareas recurrentes al marcar `Done` (se diseña aparte).

### Fase Única
- [x] Multi-botón 1/3/5 dentro de `calendar-day-view.hbs`, visible solo en esta vista; preferencia persistida en `localStorage`.
- [x] `generateViewData()` calcula el rango centrado de fechas según `daysToShow` y genera una columna por día (`buildDayColumn()`), reutilizando la lógica de segmentos/carriles de duración ya definida para un solo día; las filas de hora se transponen a `hourRows` (1 por hora, N columnas cada una) para que la plantilla comparta la etiqueta de hora entre columnas.
- [x] Plantilla: `.oa-calendar-hour-row` con 1 etiqueta de hora compartida + N celdas; sección "todo el día" repetida por columna (`.oa-calendar-allday-columns`).
- [x] `navigateToPrevious()`/`navigateToNext()` ya movían la ventana un día a la vez (sin cambios, coincidía con el diseño).
- [x] Verificable sola: con "3" o "5" activos, el día de referencia queda al centro; ninguna tarea ni carril cruza entre columnas; ◀▶ desplazan de a un día.
- [x] Extra (no estaba en el checklist original, necesario para que el drag and drop siguiera siendo correcto con varias columnas): arrastrar una tarea a otra columna ahora también reescribe su fecha (`upsertScheduledDate`), no solo la hora; antes asumía siempre el mismo día.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance (fecha de referencia y selector de fecha)
- Seleccionar con clic en una celda, rangos de fechas, escribir la fecha a mano, navegar la rejilla con flechas del teclado, y corregir que Semana use semana ISO en vez de `weekStartDay`.

## Próxima fase — v1.1.10: selector de fecha unificado en el Task Modal (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §7.6. Mecanismo: [[Arquitectura técnica]] §15. Depende de `CalendarDatePicker` (§9, ya implementado e independiente de las vistas de calendario).

### Fase Única
- [x] `TaskModal.setupSimpleDatePicker()`: reemplazar la llamada a `flatpickr()` por un popover de `CalendarDatePicker`, anclado al botón disparador existente de cada campo (due/start/scheduled).
- [x] Exponer `getWeekStartDay()`/`getLocalizedDayNames()`/`hasTasks()` al modal (nuevo `TaskManager.getPluginSettings()`; `hasTasksOnDate()` usa una caché de tareas poblada una vez al abrir el modal, no una suscripción en vivo).
- [x] Marcar con punto los días con tareas existentes, igual que en el calendario.
- [x] Solo un popover abierto a la vez entre los 3 campos (cerrar el anterior al abrir otro).
- [x] Verificable sola: los 3 campos de fecha abren el mismo selector visual que usan las vistas de calendario; hora y duración siguen funcionando sin cambios.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Quitar `flatpickr` como dependencia del proyecto (sigue en uso en la inserción de campos desde el editor, §6); migrar esa otra superficie al mismo componente.

## Próxima fase — v1.1.10: vista de lista dentro del calendario (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.10. Mecanismo: [[Arquitectura técnica]] §17.

### Fase Única
- [x] Nuevo setting `calendarListDaysToShow` (7–14, por defecto 14) en Settings ▸ Calendario (slider, ambas rutas: API declarativa y `display()` legado).
- [x] Nueva `CalendarListView` + `CALENDAR_LIST_VIEW_TYPE`, registrada en `ViewManager` igual que las otras 5 vistas de calendario.
- [x] `generateViewData()`: ventana continua de `plugin.settings.calendarListDaysToShow` días desde la fecha de referencia, reutilizando `WeekDayData`/`getTasksForDate()`.
- [x] Nueva plantilla `calendar-list-view.hbs`: una fila por día, reutilizando el bloque de renderizado de `.oa-calendar-task` ya usado en Mes/Semana (sin plantilla nueva para las píldoras).
- [x] 7º botón en `.oa-calendar-view-segmented` en las 6 plantillas de calendario.
- [x] `navigateToPrevious()`/`navigateToNext()` mueven la ventana completa (`calendarListDaysToShow` días).
- [x] Verificable sola: la vista muestra tantas filas como indique el setting (entre 7 y 14) con sus tareas; clic/doble clic/drag and drop se comportan igual que en Mes/Semana (reutilizan los mismos selectores compartidos de `CalendarView`, sin wiring nuevo); cambiar el setting refresca la vista abierta.
- [x] `npm run build` y ESLint sobre los archivos tocados.

## Próxima fase — v1.1.10: modal de duración con dial circular (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §7.7. Mecanismo: [[Arquitectura técnica]] §18.

### Fase Única
- [x] Extraer `HabitEditorModal.attachTimeDial()` a `src/core/time-dial.ts`, parametrizado por `maxMinutes`/`stepMinutes`.
- [x] `HabitEditorModal` usa el componente extraído con los mismos valores que tenía antes (`120`/`1`), sin cambio de comportamiento; la plantilla ya no incluye el SVG a mano, `TimeDial.mount()` construye todo el dial.
- [x] `TaskDurationModal` usa el componente con `420`/`5` (7 horas); reescrito para construir su UI con `createEl`/`createDiv` en vez del input numérico simple (mismo patrón que `TaskTimePickerModal`).
- [x] Verificable sola: el Habit Editor se comporta igual que antes; el modal de duración del Task Modal usa el dial en vez del input numérico, con pasos de 5 minutos hasta 420 (7 horas).
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Nota de implementación
El CSS del dial (`.oa-time-dial*`) se movió de `views/_habit-form.scss` a un archivo compartido `components/_time-dial.scss` (§18.3 del diseño).

## Próxima fase — v1.1.10: compatibilidad con tareas recurrentes (implementado)

> Comportamiento y decisiones: [[Modelo de datos]] §11. Mecanismo: [[Arquitectura técnica]] §16. Depende del manejo de estatus (fase anterior, implementada): se dispara desde el mismo punto donde se marca una tarea como `Done`.

### Fase Única
- [x] `getNextOccurrenceDate(recurrenceText, referenceDate)`: despoja `when done`, reutiliza `convertToRRuleFormat()` + `rrulestr().after()`.
- [x] `buildNextOccurrenceLine(originalLine, nextDate)`: desplaza todas las fechas presentes manteniendo su distancia relativa; elimina `🆔`/`⛔`.
- [x] `TaskWriter`: nuevo método para insertar una línea completa en una posición específica (una línea arriba de la original).
- [x] Enganchar en el mismo punto de `upsertTaskStatus()` que agrega `✅` (menú contextual del calendario y guardado del Task Modal).
- [x] Verificable sola: completar una tarea con `🔁 every week` crea una nueva línea arriba con la fecha avanzada una semana; completar una con `when done` la calcula desde hoy; los `🆔`/`⛔` no aparecen en la nueva línea.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Configurar el orden de inserción (arriba/abajo); recurrencia "para X veces" o "hasta una fecha"; generar la ocurrencia al completar desde el checkbox nativo de Obsidian fuera del plugin.

## Fase v1.1.11: mantenimiento (fixes y dependencias) (implementado)

> Versión sin funcionalidad nueva: aísla las actualizaciones de dependencias, que afectan a todo el plugin, de las funcionalidades de v1.1.12 en adelante. Reparto completo por versiones en `docs/todo.md`. Publicada como 1.1.11; el ajuste de las columnas de la Tabla al ancho disponible pasa a v1.1.12 (fase U3).

### Fixes
- [x] Pestañas del encabezado ilegibles en tema oscuro (`_header.scss`, `.theme-dark`).
- [x] Mes de cada día en la vista de lista del calendario (`monthAbbr`).
- [x] Error `no-base-to-string` del helper `concat` en `base-view.ts` y los 7 de `habit-parser.ts` que destapó `typescript-eslint` 8.71 (función `toText()`).
- [x] Ancho de las filas de la Tabla: quitar la columna Archivo y reducir número de fila (máx. 50 px) y Fechas (80–120 px); el ajuste de las columnas al ancho disponible del contenedor (ventana en escritorio, ancho del dispositivo en tableta y teléfono) pasa a v1.1.12 (fase U3).
- [x] Vistas en Android: causa en el relleno de 20 px laterales y los 44 px de alto que Obsidian aplica a todo `<button>` en tableta y móvil; se corrigió el multibotón del calendario, el selector de fecha, el conmutador del sidebar de Día, Rutina (círculo, acciones, nombres y etiquetas), las celdas de Grid y Semana y los botones de tamaño fijo del Task Modal, el editor de hábitos, la Tabla y Hábitos (detalle en `docs/todo.md`); pruebas manuales hechas, y lo que aparezca se corrige en versiones siguientes.
- [x] Texto del README, del manual de usuario y de `todo.md` que decía que la Lista tiene filtrado avanzado, columnas personalizables, agrupado por fecha/estado y acciones masivas; corregido.
- [x] Aviso `prefer-create-el`: cerrado como no reproducible; `npx eslint src` termina limpio tras actualizar el plugin de reglas.

### Dependencias
- [x] Etiqueta `1.1.10`: ya está en el remoto (merge de la PR #54 en `main`); solo falta alinear la etiqueta local con la del remoto.
- [x] Actualizado dentro del rango: `handlebars` 4.7.10, `luxon` 3.7.2, `winston` 3.19.0, `esbuild` 0.25.12, `obsidian` (tipos) 1.14.4, `eslint-plugin-obsidianmd` 0.4.2, `typescript-eslint` 8.71.1, `eslint` 9.39.5 y las menores; `esbuild-sass-plugin` se queda en `~3.3.1` porque la 3.6 y la 3.7 exigen `esbuild >= 0.27`.
- [x] Pins de `@typescript-eslint/eslint-plugin` y `@typescript-eslint/parser` subidos de 8.32.1 a 8.71.1 (`eslint.config.mts` importa el parser directamente).
- [x] 5 avisos por `setDynamicTooltip()` obsoleto: se quitan las llamadas en `setting-tab.ts`.
- [x] No actualizar ahora: ESLint 10, TypeScript 7, esbuild 0.28 y `@types/node` 26.
- [x] Verificado: `npm run build` y `npx eslint src` sin errores ni avisos; `npm audit --omit=dev` sin vulnerabilidades; prueba manual en Obsidian hecha en escritorio, en modo móvil y en los dispositivos reales.
- [x] Versión subida a 1.1.11 en `package.json`, `package-lock.json`, `manifest.json` y `versions.json` (`minAppVersion` sigue en 1.8.7).

## Próxima fase — v1.1.11: manual de usuario (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §9.

### Fase Única
- [x] Nueva carpeta `docs/user_guide/`, separada de la documentación de desarrollo (`docs/agenda-tasks/`, `docs/habit-tracker-agenda/`).
- [x] Dos versiones completas y paralelas: `en/` y `es/`, 10 capítulos idénticos en estructura y orden (Introducción, Instalación, Primeros pasos, Vistas generales, Vistas de calendario, Seguimiento de hábitos, Formato de tareas y metadatos, Gestos e interacciones, Configuración, Preguntas frecuentes y soporte).
- [x] `docs/user_guide/README.md`: índice con enlaces a ambas versiones y guía para agregar un nuevo idioma (duplicar una carpeta de idioma y traducir, manteniendo nombres de archivo).
- [x] Verificable sola: cada capítulo enlaza correctamente al siguiente/anterior y a otros capítulos relacionados; el contenido refleja la versión 1.1.10 del plugin (settings, gestos y vistas vigentes al momento de escribirlo).

### Fuera de alcance
Un paso de build/generación de los manuales (son Markdown plano, sin plantilla ni paso de compilación); idiomas adicionales a inglés/español (quedan documentados como extensión futura siguiendo el mismo patrón).

## Próxima fase — v1.1.12: modal de novedades al actualizar (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §10. Mecanismo: [[Arquitectura técnica]] §19. **Nada de esta fase está implementado.**

### Fase A — Settings y disparador
- [ ] Nuevo campo `lastSeenVersion` (string) en `AgendaPluginSettings`/`DEFAULT_SETTINGS`.
- [ ] Nuevo campo `showWhatsNewOnUpdate` (boolean, default `true`) en `AgendaPluginSettings`/`DEFAULT_SETTINGS`, con su toggle en **Configuración general** (ambas rutas: API declarativa y `display()` legado).
- [ ] `main.ts` → `onload()`: tras `loadSettings()`, comparar `manifest.version` contra `settings.lastSeenVersion`; si difieren, actualizar y guardar `lastSeenVersion` de inmediato (antes de decidir si se muestra el modal).

### Fase B — Contenido localizado (depende de A)
- [ ] Nuevas claves de "novedades" por versión en `src/locales/*.json` (6 idiomas), espejando (resumido) el bloque "News" que ya se redacta a mano en `README.md` por cada release.
- [ ] Función que, dado `lastSeenVersion`, resuelve la lista de versiones posteriores con contenido a mostrar, de la más reciente a la más antigua (acumulativo, no solo la última versión).

### Fase C — Modal (depende de A y B)
- [ ] Nuevo `src/modals/whats-new-modal.ts` + `src/modals/templates/whats-new-modal.hbs`.
- [ ] Botón de cierre propio, visible dentro del contenido (no depende únicamente del cierre nativo del modal de Obsidian).
- [ ] Si `showWhatsNewOnUpdate` es `false`, el modal no se abre (pero `lastSeenVersion` ya se actualizó en la Fase A).
- [ ] Verificable sola: al simular un cambio de versión (editar `lastSeenVersion` manualmente a una versión anterior y recargar el plugin), el modal se abre una sola vez con el contenido correcto en el idioma activo de Obsidian; con el ajuste desactivado, no se abre pero tampoco vuelve a aparecer al reactivarlo.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Fetch en vivo desde GitHub Releases; renderizado de Markdown libre (imágenes, video, bloques de código embebidos); preferencia granular "solo versiones con funcionalidad nueva" (mayor/menor) vs. todas; cualquier mecanismo de feedback tipo formulario.

## Próxima fase — v1.1.13: Kanban view (diseño; la Fase A, las piezas compartidas, va en v1.1.12)

> Comportamiento y decisiones: [[Especificación de vistas]] §11. Mecanismo: [[Arquitectura técnica]] §20. **Nada de esta fase está implementado.** Dos decisiones de diseño técnico siguen abiertas (arrastre por etiqueta/carpeta y persistencia del orden manual, ver §20.4).

### Fase A — Piezas compartidas (base para Kanban y Gantt, sin vista nueva)
- [ ] `TaskSorter.groupTasksByField(tasks, field)` genérico, con las columnas de estado en el orden fijo de `CoreTaskStatus` (siempre las 6, aunque estén vacías). Para `path` devuelve un árbol de carpetas, reutilizando `ListView.groupTasksByFolder()`.
- [ ] Barra de filtros reutilizable en `src/core/` ([[Arquitectura técnica]] §20.3), con opciones de estado generadas desde `CoreTaskStatus` + i18n y persistencia por vista; reemplaza los controles hardcodeados de `table-view.hbs`.
- [ ] `attachTaskGestures()` en `src/core/task-gestures.ts` ([[Arquitectura técnica]] §20.3.1): se migra primero el calendario, con la misma lógica de temporizador, y después Lista y Tabla.
- [ ] Separar los ids ([[Arquitectura técnica]] §20.3.2): `ITask.id` siempre `ruta#línea`, el `🆔` en `ITaskFlow.id`; ajustar el extractor, el modal (`isAutoId`) y el atributo `data-task-id` de la Tabla.
- [ ] Escritura segura: `updateTaskLine()` e `insertLineAbove()` con el texto esperado de la línea, búsqueda de la línea exacta y aviso si no se encuentra; actualizar los ~10 sitios que escriben (arrastrar, redimensionar, estado y modal) y probar el cálculo con scripts de Node.
- [ ] Verificable sola: el calendario, la Lista y la Tabla se comportan igual que antes; la Tabla filtra con la barra nueva; Lista y Tabla ganan el menú de estado con clic derecho.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fase B — Vista Kanban (depende de A)
- [ ] `KanbanView` + `KANBAN_VIEW_TYPE`, registrada en `ViewManager`/`index.ts`/`TEMPLATE_LOADERS`, con `kanban-view.hbs` y `_kanban.scss`.
- [ ] Ajuste `showKanbanTab` (default `true`) en `AgendaPluginSettings`/`DEFAULT_SETTINGS`, con su toggle en ambas rutas de `setting-tab.ts`, y la pestaña en el encabezado.
- [ ] Selector de agrupado de columnas: estado (por defecto), prioridad, etiqueta, carpeta; orden ascendente/descendente con `TaskSorter`.
- [ ] Arrastre entre columnas por estado con `upsertTaskStatus()` + `updateTaskLine()`, incluida la ocurrencia siguiente de tareas recurrentes; por prioridad con `upsertPriority()`.
- [ ] Gestos de tarjeta iguales al resto del plugin (clic edita, doble clic abre la nota, clic derecho abre el menú de estado).
- [ ] Claves i18n nuevas en los 6 locales.
- [ ] Verificable sola: arrastrar una tarjeta a "Hecho" agrega ✅ en el archivo y refresca el tablero; arrastrarla de vuelta lo quita.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fase C — Reordenar dentro de una columna (depende de B)
- [ ] Resolver dónde se persiste el orden manual (candidato: `data.json`, por `ruta:línea` o `🆔`) y cómo se invalida cuando cambia el archivo.
- [ ] Arrastrar una tarjeta a otra posición de la misma columna y conservar el orden entre recargas.

### Fuera de alcance
Tableros múltiples guardados; mini-lenguaje de query propio; carriles (swimlanes) plegables; estados personalizables (candidato a v1.1.14); unificar las pestañas Lista y Tabla.

## Próxima fase — v1.1.13: Gantt view (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §12. Mecanismo: [[Arquitectura técnica]] §21. **Nada de esta fase está implementado.** Depende de la Fase A de Kanban (piezas compartidas). Tres decisiones menores siguen abiertas (Especificación §12.7).

### Fase G1 — Gantt de lectura (depende de la Fase A de Kanban)
- [ ] `resolveGanttSpan(task)` en `src/core/task-gantt.ts`: barra, hito o ninguna, según [[Especificación de vistas]] §12.1.
- [ ] Reescribir `GanttView` con el `taskManager` inyectado; registrarla en `ViewManager`, descomentar el botón de `header.hbs` y agregar `showGanttTab` (default `true`) en ambas rutas de `setting-tab.ts`.
- [ ] Plantilla y estilos: cabecera con pestañas de mes, año, franja de días, bandas de semana y línea de «hoy»; barras, hitos y muesca de `scheduled`.
- [ ] Zoom 7/14/21/mes natural con posiciones precalculadas en porcentaje; ◀▶ por ventana o por mes; zoom recordado en `localStorage`.
- [ ] Agrupado por área y sub-área (anidado por carpeta), plegable, con barra resumen por grupo.
- [ ] Contador «N tareas sin fecha» y barras recortadas cuando salen de la ventana.
- [ ] Insignia 🔗 con la tooltip «depende de» en las tareas con `🆔`/`⛔`.
- [ ] Barra de filtros compartida y gestos con `attachTaskGestures()`.
- [ ] Claves i18n nuevas en los 6 locales.
- [ ] Verificable sola: con tareas de una, dos y tres fechas se ven hitos y barras correctas; cambiar de zoom y de mes (28 a 31 días) mantiene las posiciones.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fase G2 — Edición de fechas (depende de G1)
- [ ] Extraer `shiftTaskDates(line, deltaDays)` de `task-recurrence.ts`, sin tocar ➕ ni ✅.
- [ ] Mover la barra o el hito, y redimensionar cada borde, con eventos de puntero y pasos de un día; escritura con `updateTaskLine()`.
- [ ] Tooltip que indica qué campo escribe cada borde; bloquear fin anterior al inicio.
- [ ] Verificable sola: arrastrar un borde cambia solo el campo indicado en la nota; mover la barra desplaza las tres fechas sin tocar `🆔`/`⛔`.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Flechas de dependencia y su aviso de rotura; desplazamiento en cascada de dependientes; zoom por día; Timeline view.

## Próxima fase — v1.1.12: áreas y sub-áreas de tareas (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §13. Mecanismo: [[Arquitectura técnica]] §22. **Nada de esta fase está implementado.** Resuelve la idea de «Grupos de tareas». Una decisión menor sigue abierta (Especificación §13.4).

### Fase AR1 — Núcleo (independiente de las demás)
- [ ] Mover la lógica de áreas de `src/habits/habit.ts` a `src/core/area.ts`, con una única normalización del nombre; `habit.ts` la re-exporta.
- [ ] `resolveTaskArea(filePath)` según la tabla de [[Especificación de vistas]] §13.1: área = primera carpeta, sub-área = resto de la ruta sin tope de niveles, y el grupo «Sin área» para la raíz del vault.
- [ ] Criterios `location.area` y `location.subArea` en `TaskFilter`, con coincidencia de sub-área por prefijo.
- [ ] Verificable sola: un script de Node confirma `resolveTaskArea()` para las cinco rutas de la tabla y el filtro por prefijo; Hábitos se ve igual que antes.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fase AR2 — Filtro y agrupado (depende de AR1 y de la Fase A de Kanban)
- [ ] Combobox de Área y de Sub-área (en cascada, oculto sin área elegida) en la barra de filtros compartida, con opciones tomadas de las tareas cargadas.
- [ ] La Tabla pasa a filtrar sobre datos con `TaskFilter`; se convierte el valor `folder` guardado en `localStorage`.
- [ ] La Tabla reemplaza la columna de carpeta por dos, Área y Sub-área (propuesta, sin confirmar).
- [ ] `GroupField` gana `'area'` y `'subArea'`; `groupTasksByField(tasks, 'area')` devuelve el árbol área → sub-área.
- [ ] Lista agrupa por área y sub-área (anidada por carpeta) y conserva el modo plano.
- [ ] Color por área en las cabeceras de grupo (`getAreaColor`).
- [ ] Claves i18n nuevas en los 6 locales.
- [ ] Verificable sola: elegir un área muestra el combobox de sub-área con solo sus sub-áreas; cambiar de área lo reinicia; Lista y Tabla filtran igual.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Área configurable por tarea o por nota; mover tareas entre áreas arrastrando; áreas sin carpeta.

## Próxima fase — v1.1.12: Lista y Tabla en una sola pestaña (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §14. Mecanismo: [[Arquitectura técnica]] §23. **Nada de esta fase está implementado.** Depende de la Fase A de Kanban (barra de filtros y helper de gestos) y de la fase AR2 (áreas).

### Fase U1 — Estado compartido y barra (depende de la Fase A de Kanban)
- [ ] `src/core/task-view-state.ts` con `TaskViewState` y su persistencia en una sola clave; migración de la clave antigua de la Tabla.
- [ ] La barra de filtros incorpora el combo de agrupado y el control de orden (campo y dirección).
- [ ] Verificable sola: el estado se guarda y se restaura entre recargas, y el valor `folder` antiguo se convierte o se reinicia.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fase U2 — Lista adopta la barra (depende de U1)
- [ ] La Lista usa la barra: gana búsqueda, filtros y orden, que hoy no tiene.
- [ ] El botón jerárquico/plano pasa a ser valores del combo de agrupado: Área y sub-área (anidado), Carpeta (plano) y Sin agrupar.
- [ ] Verificable sola: filtrar y ordenar en la Lista funciona y el agrupado conserva el comportamiento anterior.

### Fase U3 — Tabla adopta la barra (depende de U1)
- [ ] La Tabla filtra sobre datos con `TaskFilter` en lugar de ocultar filas del DOM.
- [ ] Agrupado en la Tabla con filas de cabecera plegables y estado recordado.
- [ ] Los encabezados ordenables actualizan el orden compartido.
- [ ] Ajustar las columnas al ancho disponible del contenedor en `resizeColumns()`: las flexibles se reducen en proporción sin bajar de su mínimo, con la ventana como referencia en escritorio y el ancho del dispositivo en tableta y teléfono; afinar los máximos de Tarea, Carpeta y Etiquetas y dejar que la Tarea se parta en dos líneas.
- [ ] Verificable sola: la Tabla se comporta como antes sin agrupar, y agrupa y pliega al elegir un agrupado.

### Fase U4 — Pestaña única y conmutador (depende de U2 y U3)
- [ ] Conmutador segmentado Lista | Tabla, con las clases del selector del calendario, íconos `list-todo` y `table` y tooltip; cambia de vista con `leaf.setViewState()`.
- [ ] `header.hbs`: un solo botón «Tareas» visible si `showListTab` o `showTableTab`; abre el último modo usado.
- [ ] Excepción de resaltado de pestaña activa en `base-view.ts` para `list-view` y `table-view`.
- [ ] Claves i18n nuevas en los 6 locales.
- [ ] Verificable sola: cambiar de modo conserva búsqueda, filtros, agrupado y orden; la pestaña se ilumina en ambos modos.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fase U5 — Funciones anunciadas de la Tabla (por diseñar, depende de U3)
- [ ] Diseñar y agregar columnas y diseño personalizables de la Tabla (Especificación §14.3).
- [ ] Diseñar y agregar la exportación a CSV (Especificación §14.3).
- [ ] Verificable sola: el README y el manual de usuario dicen lo mismo que hace la Tabla.

### Fuera de alcance
Una clase única `TasksView`; Kanban y Gantt como modos del conmutador; acciones masivas.

## Próxima fase — v1.1.15: sincronía con Google Calendar (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §15. Mecanismo: [[Arquitectura técnica]] §24. **Nada de esta fase está implementada.** Sin decisiones de diseño abiertas (Especificación §15.8). Como el repo no tiene pruebas automatizadas, cada fase incluye sus scripts de prueba de Node.

### Fase GC1 — Conexión
- [ ] Subir `minAppVersion` a 1.11.4 en `manifest.json` y `versions.json`.
- [ ] Grupo **Integraciones** en los ajustes (ambas rutas), con la sincronía apagada por defecto y la lista de pasos para crear las credenciales.
- [ ] `auth.ts`: servidor local en `Platform.isDesktop`, PKCE, `state`, cierre a los 2 minutos, renovación del token y revocación.
- [ ] `crypto.ts`: cifrado con la frase, y la frase en `app.secretStorage`; estados Sin sesión, Bloqueado, Conectado, Token caducado e Iniciar sesión en el escritorio.
- [ ] README: declaración del uso de red.
- [ ] Verificable sola: iniciar sesión en escritorio, reiniciar y seguir conectado; con una frase incorrecta queda Bloqueado. Pruebas de Node del cifrado y de PKCE.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fase GC2 — Descarga y caché (depende de GC1)
- [ ] `client.ts` con reintentos y manejo de 401, 410, 412 y 429; `calendar-sync.ts` con `syncToken` y ventana de −3 a +6 meses.
- [ ] `event-mapping.ts` (§15.3) con sus pruebas de Node, incluidos los eventos de varios días completos y la derivación reversible del id del evento a partir del `🆔` (§17.3), con ids de Tasks que incluyan mayúsculas, `_` y `-`.
- [ ] Lista de calendarios de la cuenta (solo catálogo) con el botón «Añadir calendario», que crea la nota espejo con su frontmatter (`agenda-origin: google-calendar`; carpeta por defecto `temporal/agenda/`).
- [ ] Detección de las notas de sincronización por frontmatter (`agenda-origin`, `agenda-sync`, `agenda-calendar`, `agenda-account` opcional, `agenda-allow-edit`), con avisos por frontmatter inválido o por dos espejo del mismo calendario.
- [ ] Importación a la nota espejo con el `🆔` del evento en cada línea, buscando antes el par (calendario, `🆔`) en todo el vault para no duplicar una tarea que ya vive en una nota local; aviso por `🆔` repetido.
- [ ] Verificable sola: los eventos aparecen como líneas con fecha, hora y duración; una segunda sincronización no duplica nada.

### Fase GC3 — Envío (depende de GC2)
- [ ] Calendario dedicado creado por el plugin y propiedad privada que marca los eventos propios.
- [ ] Acción «Enviar a Google Calendar» (menú contextual y Task Modal): escribe el `🆔` en la línea (lo genera si falta) sin moverla y crea el evento en el calendario de la nota con el id derivado del `🆔`; si la nota no declara origen y calendario, pregunta y los guarda en su frontmatter (`agenda-origin: agenda-task`). Una línea está vinculada si su `🆔` coincide con un evento del plugin (Especificación §17.6).
- [ ] Parches de título, inicio y fin con `If-Match` y `sendUpdates=none`; `agenda-allow-edit` en el frontmatter de cada nota (`false` por defecto, `true` en la del calendario dedicado).
- [ ] Verificable sola: crear una tarea con hora y enviarla crea el evento; cambiar la hora en la nota lo actualiza en Google sin tocar su descripción ni sus invitados.

### Fase GC4 — Planificador y barreras (depende de GC3)
- [ ] `sync-planner.ts` con el desempate por última modificación; un evento cancelado queda como `[-]` y uno rechazado como `[~]` en la nota.
- [ ] Diálogo de revisión (5 o más borrados, 25 o más cambios), rechazo por encima de 200, notas con líneas inválidas omitidas.
- [ ] Disparadores y comando «Sincronizar ahora».
- [ ] Pruebas con un transporte falso de Google: 410, 412, 409 y las barreras.
- [ ] Verificable sola: un cambio en ambos lados gana el más reciente con aviso; borrar muchas líneas pide aprobación.

### Fase GC5 — Móvil (depende de GC1)
- [ ] Rama de ajustes para móvil con los estados «Inicia sesión en el escritorio» y «Escribe la frase».
- [ ] Comprobar que `esbuild.config.mjs` deja `http` fuera del paquete de móvil.
- [ ] Verificable sola: en iOS y Android, tras iniciar sesión en el escritorio y escribir la frase, la sincronización funciona sin pantalla de inicio de sesión.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Google Tasks, Microsoft y el plugin Tasks; varias cuentas de Google; `🔁` ↔ RRULE; el botón directo sin credenciales propias; inicio de sesión por copiar y pegar en móvil.
