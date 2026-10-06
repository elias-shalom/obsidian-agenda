Desarrollo Agenda Tasks for Obsidian

# OBS Agenda Plugin

Un complemento integral de gestión de tareas y calendario para Obsidian (https://obsidian.md).

OBS Agenda transforma tu bóveda en un potente sistema de productividad al ofrecer interfaces intuitivas de gestión de tareas y vistas de calendario. Se integra a la perfección con tus notas de Obsidian y organiza las tareas en múltiples vistas.

## Características

### Características generales
- ✅ Analiza y monitoriza tareas de todo tu vault
- ✅ Compatible con la sintaxis y los metadatos de [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)
- ✅ Múltiples tipos de vista para gestionar tareas según tu flujo de trabajo
- ✅ Actualizaciones de tareas en tiempo real
- ✅ Interfaz personalizable con compatibilidad con temas
- ✅ Atajos de teclado para acciones comunes
- ✅ Soporte para localización

### Vista general
- ✅ Resumen de tareas estilo panel
- ✅ Estadísticas y seguimiento del progreso
- ✅ Acceso rápido a las próximas fechas límite
- ✅ Distribución de tareas por proyecto/carpeta
- ✅ Resaltado de tareas vencidas
- ✅ Widgets personalizables

### Vista de lista
- ✅ Lista de tareas personalizable con múltiples columnas
- ✅ Filtrado avanzado por fecha, proyecto, prioridad y Etiquetas
- ✅ Agrupación de tareas por fecha, carpeta, estado o atributos personalizados
- ✅ Edición de tareas en línea
- ✅ Grupos de tareas contraíbles
- ✅ Acciones masivas para múltiples tareas

### Vista de tabla
- ✅ Gestión de tareas estilo hoja de cálculo
- ✅ Columnas y diseños personalizables
- ✅ Columnas ordenables y redimensionables
- ✅ Entrada y edición rápida de atributos de tarea
- ✅ Exportación a CSV
- ✅ Formato condicional

### Vista de calendario
- ✅ Múltiples diseños de calendario (día, semana, semana laboral y mes)
- ✅ Visualización de tareas en cuadrícula
- ✅ Minicalendario para una navegación rápida por fechas
- ✅ Indicadores de tareas que muestran los días con mayor actividad
- ✅ Creación rápida de tareas en momentos específicos
- ✅ Sincronización con las notas diarias nativas de Obsidian

# Planificado para futuras características de versiones

## 🎯 Características (v1.0.2)

### Core Tasks
- [x] Compatibilidad mejorada con el formato dataview del plugin de Tareas (por ahora solo es compatible con el formato emoji)
- [x] Compatibilidad con dispositivos móviles (validar que sea compatible)

### UX Improvements
- [x] Imagen de cargado - spinner (siguente)
- [x] Agregar atajo de ctrl + p (Se agregó el command palette para abrir la obs agenda)

### Calendar Enhancements
- [x] Calendario. Vista por año !(se agregó solo visualización)
- [x] Mejorar el diseño de los contenedores de las tareas

## 🎯 Características (v1.0.3)

### UX Improvements
- [x] Configuración de las vistas que aparecen en el encabezado

### Calendar Enhancements
- [x] agregar fecha al panel de overview
- [X] agregar el numero de la semana en vista semanal

## 🎯 Características (v1.0.4)
- [x] Creación de tareas nativas en las vistas de OBS Agenda (abc tarea al calendario)
- [x] Agregar atajo de ctrl + p (Se agregó el command palette para crear tareas)

### UX Improvements
- [x] Boton de reload de tareas
- [x] On mouse over en la lista
- [x] Orden alfabetico de la vista de lista
- [x] Linea de días en mes

### Calendar Enhancements
- [x] Funcion en vista anual ir a vista por día

## 🎯 Características (v1.0.5)
- [x] Skeleton loading (reemplazo del spinner)
- [x] Mejoras estéticas en la vista de lista
- [x] Distinción y resaltado de prioridades en la lista
- [x] Nuevo hero widget en el dashboard
- [x] Mejoras generales de UI/UX

## 🎯 Características (v1.1.0)

### Task Management Views
- [x] Habit tracker (módulo completo: Grid, Rutina, Dashboard/Overview, Semanal y Lista/Tabla, más el Habit Creator para crear/editar hábitos — ver [[habit-tracker-agenda/README]])
- [x] Rutina diaria (vista Rutina, con orden y agrupado configurables por daytime/área)
- [x] Visualización de rachas de hábitos (píldoras/racha en Grid y Semanal, heatmap anual en el Dashboard de hábitos)

## 🎯 Características (v1.1.1)

### UX Improvements
- [x] Configuración de settings adaptada a la API declarativa de Obsidian 1.13+ (`getSettingDefinitions()`), visible en el buscador global de ajustes en versiones nuevas; se mantiene `display()` como fallback en versiones anteriores a 1.13.0
- [x] Icono propio por cada tab principal (Overview, List, Table, Calendar, Habits) en el tab de Obsidian, en vez de un icono compartido

### Core Tasks
- [x] Limpieza de type-safety y lint en el módulo de Habit Tracker (sin aserciones de tipo innecesarias, sin accesos inseguros a `any`)

## 🎯 Características (v1.1.2)

### Task Management Views
- [x] Campo `relatedFile` (reemplaza a `subArea`): enlaza una nota de apoyo al hábito (wikilink), con el mismo picker/autocompletado que el modal de tareas; abrible desde la columna 🔗 de la Tabla y desde la vista Rutina
- [x] Vista Tabla/Lista: ahora incluye hábitos inactivos con columna de Activo/Inactivo de solo lectura; el renglón solo responde a doble-clic (abre el Habit Editor) — el clic simple ya no hace nada

### UX Improvements
- [x] Habit Editor: sincronización bidireccional entre el combo de frecuencia y los checkboxes de días (elegir un preset marca los días; marcar días actualiza el combo al preset correspondiente o a "Custom"); bloquea guardar si no hay ningún día seleccionado
- [x] Habit Editor: los checkboxes de Daytime y de días de la semana ahora se acomodan en una grilla fija de 3 por fila
- [x] Grid/Semanal: los días no programados encerrados dentro de una racha activa ahora se pintan como una línea delgada de conexión en vez de cortar la píldora; un hábito completado en un día que después se quitó de la frecuencia ahora muestra un marcador distintivo (círculo con diagonal roja) en vez de desaparecer visualmente
- [x] Grid/Semanal: corregido el parpadeo de la forma incorrecta de la píldora durante la espera entre el toggle optimista y el refresco real

## 🎯 Características (v1.1.3)

### Task Management Views
- [x] Descripción del hábito: ahora se guarda en el cuerpo de la nota en vez del frontmatter (con compatibilidad hacia notas antiguas)
- [x] Campo `related` (reemplaza a `relatedFile`): ahora admite múltiples wikilinks; se agregan uno por uno desde el Habit Editor con autocompletado y se muestran como chips removibles debajo del campo
- [x] Nuevo campo opcional **Sub-área**: combobox poblado con las subcarpetas de 2º/3er nivel del área elegida (ej. `body/salud`); oculto por defecto, activable en Settings ▸ Habits; se muestra debajo del área en las vistas Lista y Rutina cuando está activo
- [x] Vista Lista de hábitos: orden por defecto cambiado a alfabético por nombre (antes era por prioridad)

### 🐛 Correcciones
- [x] Corregido: al editar/borrar un hábito, este desaparecía brevemente de las vistas Rutina/Lista hasta recargar (condición de carrera entre el refresco async de la caché y el evento `habits-refresh`)
- [x] Corregido: `loadSettings()` perdía silenciosamente cualquier ajuste nuevo no incluido en su whitelist manual, reseteándolo a su valor por defecto en cada carga/actualización del plugin; reemplazado por un merge genérico (`{ ...DEFAULT_SETTINGS, ...data }`)

### Documentación
- [x] README: sección "🆕 News" con lo último de la versión en curso + callout destacado arriba, además de la entrada correspondiente en el Changelog completo

## 🎯 Características (v1.1.4)

### Core Tasks
- [x] Compatibilidad con la programación de tareas según la hora del día [vista por día (hora y día completo)] — Fases A a E completas; ver `docs/agenda-tasks/Modelo de datos.md` §9 (ADR-T1 a T7) y `docs/agenda-tasks/Plan de implementación.md`
  - [x] `due` siempre día completo (sin hora); `scheduled` es el único campo con hora, en modo punto o modo bloque con duración
  - [x] Icono de hora (🕐) y de duración (⏱️) como campos de primer nivel independientes, detectados en cualquier posición del renglón (revisado — no rompe compatibilidad con Obsidian Tasks)
  - [x] Insertar desde el archivo vía comando/atajo (menú nativo) y vía clic derecho (menú contextual sobre la línea), reutilizando `flatpickr` para fechas y un wheel picker propio para la hora
  - [x] Vista Día: franjas horarias pobladas por `scheduled`; sección "Todo el día" (expandida por defecto) para `due`/`start`; tareas completadas atenuadas u ocultables (`calendarShowCompletedTasks`)
  - [x] Filtro configurable de qué fechas mostrar (`start`/`due`/`scheduled`) con marca visual distinta por tipo — setting global (Settings ▸ Calendario); el override por vista queda diferido
  - [x] Vista Semana: mostrar la hora como etiqueta dentro de la cápsula existente (sin rediseñar la grilla)
  - [x] Edición en el lugar (`TaskWriter.updateTaskLine`) + drag and drop en Mes/Semana/Semana laboral (cambia el día) y en Día (cambia la hora) — Fase D; modo básico/avanzado del Task Modal (toggle "More fields", preferencia recordada en `localStorage`) — Fase E, aplicado tanto a creación como a edición de tareas
- [x] Edición de tareas nativas en las vistas de OBS Agenda — clic simple en una tarea del calendario abre el modal de edición (prefilled), doble clic abre el archivo
- [x] Creación avanzada de tareas (fechas start/scheduled+hora+duración/due, id, dependencias, onCompletion) — sección "More fields" del Task Modal (Fase E); estatus personalizados más allá de todo/hecho sigue en el roadmap de v1.x

### Calendar Enhancements
- [x] Calendario Drag and drop de tareas cambiando las fechas — Mes/Semana/Semana laboral cambian el día, vista Día cambia la hora (arrastrar); redimensionar para cambiar la duración queda diferido (depende de la expansión visual multi-franja, fuera de alcance de v1.1.4)
- [x] Clic en el número de día en Mes/Semana/Semana laboral navega a la vista Día de esa fecha (igual que ya hacía la vista Año)

## 🎯 Características (v1.1.5)

### 🐛 Correcciones
- [x] Hábitos: al editar un hábito, la vista podía mostrar brevemente datos desactualizados aunque el archivo ya estuviera correcto en disco — condición de carrera entre `metadataCache` (asincrónico) y nuestra propia escritura; `HabitManager.refreshCache()` ahora parsea el frontmatter YAML directamente del contenido leído con `vault.cachedRead()` en vez de depender de `metadataCache`
- [x] Hábitos: algunas ediciones podían duplicar el bloque YAML del frontmatter al combinar dos escrituras (`processFrontMatter` + `vault.process`); ahora el editor hace una sola escritura y reconstruye un único bloque, reparando duplicados existentes al editar

### Infraestructura
- [x] Pipeline de CI/CD (`📄.github/workflows/release.yml`) para publicar releases de forma reproducible: build desde el tag con `npm ci` (respeta el lockfile), verificación de que el tag coincide con `manifest.json`, y publicación automática del Release con `main.js`/`manifest.json`/`styles.css` — reemplaza el proceso manual anterior
- [x] `esbuild.config.mjs`: el copy de conveniencia al vault local de desarrollo ya no corre en build de producción (solo en `npm run dev`), para no ensuciar un build de CI

## 🎯 Características (v1.1.6)

### 🐛 Correcciones
- [x] Habit Editor: evitar frontmatter YAML duplicado al editar; una sola escritura reconstruye el bloque y conserva `completions`/`entries`

### UX Improvements
- [x] Habit Grid, Weekly y List: clic simple en el nombre/fila abre el Habit Editor; doble clic abre la nota del hábito

## 🎯 Características (v1.1.7)

### Correcciones
- [x] Habit Tracker: esperar a que termine la carga inicial del cache tras cargar settings para evitar vistas vacías/parciales al arrancar o actualizar
- [x] Dashboard: porcentajes por daytime y área cuentan ocurrencias completadas individualmente; completar morning suma aunque afternoon siga pendiente
- [x] Habit areas: normalizar nombres de carpeta al consultar colores de paleta (por ejemplo, `daily plan` → `daily-plan`)

### UX Improvements
- [x] Rutina: grupos por daytime/área colapsables y estado recordado entre refrescos y cambios de fecha
- [x] Grid/Weekly: badge de daytime uniforme; el toggle por defecto activado controla los hábitos de un solo daytime
- [x] Grid/Weekly: recordar el último orden por vista; Habit List permite ordenar por estatus
- [x] Weekly: ocultar visualmente el scrollbar horizontal conservando columnas fijas y desplazamiento

## 🎯 Características (v1.1.8)

### UX Improvements
- [x] Tooltips del dashboard ampliados en los seis idiomas; tooltip visual común para vistas y modal de tareas
- [x] Mejorado el look and feel de las vistas Lista y Tabla
- [x] Ordenamiento ascendente/descendente por columnas en la vista de tabla
- [x] Redimensionado de columnas de la Tabla según las tareas visibles después de aplicar filtros
- [x] Conservar búsqueda, filtros y orden de la Tabla al editar tareas o cambiar de vista
- [x] Editar tarea con clic simple en las vistas Lista y Tabla; doble clic sigue abriendo la nota

## 🎯 Características (v1.1.9)

### Calendar Enhancements
- [x] **v1.1.9 — Fecha de referencia y selector de fecha** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §4.6 y `Arquitectura técnica.md` §9; fases en `Plan de implementación.md`)
  - [x] Fecha de referencia compartida: cambiar de vista (Día/Semana/Semana laboral/Mes/Año) conserva la fecha en vez de volver a hoy
  - [x] Resaltar la fecha seleccionada, distinta de "hoy", en Mes, Semana, Semana laboral y Año
  - [x] Selector de fecha ocultable en Mes/Semana/Semana laboral/Año, abierto desde el encabezado del calendario; en Día se integra siempre visible (sin botón). Elegir un día lleva la vista actual a esa fecha (su mes, su semana, etc.); la pestaña "Calendario" del encabezado sigue abriendo Mes + hoy.
  - [x] Niveles dentro del selector: días → años (por década) → meses → días
  - [x] Textos del selector en los seis idiomas y uso con teclado (Escape, foco)
