---
name: "Modelo de datos - Agenda Tasks"
type: "[[definition]]"
type_group: it
area: daily-plan
sub_area: task-management
archetype: engineer
status: active
related:
  - "[[README]]"
  - "[[PRD - Módulo Agenda Tasks]]"
  - "[[Arquitectura técnica]]"
created: 2026-09-25
tags:
  - obsidian-agenda
  - documentation
  - data-model
---

# Modelo de datos — Módulo Agenda Tasks

## 1. Fuente de datos

Cualquier archivo `.md` del vault puede contener tareas: no hay una carpeta configurable (a diferencia de `habitFolderPath` en el módulo de hábitos). Una tarea es cualquier línea que matchee el formato de lista de Obsidian (`- [ ]`, `* [ ]`, `+ [ ]` o numerada `1. [ ]`), con indentación y citas (`>`) opcionales.

## 2. Jerarquía de entidades

```
TasksFile (1 archivo)
  └─ contiene N líneas de texto
        └─ cada línea que matchea el formato de tarea → TaskSection (parseo) → Task (entidad final)
```

### 2.1 `Task` (`src/entities/task.ts`)

Implementa `ITask`. Es el objeto final que consumen las vistas.

| Propiedad | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Identificador único de la tarea (derivado de archivo + línea, o del campo `🆔`). |
| `file` | `ITaskFile` | Metadatos del archivo donde vive la tarea. |
| `line` | `ITaskLine` | Número de línea (`number`) y texto crudo (`text`). |
| `state` | `ITaskState` | Estado (`status`, `emoji`, `text`, `priority`, `isValid`). |
| `date` | `ITaskDate` | Fechas: `due`, `start`, `scheduled`, `created`, `done`, `cancelled` (todas `DateTime \| null`). |
| `section` | `ITaskSection` | Contenido: `header`, `desc`, `tags[]`, `fields[]` (campos crudos sin procesar). |
| `flow` | `ITaskFlow` | Control: `repeat`, `blockLink`, `dependsOn[]`, `onCompletion`. |
| `groupLabel?` | `string` | Etiqueta opcional usada al agrupar tareas en una vista. |

**Métodos estáticos clave:**
- `Task.extractStatusFromHeader(headerText): CoreTaskStatus` — interpreta el carácter dentro de `[ ]`/`[x]`/`[/]`/`[-]`.
- `Task.extractTags(text): string[]` — regex `/#[a-zA-Z0-9_\-/]+/g`.
- `Task.create(data): Task` — factory que ensambla el objeto final desde las piezas parseadas.

### 2.2 `TasksFile` (`src/entities/task-file.ts`)

Implementa `IFile<TFile>`. Envuelve un `TFile` de Obsidian con metadatos derivados.

| Propiedad / getter | Descripción |
|---|---|
| `name` | Nombre del archivo. |
| `path` | Ruta completa normalizada. |
| `root` | Primer componente de la ruta (ej. `daily` en `daily/tasks/file.md`) — usado para agrupar por "proyecto". |
| `folder` | Ruta hasta la carpeta padre. |
| `filename` / `filenameWithoutExtension` / `pathWithoutExtension` | Variantes del nombre/ruta. |
| `_frontmatter` | YAML frontmatter del archivo (siempre normaliza `tags` a un array, aunque falte). |
| `_tags` | Tags deduplicados (`Set`) combinando frontmatter + contenido. |
| `isInFolder(folder)` | Verifica pertenencia a una carpeta dada. |
| `getContentAsync()` | Lee el contenido completo vía `vault` (async). |

### 2.3 `TaskSection` (`src/entities/task-section.ts`, ~700 líneas — el parser más complejo del módulo)

Parsea el texto crudo de una línea de tarea en sus componentes.

| Propiedad | Descripción |
|---|---|
| `header` | Parte `[x] texto corto` (hasta el primer campo emoji/Dataview). |
| `description` | Texto extendido entre el header y los campos. |
| `tasksFields` | Array de fragmentos de campo sin procesar. |
| `blockLink` | Referencia de bloque `^abc123`, si existe. |
| `taskData` | Objeto con los campos ya resueltos (`dueDate`, `priority`, `recurrence`, `id`, `dependsOn`, `onCompletion`, …). |

