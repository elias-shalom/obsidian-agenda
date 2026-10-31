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

## Próxima fase — v1.1.13: modal de novedades al actualizar (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §10. Mecanismo: [[Arquitectura técnica]] §19. **Implementada; falta la prueba manual (Fase C, «Verificable sola»).**

### Fase A — Settings y disparador
- [x] Nuevo campo `lastSeenVersion` (string) en `AgendaPluginSettings`/`DEFAULT_SETTINGS`.
- [x] Nuevo campo `showWhatsNewOnUpdate` (boolean, default `true`) en `AgendaPluginSettings`/`DEFAULT_SETTINGS`, con su toggle en **Configuración general** (ambas rutas: API declarativa y `display()` legado).
- [x] `main.ts` → `onload()`: tras `loadSettings()`, comparar `manifest.version` contra `settings.lastSeenVersion`; si difieren, actualizar y guardar `lastSeenVersion` de inmediato (antes de decidir si se muestra el modal).

### Fase B — Contenido localizado (depende de A)
- [x] Nuevas claves de "novedades" por versión en `src/locales/*.json` (6 idiomas), espejando (resumido) el bloque "News" que ya se redacta a mano en `README.md` por cada release.
- [x] Función que, dado `lastSeenVersion`, resuelve la lista de versiones posteriores con contenido a mostrar, de la más reciente a la más antigua (acumulativo, no solo la última versión).

- [ ] Cierre de v1.1.13 (Fase 9): revisar la entrada `whats_new.v1_1_13` en los 6 idiomas y completarla con lo que se publique (Kanban, Gantt).

### Fase C — Modal (depende de A y B)
- [x] Nuevo `src/modals/whats-new-modal.ts` + `src/modals/templates/whats-new-modal.hbs`.
- [x] Botón de cierre propio, visible dentro del contenido (no depende únicamente del cierre nativo del modal de Obsidian).
- [x] Si `showWhatsNewOnUpdate` es `false`, el modal no se abre (pero `lastSeenVersion` ya se actualizó en la Fase A).
- [ ] Verificable sola: al simular un cambio de versión (editar `lastSeenVersion` manualmente a una versión anterior y recargar el plugin), el modal se abre una sola vez con el contenido correcto en el idioma activo de Obsidian; con el ajuste desactivado, no se abre pero tampoco vuelve a aparecer al reactivarlo.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Fetch en vivo desde GitHub Releases; renderizado de Markdown libre (imágenes, video, bloques de código embebidos); preferencia granular "solo versiones con funcionalidad nueva" (mayor/menor) vs. todas; cualquier mecanismo de feedback tipo formulario.

## Próxima fase — v1.1.13: Kanban view (diseño; la Fase A, las piezas compartidas, va en v1.1.12)

> Comportamiento y decisiones: [[Especificación de vistas]] §11. Mecanismo: [[Arquitectura técnica]] §20. **Fases A y B implementadas (la B, pendiente de prueba manual); la C pasa a v1.1.14.** El arrastre se resolvió: solo estado y prioridad. El orden manual (Fase C) se pospone a v1.1.14 (ver §20.4). La Fase B2 (columnas plegables y altura máxima) está implementada, pendiente de prueba manual; el agrupado por área y sub-área pasa a v1.1.14 (Especificación §11.3).

