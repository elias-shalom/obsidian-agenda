---
name: "PRD - Módulo Agenda Tasks"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: task-management
archetype: manager
status: active
related:
  - "[[README]]"
  - "[[Modelo de datos]]"
  - "[[Especificación de vistas]]"
created: 2026-09-25
tags:
  - obsidian-agenda
  - documentation
  - prd
---

# PRD — Módulo Agenda Tasks

## 1. Objetivo

Proveer, dentro del plugin **Obsidian Agenda**, un conjunto de vistas de **tareas** que:

1. Detecten y parseen tareas (formato Obsidian Tasks — emoji — y Dataview) en **cualquier nota** del vault.
2. Muestren esas tareas en múltiples formatos: panel resumen, lista jerárquica, tabla, y calendario (día/semana/semana laboral/mes/año).
3. Permitan **crear** tareas nuevas desde un modal, y (parcialmente) editarlas.
4. Mantengan un cache de rendimiento que se invalide automáticamente ante cambios del vault.
5. Se integren con el plugin [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) (mismo formato de texto, compatible en ambos sentidos, sin exigir instalarlo).

## 2. Alcance

### 2.1 Completo y en uso (estado actual)

- [x] Extracción de tareas desde cualquier archivo `.md` del vault (sin ruta configurable, a diferencia del módulo de hábitos).
- [x] Soporte de formato **emoji** (📅🛫⏳✅❌➕⏬🔽🔼⏫🔺▶️🔁🆔⛔🏁) y de formato **Dataview** (`due::`, `priority::`, `repeat::`, etc.), mapeados a los mismos campos internos.
- [x] Cache de dos niveles (por archivo + global) con TTL de 5 minutos e invalidación por eventos de vault (`create`/`modify`/`delete`/`rename`).
- [x] Filtrado multi-criterio (estado, texto, tags, prioridad, fechas relativas/absolutas, carpeta/ubicación) y ordenamiento/agrupación multi-campo.
- [x] Vistas: **Overview** (dashboard con KPIs), **Lista** (jerárquica por carpeta o plana), **Tabla** (ordenable, filtrable; Lista y Tabla comparten pestaña desde v1.1.13), **Kanban** y **Gantt** (v1.1.13) y **Calendario** (Día, Semana, Semana laboral, Mes, Año, Lista).
- [x] Creación de tareas desde un modal (`TaskModal` + `TaskWriter`), con selección de archivo/carpeta destino, fecha, prioridad y tags.
- [x] Bus de eventos (`EventBus`, patrón singleton sobre `mitt`) para desacoplar cache de UI.
- [x] Configuración de visibilidad de pestañas (`showOverviewTab`, `showTasksTab`, `showKanbanTab`, `showGanttTab`, `showCalendarTab`; `showListTab` y `showTableTab` pasaron a `showTasksTab` en v1.1.13) y de inicio de semana (`weekStartDay`), con refresco selectivo de solo las vistas de calendario al cambiar este último.
- [x] i18n en los 6 idiomas actuales del plugin (`en`, `es`, `de`, `fr`, `it`, `pt`).

### 2.2 Incompleto / fuera de alcance actual

- [ ] **Vista Timeline** (`timeline-view.ts`): registrada y renderiza, pero sin lógica de posicionamiento temporal propia — hoy solo lista las tareas cargadas tal cual, igual que un placeholder.
- [x] **Vista Gantt** (`gantt-view.ts`): ya no es un placeholder: se implementó en v1.1.13 (barras, hitos, ventana de 7/14/21 días o mes, agrupado por área y edición de fechas; probado a mano; sin flechas de dependencia, solo una insignia). Ver [[Especificación de vistas]] §12.
- [x] **Edición de tareas existentes** desde el modal: implementada — clic simple en una tarea del calendario abre `"edit-task"` prefilled, doble clic abre el archivo.
- [ ] **Programación por hora del día**: hoy una tarea solo tiene fechas de calendario (`due`/`start`/`scheduled`/`created`/`done`/`cancelled`), sin componente de hora. La vista Día ya organiza el contenido en 24 franjas horarias (`hourSlots`), pero no existe una forma en la UI de asignarle una hora a una tarea — ver roadmap v1.1.4 en `docs/todo.md` ("Una forma de agregar la fecha desde el archivo con iconos", "agregar las fechas con el botón secundario").
- [ ] Filtro/orden por carpeta como criterio de primera clase de forma uniforme en todas las vistas (hoy es más completo en Tabla que en el resto; la barra compartida de v1.1.12 y los filtros con varios valores de v1.1.14 lo cubren en Lista, Tabla, Kanban y Gantt).
- [ ] **Navegación por fecha en el calendario** (v1.1.9, diseño en [[Especificación de vistas]] §4.6): hoy solo se marca "hoy", la fecha no se conserva al cambiar de vista y llegar a una fecha lejana exige muchas flechas. Se propone una fecha de referencia compartida con resaltado propio y un selector ocultable con niveles de día, año y mes.
- [ ] Configuración de patrones de emoji personalizados — los iconos reconocidos están fijos en `TaskSection` (`emojiMapping`), no son configurables por el usuario.

