# 8. Gestos e interacciones

Una referencia rápida de cada clic, doble clic, clic derecho y arrastre en el plugin.

## Vistas de calendario (Día / Semana / Semana laboral / Mes / Año / Lista)

| Gesto | Dónde | Resultado |
|---|---|---|
| Clic | Una píldora de tarea | Abre el modal **Editar tarea**, prellenado con los datos de esa tarea |
| Doble clic | Una píldora de tarea | Abre la nota subyacente, con el cursor en esa línea |
| Clic derecho | Una píldora de tarea | Abre un menú contextual para cambiar el estado de la tarea |
| Clic | Un botón con ícono de tipo de vista (encabezado) | Cambia a esa vista de calendario (Día/Semana/Semana laboral/Mes/Año/Lista), manteniendo la fecha de referencia actual |
| Clic | Una celda/fila de día (Mes/Semana/Semana laboral/Año/Lista) | Selecciona y resalta esa fecha como la fecha de referencia compartida |
| Clic | El número de un día (Mes/Semana/Semana laboral/Año/Lista) | Salta a la **vista Día** de esa fecha |
| Doble clic | Espacio vacío en una celda/fila de día | Abre **Crear tarea** prellenado con esa fecha |
| Clic | El disparador del selector de fecha (encabezado, cualquier vista de calendario) | Abre un popover para saltar a cualquier día, mes o año |
| Clic | Una fecha en el selector de fecha (popover o barra lateral de la vista Día) | Salta a esa fecha, actualizando la fecha de referencia compartida |
| Clic | Los botones de cantidad de días 1/3/5 (vista Día) | Muestra esa cantidad de columnas de día a la vez, centradas en el día de referencia |
| Arrastrar | Una píldora de tarea a otro día/columna | Reprograma la tarea a ese día (mueve la fecha que la ancla: `scheduled` > `due` > `start`) |
| Arrastrar | Una píldora de tarea a otra franja horaria (vista Día) | Cambia la hora programada de la tarea, ajustándose a la media hora exacta (`:00`/`:30`) bajo el puntero |
| Arrastrar | El borde inferior de un bloque de tarea (vista Día) | Redimensiona la duración de la tarea en pasos de 30 minutos (mínimo 30 minutos) |
| Doble clic | Espacio vacío en una franja horaria o en la sección "Todo el día" (vista Día) | Abre **Crear tarea** prellenado con esa fecha/hora |
| Clic | El encabezado de la sección "Todo el día" (vista Día) | Expande/contrae la sección de vencimiento/inicio |
| Clic | La manija de contraer la barra lateral (vista Día) | Contrae/expande la barra lateral del mini-calendario |
| Clic | ◀ / ▶ (vista Lista) | Desplaza toda la ventana mostrada la cantidad de días configurada |

## Lista, Tabla y Vista general

| Gesto | Dónde | Resultado |
|---|---|---|
| Clic | Una fila/elemento de tarea (vista Lista o Tabla) | Abre el modal **Editar tarea**, prellenado con los datos de esa tarea |
| Doble clic | Una fila/elemento de tarea | Abre la nota subyacente, con el cursor en esa línea |
| Clic derecho | Una fila/elemento de tarea | Abre un menú contextual para cambiar el estado de la tarea |
| Clic | El conmutador **Lista \| Tabla** | Cambia de modo, conservando búsqueda, filtros, agrupado y orden |
| Clic | **+ Filtro** | Abre menús para elegir un tipo de filtro y un valor (Área pide también una sub-área) |
| Clic | La × de un chip de filtro, o **Limpiar** | Quita ese filtro, o todos (el texto de búsqueda se conserva) |
| Clic | La cabecera de un grupo | Contrae o expande ese grupo; su estado se recuerda |
| Clic | Un encabezado de columna (vista Tabla) | Ordena por esa columna; clic de nuevo para invertir. También accesible por teclado con Enter o Espacio |
| Pasar el mouse / foco de teclado | Un control o widget con tooltip | Muestra un tooltip temático con su texto explicativo |

La búsqueda, los filtros, el agrupado y el orden son comunes a las vistas Lista y Tabla y se recuerdan al volver de editar una tarea o cambiar de vista; el ancho de las columnas se adapta a las filas visibles tras filtrar.

## Seguimiento de hábitos

| Gesto | Dónde | Resultado |
|---|---|---|
| Clic | Una celda de la cuadrícula o una casilla de la rutina | Alterna el hábito entre cumplido/no cumplido para ese día |
| Clic | El encabezado de un grupo (vista Rutina diaria) | Contrae o expande ese grupo; su estado se recuerda |
| Clic | El nombre de un hábito (vista Cuadrícula/Semanal) | Abre el **Habit Editor** |
| Doble clic | El nombre de un hábito (vista Cuadrícula/Semanal) | Abre la nota subyacente del hábito |
| Clic | Una fila de hábito (vista Lista/Tabla) | Abre el **Habit Editor** |
| Doble clic | Una fila de hábito (vista Lista/Tabla) | Abre la nota subyacente del hábito |
| Clic | Acción "Abrir nota" (vista Rutina) | Abre la nota propia del hábito |
| Clic | Acción "Abrir archivo relacionado" (vista Rutina/Tabla) | Abre el archivo enlazado en el campo de archivos relacionados del hábito |
| Clic | Un encabezado de columna (vista Tabla) | Ordena por esa columna |

## Siguiente paso

[9. Configuración](08-configuration.md) reúne en un solo lugar todos los ajustes mencionados a lo largo de estos capítulos.