- [x] **Bloques con duración en la vista por día** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §4.7 y `Arquitectura técnica.md` §10; fases en `Plan de implementación.md`)
  - [x] Sin duración: ocupa una hora completa, como hoy. Menos de 60 min: ocupa media celda (con la etiqueta de minutos). 60 min o más: varias celdas conectadas, igual técnica que las rachas de hábitos (sin capa superpuesta)
  - [x] Tareas solapadas en carriles lado a lado, nunca una tapando a la otra
  - [x] Redimensionar arrastrando el borde inferior, en pasos de 30 minutos
  - [x] Línea punteada a la media hora en cada franja, como guía visual
- [x] doble clic para crear tarea en la vista Día (diseño en `docs/agenda-tasks/Especificación de vistas.md` §4.4.1 y `Arquitectura técnica.md` §11; fases en `Plan de implementación.md`)
  - [x] Franja horaria: prellena fecha y hora. Sección "Todo el día": prellena solo fecha (igual que las demás vistas)
  - [x] Doble clic sobre una tarea existente sigue abriendo su nota, sin crear una nueva
  - [x] Altura mínima en la sección "Todo el día" para que siempre haya un área vacía donde hacer doble clic
  - [x] **fix Bug relacionado, confirmado para corregir de paso**: `TaskModal` ignora `modalOptions.today` y siempre prellena la fecha de hoy al crear desde doble clic en Mes/Semana/Semana laboral/Año, sin importar el día de la celda