**Validación de formato** (`taskFormatRegex`):
```
^[\t ]*(>*)\s*(-|\*|\+|\d+[.)]) {0,4}\[(.)\] {0,4}\S.+
```
Permite indentación, citas (`>`), viñeta o numeración, y exige exactamente un carácter dentro de `[ ]` seguido de contenido no vacío.

**Métodos de parseo principales:**
- `initialize(text)` — orquesta todo el proceso.
- `extractHeader(text)` / `extractDescription(text)` / `extractTasksFields(text)` — separan y resuelven cada parte (esta última interpreta emojis **y** Dataview).
- `extractBlockLink(text)` — regex `^[a-zA-Z0-9-]+` sobre el sufijo `^...`.
- `convertToRRuleFormat(recurrenceText)` — traduce texto libre tipo "every week" a formato RRULE cuando es posible; si no, conserva el texto crudo.

## 3. Interfaces (`src/types/interfaces.ts`)

```ts
interface ITaskFile {
  path: string;
  name: string;
  ext: string;
  root: string;
  meta: Record<string, unknown> | null;
}

interface ITaskLine {
  number: number;
  text: string;
}

interface ITaskState {
  status: string;     // carácter crudo, ver CoreTaskStatus
  emoji: string;       // ver CoreTaskStatusIcon
  text: string;        // "Todo" | "Done" | ...
  priority: string;    // "high" | "medium" | "low" | "undefined"
  isValid: boolean;
}

interface ITaskDate {
  due: DateTime | null;
  start: DateTime | null;
  scheduled: DateTime | null;
  created: DateTime | null;
  done: DateTime | null;
  cancelled: DateTime | null;
}

interface ITaskSection {
  header: string;
  desc: string;
  tags: string[];
  fields: string[];
}

interface ITaskFlow {
  repeat: string;
  blockLink: string;
  dependsOn: string[];
  onCompletion: string | null;   // "keep" | "delete"
}
```

Tipos de vista/datos también viven aquí: `FolderNode`, `WeekViewData`, `DayViewData`, `MonthViewData`, `YearViewData`, `CalendarViewData` (unión de las 4 anteriores), `ViewData` (unión de todos los tipos de datos de vista), `TaskFilterCriteria`, `SortField`, `GroupField`, `ModalType`, `ModalOptions`, y la interfaz `AgendaPlugin` (contrato mínimo que exponen `viewManager`/`modalManager`/`settings` al resto del plugin).

## 4. Enums (`src/types/enums.ts`)

```ts
enum CoreTaskStatus { Todo = " ", InProgress = "/", Done = "x", Cancelled = "-", nonTask = "~" }
enum CoreTaskStatusIcon { Todo = "⭕", InProgress = "🛠️", Done = "✅", Cancelled = "❌", nonTask = "🗑️" }
enum TaskPriority { Lowest, Low, Normal, Medium, High, Highest }
enum TaskPriorityEmoji { Lowest = "⏬", Low = "🔽", Normal = "▶️", Medium = "🔼", High = "⏫", Highest = "🔺" }
enum TaskDateType { Created = "➕", Start = "🛫", Scheduled = "⏳", Due = "📅", Done = "✅", Cancelled = "❌" }
enum OnCompletion { Keep = "keep", Delete = "delete" }
enum CalendarViewType { Year, Month, Week, WorkWeek, Day }
```

## 5. Emojis y campos Dataview reconocidos

| Emoji | Campo | Equivalente Dataview |
|---|---|---|
| 📅 | `dueDate` | `due::` / `duedate::` |
| 🛫 | `startDate` | `start::` / `startdate::` |
| ⏳ | `scheduledDate` | `scheduled::` / `scheduleddate::` |
| ➕ | `createdDate` | `created::` / `createddate::` |
| ✅ | `doneDate` | `done::` / `donedate::` |
| ❌ | `cancelledDate` | `cancelled::` / `cancelleddate::` / `canceled::` / `canceleddate::` |
| ⏬ 🔽 ▶️ 🔼 ⏫ 🔺 | `priority` (lowest…highest) | `priority::` |
| 🔁 | `recurrence` | `repeat::` |
| 🆔 | `id` | `id::` |
| ⛔ | `dependsOn` (lista separada por coma) | `dependson::` / `depends::` / `blockedby::` |
| 🏁 | `onCompletion` (`keep`\|`delete`) | `oncompletion::` / `completion::` |
| 🕐 *(v1.1.4, implementado)* | hora del día — ligada al icono de fecha **inmediatamente anterior** en la línea (📅/🛫/⏳); formato 24h `HH:mm` | `time::` (siempre modifica a `scheduled`, ya que `due`/`start` nunca llevan hora) |
| ⏱️ *(v1.1.4, implementado)* | `duration` — ligada siempre a `⏳ scheduled` (modo bloque); formato en **minutos** (`⏱️ 90m`, sin mezclar horas) | `duration::` (minutos) |