### 2.3 Diseñado para v1.1.14 a v1.1.17 (diseño, no implementado)

El 2026-11-02 el alcance pendiente se repartió en cuatro versiones, una por tema, cada una probable a mano completa. Comportamiento en [[Especificación de vistas]] §19 a §25, mecanismo en [[Arquitectura técnica]] §28 a §35, estado guardado en [[Modelo de datos]] §12 a §16 y fases en [[Plan de implementación]].

| Versión | Tema | Contenido |
|---|---|---|
| **v1.1.14** | Filtros y Lanes | Filtros con varios valores (prioridad, estado y área); barra de filtros en el calendario; barra de chips `Lanes`/`Group`/`Sort` en una fila propia; Lanes (Filas) en Kanban, Lista, Tabla y Gantt (cubre el agrupado de Kanban por área y sub-área); chip `Group` del Gantt; conmutador Lista \| Tabla junto al buscador |
| **v1.1.15** | Calendario y hábitos | Sombreado de fines de semana y ajuste de días no laborables (alcanza a Semana laboral, Gantt y frecuencias de hábitos); feriados de México y EE. UU.; recurrentes proyectadas; hábitos en el calendario; periodo activo y vacaciones de hábitos; selector circular de subvistas de Hábitos |
| **v1.1.16** | Dashboard | Componente de heatmap reutilizable (el de hábitos migra a él) y heatmap de tareas; widgets de hábitos; panel de vida con pestañas, arrastre y modo «Editar»; paneles «Agenda de hoy», «Resumen del día» y «Revisión de la semana» |
| **v1.1.17** | Tareas y estados | Tabla con columnas personalizables y exportación a CSV; modal de hora con reloj de esfera; compatibilidad con el plugin Tasks (`🏁 delete` con confirmación y botón Generar `🆔`); estados personalizados (símbolo, nombre, icono y tipo) |

Después, fuera de este módulo de vistas: **v1.1.18** sincronía con Google Calendar, v1.1.19 Google Tasks y v1.1.20 Microsoft (ver [[Especificación de vistas]] §15).

### 2.4 Descartado y fuera por ahora

- **Descartado (2026-11-02)**: orden manual de Kanban (bastan los combos de orden), Agenda view, Secciones extra y Lista semanal con imagen.
- **Fuera por ahora**: «Día recomendado» (pasó a «Gestión de Tiempo Avanzada», sin versión), el agente de revisión con un modelo de IA, las notificaciones, un archivo de feriados del usuario y los diseños de Tabla guardados con nombre.

## 3. Personas y casos de uso principales

- **Persona que ya usa el plugin Obsidian Tasks**: escribe tareas con emojis en sus notas; espera que Agenda Tasks las reconozca sin configuración adicional ni migración de formato.
- **Persona que prefiere Dataview**: escribe `due:: 2026-10-01` en vez de `📅 2026-10-01`; el parser debe reconocer ambos formatos indistintamente y producir el mismo modelo interno (`ITaskDate`, etc.).
- **Persona que planifica el día**: quiere ver qué tareas vencen hoy, cuáles están vencidas, y navegar por calendario (día/semana/mes/año); hoy puede hacerlo por día completo, pero no por franja horaria específica dentro del día.
- **Persona que gestiona muchas notas/carpetas**: necesita agrupar/filtrar tareas por proyecto (carpeta), estado y prioridad desde Lista y Tabla sin salir del plugin.

## 4. Requisitos no funcionales

- **Rendimiento**: evitar releer todo el vault en cada apertura de vista — de ahí el cache de dos niveles con TTL de 5 minutos y procesamiento por lotes de 10 archivos.
- **No exclusividad**: el formato de texto generado/reconocido debe seguir siendo compatible con Obsidian Tasks, para que el usuario pueda desinstalar cualquiera de los dos plugins sin perder datos (todo vive como texto plano en las notas).
- **Resiliencia**: un archivo con tareas mal formadas no debe romper la carga del resto del vault; las líneas inválidas se descartan o se marcan (`isValid: false`) según corresponda.
- **i18n**: toda cadena visible en las vistas de tareas pasa por `i18n.t()`, igual que en el resto del plugin.

## 5. Métricas de éxito (implícitas, no instrumentadas)

- Las tareas creadas con el plugin Obsidian Tasks se listan correctamente en Agenda Tasks sin fricción ni configuración previa.
- El cache no genera lecturas repetidas del disco en navegaciones consecutivas dentro de la ventana TTL (5 min).
- Cambiar `weekStartDay` sólo re-renderiza las vistas de calendario abiertas, no el resto de vistas del plugin.
