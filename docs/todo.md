Desarrollo Agenda Tasks for Obsidian

# OBS Agenda Plugin

Un complemento integral de gestión de tareas y calendario para Obsidian (https://obsidian.md).

OBS Agenda transforma tu bóveda en un potente sistema de productividad al ofrecer interfaces intuitivas de gestión de tareas y vistas de calendario. Se integra a la perfección con tus notas de Obsidian y organiza las tareas en múltiples vistas.

## Características

### Características generales
- ✅ Analiza y monitoriza tareas de todo tu vault
- ✅ Compatible con la sintaxis y los metadatos de [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)
- ✅ Múltiples tipos de vista para gestionar tareas según tu flujo de trabajo
- ✅ Actualizaciones de tareas en tiempo real, con vistas que se refrescan solas
- ✅ Áreas y sub-áreas a partir de la estructura de carpetas
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

### Vista de lista y vista de tabla (pestaña «Tareas»)
- ✅ Una pestaña con un conmutador Lista | Tabla que conserva búsqueda, filtros, agrupado y orden

### Vista de lista
- ✅ Filas compactas con indicadores de prioridad y las fechas de inicio, programada y vencimiento
- ✅ Edición de tareas con clic (abre el modal), doble clic abre la nota y clic derecho cambia el estado
- ✅ Grupos de tareas contraíbles
- ✅ Búsqueda, filtros en chips (prioridad, estado, área y sub-área, inicio, programada y vencimiento) y orden
- ✅ Agrupación por área y sub-área (por defecto), carpeta, estado, prioridad, etiquetas o fecha de vencimiento
- ⬜ Columnas personalizables y acciones masivas (sin planear)

### Vista de tabla
- ✅ Gestión de tareas estilo hoja de cálculo, con la misma barra de filtros y agrupado que la Lista
- ✅ Columnas de fechas Inicio, Programada, Vencimiento y Cerrada (se ocultan si ninguna tarea las tiene)
- ⬜ Columnas y diseños personalizables (planeado en v1.1.17)
- ✅ Columnas ordenables y redimensionables, ajustadas al ancho disponible
- ✅ Entrada y edición rápida de atributos de tarea
- ⬜ Exportación a CSV (planeado en v1.1.17)
- ✅ Formato condicional

### Vista Kanban
- ✅ Tablero de tareas reales con columnas por estado, prioridad, etiqueta o carpeta, con la misma barra de filtros que las demás vistas
- ✅ Arrastrar una tarjeta a otra columna cambia su estado o su prioridad; columnas plegables
- ⬜ Agrupado del tablero por área y sub-área, con Lanes (planeado en v1.1.14); el orden manual de las tarjetas se descartó (bastan los combos de orden)

### Vista Gantt
- ✅ Una fila por tarea sobre una línea de tiempo (7, 14, 21 días o mes), agrupada por área y sub-área
- ✅ Barras, hitos y tareas sin fecha; mover y redimensionar barras y extender hitos para editar fechas
- ⬜ Combo de agrupado, como chip `Group` (planeado en v1.1.14)

### Vista de calendario
- ✅ Múltiples diseños de calendario (día, semana, semana laboral, mes, año y lista)
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

## 🎯 Características (v1.1.10)

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
  - [x] Estados personalizados/configurables y filtrar el calendario por estado quedaron fuera de esta versión; pasan a v1.1.14 (ver el ítem de estados personalizados)
- [x] **Fix: `task-filter.ts` compara el símbolo contra el texto del estado** — `isTaskCompleted` compara `state.status` (símbolo literal) contra `'DONE'`/`'CANCELLED'` (valores de `state.text`); nunca es verdadero, el filtro no excluye completadas/canceladas como debería
- [x] **Vista Día: modo de varios días 1/3/5** (pospuesto de v1.1.9; diseño en `docs/agenda-tasks/Especificación de vistas.md` §4.4.3 y `Arquitectura técnica.md` §13; fases en `Plan de implementación.md`)
  - [x] Multi-botón 1/3/5 solo visible dentro de la vista Día (no en el selector principal de vistas)
  - [x] Día de referencia centrado (3: 1 antes/1 después; 5: 2 antes/2 después); ◀▶ desplazan un día a la vez
  - [x] Hereda el grid de horas y los bloques con duración/carriles del punto anterior, por columna de día; ninguna tarea cruza entre columnas
  - [x] **fix relacionado**: arrastrar una tarea a otra columna (franja horaria o "Todo el día" de otro día) ahora también reescribe su fecha, no solo la hora — con una sola columna el drag and drop anterior asumía siempre el mismo día
- [x] **Vista de lista dentro del calendario** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §4.10 y `Arquitectura técnica.md` §17; fases en `Plan de implementación.md`)
  - [x] Cantidad de días configurable (setting `calendarListDaysToShow`, slider 7–14, por defecto 14, en Settings ▸ Calendario) — revisado de "fijo en 14" a configurable
  - [x] Ventana continua de N días desde la fecha de referencia (sin alinear a inicio de semana); ◀▶ mueve la ventana completa (`CalendarListView.navigateToPrevious()/navigateToNext()`)
  - [x] Una fila por día (`.oa-calendar-list-row`), reutilizando el mismo render de tarea (`.oa-calendar-task`) que Mes/Semana, sin mecanismo de "N more"
  - [x] 7º botón en el selector segmentado de vistas (los 6 templates existentes + el nuevo `calendar-list-view.hbs`), con ícono `list-todo` y ubicado a la izquierda del botón de Día
  - [x] Botón de selector de fecha (popover) agregado también a la vista de Lista y a la vista Día, igual que Mes/Semana/Semana laboral/Año
  - [x] Filas al doble de alto (para que quepan 2 píldoras apiladas) y el contenedor ajusta su altura a la cantidad de días mostrados, sin dejar margen inferior vacío
  - [x] **fix**: un clic en una fila ya no recentraba la ventana completa en ese día — se separó el inicio de la ventana (`windowStart`) de la fecha seleccionada/resaltada (`currentDate`), igual que el comportamiento de Mes/Semana
- [x] **Modal de duración con dial circular** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §7.7 y `Arquitectura técnica.md` §18; fases en `Plan de implementación.md`)
  - [x] Extraer el dial circular del Habit Editor a un componente compartido (`src/core/time-dial.ts`), parametrizado por máximo y paso
  - [x] El modal de duración lo reutiliza: máximo 420 minutos (7 horas), pasos de 5 minutos
- [x] **Compatibilidad con tareas recurrentes (🔁)** (diseño en `docs/agenda-tasks/Modelo de datos.md` §11 y `Arquitectura técnica.md` §16; fases en `Plan de implementación.md`)
  - [x] Al marcar una tarea recurrente como "Hecho" (manejo de estatus, más arriba), se inserta una línea nueva una línea arriba con la siguiente ocurrencia
  - [x] Prioridad de fecha para calcular la siguiente ocurrencia: `scheduled > due > start` (ADR-T4 del plugin, no el orden de Tasks)
  - [x] Soporte del sufijo `when done` (calcula desde la fecha de hoy en vez de la fecha original)
  - [x] Se eliminan `🆔`/`⛔` en la nueva ocurrencia; el resto de los campos se copian con el mismo desplazamiento relativo de fechas
  - [x] Delega el cálculo de la siguiente fecha válida en la librería `rrule` (ya es dependencia)

## 🎯 Características (v1.1.11)

- [x] **Manual de usuario** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §9; fases en `Plan de implementación.md`) — nueva carpeta `docs/user_guide/` con dos versiones completas y paralelas (inglés/`en`, español/`es`), 10 capítulos cada una, separado de la documentación de desarrollo
- [x] **fix**: la vista de lista del calendario no mostraba el mes de cada día — al cruzar un límite de mes (p. ej. ventana del 28 de octubre al 3 de noviembre) no había forma de saber a qué mes pertenecía cada fila; se agregó `monthAbbr` (abreviatura de mes localizada, ej. "oct"/"nov") a `WeekDayData`, poblado en `CalendarListView.generateViewData()` con `currentDay.setLocale(getLanguage()).toFormat('MMM')` (mismo patrón ya usado en `calendar-date-picker.ts`/`calendar-year-view.ts`/`overview-view.ts`), y renderizado en `.oa-calendar-list-row-month` junto a la fecha de cada fila
- [x] **fix**: en tema oscuro, las pestañas principales del encabezado (General, Lista, Tabla, Calendario, Hábitos) no se distinguían hasta pasar el ratón por encima, porque el texto y el ícono de las pestañas inactivas usaban `var(--color-base-70)` (casi igual al fondo en algunos temas); en `.theme-dark` ahora usan el mismo color que la pestaña seleccionada (`var(--text-normal)`), en `src/styles/components/_header.scss`; el tema claro no cambia
- [x] **fix (lint)**: advertencia `obsidianmd/prefer-create-el` ("usa `document.createElement` en vez de los helpers `createEl` de Obsidian"), 5 ocurrencias
  - [x] Cerrado como no reproducible: tras actualizar `eslint-plugin-obsidianmd`, `npx eslint src` termina sin errores ni avisos
- [x] **fix (lint)**: errores `no-base-to-string`: el helper `concat` de `src/views/base-view.ts` (ya existía) y 7 en `src/habits/habit-parser.ts` que destapó `typescript-eslint` 8.71 al comprobar valores `unknown`; se corrigen con una función `toText()` que solo convierte texto, números y booleanos (un objeto del frontmatter ya no se convierte en `[object Object]`)
- [x] **fix (lint)**: 5 avisos por `setDynamicTooltip()` obsoleto en los deslizadores de `setting-tab.ts` (en los tipos de Obsidian 1.14 el valor se muestra siempre junto al deslizador); se quitan las llamadas, aunque en versiones anteriores de Obsidian el deslizador ya no mostrará el valor al arrastrar (`minAppVersion` sigue en 1.8.7); el placeholder de la carpeta de hábitos usa `DEFAULT_SETTINGS.habitFolderPath` porque el proyecto prohíbe desactivar la regla `sentence-case`
- [x] **fix**: ancho de las filas de la tabla en la vista de tablas: aparece scroll horizontal porque las columnas pueden sumar hasta ~1800 px; en esta versión se quita la columna Archivo y se reducen el número de fila y Fechas, y el ajuste al ancho disponible pasa a v1.1.12 (ver el ítem Lista y Tabla más abajo)
  - [x] Se quita la columna **Archivo** (ya no se usa: plantilla, orden por archivo y estilos); el número de fila pasa a máximo 50 px y Fechas a 80–120 px (`resizeColumns()` en `table-view.ts`, `_table-view.scss`); un `sortColumn` guardado con `file` se ignora porque ya no está en la lista de columnas ordenables
  - [x] El ajuste de las columnas al ancho disponible pasa a v1.1.12 (decisión y detalle en el ítem Lista y Tabla)
