---
name: "dev - agenda tasks - README"
type: "[[blueprint]]"
type_group: it
area: daily-plan
sub_area: task-management
archetype: manager
status: active
related:
  - "[[PRD - Módulo Agenda Tasks]]"
  - "[[Modelo de datos]]"
  - "[[Arquitectura técnica]]"
  - "[[Especificación de vistas]]"
  - "[[Plan de implementación]]"
created: 2026-09-25
tags:
  - obsidian-agenda
  - documentation
---

# Dev — Agenda Tasks (módulo de gestión de tareas)

## Objetivo

Documentar, tal como existe hoy en el código, el módulo de **gestión de tareas** del plugin **Obsidian Agenda** (`C:\Code\obsidian\obsidian-agenda`): el modelo de datos, el motor de extracción/filtrado/ordenamiento, las vistas (Overview, Lista, Tabla, Kanban, Gantt, Calendario en sus 6 variantes y Timeline) y el modal de creación/edición.

A diferencia de `docs/habit-tracker-agenda/` (que documentó un módulo nuevo **antes** de construirlo), este conjunto de documentos es **retrospectivo**: describe funcionalidad que ya está implementada y en uso desde la v1.0.0, para dejar una base de referencia sólida antes de tocar el código — en particular, antes de abordar el pendiente de la v1.1.4 (roadmap en `docs/todo.md`): compatibilidad con la programación de tareas según la hora del día.

## Contexto actual (cómo funciona hoy)

- **Fuente de datos**: cualquier archivo `.md` del vault que contenga líneas con el formato de lista de tareas de Obsidian (`- [ ] texto`), en **cualquier carpeta** — no existe una ruta configurable como en el módulo de hábitos (`habitFolderPath`).
- **Extracción**: `TaskExtractor` lee cada archivo (usando primero el cache de metadatos de Obsidian — `MetadataCache.listItems` — y, si no está disponible, un parseo manual línea por línea con expresiones regulares) y construye objetos `Task` con fechas, prioridad, tags, recurrencia, dependencias y demás campos.
- **Cache**: `TaskCache` mantiene un cache de dos niveles (por archivo + global) con TTL de 5 minutos, invalidado automáticamente por los eventos `create`/`modify`/`delete`/`rename` del vault.
- **Filtrado y orden**: `TaskFilter`/`TaskSorter` aplican criterios (estado, fecha, prioridad, tags, texto, carpeta) y ordenamientos/agrupaciones multi-campo bajo demanda de cada vista.
- **Vistas**: Overview (dashboard), Lista y Tabla (una sola pestaña «Tareas» con conmutador), Kanban y Gantt (v1.1.13), Calendario (Día, Semana, Semana laboral, Mes, Año, Lista), y una vista registrada pero incompleta (Timeline). Desde v1.1.14, filtros con varios valores, barra de filtros en el calendario y Lanes en las 4 vistas de tareas. En diseño, no implementado: el panel de vida del Dashboard (v1.1.16) y la Tabla con columnas y CSV (v1.1.17).
- **Creación/edición**: `TaskModal` + `TaskWriter` generan/anexan líneas de tarea en formato emoji al archivo elegido; la edición de tareas existentes (`"edit-task"`, reescritura en el lugar) está implementada.
- **Compatibilidad**: el mismo texto de tarea es reconocido tanto en formato **emoji** (el que usa el plugin [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)) como en formato **Dataview** (`due:: 2026-10-01`), mapeados a los mismos campos internos.

## Mapa de documentos