### Fase A — Piezas compartidas (base para Kanban y Gantt, sin vista nueva)
- [x] `TaskSorter.groupTasksByField(tasks, field)` genérico, con las columnas de estado en orden de flujo de trabajo (el del menú de estado: To-do, En progreso, En espera, Hecho, Cancelada, No es tarea; siempre las 6, aunque estén vacías). Para `path` devuelve un árbol de carpetas; la lógica vive en `src/core/task-grouping.ts` y `BaseView.groupTasksByFolder()` delega en ella. Falta `'area'`/`'subArea'` (AR2) y que Lista y Tabla lo usen (U2/U3).
- [x] Barra de filtros reutilizable en `src/core/` ([[Arquitectura técnica]] §20.3), con opciones de estado generadas desde `STATUS_OPTIONS` + i18n y persistencia por vista; reemplaza los controles hardcodeados de `table-view.hbs`. Hecho: `TaskFilterBar` (`src/core/task-filter-bar.ts`, estilos en `_task-filter-bar.scss`); la Tabla la monta y filtra sobre datos con `filterTasksByViewState()` (`src/core/task-view-state.ts`). El combo de agrupado solo se muestra si la vista pasa `groupOptions` (la Tabla lo hará en U3; la Lista, en U2).
- [x] `attachTaskGestures()` en `src/core/task-gestures.ts` ([[Arquitectura técnica]] §20.3.1): se migra primero el calendario, con la misma lógica de temporizador, y después Lista y Tabla. Hecho: calendario, Lista y Tabla; en Lista y Tabla `onChanged` pasa a ser `refreshView()` (lectura forzada, como en el calendario) en lugar de `onOpen()`.
- [x] Separar los ids ([[Arquitectura técnica]] §20.3.2): `ITask.id` siempre `ruta#línea`, el `🆔` en `ITaskFlow.id`; ajustar el extractor, el modal (`isAutoId`) y el atributo `data-task-id` de la Tabla (el atributo conserva `{{id}}`, que ahora es la posición; nada lo lee).
- [x] Escritura segura: `updateTaskLine()` e `insertLineAbove()` con el texto esperado de la línea, búsqueda de la línea exacta y aviso si no se encuentra (`locateTaskLine()` en `src/core/task-line-locator.ts`; `updateTaskLine()` devuelve dónde escribió y la ocurrencia recurrente se inserta con ese resultado; `CalendarView.writeTaskLine()` toma el texto esperado de la tarea dibujada y avisa con `task_line_changed`); actualizar los ~10 sitios que escriben (arrastrar, redimensionar, estado y modal) y probar el cálculo con scripts de Node.
- [x] Verificable sola: el calendario, la Lista y la Tabla se comportan igual que antes; la Tabla filtra con la barra nueva; Lista y Tabla ganan el menú de estado con clic derecho. (probado a mano)
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase B — Vista Kanban (depende de A)
- [x] `KanbanView` + `KANBAN_VIEW_TYPE`, registrada en `ViewManager`/`index.ts`/`TEMPLATE_LOADERS`, con `kanban-view.hbs` y `_kanban.scss`.
- [x] Ajuste `showKanbanTab` (default `true`) en `AgendaPluginSettings`/`DEFAULT_SETTINGS`, con su toggle en ambas rutas de `setting-tab.ts`, y la pestaña en el encabezado.
- [x] Selector de agrupado de columnas: estado (por defecto), prioridad, etiqueta, carpeta; orden ascendente/descendente con `TaskSorter`.
- [x] Arrastre entre columnas por estado con `upsertTaskStatus()` + `updateTaskLine()`, incluida la ocurrencia siguiente de tareas recurrentes; por prioridad con `upsertPriority()`.
- [x] Gestos de tarjeta iguales al resto del plugin (clic edita, doble clic abre la nota, clic derecho abre el menú de estado).
- [x] Claves i18n nuevas en los 6 locales.
- [ ] Verificable sola: arrastrar una tarjeta a "Hecho" agrega ✅ en el archivo y refresca el tablero; arrastrarla de vuelta lo quita.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase B2 — Refinamientos del tablero (implementados; pendiente de prueba manual; depende de B)
- [x] `src/core/kanban-collapse.ts` (puro): `resolveCollapsed()` (la elección guardada manda; sin ella, una columna vacía está plegada) y la clave de almacenamiento por agrupado y columna.
- [x] Plantilla y estilos: encabezado como botón con `aria-expanded`; columna plegada de ancho fijo con el nombre en vertical (`writing-mode`) y el contador; el clic en el encabezado o en la barra alterna y guarda la elección.
- [x] Soltar sobre una columna plegada: sigue aceptando y resaltándose; al recibir la tarjeta se borra la elección guardada y la columna se despliega.
- [x] Altura: columnas ajustadas al contenido hasta la altura visible del panel (menos la barra de filtros, con `ResizeObserver`); encabezado fijo y tarjetas con desplazamiento propio.
- [x] Claves i18n `kanban_collapse_column` y `kanban_expand_column` en los 6 locales.
- [ ] Verificable sola: Node (`resolveCollapsed()` y la plantilla con columnas plegadas). Prueba manual: plegar, desplegar y recargar; las vacías arrancan plegadas; soltar sobre una plegada; una columna con muchas tareas desplaza por su cuenta y el arrastre sigue funcionando dentro de ella; panel dividido y teléfono emulado.
- [x] `npm run build` y ESLint sobre los archivos tocados.
- [ ] Agrupar el tablero por área y sub-área: **pasa a v1.1.14** (Especificación §11.3, opciones A, B y C).

### Fase C — Reordenar dentro de una columna (pospuesta a v1.1.14; depende de B)
- [ ] Aplazada por decisión del 2026-10-31: no es necesaria para v1.1.13. La propuesta de diseño y las preguntas abiertas están en [[Arquitectura técnica]] §20.4.
- [ ] Resolver dónde se persiste el orden manual (candidato: `data.json`, por `ruta:línea` o `🆔`) y cómo se invalida cuando cambia el archivo.
- [ ] Arrastrar una tarjeta a otra posición de la misma columna y conservar el orden entre recargas.

### Fuera de alcance
Tableros múltiples guardados; mini-lenguaje de query propio; carriles (swimlanes) plegables; estados personalizables (candidato a v1.1.14); unificar las pestañas Lista y Tabla.

## Próxima fase — v1.1.13: Gantt view (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §12. Mecanismo: [[Arquitectura técnica]] §21. **G1 implementada (pendiente de prueba manual); G2, pendiente.** Depende de la Fase A de Kanban (piezas compartidas). Las decisiones de la Especificación §12.7 se tomaron el 2026-10-31 y no queda ninguna abierta.

