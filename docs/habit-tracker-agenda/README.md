---
name: "dev - habit tracker agenda - README"
type: "[[blueprint]]"
type_group: it
area: daily-plan
sub_area: daily-routine
archetype: manager
modifies:
  type: skill
  group: it
  value: obsidian-development
status: active
related:
  - "[[habit tracker]]"
  - "[[daily routine]]"
  - "[[habit gen]]"
created: 2026-09-21
tags:
  - obsidian-agenda
  - documentation
---

# Dev — Habit Tracker para obsidian-agenda

## Objetivo

Desarrollar **vistas de hábitos** dentro del plugin **Obsidian Agenda** (`C:\Code\obsidian\obsidian-agenda`) que permitan **visualizar** el estado, historial, rachas y progreso de los hábitos de la rutina diaria, y **marcarlos** de forma interactiva (escritura en el vault) sin salir del plugin.

La fuente de datos es una **ruta configurable** dentro del vault donde viven las notas de hábitos (por convención `daily plan/daily routine/habit`).

## Contexto actual (cómo funciona hoy)

- **Definición de hábitos**: cada hábito es una nota `.md` en `daily plan/daily routine/habit/` con frontmatter (`name`, `description`, `time`, `area`, `daytime`, `status`, `entries`). Se crean desde [[habit gen]] usando las plantillas `config/templates/habit.md` y `habitaux.md`. El `daytime` puede repetirse (un hábito aparece varias veces al día); el tracking por ocurrencia del plugin usará `completions` manteniendo `entries` como espejo.
- **Notas diarias**: la plantilla `config/templates/daily routine.md` (Templater) genera notas en `daily plan/daily routine/habit tracker/YYYY-MM-DD.md` con toggles `<habito>-<area>-<daytime>` (meta-bind), barras de progreso y cálculos `pb*` (por daytime, por área y global `pbdaily`).
- **Visualización actual**: 
  - Code blocks `habittracker` (plugin **Habit Tracker 21**) en [[habit tracker]] — grid de filas=habit/columnas=días.
  - Heatmap + barras con **dataviewjs / Heatmap Tracker / Charts** en la misma nota.
- **Limitaciones**: la visualización depende de varios plugins externos y de render en notas; no hay una interfaz integrada.

## Propuesta

Añadir al plugin **obsidian-agenda** un módulo `src/habits/` con:

| Vista | Descripción |
|---|---|
| **Grid (estilo Habit Tracker 21)** | Filas = hábitos (o una fila por `daytime` en multi-daytime), columnas = días (`daysToShow`, defecto 21). Click en celda: toggle directo. Rachas fusionadas en píldora, con tolerancia `maxGap`; orden configurable (alfabético/área/daytime/prioridad/racha/%). |
| **Rutina diaria** | Estado de hoy (y navegable) organizado por `daytime`, solo hábitos programados ese día, ordenados por prioridad, con porcentajes (cumplimiento por **ocurrencia**). |
| **Dashboard / Overview** | Métricas: cumplimiento de hoy (crudo y **ponderado por prioridad**), rachas, % por las 10 áreas y por daytime, mini-historial. |
| **Semanal** | Matriz hábito × día de la semana (días no programados atenuados). |
| **Lista / Tabla** | Catálogo con área (enum + `subArea`), frecuencia, prioridad, daytime, tiempo y rachas. |
| **Habit Creator** | **Modal** para **crear/editar** hábitos (nota nueva o actualización de frontmatter) con toda la metadata. |

La vista **Grid** se basa en la referencia de código abierto **Habit Tracker 21** (`github.com/zincplusplus/habit-tracker`, MIT) replicando su comportamiento en el stack del plugin (TypeScript + Handlebars + luxon + SCSS). Además, un **Habit Creator** (modal) permite crear y editar hábitos sin salir del plugin.

**Metadata extendida** en las notas de hábito (ver [[Modelo de datos]]): `area` (enum de 10 slugs inglés, etiquetas locales vía i18n), `subArea` (detalle opcional), `frequency` (`everyday`/`workweek`/`weekend`/días), `priority` (1–5), `daytime` y **`completions`** (mapa `fecha → [daytimes]`, seguimiento por ocurrencia); `entries` queda como **espejo HT21** autosincronizado.

## Mapa de documentos

| # | Documento | Contenido |
|---|---|---|
| 1 | [[README]] (este) | Índice, contexto, propuesta. |
| 2 | [[PRD - Módulo Habit Tracker]] | Requerimientos de producto y criterios de aceptación. |
| 3 | [[Modelo de datos]] | Esquema de las notas de hábito, métricas, write-back y decisiones (ADR). |
| 4 | [[Arquitectura técnica]] | Integración con obsidian-agenda, módulos, eventos, estilos, i18n. |
| 5 | [[Especificación de vistas]] | Wireframes y specs de cada vista, incluida la Grid HT21. |
| 6 | [[Plan de implementación]] | Fases, tareas por archivo, verificación y riesgos. |

## Estado

- [x] Contexto entendido (vault y plugin)
- [x] Referencia HT21 analizada
- [x] Documentación generada
- [ ] Fase 1: data layer (HabitManager)
- [ ] Fase 2: Vista Grid
- [ ] Fase 3: Vista Rutina diaria
- [ ] Fase 4: Dashboard
- [ ] Fase 5: Semanal + Lista/Tabla

## Enlaces de interés en el vault

- [[habit tracker]] — blueprints actuales de visualización.
- [[daily routine]] — definición de la rutina (daytimes y esqueleto).
- [[habit gen]] — generador de nuevos hábitos.
- `config/templates/daily routine.md` — plantilla Templater de la nota diaria.
- `C:\Code\obsidian\obsidian-agenda\docs\todo.md` — roadmap del plugin (v1.1.0: "Habit tracker" y "Rutina diaria").