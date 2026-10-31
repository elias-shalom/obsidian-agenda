# 1. Introducción

**Agenda Tasks** es un plugin de gestión de tareas y calendario para [Obsidian](https://obsidian.md). Convierte tu bóveda en un sistema de productividad leyendo las tareas que ya escribes en tus notas y presentándolas a través de varias vistas dedicadas, sin cambiar la forma en que escribes tareas.

> Este manual corresponde a la versión **1.1.13** del plugin. Para ver una lista simple de los cambios entre versiones, consulta la sección Changelog del [README](../../../README.md#changelog) del proyecto.

## Qué hace

- Analiza toda tu bóveda en busca de tareas con casilla (`- [ ]`) y las mantiene actualizadas a medida que editas tus notas: las vistas se refrescan solas.
- Es totalmente compatible con el formato de metadatos del plugin [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) (fechas, prioridad, recurrencia, etiquetas, etc.), por lo que las notas existentes siguen funcionando sin cambios.
- Añade sus propias extensiones opcionales sobre ese formato: hora y duración programadas, un estado con 6 valores (incluyendo "En espera") y generación automática de la siguiente ocurrencia para tareas recurrentes.
- Ofrece siete familias de vistas, cada una pensada para una forma distinta de trabajar:
  - **Vista general** — un panel con métricas clave y acceso rápido a tareas próximas/vencidas.
  - **Lista** y **Tabla** — dos formas de trabajar tus tareas en una sola pestaña, **Tareas**: una lista compacta agrupada por área o una cuadrícula estilo hoja de cálculo, ambas con búsqueda, filtros, agrupado y orden.
  - **Kanban** — un tablero cuyas columnas agrupan las tareas por estado, prioridad, etiqueta o carpeta; arrastra una tarjeta para cambiar su estado o su prioridad.
  - **Gantt** — una línea de tiempo con una barra por tarea; mueve una barra o arrastra sus bordes para cambiar fechas.
  - **Calendario** — seis diseños (Día, Semana, Semana laboral, Mes, Año, Lista) para ver las tareas en una línea de tiempo.
  - **Seguimiento de hábitos** — un módulo independiente (Cuadrícula, Rutina diaria, Dashboard, Semanal, Tabla) para seguir hábitos recurrentes, separado de las tareas.

## A quién está dirigido este manual

Este manual está escrito para quienes **usan** el plugin en su propia bóveda. Si buscas detalles de implementación, notas de arquitectura o guías de contribución, consulta en cambio la documentación de desarrollo en [`docs/agenda-tasks/`](../../agenda-tasks/) y [`docs/habit-tracker-agenda/`](../../habit-tracker-agenda/).

## Cómo está organizado este manual

| Capítulo | Contenido |
|---|---|
| [2. Instalación](01-installation.md) | Instalar y activar el plugin |
| [3. Primeros pasos](02-getting-started.md) | Abrir el plugin y crear tu primera tarea |
| [4. Vistas generales](03-views-overview.md) | Vista general, Tareas (Lista y Tabla), Kanban y Gantt |
| [5. Vistas de calendario](04-calendar-views.md) | Vistas de calendario Día, Semana, Semana laboral, Mes, Año y Lista |
| [6. Seguimiento de hábitos](05-habit-tracker.md) | Crear hábitos y usar las vistas del módulo de hábitos |
| [7. Formato de tareas y metadatos](06-task-format.md) | Metadatos emoji compatibles, ejemplos, crear/editar tareas |
| [8. Gestos e interacciones](07-gestures.md) | Referencia de clic/doble clic/arrastre para cada vista |
| [9. Configuración](08-configuration.md) | Todos los ajustes del plugin, agrupados por área |
| [10. Preguntas frecuentes y soporte](09-faq-support.md) | Preguntas comunes y dónde obtener ayuda |

## Capturas de pantalla

Hay capturas de pantalla representativas de cada vista en la carpeta [`screenshots/`](../../../screenshots/) del proyecto y en el [README](../../../README.md#screenshots) principal.