- [x] **Selector de tipo de vista como multi-botón segmentado** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §4.8 y `Arquitectura técnica.md` §12; fases en `Plan de implementación.md`)
  - [x] 5 botones pegados (Año/Mes/Semana/Semana laboral/Día; Lista se suma en v1.1.10 junto a la vista de lista del calendario), un clic para cambiar de vista, misma lógica de `switchToViewType()`
  - [x] Reutiliza el estilo del selector de prioridad del Task Modal (`.oa-priority-segmented`/`.oa-priority-pill`), en versión compacta sin espacio entre botones
  - [x] Ícono por botón + tooltip con el nombre de la vista (gratis con el componente de tooltips ya construido) — tooltip obligatorio, confirmado
  - [x] Íconos: Año `calendar-range`, Mes `calendar-days`, Semana `columns-3`, Semana laboral `briefcase`, Día `calendar-clock`
- [x] **Mejoras adicionales encontradas durante la implementación de v1.1.9** (no estaban en el diseño original)
  - [x] Clic simple en una celda de día (Mes/Semana/Semana laboral/Año) selecciona y resalta esa fecha como referencia, sin interrumpir el doble clic de crear tarea en la misma celda (mismo patrón de retardo que las tareas, `TASK_CLICK_DELAY_MS`) — revisa la decisión 3 de §4.6.7, antes diferida
  - [x] **fix**: las 5 subclases de `CalendarView` sombreaban por completo `onClose()` de la clase base (no llamaban a `super.onClose()`); un tooltip visible al cambiar de tipo de vista quedaba huérfano en `document.body` para siempre, mostrando 2 tooltips superpuestos la próxima vez que se pasaba el mouse por un botón similar
  - [x] Sidebar de la vista Día colapsable hacia la derecha (manija entre la vista principal y el sidebar), estado persistido en `localStorage`
  - [x] Hover especial para el día seleccionado en Mes/Semana/Semana laboral: ya no pierde el tinte de acento al pasar el mouse por encima (el hover genérico compartido usaba `!important`)
  - [x] Ajustes visuales del selector de fecha: ancho del popover a 290px, `grid-template-rows` explícito (evita que la última fila de días quede recortada), separación vertical/horizontal distinta en la rejilla de días, contorno de acento en días con tareas, margen entre flechas y título del encabezado
  - [x] Arrastrar una tarea en la vista Día (mover entre franjas) ahora hace snap a la media hora exacta donde se suelta (mitad superior = :00, mitad inferior = :30) en vez de solo cambiar la hora y conservar el minuto original; resaltado visual distingue la mitad de destino
  - [x] Tareas sin duración unificadas al mismo sistema de segmentos/carriles que las tareas con duración (ocupan una sola media-hora y reservan espacio igual, en vez de ocupar la celda completa y poder solaparse)
  - [x] **fix**: la vista Semana laboral tenía un listener de clic propio (`setupTaskInteractionListeners`, código legado) que abría el archivo directamente en vez de editar; eliminado para usar el mismo clic=editar/doble clic=abrir archivo que el resto de las vistas de calendario
  - [x] **fix**: el clic en la manija de redimensionar un bloque con duración disparaba también el clic de la píldora contenedora (abría el modal de edición al soltar); se detiene con `stopPropagation()` en un listener de `click` dedicado en la manija

