# 9. Configuración

Accede a todos los ajustes del plugin desde **Configuración de Obsidian → Plugins de la comunidad → Agenda Tasks**. El panel tiene tres pestañas arriba —**General**, **Calendario** y **Hábitos**— y cada una muestra solo sus ajustes, como se listan a continuación.

## Configuración general

- **Mostrar novedades al actualizar** — abre una ventana con las novedades la primera vez que inicias Obsidian tras actualizar el plugin (activado por defecto). Aparece una sola vez por actualización y, si saltaste varias versiones, las muestra todas.

## Visibilidad de pestañas

- Mostrar/ocultar cada pestaña principal de forma independiente: **Vista general**, **Tareas**, **Kanban**, **Gantt**, **Calendario** y **Hábitos**. **Mostrar pestaña Tareas** sustituye a los antiguos interruptores de Lista y Tabla: el conmutador **Lista | Tabla** dentro de la pestaña siempre ofrece los dos modos (si antes habías ocultado solo uno, ahora ves los dos).
- **Mostrar pestaña Hábitos** oculta toda la pestaña de Hábitos; aparece solo cuando está activada y hay al menos una vista de hábitos activa.
- Las pestañas del Seguimiento de hábitos tienen su propio grupo (ver **Hábitos** más abajo).

## Calendario

- **La semana empieza el** — qué día de la semana tratan las vistas de calendario como el primero de la semana.
- **Mostrar fechas de vencimiento/inicio/programada** — elige de forma independiente qué tipos de fecha aparecen en las vistas de calendario, cada uno con su propio ícono y color (ver [7. Formato de tareas y metadatos](06-task-format.md)).
- **Mostrar tareas completadas** — mantén las tareas completadas atenuadas en el calendario, u ocúltalas por completo.
- **Vista de lista: días a mostrar** — el tamaño de la ventana continua para la vista de Lista del calendario (mínimo 7, máximo 14, por defecto 14). Ver [5. Vistas de calendario](04-calendar-views.md).
- **Recurrentes proyectadas** — cuántas ocurrencias futuras de cada tarea recurrente (🔁) muestra el calendario (de 0 a 50, por defecto 10; 0 lo desactiva). Aparecen en las vistas Mes, Semana, Semana laboral, Día y Lista como píldoras de solo contorno (sin relleno, borde discontinuo y título en cursiva) con la insignia 🔁 al inicio, para no confundirlas con las tareas terminadas (que siguen rellenas, atenuadas y tachadas). Son de solo lectura: no se arrastran, no se redimensionan, no se completan ni cambian de estado; el clic abre la tarea real y el doble clic su nota. Al completar la tarea real se escribe la siguiente ocurrencia como siempre (la copia que ocupaba su lugar pasa a ser la línea nueva) y una tarea diaria deja de dibujarse pasados N días. Las tareas que terminan en `when done` no se proyectan y los filtros del calendario también se aplican a las copias.
- **Días no laborables** — una casilla por día, de lunes a domingo (sábado y domingo por defecto). Los días marcados se sombrean en las vistas Mes, Semana y Lista del calendario y en el Gantt; la Semana laboral los oculta. También son los días de las frecuencias de hábitos «Fin de semana» y «Lunes a viernes» y de las recurrencias `every weekend` y `every weekday`, así que cambiarlos modifica las rachas y los porcentajes de los hábitos y las fechas de esas tareas recurrentes. Debe quedar al menos un día laborable y uno no laborable; la casilla que rompería esa regla vuelve a su estado y un aviso lo explica.
- **Calendarios de feriados** — una lista de calendarios de feriados (ninguno está activo por defecto). Cada uno tiene un país (México o Estados Unidos), una región (estado) opcional que suma los feriados de ese estado a los nacionales, las casillas **Oficiales** y **No oficiales** (el Día de las Madres, el Día de Muertos y Halloween son no oficiales) y un color; **Añadir calendario de feriados** crea uno y el botón de la papelera lo quita. Los feriados se dibujan con un tinte tenue de ese color: una etiqueta con el nombre en Mes, Semana, Semana laboral y Lista, bajo la fecha en Día, un punto con tooltip en Año y una columna tintada en el Gantt. Son solo visuales: no afectan a la Semana laboral, las rachas de hábitos ni las tareas.

## Hábitos

- **Ruta de la carpeta de hábitos** — la carpeta de la bóveda (analizada recursivamente) que contiene las notas de hábitos. Por defecto: `daily plan/daily routine/habit`. Bajo el campo, Ajustes indica si la carpeta existe (una carpeta inexistente no impide guardar). Si no existe cuando creas tu primer hábito, se te ofrece crearla, con la ruta editable.
- **Días a mostrar en la cuadrícula** — cantidad de columnas de día renderizadas en la Cuadrícula de hábitos y en los gráficos de historial.
- **Mostrar rachas** — activa/desactiva los indicadores y conteos de racha.
- **Mostrar momento del día para hábitos de un solo momento** — muestra una pequeña insignia localizada de momento del día junto al nombre del hábito en Cuadrícula y Semanal (activado por defecto; las filas con varios momentos siempre muestran la insignia).
- **Tolerancia máxima por defecto (días)** — tolerancia por defecto antes de que una racha se rompa, usada como valor inicial al crear un hábito nuevo.
- **Prioridad por defecto** — valor de prioridad inicial (1–5) para hábitos nuevos.
- **Color por defecto** y **visibilidad del campo de sub-área** — otros valores por defecto del Habit Creator.

### Visibilidad de pestañas de hábitos

- Mostrar/ocultar cada vista del Seguimiento de hábitos de forma independiente: **Cuadrícula**, **Dashboard**, **Rutina diaria**, **Semanal**, **Tabla**.
- Una acción manual de **actualizar** para reconstruir la caché de hábitos, si una vista se ve desactualizada.

## Opciones avanzadas / comportamiento del Task Modal

- **Atajos de teclado** — personalizables, incluyendo el comando para insertar un campo de tarea desde el editor sin abrir un modal (ver [7. Formato de tareas y metadatos](06-task-format.md)).
- **Modo del Task Modal** — la sección "Más campos" (avanzada) del modal de crear/editar tarea recuerda si la dejaste expandida o contraída, por dispositivo.

## Siguiente paso

[10. Preguntas frecuentes y soporte](09-faq-support.md) para preguntas comunes y dónde obtener ayuda si algo no funciona como esperas.
