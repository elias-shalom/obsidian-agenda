# 7. Formato de tareas y metadatos

Agenda Tasks lee tareas estándar de Obsidian con casilla (`- [ ] ...`) y es totalmente compatible con el formato de metadatos emoji del plugin [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks). Puedes seguir usando Obsidian Tasks (o escribir las tareas a mano) — no necesitas cambiar nada en la forma en que escribes una línea de tarea.

## Metadatos compatibles

| Metadato | Ícono | Ejemplo | Notas |
|---|---|---|---|
| Fecha de vencimiento | 📅 | `- [ ] Tarea 📅 2024-12-31` | Siempre día completo |
| Fecha programada | ⏳ | `- [ ] Tarea ⏳ 2024-06-15` | La única fecha que puede llevar hora/duración |
| Hora programada | 🕐 | `- [ ] Tarea ⏳ 2024-06-15 🕐 14:30` | Opcional, formato 24h `HH:mm`; requiere fecha programada |
| Duración | ⏱️ | `- [ ] Tarea ⏳ 2024-06-15 🕐 14:30 ⏱️ 90m` | Opcional, en minutos; requiere hora programada |
| Fecha de inicio | 🛫 | `- [ ] Tarea 🛫 2024-06-01` | Siempre día completo |
| Prioridad | ⏬🔽🔼⏫🔺 | `- [ ] Tarea ⏫` | Mínima / Baja / (Normal, sin ícono) / Media / Alta / Máxima |
| Recurrencia | 🔁 | `- [ ] Tarea 🔁 every day` | Recurrencia en lenguaje natural; ver **Tareas recurrentes** más abajo |
| Depende de | ⛔ | `- [ ] Tarea ⛔ abc123,def456` | IDs de tareas separados por coma |
| Al completar | 🏁 | `- [ ] Tarea 🏁 delete` | `keep` (conservar) o `delete` (eliminar) |
| ID | 🆔 | `- [ ] Tarea 🆔 abc123` | Referenciado por `⛔` en otras tareas |
| Etiquetas | `#tag` | `- [ ] Tarea #proyecto #urgente` | Etiquetas estándar de Obsidian |

> La hora y duración programadas (y todos los campos anteriores) se reconocen en **cualquier posición de la línea**, en cualquier orden — no necesitan estar uno al lado del otro ni seguir una secuencia específica.

## Ejemplos de tareas

```markdown
- [ ] Completar la documentación del proyecto 📅 2024-12-31 ⏫ #proyecto #documentacion
- [ ] Revisar pull requests ⏳ 2024-06-15 #code-review
- [ ] Reunión diaria del equipo ⏳ 2024-06-16 🕐 09:00 ⏱️ 15m 🔁 every weekday
- [x] Entregar informe final 🛫 2024-06-01 ✅
```

## Estado de la tarea

Cada tarea tiene uno de **seis** estados, mostrado como un ícono de estado en su píldora del calendario y seleccionable desde un menú de clic derecho o desde el Task Modal:

| Estado | Símbolo | Ícono |
|---|---|---|
| Por hacer | ` ` | ⭕ |
| En progreso | `/` | 🛠️ |
| En espera | `?` | ⏸️ |
| Hecho | `x` | ✅ |
| Cancelada | `-` | ❌ |
| No es tarea | otro | 🗑️ |

Marcar una tarea como **Hecho** agrega su fecha de completado (✅); cambiarla a otro estado quita esa fecha de nuevo — el mismo comportamiento que marcar la casilla nativa de Obsidian.

## Crear y editar tareas

### El Task Modal

Se abre al crear una tarea (ver [3. Primeros pasos](02-getting-started.md)) o al hacer clic en una existente. Tiene:

- **Campos básicos** — título, fecha programada, prioridad (selector segmentado de un clic), estado.
- **Una sección "Más campos"** (recuerda si la dejaste expandida o contraída) con: fecha de inicio, fecha de vencimiento, hora/duración programada, recurrencia, dependencias, comportamiento al completar, y un ID personalizado.
- Los campos de vencimiento/inicio/programada abren todos el mismo selector de fecha estilo calendario usado en las vistas de calendario, con un punto que marca los días que ya tienen tareas.

### Insertar o editar un campo desde el editor

No necesitas abrir un modal para agregar o cambiar un campo en una línea de tarea que ya estás editando:

- **Clic derecho** en una línea de tarea para obtener un menú contextual con opciones de campo (fecha, hora, duración, prioridad, etc.).
- O usa el comando **"Insertar campo de tarea"** (puede asignarse a un atajo de teclado) desde la paleta de comandos.

Ambos usan el mismo selector de fecha de aspecto nativo y una rueda de desplazamiento estilo iOS para la hora.

## Tareas recurrentes

Dale a una tarea una regla de recurrencia (🔁, p. ej. `every day`, `every week`, `every month when done`) y, al marcarla como **Hecho**, el plugin inserta automáticamente una línea nueva justo arriba con la siguiente ocurrencia:

- La siguiente fecha se calcula a partir de la fecha que ancla la tarea, con prioridad `scheduled` > `due` > `start`.
- Un sufijo `when done` calcula la siguiente ocurrencia a partir de **hoy** en vez de la fecha original — útil para tareas como "regar las plantas", donde el calendario debería reiniciarse desde el momento en que realmente la hiciste.
- La nueva ocurrencia elimina los campos `🆔` y `⛔` (un ID/dependencia no debería duplicarse) y conserva el resto de los campos desplazados por la misma cantidad relativa.

## Siguientes pasos

- [8. Gestos e interacciones](07-gestures.md) para activar todo esto con clics, dobles clics y arrastres.
- [9. Configuración](08-configuration.md) para los ajustes de tipos de fecha del calendario y tareas completadas.