### Fase G1 — Gantt de lectura (depende de la Fase A de Kanban)
- [x] `resolveGanttSpan(task)` en `src/core/task-gantt.ts`: barra, hito o ninguna, según [[Especificación de vistas]] §12.1.
- [x] Reescribir `GanttView` con el `taskManager` inyectado; registrarla en `ViewManager`, descomentar el botón de `header.hbs` y agregar `showGanttTab` (default `true`) en ambas rutas de `setting-tab.ts`.
- [x] Plantilla y estilos: cabecera con pestañas de mes, año, franja de días, bandas de semana y línea de «hoy»; barras, hitos y muesca de `scheduled`.
- [x] Zoom 7/14/21/mes natural con posiciones precalculadas en porcentaje; las ventanas de 7/14/21 días empiezan en el primer día de semana configurado que contiene la fecha de referencia; ◀▶ por ventana o por mes; zoom recordado en `localStorage`.
- [x] Agrupado por área y sub-área (anidado por carpeta), plegable; la cabecera de grupo no lleva barra resumen (retirada tras la primera revisión visual).
- [x] Barra de controles a la derecha (zoom y `◀ Hoy ▶`, como el calendario) y cuadrícula vertical (línea de día, línea de semana más marcada, fines de semana sombreados).
- [ ] Combo de agrupado del Gantt: pasa a v1.1.14 (Arquitectura §21.9).
- [x] Ajustes visuales tras la revisión: zoom con número e icono de mes, cabecera de grupo sin barra y tareas sin fecha como grupo plegable al estilo de la Lista (máx. 80 %).
- [x] Contador «N tareas sin fecha» y barras recortadas cuando salen de la ventana.
- [x] Fin anterior al inicio en datos escritos a mano: se dibuja como hito en la fecha de inicio, con un aviso.
- [x] Insignia 🔗 con la tooltip «depende de» en las tareas con `🆔`/`⛔`.
- [x] Barra de filtros compartida y gestos con `attachTaskGestures()`.
- [x] Claves i18n nuevas en los 6 locales.
- [x] Pruebas de Node: `resolveGanttSpan()` en todos los casos de §12.1 (incluido el fin anterior al inicio y la hora de ⏳ ignorada), ventanas de 7/14/21 días con cada inicio de semana y mes natural de 28 a 31 días, posiciones recortadas por cada lado, un cambio de hora, bandas de semana, filas agrupadas (solo tareas dentro de la ventana, grupos plegados y vacíos), dependencias, estado y zoom, plantilla, encabezado y los 6 locales (98 comprobaciones).
- [ ] Verificable sola: con tareas de una, dos y tres fechas se ven hitos y barras correctas; cambiar de zoom y de mes (28 a 31 días) mantiene las posiciones.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase G2 — Edición de fechas (depende de G1)
- [ ] Extraer `shiftTaskDates(line, deltaDays)` de `task-recurrence.ts`, sin tocar ➕ ni ✅.
- [ ] Mover la barra o el hito, y redimensionar cada borde, con eventos de puntero y pasos de un día; escritura con `updateTaskLine()`.
- [ ] Tooltip que indica qué campo escribe cada borde; bloquear fin anterior al inicio.
- [ ] Convertir un hito en barra con su manija: `start` crea `scheduled`, `scheduled` crea `due` y un hito con solo `due` crea `start` con la manija a la izquierda (Especificación §12.7).
- [ ] Verificable sola: arrastrar un borde cambia solo el campo indicado en la nota; mover la barra desplaza las tres fechas sin tocar `🆔`/`⛔`.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Flechas de dependencia y su aviso de rotura; desplazamiento en cascada de dependientes; zoom por día; Timeline view.

## Próxima fase — v1.1.12: áreas y sub-áreas de tareas (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §13. Mecanismo: [[Arquitectura técnica]] §22. **Nada de esta fase está implementado.** Resuelve la idea de «Grupos de tareas». Una decisión menor sigue abierta (Especificación §13.4).

### Fase AR1 — Núcleo (independiente de las demás)
- [x] Mover la lógica de áreas de `src/habits/habit.ts` a `src/core/area.ts`, con una única normalización del nombre (`normalizeAreaName()`); `habit.ts` la re-exporta. Se eliminó `HABIT_AREA_TEXT_COLORS` (obsoleta y sin usos).
- [x] `resolveTaskArea(filePath)` según la tabla de [[Especificación de vistas]] §13.1: área = primera carpeta, sub-área = resto de la ruta sin tope de niveles; para la raíz del vault devuelve cadenas vacías y el grupo «Sin área» es cosa de la interfaz (AR2).
- [x] Criterios `location.area` y `location.subArea` en `TaskFilter` (vía `matchesTaskArea()`), con coincidencia de sub-área por prefijo de carpeta.
- [x] Verificable sola: un script de Node confirma `resolveTaskArea()` para las cinco rutas de la tabla y el filtro por prefijo; Hábitos se ve igual que antes (comprobado en el script: etiquetas y colores sin cambios; falta la comprobación visual en Obsidian).
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase AR2 — Filtro y agrupado (depende de AR1 y de la Fase A de Kanban)
- [x] Combobox de Área y de Sub-área (en cascada, oculto sin área elegida) en la barra de filtros compartida, con opciones tomadas de las tareas cargadas.
- [x] La Tabla pasa a filtrar sobre datos con `TaskFilter`; se convierte el valor `folder` guardado en `localStorage`.
- [x] La Tabla conserva la columna de carpeta, renombrada Área (sin columna de Sub-área); la ruta del archivo va pequeña bajo la tarea.
- [x] `GroupField` gana `'area'`; `groupTasksByField(tasks, 'area')` devuelve el árbol área → sub-área (las notas de la raíz, como «Sin área», al final). `'subArea'` (grupos planos «Área · sub-área») queda para Kanban y Gantt (v1.1.13).
- [x] Lista agrupa por área y sub-área (anidada por carpeta) y conserva el modo plano (valor «Carpeta» del combo).
- [x] Color por área en las cabeceras de grupo (`getAreaColor`, franja a la izquierda; los hijos heredan el color).
- [ ] Claves i18n nuevas en los 6 locales.
- [x] Verificable sola: elegir un área muestra el combobox de sub-área con solo sus sub-áreas; cambiar de área lo reinicia; Lista y Tabla filtran igual. (probado a mano)
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Área configurable por tarea o por nota; mover tareas entre áreas arrastrando; áreas sin carpeta.

