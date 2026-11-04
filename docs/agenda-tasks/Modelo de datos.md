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
| `id` | `string` | Identificador de posición de la tarea: siempre `ruta#línea` (v1.1.12; antes era el `🆔` si existía y `ruta-línea` si no). Se recalcula al volver a extraer el archivo, por lo que no debe guardarse. El `🆔` va en `flow.id`. |
| `file` | `ITaskFile` | Metadatos del archivo donde vive la tarea. |
| `line` | `ITaskLine` | Número de línea (`number`) y texto crudo (`text`). |
| `state` | `ITaskState` | Estado (`status`, `emoji`, `text`, `priority`, `isValid`). |
| `date` | `ITaskDate` | Fechas: `due`, `start`, `scheduled`, `created`, `done`, `cancelled` (todas `DateTime \| null`). |
| `section` | `ITaskSection` | Contenido: `header`, `desc`, `tags[]`, `fields[]` (campos crudos sin procesar). |
| `flow` | `ITaskFlow` | Control: `id` (el `🆔`, v1.1.12), `repeat`, `blockLink`, `dependsOn[]`, `onCompletion`. |
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
- **Racional (se mantiene)**: si un usuario tiene instalado el plugin real **Obsidian Tasks** (que no soporta hora en sus campos de fecha), este sigue leyendo correctamente `⏳ 2026-10-01` y simplemente ignora/muestra como texto suelto el resto — no se rompe la interoperabilidad. **Verificado el 2026-10-09** en un vault con Tasks instalado: con `⏳ 2026-10-19 🕐 09:00 ⏱️ 30m` al final de la línea, Tasks sigue reconociendo `📅` y `⏳`. Hora y duración son estrictamente **opcionales y aditivas**: una tarea sin ellas se comporta exactamente igual que hoy. Un `🕐`/`⏱️` con formato inválido tampoco invalida la tarea completa (mismo criterio que la recurrencia, `🔁`): simplemente se ignora ese valor puntual.
- **Zona horaria**: `🕐 HH:mm` se interpreta siempre en hora **local del vault** (la misma zona que usa Luxon en el resto del plugin, ej. `toLocalMidnight`); no se guarda ningún offset de zona horaria en el texto.
- **Actualización (2026-11-02, diseño para v1.1.17):** el formato **guardado** sigue siendo 24 h (`🕐 14:30`); lo que cambia es el modal de hora, que pasa a un reloj de esfera con AM/PM en 12 h (ver [[Especificación de vistas]] §24). Así, el formato de la línea, el parser y el plugin Tasks no cambian.

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
- **Actualización (2026-11-02):** los estados personalizados se diseñan para **v1.1.17** con un registro de estados (símbolo, nombre, icono y tipo), ver §16.

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

---

> **Secciones 12 a 16 — diseño, no implementado.** Recogen el modelo y el estado guardado de lo que se diseñó el 2026-11-02 para v1.1.14 a v1.1.17 (reparto en [[Plan de implementación]]). Los nombres de ajustes y de tipos marcados «propuesto» o «boceto» **no existen en el código**: se fijan al implementar; los de «hoy» se verificaron en `src/settings/settings.ts` y `src/core/task-view-state.ts`. Dónde se guarda cada cosa: los **ajustes** viven en `data.json` (`loadData()`/`saveData()` de `main.ts`, mezclados sobre `DEFAULT_SETTINGS`); el **estado de las vistas** vive hoy en `localStorage` (`app.loadLocalStorage()`), por dispositivo y sin sincronizar.

## 12. Estado guardado de Lanes, Group y Sort por vista (v1.1.14 — diseño, no implementado)

> Comportamiento: [[Especificación de vistas]] §20. Mecanismo: [[Arquitectura técnica]] §29 y §28.

### 12.1 Estado de hoy (verificado)