Ambos formatos convergen en el mismo `taskData` interno — una tarea puede incluso mezclar campos emoji y Dataview en la misma línea, el parser los resuelve por igual.

## 6. Tipos de filtrado, ordenamiento y agrupación

```ts
type SortField = 'dueDate' | 'startDate' | 'scheduledDate' | 'doneDate'
  | 'createdDate' | 'priority' | 'status' | 'text' | 'path';

type GroupField = 'status' | 'priority' | 'dueDate' | 'path' | 'tags';
```

`TaskFilterCriteria` admite (entre otros): `isCompleted`, `status[]`, `includes[]`/`excludes[]`/`regex` (texto libre), `tags: { includes[], excludes[] }`, `priority: { is[], above, below }`, filtros de fecha por campo (`before`/`on`/`after`) y filtros relativos (`dueDateRelative: { today, tomorrow, thisWeek, nextWeek, overdue }`), además de filtros de ubicación (carpeta/archivo) y avanzados (recurrencia, dependencias).

## 7. Decisiones de diseño (notas)

- **Doble soporte emoji + Dataview**: en vez de elegir un único formato, `TaskSection` resuelve ambos hacia el mismo `taskData`, para no obligar al usuario a migrar sus notas existentes ni a instalar un plugin específico.
- **Sin ruta configurable**: a diferencia de hábitos, las tareas se buscan en **todo** el vault — el "proyecto" de una tarea es simplemente `root` (primera carpeta de su ruta), no una ubicación fija.
- **Cache con TTL además de invalidación por eventos**: la invalidación por eventos de vault cubre la mayoría de los casos, pero el TTL de 5 minutos actúa como red de seguridad ante cambios que no disparan los eventos escuchados (p. ej. ediciones externas al proceso de Obsidian).
- **`isValid` en `ITaskState`**: una línea que matchea el formato de lista pero cuyo contenido no se pudo interpretar del todo igual se conserva (no se descarta silenciosamente), marcada como inválida, para que la vista Overview pueda listarla en "tareas inválidas" en vez de ocultarla.

## 8. Casos límite conocidos

| Caso | Comportamiento actual |
|---|---|
| Línea con `[ ]` pero sin coincidir el resto del regex | Se ignora, no se crea `Task`. |
| Emoji de fecha con valor no parseable como fecha | El campo queda vacío/null; no rompe el resto de la línea. |
| Mismo campo repetido en emoji y Dataview en la misma línea | Gana el último que el parser procese (no hay deduplicación explícita documentada en código). |
| Archivo sin ninguna tarea | Se cachea como lista vacía; no se reintenta en cada refresco dentro del TTL. |
| Recurrencia en texto libre no traducible a RRULE | Se conserva el texto original en `flow.repeat`. |

## 9. Programación por hora del día (v1.1.4) — decisiones acordadas

> Diseño acordado en sesión de brainstorming previa a la implementación; ver también [[Especificación de vistas]] §4 y [[Plan de implementación]] para el desglose de fases.

### ADR-T1 — `due` siempre es de día completo, nunca lleva hora

- **Decisión**: `due` (📅) conserva su semántica actual de "para cuándo debe estar hecho" a nivel de día; **no** admite componente de hora.
- **Racional**: evita que `due` signifique dos cosas distintas (deadline de día vs. instante exacto) y no rompe la lectura de notas existentes. Quien necesite un deadline a una hora exacta usa `⏳ scheduled` con esa misma fecha/hora.

### ADR-T2 — `scheduled` es el único campo con hora, con modo punto o modo bloque

