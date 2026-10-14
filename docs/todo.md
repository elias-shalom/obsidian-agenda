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
- ✅ Filas compactas con indicadores de prioridad y jerarquía de carpetas, en vista jerárquica o plana
- ✅ Edición de tareas con clic (abre el modal) y doble clic abre la nota
- ✅ Grupos de tareas contraíbles
- ⬜ Búsqueda, filtros y orden (planeado en la unión Lista y Tabla de v1.1.12)
- ⬜ Agrupación por fecha, estado o atributos personalizados (el agrupado genérico llega con las piezas compartidas de v1.1.12)
- ⬜ Columnas personalizables y acciones masivas (sin planear)

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
  - [ ] Estados personalizados/configurables y filtrar el calendario por estado quedan fuera de alcance por ahora
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
- [x] **fix**: ancho de las filas de la tabla en la vista de tablas (viene de "Correcciones Pendientes" más abajo): aparece scroll horizontal porque las columnas pueden sumar hasta ~1800 px; en esta versión se quita la columna Archivo y se reducen el número de fila y Fechas, y el ajuste al ancho disponible pasa a v1.1.12 (ver el ítem Lista y Tabla más abajo)
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

## 🔮 Planificación v1.1.12 en adelante (diseño, discusión pendiente)

Cada ítem lleva su versión entre corchetes. El reparto sigue dependencias: las piezas compartidas y las áreas primero, luego las vistas nuevas, luego las integraciones locales y por último las que usan la red.

| Versión | Contenido |
|---|---|
| v1.1.12 | Piezas compartidas (agrupado, barra de filtros, gestos), áreas y sub-áreas, Lista y Tabla en una pestaña, modal de novedades |
| v1.1.13 | Kanban y Gantt |
| v1.1.14 | Estados personalizados y compatibilidad con el plugin Tasks (alcance por diseñar) |
| v1.1.15 | Sincronía con Google Calendar |
| v1.1.16 | Sincronía con Google Tasks |
| v1.1.17 | Sincronía con Microsoft |