| # | Documento | Contenido |
|---|---|---|
| 1 | [[README]] (este) | Índice, contexto, propuesta. |
| 2 | [[PRD - Módulo Agenda Tasks]] | Alcance actual: qué está completo y qué no (Timeline, edición), lo diseñado para v1.1.14 a v1.1.17, lo descartado y los casos de uso. |
| 3 | [[Modelo de datos]] | Entidades (`Task`, `TasksFile`, `TaskSection`), campos, emojis/Dataview reconocidos, enums, tipos de filtro/orden; §12 a §16: estado guardado de Lanes (implementado en v1.1.14), calendario, Dashboard, columnas de la Tabla y estados personalizados (v1.1.15 a v1.1.17, diseño). |
| 4 | [[Arquitectura técnica]] | Módulos de `src/core/`, flujos de carga/cache/parseo, bus de eventos, integración en `main.ts`; §28 y §29: filtros y Lanes (implementados en v1.1.14); §30 a §35: calendario, Dashboard, Tabla y CSV, reloj, estados y compatibilidad con Tasks (v1.1.15 a v1.1.17, diseño). |
| 5 | [[Especificación de vistas]] | Cada vista de tareas: datos que muestra, interacciones, estado (completa/placeholder); §19 y §20: filtros y Lanes (implementados en v1.1.14); §21 a §25: calendario, panel de vida, Tabla, reloj y estados (v1.1.15 a v1.1.17, diseño). |
| 6 | [[Plan de implementación]] | Historial de fases ya completadas (por versión, incluida v1.1.14: M1–M2, CF1–CF2, L1–L4 y CV14) + fases pendientes: v1.1.15 (NL, FE, PR, HC1), v1.1.16 (HM1, DT1, DW1, DP1–DP3, DA1, DR1), v1.1.17 (ES1–ES4, TK1–TK2, TM1, TB1–TB2), Google Calendar en v1.1.18 y la tabla de riesgos. |

## Estado

- [x] Módulo de tareas documentado (retrospectivo, basado en el código actual)
- [x] Vistas Overview / Lista / Tabla / Calendario (5 variantes) completas y en uso
- [ ] Vista Timeline (placeholder, sin lógica propia de posicionamiento temporal)
- [x] Vista Gantt (v1.1.13): barras, hitos, ventana de 7/14/21 días o mes, agrupado por área y edición de fechas; probado a mano; sin flechas de dependencia (solo una insignia)
- [x] Vista Kanban (v1.1.13): columnas por estado, prioridad, etiqueta o carpeta, arrastre de estado y prioridad y columnas plegables; probado a mano
- [x] Edición de tareas existentes desde el modal (clic simple en el calendario, doble clic abre el archivo)
- [ ] Programación por hora del día (v1.1.4, ver `docs/todo.md`)
- [x] **v1.1.14 — Filtros y Lanes** (implementado y probado a mano el 2026-11-03): filtros con varios valores y en el calendario; barra de chips `Lanes`/`Group`/`Sort` junto a «+ Filtro»; Lanes (Filas) en Kanban, Lista, Tabla y Gantt; `Group` por Inicio y Programada en Lista y Tabla; chip `Group` del Gantt
- [x] **v1.1.15 — Calendario y hábitos** (implementado el 2026-11-09 y publicado como 1.1.15): días no laborables y sombreado; feriados de México, EE. UU. e Internacional; recurrentes proyectadas; hábitos en el calendario (con periodo activo, vacaciones y selector circular, en `docs/habit-tracker-agenda/`)
- [ ] **v1.1.16 — Dashboard** (diseño, no implementado): heatmap reutilizable y de tareas; widgets de hábitos; panel de vida con pestañas, arrastre y modo «Editar»; «Agenda de hoy», «Resumen del día» y «Revisión de la semana»
- [ ] **v1.1.17 — Tareas y estados** (diseño, no implementado): Tabla con columnas y CSV; reloj de esfera para la hora; compatibilidad con Tasks (`🏁 delete` y Generar `🆔`); estados personalizados
- [ ] v1.1.18 sincronía con Google Calendar (diseño); Google Tasks en v1.1.19 y Microsoft en v1.1.20 (ideas)
- Descartado el 2026-11-02: orden manual de Kanban, Agenda view, Secciones extra y Lista semanal con imagen. Fuera por ahora: «Día recomendado», agente de revisión con IA, notificaciones, archivo de feriados del usuario y diseños de Tabla guardados con nombre.

## Enlaces de interés

- `docs/todo.md` — roadmap del plugin (sección v1.1.4: "Compatibilidad con la programación de tareas según la hora del día").
- `docs/habit-tracker-agenda/` — documentación equivalente para el módulo de hábitos (mismo formato de documento).
- `docs/mejores-practicas.md` — convenciones de desarrollo del repo.