## 🔮 v1.1.10 (ideas, discusión pendiente)

- [x] **fix**: campo de recurrencia (🔁) del Task Modal sin ayuda alguna para escribir el texto — se agregó autocompletado con una lista curada de patrones que `TaskSection.convertToRRuleFormat()` reconoce correctamente (incluye variantes `when done`), mismo componente visual que las sugerencias de archivo (`.oa-file-suggestions`/`.oa-file-suggestion-item`)
- [x] **fix**: en la vista Día, las tareas "programadas sin hora" de la sección "Todo el día" ahora son arrastrables a una franja horaria (les asigna esa hora, igual que ya pasaba al arrastrar entre franjas); arrastrar una tarea con hora de vuelta a "Todo el día" le quita la hora y la duración (`clearScheduledTime()`, nuevo en `task-line-fields.ts`). Las tareas de 📅 vencimiento/🛫 inicio no son arrastrables a una franja porque nunca pueden llevar hora (ADR-T1/T2). **fix relacionado**: el `dragover` de la zona "Todo el día" intentaba leer el payload con `dataTransfer.getData()`, que siempre vuelve vacío durante `dragover` (solo funciona en `dragstart`/`drop`) — nunca llamaba a `preventDefault()` y el navegador bloqueaba el drop; corregido para que `dragover` solo resalte la zona sin leer el payload, validando el tipo de tarea únicamente en el `drop`
- [x] **fix**: las tareas de la sección "Todo el día" (vista Día) no tenían el mismo look de píldora que el resto del calendario — les faltaba el `@include calendar-task-styles()` (fondo, borde de acento, radio de esquina, sombra) que sí aplican las franjas horarias y Mes/Semana/Semana laboral; agregado en `.oa-calendar-allday-row .oa-calendar-task`
- [x] **Selector de fecha unificado en el Task Modal** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §7.6 y `Arquitectura técnica.md` §15; fases en `Plan de implementación.md`)
  - [x] Reemplazar `flatpickr` por el componente `CalendarDatePicker` (popover) en los 3 campos de fecha del modal: vencimiento, inicio y programada
  - [x] Mostrar el punto indicador de días con tareas existentes, igual que en las vistas de calendario
  - [x] Hora (🕐) y duración (⏱️) conservan sus modales dedicados; sin cambios
