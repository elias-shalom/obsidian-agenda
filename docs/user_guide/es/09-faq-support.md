# 10. Preguntas frecuentes y soporte

## Preguntas frecuentes

**No veo una tarea que acabo de escribir — ¿por qué?**
Asegúrate de que la línea use exactamente la sintaxis de casilla de Obsidian (`- [ ] ...`, con el espacio dentro de los corchetes para una tarea incompleta). El plugin vuelve a analizar las notas a medida que las editas, así que esto suele ser inmediato; si una vista sigue viéndose desactualizada, cambia de pestaña y vuelve, o usa la acción de actualización manual del Seguimiento de hábitos (grupo de configuración Hábitos) si el problema es con un hábito en vez de una tarea.

**¿Cómo cambio el idioma del plugin?**
Agenda Tasks sigue el idioma de visualización configurado en Obsidian (**Configuración → General → Idioma**). Actualmente incluye traducciones al inglés, español, alemán, francés, italiano y portugués.

**¿Puedo usarlo junto con el plugin Obsidian Tasks?**
Sí — Agenda Tasks lee el mismo formato de metadatos emoji, así que las tareas escritas por cualquiera de los dos plugins (o a mano) se interpretan de la misma manera. Ver [7. Formato de tareas y metadatos](06-task-format.md).

**¿Por qué la siguiente ocurrencia de mi tarea recurrente no apareció donde esperaba?**
Revisa qué fecha usaste como ancla de recurrencia de la tarea: la siguiente ocurrencia se calcula a partir de la fecha que esté definida, con prioridad `scheduled` > `due` > `start`. Si la regla de recurrencia termina en `when done`, la siguiente fecha se calcula a partir de **hoy**, no de la fecha original.

**Una vista de calendario se ve vacía aunque tengo tareas ese día.**
Revisa **Configuración ▸ Calendario**: las tareas completadas podrían estar ocultas, o el tipo de fecha que usa tu tarea (`due`/`start`/`scheduled`) podría estar desactivado para mostrarse.

**Los hábitos y las tareas parecen no estar relacionados — ¿es intencional?**
Sí. El Seguimiento de hábitos es un módulo separado para hábitos recurrentes (respaldado por sus propias notas), independiente de las vistas de tareas. Ver [6. Seguimiento de hábitos](05-habit-tracker.md).

**La ventana de «novedades» apareció tras una actualización — ¿puedo desactivarla?**
Sí: desactiva **Mostrar novedades al actualizar** en **Configuración ▸ Agenda Tasks**. La ventana aparece una sola vez por actualización y se muestra en tu idioma.

**¿Por qué no puedo soltar una tarjeta de Kanban en otra columna de etiqueta o de carpeta?**
Las columnas de etiqueta y de carpeta son de solo lectura: mover una tarea a otra carpeta implicaría moverla a otra nota. Agrupa por **Estado** o **Prioridad** para cambiarlos arrastrando.

**¿Por qué una tarea no aparece en el diagrama de Gantt?**
Una tarea necesita al menos una de 🛫, ⏳ o 📅. Las tareas sin ninguna fecha se listan en el grupo **Tareas sin fecha** bajo el diagrama (plegado por defecto), y una tarea fuera de la ventana visible aparece al mover la ventana o cambiar el zoom.

**¿Cómo filtro por dos prioridades (o dos estados o áreas)?**
Elige **+ Filtro ▸ Prioridad** y marca ambos valores en el popover; sigue abierto mientras marcas y se cierra al hacer clic fuera o pulsar Esc. Los valores de un mismo filtro son «o» (Normal **o** Media), mientras que los filtros distintos son «y». El chip muestra entonces solo el número (por ejemplo **Prioridad: 2**); pasa el cursor sobre él para ver los valores.

**¿Cómo veo mis tareas divididas por área?**
Usa el chip **Filas** junto a **+ Filtro** y elige **Área** (o Sub-área, Estado, Prioridad, Etiqueta, Carpeta o Archivo). Cada valor se convierte en su propio widget: un tablero en Kanban, una sección en Lista, un bloque en Tabla y un diagrama en Gantt. Elige **Ninguno** para volver a la vista normal.

**¿Por qué no puedo elegir Grupo = Área cuando Filas = Área?**
Filas y Grupo no pueden usar el mismo campo, porque los grupos repetirían las filas. En Kanban la opción que choca está desactivada; en Lista, Tabla y Gantt puedes elegirla y el otro chip pasa solo a Ninguno. Área, Sub-área y Carpeta cuentan como el mismo campo.

**¿Por qué una tarea aparece en varias filas?**
Al dividir por **Etiqueta**, una tarea con varias etiquetas aparece en cada una de sus filas, así que los totales pueden sumar más que el número de tareas.

**La barra de filtros del calendario no tiene filtros de fecha relativos, agrupado ni orden — ¿es lo esperado?**
Sí. La barra de filtros del calendario ofrece búsqueda, Prioridad, Estado, Área y, en **+ Filtro**, **Fecha de inicio**, **Fecha programada** y **Fecha de vencimiento** como elementos de un solo clic. Estos tres eligen qué píldoras de fecha dibuja el calendario: con **Fecha programada** marcada solo ves las píldoras de la fecha programada (las de vencimiento e inicio de esas mismas tareas se ocultan); marca varias para ver las píldoras de todas, y vuelve a pulsar una para desactivarla. Lo que marques aquí manda sobre los ajustes **Mostrar fechas…** y, sin ninguna marcada, esos ajustes se aplican como siempre. No se ofrecen los filtros relativos (pasadas, hoy, próximos 7 días…) ni «sin fecha», porque una tarea sin fecha nunca aparece en el calendario. Su configuración la comparten los seis diseños de calendario y es independiente de la pestaña Tareas.

## Obtener ayuda

- 📖 Consulta la [Wiki](https://github.com/elias-shalom/obsidian-agenda/wiki) del proyecto.
- 🐛 Reporta errores en [GitHub Issues](https://github.com/elias-shalom/obsidian-agenda/issues).
- 💡 Sugiere funcionalidades a través de GitHub Discussions, en el mismo repositorio.

## Dar retroalimentación

Las solicitudes de funcionalidades, reportes de errores, sugerencias de uso y mejoras de traducción son bienvenidos a través de los mismos canales de GitHub Issues/Discussions mencionados arriba.

## Apoyar el proyecto

Si te resulta útil el plugin, considera darle una estrella al [repositorio de GitHub](https://github.com/elias-shalom/obsidian-agenda), compartirlo con otras personas, o dejar una reseña en el explorador de plugins de la comunidad de Obsidian.
