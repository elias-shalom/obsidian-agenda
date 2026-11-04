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

- [x] Cierre de v1.1.13 (Fase 9): entrada `whats_new.v1_1_13` revisada y completada en los 6 idiomas (Kanban, Gantt, ajustes de pestañas, carpeta de hábitos, filtros y etiquetas, y la corrección de las etiquetas del día).

### Fase C — Modal (depende de A y B)
- [x] Nuevo `src/modals/whats-new-modal.ts` + `src/modals/templates/whats-new-modal.hbs`.
- [x] Botón de cierre propio, visible dentro del contenido (no depende únicamente del cierre nativo del modal de Obsidian).
- [x] Si `showWhatsNewOnUpdate` es `false`, el modal no se abre (pero `lastSeenVersion` ya se actualizó en la Fase A).
- [x] Verificable sola: al simular un cambio de versión (editar `lastSeenVersion` manualmente a una versión anterior y recargar el plugin), el modal se abre una sola vez con el contenido correcto en el idioma activo de Obsidian; con el ajuste desactivado, no se abre pero tampoco vuelve a aparecer al reactivarlo.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Fetch en vivo desde GitHub Releases; renderizado de Markdown libre (imágenes, video, bloques de código embebidos); preferencia granular "solo versiones con funcionalidad nueva" (mayor/menor) vs. todas; cualquier mecanismo de feedback tipo formulario.

## Próxima fase — v1.1.13: Kanban view (diseño; la Fase A, las piezas compartidas, va en v1.1.12)

> Comportamiento y decisiones: [[Especificación de vistas]] §11. Mecanismo: [[Arquitectura técnica]] §20. **Fases A y B implementadas (la B, probada a mano); la C (orden manual) quedó descartada el 2026-11-02.** El arrastre se resolvió: solo estado y prioridad. El orden manual (Fase C) se había pospuesto a v1.1.14 (ver §20.4); el 2026-11-02 se descartó porque bastan los combos de orden. La Fase B2 (columnas plegables y altura máxima) está implementada y probada a mano; el agrupado por área y sub-área se resuelve en v1.1.14 con Lanes (Especificación §11.3 y §20).

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
- [x] Verificable sola: arrastrar una tarjeta a "Hecho" agrega ✅ en el archivo y refresca el tablero; arrastrarla de vuelta lo quita.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase B2 — Refinamientos del tablero (implementados y probados a mano; depende de B)
- [x] `src/core/kanban-collapse.ts` (puro): `resolveCollapsed()` (la elección guardada manda; sin ella, una columna vacía está plegada) y la clave de almacenamiento por agrupado y columna.
- [x] Plantilla y estilos: encabezado como botón con `aria-expanded`; columna plegada de ancho fijo con el nombre en vertical (`writing-mode`) y el contador; el clic en el encabezado o en la barra alterna y guarda la elección.
- [x] Soltar sobre una columna plegada: sigue aceptando y resaltándose; al recibir la tarjeta se borra la elección guardada y la columna se despliega.
- [x] Altura: columnas ajustadas al contenido hasta la altura visible del panel (menos la barra de filtros, con `ResizeObserver`); encabezado fijo y tarjetas con desplazamiento propio.
- [x] Claves i18n `kanban_collapse_column` y `kanban_expand_column` en los 6 locales.
- [x] Verificable sola: Node (`resolveCollapsed()` y la plantilla con columnas plegadas). Prueba manual: plegar, desplegar y recargar; las vacías arrancan plegadas; soltar sobre una plegada; una columna con muchas tareas desplaza por su cuenta y el arrastre sigue funcionando dentro de ella; panel dividido y teléfono emulado.
- [x] `npm run build` y ESLint sobre los archivos tocados.
- [ ] Agrupar el tablero por área y sub-área: **pasa a v1.1.14 vía Lanes** (Área y Sub-área son opciones planas de Lanes, no de las columnas; fase L4 de este plan, Especificación §11.3 y §20).

### Fase C — Reordenar dentro de una columna (descartada el 2026-11-02; se conserva como historia)
> **Descartada.** Aplazada primero el 2026-10-31 y descartada el 2026-11-02: bastan los combos de orden. No se implementa en ninguna versión; lo siguiente es el texto original.
- [ ] Aplazada por decisión del 2026-10-31: no es necesaria para v1.1.13. La propuesta de diseño y las preguntas abiertas están en [[Arquitectura técnica]] §20.4.
- [ ] Resolver dónde se persiste el orden manual (candidato: `data.json`, por `ruta:línea` o `🆔`) y cómo se invalida cuando cambia el archivo.
- [ ] Arrastrar una tarjeta a otra posición de la misma columna y conservar el orden entre recargas.

### Fuera de alcance
Tableros múltiples guardados; mini-lenguaje de query propio; unificar las pestañas Lista y Tabla (hecho en v1.1.12). Lo que esta lista dejaba para después ya tiene versión: los carriles (swimlanes) plegables entran en v1.1.14 como Lanes (Fase L4) y los estados personalizables en v1.1.17 (Fases ES1 a ES4).

## Próxima fase — v1.1.13: Gantt view (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §12. Mecanismo: [[Arquitectura técnica]] §21. **G1 y G2 implementadas y probadas a mano.** Depende de la Fase A de Kanban (piezas compartidas). Las decisiones de la Especificación §12.7 se tomaron el 2026-10-31 y no queda ninguna abierta.

### Fase G1 — Gantt de lectura (depende de la Fase A de Kanban)
- [x] `resolveGanttSpan(task)` en `src/core/task-gantt.ts`: barra, hito o ninguna, según [[Especificación de vistas]] §12.1.
- [x] Reescribir `GanttView` con el `taskManager` inyectado; registrarla en `ViewManager`, descomentar el botón de `header.hbs` y agregar `showGanttTab` (default `true`) en ambas rutas de `setting-tab.ts`.
- [x] Plantilla y estilos: cabecera con pestañas de mes, año, franja de días, bandas de semana y línea de «hoy»; barras, hitos y muesca de `scheduled`.
- [x] Zoom 7/14/21/mes natural con posiciones precalculadas en porcentaje; las ventanas de 7/14/21 días empiezan en el primer día de semana configurado que contiene la fecha de referencia; ◀▶ por ventana o por mes; zoom recordado en `localStorage`.
- [x] Agrupado por área y sub-área (anidado por carpeta), plegable; la cabecera de grupo no lleva barra resumen (retirada tras la primera revisión visual).
- [x] Columna de nombres con el icono de prioridad junto al de estado y el texto un poco más pequeño (0,9 em).
- [x] Barra de controles a la derecha (zoom y `◀ Hoy ▶`, como el calendario) y cuadrícula vertical (línea de día, línea de semana más marcada, fines de semana sombreados).
- [ ] Combo de agrupado del Gantt: pasa a v1.1.14 como chip `Group` de la barra de chips, junto con Lanes (fase L4 de este plan; Arquitectura §21.9 y §29).
- [x] Ajustes visuales tras la revisión: zoom con número e icono de mes, cabecera de grupo sin barra y tareas sin fecha como grupo plegable al estilo de la Lista (máx. 80 %).
- [x] Contador «N tareas sin fecha» y barras recortadas cuando salen de la ventana.
- [x] Fin anterior al inicio en datos escritos a mano: se dibuja como hito en la fecha de inicio, con un aviso.
- [x] Insignia 🔗 con la tooltip «depende de» en las tareas con `🆔`/`⛔`.
- [x] Barra de filtros compartida y gestos con `attachTaskGestures()`.
- [x] Claves i18n nuevas en los 6 locales.
- [x] Pruebas de Node: `resolveGanttSpan()` en todos los casos de §12.1 (incluido el fin anterior al inicio y la hora de ⏳ ignorada), ventanas de 7/14/21 días con cada inicio de semana y mes natural de 28 a 31 días, posiciones recortadas por cada lado, un cambio de hora, bandas de semana, filas agrupadas (solo tareas dentro de la ventana, grupos plegados y vacíos), dependencias, estado y zoom, plantilla, encabezado y los 6 locales (98 comprobaciones).
- [x] Verificable sola: con tareas de una, dos y tres fechas se ven hitos y barras correctas; cambiar de zoom y de mes (28 a 31 días) mantiene las posiciones.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase G2 — Edición de fechas (depende de G1)
- [x] Extraer `shiftTaskDates(line, deltaDays)` de `task-recurrence.ts`, sin tocar ➕ ni ✅.
- [x] Mover la barra o el hito, y redimensionar cada borde, con eventos de puntero y pasos de un día; escritura con `updateTaskLine()`.
- [x] Tooltip que indica qué campo escribe cada borde; bloquear fin anterior al inicio.
- [x] Convertir un hito en barra con su manija: `start` crea `scheduled`, `scheduled` crea `due` y un hito con solo `due` crea `start` con la manija a la izquierda (Especificación §12.7).
- [x] Pruebas de Node: `shiftTaskDates()` (hora de ⏳, ➕/✅/`🆔`/`⛔` intactos, cambio de mes, año y hora), `clampGanttDelta()`, `planGanttEdit()` y `applyGanttEdit()` en los tres tipos de barra y de hito, el rango incoherente y la plantilla (manijas ocultas en el lado recortado; 47 comprobaciones).
- [x] Verificable sola: arrastrar un borde cambia solo el campo indicado en la nota; mover la barra desplaza las tres fechas sin tocar `🆔`/`⛔`; la vista se refresca sola al soltar y no se abre el modal.
- [x] `npm run build` y ESLint sobre los archivos tocados.

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
- [x] Claves i18n nuevas en los 6 locales.
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

