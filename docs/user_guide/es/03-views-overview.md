# 4. Vistas generales

Este capítulo cubre las vistas de tareas que no son calendarios: la Vista general, la pestaña Tareas (Lista y Tabla), Kanban y Gantt. Las vistas de calendario se cubren en su propio capítulo ([5. Vistas de calendario](04-calendar-views.md)), y el módulo de Seguimiento de hábitos en [6. Seguimiento de hábitos](05-habit-tracker.md).

## Vista general (Overview)

Un resumen estilo panel de tus tareas, pensado para ser lo primero que revisas. Incluye:

- Métricas y estadísticas clave sobre tus tareas (totales, cumplimiento, cantidad de vencidas, etc.).
- Acceso rápido a las próximas fechas límite.
- Un desglose de tareas por proyecto/carpeta.
- Tareas vencidas resaltadas para que sean visibles.
- Widgets personalizables.

## La pestaña Tareas: Lista y Tabla

Las vistas Lista y Tabla comparten una sola pestaña, **Tareas**. Un conmutador **Lista | Tabla** a la derecha de la barra, justo a la izquierda del cuadro de búsqueda, cambia de modo, y todo lo que ajustes — búsqueda, filtros, agrupado y orden — se conserva y se recuerda, también al volver de editar una tarea. La pestaña se abre en el último modo que usaste. Si ocultas uno de los dos en **Configuración ▸ Visibilidad de pestañas**, el conmutador desaparece y la pestaña abre el que queda.

