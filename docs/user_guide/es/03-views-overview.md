# 4. Vistas generales

Este capítulo cubre las tres vistas de tareas que no son de calendario. Las vistas de calendario se cubren en su propio capítulo ([5. Vistas de calendario](04-calendar-views.md)), y el módulo de Seguimiento de hábitos en [6. Seguimiento de hábitos](05-habit-tracker.md).

## Vista general (Overview)

Un resumen estilo panel de tus tareas, pensado para ser lo primero que revisas. Incluye:

- Métricas y estadísticas clave sobre tus tareas (totales, cumplimiento, cantidad de vencidas, etc.).
- Acceso rápido a las próximas fechas límite.
- Un desglose de tareas por proyecto/carpeta.
- Tareas vencidas resaltadas para que sean visibles.
- Widgets personalizables.

## La pestaña Tareas: Lista y Tabla

Las vistas Lista y Tabla comparten una sola pestaña, **Tareas**. Un conmutador **Lista | Tabla** a la izquierda de la barra cambia de modo, y todo lo que ajustes — búsqueda, filtros, agrupado y orden — se conserva y se recuerda, también al volver de editar una tarea. La pestaña se abre en el último modo que usaste. Si ocultas uno de los dos en **Configuración ▸ Visibilidad de pestañas**, el conmutador desaparece y la pestaña abre el que queda.

Ambas vistas se actualizan solas poco después de un cambio en tus notas, conservando el scroll, los filtros y los grupos plegados (ver [Actualización automática](#actualización-automática)).

### Barra de filtros

- **Búsqueda** — escribe para filtrar por la descripción de la tarea. Queda a la derecha de la barra y pasa a su propia línea en ventanas estrechas.
- **+ Filtro** — abre menús por pasos: primero el tipo y luego el valor. Los tipos son **Prioridad**, **Estado**, **Área** (después pide una sub-área), **Fecha de inicio**, **Fecha programada** y **Fecha de vencimiento**.
- **Chips** — cada filtro activo aparece como un chip en una segunda fila. Quita uno con su ×, o usa **Limpiar** para quitarlos todos (el texto de búsqueda se conserva).
- **Agrupar por** y **Ordenar por** — dos selectores, más un conmutador ascendente/descendente.

Los tres filtros de fecha ofrecen los mismos valores, comparados por día: **Con fecha**, **Vencidas** (o **Pasadas** en Inicio y Programada), **Hoy**, **Próximos 7 días**, **Futuras** y **Sin fecha**. En Vencimiento, *Vencidas* cuenta solo tareas abiertas: una tarea hecha o cancelada nunca está vencida. Los filtros de tipos distintos se combinan con «y».

### Áreas y sub-áreas

El **área** de una tarea es la primera carpeta de la nota donde está, y su **sub-área** es el resto de la ruta de carpetas, a cualquier profundidad (`Trabajo/Clientes/Acme.md` → área `Trabajo`, sub-área `Clientes`). Las notas en la raíz de la bóveda pertenecen a **Sin área**. No hay nada que configurar: las áreas siguen tus carpetas.

- Elige un área en **+ Filtro ▸ Área** y, si quieres, una de sus sub-áreas.
- Agrupa por **Área y sub-área** para obtener un árbol con cabeceras de color. Las tareas que están directamente en la carpeta de un área (o sub-área) que también tiene sub-áreas se muestran al final, bajo **Sin sub-área**.

### Agrupado y orden

- **Agrupar por**: Sin agrupar, Área y sub-área, Carpeta (un grupo plano por área), Estado, Prioridad, Etiquetas o Fecha de vencimiento. Las cabeceras de grupo se contraen y se expanden, y cada una recuerda su estado. La Lista agrupa por área por defecto y la Tabla no agrupa por defecto.
- **Ordenar por**: Prioridad, Estado, Tarea, Área, Inicio, Programada, Vencimiento, Cerrada o Etiquetas. En la Tabla también puedes hacer clic en un encabezado de columna. Al ordenar por una fecha, las tareas sin esa fecha van al final.

## Vista de lista (List)

Una lista compacta de tareas, ideal para trabajar una por una sobre las tareas de tu bóveda.

- Filas compactas con indicadores de prioridad; cada tarea muestra su fecha de inicio (🛫), la programada (⏳, con su hora) y la de vencimiento (📅) cuando las tiene, y la ruta de la nota cuando el agrupado no la indica ya.
- Agrupada por área y sub-área por defecto; cualquier otro agrupado está en el selector.
- Haz clic en una tarea para editarla en el modal; doble clic abre su nota; clic derecho cambia su estado (ver [8. Gestos e interacciones](07-gestures.md)).

## Vista de tabla (Table)

Una cuadrícula estilo hoja de cálculo, ideal cuando quieres revisar, ordenar y comparar muchas tareas de un vistazo.

- Columnas: prioridad, estado, tarea (con la ruta de la nota debajo), área, **Inicio**, **Programada**, **Vencimiento**, **Cerrada** y etiquetas. Cada fecha aparece con su ícono: Inicio muestra debajo la fecha de creación (➕), Programada muestra su hora y duración, y Cerrada muestra la fecha de hecha (✅) o de cancelada (❌). Una columna de fecha se oculta cuando ninguna de tus tareas tiene esa fecha, y las fechas vencidas o de hoy de tareas abiertas se resaltan.
- El encabezado de la primera columna muestra el total de tareas visibles.
- Columnas ordenables y redimensionables — haz clic en un encabezado de columna para ordenar, vuelve a hacer clic para invertir el orden. Las columnas también se reducen para caber en el ancho de la ventana o del dispositivo, hasta un ancho mínimo, así que en un teléfono puede seguir habiendo scroll horizontal.
- Entrada y edición rápida de atributos de tarea directamente en la cuadrícula.
- Indicadores de estado y prioridad, estilo compacto de fecha/etiquetas, formato condicional.

## Actualización automática

Las vistas se actualizan solas medio segundo después de un cambio en tus notas, así que no hace falta cambiar de pestaña para ver una edición hecha en otro panel. Guardar una nota sin tocar ninguna tarea no redibuja nada. Se conservan el scroll, la búsqueda, los filtros y los grupos plegados, y la actualización espera mientras haya un modal, un menú, un selector de fecha, un arrastre o un campo de texto en uso. Una vista en una pestaña en segundo plano se actualiza al volver a ella. A medianoche las vistas pasan al día nuevo (las marcas de «hoy», la Rutina de hábitos) sin que hagas nada.

## Siguientes pasos

- [5. Vistas de calendario](04-calendar-views.md) para los seis diseños de calendario.
- [9. Configuración](08-configuration.md) para personalizar qué pestañas están visibles y cómo se comportan las vistas.