| Vista | Clave de `localStorage` | Valores por defecto relevantes |
|---|---|---|
| Lista y Tabla (compartido) | `obsidian-agenda-task-view-state` | `mode: 'list'`, `search: ''`, `priority: []`, `status: []`, `areas: []` (antes de v1.1.14 eran `priority: 'all'`, `status: 'all'`, `area: ''` y `subArea: ''`; el estado guardado así se convierte al leerlo), `start`/`scheduled`/`due: 'all'`, `group: ''` (vacío = el de cada vista: Lista `LIST_DEFAULT_GROUP = 'area'`, Tabla `TABLE_DEFAULT_GROUP = 'none'`), `sortColumn: 'priority'`, `sortDirection: 'desc'` |
| Kanban | `obsidian-agenda-kanban-view-state` (mismo formato) | `group` válido entre `KANBAN_GROUP_OPTIONS` (`status`, `priority`, `tags`, `folder`), por defecto `KANBAN_DEFAULT_GROUP = 'status'`; columnas plegadas en `obsidian-agenda-kanban-collapsed` |
| Gantt | `obsidian-agenda-gantt-view-state` (mismo formato) | orden por defecto `sortColumn: 'start'`, `sortDirection: 'asc'`; zoom en `oa_gantt_zoom` (`14`); grupos plegados en `oa_gantt_collapsed:<clave>`; «sin fecha» en `oa_gantt_show_undated`. Hoy no tiene `group` propio (agrupa siempre por área y sub-área) |

`TASK_GROUP_OPTIONS` (Lista y Tabla): `none`, `area`, `folder`, `status`, `priority`, `tags`, `dueDate`.

### 12.2 Estado nuevo (v1.1.14)

| Elemento | Propuesta | Valor por defecto |
|---|---|---|
| Lanes por vista | campo nuevo `lanes` en el estado de cada vista (una clave por vista, como hoy: Lista y Tabla la comparten, Kanban y Gantt la suya) | `'none'` (Ninguno) |
| Group del Gantt | campo `group` en el estado del Gantt, con las opciones Ninguno (modo plano), Área, Estado y Prioridad | `'area'` (el comportamiento actual) |
| Sort | sin cambios de modelo: `sortColumn` y `sortDirection` pasan al chip `Sort` (la flecha ↑/↓ vive dentro del chip) | los de cada vista, sin cambio |
| Pliegue de carriles | un valor `true`/ausente por carril, **recordado por campo** (la clave incluye el campo de Lanes y la clave del carril) | desplegado |
| Filtros con varios valores | `priority`, `status` y las áreas pasan de un valor a lista; un valor guardado de la forma antigua se convierte al leer ([[Especificación de vistas]] §19) | lista vacía = todos |
| Estado del calendario (CF1) | clave `obsidian-agenda-calendar-view-state`, compartida por las 6 subvistas: solo `search`, `priority`, `status` y las áreas | sin filtros |

Reglas (decididas 2026-11-03): Lanes y Group no repiten campo, entendido por familia: Estado con Estado, Prioridad con Prioridad, Etiqueta con Etiquetas y la familia de ruta (Área, Sub-área y Carpeta) entre sí; Archivo y Vencimiento quedan libres. En **Kanban** la opción en uso queda atenuada y no se puede elegir (las columnas son obligatorias); en **Lista, Tabla y Gantt** se puede elegir y el otro chip pasa solo a Ninguno (`'none'`), en los dos sentidos. Opciones de Lanes: Ninguno, Área, Sub-área, Estado, Prioridad, Etiqueta, Carpeta y Archivo; las columnas y el `Group` de Kanban siguen siendo Estado, Prioridad, Etiqueta, Carpeta y Archivo.

**ADR-LA1 — Dónde se guarda.** El estado de Lanes, Group y Sort por vista sigue el patrón de las claves de `localStorage` que ya existen (por dispositivo, sin sincronizar), porque son preferencias de visualización, como el agrupado y el orden de hoy. **Confirmado al implementar L2 (2026-11-03)**: `lanes` es un campo más de `TaskViewState`, sin clave nueva.