### Fase U5 — Funciones anunciadas de la Tabla (pasa a v1.1.17; se refina en TB1 y TB2; depende de U3 y U7)
> Diseñada el 2026-11-02: columnas personalizables en TB1 y exportación a CSV en TB2 (Especificación §23 y Arquitectura §32). Las casillas siguientes quedan como historia y se cierran con esas fases.
- [ ] Columnas y diseño personalizables de la Tabla (Especificación §14.3): fase TB1.
- [ ] Exportación a CSV (Especificación §14.3): fase TB2.
- [ ] Verificable sola: el README y el manual de usuario dicen lo mismo que hace la Tabla (al implementarlo en v1.1.17 se vuelven a anunciar).

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
- [x] Documentación al implementar: README, manual en/es (Tab Visibility y carpeta de hábitos) y «News» de la versión.
- [x] Prueba manual: ocultar Tareas y Hábitos desde Ajustes; actualizar desde una configuración con solo la Tabla visible; crear el primer hábito sin carpeta (Crear, Cancelar y ruta nueva); escribir rutas válidas y no válidas en Ajustes; abrir las cinco vistas sin hábitos.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase S5 — Rótulos de los combos de hábitos (independiente; diseño en [[Especificación de vistas]] §18.6 y [[Arquitectura técnica]] §25.8)
- [x] i18n: `habit_sort_label` y `habit_group_label` en los 6 idiomas; `habit_sort_daytime` en español pasa a «Por momento del día».
- [x] Plantillas de Cuadrícula, Semanal y Rutina: `data-label` en el contenedor y `aria-label` y `title` en el `<select>`; el combo de agrupar de Rutina usa `habit_daytime` y `habit_area`.
- [x] Estilos del prefijo en `_habit-common.scss` (`::before` con `attr(data-label)`), sin romper la barra en tableta y teléfono.
- [x] Verificable sola: script de Node que comprueba que los 6 locales tienen las dos claves nuevas.
- [x] Prueba manual: los combos de Cuadrícula, Semanal y Rutina con su rótulo en escritorio, `is-tablet` e `is-phone`, tema claro y oscuro; cambiar de idioma; el orden y la agrupación elegidos siguen funcionando.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Crear carpetas sin preguntar; botones nuevos en las vistas; migrar hábitos existentes.

## Corrección — v1.1.13: etiquetas del día de la semana (implementado y probado a mano)