- [ ] **[v1.1.12] Modal de "novedades" al actualizar** ("What's New", diseño en `docs/agenda-tasks/Especificación de vistas.md` §10 y `Arquitectura técnica.md` §19; fases en `Plan de implementación.md`) — investigado a partir del mecanismo equivalente del plugin [QuickAdd](https://github.com/chhoumann/quickadd); decidido **no** replicar su fetch en vivo a GitHub Releases, sino embeber el contenido localizado en `src/locales/*.json`
  - [ ] Nuevo setting `lastSeenVersion` (comparado contra `manifest.version` en `onload()`) y `showWhatsNewOnUpdate` (toggle, default activado)
  - [ ] Se muestra una sola vez por versión, acumulando las novedades de todas las versiones saltadas (no solo la última)
  - [ ] Contenido localizado (6 idiomas), sin dependencia de red
- [ ] **[v1.1.13; las piezas compartidas, en v1.1.12] Kanban view** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §11 y `Arquitectura técnica.md` §20; fases A–C en `Plan de implementación.md`; investigado a partir del plugin [Tasks Kanban](https://community.obsidian.md/plugins/tasks-kanban); entrada original en "Próximas Características" más abajo, sección Task Management Views)
  - [ ] Ubicación: nueva pestaña de nivel superior, junto a Overview/Lista/Tabla/Calendario/Hábitos — mismo patrón de registro en `ViewManager` + tab de visibilidad propio que el resto de vistas
  - [ ] Columnas: por los 6 estados fijos actuales (`CoreTaskStatus`), más la opción de agrupar por prioridad/etiqueta/carpeta — sin estados personalizables en esta fase (ver más abajo)
  - [ ] Motor de filtros/orden: reutilizar `TaskFilter`/`TaskSorter` (no un mini-lenguaje de query nuevo); `TaskSorter.sortTasksByMultipleFields()` ya soporta ascendente/descendente por campo
  - [ ] Nueva función genérica `groupTasksByField(tasks, field)` (el tipo `GroupField` ya existe en `interfaces.ts`, falta la implementación genérica — hoy `ListView` solo agrupa por carpeta de forma hardcodeada); reutilizable por Kanban (columnas) y por Lista/Tabla (agrupado real más allá de carpeta)
  - [ ] Barra de filtros compartida entre Lista, Tabla, Kanban y Gantt (no una distinta por vista), con el filtro por estado generado desde `CoreTaskStatus`; sustituye los controles hardcodeados que hoy tiene la Tabla
  - [ ] Helper de gestos compartido (`attachTaskGestures()`): hoy clic/doble clic/modal de edición están copiados en calendario, Lista y Tabla; se extraen y se agrega el clic derecho de estado a Lista y Tabla (se migra primero el calendario)
  - [ ] Separar los ids (v1.1.12, Arquitectura §20.3.2): `Task.id` pasa a ser siempre la posición (`ruta#línea`) y el `🆔` va en su propio campo (`flow.id`); hoy el mismo campo vale el `🆔` si existe y `ruta-línea` si no
  - [ ] Escritura segura (v1.1.12): los escritores comprueban el texto de la línea antes de escribir y, si no coincide, buscan la línea exacta o cancelan con aviso; evita editar otra tarea cuando el archivo cambió entre el render y la acción
  - [ ] Opcional, sin decidir: que las vistas se refresquen solas al cambiar un archivo (ninguna vista se suscribe hoy a `TASKS_UPDATED`)
  - [ ] Tableros múltiples guardados: no en esta fase — un solo tablero con los filtros actuales del plugin; varios tableros queda para una versión futura
  - [ ] Reordenar tarjetas dentro de una columna: sí, por arrastre — implica un orden manual persistido
  - [ ] **Decisión técnica pendiente**: dónde persistir el orden manual (candidato: `data.json` por `ruta:línea` o `🆔`; la clave `ruta:línea` queda obsoleta si se editan las notas) — Fase C del plan
  - [ ] **Decisión técnica pendiente**: el arrastre entre columnas por etiqueta/carpeta no tiene operación de escritura equivalente (mover de carpeta implicaría mover la tarea de archivo); propuesta: arrastre solo para estado y prioridad, etiqueta/carpeta como agrupado de solo lectura
  - [ ] **Estados personalizados/configurables** (tipo [Custom Statuses de Tasks](https://publish.obsidian.md/tasks/Getting+Started/Statuses/Custom+Statuses)) — diferido, **no** es prerequisito de Kanban v1; anotado para evaluar como ítem propio de v1.1.14 (ver nota en "Próximas Características")
- [ ] **[v1.1.12] Lista y Tabla en una sola pestaña** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §14 y `Arquitectura técnica.md` §23; fases U1–U4 en `Plan de implementación.md`; depende de las piezas compartidas de Kanban y de las áreas)
  - [ ] Una pestaña «Tareas» con conmutador segmentado Lista | Tabla, como el selector del calendario (íconos con tooltip); cambiar de modo conserva búsqueda, filtros, agrupado y orden
  - [ ] Opción A: se mantienen registrados `list-view` y `table-view` y el conmutador cambia de uno a otro (no rompe los espacios de trabajo guardados); una clase única queda como mejora posterior
  - [ ] Barra común: búsqueda, filtros (estado, prioridad, Área, Sub-área, vencimiento), agrupado y orden; Lista gana lo que hoy no tiene (búsqueda, filtros y orden)
  - [ ] El botón jerárquico/plano de Lista pasa a ser valores del combo de agrupado; la Tabla puede agrupar con cabeceras plegables
  - [ ] `showListTab`/`showTableTab` se conservan como visibilidad de cada modo; la pestaña abre el último modo usado
  - [ ] Kanban y Gantt siguen en sus propias pestañas
  - [ ] Tabla: columnas y diseño personalizables y exportación a CSV, ya anunciados en el README y el manual pero sin implementar; se agregan en esta versión (diseño pendiente, Especificación §14.3 y fase U5)
  - [ ] Tabla: ajustar las columnas al ancho disponible (viene de v1.1.11): a la ventana en escritorio y al ancho del dispositivo en tableta y teléfono, es decir, al ancho real del contenedor; las columnas flexibles se reducen en proporción sin bajar de su mínimo (la suma de mínimos es ~800 px, así que en un teléfono estrecho sigue habiendo scroll); se implementa en `resizeColumns()` de `table-view.ts` (Especificación §14.3 y fase U3); los máximos de Tarea (440), Carpeta (280) y Etiquetas (280) y el partido de la Tarea en dos líneas se afinan con ese ajuste, y la columna Carpeta se sustituye por Área y Sub-área
  - [ ] Nota: el README y la sección de características de este archivo dicen que la Lista ya tiene filtrado avanzado; en el código no es así
- [ ] **[v1.1.15] Sincronía con Google Calendar** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §15 y `Arquitectura técnica.md` §24; fases GC1–GC5 en `Plan de implementación.md`; referencias estudiadas: Full Calendar (remastered), pubcyberry/obsidian-google-cal-sync y mcuste/obsidian-gcal-sync; entrada original en "Próximas Características" más abajo, sección External Integrations) — Google Tasks, Microsoft, el plugin Tasks y TaskNotes son ítems aparte (más abajo; TaskNotes, en el backlog)
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
- [ ] **[v1.1.16] Sincronía con Google Tasks** (idea, discusión pendiente, ítem aparte con su propio diseño; la API y el permiso (`tasks`) son distintos a los de Calendar; las tareas de Google solo tienen fecha de vencimiento y dos estados)
- [ ] **[v1.1.17] Sincronía con Microsoft** (Outlook Calendar y Microsoft To Do; idea, discusión pendiente, ítem aparte con su propio diseño)
- [ ] **[v1.1.14] Compatibilidad con el plugin Tasks** (diseño preliminar en `docs/agenda-tasks/Especificación de vistas.md` §17; no es una sincronía: mismo archivo y mismo formato de línea; arquitectura y plan por escribir al cerrar el diseño)
  - [ ] Ya coincide: emojis, Dataview, nueva ocurrencia una línea arriba, eliminación de `🆔`/`⛔` al repetir y `when done`
  - [ ] Fecha de referencia de la recurrencia: se mantiene la nuestra (`scheduled > due > start`) aunque Tasks use `due > scheduled > start`; se advierte en el manual
  - [x] Verificado: con `🕐 hora ⏱️ duración` al final de la línea, Tasks sigue reconociendo `📅` y `⏳`; sin cambios
  - [ ] `🆔` y Google Calendar: el `🆔` es el vínculo (id del evento derivado de él) y una línea está enviada si existe un evento del plugin con ese id (Especificación §17.3 y §17.6)
  - [x] Filtro global de Tasks: **descartado**, no se incluye
  - [ ] `🏁 delete`/`keep`: se implementa al completar una tarea (menú de estado del calendario y modal), con una **advertencia en el modal**, al crear y al editar, de que la línea se borrará del archivo si se elige `delete`; requiere un método para borrar líneas en `TaskWriter` y pruebas de Node del cálculo de líneas
  - [ ] Botón **Generar** en el campo `🆔` del modal (formato de Tasks, base 36 de 6 caracteres, sin repetir ids del vault); el modal no asigna `🆔` por defecto
  - [ ] Estados personalizados: se configuran en los ajustes y se pueden importar una vez desde los ajustes de Tasks con un botón
- [ ] **[v1.1.14] Estados personalizados** (ver "Advanced Features" más abajo y la nota en Kanban; encaja con la compatibilidad con el plugin Tasks, que define el modelo)
- [ ] **[sin versión] Discusión: Obsidian Bases** (núcleo de Obsidian que convierte notas en bases de datos con filtros, orden, agrupado, fórmulas y vistas en archivos `.base`; TaskNotes lo usa para todas sus vistas; para valorar más adelante)
  - [ ] La API de Obsidian ya expone `registerBasesView`, `BasesView` y `BasesViewRegistration` (desde 1.10.0, presentes en los tipos instalados): un plugin puede registrar sus propias vistas dentro de Bases
  - [ ] Bases trabaja con **notas** (filas = archivos con propiedades), no con líneas: las tareas en línea no son registros de Bases; sí lo son las notas de hábitos (frontmatter) y las de TaskNotes
  - [ ] A evaluar: hábitos como registros de Bases, registrar vistas propias (calendario, Kanban, Gantt) como vistas de Bases, y el efecto sobre `minAppVersion` (hoy 1.8.7; sube a 1.11.4 con Google Calendar)
  - [ ] Leer las tareas de TaskNotes no requiere Bases: se leen las notas con `metadataCache`
- [ ] **[v1.1.13] Vista Gantt** (diseño en `docs/agenda-tasks/Especificación de vistas.md` §12 y `Arquitectura técnica.md` §21; fases G1–G2 en `Plan de implementación.md`; referencia visual: Timelineal; entrada original en "Próximas Características" más abajo, sección Timeline & Planning Views) — hoy **no está registrada ni visible** (registro y botón del encabezado comentados, plantilla `gantt-view.hbs` vacía); corrige una nota anterior que la daba por registrada
  - [ ] Pestaña de nivel superior con `showGanttTab`; mismos filtros que Tabla y Kanban (barra compartida) y mismos gestos que el calendario (helper compartido)
  - [ ] Dos o más fechas: barra (inicio = `start` o `scheduled`, fin = `due` o `scheduled`); una sola fecha: hito; ninguna: contador «sin fecha»
  - [ ] Zoom 7/14/21 días o mes natural (la ventana usa los días reales del mes, 28 a 31); cabecera con pestañas de mes, año, franja de días, bandas de semana y línea de «hoy»
  - [ ] Agrupado por área y sub-área (nombre de la primera carpeta y resto de la ruta, anidado), plegable, con barra resumen por grupo
  - [ ] Editar fechas desde la vista: mover la barra, redimensionar cada borde (reescribe el campo que define ese borde) y mover hitos
  - [ ] Dependencias: solo una insignia 🔗; las flechas entre barras quedan para una versión posterior
  - [ ] **Decisión abierta**: alinear las ventanas de 7/14/21 días al inicio de semana configurado (propuesto, sin confirmar)
  - [ ] **Decisión abierta**: convertir un hito en barra arrastrando; fin anterior al inicio en datos escritos a mano
- [ ] **[v1.1.12] Áreas y sub-áreas de tareas** (reemplaza la idea de «Grupos de tareas»; diseño en `docs/agenda-tasks/Especificación de vistas.md` §13 y `Arquitectura técnica.md` §22; fases AR1–AR2 en `Plan de implementación.md`; entrada original en "Próximas Características" más abajo, sección Características Experimentales)
  - [ ] Mismo concepto que en Hábitos, con distinto origen: en hábitos es configurable (frontmatter); en tareas **no**, la ubicación física de la nota es su área
  - [ ] Área = nombre de la primera carpeta; sub-área = la ruta de carpetas sin la primera, completa y sin tope de niveles (`b` o `b/c/d`); archivos en la raíz del vault: «Sin área»
  - [ ] Filtros Área y Sub-área en la barra compartida (la sub-área aparece al elegir un área y se reinicia al cambiarla); reemplazan el filtro de carpeta de la Tabla
  - [ ] Área y sub-área son campos de agrupado (los mismos valores de los dos combos); Lista, Kanban y Gantt agrupan por ellos; Lista conserva el modo plano y su profundidad actual
  - [ ] Color por área en las cabeceras de grupo, como en Hábitos; la lógica de áreas se mueve de `src/habits/habit.ts` a un módulo compartido
  - [ ] **Decisión abierta**: la Tabla reemplaza la columna de carpeta por dos, Área y Sub-área (propuesta, sin confirmar)


## 📊 Próximas Características (v1.x)

[Day Planner](https://community.obsidian.md/plugins/obsidian-day-planner)
[Timelineal](https://timelineal.com/)
[FullCalendar](https://community.obsidian.md/plugins/full-calendar-remastered)

### Core Tasks
- [ ] Configuración de tareas por nota o multiples tareas por nota (reconocimiento)

### Task Management Views
- [ ] Kanban view — discusión y diseño rastreados en v1.1.13 (más arriba); referencia: [Tasks Kanban](https://community.obsidian.md/plugins/tasks-kanban)
- [ ] To do view
- [ ] Agenda view ![vista agenda ](attachments/agenda-view.png)

### Timeline & Planning Views
- [ ] Gantt view — discusión y diseño rastreados en v1.1.13 (más arriba)
- [ ] Timeline view

### Características Experimentales (Futuro)
- [ ] Tareas seriadas (esto lo debo hacer con los id, depende de)
- [ ] Grupos de tareas — se resuelve como áreas y sub-áreas por carpeta; diseño rastreado en v1.1.12 (más arriba)

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

### ⚡ **Mejoras UX Expandidas**
- [ ] Tutorial de incorporación interactivo
- [ ] Plantillas de configuración rápida
- [ ] Atajos personalizables
- [ ] Temas específicos para planificación
- [ ] Captura rápida desde cualquier vista
- [ ] Búsqueda semántica de tareas

### External Integrations
- [ ] Importar y exportar tareas de Google, Microsoft, etc — Google Calendar: diseño rastreado en v1.1.15 (más arriba); Google Tasks (v1.1.16), Microsoft (v1.1.17) y el plugin Tasks (v1.1.14), pendientes de discusión; TaskNotes, más abajo en este apartado; referencia: [Full Calendar (remastered)](https://github.com/obsidian-full-calendar-remastered/plugin-full-calendar)
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
- [ ] Implementación de estados personalizados (estados de las tareas personalizados acorde a Tasks) — planificado en **v1.1.14**, surgido de la discusión de Kanban view (v1.1.13, más arriba); referencia: [Custom Statuses de Tasks](https://publish.obsidian.md/tasks/Getting+Started/Statuses/Custom+Statuses) (modelo: símbolo + nombre + próximo símbolo + `type` de 6 valores fijos TODO/IN_PROGRESS/ON_HOLD/DONE/CANCELLED/NON_TASK)
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

## 📈 **Mejoras de Calendario Robustas**
- [ ] Soporte para múltiples calendarios
- [ ] Integración del clima para planificación
- [ ] Cálculo de tiempo de viaje
- [ ] Sugerencias automáticas de programación
- [ ] Resolución automática de conflictos
- [ ] Mapas de calor del calendario