- [x] **Manejo de estatus desde el calendario** (pospuesto de v1.1.9; diseño en `docs/agenda-tasks/Especificación de vistas.md` §4.9/§7.5, `Modelo de datos.md` §10 y `Arquitectura técnica.md` §14; fases en `Plan de implementación.md`)
  - [x] Sexto estado "En espera" (`?`, ícono ⏸️), sumado a los 5 ya existentes (Todo/En progreso/Hecho/Cancelada/No es tarea)
  - [x] Ícono de estado visible en cada píldora del calendario
  - [x] Cambiar el estado con clic derecho (menú contextual) sobre la tarea, o desde un nuevo campo en el Task Modal (crear y editar, "Todo" preseleccionado al crear)
  - [x] Marcar "Hecho" agrega la fecha ✅; cambiar desde "Hecho" a otro estado la quita — igual que el checkbox nativo de Obsidian (`upsertTaskStatus()`, conectado al menú contextual y al Task Modal)
  - [ ] Estados personalizados/configurables y filtrar el calendario por estado quedan fuera de alcance por ahora
- [x] **Fix: `task-filter.ts` compara el símbolo contra el texto del estado** — `isTaskCompleted` compara `state.status` (símbolo literal) contra `'DONE'`/`'CANCELLED'` (valores de `state.text`); nunca es verdadero, el filtro no excluye completadas/canceladas como debería
- [ ] **Vista Día: modo de varios días 1/3/5** (pospuesto de v1.1.9; diseño en `docs/agenda-tasks/Especificación de vistas.md` §4.4.3 y `Arquitectura técnica.md` §13; fases en `Plan de implementación.md`)
  - [ ] Multi-botón 1/3/5 solo visible dentro de la vista Día (no en el selector principal de vistas)
  - [ ] Día de referencia centrado (3: 1 antes/1 después; 5: 2 antes/2 después); ◀▶ desplazan un día a la vez
  - [ ] Hereda el grid de horas y los bloques con duración/carriles del punto anterior, por columna de día; ninguna tarea cruza entre columnas