**Por resolver al diseñar**
- Nombre exacto de la clave de pliegue de carriles y de los campos nuevos.
- Resuelto el 2026-11-03: el valor por defecto de `Group` en Lista sigue siendo Área (`LIST_DEFAULT_GROUP`); al ajustarse solo por un conflicto con Lanes (Lista, Tabla y Gantt), se escribe `'none'` de forma explícita y no el valor por defecto.
- Si el estado guardado de una vista con un `lanes` que ya no existe (o que choca con `group`) se repara al leer, como hace `parseKanbanState()` con un agrupado desconocido. Parcialmente resuelto en L2: `parseTaskViewState()` deja `lanes` en `''` si el valor no es un campo válido; un choque con `group` no se repara al leer (se evita al elegir) y se decide en L3 y L4, cuando las vistas lean `lanes`.

## 13. Calendario: días no laborables, feriados, proyección y hábitos (v1.1.15 — diseño, no implementado)

> Comportamiento: [[Especificación de vistas]] §21. Mecanismo: [[Arquitectura técnica]] §30. Los hábitos (periodo activo `desde`/`hasta` y lista de vacaciones) están en el modelo de `docs/habit-tracker-agenda/`.

### 13.1 Ajustes nuevos (en `data.json`, junto a los `calendar*` de hoy)

Hoy: `weekStartDay: 1`, `calendarShowDueDates: true`, `calendarShowStartDates: false`, `calendarShowScheduledDates: true`, `calendarShowCompletedTasks: true`, `calendarListDaysToShow: 14`, `showHabitTab: true`.

| Ajuste (nombre propuesto) | Tipo | Valor por defecto | Quién lo usa |
|---|---|---|---|
| `nonWorkingDays` | `number[]` de días ISO (1 = lunes … 7 = domingo; la misma numeración de `weekday` de Luxon y de las frecuencias de hábitos) | `[6, 7]` (sábado y domingo) | sombreado de Mes, Semana y Lista; Semana laboral (oculta los marcados; el ajuste exige al menos un día marcado y uno sin marcar, así que nunca queda vacía); Gantt (hoy fijo con `weekday >= 6`); frecuencias «Fin de semana» y «Lunes a viernes» de los hábitos (hoy fijas en `[6, 7]` en `habit-editor.ts` y `habit-table-view.ts`) |
| `holidayCalendars` | lista de calendarios de feriados (ver 13.2) | `[]` (ninguno activo) | las 6 vistas del calendario y el Gantt, solo visual |
| `calendarProjectionCount` (N) | `number` entero ≥ 0 | `10`; `0` desactiva la proyección | Mes, Semana, Semana laboral, Día y Lista del calendario |
| `calendarShowHabits` | `boolean` | `false` | calendario; sin efecto si `showHabitTab` es `false` |

### 13.2 Calendarios de feriados

```ts
// Boceto: los nombres se fijan al implementar (fase FE2)
interface HolidayCalendarSetting {
  country: 'MX' | 'US';
  region?: string;          // estado o región; sin región = solo las reglas nacionales
  official: boolean;        // casilla «Oficiales»
  unofficial: boolean;      // casilla «No oficiales»
  color: string;
}
```

- El conjunto de reglas de cada país vive en el código (embebido, sin red): cada regla tiene un nombre (traducible), una categoría (`official` o `unofficial`; p. ej. Día de las Madres, Día de Muertos y Halloween son no oficiales) y un tipo: fecha fija; n-ésimo o último día de la semana del mes; relativo a la Pascua; observado (si cae en fin de semana se recorre); ciclo de años (transmisión del Poder Ejecutivo de México, cada 6 años); lista explícita por año. Una regla puede ser nacional o de una región.
- Ejemplos decididos: México 5 feb → primer lunes de febrero, 21 mar → tercer lunes de marzo, 20 nov → tercer lunes de noviembre; EE. UU. MLK, Memorial Day y Acción de Gracias.
- Los feriados son **solo visuales**: no se guardan en las notas ni afectan a la Semana laboral, las rachas ni las tareas. Un archivo de reglas del usuario queda fuera por ahora.

### 13.3 Proyección de recurrentes y hábitos en el calendario (datos en memoria)

