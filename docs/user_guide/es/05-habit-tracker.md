# 6. Seguimiento de hábitos

El **Seguimiento de hábitos** es un módulo separado de las tareas, enfocado en hábitos recurrentes que quieres seguir día a día (por ejemplo, "hacer ejercicio", "leer 20 minutos", "beber agua"). Vive en su propia pestaña **Hábitos**.

## Qué es una nota de hábito

Cada hábito está respaldado por una nota Markdown dentro de una carpeta configurable de la bóveda (por defecto: `daily plan/daily routine/habit`, modificable desde **Configuración ▸ Hábitos ▸ Ruta de la carpeta de hábitos**). El frontmatter de la nota almacena los metadatos del hábito (nombre, descripción, horario, prioridad, etc.) y su historial de cumplimiento.

No necesitas crear ni editar estas notas a mano — el modal **Habit Creator** lo hace por ti.

## Crear y editar un hábito

Abre el Habit Creator (desde cualquier vista de Seguimiento de hábitos, mediante su acción de "crear", o haciendo clic en un hábito existente para editarlo) para definir:

- **Nombre** y **descripción**.
- **Hora** — un dial circular para elegir una hora del día.
- **Momento(s) del día** — mañana/tarde/noche/etc.; un hábito puede programarse más de una vez al día en distintos momentos.
- **Frecuencia** — todos los días, semana laboral, fin de semana, o días específicos de la semana (las casillas y el menú desplegable de frecuencia se sincronizan entre sí).
- **Prioridad** — un control deslizante de 1 a 5, usado para los porcentajes de cumplimiento ponderado en el Dashboard.
- **Tolerancia máxima (max gap)** — un control deslizante que define cuántos días seguidos sin cumplir tolera una racha antes de romperse.
- **Área** — un campo de texto libre (no una lista fija), sugerido a partir de las carpetas raíz de tu bóveda.
- **Archivos relacionados** — wikilinks opcionales a notas de apoyo, añadidos y quitados de forma individual.
- **Periodo activo** — fechas opcionales **Activo desde** y **Activo hasta** (cada una con un botón para vaciarla). Los días fuera de ese periodo son neutrales para el hábito, como los días en que no toca: no rompen ni suman a una racha y no cuentan en sus porcentajes. Sin fechas el hábito se comporta como antes.
- **Activo/Inactivo** — un interruptor para pausar un hábito sin eliminarlo. Al **apagarlo** se rellena **Activo hasta** con la fecha de hoy (si ya habías puesto una fecha anterior a hoy, se conserva) y al **encenderlo** se vacía, de modo que desactivar un hábito no cambia los porcentajes de las fechas pasadas en el Dashboard y el heatmap: el hábito sigue contando hasta ese día. Los días entre desactivar y reactivar cuentan como no cumplidos.

## Las cinco vistas

### Cuadrícula de hábitos (Grid)

Una cuadrícula día por día estilo GitHub: las filas son hábitos (o una fila por ocurrencia, para hábitos con varios momentos del día), las columnas son días. Haz clic en una celda para alternar ese día entre cumplido/no cumplido. Las rachas cumplidas se representan como una única "píldora" fusionada, con un orden configurable (alfabético, área, momento del día, prioridad, racha, % de cumplimiento).

### Rutina diaria

Los hábitos de hoy (o de cualquier día navegable), agrupados por momento del día o por área (alternable), ordenados por prioridad, con barras de progreso ponderadas. Cada hábito tiene acciones rápidas para abrir su nota o abrir el Habit Editor. Los grupos se pueden contraer de forma independiente, y el estado contraído se recuerda.

### Dashboard de hábitos (vista por defecto)

El resumen de un vistazo:

- Porcentaje de cumplimiento de hoy, crudo y ponderado por prioridad.
- Racha actual y mejor racha.
- Desgloses lado a lado por área y por momento del día.
- Un gráfico de historial de 30 días.
- Un mapa de calor anual estilo GitHub, navegable por año.

### Vista Semanal

Una matriz de 7 días (hábito × día de la semana) que comparte el mismo lenguaje visual que la Cuadrícula (píldoras, círculos, orden). Los días fuera de la frecuencia de un hábito aparecen atenuados.

### Tabla/Lista de hábitos

Un catálogo ordenable de todos los hábitos (incluyendo los inactivos, mostrados en modo solo lectura) con columnas de área, enlace a archivo relacionado, frecuencia, prioridad, momento del día, hora y racha.

## Rachas y tolerancia

Una racha cuenta ocurrencias cumplidas consecutivas. El ajuste de **tolerancia máxima (max gap)** controla cuántos días seguidos sin programar/sin cumplir se siguen tolerando antes de que la racha se reinicie — útil para hábitos que no están programados todos los días. Un hábito cumplido en un día que desde entonces se quitó de su frecuencia muestra un marcador distintivo de "conflicto" en vez de romper la racha silenciosamente.

## Vacaciones

Define periodos de vacaciones en **Ajustes → Agenda Tasks → Hábitos → Vacaciones** (cada periodo tiene una fecha de inicio, una de fin y un nombre opcional, como «Navidad»), o pulsa el botón **🌴** de la barra del Seguimiento de hábitos para ir directamente. Aplican a **todos** los hábitos:

- Un día de vacaciones que **no** marcaste es neutral: no rompe la racha, no cuenta como incumplido y no baja ningún porcentaje.
- Un día de vacaciones que **sí** marcaste cuenta, pero solo para ese hábito: suma a su racha y entra en su porcentaje.
- La Cuadrícula y la vista Semanal muestran los días de vacaciones atenuados con un icono 🌴 (el tooltip trae el nombre del periodo), y el heatmap anual dibuja con rayas diagonales los días de vacaciones sin marcas en vez de un 0 %. Puedes marcar cualquier celda atenuada.

Si el botón no puede abrir los ajustes (usa una API de Obsidian no documentada), un aviso indica la ruta para llegar a mano.

## Siguientes pasos

- [8. Gestos e interacciones](07-gestures.md) para la referencia de gestos del Seguimiento de hábitos.
- [9. Configuración](08-configuration.md) para todos los ajustes del Seguimiento de hábitos.