- [x] **fix**: arreglar las vistas en Android (teléfono Motorola y tableta Samsung; en PC se ven bien) — síntomas reportados, todos visuales (recortes de texto, botones de distintas dimensiones); causa: los estilos de Obsidian móvil y tableta sobre los `<button>`; pruebas manuales hechas, y lo que aparezca después se corrige en versiones siguientes
  - [x] Calendario: los íconos del multibotón de vistas (año, mes, semana, semana laboral, lista, día) no se veían. Causa: en móvil el contenido del botón (`.oa-calendar-view-btn` en `_calendar-common.scss`) quedaba a 0 px de ancho y, al ser el `<svg>` un elemento flex que se puede encoger, midía `0 × 16`; se corrigió con `flex: 0 0 auto` en el `svg` y con `padding: 0.35rem 0 !important` en el botón (causa de fondo: el relleno de Obsidian en tableta, ver más abajo) y se verificó en `app.emulateMobile(true)`. Los botones siguen siendo más grandes que en escritorio por los estilos de `button` de Obsidian móvil (44 px de alto)
  - [x] Calendario: el selector de fecha (popover de 290 px) aparecía recortado a la derecha y con las filas montadas. Causa: días, meses y años son `<button>` (`.oa-date-picker-cell`) sin relleno ni alto propios, así que en tableta recibían el relleno de 20 px laterales (mínimo ~40 px por celda, 7 columnas desbordan los 290 px) y los 44 px de alto de Obsidian móvil sobre filas de 28 px; se corrigió con `padding: 0 !important`, `height: auto` y `min-width: 0` en las celdas y `!important` en el relleno de los botones del encabezado (`_calendar-date-picker.scss`); el popover ya estaba en `document.body` con límites de pantalla, así que la hipótesis del `overflow: hidden` del contenedor era falsa\n  - [x] Calendario, vista Día: el botón para colapsar el sidebar del selector de fecha (`.oa-calendar-sidebar-toggle`, 16 px de ancho) no mostraba su ícono; misma causa: el relleno de 20 px laterales de Obsidian en tableta le dejaba el contenido a 0 px y el `svg` flex se encogía; se corrigió con `padding: 0 !important` y `flex: 0 0 auto` en el `svg` (`_calendar-day.scss`)
  - [x] Hábitos, vista Rutina: el círculo de completado salía ovalado (40×22 px en lugar de 22×22). Causa: esos 20 px laterales de relleno de Obsidian en tableta, que con `box-sizing: border-box` fijan un ancho mínimo de 40 px; se corrigió con `padding: 0 !important` en `.oa-habit-routine-checkbox`
  - [x] Hábitos, vistas Semana y Grid: las celdas salían rectangulares, las píldoras de racha desplazadas o cortadas y los círculos del borde derecho incompletos. Causa: las celdas (`.oa-habit-grid-cell`, `.oa-habit-weekly-cell`) son `<button>` de 22 px con `padding: 0` y en tableta Obsidian les impone 20 px laterales, así que medían 40 px o más sobre columnas de 22 px y la racha, dibujada con un `::after` relativo a la celda, se desplazaba; se corrigió con `padding: 0 !important` y `min-width: 0` en las dos clases
  - [x] Verificado en el CSS de Obsidian (1.x de escritorio): en `.is-mobile`, `--input-height` vale 44 px (`--touch-size-m`) y `--input-radius` sale de `--touch-radius-m`; la regla base `button` aplica `height: var(--input-height)`, `border-radius: var(--button-radius)` (igual a `--input-radius`) y `padding: var(--size-4-1) var(--size-4-3)`; en tableta, `.is-tablet button:not(.clickable-icon)` (`app.css`) pone `padding: var(--size-4-1) var(--size-4-5)` (4 px y 20 px laterales) y gana por especificidad a nuestras reglas de una sola clase. Cualquier `<button>` nuestro que no fije alto, radio y relleno se ve más alto y redondeado en móvil
  - [x] Barrido del resto de botones propios por el relleno de 20 px laterales de Obsidian en tableta (`.is-tablet button:not(.clickable-icon)`): se corrigió con `padding: … !important` en los de tamaño fijo o de ícono: `.oa-priority-pill` y `.oa-date-trigger` y `.oa-advanced-toggle` (Task Modal), `.oa-related-chip__remove` (editor de hábitos), `.oa-search-clear-button` (Tabla), `.oa-habit-new-btn` y `.oa-habit-table-related-btn` (Hábitos); no se puede poner `!important` en el mixin `interactive-control` porque los componentes lo sobrescriben después\n  - [x] Se dejan sin cambiar los botones de texto con relleno propio (navegación y «Hoy» de Rutina, `.oa-btn` de los modales, filtros de Resumen, conmutador de la Lista, navegación de Grid, Semana y mapa de calor): solo se ensanchan hasta unos 24 px y no se rompen; la regla equivalente de `.is-phone` no se ha comprobado en el teléfono real
  - [x] Vista Rutina en ventana estrecha (modo teléfono): varios nombres de hábito no se veían (por ejemplo «wake up time», «estudiar», «agua», «breathing», «desayuno», «dog time»). Causa: los botones de acción de cada fila (abrir nota, abrir relacionado, editar) solo aparecen al pasar el ratón, pero con `opacity: 0` seguían ocupando ancho y, en las filas que tienen nota relacionada (tres botones), dejaban el título sin espacio; en táctil además esas acciones eran inalcanzables. Se corrigió ocultando las acciones en móvil y sin hover (`body.is-mobile` y `@media (hover: none)`) y dando a Rutina los mismos gestos que Grid, Semana y Lista: clic en el título abre el editor y doble clic abre la nota. En móvil «abrir nota relacionada» ya no tiene acceso directo desde esta vista
  - [x] Vista Rutina en ventana ancha (`is-tablet`): las etiquetas de área con texto largo («PHYSICAL - TRAINING», «INTELLECTUAL - SKILL - LANGUAGE») se partían en dos líneas y desbordaban su píldora de 18 px de alto. Causa: son elementos flex de la fila de metadatos, que se encogen, y el texto se partía dentro de un alto fijo; se corrigió con `white-space: nowrap`, `flex-shrink: 0` en las insignias de prioridad y de franja, `flex-wrap: wrap` en la fila (si no caben pasan a otra línea) y, en la etiqueta de área, `display: block` con `max-width: 100%` y puntos suspensivos (`.oa-habit-routine-area-tag` en `_habit-routine.scss`)
  - [x] Nota de prueba: en `app.emulateMobile(true)` la ventana estrecha activa `is-phone` y la ancha `is-tablet`; la regla de relleno de Obsidian solo existe en tableta, así que hay que comprobar ambos anchos
  - [x] Revisado en las pruebas manuales en el teléfono real: si en Grid y Semana aparecen huecos entre tramos de racha por anchos fraccionarios de píxel en pantallas de alta densidad; lo que salga se corrige en versiones siguientes
  - [x] Reproducible en escritorio con `app.emulateMobile(true)` en la consola de desarrollador de Obsidian (las capturas reportadas son de ese modo); para las rachas puede hacer falta además depuración remota del WebView de Android
  - [x] Decidido: arreglar componente por componente, subiendo la especificidad con `!important` donde el componente fija su propio relleno, en lugar de un reinicio común de los botones bajo `.is-mobile`, `.is-phone` y `.is-tablet` (no funciona porque los componentes lo perderían por especificidad); el popover ya estaba anclado al `body`; las rachas se arreglaron con el relleno de las celdas
- [x] **fix (docs)**: el README, el manual de usuario (en/es) y la lista de características de este archivo decían que la Lista tenía filtrado avanzado, columnas personalizables, agrupado por fecha/estado y acciones masivas; en el código no es así (solo tiene el conmutador jerárquico/plano, filas compactas y grupos contraíbles). Se corrigió el texto; la Lista gana búsqueda, filtros y orden con la unión Lista y Tabla de v1.1.12
  - [x] Decidido: la Tabla anuncia en el README y el manual «columnas y diseño personalizables» y «exportación a CSV» y no existen en el código; se agregan en v1.1.12 como parte de las actualizaciones de Lista y Tabla (ver ese ítem más abajo) y el texto de la Tabla se mantiene hasta entonces