- **Decisión**: `⏳ scheduled` admite opcionalmente `🕐 HH:mm` (modo punto, un instante) y, si además trae `⏱️` (duración), pasa a modo bloque (`[hora, hora + duración]`).
- **Racional**: separa "cuándo debe estar listo" (`due`) de "cuándo lo voy a trabajar" (`scheduled`), y permite representar tanto recordatorios puntuales como eventos/bloques de trabajo con el mismo campo, sin inventar una tercera fecha.
- **`start` (🛫) no lleva hora**: sigue siendo "el día más temprano en que se puede empezar", a nivel de día.

### ADR-T3 — Formato del icono de hora: campo de primer nivel independiente

- **Decisión (revisada, 2026-09-27)**: `🕐` y `⏱️` son campos de primer nivel propios (igual que `📅`/`🛫`/`⏳`/prioridad/etc.), detectados en **cualquier posición del renglón**, no ligados por posición al icono de fecha que los precede. Semánticamente solo tienen sentido junto a `scheduled`, así que siempre se escriben en `taskData.scheduledTime`/`taskData.scheduledDuration` sin importar dónde aparezcan en la línea ni en qué orden estén entre ellos.
- **Decisión original (superada)**: la primera versión los interpretaba como modificadores del icono de fecha inmediatamente anterior (p. ej. `⏳ 2026-10-01 🕐 15:00 ⏱️ 90m`), reutilizando el mismo mecanismo de "todo el texto hasta el siguiente emoji reconocido" que usan los demás campos de fecha. Esto resultó frágil: si el usuario los escribía en otro orden, o cualquier otro icono se colaba entre medio, el campo completo (incluida la fecha) se invalidaba y la tarea desaparecía del calendario (ver corrección de 2026-09-27 más abajo, ya incorporada a esta decisión revisada).
- **Racional (se mantiene)**: si un usuario tiene instalado el plugin real **Obsidian Tasks** (que no soporta hora en sus campos de fecha), este sigue leyendo correctamente `⏳ 2026-10-01` y simplemente ignora/muestra como texto suelto el resto — no se rompe la interoperabilidad. Hora y duración son estrictamente **opcionales y aditivas**: una tarea sin ellas se comporta exactamente igual que hoy. Un `🕐`/`⏱️` con formato inválido tampoco invalida la tarea completa (mismo criterio que la recurrencia, `🔁`): simplemente se ignora ese valor puntual.
- **Zona horaria**: `🕐 HH:mm` se interpreta siempre en hora **local del vault** (la misma zona que usa Luxon en el resto del plugin, ej. `toLocalMidnight`); no se guarda ningún offset de zona horaria en el texto.

### ADR-T4 — Qué fechas se muestran en el calendario, y con qué prioridad

- **Decisión**: las vistas de calendario pueden mostrar `start`, `due` y `scheduled` (no `created`/`done`/`cancelled`), de forma **configurable** (setting global con checkboxes + posible override por vista), cada una con una marca visual distinta (color/borde/indicador) para distinguirlas a simple vista.
- **Prioridad de aparición** cuando una tarea tiene más de una de estas fechas cayendo el mismo día: `scheduled > due > start` — se muestra **una sola vez**, con la de mayor prioridad presente ese día, para no duplicar la tarea en la misma celda/franja.
- **Vista Día**: `scheduled` (con hora) puebla las franjas horarias (`hourSlots`); `due` y `start` sin hora (siempre, por ADR-T1) aparecen en **dos filas fijas separadas** "Todo el día" (una para `due`, otra para `start`), expandidas por defecto (revertido de la decisión original D10, colapsable manualmente), cada una con su propio distintivo visual (ver ADR-T4-bis).

### ADR-T4-bis — Distintivo visual por tipo de fecha

- **Decisión**: cada tipo de fecha (`start`/`due`/`scheduled`) se distingue con **icono + color combinados** (no solo color, por accesibilidad): un prefijo pequeño con el mismo emoji que el usuario ya escribió (🛫/📅/⏳) más un acento de color consistente por tipo, aplicado de forma uniforme en Mes/Semana/Año/Día.
- **Racional**: reutiliza el emoji que el propio usuario ya asocia a cada campo (cero curva de aprendizaje nueva) y evita depender solo de color, que falla para usuarios daltónicos.

### ADR-T5 — Tareas empalmadas en la misma franja (pendiente, documentado para después)