- **Ocurrencias proyectadas**: no se guardan. Se calculan al dibujar con `getNextOccurrenceDate()` (`src/core/task-recurrence.ts`), N por tarea posteriores a la ocurrencia real, y no se proyectan las reglas `when done`. Son entradas de solo lectura que apuntan a la tarea real (`ruta#línea`, ver §2.1); la ocurrencia real se sigue escribiendo al completar la anterior (ADR-R1).
- **Hábitos en el calendario**: entradas virtuales por día en que toca el hábito; **no son `Task`** y no se escriben en ningún archivo. Marcar o desmarcar reutiliza la escritura de `completions` de `habit-writer.ts`. Respetan el periodo activo y los días de vacaciones de los hábitos.

**ADR-CL1 — Un solo ajuste de días no laborables.** Calendario, Gantt, Semana laboral y frecuencias de hábitos leen el mismo ajuste en lugar de tener cada uno su regla: cambiar la semana laboral del usuario se hace una vez. El costo asumido es que cambiarlo altera rachas y porcentajes de hábitos (aviso fijo y `Notice`).

**ADR-CL2 — Sin tope por tiempo en la proyección.** Un tope en meses costaría 365 cálculos en una diaria: se proyectan N ocurrencias por tarea. Consecuencia asumida: una diaria desaparece pasados N días y una mensual se ve hasta N meses.

**Por resolver al diseñar**
- Nombres finales de los ajustes y de la clave de cada calendario de feriados (¿identificador propio?).
- Lista de regiones de México y EE. UU. y su representación (códigos o nombres).
- Cómo se resuelve un feriado observado cuando coincide con otro feriado, y la Pascua para años fuera de un rango.

## 14. Panel de vida del Dashboard (v1.1.16 — diseño, no implementado)

> Comportamiento: [[Especificación de vistas]] §22. Mecanismo: [[Arquitectura técnica]] §31.

### 14.1 Estado de hoy

El Overview (`overview-view.ts`) guarda las casillas del panel «Filtrar widgets» (⚙️) en `localStorage`, clave `obsidian-agenda-widget-filters`, como `Record<string, boolean>` (clase del widget → visible). No está en `data.json`, así que no se sincroniza entre dispositivos.

### 14.2 Disposición nueva (en `data.json`)

```ts
// Boceto: los nombres se fijan al implementar (fase DP1)
interface DashboardTab {
  id: string;
  name: string;           // nombre elegido por el usuario
  panels: string[];       // ids de panel, en orden de dibujo
}
interface DashboardLayout {
  tabs: DashboardTab[];   // siempre al menos una; vienen 3 (p. ej. Hoy, Tareas y Hábitos)
}
```

- Un panel puede estar en más de una pestaña. El tamaño de cada tipo de panel es fijo y no se guarda (sin redimensionar ni posición libre); el registro de paneles vive en el código y asigna a cada tipo su módulo (Hoy, Tareas, Hábitos, Progreso), su tamaño y si depende de la pestaña Hábitos.
- Una sola disposición para todos los dispositivos (sin disposición aparte para móvil; en móvil, columna única).
- **Migración**: la primera vez, el estado de las casillas (`obsidian-agenda-widget-filters`) se convierte en la disposición de las 3 pestañas iniciales.
- **Pestaña Hábitos oculta** (`showHabitTab: false`): los widgets de hábitos salen de «Añadir panel» y los ya añadidos se ocultan al dibujar, **sin borrarlos de la disposición** (vuelven al reactivar la pestaña).
- **Estado de filtros por widget**: una clave por panel (`dashboard.<widget>`, p. ej. `dashboard.heatmap` para el heatmap de tareas, con prioridad, estado, área y búsqueda como la barra compartida) para que otros paneles ganen su barra o exista una barra global.
- **Heatmap reutilizable**: no tiene estado propio; recibe una métrica (`fecha → valor`), su escala de color y el texto del tooltip. Métricas de tareas: Completadas, Vencimientos, Creadas, Programadas e Inicio; de hábitos: «% cumplido».

**ADR-DB1 — Disposición en `data.json`, filtros fuera de ella.** La disposición (pestañas, paneles y orden) se sincroniza con el resto de los ajustes; el estado de filtros de cada panel es una preferencia de visualización y se guarda aparte, por clave de widget.