- [x] **Actualizar dependencias** (fases y alcance en `Plan de implementación.md`): hecho dentro del rango permitido; `npm audit --omit=dev` pasa de 1 vulnerabilidad crítica a **0**
  - [x] `handlebars` 4.7.10, `luxon` 3.7.2, `winston` 3.19.0, `esbuild` 0.25.12, `obsidian` (tipos) 1.14.4, `eslint-plugin-obsidianmd` 0.4.2, `typescript-eslint` 8.71.1, `@typescript-eslint/*` fijados en 8.71.1 (antes 8.32.1; el config importa `@typescript-eslint/parser`), `eslint` 9.39.5 y las menores
  - [x] `esbuild-sass-plugin` se queda en la serie 3.3 (`~3.3.1`): la 3.6 y la 3.7 exigen `esbuild >= 0.27`, fuera del rango actual de `esbuild`; subir `esbuild` y el plugin juntos queda como mejora aparte
  - [x] No se actualizan: ESLint 10 (aviso de que 9.x ya no tiene soporte; el plugin de Obsidian probablemente no soporta 10), TypeScript 7, esbuild 0.28 y `@types/node` 26
  - [x] Verificación: `npm run build` y `npx eslint src` sin errores ni avisos; quedan 9 vulnerabilidades solo de desarrollo (3 moderadas, 6 altas) por el `obsidian`/`moment` anidado de `eslint-plugin-obsidianmd`; `npm audit fix --force` las "arreglaría" bajando el plugin a 0.1.8, así que no se aplica
  - [x] Prueba manual en Obsidian (plantillas Handlebars, fechas con Luxon, CSS) en escritorio y en modo móvil: hecha
  - [x] La etiqueta `1.1.10` ya está en el remoto (apunta al merge de la PR #54 en `main`, 2026-10-07); no hay que subirla. La etiqueta local `1.1.10` apunta al commit previo al merge (`6c2db4e`) y conviene alinearla con la del remoto

## 🎯 Características (v1.1.12)

Alcance: las piezas compartidas (Fase A), las áreas y sub-áreas y la unión de Lista y Tabla con sus pendientes. Es la base de Kanban y Gantt (v1.1.13). Diseño en `docs/agenda-tasks/Especificación de vistas.md` §13–§14 y `Arquitectura técnica.md` §20–§23; fases en `Plan de implementación.md`.

Orden de trabajo por dependencias: piezas compartidas, áreas, Lista y Tabla y documentación.

- [x] **Piezas compartidas** (Fase A; diseño en `Arquitectura técnica.md` §20; las usan Lista, Tabla y, después, Kanban y Gantt)
  - [x] Nueva función genérica `groupTasksByField(tasks, field)` (el tipo `GroupField` ya existe en `interfaces.ts`, falta la implementación genérica; hoy `ListView` solo agrupa por carpeta de forma hardcodeada); reutilizable por Lista y Tabla (agrupado real más allá de carpeta) y, en v1.1.13, por Kanban (columnas)
  - [x] Barra de filtros compartida entre Lista, Tabla, Kanban y Gantt (no una distinta por vista), con el filtro por estado generado desde `CoreTaskStatus`; sustituye los controles hardcodeados que hoy tiene la Tabla; reutiliza `TaskFilter`/`TaskSorter`
  - [x] Helper de gestos compartido (`attachTaskGestures()`): hoy clic/doble clic/modal de edición están copiados en calendario, Lista y Tabla; se extraen y se agrega el clic derecho de estado a Lista y Tabla (se migra primero el calendario)
  - [x] Separar los ids (Arquitectura §20.3.2): `Task.id` pasa a ser siempre la posición (`ruta#línea`) y el `🆔` va en su propio campo (`flow.id`); hoy el mismo campo vale el `🆔` si existe y `ruta-línea` si no
  - [x] Escritura segura: los escritores comprueban el texto de la línea antes de escribir y, si no coincide, buscan la línea exacta o cancelan con aviso; evita editar otra tarea cuando el archivo cambió entre el render y la acción
  - [x] Corregido de paso: el extractor de respaldo (sin caché de metadatos) numeraba las líneas contando solo las tareas y no la posición real en el archivo
  - [x] Refresco automático (implementado y probado a mano; diseño en `Especificación de vistas.md` §14.6, `Arquitectura técnica.md` §23.9 y fase U8 en `Plan de implementación.md`; reúne el opcional que estaba en Kanban y dos pendientes de Hábitos): las vistas de tareas y de hábitos se refrescan solas ~0,4 s después de un cambio real (una nota sin cambios en tareas no redibuja), conservando filtros, búsqueda, grupos plegados y scroll, y sin interrumpir modales, menús, arrastres ni escritura; las vistas cambian de día a medianoche local sin interacción ni cambios en el vault
- [x] **Áreas y sub-áreas de tareas** (reemplaza la idea de «Grupos de tareas»; diseño en `Especificación de vistas.md` §13 y `Arquitectura técnica.md` §22; fases AR1–AR2 en `Plan de implementación.md`)
  - [x] Mismo concepto que en Hábitos, con distinto origen: en hábitos es configurable (frontmatter); en tareas **no**, la ubicación física de la nota es su área
  - [x] Área = nombre de la primera carpeta; sub-área = la ruta de carpetas sin la primera, completa y sin tope de niveles (`b` o `b/c/d`); archivos en la raíz del vault: «Sin área» (núcleo hecho: `resolveTaskArea()` y criterios de `TaskFilter`; la etiqueta «Sin área» va con la interfaz)
  - [x] Filtros Área y Sub-área en la barra compartida (la sub-área aparece al elegir un área y se reinicia al cambiarla); reemplazan el filtro de carpeta de la Tabla
  - [x] Área y sub-área son campos de agrupado: la Lista agrupa por área (sub-áreas anidadas) y conserva el modo plano y su profundidad actual (hecho en el paso 6); Kanban y Gantt los usarán en v1.1.13, junto con el agrupado plano por sub-área
  - [x] Color por área en las cabeceras de grupo, como en Hábitos; la lógica de áreas se movió de `src/habits/habit.ts` a `src/core/area.ts` (pasos 2 y 6)
  - [x] Las tareas que están directamente en la carpeta de un área (o sub-área) con sub-áreas se muestran al final, bajo una cabecera «Sin sub-área»; el orden por la columna Área sigue el mismo criterio (Lista, Tabla y orden por Área)
  - [x] Decidido: la Tabla conserva la columna de carpeta pero pasa a llamarse **Área** (primera carpeta; «Sin área» para la raíz), sin columna de Sub-área; la ruta del archivo se muestra pequeña bajo la tarea
- [x] **Lista y Tabla en una sola pestaña** (diseño en `Especificación de vistas.md` §14 y `Arquitectura técnica.md` §23; fases U1–U4 en `Plan de implementación.md`; depende de las piezas compartidas y de las áreas)
  - [x] Una pestaña «Tareas» con conmutador segmentado Lista | Tabla, como el selector del calendario (íconos con tooltip); cambiar de modo conserva búsqueda, filtros, agrupado y orden
  - [x] Opción A: se mantienen registrados `list-view` y `table-view` y el conmutador cambia de uno a otro (no rompe los espacios de trabajo guardados); una clase única queda como mejora posterior
  - [x] Barra común: búsqueda, filtros (estado, prioridad, Área, Sub-área, Inicio, Programada y Vencimiento), agrupado y orden; Lista y Tabla la usan (pasos 6 y 7)
  - [x] El botón jerárquico/plano de Lista pasa a ser valores del combo de agrupado (Área y sub-área, y Carpeta como modo plano); la Tabla agrupa con cabeceras plegables
  - [x] `showListTab`/`showTableTab` se conservan como visibilidad de cada modo; la pestaña abre el último modo usado (con un solo modo visible, el conmutador no aparece); en v1.1.13 se reemplazan por un solo interruptor «Show Tasks tab» (ver más abajo)
  - [x] Kanban y Gantt siguen en sus propias pestañas (se construyen en v1.1.13)
  - [x] Tabla: ajustar las columnas al ancho disponible (viene de v1.1.11): a la ventana en escritorio y al ancho del dispositivo en tableta y teléfono, es decir, al ancho real del contenedor; las columnas flexibles se reducen en proporción sin bajar de su mínimo (la suma de mínimos es ~600 px, así que en un teléfono estrecho sigue habiendo scroll); hecho en `resizeColumns()` de `table-view.ts` (paso 7). Los máximos pasan a Tarea 520, Área 160 y Etiquetas 240; la Tarea se parte en varias líneas si no cabe y la ruta del archivo va en una línea cortada con puntos suspensivos; el diseño de tabla pasa a `table-layout: fixed`, sin el ancho mínimo de 760 px en pantallas estrechas
  - [x] Barra de filtros con chips (pulido estético, tras ver la barra actual en pantalla; diseño en `Especificación de vistas.md` §14.4, `Arquitectura técnica.md` §23.7 y fase U6 en `Plan de implementación.md`; implementado y probado a mano)
    - [x] Los cinco combos de filtro pasan a chips que se agregan con un botón **+ Filtro** (menús nativos de Obsidian en pasos: tipo, valor y, para Área, sub-área); la sub-área va dentro del chip de Área
    - [x] Una fila de presentación (conmutador, + Filtro, agrupado, orden) con la búsqueda siempre a la derecha, y una segunda fila de chips solo con filtros activos, con un botón **Limpiar** (no borra la búsqueda)
    - [x] En ventanas estrechas la búsqueda pasa a su propia línea (consulta de contenedor) y los chips saltan de línea; sin modo móvil aparte
    - [x] Desaparece el combo «All tasks» del estado, que se confundía con «todas las tareas»
    - [x] No cambian `TaskViewState`, el filtrado ni las vistas; solo la interfaz de `TaskFilterBar` y sus estilos
  - [x] Lista: junto a la descripción de cada tarea se muestran también la fecha de inicio (🛫) y la programada (⏳, con su hora 🕐 si la tiene), además de la de vencimiento (📅); cada una solo si existe (`list-view.hbs`)
  - [x] Tabla: columnas de fechas y filtros por fecha (implementado y probado a mano; diseño en `Especificación de vistas.md` §14.5, `Arquitectura técnica.md` §23.8 y fase U7 en `Plan de implementación.md`; va antes que las columnas personalizables)
    - [x] La columna «Fechas» se divide en cuatro: **Inicio** (con la creación debajo), **Programada** (con hora y duración), **Vencimiento** y **Cerrada** (hecha o cancelada, una sola por tarea); cada fecha con su emoji y su tooltip
    - [x] Se ocultan las columnas de fechas que ninguna tarea cargada tiene (se decide sobre todas las cargadas, no sobre las filtradas, para que la tabla no cambie de forma al filtrar)
    - [x] Primera columna sin números de fila (solo el total en el encabezado), y Prioridad, Estado y Tarea más estrechas para que quepan las cuatro fechas
    - [x] Filtros por fecha: el tipo «Fecha» se divide en **Vencimiento**, **Inicio** y **Programada** (seis tipos en + Filtro), con los mismos valores para los tres; «Vencidas» solo cuenta tareas abiertas y se corrigen los textos «Vencidas hoy» y «Vencidas esta semana» por «Vencen hoy» y «Vencen en los próximos 7 días»; «Con fecha» y «Sin fecha» pasan a ser por tipo
    - [x] Orden por Inicio, Programada, Vencimiento y Cerrada (también en la Lista, que comparte el combo de orden)
  - [x] Tabla: columnas y diseño personalizables y exportación a CSV: decidido **no** hacerlos en esta versión; pasan a v1.1.14 (ver más abajo). Se quitó el anuncio del README y del manual de usuario
- [x] **Documentación al cerrar la versión**: README (badge, What's New, News, Changelog), manual de usuario en/es (Lista, Tabla, áreas, gestos, configuración e introducción) y la lista de características de este archivo (Lista y Tabla); el número de versión en `package.json`, `manifest.json` y `versions.json` se sube al publicar (`npm version 1.1.12 --no-git-tag-version`)

## 🎯 Características (v1.1.13)

Alcance: los fixes de Ajustes (visibilidad de pestañas y carpeta de hábitos), el fix de los combos de hábitos, el enlace al manual desde el README, el modal de novedades y las vistas nuevas Kanban y Gantt, que usan las piezas compartidas de v1.1.12. Diseño en `docs/agenda-tasks/Especificación de vistas.md` §10–§12 y §18 y `Arquitectura técnica.md` §19–§21 y §25; fases en `Plan de implementación.md`.

Orden de trabajo sugerido: fixes de Ajustes, enlace al manual, modal de novedades, Kanban y Gantt.

- [x] **[v1.1.13] Pruebas manuales de v1.1.12** (hechas con éxito el 2026-10-30; fases U2 a U8, Fase A y AR2 en `Plan de implementación.md`)
  - [x] Lista, Tabla y conmutador en Obsidian (U2, U3 y U4): filtrar y ordenar en la Lista; agrupar y plegar en la Tabla, con el ajuste de ancho en tableta y teléfono; cambiar de modo conserva búsqueda, filtros, agrupado y orden y la pestaña se ilumina en ambos modos
  - [x] Piezas compartidas y áreas: el calendario, la Lista y la Tabla se comportan como antes; el menú de estado con clic derecho funciona en Lista y Tabla; el filtro Área muestra el combobox de sub-área con solo sus sub-áreas y lo reinicia al cambiar de área
  - [x] Barra de chips (U6): escritorio, `app.emulateMobile(true)` en ventana estrecha (`is-phone`) y ancha (`is-tablet`), tema claro y oscuro, teclado (Tab, Enter y Escape en los menús) y que cambiar de Lista a Tabla conserva los chips
  - [x] Columnas de fechas y filtros por fecha (U7): tabla con todas las fechas y sin Inicio ni Cerrada; filtros de los tres tipos; orden desde el encabezado y desde la barra; `colspan` de las cabeceras de grupo; anchos en escritorio, tableta y teléfono emulados
  - [x] Refresco automático (U8): editar una tarea en otro panel y ver el cambio en Lista, Tabla y Calendario; guardar una nota sin tareas no redibuja; escribir en la búsqueda mientras se edita en otro panel; arrastrar en el Calendario mientras llegan cambios; la Rutina pasada la medianoche; scroll, filtros y grupos plegados conservados; vista en otra pestaña que se actualiza al volver; editar desde la propia Tabla (un solo redibujo)

- [x] **[v1.1.13] Fix: Ajustes de visibilidad de pestañas** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §18.2 y `Arquitectura técnica.md` §25.1; fase S1 en `Plan de implementación.md`)
  - [x] Un solo interruptor **Show Tasks tab** reemplaza a List y Table (el conmutador Lista | Tabla siempre muestra los dos modos); se eliminan `showListTab` y `showTableTab`
  - [x] Nuevo interruptor maestro **Show Habits tab** (`showHabitTab`); las cinco subvistas de hábitos se conservan y la pestaña aparece solo con el maestro activo y alguna subvista activa
  - [x] Migración: `showTasksTab` queda desactivado solo si List y Table estaban ambos desactivados; quien había ocultado un solo modo ve ahora los dos
  - [x] Ambas rutas de Ajustes (`getSettingDefinitions()` y `display()`) y los 6 idiomas
- [x] **[v1.1.13] Fix: carpeta de hábitos inexistente** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §18.3 y `Arquitectura técnica.md` §25.2 a §25.4; fases S2 a S4 en `Plan de implementación.md`)
  - [x] Al guardar un hábito nuevo con la carpeta inexistente, un diálogo con la ruta editable (prellenada) y los botones Crear y Cancelar; Crear crea toda la ruta y guarda la ruta nueva en Ajustes si cambió; Cancelar no crea nada
  - [x] Rutas relativas a la bóveda, sin `..`, sin ruta absoluta y sin `: * ? " < > |`; una ruta vacía usa la ruta por defecto
  - [x] Las cinco vistas de hábitos se ven sin errores con cero hábitos o sin carpeta, con el mensaje y la ruta (Rutina y Dashboard hoy no la indican) y el botón +
  - [x] Ajustes avisa bajo el campo de la ruta (existe, no existe, ruta no válida), sin impedir guardar y sin botón Crear ahora
  - [x] Verificable con scripts de Node (validación de la ruta, migración de ajustes y creación de carpetas con un vault simulado)
- [x] **[v1.1.13] Fix: combos de orden y agrupación de hábitos sin rótulo** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §18.6 y `Arquitectura técnica.md` §25.8; fase S5 en `Plan de implementación.md`)
  - [x] Prefijo corto dentro de cada combo, siempre visible: `Sort:` y `Group:` en inglés, `Orden:` y `Grupo:` en español (y sus equivalentes en pt, it, fr y de), con `aria-label` y `title`
  - [x] En Cuadrícula y Semanal (orden) y en Rutina (orden y agrupar); la Tabla y el Dashboard no cambian
  - [x] El combo de agrupar de Rutina usa «Momento del día» y «Área»; en español «Por daytime» pasa a «Por momento del día»
  - [x] Solo cambia el texto: lo guardado no cambia