- [ ] **Vista de lista dentro del calendario** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §4.10 y `Arquitectura técnica.md` §17; fases en `Plan de implementación.md`)
  - [ ] Ventana continua de 14 días desde la fecha de referencia (sin alinear a inicio de semana); ◀▶ mueve la ventana completa
  - [ ] Una fila por día, reutilizando el mismo render de tarea (`.oa-calendar-task`) que Mes/Semana, sin mecanismo de "N more"
  - [ ] 7º botón en el selector segmentado de vistas
- [ ] **Modal de duración con dial circular** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §7.7 y `Arquitectura técnica.md` §18; fases en `Plan de implementación.md`)
  - [ ] Extraer el dial circular del Habit Editor a un componente compartido (`src/core/time-dial.ts`), parametrizado por máximo y paso
  - [ ] El modal de duración lo reutiliza: máximo 1440 minutos (un día completo), pasos de 5 minutos
- [x] **Compatibilidad con tareas recurrentes (🔁)** (diseño en `docs/agenda-tasks/Modelo de datos.md` §11 y `Arquitectura técnica.md` §16; fases en `Plan de implementación.md`)
  - [x] Al marcar una tarea recurrente como "Hecho" (manejo de estatus, más arriba), se inserta una línea nueva una línea arriba con la siguiente ocurrencia
  - [x] Prioridad de fecha para calcular la siguiente ocurrencia: `scheduled > due > start` (ADR-T4 del plugin, no el orden de Tasks)
  - [x] Soporte del sufijo `when done` (calcula desde la fecha de hoy en vez de la fecha original)
  - [x] Se eliminan `🆔`/`⛔` en la nueva ocurrencia; el resto de los campos se copian con el mismo desplazamiento relativo de fechas
  - [x] Delega el cálculo de la siguiente fecha válida en la librería `rrule` (ya es dependencia)


