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

## 🎯 Próximas Características (v1.1.3)

[Google Calendar](https://community.obsidian.md/plugins/google-calendar)
[Day Planner](https://community.obsidian.md/plugins/obsidian-day-planner)
[Timelineal](https://timelineal.com/)

### Core Tasks
- [ ] Compatibilidad con la programación de tareas según la hora del día [vista por día (hora y día completo)]
  - [ ] Una forma de agregar la fecha desde el archivo con iconos
  - [ ] Puede ser con el boton secundario agregar las fechas y demás
- [ ] Edición de tareas nativas en las vistas de OBS Agenda (abc tarea al calendario)
- [ ] Creación avanzada de tareas (todas las fechas, id, dependencias, estatus, proyectos, etc)

### UX Improvements
- [ ] Tool tips o help que diga como usar el plugin
- [ ] Más widgets en la vista del panel
- [ ] Diferencia si segun el estado

### Calendar Enhancements
- [ ] Calendario Drag and drop de tareas cambiando las fechas
- [ ] Agregar date picker navegable por niveles (año → mes → día), abierto desde el encabezado del calendario, que al confirmar/seleccionar lleve la vista a la fecha elegida de forma inmediata.

### 🐛 Correcciones Pendientes
- [ ] Ancho de las filas de la tabla en la vista tablas

## 📊 Próximas Características (v1.x)

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
- [x] Agregar atajo de ctrl + p (Se agregó el command palette para abrir la obs agenda)
  - [ ] Varias maneras de abrir el plugin (Se agregó el command palette para abrir la obs agenda)

### Calendar Enhancements
- [ ] Calendario. Secciones extra ![vista agenda ](attachments/extra-section.png)


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
