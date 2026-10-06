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

- [ ] **Timeline view**: registrada en `ViewManager` y renderiza, pero sin lógica de posicionamiento temporal — pendiente de diseño de datos (eje de tiempo, agrupación por rango) y de plantilla propia.
- [ ] **Gantt view**: mismo estado; pendiente cálculo de duración (`start`→`due`) y representación de `dependsOn` como dependencias visuales entre barras.
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
- [ ] Actualizar README (News, Changelog, Gestures) y `docs/todo.md`, indicando el cambio de comportamiento al cambiar de vista.
- [ ] Subir versión a 1.1.9 al terminar (`npm version 1.1.9 --no-git-tag-version`).

### Validación manual (no hay framework de pruebas ni vault de prueba)
- [ ] Casos de §4.6.9 de [[Especificación de vistas]]: fin de año y bisiesto, inicio de semana en lunes y domingo, las cinco vistas con fecha distinta de hoy, seis idiomas, tema claro y oscuro, panel estrecho.
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
- [ ] Tareas de distinta duración (sin duración, <30min, 30–59min, 60min, >120min) en las mismas horas, con y sin solape.
- [ ] Redimensionar hasta el límite mínimo (30 min) y hasta cruzar medianoche (se recorta al final del día, ADR-T7).
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Redimensionar arrastrando el borde superior (cambia la hora de inicio, no la duración); posicionar tareas sin duración dentro de la media hora exacta.

## Próxima fase — v1.1.9 (cont.): doble clic para crear tarea en la vista Día (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.4.1. Mecanismo: [[Arquitectura técnica]] §11. **Nada de esta fase está implementado.** Decisión 1 de §4.4.2 confirmada: se corrige `modalOptions.today` junto con esta fase.

### Fase Única
- [ ] Corregir `TaskModal.buildTemplateData()` para leer `modalOptions.today` (bug preexistente que afecta también a Mes/Semana/Semana laboral/Año) y una clave nueva `modalOptions.scheduledTime`.
- [ ] Reemplazar `.oa-calendar-day-column` por `.oa-calendar-hour-slot`/`.oa-calendar-allday-content` en el selector compartido de `CalendarView.setupViewSpecificEventListeners()`, o cablear un listener específico en `CalendarDayView`.
- [ ] Doble clic en franja horaria: abre creación con fecha + hora prellenadas. Doble clic en "Todo el día": reutiliza `openCreateTaskForDate()` sin cambios.
- [ ] `min-height` en `.oa-calendar-allday-content` para que el área vacía siga siendo un blanco de doble clic aunque no haya tareas de todo el día ese día.
- [ ] Verificable sola: doble clic en una franja horaria de un día distinto a hoy prellena la fecha Y la hora correctas; doble clic en Mes/Semana para un día distinto a hoy ya no prellena "hoy" por error.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

## Próxima fase — v1.1.9 (cont.): selector de tipo de vista como multi-botón segmentado (implementado)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.8. Mecanismo: [[Arquitectura técnica]] §12. Decisiones de §4.8.1 confirmadas: tooltip obligatorio; set de íconos (calendar-range/calendar-days/columns-3/briefcase/calendar-clock).

### Fase Única
- [x] Nueva clase `.oa-calendar-view-segmented` (variante compacta, sin espacio entre botones, de `.oa-priority-segmented`/`.oa-priority-pill`).
- [x] Reemplazar el `<select id="oa-calendar-view-dropdown">` por el grupo de botones en las 5 plantillas de calendario (serán 6 cuando se sume la vista Lista en v1.1.10).
- [x] Cada botón: ícono vía `setIcon()` + `title` con la clave i18n existente de la vista (se vuelve tooltip automáticamente).
- [x] `CalendarView.setupViewSpecificEventListeners()`: cambiar el listener `change` del `<select>` por `click` por botón, llamando a la misma `switchToViewType()`.
- [x] Verificable sola: un clic cambia de vista igual que hoy el dropdown; el botón activo se marca visualmente; los 5 botones caben en el encabezado sin desbordarse.
- [x] `npm run build` y ESLint sobre los archivos tocados.

## Próxima fase — v1.1.10: vista Día, modo de varios días 1/3/5 (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.4.3. Mecanismo: [[Arquitectura técnica]] §13. **Pospuesto de v1.1.9 a v1.1.10. Nada de esta fase está implementado.** Depende de las Fases A/B/C del §4.7 (bloques con duración, carriles y redimensionar) ya implementadas.

## Próxima fase — v1.1.10: manejo de estatus desde el calendario (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.9 y §7.5. Símbolos: [[Modelo de datos]] §10 (ADR-S1 a S3). Mecanismo: [[Arquitectura técnica]] §14. **Pospuesto de v1.1.9 a v1.1.10.** Fix de `task-filter.ts` ya aplicado; el resto de la fase no está implementado.

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
- [ ] Los 6 estados se reconocen correctamente al parsear una nota existente con cada símbolo.
- [ ] Cambiar a `Done` agrega `✅ <hoy>`; cambiar desde `Done` a cualquier otro estado la quita.
- [ ] El fix de `task-filter.ts` no rompe ningún filtro existente que dependiera (sin saberlo) del bug.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Filtrar el calendario por estado; estados personalizados/configurables; generación de nuevas ocurrencias de tareas recurrentes al marcar `Done` (se diseña aparte).