## Próxima fase — v1.1.12: Lista y Tabla en una sola pestaña (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §14. Mecanismo: [[Arquitectura técnica]] §23. **Nada de esta fase está implementado.** Depende de la Fase A de Kanban (barra de filtros y helper de gestos) y de la fase AR2 (áreas).

### Fase U1 — Estado compartido y barra (depende de la Fase A de Kanban)
- [x] `src/core/task-view-state.ts` con `TaskViewState` y su persistencia en una sola clave (`obsidian-agenda-task-view-state`); migración de la clave antigua de la Tabla (`folder` pasa a `area`, la prioridad a minúsculas).
- [x] La barra de filtros incorpora el combo de agrupado y el control de orden (campo y dirección), opcionales según lo que pase la vista. La Tabla ya usa el de orden, sincronizado con los encabezados de columna.
- [x] Verificable sola: el estado se guarda y se restaura entre recargas, y el valor `folder` antiguo se convierte o se reinicia. (probado a mano)
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase U2 — Lista adopta la barra (depende de U1)
- [x] La Lista usa la barra: gana búsqueda, filtros y orden, que hoy no tiene. El orden usa `sortTasksByColumn()` (`src/core/task-column-sort.ts`, las columnas de la Tabla; sin fecha de vencimiento siempre al final) y el estado se lee al abrir y se escribe al cambiar. Al cambiar un control solo se redibuja el cuerpo de la lista, no la barra.
- [x] El botón jerárquico/plano pasa a ser valores del combo de agrupado: Área y sub-área (anidado, por defecto), Carpeta (plano), Sin agrupar, y además Estado, Prioridad, Etiqueta y Vencimiento. El agrupado guardado vacío significa «el de cada vista»; las claves de plegado de las carpetas se conservan.
- [x] Verificable sola: filtrar y ordenar en la Lista funciona y el agrupado conserva el comportamiento anterior (comprobado con script de Node: árbol, orden y plantilla; falta la comprobación visual en Obsidian). (probado a mano)

### Fase U3 — Tabla adopta la barra (depende de U1)
- [x] La Tabla filtra sobre datos con `TaskFilter` en lugar de ocultar filas del DOM (las filas se identifican con `data-task-id`).
- [x] Agrupado en la Tabla con filas de cabecera plegables y estado recordado (mismos valores que la Lista; por defecto sin agrupar; el plegado comparte clave con la Lista).
- [x] Los encabezados ordenables actualizan el orden compartido. La Tabla ordena y agrupa sobre datos con `sortTasksByColumn()` y `groupTasksForView()` y redibuja solo las filas (`refreshRows()`); la columna Carpeta ordena ahora por área y luego por ruta.
- [x] Ajustar las columnas al ancho disponible del contenedor en `resizeColumns()`: las flexibles se reducen en proporción sin bajar de su mínimo, con la ventana como referencia en escritorio y el ancho del dispositivo en tableta y teléfono; máximos afinados (Tarea 520, Área 160, Etiquetas 240) y la ruta bajo la tarea no cuenta para el ancho.
- [x] Verificable sola: la Tabla se comporta como antes sin agrupar, y agrupa y pliega al elegir un agrupado (comprobado con script de Node: orden, filas y plantilla; falta la comprobación visual en Obsidian, incluido el ajuste de ancho en tableta y teléfono). (probado a mano)

### Fase U4 — Pestaña única y conmutador (depende de U2 y U3)
- [x] Conmutador segmentado Lista | Tabla, con las clases del selector del calendario, íconos `list-todo` y `table` y tooltip; cambia de vista con `viewManager.activateView()` sobre la misma hoja (`buildTaskModeSwitch()` en `src/core/task-filter-bar.ts`; se oculta si solo un modo está visible).
- [x] `header.hbs`: un solo botón «Tareas» (`oa-tasks-view-tab`) visible si `showListTab` o `showTableTab`; abre el último modo usado (`TaskViewState.mode`, que cada vista guarda al abrirse; `getDefaultTasksView()` en `base-view.ts`).
- [x] Excepción de resaltado de pestaña activa en `base-view.ts` para `list-view` y `table-view`.
- [x] Claves i18n nuevas en los 6 locales (`tasks_view_tab`). Las vistas guardan el agrupado solo si el cambio fue el del propio agrupado (`persistTaskViewState()`), para que el agrupado por defecto de cada vista no quede fijado al cambiar otro control.
- [x] Verificable sola: cambiar de modo conserva búsqueda, filtros, agrupado y orden; la pestaña se ilumina en ambos modos (el estado se comprobó con script de Node; falta la comprobación visual en Obsidian). (probado a mano)
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase U5 — Funciones anunciadas de la Tabla (pasa a v1.1.14; por diseñar, depende de U3 y U7)
- [ ] Diseñar y agregar columnas y diseño personalizables de la Tabla (Especificación §14.3).
- [ ] Diseñar y agregar la exportación a CSV (Especificación §14.3).
- [ ] Verificable sola: el README y el manual de usuario dicen lo mismo que hace la Tabla (al implementarlo en v1.1.14 se vuelven a anunciar).

