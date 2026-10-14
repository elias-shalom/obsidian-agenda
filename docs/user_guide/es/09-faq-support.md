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

## Obtener ayuda

- 📖 Consulta la [Wiki](https://github.com/elias-shalom/obsidian-agenda/wiki) del proyecto.
- 🐛 Reporta errores en [GitHub Issues](https://github.com/elias-shalom/obsidian-agenda/issues).
- 💡 Sugiere funcionalidades a través de GitHub Discussions, en el mismo repositorio.

## Dar retroalimentación

Las solicitudes de funcionalidades, reportes de errores, sugerencias de uso y mejoras de traducción son bienvenidos a través de los mismos canales de GitHub Issues/Discussions mencionados arriba.

## Apoyar el proyecto

Si te resulta útil el plugin, considera darle una estrella al [repositorio de GitHub](https://github.com/elias-shalom/obsidian-agenda), compartirlo con otras personas, o dejar una reseña en el explorador de plugins de la comunidad de Obsidian.