- **Estado**: **diferido**. Cuando dos o más tareas caen en la misma franja horaria de la vista Día, v1.1.4 las apila verticalmente en una mini-lista dentro de la franja (solución simple).
- **Mejora futura anotada**: layout en carriles lado a lado, estilo Google Calendar, para cuando haya varios bloques superpuestos en la misma hora — no se resuelve en esta fase.

### ADR-T6 — Tareas completadas con horario/bloque

- **Decisión**: por defecto, una tarea completada (`done`) que tenga `scheduled`/duración sigue mostrándose en su franja u origen (para valor retrospectivo), pero con tratamiento visual atenuado (opacidad reducida/tachado) en vez de ocultarse.
- **Ampliación**: se agregó el setting `calendarShowCompletedTasks` (Settings ▸ Calendario, default activado) para quien prefiera **ocultar por completo** las tareas completadas del calendario en vez de solo atenuarlas.
- **Nota de futuro**: esto siembra la base de datos necesaria para el ítem ya listado en el roadmap "Seguimiento de tiempo real gastado vs. estimado" (Gestión de Tiempo Avanzada, v1.x–v2.x).

### ADR-T7 — Bloque que cruza medianoche

- **Decisión**: si `scheduled` + `duration` exceden las 24:00 del día en curso (p. ej. `🕐 23:00 ⏱️ 180m`), el bloque se **recorta visualmente al final del día** en la vista Día; no se representan bloques multi-día en v1.1.4.

### Diferido para una próxima versión (no v1.1.4, pero queda anotado)

- **Recurrencia (`🔁`) + hora/duración**: cómo hereda cada ocurrencia futura de una tarea recurrente la hora/duración de la ocurrencia original no se resuelve en v1.1.4; `convertToRRuleFormat` hoy no tiene ningún concepto de hora. Queda como ítem explícito para cuando se retome ese código.
- **Soporte móvil** (menú contextual vía mantener presionado, drag-and-drop táctil): v1.1.4 se centra en desktop/web; el comportamiento en móvil de la inserción por menú (§6 en [[Arquitectura técnica]]) y del drag-and-drop (Fase D) queda pendiente de validar en una fase posterior.

### Fuera de alcance de v1.1.4 (anotado, no descartado)

- **Vista Semana horaria completa** (grilla de 7 columnas × 24 filas estilo Google Calendar): la vista Semana actual solo gana una etiqueta de hora dentro de la cápsula existente; la grilla horaria completa queda como un ítem de roadmap propio y futuro.
- **Kanban / Gantt**: siguen fuera de alcance; una vez exista `scheduled`+`duration` como datos reales, terminar la vista Gantt (hoy un placeholder, ver [[Especificación de vistas]] §6) se vuelve mucho más directo, porque son exactamente los datos que le faltaban.
- **Drag and drop de fechas**: depende de una capacidad nueva de escritura — reescribir en su lugar una línea de tarea existente (hoy `TaskWriter.appendTaskLine` solo anexa) — compartida con el ítem, también pendiente, de edición nativa de tareas. Ver desglose en [[Plan de implementación]].

## 10. Manejo de estatus desde el calendario (v1.1.10) — decisiones acordadas

### ADR-S1 — Sexto Status Type: `ON_HOLD`

- Símbolo: `?` (nuevo valor en `CoreTaskStatus`, junto a los 5 ya existentes: ` `/`/`/`x`/`-`/`~`).
- Ícono: ⏸️ (nuevo valor en `CoreTaskStatusIcon`).
- Nombre para `state.text`: `"OnHold"`, siguiendo el mismo patrón que `"NonTask"`.
- Tasks no define un símbolo estándar para este tipo (lo deja a elección de cada configuración de estados personalizados); se adopta `?` por afinidad semántica con su propia definición ("esperando información o decisión externa").

### ADR-S2 — Estados personalizados/configurables, diferidos

- Se mantiene un conjunto fijo de 6 símbolos reconocidos (`CoreTaskStatus`); no se expone configuración de símbolos propios en esta versión. El enum `CustomStatus` (`src/types/enums.ts`) sigue sin usarse; queda como base para una versión futura, no se elimina ni se conecta ahora.

### ADR-S3 — Cambiar el estado agrega/quita la fecha de finalización, igual que Obsidian