**Por resolver al diseñar**
- Resuelto el 2026-11-03: el estado de filtros por widget y la métrica elegida en el heatmap van en `localStorage`, como el de las vistas de tareas (por dispositivo); la disposición del Dashboard (pestañas, paneles y orden) va en `data.json` y se sincroniza.
- Si la clave `obsidian-agenda-widget-filters` se borra tras migrar.
- Catálogo exacto de paneles por módulo y la disposición por defecto de las 3 pestañas (también la de «Resumen del día» y «Revisión de la semana»).
- Formato de los ids de pestaña y de panel.

## 15. Tabla: columnas personalizables y CSV (v1.1.17 — diseño, no implementado)

> Comportamiento: [[Especificación de vistas]] §23. Mecanismo: [[Arquitectura técnica]] §32.

### 15.1 Columnas

Hoy (`src/core/task-table-columns.ts`): `TableColumnId = 'count' | 'priority' | 'status' | 'task' | 'area' | 'start' | 'scheduled' | 'due' | 'closed' | 'tags'`; las columnas de fecha (`start`, `scheduled`, `due`, `closed`) tienen `hasValue` y se ocultan solas si ninguna tarea cargada tiene valor (`getVisibleColumns()`).

| Cambio (v1.1.17) | Detalle |
|---|---|
| Cinco columnas nuevas, ocultas por defecto | Sub-área, Archivo, Hora, Duración y Recurrencia (ids propuestos: `subArea`, `file`, `time`, `duration`, `recurrence`); las 10 actuales siguen igual |
| Visibilidad y orden | guardados **por vista**: la lista ordenada de columnas visibles; «Restablecer» vuelve al estado por defecto |
| Columnas de fecha | conservan su regla de ocultarse solas si nadie tiene valor, con la opción de forzarlas |

**ADR-TC1 — El orden y la visibilidad se guardan como una lista ordenada de ids.** El estado guardado es la lista de columnas visibles en su orden; un id desconocido se descarta al leer y, sin estado guardado, se usa el orden de `TABLE_COLUMNS`. Es coherente con `getColumnVisibility()` y no exige guardar las ocultas.

### 15.2 Exportación a CSV

| Elemento | Valor |
|---|---|
| Ajuste de carpeta | propuesto `csvExportFolder` en `data.json`, por defecto `agenda-exports/` (relativa al vault) |
| Archivo | `tareas-AAAA-MM-DD-HHmm.csv` |
| Contenido | lo que se ve: tareas filtradas, columnas visibles en su orden y el orden de filas actual; con Lanes, una columna extra con el nombre del carril |
| Formato (fijo) | coma como separador, UTF-8 con BOM, fechas `AAAA-MM-DD`, campos escapados; sin ajuste de separador |
| Acciones | «Exportar CSV» (crea el archivo y muestra su ruta en un aviso) y «Copiar CSV» (portapapeles) |

El CSV no guarda ningún estado: se genera al pulsar. Los diseños de Tabla guardados con nombre y un diálogo de opciones de exportación quedan fuera por ahora.

**Por resolver al diseñar**
- Dónde se guarda el estado de columnas (clave de `localStorage` propia de la Tabla o campo dentro del estado de la vista) y si «forzar» una fecha es por columna o global.
- Si la columna `count` (numeración) se puede reordenar u ocultar.
- Qué escribe el CSV en Estado, Prioridad y Etiquetas (texto traducido, emoji o valor interno) y el idioma de los encabezados.
- Si la carpeta de exportación se crea sola cuando no existe.

## 16. Estados personalizados (v1.1.17 — diseño, no implementado)

