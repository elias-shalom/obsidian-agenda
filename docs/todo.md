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

## 🔧 Cambios posteriores a v1.1.6 (en desarrollo, aún no releaseados)

### Correcciones
- [x] Habit Tracker: esperar a que termine la carga inicial del cache tras cargar settings para evitar vistas vacías/parciales al arrancar o actualizar
- [x] Dashboard: porcentajes por daytime y área cuentan ocurrencias completadas individualmente; completar morning suma aunque afternoon siga pendiente
- [x] Habit areas: normalizar nombres de carpeta al consultar colores de paleta (por ejemplo, `daily plan` → `daily-plan`)

### UX Improvements
- [x] Rutina: grupos por daytime/área colapsables y estado recordado entre refrescos y cambios de fecha
- [x] Grid/Weekly: badge de daytime uniforme; el toggle por defecto activado controla los hábitos de un solo daytime
- [x] Grid/Weekly: recordar el último orden por vista; Habit List permite ordenar por estatus
- [x] Weekly: ocultar visualmente el scrollbar horizontal conservando columnas fijas y desplazamiento

## 📊 Próximas Características (v1.x)

[Google Calendar](https://community.obsidian.md/plugins/google-calendar)
[Day Planner](https://community.obsidian.md/plugins/obsidian-day-planner)
[Timelineal](https://timelineal.com/)

### Core Tasks
- [ ] Compatibilidad con tareas recursivas/repetitivas (🔁) del pluiin tasks (las tareas recursivas se van creando cuando se marca como terminada la misma anterior)
- [ ] Configuración de tareas por nota o multiples tareas por nota (reconocimiento)

### Task Management Views
- [ ] Kanban view
- [ ] To do view
- [ ] Agenda view ![vista agenda ](attachments/agenda-view.png)

### Timeline & Planning Views
- [ ] List View. Vista de lista mejorada ![vista lista ](attachments/vista-lista.png)
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
- [ ] Agregar date picker navegable por niveles (año → mes → día), abierto desde el encabezado del calendario, que al confirmar/seleccionar lleve la vista a la fecha elegida de forma inmediata.

### 🐛 Correcciones Pendientes
- [ ] Ancho de las filas de la tabla en la vista tablas


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