### Fase U6 — Barra de filtros con chips (pulido estético, depende de U1; diseño en [[Especificación de vistas]] §14.4 y [[Arquitectura técnica]] §23.7)
- [x] **U6.1 Lógica pura**: nuevo `src/core/task-filter-chips.ts` con `FilterChipId`, `getActiveFilterChips()`, `clearFilterChip()`, `clearAllFilters()` y `getFilterValueOptions()`; `PRIORITY_OPTIONS` y `DUE_OPTIONS` se movieron allí desde `task-filter-bar.ts`.
- [x] **U6.2 Maquetación**: fila principal con el conmutador, + Filtro, agrupado, orden y la búsqueda a la derecha (`margin-left: auto`), y fila de chips oculta si no hay filtros activos (`:not(:empty)`); la búsqueda pasa a su propia línea con un `@container` bajo 560 px.
- [x] **U6.3 Menús**: botón + Filtro con el `Menu` nativo en pasos (tipo, valor y, para Área con sub-áreas, sub-área), colocado con `showAtPosition()`; el siguiente menú se abre con `window.setTimeout(…, 0)` para que no lo cierre el clic que cerró el anterior; sustituyen los cinco combos de filtro.
- [x] **U6.4 Chips**: un chip por filtro activo con su ×, clic en el chip para cambiar el valor, y botón Limpiar (no toca la búsqueda); `renderChips()` desde `update()` cuando cambia un filtro.
- [x] **U6.5 Estilos**: chips y × con `padding … !important` por el relleno de Obsidian en tableta, `max-width` con puntos suspensivos, estados `hover`/`focus-visible`; se quitaron las reglas de los combos de filtro.
- [x] **U6.6 i18n**: claves `filter_add`, `filter_clear` y `filter_remove` en los 6 idiomas; eliminadas `all_priorities`, `all_tasks`, `all_areas` y `all_dates` (sin otros usos). Una sub-área guardada que ya no existe también se reinicia al abrir.
- [x] Verificable sola con un script de Node (`task-filter-chips.ts`): los chips de cada combinación de estado, quitar Área reinicia la sub-área, Limpiar no toca búsqueda ni orden ni agrupado, y los valores no incluyen «Todos».
- [x] Prueba manual: escritorio, `app.emulateMobile(true)` en ventana estrecha (`is-phone`) y ancha (`is-tablet`), tema claro y oscuro, teclado (Tab, Enter y Escape en los menús), y que cambiar de Lista a Tabla conserva los chips. (probado a mano)
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase U7 — Columnas de fechas de la Tabla y filtros por fecha (depende de U3 y U6; diseño en [[Especificación de vistas]] §14.5 y [[Arquitectura técnica]] §23.8)
- [x] **U7.1 Estado y filtrado**: campos `start` y `scheduled` en `TaskViewState`; `matchesDateFilter()` por día para los tres tipos (la vencida solo con tarea abierta); `filterTasksByViewState()` sin `dueDateRelative` ni `hasAnyDate()`.
- [x] **U7.2 Chips**: `FilterChipId` con `start` y `scheduled` (seis tipos en + Filtro), `getFilterValueOptions()` por tipo con los textos de Vencimiento y de Inicio/Programada.
- [x] **U7.3 Orden**: `start`, `scheduled` y `closed` en `TASK_SORT_COLUMNS` y en `sortTasksByColumn()` (sin fecha al final en las dos direcciones; el cierre es la fecha de hecha o de cancelada).
- [x] **U7.4 Modelo de columnas**: nuevo `src/core/task-table-columns.ts` con las columnas, sus límites de ancho y `getColumnVisibility(tasks)` (las de fechas se ocultan si ninguna tarea cargada tiene valor).
- [x] **U7.5 Plantilla y estilos de la Tabla**: encabezados y celdas por columna visible con `data-column`, `colspan` de las cabeceras de grupo según las visibles, cuatro columnas de fechas con la secundaria en una segunda línea, primera columna sin números de fila (solo el total en el encabezado), vencida y de hoy calculadas en TypeScript.
- [x] **U7.6 `resizeColumns()`**: límites por columna (`data-column`) con los anchos de §14.5 (Tarea 170–380, Prioridad y Estado 36–44, Área 72–140, fechas 90–120, Etiquetas 80–200).
- [x] **U7.7 i18n**: textos nuevos y corregidos en los 6 idiomas (`date_past`, `date_today`, `date_this_week`, `date_future`, `column_start`, `column_scheduled`, `column_due`, `column_closed`, `due_today`, `due_this_week`, `has_any_date`); eliminar `dates` y, si no tiene otros usos, `future_tasks`.
- [x] Verificable sola con un script de Node: `matchesDateFilter()` para cada valor y tipo (incluida la vencida solo con tarea abierta), chips y valores de los seis tipos, orden por las columnas nuevas con las sin fecha al final, y `getColumnVisibility()` con y sin tareas que tengan cada fecha.
- [x] Prueba manual: tabla con todas las fechas y tabla sin Inicio ni Cerrada; filtros de los tres tipos; orden desde el encabezado y desde la barra; cabeceras de grupo con el `colspan` correcto; anchos en escritorio, tableta y teléfono emulados. (probado a mano)
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase U8 — Refresco automático de las vistas (diseño en [[Especificación de vistas]] §14.6 y [[Arquitectura técnica]] §23.9)
- [x] **U8.1 Núcleo puro**: `refresh-scheduler.ts`, `task-signature.ts`, `day-change.ts` y `scroll-state.ts` en `src/core/`.
- [x] **U8.2 Eventos y tareas**: `tasks:changed`, `habits:updated`, `day:changed` y `listenerCount()` en `EventBus`; `TaskManager` emite `tasks:changed` solo si cambia la firma.
- [x] **U8.3 Hábitos**: `HabitManager` emite `habits:updated` solo si cambia la huella de la carpeta de hábitos.
- [x] **U8.4 Medianoche**: `main.ts` inicia y detiene `DayChangeWatcher`.
- [x] **U8.5 `BaseView`**: suscripción y baja, aplazado con `isBusy()`, vista oculta pendiente hasta activarse, refresco silencioso (`runAutoRefresh()`) sin pantalla de carga y con scroll conservado, firma de lo cargado en `getAllTasks()`; `refreshView()` cancela la petición pendiente.
- [x] **U8.6 `HabitView`**: `performAutoRefresh()` propio; el evento `obsidian-agenda:habits-refresh` cancela la petición pendiente.
- [x] Verificable sola con un script de Node: el programador (agrupa, aplaza si está ocupado, repite una vez si llega otra petición durante la ejecución, cancela), la firma (cambia con el texto de una línea o con una tarea nueva, no con otra nota), `msUntilNextMidnight()` incluido un cambio de horario, y el emisor de `TaskManager` con un gestor simulado.
- [x] Prueba manual: editar una tarea en otro panel y ver el cambio en la Lista, la Tabla y el Calendario; guardar una nota sin tareas (no debe redibujar); escribir en la búsqueda mientras se edita en otro panel; arrastrar en el Calendario mientras llegan cambios; la Rutina pasada la medianoche; scroll, filtros y grupos plegados conservados; vista en otra pestaña que se actualiza al volver; editar desde la propia Tabla (un solo redibujo). (probado a mano)
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Una clase única `TasksView`; Kanban y Gantt como modos del conmutador; acciones masivas.