- Al cambiar el símbolo de una tarea a `Done` (`x`), se agrega `✅ YYYY-MM-DD` (fecha de hoy) si no existía.
- Al cambiar desde `Done` hacia cualquier otro estado, se quita la fecha `✅` si existía — replica el comportamiento nativo del checkbox de Obsidian/Tasks.
- No se genera ninguna ocurrencia nueva de tareas recurrentes (🔁) al marcar `Done` desde esta función — ese comportamiento se diseña aparte en el punto de tareas recurrentes del roadmap.
- Fuera de alcance: filtrar el calendario por estado (ya existe `calendarShowCompletedTasks` para ocultar completadas) y estados personalizados (ADR-S2).

## 11. Recurrencia: nueva ocurrencia al completar (v1.1.10) — decisiones acordadas

> Investigación de referencia: comportamiento oficial de Obsidian Tasks. Detalle técnico de implementación: [[Arquitectura técnica]] §16.

### ADR-R1 — Disparador: marcar como `Done` una tarea con 🔁

- Mismo punto de disparo que ADR-S3 (cambio de estado a `Done`, desde el menú contextual del calendario o el Task Modal): si la tarea tiene `flow.repeat` no vacío, además de agregar `✅ <hoy>` a la tarea original, se inserta una nueva línea con la siguiente ocurrencia.
- La nueva línea se inserta **una línea arriba** de la original (mismo valor por defecto que Tasks); no se agrega una opción para cambiar ese orden en esta fase (ver Fuera de alcance).

### ADR-R2 — Orden de prioridad de fecha para calcular la siguiente ocurrencia

- Se usa el mismo orden ya establecido en ADR-T4 para este plugin: `scheduled > due > start` (no el orden de Tasks, que es `due > scheduled > start`), por consistencia con el resto del comportamiento del calendario (drag and drop, badges). La fecha de mayor prioridad presente en la tarea es la "fecha de referencia" para la regla RRULE.
- Si la tarea tiene más de una fecha, las demás se desplazan manteniendo la misma distancia relativa a la fecha de referencia que tenían en la tarea original (igual que Tasks).

### ADR-R3 — Soporte de `when done`

- Si el texto de recurrencia termina en `when done` (p. ej. `🔁 every week when done`), la fecha de referencia para calcular la siguiente ocurrencia es la fecha de **hoy** (cuándo se completó), no la fecha original de la tarea — confirmado para esta fase.
- `task-section.ts` debe reconocer y despojar el sufijo `when done` antes de convertir el resto a RRULE (hoy no lo hace; si el texto trae `when done`, la conversión actual probablemente falla o lo interpreta como parte de la regla).

### ADR-R4 — Campos que se eliminan en la nueva ocurrencia

- `🆔` y `⛔` (id y dependsOn) se eliminan de la nueva ocurrencia, igual que Tasks — evita IDs duplicados y dependencias que quedarían bloqueadas para siempre.
- El resto de los campos (prioridad, texto de recurrencia, etc.) se copian tal cual.

### ADR-R5 — Fechas inválidas (fin de mes/año)

- Se delega por completo en la librería `rrule` (ya es dependencia del proyecto, usada hoy solo para validar sintaxis) para calcular la siguiente fecha válida; no se reimplementa ninguna lógica de "mover al último día válido" a mano.

### Fuera de alcance
- Configurar el orden de inserción (arriba/abajo) de la nueva ocurrencia.
- Recurrencia "para X veces" o "hasta una fecha" (limitaciones conocidas también en Tasks, ligadas a la librería `rrule`).
- Generar la nueva ocurrencia al marcar `Done` desde el checkbox nativo de Obsidian (fuera del control de este plugin) — solo se cubre el cambio de estado hecho desde dentro del plugin (calendario o Task Modal).

### Fix relacionado (no es parte del diseño de estatus, se corrige de paso)

`TaskFilter`/`src/core/task-filter.ts`: `isTaskCompleted` compara `task.state.status` (símbolo literal, ej. `'x'`/`'-'`) contra las cadenas `'DONE'`/`'CANCELLED'` (que corresponden a `state.text`, no a `state.status`) — la comparación nunca es verdadera. Se corrige para comparar `state.text` contra `'Done'`/`'Cancelled'`.
