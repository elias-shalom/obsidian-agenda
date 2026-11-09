# 5. Vistas de calendario

La pestaña Calendario ofrece **seis diseños** sobre las mismas tareas: **Día**, **Semana**, **Semana laboral**, **Mes**, **Año** y **Lista**. Puedes cambiar entre ellos en cualquier momento usando la fila de botones con ícono en el encabezado del calendario — la fecha seleccionada actualmente se mantiene al cambiar, para que no pierdas tu posición.

## Conceptos compartidos

Estos aplican en todos los diseños de calendario:

- **Fecha de referencia** — la fecha actualmente seleccionada/resaltada. Es compartida entre los seis diseños: elige una fecha en una vista y seguirá seleccionada si cambias a otra.
- **Tipos de fecha** — una tarea puede aparecer en el calendario anclada a su fecha de `due` (vencimiento) 📅, `start` (inicio) 🛫, o `scheduled` (programada) ⏳ (prioridad `scheduled` > `due` > `start` cuando hay más de una). Cada tipo tiene su propio ícono (al inicio de la píldora) y el margen izquierdo de la píldora toma el color del **área** de la tarea (la primera carpeta de su nota), como los carriles y grupos de las demás vistas; una nota en la raíz del vault no tiene área y usa el color de acento por defecto. Puedes elegir qué tipos de fecha aparecen desde **Configuración ▸ Calendario** (ver [9. Configuración](08-configuration.md)) o, para la vista que estás mirando, marcando **Fecha de inicio**, **Fecha programada** o **Fecha de vencimiento** en **+ Filtro**, que manda sobre los ajustes (ver la barra de filtros más abajo). Las píldoras de las tareas son delgadas (relleno y letra pequeños) para que quepan más en cada celda de día.
- **Tareas completadas** — atenuadas por defecto; puedes ocultarlas por completo desde el mismo grupo de configuración.
- **Píldoras de tarea** — los pequeños bloques que representan una tarea. Clic para editar, doble clic para abrir la nota, clic derecho para cambiar su estado, arrastrar para reprogramarla (ver [8. Gestos e interacciones](07-gestures.md) para la lista completa de gestos).
- **Selector de fecha** — haz clic en el botón con ícono de calendario del encabezado para abrir un popover y saltar a cualquier día, mes o año; los días que ya tienen tareas se marcan con un punto.
- **Barra de filtros** — los seis diseños muestran una barra de filtros arriba del contenido, con **búsqueda** y los filtros **Prioridad**, **Estado** y **Área** (**+ Filtro**) y sus chips, más **Fecha de inicio**, **Fecha programada** y **Fecha de vencimiento** como elementos de un solo clic en **+ Filtro** que eligen qué píldoras de fecha se dibujan (marca **Fecha programada** y se ocultan las píldoras de vencimiento e inicio de las tareas; sin segundo paso: se marca para activar y se vuelve a pulsar para desactivar). Funciona como la barra de filtros de la pestaña Tareas (varios valores por filtro; ver [4. Vistas generales](03-views-overview.md#filtros-con-varios-valores)), pero sin filtros de fecha relativos, agrupado ni orden. Su configuración se recuerda por separado de la pestaña Tareas y la comparten los seis diseños, así que al cambiar de diseño se conservan tus filtros. Escribir en el cuadro de búsqueda no pierde el foco mientras el calendario se redibuja.

## Vista Día

Muestra una jerarquía de franjas horarias para un día, más una sección contraíble "Todo el día" para tareas sin hora específica (tareas de `due`, `start`, y `scheduled` sin hora).

- Las tareas programadas se renderizan como bloques con el tamaño de su duración (cuando está definida): bloques conectados a lo largo de varias horas para tareas de 60+ minutos, media celda para las más cortas.
- Las tareas que se solapan se colocan en carriles uno al lado del otro en vez de taparse entre sí.
- Arrastra el borde inferior de un bloque de tarea para redimensionar su duración (pasos de 30 minutos, mínimo 30 minutos).
- Arrastra una tarea a otra franja horaria para reprogramar su hora (se ajusta a `:00`/`:30`).
- Una barra lateral con mini-calendario siempre está visible junto a la grilla de horas (se puede contraer con la manija en su borde).

### Modo de varios días (1/3/5)

Un pequeño grupo de botones 1/3/5 (visible solo en la vista Día) permite ver más de un día a la vez:

- **1** — la vista de un solo día estándar.
- **3** — el día de referencia, un día antes y un día después.
- **5** — el día de referencia, dos días antes y dos días después.

Cada día visible es su propia columna, compartiendo la misma grilla de horas; ninguna tarea ni carril cruza entre columnas. Arrastrar una tarea a otra columna la reprograma a ese día (y, si se suelta en otra hora, también a esa hora).

## Vista Semana / Vista Semana laboral

Una grilla de 7 días (Semana) o 5 días (Semana laboral, lunes a viernes), una columna por día, con las píldoras de tarea apiladas dentro de cada día. Se aplican los mismos gestos de arrastrar y soltar, clic para editar y doble clic para crear que en el resto del calendario.

## Vista Mes

Una grilla de mes tradicional (semanas como filas, días como columnas), con cada tarea de un día mostrada como una píldora dentro de la celda de ese día. Hacer clic en el número de un día salta a la vista Día de esa fecha.

## Vista Año

Una vista anual con un mini-mes por cada mes; los días con tareas se marcan para detectar periodos ocupados de un vistazo, y hacer clic en el número de un día salta a la vista Día de esa fecha.

## Vista de Lista

Un diseño de una fila por día que muestra una **ventana continua de días** a partir de la fecha de referencia (sin alinearse al inicio de una semana). Cada fila reutiliza exactamente las mismas píldoras de tarea que Mes/Semana — no hay truncado tipo "N más", se muestran todas las tareas de ese día.

- El tamaño de la ventana es configurable desde **Configuración ▸ Calendario ▸ Vista de lista: días a mostrar** (mínimo 7, máximo 14, por defecto 14).
- Los botones de navegación ◀ / ▶ desplazan toda la ventana esa cantidad de días a la vez (no día a día).
- Hacer clic en una fila selecciona/resalta ese día sin mover la ventana; la ventana solo se recentra si saltas a una fecha fuera de ella (por ejemplo, mediante el selector de fecha).

## Siguientes pasos

- [6. Seguimiento de hábitos](05-habit-tracker.md) para el módulo independiente de seguimiento de hábitos.
- [8. Gestos e interacciones](07-gestures.md) para la referencia completa de gestos.
- [9. Configuración](08-configuration.md) para todos los ajustes relacionados con el calendario.