> Comportamiento: [[Especificación de vistas]] §25. Mecanismo: [[Arquitectura técnica]] §34. Reemplaza el ADR-S2 (estados diferidos). Referencia: [Custom Statuses de Tasks](https://publish.obsidian.md/tasks/Getting+Started/Statuses/Custom+Statuses), simplificado.

### 16.1 Estado de hoy (verificado)

- `CoreTaskStatus` (`src/types/enums.ts`): `Todo = " "`, `InProgress = "/"`, `Done = "x"`, `Cancelled = "-"`, `nonTask = "~"`, `OnHold = "?"`; íconos en `CoreTaskStatusIcon` (⭕ 🛠️ ✅ ❌ 🗑️ ⏸️).
- `STATUS_OPTIONS` (`src/core/task-status-options.ts`): los 6 en orden de flujo de trabajo (Todo, InProgress, OnHold, Done, Cancelled, nonTask), con su `labelKey` (`status_todo`, `status_in_progress`, `status_on_hold`, `status_done`, `status_cancelled`, `status_non_task`); es la fuente de menú, agrupado y barra de filtros. `isTaskOpen()` cierra `Done`, `Cancelled` y `nonTask`.
- `Task.extractStatusFromHeader()` devuelve `CoreTaskStatus.Todo` para cualquier símbolo que no esté en el enum: **el símbolo original se pierde**.
- `CoreTaskStatus` aparece unas 66 veces en 10 archivos (cifra del 2026-11-02).

### 16.2 Modelo nuevo

```ts
// Boceto: los nombres se fijan al implementar (fases ES1 y ES3)
type TaskStatusType = 'TODO' | 'IN_PROGRESS' | 'ON_HOLD' | 'DONE' | 'CANCELLED' | 'NON_TASK';

interface TaskStatusDefinition {
  symbol: string;         // un carácter; clave única
  name?: string;          // los 6 base sin editar usan su traducción (labelKey)
  icon: string;
  type: TaskStatusType;   // gobierna el comportamiento
}
```

| Aspecto | Regla |
|---|---|
| Ajuste | lista ordenada de `TaskStatusDefinition` en `data.json` (nombre propuesto `taskStatuses`); por defecto, los 6 estados de §16.1, en el orden de `STATUS_OPTIONS` |
| Tipo → comportamiento | `DONE` añade `✅`, dispara la recurrencia y cuenta como cerrado; `CANCELLED` y `NON_TASK` cuentan como cerrado; `TODO`, `IN_PROGRESS` y `ON_HOLD` cuentan como abierto |
| Los 6 base | se pueden editar (nombre e icono), **no se pueden borrar**; su nombre se muestra traducido hasta que el usuario lo edite («Restablecer» lo devuelve); los estados nuevos usan el texto del usuario |
| Símbolo sin definir | se trata como Pendiente (`TODO`) pero **conserva su símbolo y nunca se reescribe**; los ajustes lo listan en «Símbolos encontrados sin definir» (p. ej. `R (3 tareas)`) con un botón para definirlo |
| Orden | el de la lista de ajustes; lo siguen Kanban, `Group: Estado` y `Lanes: Estado` (un valor por estado) y el filtro de estado de la barra, incluida la del calendario |
| Arrastrar | soltar una tarjeta en una columna de estado asigna el símbolo de ese estado |
| Importación | botón, una sola vez, desde los ajustes de Tasks: lee símbolo, nombre y tipo; ignora el «próximo símbolo» |
| Sin «próximo símbolo» | el estado se elige directo; ninguna acción del plugin lo avanza con un clic |

**ADR-ST1 — El tipo gobierna el comportamiento.** Las comparaciones por símbolo (`=== CoreTaskStatus.Done`) pasan a preguntar por el tipo del estado, de modo que cualquier símbolo definido como Hecho se comporta como Hecho. Consecuencia: es el cambio de más riesgo de v1.1.17; se mitiga probando primero que con solo los 6 estados base el comportamiento no cambia.

**ADR-ST2 — Símbolo preservado.** `ITaskState.status` está declarado como el carácter crudo (ver §3), pero hoy recibe el valor ya reducido por `extractStatusFromHeader()`. El diseño hace que guarde el símbolo real de la línea y que el escritor no lo reescriba salvo que el usuario cambie el estado; el tipo se deriva del registro.

**Por resolver al diseñar**
- Qué es el «icono» de un estado (emoji como hoy, o icono Lucide) y cómo se elige.
- Cómo se edita la lista en los ajustes con la API declarativa de Obsidian 1.13 (`getSettingDefinitions()`) y con el `display()` de respaldo.
- Qué ocurre con el filtro y la agrupación guardados (`status` guarda hoy el nombre del enum, p. ej. `InProgress`) cuando se edita o borra un estado.
- Si el símbolo permite más de un carácter o valida contra símbolos que rompen el formato de lista (`[ ]`).