## Próxima fase — v1.1.13: ajustes de pestañas y carpeta de hábitos (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §18. Mecanismo: [[Arquitectura técnica]] §25. **Nada de esta fase está implementado.** Sin decisiones de diseño abiertas. Cada fase incluye sus scripts de prueba de Node.

### Fase S1 — Visibilidad de pestañas
- [x] `showTasksTab` y `showHabitTab` (por defecto `true`) en `settings.ts`; se eliminan `showListTab` y `showTableTab`.
- [x] `migrateTabSettings()` puro, llamado desde `loadSettings()`: `showTasksTab` queda desactivado solo si los dos ajustes antiguos estaban desactivados; se borran las claves antiguas.
- [x] `header.hbs`: la pestaña Tareas depende de `showTasksTab`; la de Hábitos, de `showHabitTab` y de al menos una subvista activa.
- [x] `buildTaskModeSwitch()` siempre con Lista y Tabla; `getDefaultTasksView()` sin comprobar visibilidad.
- [x] `setting-tab.ts`: interruptores «Show Tasks tab» y «Show Habits tab» en `getSettingDefinitions()` y en `display()`; se quitan los de List y Table.
- [x] Verificable sola: `migrateTabSettings()` con las cuatro combinaciones antiguas y con ajustes nuevos.

### Fase S2 — Carpeta de hábitos (depende de ninguna)
- [x] `src/habits/habit-folder.ts`: `normalizeHabitFolderPath()` y `evaluateHabitFolderHint()`.
- [x] `HabitManager.ensureFolder()` y el parámetro `saveSettings` del constructor.
- [x] `HabitFolderModal` con ruta editable, validación en vivo, Crear y Cancelar; estilos reutilizados del Habit Editor.
- [x] `HabitEditorModal.save()`: al crear con la carpeta inexistente, pregunta, crea la ruta y guarda la ruta nueva en Ajustes si cambió; con Cancelar no guarda; un error al crear se avisa sin guardar el hábito.
- [x] Verificable sola: rutas válidas, absolutas, con `..`, con caracteres no permitidos y vacías; `ensureFolder()` con un vault simulado (orden de creación, carpeta existente y choque con un archivo).

### Fase S3 — Vistas de hábitos sin hábitos (depende de S2)
- [x] `HabitView.getEmptyMessage()` y su uso en las cinco vistas; Rutina y Dashboard reciben `emptyMessage` y sus plantillas lo muestran.
- [x] Verificable sola: con cero hábitos y con la carpeta inexistente, las cinco vistas se muestran sin error, con el mensaje y la ruta.

