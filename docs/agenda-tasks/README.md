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

Documentar, tal como existe hoy en el código, el módulo de **gestión de tareas** del plugin **Obsidian Agenda** (`C:\Code\obsidian\obsidian-agenda`): el modelo de datos, el motor de extracción/filtrado/ordenamiento, las vistas (Overview, Lista, Tabla, Calendario en sus 5 variantes, Timeline y Gantt) y el modal de creación/edición.

A diferencia de `docs/habit-tracker-agenda/` (que documentó un módulo nuevo **antes** de construirlo), este conjunto de documentos es **retrospectivo**: describe funcionalidad que ya está implementada y en uso desde la v1.0.0, para dejar una base de referencia sólida antes de tocar el código — en particular, antes de abordar el pendiente de la v1.1.4 (roadmap en `docs/todo.md`): compatibilidad con la programación de tareas según la hora del día.

## Contexto actual (cómo funciona hoy)

- **Fuente de datos**: cualquier archivo `.md` del vault que contenga líneas con el formato de lista de tareas de Obsidian (`- [ ] texto`), en **cualquier carpeta** — no existe una ruta configurable como en el módulo de hábitos (`habitFolderPath`).
- **Extracción**: `TaskExtractor` lee cada archivo (usando primero el cache de metadatos de Obsidian — `MetadataCache.listItems` — y, si no está disponible, un parseo manual línea por línea con expresiones regulares) y construye objetos `Task` con fechas, prioridad, tags, recurrencia, dependencias y demás campos.
- **Cache**: `TaskCache` mantiene un cache de dos niveles (por archivo + global) con TTL de 5 minutos, invalidado automáticamente por los eventos `create`/`modify`/`delete`/`rename` del vault.
- **Filtrado y orden**: `TaskFilter`/`TaskSorter` aplican criterios (estado, fecha, prioridad, tags, texto, carpeta) y ordenamientos/agrupaciones multi-campo bajo demanda de cada vista.
- **Vistas**: Overview (dashboard), Lista (jerárquica por carpeta o plana), Tabla (ordenable/filtrable), Calendario (Día, Semana, Semana laboral, Mes, Año), y dos vistas registradas pero incompletas (Timeline, Gantt).
- **Creación/edición**: `TaskModal` + `TaskWriter` generan/anexan líneas de tarea en formato emoji al archivo elegido; la edición de tareas existentes (`"edit-task"`, reescritura en el lugar) está implementada.
- **Compatibilidad**: el mismo texto de tarea es reconocido tanto en formato **emoji** (el que usa el plugin [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)) como en formato **Dataview** (`due:: 2026-10-01`), mapeados a los mismos campos internos.

## Mapa de documentos

| # | Documento | Contenido |
|---|---|---|
| 1 | [[README]] (este) | Índice, contexto, propuesta. |
| 2 | [[PRD - Módulo Agenda Tasks]] | Alcance actual: qué está completo y qué no (Timeline/Gantt/edición), casos de uso. |
| 3 | [[Modelo de datos]] | Entidades (`Task`, `TasksFile`, `TaskSection`), campos, emojis/Dataview reconocidos, enums, tipos de filtro/orden. |
| 4 | [[Arquitectura técnica]] | Módulos de `src/core/`, flujos de carga/cache/parseo, bus de eventos, integración en `main.ts`. |
| 5 | [[Especificación de vistas]] | Cada vista de tareas: datos que muestra, interacciones, estado (completa/placeholder). |
| 6 | [[Plan de implementación]] | Historial de fases ya completadas (por versión) + trabajo pendiente (Timeline, Gantt, hora del día). |

## Estado

- [x] Módulo de tareas documentado (retrospectivo, basado en el código actual)
- [x] Vistas Overview / Lista / Tabla / Calendario (5 variantes) completas y en uso
- [ ] Vista Timeline (placeholder, sin lógica propia de posicionamiento temporal)
- [ ] Vista Gantt (placeholder, sin cálculo de duración/dependencias visual)
- [x] Edición de tareas existentes desde el modal (clic simple en el calendario, doble clic abre el archivo)
- [ ] Programación por hora del día (v1.1.4, ver `docs/todo.md`)

## Enlaces de interés

- `docs/todo.md` — roadmap del plugin (sección v1.1.4: "Compatibilidad con la programación de tareas según la hora del día").
- `docs/habit-tracker-agenda/` — documentación equivalente para el módulo de hábitos (mismo formato de documento).
- `docs/mejores-practicas.md` — convenciones de desarrollo del repo.