- [x] **[v1.1.13] README: referencia al manual de usuario** (el README no enlaza hoy `docs/user_guide/`, que se creó en v1.1.11)
  - [x] Enlaces a las dos versiones del manual, inglés (`docs/user_guide/en`) y español (`docs/user_guide/es`), desde el README
  - [x] Ubicación: entrada en la tabla de contenidos y mención en "Getting Help" y en "Quick Start"
- [x] **[v1.1.13] Modal de "novedades" al actualizar** ("What's New"; pasa de v1.1.12; diseño en `docs/agenda-tasks/Especificación de vistas.md` §10 y `Arquitectura técnica.md` §19; fases en `Plan de implementación.md`) — investigado a partir del mecanismo equivalente del plugin [QuickAdd](https://github.com/chhoumann/quickadd); decidido **no** replicar su fetch en vivo a GitHub Releases, sino embeber el contenido localizado en `src/locales/*.json`
  - [x] Nuevo setting `lastSeenVersion` (comparado contra `manifest.version` en `onload()`) y `showWhatsNewOnUpdate` (toggle, default activado)
  - [x] Se muestra una sola vez por versión, acumulando las novedades de todas las versiones saltadas (no solo la última)
  - [x] Contenido localizado (6 idiomas), sin dependencia de red
- [x] **[v1.1.13] Kanban view** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §11 y `Arquitectura técnica.md` §20; fases A–C en `Plan de implementación.md`; investigado a partir del plugin [Tasks Kanban](https://community.obsidian.md/plugins/tasks-kanban))
  - [x] Ubicación: nueva pestaña de nivel superior, junto a Overview/Lista/Tabla/Calendario/Hábitos — mismo patrón de registro en `ViewManager` + tab de visibilidad propio que el resto de vistas
  - [x] Columnas: por los 6 estados fijos actuales (`CoreTaskStatus`), más la opción de agrupar por prioridad/etiqueta/carpeta — sin estados personalizables en esta fase (ver más abajo)
  - [x] Motor de filtros/orden: reutilizar `TaskFilter`/`TaskSorter` (no un mini-lenguaje de query nuevo); `TaskSorter.sortTasksByMultipleFields()` ya soporta ascendente/descendente por campo
  - [x] Usa las piezas compartidas de v1.1.12 (agrupado genérico, barra de filtros, gestos, ids separados y escritura segura; ver la sección v1.1.12 más arriba)
  - [x] Tableros múltiples guardados: decidido no hacerlos en esta versión — un solo tablero con los filtros actuales del plugin; varios tableros queda para una versión futura
  - [x] Reordenar tarjetas dentro de una columna: por arrastre, con un orden manual persistido — **movido a v1.1.14** (ítem propio más abajo; no es necesario para v1.1.13)
  - [x] **Decisión técnica movida a v1.1.14**: dónde persistir el orden manual (propuesta en el ítem de v1.1.14 más abajo) — Fase C del plan
  - [x] **Decidido y hecho en la Fase B**: el arrastre entre columnas solo cambia estado y prioridad; etiqueta y carpeta son agrupado de solo lectura (mover de carpeta implicaría mover la tarea de archivo)
  - [x] **Estados personalizados/configurables** (movido a v1.1.14) (tipo [Custom Statuses de Tasks](https://publish.obsidian.md/tasks/Getting+Started/Statuses/Custom+Statuses)) — diferido, **no** es prerequisito de Kanban v1; anotado como ítem propio de v1.1.14
- [x] **[v1.1.13] Kanban: refinamientos del tablero** (acordados al probar la Fase B; diseño en `docs/agenda-tasks/Especificación de vistas.md` §11.3 y `Arquitectura técnica.md` §20.8; fase B2 en `Plan de implementación.md`)
  - [x] Columnas plegables: el encabezado las pliega a una barra delgada con el nombre en vertical y el contador; las vacías arrancan plegadas; se recuerda solo lo que el usuario cambia a mano
  - [x] La barra plegada acepta la tarjeta al soltarla y se resalta al arrastrar; al recibir una tarea, la columna se despliega sola
  - [x] Altura: la columna se ajusta a su contenido hasta la altura visible del panel; encabezado fijo y scroll propio de las tarjetas
  - [x] Agrupar el tablero por área y sub-área: **movido a v1.1.14** (opciones A, B y C en la Especificación §11.3; ítem propio más abajo)
- [x] **[v1.1.13] Fix: etiquetas del día de la semana desplazadas en Semana, Semana laboral y Lista** (reportado y corregido por [@AidanAJoyce](https://github.com/AidanAJoyce) en el PR [#58](https://github.com/elias-shalom/obsidian-agenda/pull/58); diseño en `docs/agenda-tasks/Arquitectura técnica.md` §27; fase W1 en `Plan de implementación.md`; relacionado con el issue #35, que corrigió la alineación en la vista Mes)
  - [x] Con el inicio de semana en lunes, el 31 de octubre de 2026 (sábado) aparecía como «Sun 31 Oct» en Semana, Semana laboral y Lista; las etiquetas usaban `weekday % 7`, que solo vale con inicio en domingo, sobre una lista de nombres que `getLocalizedDayNames()` rota según `weekStartDay`
  - [x] Corregido con `(weekday - weekStartDay + 7) % 7` en las tres vistas; no cambian los rangos de fechas, la asignación de tareas ni las vistas Día, Mes y Año
  - [x] Pruebas aportadas en el mismo PR: `tests/calendar-weekday-labels.test.cjs` (21 pruebas; `node --test`), el primer archivo de pruebas del repo
  - [x] Integrado en `features/develop` con la autoría de Aidan; el PR sigue abierto con un comentario hasta que la versión llegue a `main`; crédito en la sección Contributors del README
  - [x] Nota en el Changelog de la versión con el crédito a @AidanAJoyce (README, versión 1.1.13)
  - [x] Prueba manual con el inicio de semana en lunes y en domingo (Semana, Semana laboral y Lista)
- [x] **[v1.1.13] Ajustes de filtros y rótulos** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §13.2, §14.7 y §18.6 y `Arquitectura técnica.md` §26; fases F1 a F3 en `Plan de implementación.md`)
  - [x] Filtro de Área: opción «Raíz» / «Root» que muestra solo las tareas fuera de cualquier carpeta
  - [x] Filtro de Sub-área: opción «Raíz» / «Root» que muestra solo las tareas de las notas directas del área, sin subcarpeta
  - [x] Combos de agrupado y orden de las tareas (Lista, Tabla y Kanban): «Group:» y «Sort:» (en español «Grupo:» y «Orden:») en lugar de «Group by» y «Sort by»
  - [x] Combo de orden de hábitos (Cuadrícula, Semanal y Rutina): opciones sin «By» / «Por» («Area», «Priority»…, «Área», «Prioridad»…) en los 6 idiomas
- [x] **[v1.1.13] Vista Gantt** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §12 y `Arquitectura técnica.md` §21; fases G1–G2 en `Plan de implementación.md`; referencia visual: Timelineal) — **lectura (G1) y edición de fechas (G2) implementadas**: vista registrada, pestaña con `showGanttTab`, ventana de 7/14/21 días o mes natural, agrupado por área y sub-área, barras, hitos y tareas sin fecha, y mover o redimensionar barras y extender hitos; probado a mano
  - [x] Pestaña de nivel superior con `showGanttTab`; mismos filtros que Tabla y Kanban (barra compartida, sin combo de agrupado) y mismos gestos que el calendario (helper compartido)
  - [x] Ajustes visuales tras la primera revisión (2026-10-31): zoom con el número de días y el icono de calendario para el mes; cabecera de grupo sin barra resumen; tareas sin fecha como grupo plegable al estilo de la Lista (ancho máximo del 80 %, plegado por defecto); periodo a la izquierda y zoom y `◀ Hoy ▶` a la derecha, como el calendario; cuadrícula vertical (línea de día, línea de semana más marcada y fines de semana sombreados)
  - [x] Columna de nombres con estado, icono de prioridad y el texto de la tarea un poco más pequeño (0,9 em) (probado a mano)
  - [x] Combo de agrupado del Gantt: decidido y movido a v1.1.14 (ítem propio más abajo)
  - [x] Dos o más fechas: barra (inicio = `start` o `scheduled`, fin = `due` o `scheduled`); una sola fecha: hito; ninguna: contador «sin fecha»
  - [x] Zoom 7/14/21 días o mes natural (la ventana usa los días reales del mes, 28 a 31); cabecera con pestañas de mes, año, franja de días, bandas de semana y línea de «hoy»
  - [x] Agrupado por área y sub-área (nombre de la primera carpeta y resto de la ruta, anidado), plegable
  - [x] Editar fechas desde la vista: mover la barra, redimensionar cada borde (reescribe el campo que define ese borde), mover hitos y convertirlos en barra con su manija (implementado y probado a mano)
  - [x] Dependencias: solo una insignia 🔗; las flechas entre barras quedan para una versión posterior
  - [x] **Decidido (2026-10-31)**: las ventanas de 7/14/21 días empiezan en el primer día de semana configurado que contiene la fecha de referencia
  - [x] **Decidido (2026-10-31)**: un hito se convierte en barra arrastrando su manija; con solo 🛫 crea ⏳ y con solo ⏳ crea 📅
  - [x] **Decidido (2026-10-31)**: un hito con solo 📅 vencimiento se extiende hacia la izquierda creando 🛫 inicio (la manija queda a la izquierda)
  - [x] **Decidido (2026-10-31)**: un fin anterior al inicio en datos escritos a mano se dibuja como hito en la fecha de inicio, con un aviso

- [x] **[v1.1.13] Pruebas manuales** (hechas con éxito el 2026-10-31 sobre todo lo implementado en esta sección)
  - [x] Kanban (Fases B y B2): columnas por estado, prioridad, etiqueta y carpeta; arrastrar entre columnas de estado y de prioridad; plegar y desplegar columnas; altura y scroll de las columnas; filtros y estado propio
  - [x] Ajustes (S1 a S5): interruptores de pestañas y la migración desde Lista y Tabla; carpeta de hábitos inexistente (diálogo, aviso en Ajustes y mensaje en las cinco vistas); rótulos «Group:» y «Sort:»
  - [x] Filtros (F1 a F3): «Raíz» en Área y en Sub-área; rótulos de los combos y de los combos de hábitos
  - [x] Modal de novedades: primera apertura tras actualizar, una sola vez, con versiones acumuladas y con el ajuste desactivado; idioma
  - [x] Etiquetas del día de la semana (Semana, Semana laboral y Lista) con el inicio de semana en lunes y en domingo
  - [x] Gantt (G1 y G2): ventanas de 7, 14, 21 días y mes; cuadrícula, hoy y fines de semana; mover y redimensionar barras; extender hitos; tooltip con las fechas; grupo «Tareas sin fecha»; refresco al soltar; escritorio, tableta y teléfono
- [x] **Documentación al cerrar la versión**: README (badge, What's New, News, Features, Gestures, Configuration, Changelog con el crédito a @AidanAJoyce y lista de próximas versiones), manual de usuario en/es (introducción, primeros pasos, vistas generales con Kanban y Gantt, gestos, configuración y preguntas frecuentes), entrada `whats_new.v1_1_13` en los 6 idiomas y la documentación de desarrollo; el número de versión en `package.json`, `manifest.json` y `versions.json` se subió a 1.1.13 con `npm version 1.1.13 --no-git-tag-version`

## 🎯 Características (v1.1.14 a v1.1.17)

Alcance repartido el 2026-11-02 en cuatro versiones, una por tema, que se pueden probar a mano completas. **Cada ítem lleva su versión entre corchetes**; los ítems siguen agrupados por tema de la discusión y se reordenarán por versión al escribir el diseño.

| Versión | Tema | Contenido |
|---|---|---|
| **v1.1.14** | Filtros y Lanes | Filtros con varios valores; filtros del calendario; barra de chips `Lanes`/`Group`/`Sort`; Lanes (Filas) en Kanban, Lista, Tabla y Gantt; chip `Group` del Gantt; agrupado por área del Kanban (vía Lanes); conmutador Lista \| Tabla junto al buscador |
| **v1.1.15** | Calendario y hábitos | Sombreado de fines de semana y ajuste de días no laborables (alcanza a Semana laboral, Gantt y frecuencias de hábitos); feriados de México y EE. UU.; recurrentes proyectadas; hábitos en el calendario; periodo activo y vacaciones de hábitos; selector circular de Hábitos |
| **v1.1.16** | Dashboard | Componente de heatmap reutilizable (el de hábitos migra a él); heatmap de tareas; widgets de hábitos; panel de vida con pestañas, arrastre y modo «Editar»; paneles «Agenda de hoy», «Resumen del día» y «Revisión de la semana» |
| **v1.1.17** | Tareas y estados | Tabla: columnas personalizables y CSV; modal de hora con reloj; compatibilidad con el plugin Tasks (`🏁`, Generar `🆔`); estados personalizados |

Decisiones de orden: estados personalizados va al final, porque toca el modelo de estados de todo el plugin (el filtro de estado de v1.1.14 debe leer su lista de una función para no rehacerlo); la Tabla y el CSV van después de Lanes, porque el CSV exporta el carril; las vacaciones y el periodo activo de hábitos acompañan a los hábitos en el calendario. Descartado en esta ronda: orden manual de Kanban, Agenda view, Secciones extra y Lista semanal con imagen. Fuera por ahora: «Día recomendado», el agente de revisión con IA y las notificaciones.

Los filtros tienen diseño en `docs/agenda-tasks/Especificación de vistas.md` §19 y `Arquitectura técnica.md` §28, con fases M1–M2 y CF1–CF2 en `Plan de implementación.md`.

**Diseño documentado el 2026-11-03** (todo «diseño, no implementado»): Especificación de vistas §20 a §25 (y §17), Arquitectura técnica §29 a §35, Modelo de datos §12 a §16 y Plan de implementación con las fases L1–L4 (v1.1.14), NL/FE/PR/HC1 (v1.1.15), HM1–DR1 (v1.1.16) y ES/TK/TM/TB (v1.1.17), todo en `docs/agenda-tasks/`; y en `docs/habit-tracker-agenda/`: Especificación §11 a §14, Modelo de datos §8, Arquitectura §10 y las fases HA1, HV1 y HU1 del Plan. Los puntos que aún piden decisión están en las listas «Por resolver al diseñar» de cada sección.

- [x] **[v1.1.14] Filtros con varios valores en un mismo tipo** (decidido el 2026-10-31; **implementado el 2026-11-03, fases M1 y M2; falta la prueba manual**; diseño en `docs/agenda-tasks/Especificación de vistas.md` §19 y `Arquitectura técnica.md` §28; los heredan Lista, Tabla, Kanban y Gantt)
  - [x] Prioridad, estado y área (con sus sub-áreas) aceptan varios valores; los filtros de fecha siguen con uno solo; O dentro de un tipo, Y entre tipos
  - [x] Un chip por tipo: el nombre con un valor y solo el número con dos o más («Estado: 2», decidido el 2026-11-03, para que no crezca), con un tooltip que lista todos; el estado guardado con un solo valor se convierte al leerlo
  - [x] Decidido (2026-10-31): casillas en un popover propio que no se cierra al marcar; el área en dos pasos dentro del mismo popover y gana lo más específico; un tooltip lista los valores del chip
  - [ ] Prueba manual en Lista, Tabla, Kanban y Gantt (también en móvil y tableta)
- [x] **[v1.1.14] Filtros en el calendario** (decidido el 2026-10-31; **implementado el 2026-11-03, fases CF1 y CF2; falta la prueba manual**; retoma «filtrar el calendario por estado» de v1.1.10; diseño en Especificación §19.2 y Arquitectura §28.3; depende de los filtros con varios valores)
  - [x] Estado propio compartido por las 6 subvistas y filtrado en un solo punto (`getTasksForDate()`), con prioridad, estado, área y búsqueda; sin filtros de fecha, agrupado ni orden
  - [x] Barra siempre visible, como primer elemento del contenido y por tanto con el mismo espaciado que en las otras vistas (sin botón para abrirla)
  - [x] Riesgo técnico resuelto: el calendario redibuja solo su contenido al filtrar (`redrawCalendarBody()`), así que la barra y el foco del buscador no se pierden
  - [ ] Prueba manual en las 6 subvistas, con el buscador y con el foco (también en móvil y tableta)
- [x] **[v1.1.14] Gantt: combo de agrupado en la barra de filtros** (decidido el 2026-10-31; **implementado el 2026-11-03 como el chip `Group`, falta la prueba manual**; hoy siempre agrupa por área y sub-área; desde el 2026-11-01 pasa a ser el chip `Group` de la barra de chips, ver «Lanes / Filas»)
  - [x] Opciones: Ninguno (modo plano, sin cabeceras), Área (por defecto), Estado y Prioridad; Carpeta, Etiquetas y Vencimiento quedan fuera
  - [x] Hace falta: modo plano en `buildGanttRows()` (hecho con `buildGanttTaskRows()` y `buildGanttGroupedRows()`), claves de plegado con prefijo por campo (`ganttGroupKey()`) y color de grupo solo para el área
- [ ] **[v1.1.15] Calendario: sombreado de fines de semana** (decidido el 2026-11-01; viene de «Calendar Enhancements»; el Gantt ya sombrea los fines de semana)
  - [ ] Se sombrea en Mes, Semana y Lista; no en Día, Año ni Semana laboral
  - [ ] Nuevo ajuste con siete casillas de días no laborables, por defecto sábado y domingo; lo comparten el calendario, el Gantt (hoy fijo con `weekday >= 6`), la Semana laboral (oculta los días marcados), las frecuencias «Fin de semana» y «Lunes a viernes» de los hábitos (hoy fijas en `[6, 7]`) y, desde el 2026-11-03, las recurrentes `every weekday` y `every weekend` (hoy fijas en `task-section.ts`; la misma línea puede dar fechas distintas en este plugin y en Tasks si el ajuste no es el habitual)
  - [ ] Regla de extremos (decidida el 2026-11-03): el ajuste exige al menos un día marcado y al menos uno sin marcar; si el usuario intenta desmarcar el último marcado o marcar el séptimo, la casilla no cambia y un `Notice` explica «Debe quedar al menos un día laborable y uno no laborable»; así no existen conjuntos vacíos y ninguna función necesita una regla especial (no se puede expresar una semana sin fines de semana)
  - [ ] Aviso al cambiarlo: texto fijo bajo las casillas y un `Notice` breve, porque afecta a rachas y porcentajes de hábitos y a las recurrentes; además, nota bajo el campo de recurrencia del Task Modal cuando es `every weekday`/`every weekend` y el ajuste no es sábado y domingo
- [ ] **[v1.1.15] Calendario: días feriados de diferentes países** (decidido el 2026-11-01; viene de «Calendar Enhancements»; diseño por escribir)
  - [ ] Motor de reglas embebido, sin red: fecha fija, n-ésimo o último día de la semana del mes (México: 5 feb → 1.er lunes de feb, 21 mar → 3.er lunes de mar, 20 nov → 3.er lunes de nov; EE. UU.: MLK, Memorial Day, Acción de Gracias), relativo a la Pascua, observado (si cae en fin de semana se recorre), ciclo de años (transmisión del Poder Ejecutivo de México, cada 6 años) y lista explícita por año
  - [ ] Países de la primera versión: México y EE. UU., con sus estados o regiones; cada regla es oficial o no oficial (Día de las Madres, Día de Muertos, Halloween…); el formato queda documentado y abierto para añadir países
  - [ ] Ajustes: lista de calendarios de feriados con país, región opcional, casillas Oficiales y No oficiales y un color; ninguno activo por defecto
  - [ ] Se marcan en las 6 vistas del calendario y en el Gantt, con tinte tenue: etiqueta con el nombre en Mes, Semana, Semana laboral y Lista; encabezado en Día; punto con tooltip en Año; columna tintada en el Gantt
  - [ ] Solo visual: no afectan a la Semana laboral, las rachas ni las tareas
  - [ ] Fuera por ahora: un archivo de reglas del usuario (feriados personales o un país nuevo)
- [ ] **[v1.1.15] Calendario: proyectar las ocurrencias de las tareas recurrentes** (decidido el 2026-11-01; viene de «Calendar Enhancements»; hoy una tarea recurrente solo crea la siguiente ocurrencia al completarla (ADR-R1); reutiliza `getNextOccurrenceDate()` de `src/core/task-recurrence.ts`)
  - [ ] Se proyectan N ocurrencias por tarea, posteriores a la ocurrencia real (no «un mes»: un tope por tiempo costaría 365 cálculos en una diaria); N es un ajuste numérico, por defecto 10, y con 0 se desactiva
  - [ ] Se dibujan como fantasmas atenuadas con la insignia `🔁`, de solo lectura: no se escriben en la nota, no se arrastran ni se completan; clic y doble clic llevan a la tarea real; al completar la real se escribe la siguiente como hoy (ADR-R1)
  - [ ] Las reglas `when done` no se proyectan (dependen de cuándo se complete)
  - [ ] Vistas: Mes, Semana, Semana laboral, Día y Lista del calendario; no en Año, Gantt, Lista, Tabla, Kanban ni Overview
  - [ ] Consecuencia asumida: una diaria desaparece pasados N días (en el mes se ve «cortada») y una mensual se ve hasta N meses
- [ ] **[v1.1.16] Dashboard (Overview): widgets de hábitos** (decidido el 2026-11-01 en lo principal; viene de «UX Improvements»; reutiliza el cálculo de `habit-stats.ts` y `habit-streak.ts` y el panel de casillas del Overview)
  - [ ] Widgets: «Hábitos de hoy» (cumplidos de los que tocan hoy, p. ej. 3/5, con barra), «Racha actual» (la mejor racha entre los activos, con la máxima de subtítulo), «Esta semana» (siete anillos por día con el porcentaje semanal, como la imagen «Tu semana») y el heatmap anual de hábitos; cada uno es una casilla nueva del panel de widgets
  - [ ] Si la pestaña Hábitos está oculta, los widgets de hábitos no aparecen en «Añadir panel» y los ya añadidos se ocultan sin perder la disposición (vuelven al reactivar la pestaña); coherente con el ajuste de hábitos en el calendario
  - [ ] Por decidir: cómo se relaciona el heatmap de hábitos con el heatmap de tareas (ver «heatmap de tareas»: el de hábitos migra al componente reutilizable)
- [ ] **[v1.1.15] Hábitos: selector de subvistas con botones circulares** (decidido el 2026-11-02; imagen: botones circulares con icono y el activo resaltado; hoy es un `<select>` (`oa-habit-view-dropdown`) en las 5 plantillas `habit-*-view.hbs`)
  - [ ] Reutiliza el componente `oa-calendar-view-segmented` / `oa-calendar-view-btn` del calendario y del conmutador Lista \| Tabla; solo icono con tooltip y `aria-label` (en móvil, el nombre aparece al mantener pulsado); sigue en la misma posición de la barra (a la derecha del título y del botón «+»)
  - [ ] Respeta los ajustes de visibilidad de cada subvista (`showHabitDashboardTab`, `showHabitRoutineTab`, `showHabitWeeklyTab`, `showHabitGridTab`, `showHabitListTab`)
  - [ ] Iconos (Lucide): Dashboard `layout-dashboard`, Rutina `sunrise`, Semanal `calendar-check-2`, Cuadrícula `grid-3x3`, Lista `list-checks`
  - [ ] Los selectores de orden y agrupado de Hábitos (con etiqueta) no cambian aquí
- [ ] **[v1.1.14] Lista y Tabla: mover el conmutador Lista | Tabla junto al buscador** (decidido el 2026-11-02; el conmutador ya es de botones circulares; hoy está al inicio de la barra, antes de «+ Filtro» y los combos, y el buscador queda al final (`mountModeSwitch()` en `src/core/task-filter-bar.ts`))
  - [ ] Va a la izquierda del buscador, en la fila 1 de la barra nueva (`[◫ ☰] [Search task…] [⏷]`), siempre en la misma posición; los chips Lanes/Group/Sort van en la misma fila, junto a «+ Filtro»
  - [ ] Solo aplica a Lista y Tabla (Kanban y Gantt no tienen conmutador)
- [ ] **[v1.1.16] Dashboard (Overview): heatmap de tareas** (decidido el 2026-11-02; viene de «UX Improvements»)
  - [ ] Un componente de heatmap reutilizable y agnóstico: recibe una métrica (función `fecha → valor`), su escala de color y el texto del tooltip; no sabe de tareas ni de hábitos
  - [ ] Métricas de tareas: Completadas (✅), Vencimientos (📅), Creadas (➕), Programadas (⏳) e Inicio (🛫), elegidas con un chip `Métrica` sobre el widget; año navegable con ◀ ▶ como el de hábitos
  - [ ] El heatmap de hábitos migra al componente nuevo (métrica «% cumplido») y debe quedar idéntico al actual; los widgets de hábitos del Overview reutilizan el mismo componente; se elimina el código duplicado `oa-habit-heatmap-*`
  - [ ] Lleva la barra de filtros compartida (prioridad, estado, área y búsqueda); el estado de filtros se guarda con una clave por widget (`dashboard.heatmap`) para que más adelante otros widgets ganen su barra o exista una barra global; con filtros activos el widget lo indica de forma visible
  - [ ] Pendiente (más adelante): filtros globales del Dashboard y el diseño del panel de vida
- [ ] **[v1.1.14] Kanban: agrupar por área y sub-área** (pasa de v1.1.13 por decisión del 2026-10-31; opciones A, B y C en `docs/agenda-tasks/Especificación de vistas.md` §11.3; hoy el combo ofrece «Carpeta», una columna por primera carpeta; **cubierto por Lanes** (2026-11-01): Área y Sub-área son opciones planas de Lanes, no de las columnas)
- [ ] **[v1.1.17] Tabla: columnas y diseño personalizables y exportación a CSV** (decidido el 2026-11-02; pasa de v1.1.12; Especificación §14.3 y fase U5 en `Plan de implementación.md`; reutiliza el modelo de columnas de la fase U7, `task-table-columns.ts`)
  - [ ] Columnas: se pueden mostrar, ocultar y reordenar (arrastre) desde un popover del mismo estilo que los chips, sin modal, con un botón «Restablecer»; se guardan por vista; las columnas de fecha conservan su regla de ocultarse solas si nadie tiene valor, con la opción de forzarlas
  - [ ] Cinco columnas nuevas, ocultas por defecto: Sub-área, Archivo, Hora, Duración y Recurrencia (las 10 actuales siguen igual)
  - [ ] CSV: exporta lo que se ve (tareas filtradas, columnas visibles en su orden y el orden de filas actual); con Lanes añade una columna con el nombre del carril
  - [ ] Dos acciones: «Exportar CSV» (archivo `tareas-AAAA-MM-DD-HHmm.csv` en el vault, carpeta configurable, por defecto `agenda-exports/`, con un aviso que muestra la ruta) y «Copiar CSV» (portapapeles)
  - [ ] Formato fijo: coma, UTF-8 con BOM (para que Excel muestre bien los acentos), fechas `AAAA-MM-DD`, campos escapados; sin ajuste de separador
  - [ ] Inyección de fórmulas (decidido el 2026-11-03): toda celda de texto que empiece con `=`, `+`, `-` o `@` se escribe con un apóstrofo delante; fechas y números no se tocan; sin ajuste
  - [ ] Fuera por ahora: diseños guardados con nombre y diálogo de opciones de exportación
- [ ] **[v1.1.17] Modal «Set scheduled time»: reloj de esfera** (decidido el 2026-11-02; código en `src/modals/task-time-picker-modal.ts`, hoy una rueda de horas y minutos de la v1.1.4 en 24 h, Arquitectura §6 y ADR-T3; imágenes de referencia: reloj de esfera estilo Material)
  - [ ] Reemplaza la rueda por un reloj de esfera en dos pasos: primero la hora y, al elegirla, pasa solo a los minutos; los números del encabezado (`3:30`) se pueden pulsar para cambiar de paso sin esperar
  - [ ] Formato de 12 h con botones AM y PM; en la línea de la tarea se sigue guardando en 24 h (`🕐 14:30`), sin cambios para el plugin Tasks ni para el resto del código; hay que actualizar el ADR-T3, que fijó 24 h
  - [ ] Minutos exactos: tocar una marca de 5 la elige directo y arrastrar por la esfera permite cualquier minuto (0 a 59)
  - [ ] Botones Cancelar y Guardar (ya traducidos), con el estilo de las imágenes; por confirmar: tamaño táctil de la esfera en móvil
- [ ] **[v1.1.17] Compatibilidad con el plugin Tasks** (diseño preliminar en `docs/agenda-tasks/Especificación de vistas.md` §17; no es una sincronía: mismo archivo y mismo formato de línea; arquitectura y plan por escribir al cerrar el diseño)
  - [ ] Ya coincide: emojis, Dataview, nueva ocurrencia una línea arriba, eliminación de `🆔`/`⛔` al repetir y `when done`
  - [ ] Fecha de referencia de la recurrencia: se mantiene la nuestra (`scheduled > due > start`) aunque Tasks use `due > scheduled > start`; se advierte en el manual
  - [x] Verificado: con `🕐 hora ⏱️ duración` al final de la línea, Tasks sigue reconociendo `📅` y `⏳`; sin cambios
  - [ ] `🆔` y Google Calendar: el `🆔` es el vínculo (id del evento derivado de él) y una línea está enviada si existe un evento del plugin con ese id (Especificación §17.3 y §17.6)
  - [x] Filtro global de Tasks: **descartado**, no se incluye
  - [ ] `🏁 delete`/`keep` (decidido el 2026-11-02): `keep` es el comportamiento por defecto; `delete` se implementa al completar una tarea (menú de estado del calendario, modal y arrastre en Kanban) con una **confirmación breve al completar** («Esta tarea se borrará del archivo»), la única acción destructiva de la versión y por eso el único diálogo, más la **advertencia en el modal**, al crear y al editar; si la tarea es recurrente, se inserta primero la siguiente ocurrencia y luego se borra la línea completada; solo se borra la línea de la tarea, como Tasks: las subtareas y notas indentadas quedan en el archivo (decidido el 2026-11-03); requiere un método para borrar líneas en `TaskWriter` y pruebas de Node del cálculo de líneas
  - [ ] Botón **Generar** en el campo `🆔` del modal (formato de Tasks, base 36 de 6 caracteres, sin repetir ids del vault); el modal no asigna `🆔` por defecto
- [ ] **[v1.1.17] Estados personalizados** (decidido el 2026-11-02; modelo de Tasks simplificado: símbolo + nombre + icono + `type` de 6 valores fijos TODO/IN_PROGRESS/ON_HOLD/DONE/CANCELLED/NON_TASK; referencia: [Custom Statuses de Tasks](https://publish.obsidian.md/tasks/Getting+Started/Statuses/Custom+Statuses); surgió de la discusión de Kanban y encaja con la compatibilidad con el plugin Tasks; es el cambio de más riesgo de la versión: `CoreTaskStatus` aparece unas 66 veces en 10 archivos y debe reemplazarse por un registro de estados)
  - [ ] Estados configurables más allá de los 6 fijos (viene de v1.1.10): se definen en los ajustes y se pueden importar una vez desde los ajustes de Tasks con un botón (lee símbolo, nombre y tipo; ignora el próximo símbolo)
  - [ ] Cada estado tiene símbolo, nombre, icono y tipo; **el tipo gobierna el comportamiento**: un estado de tipo Hecho añade `✅`, dispara la recurrencia y cuenta como cerrado; uno de tipo Cancelada o No es tarea cuenta como cerrado; el resto cuenta como abierto
  - [ ] Los 6 estados actuales son el punto de partida: se pueden editar (nombre e icono) pero no borrar; su nombre se muestra traducido hasta que el usuario lo edite (con botón «Restablecer»); los estados nuevos usan el texto escrito por el usuario
  - [ ] Sin «próximo símbolo»: el plugin no tiene ninguna acción que avance el estado con un clic, porque el estado se elige directo
  - [ ] Un símbolo sin definir se trata como Pendiente pero **conserva su símbolo y nunca se reescribe** (hoy `Task.extractStatusFromHeader()` lo reduce a Pendiente y lo pierde); los ajustes muestran «Símbolos encontrados sin definir» (p. ej. `R (3 tareas)`) con un botón para definirlos
  - [ ] `STATUS_OPTIONS` (`src/core/task-status-options.ts`, fuente única de menú, agrupado y barra de filtros) pasa a generarse desde la configuración; Kanban, `Group: Estado` y `Lanes: Estado` generan un valor por estado en el orden de la lista de ajustes, y arrastrar a una columna asigna ese símbolo
  - [ ] El filtro de estado de la barra compartida (incluida la del calendario) genera su lista desde la configuración
  - [ ] Por resolver al diseñar: la lógica que hoy compara por símbolo (`=== CoreTaskStatus.Done`) pasa a preguntar por el tipo; pruebas de Node de esa traducción símbolo → tipo; cómo se edita la lista en ajustes con la API declarativa de Obsidian 1.13
- [ ] **[v1.1.14] Lanes / Filas: agrupado por carriles en todas las vistas** (decidido el 2026-11-01; **Fases L1 a L4 implementadas el 2026-11-03: `buildLanes()`, la regla de exclusión, la barra de chips y los carriles en las cuatro vistas (faltan las pruebas manuales de L3 y L4)**; nombre en la interfaz «Lanes» en inglés y «Filas» en español, «swimlane» en el código y la documentación; diseño en Especificación §20 y Arquitectura §29)
  - [ ] Parte Kanban, Lista, Tabla y Gantt en varios widgets independientes, uno por valor del campo; Lanes y Group coexisten en todas las vistas y por defecto Lanes = Ninguno
  - [ ] Opciones de Lanes: Ninguno, Área, Sub-área, Estado, Prioridad, Etiqueta, Carpeta y Archivo; no puede repetir el campo de Group; Área y Sub-área son planas (`Área › Sub-área`, con «Raíz»); la etiqueta repite la tarea en cada carril y «Sin etiqueta» va al final
  - [ ] Carriles vacíos ocultos; el ▼ pliega el carril y se recuerda por campo; orden natural (Estado y Prioridad por su orden lógico, el resto alfabético, «Raíz» y «Sin etiqueta» al final); los carriles son de solo lectura (no se arrastra entre carriles)
  - [ ] Gantt: una sola ventana y un solo zoom, con la cabecera de fechas repetida en cada carril (a probar); Tabla: encabezado repetido por carril, con columnas y anchos compartidos
  - [x] Barra de chips (**L2 implementada y probada el 2026-11-03**): `Lanes`, `Group` y `Sort` en la fila 1 junto a «+ Filtro» y con su aspecto, cada uno con el mismo menú que «+ Filtro» (sin modal), con la flecha ↑/↓ dentro del chip de Sort; en móvil se ajusta a varias líneas y Lanes = Ninguno aparece atenuado; tooltip «Divide la vista en varias, una por valor»
  - [ ] Cubre el ítem «Kanban: agrupar por área y sub-área» (Lanes, no Group); el combo de agrupado del Gantt sigue siendo necesario, pero como chip `Group`
  - [ ] Opciones en uso (decidido el 2026-11-03): si Lanes usa un campo, esa opción queda atenuada en el chip `Group` con un tooltip, y viceversa; en **Kanban** (columnas obligatorias) no se puede elegir; en **Lista, Tabla y Gantt** sí se puede elegir y el otro chip pasa solo a Ninguno (`'none'`), por comodidad del usuario; el valor por defecto de `Group` en Lista sigue siendo Área; «el mismo campo» se entiende por familia: Estado, Prioridad, Etiqueta y la familia de ruta (Área, Sub-área y Carpeta, de cualquiera de los dos chips) chocan entre sí, mientras que Archivo, Vencimiento, Inicio y Programada quedan libres (hoy Lista y Tabla ofrecen Ninguno, Área, Carpeta, Estado, Prioridad, Etiquetas, Vencimiento, Inicio y Programada, y Kanban ofrece Estado, Prioridad, Etiquetas y Carpeta, ver `TASK_GROUP_OPTIONS` y `KANBAN_GROUP_OPTIONS`)
  - [ ] Traducción de «Lanes» en la interfaz (decidido el 2026-11-03): inglés «Lanes», español «Filas», alemán «Bahnen», francés «Couloirs», italiano «Corsie» y portugués «Raias»; solo en español se usa «Filas» (el resto traduce *lane* y no *row*, así no chocan con las filas de la Tabla); son propuestas sin revisión de hablantes nativos, hay que revisarlas antes de publicar
  - [ ] Por resolver: una función única `buildLanes()` compartida por las 4 vistas, con pruebas de Node (partición, orden y etiquetas múltiples)
- [ ] **[v1.1.15] Hábitos: tareas activas e inactivas para el porcentaje de completado** (decidido el 2026-11-02; viene de «Habit Tracker»; hoy cada hábito tiene un `status` global (`habit-parser.ts`) y `habit-manager.ts` solo lista los activos, así que desactivar un hábito cambia el porcentaje de fechas pasadas)
  - [ ] Cada hábito puede tener un periodo activo: `desde` y `hasta` opcionales en el frontmatter, además del `status` actual; sin fechas, el hábito se comporta como hoy
  - [ ] El porcentaje de una fecha o rango cuenta solo los hábitos que estaban activos ese día; desactivar un hábito hoy no cambia el historial
  - [ ] Un solo periodo, sin lista de periodos: al desactivar un hábito el plugin escribe `hasta` = hoy y al reactivarlo lo borra; las pausas temporales se resuelven con «Días de vacaciones»; si alguien desactiva y reactiva sin usar vacaciones, el hueco cuenta como días sin cumplir (consecuencia asumida)
  - [ ] El Habit Creator necesita dos selectores de fecha (`desde` y `hasta`)
- [ ] **[v1.1.15] Hábitos: días de vacaciones** (decidido el 2026-11-02; viene de «Habit Tracker»; un periodo de días en el que no se aplican los hábitos)
  - [ ] Lista global de periodos en los ajustes de hábitos (desde, hasta y nombre opcional, p. ej. «Navidad: 20 dic → 2 ene), con botones para añadir y borrar; aplica a todos los hábitos; es la fuente única
  - [ ] Cálculo: un día de vacaciones no cuenta como cumplido ni como incumplido (no rompe ni suma a la racha y no entra en el denominador del porcentaje); si el usuario marca un hábito como cumplido ese día, cuenta solo para ese hábito (suma a su racha y entra en su porcentaje)
  - [ ] Vistas: los días de vacaciones se muestran atenuados con un icono en la Cuadrícula, el Semanal y el heatmap
  - [ ] Un botón «Vacaciones» en la barra de Hábitos abre los ajustes del plugin en esa sección (`app.setting.open()` y `openTabById('agenda-tasks')`, API no documentada de Obsidian; el plugin hoy no la usa); si la API falla, un `Notice` indica la ruta («Ajustes → Agenda Tasks → Vacaciones»)
  - [ ] Por resolver al diseñar: cómo se abre directamente en la sección de vacaciones con la API declarativa de ajustes de Obsidian 1.13 (`getSettingDefinitions()`) y con el `display()` de respaldo; si el calendario también marca los días de vacaciones (por ahora no)
- [ ] **[v1.1.15] Hábitos en el calendario** (decidido el 2026-11-02; reemplaza al ítem «ajuste para que los hábitos generen o no tareas concluidas»; el objetivo era ver los hábitos en el calendario)
  - [ ] Los hábitos se dibujan directamente en el calendario como entradas virtuales, sin escribir nada en ningún archivo (mismo enfoque que las recurrentes proyectadas); descartado escribir líneas `[x]` en la nota del hábito (riesgo de duplicados, líneas editadas a mano y notas que crecen)
  - [ ] Cada día en que toca el hábito aparece una entrada con su nombre, en su franja (`daytime`: despertar, mañana, tarde, noche) y con el color de su área; respeta el periodo activo (`desde`/`hasta`) y los días de vacaciones
  - [ ] Clic marca o desmarca el hábito (reutiliza la escritura de `completions` de `habit-writer.ts`); doble clic abre la nota del hábito
  - [ ] Los hábitos **no son tareas**: no aparecen en Lista, Tabla, Kanban ni Gantt ni en los conteos de tareas (para eso están los widgets y el heatmap)
  - [ ] Vistas: Mes, Semana, Semana laboral, Día y Lista del calendario; no en Año
  - [ ] Mes, Semana, Semana laboral y Lista: un solo chip resumen por día (`🔁 3/5`, cumplidos de los que tocan ese día) que abre un popover con la lista de hábitos de ese día y su casilla para marcar o desmarcar; ocupa una línea sin importar cuántos hábitos haya y cabe en móvil; Día: una sección «Hábitos» completa, agrupada por franja (despertar, mañana, tarde, noche)
  - [ ] Ajuste «Mostrar hábitos en el calendario», desactivado por defecto; sin efecto si la pestaña Hábitos está oculta
  - [ ] La barra de filtros del calendario también los afecta: el área filtra por el área del hábito y la búsqueda por su nombre; prioridad y estado no aplican y no los ocultan
- [ ] **[v1.1.16] Dashboard (Overview): panel de vida** (decidido el 2026-11-02 en lo principal; viene de «UX Improvements»; imagen de referencia: «Panel de vida» con tarjetas por módulo; hoy el Overview tiene unos 19 widgets sueltos con un panel de casillas (⚙️ Filtrar widgets) cuyo estado vive en `localStorage` (`obsidian-agenda-widget-filters`), no en `data.json`)
  - [ ] El Overview actual se convierte en el panel de vida, reorganizado por módulos (Hoy, Tareas, Hábitos, Progreso), sin pestaña nueva
  - [ ] Pestañas creadas por el usuario, con nombre, orden y paneles propios; un mismo panel puede estar en más de una pestaña; vienen 3 pestañas iniciales (p. ej. Hoy, Tareas y Hábitos) y siempre queda al menos una
  - [ ] Los paneles se reordenan arrastrando en una cuadrícula fluida, con tamaño fijo por tipo (sin redimensionar ni posición libre)
  - [ ] Un modo «✎ Editar» (botón, con «✓ Listo» para salir) reemplaza al panel de casillas: asa ⠿ para arrastrar, `×` para quitar, botón «＋ Añadir panel» (lista directa sin modal, agrupada por módulo, con los paneles ya presentes atenuados) y gestión de pestañas (renombrar, reordenar, borrar y `＋` para crear); fuera de este modo el arrastre no interfiere con el scroll, lo que importa en móvil
  - [ ] La disposición (pestañas, paneles y orden) se guarda en `data.json` y se sincroniza entre dispositivos; sin disposición aparte para móvil (en móvil, columna única); el estado actual de las casillas se migra a las 3 pestañas iniciales
  - [ ] El estado de filtros de cada panel se guarda por widget (clave `dashboard.<widget>`), ver el heatmap de tareas
  - [ ] Panel nuevo «Agenda de hoy» (decidido el 2026-11-02), central en la pestaña «Hoy»: lista del día ordenada por hora, con las tareas que tienen `🕐` (con su duración y el color de su área) y debajo las de todo el día; los hábitos del día aparecen como el chip `🔁 3/5`; reutiliza datos y entradas del calendario, es sobre todo presentación
  - [ ] Por resolver al diseñar: catálogo exacto del resto de paneles por módulo; arrastre táctil frente al scroll en móvil; los filtros globales del Dashboard siguen para más adelante
- [ ] **[v1.1.16] Panel «Resumen del día»** (decidido el 2026-11-02; viene de «Resumen cada mañana antes de que empiece»; imagen de referencia: «Tu resumen del día»)
  - [ ] Es un panel seleccionable del catálogo del panel de vida (no fijo), que puede ir por defecto en las pestañas iniciales; la disposición por defecto de todos los paneles se define más adelante
  - [ ] Muestra pocas líneas, cada una con un número: tareas para hoy (y cuántas con hora), vencidas, hábitos de hoy (y cuántos cumplidos), la próxima tarea con hora y, si aplica, el aviso de unas vacaciones que empiezan; las líneas sin datos se ocultan; pulsar una línea abre la vista correspondiente (p. ej. «2 vencidas» abre la Lista filtrada por vencidas)
  - [ ] Todo se calcula en local, sin IA ni red; sin notificaciones del sistema (Obsidian no puede avisar con la app cerrada): el resumen se ve al abrir el Dashboard
- [ ] **[v1.1.16] Panel «Revisión de la semana»** (decidido el 2026-11-02; viene de «Agente de revisión»: cada noche qué fue bien y qué mal, y cada semana en qué mejorar; imágenes de referencia: «Tu semana» y la lista con ✓ y ✗)
  - [ ] Panel seleccionable del catálogo (no fijo), con la misma regla de disposición por defecto que «Resumen del día»
  - [ ] Muestra siete anillos por día con el porcentaje cumplido, el porcentaje semanal con la comparación contra la semana anterior (▲/▼), el mejor día, el día a mejorar, la racha y las tareas completadas contra la semana pasada
  - [ ] Son números y comparaciones calculados en local, sin frases escritas por una IA, sin red y sin «agente» nocturno; la interpretación queda al usuario
  - [ ] Pendiente (fuera de v1.1.14): el agente de revisión con un modelo de IA y las notificaciones, que dependen de decidir red, privacidad y notificaciones
- [ ] **[v1.1.14 a v1.1.17] Pruebas manuales** de lo implementado en cada versión, al cerrarla
- [ ] **[v1.1.14 a v1.1.17] Documentación al cerrar cada versión**: README (badge, What's New, News, Features, Gestures, Configuration, Changelog y lista de próximas versiones), manual de usuario en/es, entrada `whats_new.v1_1_NN` en los 6 idiomas y `WHATS_NEW_VERSIONS` en `src/core/whats-new.ts`, documentación de desarrollo y `npm version 1.1.NN --no-git-tag-version` (NN = 14, 15, 16 o 17)

## 🔮 Planificación v1.1.18 en adelante (diseño, discusión pendiente)

Cada ítem lleva su versión entre corchetes. El reparto sigue dependencias: las piezas compartidas y las áreas (v1.1.12) primero, luego las vistas nuevas, luego las integraciones locales y por último las que usan la red. Los ítems de v1.1.12 a v1.1.17 tienen su propia sección más arriba; la tabla se conserva como resumen.

| Versión | Contenido |
|---|---|
| v1.1.12 | Piezas compartidas (agrupado, barra de filtros, gestos), áreas y sub-áreas, Lista y Tabla en una pestaña |
| v1.1.13 | Kanban y Gantt, modal de novedades, enlace al manual desde el README, fixes de Ajustes (pestañas y carpeta de hábitos) |
| v1.1.14 | Filtros y Lanes: filtros con varios valores y del calendario, barra de chips `Lanes`/`Group`/`Sort`, Lanes en las 4 vistas de tareas, `Group` del Gantt |
| v1.1.15 | Calendario y hábitos: fines de semana, feriados, recurrentes proyectadas, hábitos en el calendario, vacaciones y periodo activo, selector circular de Hábitos |
| v1.1.16 | Dashboard: heatmap reutilizable y de tareas, widgets de hábitos, panel de vida con pestañas y arrastre, «Agenda de hoy», «Resumen del día» y «Revisión de la semana» |
| v1.1.17 | Tareas y estados: Tabla con columnas y CSV, modal de hora con reloj, compatibilidad con el plugin Tasks y estados personalizados |
| v1.1.18 | Sincronía con Google Calendar |
| v1.1.19 | Sincronía con Google Tasks |
| v1.1.20 | Sincronía con Microsoft |

- [ ] **[v1.1.18] Sincronía con Google Calendar** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §15 y `Arquitectura técnica.md` §24; fases GC1–GC5 en `Plan de implementación.md`; referencias estudiadas: Full Calendar (remastered), pubcyberry/obsidian-google-cal-sync y mcuste/obsidian-gcal-sync) — Google Tasks, Microsoft, el plugin Tasks y TaskNotes son ítems aparte (más abajo; TaskNotes, en el backlog)
  - [ ] Bidireccional desde la primera versión; es la primera vez que el plugin usa la red (sincronía apagada por defecto y uso de red declarado en el README)
  - [ ] Credenciales propias de cada usuario (Client ID de Google Cloud, cliente tipo Desktop) con una lista de pasos en los ajustes, incluido publicar la app para evitar tokens de 7 días; el botón directo sin credenciales exigiría verificar la app y queda para después
  - [ ] Inicio de sesión solo en escritorio (redirección local con PKCE); el móvil reutiliza la sesión: el refresh token viaja cifrado en `data.json` (PBKDF2 + AES-GCM) y cada dispositivo escribe una vez una frase guardada en `secretStorage`, que no se sincroniza
  - [ ] `minAppVersion` sube a 1.11.4 (`secretStorage`)
  - [ ] Permisos mínimos: `calendar.events`, `calendar.calendarlist.readonly` y `calendar.app.created`
  - [ ] Leer cualquier calendario; escribir por defecto solo en un calendario dedicado creado por el plugin, con `agenda-allow-edit` en el frontmatter de cada nota (`false` por defecto, `true` en la del calendario dedicado); solo se borran los eventos marcados como propios
  - [ ] Una sola cuenta de Google por ahora; el campo `agenda-account` del frontmatter es opcional y queda reservado para varias cuentas
  - [ ] El `🆔` de la tarea es el id del evento para los eventos nacidos en Google; para las tareas locales el id del evento se deriva del `🆔` de forma reversible (prefijo más hexadecimal, Especificación §17.3) porque los ids de Tasks admiten letras fuera de `a–v`; solo se sincronizan título, inicio y fin (el resto del evento se conserva); conflicto: gana el cambio más reciente con aviso
  - [ ] Notas de sincronización con el frontmatter prefijado `agenda-` (el vault comparte ese espacio): nota **espejo** (`agenda-origin: google-calendar`, una por calendario, creada con «Añadir calendario» en `temporal/agenda/`, área `temporal` y sub-área `agenda`, carpeta configurable) y nota **local** (`agenda-origin: agenda-task` más `agenda-sync: google-calendar`, en cualquier parte del vault); claves `agenda-calendar`, `agenda-allow-edit` y `agenda-account` opcional; una nota = un calendario; tokens, frase y `syncToken` no van al frontmatter; duplicados e inválidos se saltan con aviso
  - [ ] Una tarea enviada es un evento en Google (sin estado) y sigue siendo la misma línea en Obsidian: el `🆔` se escribe en la línea sin moverla, así la tarea conserva su origen y aparece una sola vez en las vistas; la importación busca el par (calendario, `🆔`) en todo el vault antes de crear una línea y un `🆔` repetido se avisa; en la nota local solo se sincronizan las líneas vinculadas (su `🆔` coincide con un evento del plugin, Especificación §17.6); recurrentes: instancias individuales, la serie se edita en Google
  - [ ] Eventos de varios días completos: el fin de Google es exclusivo, se resta un día al importar y se suma al enviar
  - [ ] Eventos cancelados en Google se quedan como `[-]` Cancelada y los rechazados por el usuario como `[~]` No es tarea; la línea nunca desaparece
  - [ ] Barreras: aprobación con 5 o más borrados o 25 o más cambios, rechazo por encima de 200, nota con línea inválida omitida; sin notificar a los invitados
  - [ ] El repo no tiene pruebas automatizadas: la sincronización necesita scripts de Node y un transporte falso de Google desde el inicio
  - [ ] Regla de «enviada»: una línea está enviada si existe un evento del plugin cuyo id deriva de su `🆔`; la acción explícita «Enviar a Google Calendar» genera el `🆔` si falta y crea el evento; tener `🆔` por sí solo no envía nada; un evento del plugin sin línea se borra siempre con aprobación; sin reglas automáticas por nota, etiqueta o área por ahora (Especificación §17.6)
  - [ ] Sin decisiones de diseño abiertas
- [ ] **[v1.1.19] Sincronía con Google Tasks** (idea, discusión pendiente, ítem aparte con su propio diseño; la API y el permiso (`tasks`) son distintos a los de Calendar; las tareas de Google solo tienen fecha de vencimiento y dos estados)
- [ ] **[v1.1.20] Sincronía con Microsoft** (Outlook Calendar y Microsoft To Do; idea, discusión pendiente, ítem aparte con su propio diseño)
- [ ] **[sin versión] Discusión: Obsidian Bases** (núcleo de Obsidian que convierte notas en bases de datos con filtros, orden, agrupado, fórmulas y vistas en archivos `.base`; TaskNotes lo usa para todas sus vistas; para valorar más adelante)
  - [ ] La API de Obsidian ya expone `registerBasesView`, `BasesView` y `BasesViewRegistration` (desde 1.10.0, presentes en los tipos instalados): un plugin puede registrar sus propias vistas dentro de Bases
  - [ ] Bases trabaja con **notas** (filas = archivos con propiedades), no con líneas: las tareas en línea no son registros de Bases; sí lo son las notas de hábitos (frontmatter) y las de TaskNotes
  - [ ] A evaluar: hábitos como registros de Bases, registrar vistas propias (calendario, Kanban, Gantt) como vistas de Bases, y el efecto sobre `minAppVersion` (hoy 1.8.7; sube a 1.11.4 con Google Calendar)
  - [ ] Leer las tareas de TaskNotes no requiere Bases: se leen las notas con `metadataCache`


## 📊 Próximas Características (v1.x)

[Day Planner](https://community.obsidian.md/plugins/obsidian-day-planner)
[Timelineal](https://timelineal.com/)
[FullCalendar](https://community.obsidian.md/plugins/full-calendar-remastered)

### Core Tasks
- [ ] Configuración de tareas por nota o multiples tareas por nota (reconocimiento)

### Task Management Views
- [ ] To do view

### Timeline & Planning Views
- [ ] Timeline view

### Características Experimentales (Futuro)
- [ ] Tareas seriadas (esto lo debo hacer con los id, depende de)

### UX Improvements
- [ ] Configuración de sonidos de notificaciones
- [ ] Tool tips o help que diga como usar el plugin
- [ ] Más widgets en la vista del panel
- [ ] Diferencia si segun el estado
- [ ] Varias maneras de abrir el plugin

### Descartado por ahora (conservado como referencia)
Decidido el 2026-11-01: se sacan de los pendientes, pero se conservan las ideas y sus imágenes por si se retoman.
- [ ] Agenda view ![vista agenda ](attachments/agenda-view.png) (columnas por plazo: Hoy, Mañana, En 2 días, En 7 días…)
- [ ] Calendario. Secciones extra ![secciones extra](attachments/extra-section.png) (tareas prioritarias, comidas, agua y una sección personalizada)
- [ ] Lista semanal con una imagen por día ![lista semanal](attachments/vista-lista.png) (una imagen de portada por fila de día y una campana de aviso; la Lista actual solo tomó de esta imagen el layout fila-por-día, ver Especificación §4)
- [ ] Kanban: orden manual de las tarjetas dentro de una columna (descartado el 2026-11-02: con los combos de orden basta; diseño en `docs/agenda-tasks/Arquitectura técnica.md` §20.4 y fase C en `Plan de implementación.md`)
  - [ ] Propuesta que quedó sin decidir: una lista global ordenada en `data.json` con la clave `ruta + título` (o `🆔` si lo tiene), una opción «Manual» en el combo de orden y la posición calculada junto a la tarjeta vecina; con Lanes, una tarea repetida por etiqueta tendría que conservar el mismo orden relativo en todos los carriles

### ⚡ **Mejoras UX Expandidas**
- [ ] Tutorial de incorporación interactivo
- [ ] Plantillas de configuración rápida
- [ ] Atajos personalizables
- [ ] Temas específicos para planificación
- [ ] Captura rápida desde cualquier vista
- [ ] Búsqueda semántica de tareas

### External Integrations
- [ ] **[backlog, sin versión] Tareas de TaskNotes** ([TaskNotes](https://github.com/callumalpass/tasknotes); plugin distinto del plugin Tasks; diseño preliminar en `docs/agenda-tasks/Especificación de vistas.md` §16, sin arquitectura ni plan) — se reevalúa cuando estén listos el Kanban y el Gantt
  - [ ] Idea: quien ya usa TaskNotes ve sus tareas en las vistas de este plugin; la dirección es migrar hacia este plugin, no al revés
  - [ ] Solo lectura si se retoma: la edición se descartó por ahora porque exige una clave de tarea común y operaciones semánticas de escritura que cambian mucho el código (§16.8); desde la píldora siempre se puede abrir la nota con doble clic
  - [ ] La nota es la tarea: sin copia ni vínculo, identidad = ruta del archivo; se reconocen por etiqueta o por propiedad (como TaskNotes), no por carpeta; el área sigue la regla de ubicación física y `projects` y `contexts` son campos de agrupado y filtro
  - [ ] Recurrencia (§16.5.1): se muestra la próxima ocurrencia con la insignia `🔁`, sin proyectar las futuras; una nota de ocurrencia oculta la entrada de la serie para esa fecha
  - [ ] Fuera de la primera versión: crear notas de TaskNotes, toda edición y completar series, migrar de TaskNotes a este plugin (nota → línea), API HTTP, seguimiento de tiempo y Pomodoro
  - [ ] Motivos del backlog: la lógica es muy distinta, TaskNotes publica versiones casi semanalmente (hay que mantener el mapeo) y en solo lectura el valor es limitado frente a funcionalidades propias
  - [ ] Si se retoma: decidir qué hacer con los checkboxes del cuerpo de una nota-tarea, el mapeo de estados (depende de los estados personalizados), los nombres de las propiedades, dependencias y jerarquía, y revisar la especificación formal

## 🔄 **Revisión y Reflexión (v2.x - v3.x)**
- [ ] Plantillas de revisión diaria/semanal/mensual
- [ ] Analíticas de progreso y métricas
- [ ] Retrospectivas automáticas
- [ ] Seguimiento de objetivos y OKRs

## 🔗 Integraciones y Características Avanzadas (v3.x)

### Advanced Features
- [ ] Manejar contexto o áreas
- [ ] Carpeta de 'Archive' para las tareas archivadas
- [ ] Notificaciones
- [ ] Usar el frontmatter como base de datos

# Fixes

# Características Adicionales Sugeridas

## 📅 **Gestión de Tiempo Avanzada (v1.x - v2.x)**
- [ ] **[sin versión] Hábitos: «Día recomendado»** (movido el 2026-11-02, sin definir; viene de «Habit Tracker»: un horario hora por hora según lo que toca entre tareas y hábitos; base disponible: tareas con `🕐` y `⏱️`, hábitos con duración, franja (`daytime`) y prioridad, y la rejilla por horas de la vista Día; se relaciona con «Programación automática inteligente» y «Tiempo de buffer automático»; opciones que se vieron: A) sugerencia automática de horario, B) vista del día que ordena tareas y hábitos por franja sin calcular horas)
- [ ] Bloques de tiempo / Time blocking (funciones avanzadas de calendario con bloques de tiempo)
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

## 📈 **Mejoras de Calendario Robustas**
- [ ] Soporte para múltiples calendarios
- [ ] Integración del clima para planificación
- [ ] Cálculo de tiempo de viaje
- [ ] Sugerencias automáticas de programación
- [ ] Resolución automática de conflictos
- [ ] Mapas de calor del calendario