### Fase S4 — Aviso en Ajustes (depende de S2)
- [x] Campo de la ruta como `render` personalizado con aviso de tres estados (existe, no existe, ruta no válida), recalculado con `debounce` de 500 ms; guarda `habitFolderPath` a mano; mismo resultado en `display()`.
- [x] Claves i18n nuevas en los 6 locales y se eliminan `show_list_tab` y `show_table_tab`.
- [x] Verificable sola: `evaluateHabitFolderHint()` para cada estado.
- [ ] Documentación al implementar: README, manual en/es (Tab Visibility y carpeta de hábitos) y «News» de la versión.
- [ ] Prueba manual: ocultar Tareas y Hábitos desde Ajustes; actualizar desde una configuración con solo la Tabla visible; crear el primer hábito sin carpeta (Crear, Cancelar y ruta nueva); escribir rutas válidas y no válidas en Ajustes; abrir las cinco vistas sin hábitos.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase S5 — Rótulos de los combos de hábitos (independiente; diseño en [[Especificación de vistas]] §18.6 y [[Arquitectura técnica]] §25.8)
- [x] i18n: `habit_sort_label` y `habit_group_label` en los 6 idiomas; `habit_sort_daytime` en español pasa a «Por momento del día».
- [x] Plantillas de Cuadrícula, Semanal y Rutina: `data-label` en el contenedor y `aria-label` y `title` en el `<select>`; el combo de agrupar de Rutina usa `habit_daytime` y `habit_area`.
- [x] Estilos del prefijo en `_habit-common.scss` (`::before` con `attr(data-label)`), sin romper la barra en tableta y teléfono.
- [x] Verificable sola: script de Node que comprueba que los 6 locales tienen las dos claves nuevas.
- [ ] Prueba manual: los combos de Cuadrícula, Semanal y Rutina con su rótulo en escritorio, `is-tablet` e `is-phone`, tema claro y oscuro; cambiar de idioma; el orden y la agrupación elegidos siguen funcionando.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Crear carpetas sin preguntar; botones nuevos en las vistas; migrar hábitos existentes.

## Corrección — v1.1.13: etiquetas del día de la semana (implementado; pendiente de prueba manual)

