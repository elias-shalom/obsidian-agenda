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
- [x] Vistas: **Overview** (dashboard con KPIs), **Lista** (jerárquica por carpeta o plana), **Tabla** (ordenable, filtrable), **Calendario** (Día, Semana, Semana laboral, Mes, Año).
- [x] Creación de tareas desde un modal (`TaskModal` + `TaskWriter`), con selección de archivo/carpeta destino, fecha, prioridad y tags.
- [x] Bus de eventos (`EventBus`, patrón singleton sobre `mitt`) para desacoplar cache de UI.
- [x] Configuración de visibilidad de pestañas (`showOverviewTab`, `showListTab`, `showTableTab`, `showCalendarTab`) y de inicio de semana (`weekStartDay`), con refresco selectivo de solo las vistas de calendario al cambiar este último.
- [x] i18n en los 6 idiomas actuales del plugin (`en`, `es`, `de`, `fr`, `it`, `pt`).

### 2.2 Incompleto / fuera de alcance actual

- [ ] **Vista Timeline** (`timeline-view.ts`): registrada y renderiza, pero sin lógica de posicionamiento temporal propia — hoy solo lista las tareas cargadas tal cual, igual que un placeholder.
- [ ] **Vista Gantt** (`gantt-view.ts`): mismo estado que Timeline; falta cálculo de duración (start→due) y representación visual de `dependsOn`.
- [x] **Edición de tareas existentes** desde el modal: implementada — clic simple en una tarea del calendario abre `"edit-task"` prefilled, doble clic abre el archivo.
- [ ] **Programación por hora del día**: hoy una tarea solo tiene fechas de calendario (`due`/`start`/`scheduled`/`created`/`done`/`cancelled`), sin componente de hora. La vista Día ya organiza el contenido en 24 franjas horarias (`hourSlots`), pero no existe una forma en la UI de asignarle una hora a una tarea — ver roadmap v1.1.4 en `docs/todo.md` ("Una forma de agregar la fecha desde el archivo con iconos", "agregar las fechas con el botón secundario").
- [ ] Filtro/orden por carpeta como criterio de primera clase de forma uniforme en todas las vistas (hoy es más completo en Tabla que en el resto).
- [ ] **Navegación por fecha en el calendario** (v1.1.9, diseño en [[Especificación de vistas]] §4.6): hoy solo se marca "hoy", la fecha no se conserva al cambiar de vista y llegar a una fecha lejana exige muchas flechas. Se propone una fecha de referencia compartida con resaltado propio y un selector ocultable con niveles de día, año y mes.
- [ ] Configuración de patrones de emoji personalizados — los iconos reconocidos están fijos en `TaskSection` (`emojiMapping`), no son configurables por el usuario.

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