Ambas vistas se actualizan solas poco después de un cambio en tus notas, conservando el scroll, los filtros y los grupos plegados (ver [Actualización automática](#actualización-automática)).

### Barra de filtros

- **Búsqueda** — escribe para filtrar por la descripción de la tarea. Queda a la derecha de la barra, con el conmutador Lista | Tabla justo a su izquierda (solo en Lista y Tabla), y pasa a su propia línea en ventanas estrechas.
- **+ Filtro** — abre un menú con los tipos de filtro: **Prioridad**, **Estado**, **Área**, **Fecha de inicio**, **Fecha programada** y **Fecha de vencimiento**. Prioridad, Estado y Área abren después un pequeño popover con casillas (ver más abajo); los tipos de fecha piden un único valor en un menú.
- **Filas**, **Grupo** y **Orden** — tres chips junto a **+ Filtro**, con el mismo aspecto: `[+ Filtro] [Filas] [Grupo] [Orden]`. Cada vista muestra los que ofrece. Haz clic en un chip para abrir el mismo tipo de menú que **+ Filtro**, con la opción actual marcada; al elegir una opción se aplica. El chip **Orden** tiene una flecha (↑/↓) dentro: haz clic en ella para invertir el sentido.
- **Chips** — cada filtro activo aparece como un chip en una segunda fila. Quita uno con su ×, o usa **Limpiar** para quitarlos todos (el texto de búsqueda se conserva).

#### Filtros con varios valores

Prioridad, Estado y Área aceptan **varios valores a la vez**. Tras elegir el tipo en **+ Filtro**, se abre un popover con casillas que sigue abierto mientras marcas valores; ciérralo haciendo clic fuera o pulsando Esc. Dentro de un mismo tipo de filtro los valores se combinan con «o» (por ejemplo, prioridad Normal **o** Media); los filtros de tipos distintos se combinan con «y». El chip muestra el nombre del valor cuando hay uno solo, y únicamente el número cuando hay varios (por ejemplo **Estado: 2**); pasa el cursor sobre él para ver todos los valores en un tooltip. Los filtros de fecha admiten un solo valor.

Los tres filtros de fecha ofrecen los mismos valores, comparados por día: **Con fecha**, **Vencidas** (o **Pasadas** en Inicio y Programada), **Hoy**, **Próximos 7 días**, **Futuras** y **Sin fecha**. En Vencimiento, *Vencidas* cuenta solo tareas abiertas: una tarea hecha o cancelada nunca está vencida.

### Áreas y sub-áreas

El **área** de una tarea es la primera carpeta de la nota donde está, y su **sub-área** es el resto de la ruta de carpetas, a cualquier profundidad (`Trabajo/Clientes/Acme.md` → área `Trabajo`, sub-área `Clientes`). Las notas en la raíz de la bóveda pertenecen a **Sin área**. No hay nada que configurar: las áreas siguen tus carpetas.

- En **+ Filtro ▸ Área**, marca una o varias áreas; marcar un área selecciona todas sus tareas, y también puedes marcar sub-áreas concretas. Gana la opción más específica: un área marcada junto con una de sus sub-áreas filtra por esa sub-área. La lista incluye también una entrada para las notas que están directamente en la carpeta de un área y una entrada **Raíz** para las notas fuera de cualquier carpeta.
- Agrupa por **Área y sub-área** para obtener un árbol con cabeceras de color. Las tareas que están directamente en la carpeta de un área (o sub-área) que también tiene sub-áreas se muestran al final, bajo **Sin sub-área**.

### Agrupado y orden

- **Grupo**: Ninguno, Área y sub (el árbol de áreas y sub-áreas), Carpeta (un grupo plano por área), Estado, Prioridad, Etiquetas, Fecha de inicio, Fecha programada o Fecha de vencimiento. Los tres agrupados por fecha agrupan por día, y las tareas sin esa fecha van al final. Las cabeceras de grupo se contraen y se expanden, y cada una recuerda su estado. La Lista agrupa por área por defecto y la Tabla no agrupa por defecto.
- **Orden**: Prioridad, Estado, Tarea, Área, Inicio, Programada, Vencimiento, Cerrada o Etiquetas, con la flecha dentro del chip para invertir el sentido. En la Tabla también puedes hacer clic en un encabezado de columna. Al ordenar por una fecha, las tareas sin esa fecha van al final.

### Filas (Lanes)

El chip **Filas** divide una vista en varios widgets independientes, uno por valor de un campo: **Área**, **Sub-área**, **Estado**, **Prioridad**, **Etiqueta**, **Carpeta** o **Archivo**. Por defecto es **Ninguno** y la vista funciona como antes. **Grupo** sigue funcionando dentro de cada fila.

- **Por vista** — en Kanban cada fila es su propio tablero con las mismas columnas; en Lista cada fila es una sección; en Tabla cada fila es su propio bloque con su fila de título y el encabezado de columnas repetido, con las mismas columnas y anchos en todas las filas y un espacio entre ellas (el encabezado repetido también ordena); en Gantt cada fila es su propio diagrama con la cabecera de fechas repetida, y todas comparten una ventana y un zoom.
- **Plegar** — pliega una fila con el ▼ de su cabecera; la elección se recuerda. Las filas de Área y Sub-área muestran el color del área en su cabecera.
- **Qué filas aparecen** — las filas vacías no se muestran. **Raíz** (notas fuera de cualquier carpeta) y **Sin etiqueta** van siempre al final. Por Etiqueta, una tarea con varias etiquetas aparece en cada una de sus filas, así que los totales pueden sumar más que el número de tareas. Las filas de Estado y Prioridad siguen su orden natural; las demás, el orden alfabético.
- **Orden de las operaciones** — la búsqueda, los filtros y el orden se aplican antes de dividir; el orden ordena las tareas dentro de cada fila.
- **Solo lectura** — las filas son para leer: en Kanban no puedes arrastrar una tarjeta a una columna de otra fila.
- **Filas y Grupo no pueden usar el mismo campo** (Área, Sub-área y Carpeta cuentan como el mismo campo; también Estado con Estado, Prioridad con Prioridad y Etiqueta con Etiquetas). En Kanban la opción que choca no se puede elegir; en Lista, Tabla y Gantt sí, y el otro chip pasa solo a Ninguno.

## Vista de lista (List)

Una lista compacta de tareas, ideal para trabajar una por una sobre las tareas de tu bóveda.

- Filas compactas con indicadores de prioridad; cada tarea muestra su fecha de inicio (🛫), la programada (⏳, con su hora) y la de vencimiento (📅) cuando las tiene, y la ruta de la nota cuando el agrupado no la indica ya.
- Agrupada por área y sub-área por defecto; cualquier otro agrupado está en el chip **Grupo**. Con **Filas**, cada fila es una sección de la lista.
- Haz clic en una tarea para editarla en el modal; doble clic abre su nota; clic derecho cambia su estado (ver [8. Gestos e interacciones](07-gestures.md)).

## Vista de tabla (Table)

Una cuadrícula estilo hoja de cálculo, ideal cuando quieres revisar, ordenar y comparar muchas tareas de un vistazo.

- Columnas: prioridad, estado, tarea (con la ruta de la nota debajo), área, **Inicio**, **Programada**, **Vencimiento**, **Cerrada** y etiquetas. Cada fecha aparece con su ícono: Inicio muestra debajo la fecha de creación (➕), Programada muestra su hora y duración, y Cerrada muestra la fecha de hecha (✅) o de cancelada (❌). Una columna de fecha se oculta cuando ninguna de tus tareas tiene esa fecha, y las fechas vencidas o de hoy de tareas abiertas se resaltan.
- El encabezado de la primera columna muestra el total de tareas visibles.
- Columnas ordenables y redimensionables — haz clic en un encabezado de columna para ordenar, vuelve a hacer clic para invertir el orden. Las columnas también se reducen para caber en el ancho de la ventana o del dispositivo, hasta un ancho mínimo, así que en un teléfono puede seguir habiendo scroll horizontal.
- Entrada y edición rápida de atributos de tarea directamente en la cuadrícula.
- Indicadores de estado y prioridad, estilo compacto de fecha/etiquetas, formato condicional.
- Con **Filas**, cada fila es su propio bloque con su fila de título y el encabezado de columnas repetido (que también ordena), con las mismas columnas y anchos en todas las filas.

## Vista Kanban

Un tablero donde cada tarjeta es una tarea real de tus notas: mover una tarjeta reescribe la línea de la tarea en su nota. Tiene su propia pestaña y la misma barra de filtros que la pestaña Tareas (búsqueda, **+ Filtro**, **Filas**, **Grupo** y **Orden**), que se recuerda por separado.

- **Columnas**: elige el agrupado con el chip **Grupo** — **Estado** (el predeterminado, una columna por estado), **Prioridad**, **Etiquetas** o **Carpeta** (el área). Las columnas de estado y de prioridad aparecen siempre, aunque estén vacías, porque son los destinos donde se sueltan las tarjetas.
- **Arrastra una tarjeta** a otra columna para cambiar su estado (pasarla a Hecho añade la fecha ✅, sacarla de Hecho la quita, y completar una tarea recurrente crea su siguiente ocurrencia) o su prioridad (la columna Normal quita el ícono de prioridad). Las columnas de etiqueta y de carpeta son de solo lectura.
- **Plegar una columna**: haz clic en su encabezado para reducirla a una barra delgada con su nombre y el número de tareas, y otro clic para abrirla. Las columnas vacías empiezan plegadas y solo se recuerda lo que cambias a mano. Una columna plegada sigue aceptando una tarjeta soltada y se abre sola al recibirla.
- **Altura**: una columna crece con sus tarjetas hasta la altura visible del panel; si la supera, las tarjetas se desplazan dentro de la columna y el encabezado queda fijo.
- **Filas**: con un valor de **Filas** distinto de Ninguno, cada fila es su propio tablero con las mismas columnas. No se pueden arrastrar tarjetas a una columna de otra fila, y la opción que choca con las columnas actuales no se puede elegir (por ejemplo, Filas por Estado mientras agrupas por Estado).
- Haz clic en una tarjeta para editarla, doble clic para abrir su nota y clic derecho para cambiar su estado.

## Vista Gantt

Una línea de tiempo con una fila por tarea, para ver cómo se reparte tu trabajo en días y semanas. Tiene su propia pestaña y la misma barra de filtros que la vista Kanban. Por defecto, las filas se agrupan por **área** y **sub-área** (plegables, y cada grupo recuerda su estado); las notas fuera de cualquier carpeta van a su propio grupo. El chip **Grupo** lo cambia: **Ninguno** (una lista plana sin cabeceras), **Área** (el predeterminado), **Estado** o **Prioridad**.

- **Qué se dibuja**: una tarea con dos o más de 🛫 inicio, ⏳ programada y 📅 vencimiento es una **barra** desde su inicio (🛫, o ⏳ si no hay) hasta su fin (📅, o ⏳ si no hay), con una pequeña muesca para ⏳ cuando existen las tres. Una tarea con una sola fecha es un **hito** (un rombo). Las tareas sin ninguna fecha esperan bajo el diagrama, en un grupo plegable **Tareas sin fecha**, plegado por defecto. Un rango escrito al revés (fin antes del inicio) se dibuja como un hito con una advertencia ⚠.
- **Zoom y navegación**: botones de 7, 14 o 21 días o un mes natural; ◀ ▶ mueven la ventana, **Hoy** salta al día de hoy, y las pestañas de mes y las flechas del año saltan a otro mes. La ventana sigue la fecha de referencia compartida con el calendario, y las ventanas de 7, 14 y 21 días empiezan en el primer día de la semana configurado. Una barra que sale de la ventana se corta en su borde.
- **Leer el diagrama**: finas líneas verticales marcan cada día (más marcadas al inicio de cada semana), los fines de semana se sombrean, una línea roja marca hoy y las bandas de semana muestran su número. Cada nombre muestra el ícono de estado, el de prioridad y el título; 🔗 marca las tareas con dependencias (pasa el cursor para verlas). Pasa el cursor sobre una barra para ver todas las fechas de la tarea.
- **Editar fechas**: arrastra una barra para mover todas sus fechas. Arrastra su borde izquierdo o derecho para cambiar solo el campo que muestra ese borde — un tooltip te dice cuál (🛫 inicio, ⏳ programada o 📅 vencimiento) — y una barra nunca termina antes de empezar. Un hito se puede arrastrar para moverlo, y la manija a su lado lo estira hasta convertirlo en barra creando la siguiente fecha (inicio → programada → vencimiento; un hito con solo vencimiento crea una fecha de inicio, a su izquierda). Las fechas de creación y de hecha, 🆔 y ⛔ no se tocan nunca, y ⏳ conserva su hora y duración.
- Haz clic en una fila para editar la tarea, doble clic para abrir su nota y clic derecho para cambiar su estado.
- **Filas**: cada fila es su propio diagrama con la cabecera de fechas repetida, y todas comparten una ventana y un zoom. **Tareas sin fecha** sigue siendo una única lista al final, compartida por todas las filas.

## Actualización automática

Las vistas se actualizan solas medio segundo después de un cambio en tus notas, así que no hace falta cambiar de pestaña para ver una edición hecha en otro panel. Guardar una nota sin tocar ninguna tarea no redibuja nada. Se conservan el scroll, la búsqueda, los filtros y los grupos plegados, y la actualización espera mientras haya un modal, un menú, un selector de fecha, un arrastre o un campo de texto en uso. Una vista en una pestaña en segundo plano se actualiza al volver a ella. A medianoche las vistas pasan al día nuevo (las marcas de «hoy», la Rutina de hábitos) sin que hagas nada.

## Siguientes pasos

- [5. Vistas de calendario](04-calendar-views.md) para los seis diseños de calendario.
- [9. Configuración](08-configuration.md) para personalizar qué pestañas están visibles y cómo se comportan las vistas.