> Mecanismo: [[Arquitectura técnica]] §27. Reportado y corregido por @AidanAJoyce (PR #58).

### Fase W1 — Índice del nombre del día
- [x] Corrección aportada en el PR #58 (@AidanAJoyce): el índice del nombre del día es `(weekday - weekStartDay + 7) % 7`; no hay función aparte.
- [x] `CalendarWeekView`, `CalendarWorkWeekView` y `CalendarListView` usan esa expresión con `this.getWeekStartDay()` en lugar de `weekday % 7`.
- [x] Verificable sola: `node --test tests/calendar-weekday-labels.test.cjs` (21 pruebas del PR: 3 vistas por los 7 inicios de semana, en inglés y español, con tres zonas horarias y fechas límite); 21 de 21 pasan.
- [ ] Prueba manual: inicio de semana en lunes y en domingo; 31 de octubre de 2026 es «Sat», 1 de noviembre «Sun» y 2 de noviembre «Mon» en Semana, Semana laboral y Lista; las tareas siguen en su fecha.
- [x] `npm run build` y ESLint sobre los archivos tocados.
- [x] Integración: revisión del PR, merge en `features/develop` con la autoría de Aidan y comentario en el PR, que queda abierto hasta que la versión llegue a `main` (Arquitectura §27.1).
- [x] README: sección Contributors con el crédito.
- [ ] Al cerrar la versión (Fase 9): nota en el Changelog de la versión con el crédito a @AidanAJoyce (PR #58).

### Fuera de alcance
La alineación de la vista Semana con `weekStartDay` (usa la semana ISO de Luxon; ver Especificación §4.7) y las vistas Día, Mes y Año.

## Próxima fase — v1.1.13: ajustes de filtros y rótulos (diseño)

> Comportamiento: [[Especificación de vistas]] §13.2, §14.7 y §18.6. Mecanismo: [[Arquitectura técnica]] §26. **F1, F2 y F3 implementadas (pendientes de prueba manual).** Sin decisiones abiertas. Orden de trabajo: primero la Fase B2 de Kanban, después F1, F2 y F3.

### Fase F1 — Opción «Raíz» en el filtro de Área
- [x] `ROOT_AREA` (`'/'`) en `src/core/area.ts`; `matchesTaskArea()` lo entiende (solo notas fuera de cualquier carpeta).
- [x] `TaskFilterBar`: «Raíz» al final del menú de Área, solo si hay tareas en la raíz; sin menú de sub-área al elegirla; el chip la muestra; `reconcileArea()` la conserva mientras haya tareas en la raíz.
- [x] Clave `area_root` en los 6 locales.
- [x] Ampliación acordada tras probar la F1: «Raíz» también en el filtro de Sub-área, con las notas que están directamente en la carpeta del área (`hasDirectTasks()`, `matchesTaskArea()` y el menú de sub-áreas).
- [ ] Verificable sola: Node (`matchesTaskArea()`, `filterTasksByViewState()` y la reconciliación). Prueba manual en Lista, Tabla y Kanban, con tareas dentro y fuera de carpetas.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase F2 — Rótulos «Group:» y «Sort:» en las tareas
- [x] Claves `group_label` y `sort_label` en los 6 locales.
- [x] `TaskFilterBar` (orden) y Lista, Tabla y Kanban (agrupado) las usan en el texto visible; el `aria-label` conserva «Agrupar por» y «Ordenar por».
- [ ] Verificable sola: Node (claves en los 6 locales). Prueba manual en los tres modos.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase F3 — Opciones de orden de hábitos sin «By»
- [x] Texto de las seis claves `habit_sort_*` en los 6 locales (Especificación §18.6).
- [ ] Verificable sola: el chequeo de locales. Prueba manual en Cuadrícula, Semanal y Rutina.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Cambiar el texto de «Sin área» en el agrupado; los títulos «By area» y «By daytime» del Dashboard de hábitos; un filtro de raíz para la sub-área.

## Próxima fase — v1.1.15: sincronía con Google Calendar (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §15. Mecanismo: [[Arquitectura técnica]] §24. **Nada de esta fase está implementada.** Sin decisiones de diseño abiertas (Especificación §15.8). Como el repo no tiene pruebas automatizadas, cada fase incluye sus scripts de prueba de Node.

### Fase GC1 — Conexión
- [ ] Subir `minAppVersion` a 1.11.4 en `manifest.json` y `versions.json`.
- [ ] Grupo **Integraciones** en los ajustes (ambas rutas), con la sincronía apagada por defecto y la lista de pasos para crear las credenciales.
- [ ] `auth.ts`: servidor local en `Platform.isDesktop`, PKCE, `state`, cierre a los 2 minutos, renovación del token y revocación.
- [ ] `crypto.ts`: cifrado con la frase, y la frase en `app.secretStorage`; estados Sin sesión, Bloqueado, Conectado, Token caducado e Iniciar sesión en el escritorio.
- [ ] README: declaración del uso de red.
- [ ] Verificable sola: iniciar sesión en escritorio, reiniciar y seguir conectado; con una frase incorrecta queda Bloqueado. Pruebas de Node del cifrado y de PKCE.
- [x] `npm run build` y ESLint sobre los archivos tocados.

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
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Google Tasks, Microsoft y el plugin Tasks; varias cuentas de Google; `🔁` ↔ RRULE; el botón directo sin credenciales propias; inicio de sesión por copiar y pegar en móvil.

## Próxima fase — v1.1.14: filtros con varios valores y filtros en el calendario (diseño)

> Comportamiento: [[Especificación de vistas]] §19. Mecanismo: [[Arquitectura técnica]] §28. **Nada de esta fase está implementada.** Decisiones cerradas el 2026-10-31 (Especificación §19.4). En esta versión entran también las funciones que estaban previstas para v1.1.18 (Fase U5 de la Tabla, Fase C de Kanban, agrupado de Kanban por área y combo de agrupado del Gantt).

### Fase M1 — Modelo y filtrado (independiente)
- [ ] `TaskViewState`: `priority`, `status` y las áreas pasan a listas; `parseTaskViewState()` convierte el estado guardado con un solo valor.
- [ ] `filterTasksByViewState()`: O dentro de un tipo, Y entre tipos; `matchesTaskArea()` acepta varias rutas y gana la más específica.
- [ ] Verificable sola: Node (conversión del estado antiguo, O/Y, regla de lo más específico, «Raíz»).

### Fase M2 — Barra y chips (depende de M1)
- [ ] `src/core/task-filter-popover.ts`: popover con casillas que no se cierra al marcar (clic fuera o Esc), anclado al chip o botón, accesible con teclado y en móvil.
- [ ] `TaskFilterBar` lo usa para prioridad, estado y área; el del área tiene dos secciones (áreas y sub-áreas de las marcadas); `reconcileArea()` descarta las rutas que ya no existen.
- [ ] `task-filter-chips.ts`: un chip por tipo con los valores unidos (con más de dos, el número) y tooltip con la lista completa; `clearFilterChip()` y `getActiveFilterChips()` adaptados.
- [ ] Prueba manual en Lista, Tabla, Kanban y Gantt.

### Fase CF1 — Estado y filtrado del calendario (depende de M1)
- [ ] `src/core/calendar-state.ts` con la clave `obsidian-agenda-calendar-view-state`, compartida por las 6 subvistas.
- [ ] `CalendarView` filtra en `getTasksForDate()` y en la lista del calendario, junto a `calendarShowCompletedTasks`.

### Fase CF2 — Barra en el calendario (depende de M2 y CF1)
- [ ] Opción `filterTypes` en `TaskFilterBar` (prioridad, estado, área; sin fechas, agrupado ni orden).
- [ ] Barra siempre visible justo bajo las pestañas principales, con el mismo aspecto que en las demás vistas (sin botón para abrirla); no se pierde ni pierde el foco al navegar (redibujado parcial o montaje fuera de la zona que se redibuja).
- [ ] Prueba manual en las 6 subvistas, con el buscador y con el foco.

### Fuera de alcance
Varios valores en los filtros de fecha; excluir valores («no es»); agrupado y orden en el calendario.