> Mecanismo: [[Arquitectura técnica]] §27. Reportado y corregido por @AidanAJoyce (PR #58).

### Fase W1 — Índice del nombre del día
- [x] Corrección aportada en el PR #58 (@AidanAJoyce): el índice del nombre del día es `(weekday - weekStartDay + 7) % 7`; no hay función aparte.
- [x] `CalendarWeekView`, `CalendarWorkWeekView` y `CalendarListView` usan esa expresión con `this.getWeekStartDay()` en lugar de `weekday % 7`.
- [x] Verificable sola: `node --test tests/calendar-weekday-labels.test.cjs` (21 pruebas del PR: 3 vistas por los 7 inicios de semana, en inglés y español, con tres zonas horarias y fechas límite); 21 de 21 pasan.
- [x] Prueba manual: inicio de semana en lunes y en domingo; 31 de octubre de 2026 es «Sat», 1 de noviembre «Sun» y 2 de noviembre «Mon» en Semana, Semana laboral y Lista; las tareas siguen en su fecha.
- [x] `npm run build` y ESLint sobre los archivos tocados.
- [x] Integración: revisión del PR, merge en `features/develop` con la autoría de Aidan y comentario en el PR, que queda abierto hasta que la versión llegue a `main` (Arquitectura §27.1).
- [x] README: sección Contributors con el crédito.
- [x] Al cerrar la versión (Fase 9): nota en el Changelog de la versión con el crédito a @AidanAJoyce (PR #58), en el README.

### Fuera de alcance
La alineación de la vista Semana con `weekStartDay` (usa la semana ISO de Luxon; ver Especificación §4.7) y las vistas Día, Mes y Año.

## Próxima fase — v1.1.13: ajustes de filtros y rótulos (diseño)

> Comportamiento: [[Especificación de vistas]] §13.2, §14.7 y §18.6. Mecanismo: [[Arquitectura técnica]] §26. **F1, F2 y F3 implementadas y probadas a mano.** Sin decisiones abiertas. Orden de trabajo: primero la Fase B2 de Kanban, después F1, F2 y F3.

### Fase F1 — Opción «Raíz» en el filtro de Área
- [x] `ROOT_AREA` (`'/'`) en `src/core/area.ts`; `matchesTaskArea()` lo entiende (solo notas fuera de cualquier carpeta).
- [x] `TaskFilterBar`: «Raíz» al final del menú de Área, solo si hay tareas en la raíz; sin menú de sub-área al elegirla; el chip la muestra; `reconcileArea()` la conserva mientras haya tareas en la raíz.
- [x] Clave `area_root` en los 6 locales.
- [x] Ampliación acordada tras probar la F1: «Raíz» también en el filtro de Sub-área, con las notas que están directamente en la carpeta del área (`hasDirectTasks()`, `matchesTaskArea()` y el menú de sub-áreas).
- [x] Verificable sola: Node (`matchesTaskArea()`, `filterTasksByViewState()` y la reconciliación). Prueba manual en Lista, Tabla y Kanban, con tareas dentro y fuera de carpetas.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase F2 — Rótulos «Group:» y «Sort:» en las tareas
- [x] Claves `group_label` y `sort_label` en los 6 locales.
- [x] `TaskFilterBar` (orden) y Lista, Tabla y Kanban (agrupado) las usan en el texto visible; el `aria-label` conserva «Agrupar por» y «Ordenar por».
- [x] Verificable sola: Node (claves en los 6 locales). Prueba manual en los tres modos.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fase F3 — Opciones de orden de hábitos sin «By»
- [x] Texto de las seis claves `habit_sort_*` en los 6 locales (Especificación §18.6).
- [x] Verificable sola: el chequeo de locales. Prueba manual en Cuadrícula, Semanal y Rutina.
- [x] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Cambiar el texto de «Sin área» en el agrupado; los títulos «By area» y «By daytime» del Dashboard de hábitos; un filtro de raíz para la sub-área.

## Próxima fase — v1.1.14: filtros con varios valores, filtros en el calendario y Lanes (diseño)

> Comportamiento: [[Especificación de vistas]] §19 (filtros) y §20 (Lanes y barra de chips). Mecanismo: [[Arquitectura técnica]] §28 (filtros) y §29 (Lanes). **Nada de esta versión está implementada.** Alcance repartido el 2026-11-02: v1.1.14 es la versión **Filtros y Lanes**. Los filtros se cerraron el 2026-10-31 (Especificación §19.4) y Lanes el 2026-11-01 y 2026-11-03 (opciones en uso y traducción). Este bloque ya no incluye la Fase U5 de la Tabla (pasó a v1.1.17, fases TB1 y TB2) ni la Fase C de Kanban (descartada el 2026-11-02); el agrupado de Kanban por área y sub-área y el combo de agrupado del Gantt entran por Lanes y por el chip `Group` (fases L3 y L4).
>
> **Orden de trabajo**: M1 → M2 → CF1 → CF2 para los filtros; L1 en paralelo (es independiente); L2 cuando estén L1 y M2; L3 y L4 después de L2; CV14 cierra la versión. Cada fase se prueba por separado; las dependencias van en su título.

### Fase M1 — Modelo y filtrado (independiente) — **implementada el 2026-11-03**
- [x] `TaskViewState`: `priority` y `status` pasan a listas y `area` + `subArea` a una sola lista `areas` de rutas (`Área`, `Área/sub/ruta`, `Área/` para las notas directas del área y `ROOT_AREA`); `parseTaskViewState()` convierte el estado guardado con un solo valor (`'all'` pasa a `[]`).
- [x] `filterTasksByViewState()`: O dentro de un tipo, Y entre tipos; `matchesTaskAreas()` (`area.ts`) acepta varias rutas y gana la más específica (`TaskFilterCriteria.location.routes`).
- [x] Verificable sola: Node (`tests/task-filters.test.cjs`, con el cargador `tests/helpers/load-source.cjs`): conversión del estado antiguo, O/Y, regla de lo más específico, «Raíz» y chips.
- [x] La barra y los chips se adaptaron sin cambiar su comportamiento (selección única); `reconcileAreaRoutes()` descarta las rutas sin notas. El popover con casillas es la Fase M2.

### Fase M2 — Barra y chips (depende de M1) — **implementada el 2026-11-03; falta la prueba manual**
- [x] `src/core/task-filter-popover.ts`: popover con casillas que no se cierra al marcar (clic fuera o Esc), anclado al chip o botón, accesible con teclado y con objetivo táctil mayor en móvil; solo hay uno abierto.
- [x] `TaskFilterBar` lo usa para prioridad, estado y área; el del área tiene dos secciones (áreas y sub-áreas de las marcadas, con «Área › Raíz» para las notas directas); `reconcileAreaRoutes()` (M1) descarta las rutas que ya no existen. Los filtros de fecha siguen con el menú de elección única.
- [x] `task-filter-chips.ts`: un chip por tipo (el nombre con un valor y solo el número con dos o más, decidido el 2026-11-03) y tooltip con la lista completa (`FilterChip.title`); `toggleFilterValue()`, `buildAreaFilterSections()` y `toggleAreaRoute()` (`area.ts`) son puras y se prueban con Node.
- [x] La lista del filtro de estado sale de `getStatusOptions()` y no de la constante `STATUS_OPTIONS` directamente, para que los estados personalizados de v1.1.17 (fase ES4) no obliguen a rehacer esta fase.
- [x] Clave `filter_sub_areas` en los 6 idiomas (sustituye a `all_sub_areas`, que ya no se usa).
- [ ] Prueba manual en Lista, Tabla, Kanban y Gantt: marcar Normal y Medium a la vez, varios estados y áreas con sub-áreas, el chip con dos o más valores («Estado: 2») y su tooltip, Esc y clic fuera, teclado, y en `is-tablet` e `is-phone`.

### Fase CF1 — Estado y filtrado del calendario (depende de M1) — **implementada el 2026-11-03**
- [x] `src/core/calendar-state.ts` con la clave `obsidian-agenda-calendar-view-state`, compartida por las 6 subvistas: mismo formato que `TaskViewState`, pero `parseCalendarState()` solo conserva búsqueda, prioridad, estado y área (los filtros de fecha, el agrupado y el orden vuelven a su valor por defecto).
- [x] `CalendarView` filtra en `getTasksForDate()` (que recorre `visibleTasks`, calculado una vez en `onOpen()`), junto a `calendarShowCompletedTasks`; las seis subvistas, el selector de fecha y los contadores de la vista Año pasan por ese punto. `this.tasks` queda completa para buscar una tarea por su línea.
- [x] Verificable sola: Node (`tests/calendar-filters.test.cjs`, 12 pruebas): estado y su conversión, filtrado por prioridad, estado, área y búsqueda, y la integración real con `CalendarView` (cargado con dobles de Obsidian). Sin barra todavía: el estado se escribe desde la Fase CF2.

### Fase CF2 — Barra en el calendario (depende de M2 y CF1) — **implementada el 2026-11-03; falta la prueba manual**
- [x] Opción `filterTypes` en `TaskFilterBar` (prioridad, estado, área; sin fechas, agrupado ni orden): `CALENDAR_FILTER_TYPES` en `calendar-state.ts`.
- [x] Barra siempre visible justo bajo las pestañas principales, con el mismo aspecto que en las demás vistas y sin botón para abrirla: es el **primer elemento de `.agenda-content-container`**, igual que en Lista, Tabla, Kanban y Gantt (mismo espaciado bajo las pestañas, sin estilos propios). `CalendarView.onOpen()` la crea antes de filtrar (reajusta un área guardada que ya no existe) y `refreshCalendar()` la monta tras cada dibujado completo.
- [x] No pierde el foco: un cambio de filtro llama a `redrawCalendarBody()`, que dibuja el calendario en un contenedor aparte y sustituye **todo el contenido salvo el nodo de la barra** (quitar y volver a poner el nodo desenfocaría el buscador). Un redibujado lento no pisa a otro más reciente (`redrawToken`). `BaseView.isInteracting()` cuenta el popover abierto para que un refresco automático no destruya la barra.
- [x] Verificable con Node (`tests/calendar-filters.test.cjs`, 18 pruebas, con un DOM mínimo y un doble de la barra): tipos ofrecidos, barra como primer elemento del contenido, redibujado parcial que conserva el mismo nodo de la barra, redibujados que se pisan, y área guardada que ya no existe.
- [ ] Prueba manual en las 6 subvistas, con el buscador y con el foco: teclear varias letras seguidas sin perderlo, cambiar de subvista y navegar con filtros activos, el popover abierto durante un refresco, y en escritorio, `is-tablet` e `is-phone`.

### Fase L1 — Núcleo de carriles (independiente; Especificación §20, Arquitectura §29) — **implementada el 2026-11-03**
- [x] Función única `buildLanes()`, compartida por las 4 vistas, en `src/core/task-lanes.ts` (módulo puro): parte las tareas por el campo de Lanes y devuelve un carril (`Lane`: `key`, `label`, `tasks` y `color`) por valor; «Ninguno» o un campo desconocido devuelven `[]`.
- [x] Opciones de Lanes (`LANE_OPTIONS`): Ninguno, Área, Sub-área, Estado, Prioridad, Etiqueta, Carpeta y Archivo. Área y Sub-área son planas (`Área › Sub-área`, con «Raíz» para notas sin carpeta o subcarpeta); Carpeta es la ruta completa y Archivo el nombre de la nota.
- [x] Etiqueta: la tarea se repite en cada carril de sus etiquetas (sin distinguir mayúsculas, una sola vez por carril) y «Sin etiqueta» va al final. Carriles vacíos ocultos.
- [x] Orden de carriles: natural para Estado y Prioridad (su orden lógico), alfabético sin distinguir mayúsculas para el resto, con «Raíz» y «Sin etiqueta» al final. En Sub-área, las notas directas del área (`Área › Raíz`) van las primeras de su área.
- [x] Regla de campos en uso como función pura (por familia: Estado, Prioridad, Etiqueta, Archivo y la familia de ruta Área, Sub-área y Carpeta; Vencimiento libre): `isGroupOptionInUse()`, `isLaneOptionInUse()` y `resolveAxisConflict()`; en Kanban (`requiresGroup`) la opción en uso no se puede elegir; en Lista, Tabla y Gantt se puede elegir y el otro chip pasa solo a Ninguno (`'none'`), en los dos sentidos; `defaultGroup` resuelve el `group` vacío de cada vista (Lista = Área, Tabla = Ninguno, Kanban = Estado).
- [x] Verificable sola: `node --test` sobre `buildLanes()` (`tests/task-lanes.test.cjs`, 38 pruebas): partición, orden, etiquetas múltiples, «Raíz», «Sin etiqueta», carriles vacíos, nombres no ASCII y notas homónimas, la regla de campos en uso y las claves de texto en los 6 idiomas. Aún no la usa ninguna vista (L2 a L4).
- [x] Claves de texto nuevas en los 6 idiomas: `lane_sub_area` y `lane_no_tag`; `PRIORITY_ORDER` de `task-grouping.ts` se exporta para compartir el orden de prioridades.

### Fase L2 — Barra de chips (depende de L1 y M2; Especificación §20, Arquitectura §29) — **implementada el 2026-11-03**
- [x] Chips `Lanes`, `Group` y `Sort` en la fila 1, junto a «+ Filtro» y con su mismo aspecto; cada uno abre el mismo menú nativo de Obsidian que «+ Filtro», con la opción actual marcada, y elegir una la aplica; la flecha ↑/↓ va dentro del chip de `Sort`; reemplaza los combos `Group` y `Sort` de la barra (ver Especificación §14.4 y §19). Un chip solo existe si la vista le pasa sus opciones (`laneOptions`, `groupOptions`, `sortOptions`).
- [x] El conmutador Lista | Tabla queda al final de la fila 1, justo a la izquierda del buscador (`[+ Filtro] [Lanes] [Group] [Sort] ··· [conmutador] [buscador]`), siempre en la misma posición (`mountModeSwitch()` en `src/core/task-filter-bar.ts`); solo en Lista y Tabla. El buscador conserva su sitio (derecha) y su tamaño de siempre (`clamp(180px, 25%, 300px)`). Primero se probó al inicio de la fila y el 2026-11-03 se movió junto al buscador. Los chips `Group` y `Sort` tienen el mismo aspecto que «+ Filtro».
- [x] Opciones en uso: en Kanban la opción en uso por el otro chip se bloquea (`setDisabled`); en Lista, Tabla y Gantt se puede elegir y el otro chip pasa a Ninguno. El `Menu` nativo no permite atenuar ni tooltip por opción, así que los textos «En uso por Grupo» quedan en i18n sin mostrarse hasta que haga falta. Tooltip del chip `Lanes`: «Divide la vista en varias, una por valor».
- [x] En móvil la fila se ajusta a 2 líneas (`flex-wrap`; en una barra estrecha el buscador baja a su propia línea con la regla `@container` de siempre).
- [x] El `Group` de Lista y Tabla gana Inicio y Programada (2026-11-03): agrupan por día como Vencimiento, con «sin fecha» al final, y no chocan con ningún carril (`tests/task-grouping-dates.test.cjs`, 7 pruebas). Las etiquetas «Ninguno» y «Área y sub» sustituyen a «Sin agrupar» y «Área y sub-área» en los 6 idiomas.
- [x] Estado guardado: `TaskViewState.lanes` (`''` por defecto, validado con `isLaneField()`); `group`, `sortColumn` y `sortDirection` siguen donde estaban.
- [x] Claves i18n nuevas en los 6 locales (`lanes_label`, `lanes_tooltip`, `axis_in_use_by_group`, `axis_in_use_by_group_swap`, `axis_in_use_by_lanes`, `axis_in_use_by_lanes_swap`); «Lanes» se traduce como Lanes (en), Filas (es), Bahnen (de), Couloirs (fr), Corsie (it) y Raias (pt), **pendientes de revisión por hablantes nativos antes de publicar**.
- [x] Modelo puro en `src/core/task-axis-chips.ts` (`buildAxisChips()`, `pickAxisOption()`, `toggleSortDirection()`); la barra dibuja la lista con `Menu` (`openAxisMenu()`). **Las vistas todavía no activan `laneOptions`**: el chip `Lanes` no aparece hasta que L3 (Lista y Tabla) y L4 (Kanban y Gantt) dibujen los carriles; Kanban ya pasa `axisRules: { requiresGroup: true }`.
- [x] Verificable con Node (`tests/task-axis-chips.test.cjs`, 28 pruebas): chips ofrecidos y su orden, texto, atenuado y tooltip, opción marcada, choques por familia (incluida la de ruta), bloqueo en Kanban, elegir con y sin choque, `defaultGroup`, estado guardado y claves de los 6 idiomas.
- [x] Prueba manual en Lista y Tabla con el conmutador, y en escritorio, `is-tablet` e `is-phone`: la barra con los chips en la fila 1, los menús de `Group` y `Sort`, la flecha del orden, el orden por clic en un encabezado de la Tabla (`setSort()`) y el ajuste a varias líneas en móvil.

### Fase L3 — Lanes en Lista y Tabla (depende de L2; Especificación §20, §14 y Arquitectura §29) — **implementada el 2026-11-03**
- [x] Lista: un widget por carril con su ▼ para plegar; el plegado se recuerda por campo y los carriles son de solo lectura.
- [x] Tabla: encabezado de columnas repetido en cada carril, con columnas y anchos compartidos (una sola `<table>`; los anchos se fijan en `<colgroup>`, en el `<thead>` y en cada encabezado repetido; los encabezados repetidos también ordenan).
- [x] El chip `Lanes` aparece en Lista y Tabla (`laneOptions`); un estado guardado que repite campo entre Lanes y Group se repara al abrir (`repairAxes()`: gana Lanes y el agrupado pasa a Ninguno sin guardarse).
- [x] Verificable con Node (`tests/task-lane-views.test.cjs`, 14 pruebas): modelos por carril con su conteo y orden, `Group` dentro de cada carril, claves de plegado con prefijo por campo, color solo en área, etiqueta repetida en cada carril y `repairAxes()`. Las plantillas se comprobaron renderizándolas con Handlebars (carriles, encabezados repetidos y `<col>`).
- [ ] Prueba manual en Lista y Tabla con Lanes = Estado, Prioridad, Etiqueta, Área, Sub-área, Carpeta y Archivo, combinado con `Group`, filtros y `Sort`: plegar y recordar el plegado, que la Tabla alinee las columnas en todos los carriles, ordenar desde el encabezado de un carril, tareas con etiquetas repetidas, escritorio, `is-tablet` e `is-phone`.

### Fase L4 — Lanes en Kanban y Gantt (depende de L2; Especificación §20, §11.3 y §12) — **implementada el 2026-11-03**
- [x] Kanban: Lanes parte el tablero en un tablero por carril con las mismas columnas; así Área y Sub-área quedan cubiertas (cierra «Agrupar el tablero por área y sub-área»). Arrastrar no cruza carriles.
  - [x] `buildKanbanLanes()` (`kanban-board.ts`) reparte las tareas con `buildLanes()` y arma las columnas de `Group` dentro de cada carril; `KanbanView` pasa `laneOptions` y dibuja un `<section class="oa-lane">` por carril (la plantilla usa un partial `columnTemplate` para las columnas).
  - [x] Cada carril es un tablero independiente: el plegado de una columna se recuerda por carril (`collapseStorageKey(group, columna, carril)`) y, por defecto, una columna vacía arranca plegada en cada carril.
  - [x] El arrastre queda dentro del carril: la tarjeta lleva la clave de su carril en el payload; `dragover` solo acepta las columnas del mismo carril y `drop` lo vuelve a validar.
  - [x] Un estado guardado cuyos carriles repiten el campo de las columnas se arregla al leer (`parseKanbanState()` quita los carriles: las columnas son obligatorias).
  - [x] El plegado del carril (▼) se comparte con Lista y Tabla (`addLaneToggleListeners()` en `BaseView`).
  - [x] Verificable con Node (`tests/kanban-lanes.test.cjs`, 14 pruebas): carriles y columnas, destino de arrastre, etiquetas repetidas, claves de plegado, estado guardado y la plantilla renderizada con y sin carriles.
  - [ ] Prueba manual: Lanes en Kanban con Área, Sub-área, Estado, Prioridad, Etiqueta, Carpeta y Archivo; arrastrar dentro de un carril (estado y prioridad) y comprobar que no se puede soltar en otro; plegar columnas y carriles; escritorio, `is-tablet` e `is-phone`.
- [x] Gantt: una sola ventana y un solo zoom, con la cabecera de fechas (año, meses, bandas de semana y días) repetida en cada carril (**a probar con uso real**). Los controles (periodo, zoom y navegación) salen una sola vez arriba; cada carril es un diagrama con su cabecera y sus filas, sobre la misma ventana. Un carril sin tareas dentro de la ventana no se dibuja. **Decidido el 2026-11-03**: la lista «Tareas sin fecha» va **una sola vez, al final**, con todas las tareas sin fecha (no por carril).
- [x] Gantt: chip `Group` con Ninguno (modo plano), Área (por defecto), Estado y Prioridad. `buildGanttTaskRows()` y `buildGanttGroupedRows()` (`task-gantt.ts`) dan el modo plano y el agrupado; las claves de plegado llevan el campo como prefijo (`ganttGroupKey()`: `status:<clave>`, `priority:<clave>`; el área conserva la suya, así que no se pierde lo ya plegado); el color de grupo es solo del área (con Ninguno y Lanes: Área, las filas llevan el color del carril).
- [x] Estado guardado del Gantt: `parseGanttState()` da el agrupado Área por defecto, devuelve a él un valor desconocido y, si repite el campo de los carriles, gana Lanes y el agrupado pasa a Ninguno.
- [x] Verificable con Node (`tests/gantt-lanes.test.cjs`, 24 pruebas): modo plano, agrupado por área, estado y prioridad, claves de plegado, carriles sobre una ventana compartida y sin carriles vacíos, estado guardado y la plantilla renderizada con y sin carriles.
- [ ] Prueba manual del Gantt: Lanes con cada campo, `Group` en cada valor, arrastrar y redimensionar barras dentro de un carril, plegar carriles y grupos, cambiar el zoom y la ventana con varios carriles, y la cabecera repetida en escritorio, `is-tablet` e `is-phone`.

### Fase CV14 — Cierre de v1.1.14: pruebas manuales y documentación (depende de M1 a L4)
- [ ] Pruebas manuales de lo implementado: filtros con varios valores en Lista, Tabla, Kanban y Gantt; barra del calendario en las 6 subvistas (foco del buscador); Lanes en las 4 vistas con cada campo; el conmutador junto al buscador; escritorio, `is-tablet` e `is-phone`; tema claro y oscuro.
- [ ] README: badge, What's New, News, Features, Gestures, Configuration, Changelog y la lista de próximas versiones.
- [ ] Manual de usuario en inglés y español (`docs/user_guide/`).
- [ ] Entrada `whats_new.v1_1_14` en los 6 idiomas y `'1.1.14'` en `WHATS_NEW_VERSIONS` de `src/core/whats-new.ts`.
- [ ] Documentación de desarrollo: pasar §19, §20 y §29 a «implementado»; actualizar este plan.
- [ ] `npm version 1.1.14 --no-git-tag-version`, `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Varios valores en los filtros de fecha; excluir valores («no es»); agrupado y orden en el calendario; arrastrar tareas entre carriles; orden manual de Kanban (descartado).

## Próxima fase — v1.1.15: calendario y hábitos (diseño)

> Comportamiento: [[Especificación de vistas]] §21. Mecanismo: [[Arquitectura técnica]] §30. Los hábitos tienen su propio diseño en `docs/habit-tracker-agenda/` (periodo activo, vacaciones y selector circular, fases HA1, HV1 y HU1 de [[habit-tracker-agenda/Plan de implementación]]). **Nada de esta versión está implementado.** Decidido el 2026-11-01 y el 2026-11-02.
>
> **Orden de trabajo**: NL1 → NL2; FE1 → FE2; PR1 → PR2; HC1 al final, cuando HA1 y HV1 del plan de hábitos estén hechas. NL1, FE1 y PR1 son independientes entre sí. CV15 cierra la versión.

### Fase NL1 — Días no laborables y sombreado (independiente; Especificación §21, Arquitectura §30)
- [ ] Ajuste con siete casillas de días no laborables, por defecto sábado y domingo (nombre propuesto `nonWorkingDays`, ver Modelo de datos §13), en ambas rutas de `setting-tab.ts`.
- [ ] Sombreado de esos días en Mes, Semana y Lista del calendario; no en Día, Año ni Semana laboral.
- [ ] Semana laboral: oculta los días marcados; nunca queda vacía porque el ajuste exige al menos un día marcado y uno sin marcar (`sanitizeNonWorkingDays()`; el ajuste rechaza el cambio y muestra un `Notice`).
- [ ] Gantt: el sombreado deja de ser fijo (`date.weekday >= 6` en `gantt-view.ts`) y usa el ajuste.
- [ ] Verificable sola: Node (función de día no laborable, días visibles de la Semana laboral y regla de extremos: ninguno marcado y los siete marcados se rechazan); prueba manual cambiando el ajuste con el calendario y el Gantt abiertos.

### Fase NL2 — Frecuencias de hábitos con el ajuste y aviso (depende de NL1)
- [ ] Las frecuencias «Fin de semana» y «Lunes a viernes» de los hábitos usan el ajuste en lugar de `[6, 7]` fijo (`FREQUENCY_PRESETS` y `resolveFrequencyMode()` en `habit-editor.ts`, `habit-table-view.ts` y el caso `weekend` de `habit-parser.ts`).
- [ ] Las recurrentes `every weekday` y `every weekend` siguen el ajuste (decidido el 2026-11-03): `TaskSection.convertToRRuleFormat()` y `getNextOccurrenceDate()` reciben `nonWorkingDays`; con `[6, 7]` el resultado es idéntico al actual (prueba de Node de regresión); nota bajo el campo de recurrencia del Task Modal cuando el ajuste no es sábado y domingo; el texto fijo y el `Notice` del ajuste mencionan las recurrentes.
- [ ] Aviso al cambiar el ajuste: texto fijo bajo las casillas y un `Notice` breve (rachas y porcentajes de hábitos se ven afectados).
- [ ] Verificable sola: Node (frecuencias con el ajuste por defecto, con otros días y la conversión del editor); el cálculo de rachas con el ajuste por defecto no cambia.

### Fase FE1 — Motor de reglas de feriados (independiente; Especificación §21, Arquitectura §30)
- [ ] Motor embebido, sin red, con las reglas: fecha fija; n-ésimo o último día de la semana del mes; relativo a la Pascua; observado (si cae en fin de semana se recorre); ciclo de años (transmisión del Poder Ejecutivo de México, cada 6 años) y lista explícita por año.
- [ ] Datos de México y EE. UU. con sus estados o regiones; cada regla es oficial o no oficial (Día de las Madres, Día de Muertos, Halloween…); el formato queda documentado y abierto para añadir países (sin archivo del usuario por ahora).
- [ ] Verificable sola: `node --test` con cada tipo de regla y fechas conocidas de varios años (los lunes de feb, mar y nov de México, MLK, Memorial Day, Acción de Gracias, Semana Santa, observado y el ciclo de 6 años).

### Fase FE2 — Calendarios de feriados y marcado (depende de FE1; Especificación §21, Arquitectura §30)
- [ ] Ajustes: lista de calendarios de feriados con país, región opcional, casillas Oficiales y No oficiales y un color; ninguno activo por defecto (Modelo de datos §13).
- [ ] Marcado con tinte tenue en las 6 vistas del calendario y en el Gantt: etiqueta con el nombre en Mes, Semana, Semana laboral y Lista; encabezado en Día; punto con tooltip en Año; columna tintada en el Gantt.
- [ ] Solo visual: no afectan a la Semana laboral, las rachas ni las tareas.
- [ ] Verificable sola: con un calendario de México activo, el 1 de enero y el tercer lunes de noviembre aparecen en las vistas; con ninguno activo no cambia nada.

### Fase PR1 — Proyección de recurrentes: cálculo y fantasmas (independiente; Especificación §21, Arquitectura §30)
- [ ] Cálculo de N ocurrencias posteriores a la real con `getNextOccurrenceDate()` (`src/core/task-recurrence.ts`); las reglas `when done` no se proyectan.
- [ ] Entradas fantasma de solo lectura (no se escriben en la nota, no se arrastran ni se completan) con la insignia `🔁` y aspecto atenuado; clic y doble clic llevan a la tarea real.
- [ ] Verificable sola: `node --test` (N ocurrencias en diarias, semanales y mensuales; `when done` excluida; sin duplicar la real; con 0 no proyecta).

### Fase PR2 — Ajuste N y vistas (depende de PR1)
- [ ] Ajuste numérico N, por defecto 10; con 0 se desactiva.
- [ ] Fantasmas en Mes, Semana, Semana laboral, Día y Lista del calendario; no en Año, Gantt, Lista, Tabla, Kanban ni Overview; respetan los filtros de la barra del calendario.
- [ ] Al completar la real se escribe la siguiente como hoy (ADR-R1); una diaria desaparece pasados N días (consecuencia asumida).
- [ ] Verificable sola: prueba manual con una diaria, una semanal y una mensual; completar la real no duplica la siguiente.

### Fase HC1 — Hábitos en el calendario (depende de HA1 y HV1 de [[habit-tracker-agenda/Plan de implementación]]; Especificación §21, Arquitectura §30)
- [ ] Ajuste «Mostrar hábitos en el calendario», desactivado por defecto; sin efecto si la pestaña Hábitos está oculta.
- [ ] Entradas virtuales por día en que toca el hábito, respetando el periodo activo y los días de vacaciones; sin escribir en archivos y sin ser tareas (no entran en Lista, Tabla, Kanban, Gantt ni en los conteos).
- [ ] Mes, Semana, Semana laboral y Lista: un chip resumen `🔁 3/5` por día con un popover de casillas; clic marca o desmarca (escritura de `completions` con `habit-writer.ts`) y doble clic abre la nota; Día: sección «Hábitos» por franja (despertar, mañana, tarde, noche); no en Año.
- [ ] La barra de filtros del calendario afecta a los hábitos por área y búsqueda; prioridad y estado no aplican.
- [ ] Verificable sola: con el ajuste activado, marcar un hábito desde el popover actualiza la nota del hábito y el Dashboard de hábitos; desactivado, no aparece nada.

### Fase CV15 — Cierre de v1.1.15: pruebas manuales y documentación (depende de NL1 a HC1)
- [ ] Pruebas manuales: sombreado y Semana laboral con distintos días marcados; hábitos con frecuencias que siguen el ajuste; feriados de México y EE. UU. en las 6 vistas y el Gantt; fantasmas con N = 0, 10 y 50; hábitos en el calendario con filtros y en móvil; selector circular de Hábitos, periodo activo y vacaciones (fases del plan de hábitos).
- [ ] README (badge, What's New, News, Features, Gestures, Configuration, Changelog y lista de próximas versiones), manual de usuario en/es, `whats_new.v1_1_15` en los 6 idiomas, `'1.1.15'` en `WHATS_NEW_VERSIONS` de `src/core/whats-new.ts`.
- [ ] Documentación de desarrollo: pasar §21 y §30 a «implementado».
- [ ] `npm version 1.1.15 --no-git-tag-version`, `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Archivo de feriados del usuario (feriados personales o un país nuevo); feriados que cambian la Semana laboral, las rachas o las tareas; proyectar en Año, Gantt, Lista, Tabla, Kanban u Overview; proyectar reglas `when done`; escribir los hábitos como tareas en las notas; marcar los días de vacaciones en el calendario.

## Próxima fase — v1.1.16: Dashboard (diseño)

> Comportamiento: [[Especificación de vistas]] §22. Mecanismo: [[Arquitectura técnica]] §31. Los widgets de hábitos y el heatmap compartido se resumen en el diseño de hábitos (Especificación de hábitos §14). **Nada de esta versión está implementada.** Decidido el 2026-11-01 y el 2026-11-02; la disposición por defecto de los paneles se define al diseñar (ver «Por resolver» en Especificación §22).
>
> **Orden de trabajo**: HM1 primero (DT1 y DW1 lo necesitan); DP1 → DP2 → DP3 para el panel de vida; DA1 y DR1 pueden ir en cuanto exista el registro de paneles (DP1). CV16 cierra la versión.

### Fase HM1 — Componente de heatmap reutilizable (independiente; Especificación §22, Arquitectura §31)
- [ ] Componente agnóstico: recibe una métrica (función `fecha → valor`), su escala de color y el texto del tooltip; no sabe de tareas ni de hábitos.
- [ ] El heatmap de hábitos migra al componente (métrica «% cumplido») y debe quedar **idéntico al actual**; se elimina el código duplicado `oa-habit-heatmap-*` (hoy en `habit-overview-view.ts`).
- [ ] Verificable sola: Node (la métrica y la escala devuelven lo mismo que el cálculo actual de hábitos); comparación visual antes y después en tema claro y oscuro.

### Fase DT1 — Heatmap de tareas (depende de HM1)
- [ ] Métricas Completadas (✅), Vencimientos (📅), Creadas (➕), Programadas (⏳) e Inicio (🛫), con un chip `Métrica` sobre el widget; año navegable con ◀ ▶.
- [ ] Barra de filtros compartida (prioridad, estado, área y búsqueda) con estado guardado por widget (clave `dashboard.heatmap`); con filtros activos el widget lo indica de forma visible.
- [ ] Verificable sola: Node (conteo por fecha de cada métrica con y sin filtros); prueba manual en el Overview.

### Fase DW1 — Widgets de hábitos (depende de HM1)
- [ ] «Hábitos de hoy» (cumplidos de los que tocan hoy, con barra), «Racha actual» (la mejor racha entre los activos, con la máxima de subtítulo), «Esta semana» (siete anillos por día con el porcentaje semanal) y el heatmap anual de hábitos; reutilizan `habit-stats.ts` y `habit-streak.ts`.
- [ ] Con la pestaña Hábitos oculta, no aparecen en «Añadir panel» y los ya añadidos se ocultan sin perder la disposición.
- [ ] Verificable sola: Node (los cuatro cálculos con y sin vacaciones y periodo activo); prueba manual en el Overview.

### Fase DP1 — Registro de paneles y disposición (independiente; Especificación §22, Arquitectura §31)
- [ ] Registro de paneles (cada widget actual y los nuevos con módulo: Hoy, Tareas, Hábitos, Progreso y tamaño fijo por tipo) y disposición (pestañas, paneles y orden) guardada en `data.json` (Modelo de datos §14).
- [ ] Migración del estado actual de las casillas (`obsidian-agenda-widget-filters` en `localStorage`) a las 3 pestañas iniciales; el estado de filtros por widget se guarda con la clave `dashboard.<widget>`.
- [ ] Verificable sola: Node (migración desde varias combinaciones de casillas, disposición vacía o inválida, al menos una pestaña); el Overview se ve igual que antes con la disposición migrada.

### Fase DP2 — Pestañas y modo Editar (depende de DP1)
- [ ] Pestañas del usuario (nombre, orden y paneles propios; un panel puede estar en varias); 3 iniciales (p. ej. Hoy, Tareas y Hábitos); siempre queda al menos una.
- [ ] Modo «✎ Editar» (con «✓ Listo») que reemplaza al panel de casillas: `×` para quitar, «＋ Añadir panel» (lista directa sin modal, agrupada por módulo, con los ya presentes atenuados) y gestión de pestañas (renombrar, reordenar, borrar y `＋`).
- [ ] Verificable sola: crear, renombrar, reordenar y borrar pestañas; quitar y añadir paneles; recargar y sincronizar `data.json`.

### Fase DP3 — Arrastre en cuadrícula fluida (depende de DP2)
- [ ] Asa ⠿ para reordenar paneles en una cuadrícula fluida de tamaño fijo por tipo (sin redimensionar ni posición libre); en móvil, columna única y arrastre solo en modo Editar.
- [ ] Verificable sola: arrastre con ratón y táctil (`app.emulateMobile(true)` y dispositivo real); fuera del modo Editar el scroll no se interrumpe.

### Fase DA1 — Panel «Agenda de hoy» (depende de DP1)
- [ ] Lista del día ordenada por hora: tareas con `🕐` (con su duración y el color de su área), debajo las de todo el día y los hábitos del día como el chip `🔁 3/5`; reutiliza los datos y las entradas del calendario (HC1 de v1.1.15).
- [ ] Verificable sola: con tareas con y sin hora y con hábitos, el orden y los conteos coinciden con la vista Día del calendario.

### Fase DR1 — Paneles «Resumen del día» y «Revisión de la semana» (depende de DP1)
- [ ] «Resumen del día»: líneas con número (tareas para hoy y cuántas con hora, vencidas, hábitos de hoy y cumplidos, próxima tarea con hora y el aviso de unas vacaciones que empiezan); las líneas sin datos se ocultan; pulsar una línea abre la vista correspondiente.
- [ ] «Revisión de la semana»: siete anillos por día, porcentaje semanal con ▲/▼ contra la semana anterior, mejor día, día a mejorar, racha y tareas completadas contra la semana pasada.
- [ ] Ambos son paneles seleccionables (no fijos), calculados en local, sin IA, sin red y sin notificaciones del sistema.
- [ ] Verificable sola: Node (cada línea y comparación con semanas completas, vacías y con vacaciones).

### Fase CV16 — Cierre de v1.1.16: pruebas manuales y documentación (depende de HM1 a DR1)
- [ ] Pruebas manuales: heatmap de hábitos idéntico; heatmap de tareas con cada métrica y filtros; migración desde un `data.json` y un `localStorage` de la versión anterior; pestañas, modo Editar y arrastre en escritorio, tableta y teléfono; paneles nuevos con y sin datos; pestaña Hábitos oculta.
- [ ] README (badge, What's New, News, Features, Gestures, Configuration, Changelog y lista de próximas versiones), manual de usuario en/es, `whats_new.v1_1_16` en los 6 idiomas, `'1.1.16'` en `WHATS_NEW_VERSIONS` de `src/core/whats-new.ts`.
- [ ] Documentación de desarrollo: pasar §22 y §31 a «implementado».
- [ ] `npm version 1.1.16 --no-git-tag-version`, `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Filtros globales del Dashboard (solo la clave por widget); disposición aparte para móvil; redimensionar paneles o posición libre; el agente de revisión con un modelo de IA, la red y las notificaciones (dependen de decidir red, privacidad y notificaciones); «Día recomendado» (pasó a «Gestión de Tiempo Avanzada», sin versión).

## Próxima fase — v1.1.17: tareas y estados (diseño)

> Comportamiento: [[Especificación de vistas]] §17 (compatibilidad con Tasks), §23 (Tabla), §24 (reloj) y §25 (estados). Mecanismo: [[Arquitectura técnica]] §32 a §35. **Nada de esta versión está implementada.** Decidido el 2026-11-02. Los estados personalizados van al final porque tocan el modelo de estados de todo el plugin (`CoreTaskStatus` aparece unas 66 veces en 10 archivos); es el cambio de más riesgo de la versión.
>
> **Orden de trabajo**: ES1 → ES2 → ES4 (y ES3 en paralelo con ES2, después de ES1); TK1, TK2, TM1 y TB1 son independientes entre sí; TB2 necesita TB1 y L3 (v1.1.14, el CSV exporta el carril). CV17 cierra la versión.

### Fase ES1 — Registro de estados y símbolo preservado (independiente; Especificación §25, Arquitectura §34)
- [ ] Registro de estados: símbolo, nombre, icono y tipo (TODO, IN_PROGRESS, ON_HOLD, DONE, CANCELLED, NON_TASK); los 6 actuales son el punto de partida (editables en nombre e icono, no borrables; nombre traducido hasta que el usuario lo edite) (Modelo de datos §16).
- [ ] Un símbolo sin definir se trata como Pendiente pero **conserva su símbolo y nunca se reescribe** (hoy `Task.extractStatusFromHeader()` lo reduce a Pendiente y lo pierde).
- [ ] Verificable sola: Node (símbolo → estado y tipo con los 6 base y con un símbolo desconocido que se conserva al escribir la línea).

### Fase ES2 — Comparaciones por tipo (depende de ES1; Arquitectura §34)
- [ ] Reemplazar las comparaciones por símbolo (`=== CoreTaskStatus.Done`, `isTaskOpen()`, `isTaskCompleted`, el cambio de estado y la recurrencia) por preguntas al tipo: Hecho añade `✅`, dispara la recurrencia y cuenta como cerrado; Cancelada y No es tarea cuentan como cerrado; el resto como abierto.
- [ ] Verificable sola: Node (traducción símbolo → tipo en cada punto reemplazado); con solo los 6 estados base, el plugin se comporta igual que en v1.1.16 (es la prueba de no regresión).

### Fase ES3 — Ajustes de estados (depende de ES1; Especificación §25, Arquitectura §34)
- [ ] Lista editable de estados en ambas rutas de los ajustes (cómo se edita con la API declarativa de Obsidian 1.13 queda por resolver al diseñar), con «Restablecer» de los nombres base.
- [ ] Botón «Importar de Tasks» (una sola vez): lee símbolo, nombre y tipo de los ajustes de Tasks e ignora el próximo símbolo.
- [ ] «Símbolos encontrados sin definir» (p. ej. `R (3 tareas)`) con un botón para definirlos.
- [ ] Verificable sola: Node (importación desde un JSON de Tasks y conteo de símbolos sin definir); prueba manual en los ajustes.

### Fase ES4 — Estados en barra, Kanban, `Group` y `Lanes` (depende de ES2)
- [ ] `STATUS_OPTIONS` (`src/core/task-status-options.ts`, fuente única de menú, agrupado y barra) pasa a generarse desde la configuración.
- [ ] Kanban, `Group: Estado` y `Lanes: Estado` generan un valor por estado en el orden de los ajustes; arrastrar a una columna asigna ese símbolo.
- [ ] El filtro de estado de la barra compartida (incluida la del calendario) genera su lista desde la configuración, usando la función que preparó M2 de v1.1.14.
- [ ] Verificable sola: Node (columnas, grupos y carriles por estado en el orden de ajustes) y prueba manual de arrastre con un estado nuevo.

### Fase TK1 — `🏁 delete` con confirmación (independiente; Especificación §17, Arquitectura §35)
- [ ] `keep` sigue siendo el comportamiento por defecto; `delete` se implementa al completar una tarea (menú de estado del calendario, modal y arrastre en Kanban) con una confirmación breve («Esta tarea se borrará del archivo»), la única acción destructiva de la versión.
- [ ] Advertencia en el modal al crear y al editar con `🏁 delete`.
- [ ] Método para borrar líneas en `TaskWriter` (por crear; nombre propuesto `deleteTaskLine()`, con la misma comprobación del texto esperado que `updateTaskLine()`); si la tarea es recurrente, se inserta primero la siguiente ocurrencia y luego se borra la línea completada.
- [ ] Verificable sola: Node (cálculo de las líneas resultantes, con y sin recurrencia y con el texto esperado distinto); prueba manual con cancelar la confirmación.

### Fase TK2 — Botón Generar `🆔` (independiente; Especificación §17)
- [ ] Botón **Generar** en el campo `🆔` del modal (formato de Tasks: base 36 de 6 caracteres, sin repetir ids del vault); el modal no asigna `🆔` por defecto.
- [ ] Verificable sola: Node (formato y no repetición con un vault de ejemplo); prueba manual en crear y editar.

### Fase TM1 — Reloj de esfera (independiente; Especificación §24, Arquitectura §33)
- [ ] `src/modals/task-time-picker-modal.ts`: la rueda de horas y minutos se reemplaza por un reloj de esfera en dos pasos (hora y luego minutos; los números del encabezado se pueden pulsar para cambiar de paso).
- [ ] 12 h con botones AM y PM; en la línea se sigue guardando en 24 h (`🕐 14:30`); minutos exactos (marcas de 5 y arrastre de 0 a 59); Cancelar y Guardar.
- [ ] Actualizar el ADR-T3 (Modelo de datos §9), que fijó 24 h; tamaño táctil de la esfera en móvil por confirmar.
- [ ] Verificable sola: Node (conversión 12 h ↔ 24 h y ángulo → hora y minuto, incluidas 12 AM y 12 PM); prueba manual en escritorio, tableta y teléfono.

### Fase TB1 — Tabla: columnas personalizables (independiente; Especificación §23, Arquitectura §32; reutiliza `src/core/task-table-columns.ts` de la fase U7)
- [ ] Registro de columnas con las cinco nuevas, ocultas por defecto: Sub-área, Archivo, Hora, Duración y Recurrencia.
- [ ] Popover del mismo estilo que los chips (sin modal) para mostrar, ocultar y reordenar (arrastre) con «Restablecer»; las columnas de fecha conservan su regla de ocultarse solas si nadie tiene valor, con la opción de forzarlas.
- [ ] Estado guardado por vista (Modelo de datos §15).
- [ ] Verificable sola: Node (visibilidad y orden con el estado por defecto, uno personalizado, uno inválido y las fechas sin valor); prueba manual con arrastre y recarga.

### Fase TB2 — Tabla: CSV (depende de TB1 y de L3 de v1.1.14; Especificación §23, Arquitectura §32)
- [ ] Exporta lo que se ve: tareas filtradas, columnas visibles en su orden y el orden de filas actual; con Lanes añade una columna con el nombre del carril.
- [ ] «Exportar CSV» (archivo `tareas-AAAA-MM-DD-HHmm.csv` en el vault, carpeta configurable, por defecto `agenda-exports/`, con un aviso que muestra la ruta) y «Copiar CSV» (portapapeles).
- [ ] Formato fijo: coma, UTF-8 con BOM, fechas `AAAA-MM-DD`, campos escapados; sin ajuste de separador.
- [ ] Inyección de fórmulas: toda celda de texto que empiece con `=`, `+`, `-` o `@` lleva un apóstrofo delante (decidido el 2026-11-03); fechas y números no se tocan; prueba de Node.
- [ ] Verificable sola: Node (escape de comas, comillas y saltos de línea, BOM, fechas, columna de carril); prueba manual abriendo el archivo en Excel.

### Fase CV17 — Cierre de v1.1.17: pruebas manuales y documentación (depende de ES1 a TB2)
- [ ] Pruebas manuales: con solo los 6 estados base todo se comporta como antes; un estado nuevo en menú, Kanban, `Group`, `Lanes` y filtros; un símbolo sin definir que se conserva; importar de Tasks; `🏁 delete` en recurrente y no recurrente; Generar `🆔`; el reloj; columnas de la Tabla y CSV con y sin Lanes.
- [ ] README (badge, What's New, News, Features, Gestures, Configuration, Changelog y lista de próximas versiones), manual de usuario en/es, `whats_new.v1_1_17` en los 6 idiomas, `'1.1.17'` en `WHATS_NEW_VERSIONS` de `src/core/whats-new.ts`.
- [ ] Documentación de desarrollo: pasar §17, §23 a §25 y §32 a §35 a «implementado»; cerrar la Fase U5.
- [ ] `npm version 1.1.17 --no-git-tag-version`, `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
«Próximo símbolo» (el estado se elige directo); filtro global de Tasks (descartado); diseños de Tabla guardados con nombre y diálogo de opciones de exportación; ajuste de separador del CSV; sincronía con Google Calendar (v1.1.18); cambiar la fecha de referencia de la recurrencia a la de Tasks (se mantiene `scheduled > due > start`, con aviso en el manual).

## Riesgos de v1.1.14 a v1.1.17 (del registro de decisiones)

| Riesgo | Versión | Mitigación |
|---|---|---|
| El calendario redibuja la vista entera al navegar y el buscador de la barra perdería el foco | v1.1.14 (CF2) | Redibujar solo la parte del calendario o montar la barra fuera de ella; prueba manual de foco |
| La cabecera de fechas repetida en cada carril del Gantt puede resultar pesada o confusa («a probar») | v1.1.14 (L4) | Probar con datos reales antes de cerrar L4; la ventana y el zoom son únicos |
| Tabla con encabezado repetido por carril: anchos y `resizeColumns()` | v1.1.14 (L3) | Columnas y anchos compartidos, calculados una vez |
| Lanes por etiqueta repite tareas: los conteos de carriles no suman el total | v1.1.14 (L1) | Documentarlo en el tooltip y en la Especificación; «Sin etiqueta» al final |
| Elegir un campo en uso cambia el otro chip sin que el usuario lo pida | v1.1.14 (L2) | Solo en Lista, Tabla y Gantt (el otro chip pasa a Ninguno); el tooltip lo avisa; en Kanban la opción se bloquea |
| Traducciones de «Lanes» sin revisión de hablantes nativos | v1.1.14 (L2) | Revisarlas antes de publicar |
| Cambiar los días no laborables altera rachas y porcentajes de hábitos | v1.1.15 (NL2) | Texto fijo y `Notice` al cambiar el ajuste |
| Reglas de feriados mal calculadas (Pascua, observado, n-ésimo día, ciclo de 6 años) | v1.1.15 (FE1) | Pruebas de Node por tipo de regla y por año; solo visual, no afecta a tareas |
| Muchas ocurrencias proyectadas ensucian las vistas y cuestan cálculo | v1.1.15 (PR1, PR2) | N configurable (10 por defecto, 0 la desactiva); fantasmas de solo lectura; `when done` no se proyecta |
| La API `app.setting.openTabById` no está documentada | v1.1.15 (HV1) | Si falla, un `Notice` indica la ruta de ajustes |
| Migrar el heatmap de hábitos al componente nuevo puede cambiar su aspecto | v1.1.16 (HM1) | Debe quedar idéntico; comparación visual y pruebas de la métrica |
| Migrar las casillas del Overview (`localStorage`) a `data.json` puede perder la disposición | v1.1.16 (DP1) | Migración a las 3 pestañas iniciales con pruebas de Node; siempre una pestaña como mínimo |
| El arrastre táctil compite con el scroll en móvil | v1.1.16 (DP3) | Arrastre solo en modo Editar; prueba en dispositivo real |
| Reemplazar `CoreTaskStatus` (unas 66 veces en 10 archivos) rompe comportamientos que dependen del símbolo | v1.1.17 (ES2) | Estados base primero como prueba de no regresión; pruebas de Node símbolo → tipo; el filtro de estado ya lee su lista de una función (M2) |
| Un símbolo sin definir se perdería al reescribir la línea | v1.1.17 (ES1) | Se conserva siempre; los ajustes lo listan para definirlo |
| `🏁 delete` borra una línea del archivo | v1.1.17 (TK1) | Confirmación al completar y advertencia en el modal; con recurrencia se inserta primero la siguiente; pruebas de Node del cálculo de líneas |
| Tamaño táctil del reloj de esfera en móvil | v1.1.17 (TM1) | Por confirmar al probar en teléfono |
| El CSV con acentos se ve mal en Excel | v1.1.17 (TB2) | UTF-8 con BOM y campos escapados; prueba abriendo el archivo en Excel |

## Próxima fase — v1.1.18: sincronía con Google Calendar (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §15. Mecanismo: [[Arquitectura técnica]] §24. **Nada de esta fase está implementada.** Sin decisiones de diseño abiertas (Especificación §15.8). Pasó de v1.1.15 a **v1.1.18** el 2026-11-02, al repartir v1.1.14 a v1.1.17 por tema (los bloques de esas versiones están justo arriba); Google Tasks pasa a v1.1.19 y Microsoft a v1.1.20. Como el repo no tiene pruebas automatizadas, cada fase incluye sus scripts de prueba de Node.

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