### Fase Única
- [ ] Multi-botón 1/3/5 dentro de `calendar-day-view.hbs`, visible solo en esta vista; preferencia persistida en `localStorage`.
- [ ] `generateViewData()` calcula el rango centrado de fechas según `daysToShow` y genera una columna por día, reutilizando la lógica de segmentos/carriles de duración ya definida para un solo día.
- [ ] Plantilla: `.oa-calendar-hour-row` con 1 etiqueta de hora compartida + N celdas; sección "todo el día" repetida por columna.
- [ ] `navigateToPrevious()`/`navigateToNext()` mueven la ventana un día a la vez en este modo.
- [ ] Verificable sola: con "3" o "5" activos, el día de referencia queda al centro; ninguna tarea ni carril cruza entre columnas; ◀▶ desplazan de a un día.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance (fecha de referencia y selector de fecha)
- Seleccionar con clic en una celda, rangos de fechas, escribir la fecha a mano, navegar la rejilla con flechas del teclado, y corregir que Semana use semana ISO en vez de `weekStartDay`.

## Próxima fase — v1.1.10: selector de fecha unificado en el Task Modal (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §7.6. Mecanismo: [[Arquitectura técnica]] §15. **Nada de esta fase está implementado.** Depende de `CalendarDatePicker` (§9, ya implementado e independiente de las vistas de calendario).

### Fase Única
- [ ] `TaskModal.setupSimpleDatePicker()`: reemplazar la llamada a `flatpickr()` por un popover de `CalendarDatePicker`, anclado al botón disparador existente de cada campo (due/start/scheduled).
- [ ] Exponer `getWeekStartDay()`/`getLocalizedDayNames()`/`hasTasks()` al modal (mismos settings que ya usa `CalendarView`, vía `TaskManager`).
- [ ] Marcar con punto los días con tareas existentes, igual que en el calendario.
- [ ] Solo un popover abierto a la vez entre los 3 campos (cerrar el anterior al abrir otro).
- [ ] Verificable sola: los 3 campos de fecha abren el mismo selector visual que usan las vistas de calendario; hora y duración siguen funcionando sin cambios.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Quitar `flatpickr` como dependencia del proyecto (sigue en uso en la inserción de campos desde el editor, §6); migrar esa otra superficie al mismo componente.

## Próxima fase — v1.1.10: vista de lista dentro del calendario (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §4.10. Mecanismo: [[Arquitectura técnica]] §17. **Nada de esta fase está implementado.**

### Fase Única
- [ ] Nueva `CalendarListView` + `CALENDAR_LIST_VIEW_TYPE`, registrada en `ViewManager` igual que las otras 5 vistas de calendario.
- [ ] `generateViewData()`: ventana continua de 14 días desde la fecha de referencia, reutilizando `WeekDayData`/`getTasksForDate()`.
- [ ] Nueva plantilla `calendar-list-view.hbs`: una fila por día, reutilizando el bloque de renderizado de `.oa-calendar-task` ya usado en Mes/Semana (sin plantilla nueva para las píldoras).
- [ ] 7º botón en `.oa-calendar-view-segmented` en las 6 plantillas de calendario.
- [ ] `navigateToPrevious()`/`navigateToNext()` mueven la ventana completa de 14 días.
- [ ] Verificable sola: la vista muestra 14 filas con sus tareas; clic/doble clic/drag and drop se comportan igual que en Mes/Semana.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

## Próxima fase — v1.1.10: modal de duración con dial circular (diseño)

> Comportamiento y decisiones: [[Especificación de vistas]] §7.7. Mecanismo: [[Arquitectura técnica]] §18. **Nada de esta fase está implementado.**

### Fase Única
- [ ] Extraer `HabitEditorModal.attachTimeDial()` a `src/core/time-dial.ts`, parametrizado por `maxMinutes`/`stepMinutes`.
- [ ] `HabitEditorModal` usa el componente extraído con los mismos valores que tiene hoy (`120`/`1`), sin cambio de comportamiento.
- [ ] `TaskDurationModal` usa el componente con `1440`/`5`.
- [ ] Verificable sola: el Habit Editor se comporta igual que antes; el modal de duración del Task Modal usa el dial en vez del input numérico, con pasos de 5 minutos hasta 1440.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

## Próxima fase — v1.1.10: compatibilidad con tareas recurrentes (diseño)

> Comportamiento y decisiones: [[Modelo de datos]] §11. Mecanismo: [[Arquitectura técnica]] §16. **Nada de esta fase está implementado.** Depende del manejo de estatus (fase anterior): se dispara desde el mismo punto donde se marca una tarea como `Done`.

### Fase Única
- [ ] `getNextOccurrenceDate(recurrenceText, referenceDate)`: despoja `when done`, reutiliza `convertToRRuleFormat()` + `rrulestr().after()`.
- [ ] `buildNextOccurrenceLine(originalLine, nextDate)`: desplaza todas las fechas presentes manteniendo su distancia relativa; elimina `🆔`/`⛔`.
- [ ] `TaskWriter`: nuevo método para insertar una línea completa en una posición específica (una línea arriba de la original).
- [ ] Enganchar en el mismo punto de `upsertTaskStatus()` que agrega `✅` (manejo de estatus, fase previa).
- [ ] Verificable sola: completar una tarea con `🔁 every week` crea una nueva línea arriba con la fecha avanzada una semana; completar una con `when done` la calcula desde hoy; los `🆔`/`⛔` no aparecen en la nueva línea.
- [ ] `npm run build` y ESLint sobre los archivos tocados.

### Fuera de alcance
Configurar el orden de inserción (arriba/abajo); recurrencia "para X veces" o "hasta una fecha"; generar la ocurrencia al completar desde el checkbox nativo de Obsidian fuera del plugin.