## 📊 Próximas Características (v1.x)

[Google Calendar](https://community.obsidian.md/plugins/google-calendar)
[Day Planner](https://community.obsidian.md/plugins/obsidian-day-planner)
[Timelineal](https://timelineal.com/)
[FullCalendar](https://community.obsidian.md/plugins/full-calendar-remastered)
[kanban task](https://community.obsidian.md/plugins/tasks-kanban)

### Core Tasks
- [ ] Configuración de tareas por nota o multiples tareas por nota (reconocimiento)

### Task Management Views
- [ ] Kanban view
- [ ] To do view
- [ ] Agenda view ![vista agenda ](attachments/agenda-view.png)

### Timeline & Planning Views
- [ ] List View. Vista de lista mejorada ![vista lista ](attachments/vista-lista.png) — la variante dentro del calendario queda rastreada aparte en v1.1.10 (más arriba)
- [ ] Gantt view
- [ ] Timeline view

### Características Experimentales (Futuro)
- [ ] Tareas seriadas (esto lo debo hacer con los id, depende de)
- [ ] Grupos de tareas (aqui lo vamos a resolver por carpeta o por archivo, es decir, los grupos seran así)

### UX Improvements
- [ ] Configuración de sonidos de notificaciones
- [ ] Tool tips o help que diga como usar el plugin
- [ ] Más widgets en la vista del panel
- [ ] Diferencia si segun el estado
- [x] Agregar atajo de ctrl + p (Se agregó el command palette para abrir la obs agenda)
  - [ ] Varias maneras de abrir el plugin (Se agregó el command palette para abrir la obs agenda)

### Calendar Enhancements
- [ ] Calendario. Secciones extra ![vista agenda ](attachments/extra-section.png)
- [ ] Agregar días feriados de diferentes paises

### 🐛 Correcciones Pendientes
- [ ] Ancho de las filas de la tabla en la vista tablas

### Habit Tracker
- [ ] Refresco automático de la Rutina
- [ ] las vistas dependientes de la fecha actual a medianoche local, sin requerir interacción ni cambios en el vault.
- [ ] Tareas activas e inactivas para el porcentaje de completado por fecha o rango de fecha


- [ ] Día recomendado, seria los horarios de que hacer a cada hora dependiendo de lo que se debe de hacer entre tareas y habitos.

## 🔄 **Revisión y Reflexión (v2.x - v3.x)**
- [ ] Plantillas de revisión diaria/semanal/mensual
- [ ] Analíticas de progreso y métricas
- [ ] Retrospectivas automáticas
- [ ] Seguimiento de objetivos y OKRs

## 🔗 Integraciones y Características Avanzadas (v3.x)

### External Integrations
- [ ] Importar y exportar tareas de Google, Microsoft, etc

### Advanced Features
- [ ] Implementación de estados personalizados (estados de las tareas personalizados acorde a tasks)
- [ ] Funciones avanzadas de calendario con bloques de tiempo
- [ ] Manejar contexto o áreas
- [ ] Carpeta de 'Archive' para las tareas archivadas
- [ ] Notificaciones
- [ ] Usar el frontmatter como base de datos

# Fixes

# Características Adicionales Sugeridas

## 📅 **Gestión de Tiempo Avanzada (v1.x - v2.x)**
- [ ] Bloques de tiempo / Time blocking
- [ ] Temporizador Pomodoro integrado
- [ ] Estimación de duración de tareas
- [ ] Seguimiento de tiempo real gastado vs estimado
- [ ] Tiempo de buffer automático entre tareas

## 🎯 **Productividad y Enfoque (v2.x)**
- [ ] Seguimiento de niveles de energía (alta/media/baja energía)
- [ ] Contextos de trabajo (@casa, @oficina, @llamadas)
- [ ] Procesamiento por lotes de tareas similares
- [ ] Programación de bloques de trabajo profundo
- [ ] Períodos de bloqueo de distracciones



## 🤝 **Colaboración y Equipos (v3.x)**
- [ ] Calendarios/agendas compartidas
- [ ] Delegación de tareas
- [ ] Seguimiento de disponibilidad del equipo
- [ ] Integración de programación de reuniones

## 🔔 **Notificaciones Inteligentes (v2.x)**
- [ ] Notificaciones basadas en ubicación
- [ ] Recordatorios inteligentes según patrones
- [ ] Alertas de conflictos de horario
- [ ] Preparación de tareas (recordar materiales)

## 🤖 **IA y Automatización (v3.x)**
- [ ] Priorización de tareas con IA
- [ ] Programación automática inteligente
- [ ] Reconocimiento de patrones en productividad
- [ ] Auto-categorización de tareas
- [ ] Duración predictiva de tareas

## ⚡ **Mejoras UX Expandidas**
- [ ] Tutorial de incorporación interactivo
- [ ] Plantillas de configuración rápida
- [ ] Atajos personalizables
- [ ] Temas específicos para planificación
- [ ] Captura rápida desde cualquier vista
- [ ] Búsqueda semántica de tareas

## 📈 **Mejoras de Calendario Robustas**
- [ ] Soporte para múltiples calendarios
- [ ] Integración del clima para planificación
- [ ] Cálculo de tiempo de viaje
- [ ] Sugerencias automáticas de programación
- [ ] Resolución automática de conflictos
- [ ] Mapas de calor del calendario
