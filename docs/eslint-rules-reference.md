# Referencia de Reglas ESLint - Configuraciones Recomendadas

Esta documentación describe todas las reglas incluidas en las configuraciones recomendadas de TypeScript ESLint y Obsidian MD utilizadas en este proyecto.

## TypeScript ESLint - Configuración Recomendada

La configuración `...tseslint.configs.recommended` proporciona reglas esenciales para código TypeScript correcto y seguro.

### Configuración Base

- **Parser**: `@typescript-eslint/parser`
- **Plugin**: `@typescript-eslint` 
- **Tipo de módulo**: `module`
- **Extiende**: `eslint:recommended` con adaptaciones para TypeScript

### Reglas TypeScript Específicas

#### Control de Comentarios y Anotaciones

**`@typescript-eslint/ban-ts-comment`** - `error`
- Prohíbe el uso de comentarios de supresión de TypeScript como `@ts-ignore`, `@ts-expect-error`, etc.
- Fuerza a los desarrolladores a resolver problemas de tipos en lugar de ocultarlos.

**`@typescript-eslint/triple-slash-reference`** - `error`
- Prohíbe el uso de referencias triple-slash (`/// <reference path="..." />`).
- Las referencias triple-slash son consideradas obsoletas en favor de imports ES6.

#### Gestión de Variables y Expresiones

**`@typescript-eslint/no-unused-vars`** - `error`
- Detecta variables, funciones y imports no utilizados.
- Reemplaza la regla base `no-unused-vars` de ESLint con mejor soporte para TypeScript.

**`@typescript-eslint/no-unused-expressions`** - `error`
- Prohíbe expresiones que no tienen efecto en el comportamiento del programa.
- Versión mejorada para TypeScript que entiende tipos y aserciones.

**`@typescript-eslint/no-this-alias`** - `error`
- Prohíbe asignar `this` a una variable (ej: `const self = this`).
- Promueve el uso de arrow functions o binding explícito.

#### Control de Tipos y Constructores

**`@typescript-eslint/no-explicit-any`** - `error`
- Prohíbe el uso explícito del tipo `any`.
- Fuerza el uso de tipos más específicos y seguros.

**`@typescript-eslint/no-array-constructor`** - `error`
- Prohíbe el uso del constructor `Array()` en favor de la sintaxis literal `[]`.
- Versión TypeScript-aware de la regla ESLint base.

**`@typescript-eslint/no-wrapper-object-types`** - `error`
- Prohíbe tipos wrapper como `String`, `Number`, `Boolean`.
- Prefiere los tipos primitivos `string`, `number`, `boolean`.

**`@typescript-eslint/no-unsafe-function-type`** - `error`
- Prohíbe el uso del tipo `Function` que es inseguro.
- Recomienda definir firmas de función específicas.

#### Enums y Objetos

**`@typescript-eslint/no-duplicate-enum-values`** - `error`
- Detecta valores duplicados en enumeraciones.
- Previene confusión y errores lógicos.

**`@typescript-eslint/no-empty-object-type`** - `error`
- Prohíbe definir tipos de objeto vacíos (`{}`).
- Promueve interfaces más específicas y descriptivas.

#### Namespaces y Módulos

**`@typescript-eslint/no-namespace`** - `error`
- Prohíbe el uso de namespaces TypeScript.
- Favorece el sistema de módulos ES6 estándar.

**`@typescript-eslint/prefer-namespace-keyword`** - `error`
- Cuando se usen namespaces, prefiere `namespace` sobre `module`.
- Mejora la consistencia y claridad del código.

**`@typescript-eslint/no-require-imports`** - `error`
- Prohíbe imports usando `require()`.
- Fuerza el uso de imports ES6 (`import`/`export`).

#### Aserciones y Operadores

**`@typescript-eslint/no-extra-non-null-assertion`** - `error`
- Detecta aserciones de no-null (`!`) innecesarias o duplicadas.
- Evita código redundante y confuso.

**`@typescript-eslint/no-non-null-asserted-optional-chain`** - `error`
- Prohíbe aserciones de no-null en optional chaining (`obj?.prop!`).
- Previene comportamiento contradictorio.

**`@typescript-eslint/prefer-as-const`** - `error`
- Prefiere `as const` sobre aserciones de tipo literal.
- Mejora la inferencia de tipos y immutabilidad.

#### Construcciones Especiales

**`@typescript-eslint/no-misused-new`** - `error`
- Prohíbe el mal uso de constructores en interfaces.
- Previene confusión entre constructores de clase e interfaces.

**`@typescript-eslint/no-unnecessary-type-constraint`** - `error`
- Detecta restricciones de tipo genérico innecesarias.
- Simplifica definiciones de tipos.

**`@typescript-eslint/no-unsafe-declaration-merging`** - `error`
- Prohíbe el merging peligroso de declaraciones.
- Previene comportamientos inesperados en tipos.

### Reglas ESLint Base Deshabilitadas

Estas reglas de ESLint se deshabilitan porque TypeScript las maneja mejor:

- `no-unused-vars` → `@typescript-eslint/no-unused-vars`
- `no-unused-expressions` → `@typescript-eslint/no-unused-expressions`  
- `no-array-constructor` → `@typescript-eslint/no-array-constructor`

## Obsidian MD - Configuración Recomendada

La configuración `...obsidianmd.configs.recommended` incluye reglas específicas para desarrollo de plugins de Obsidian.

### Configuración por Tipo de Archivo

#### Archivos TypeScript/JavaScript
- **Plugins incluidos**: `import`, `@microsoft/sdl`, `obsidianmd`, `depend`
- **Extiende**: Configuraciones recomendadas de TypeScript ESLint
- **Soporte para**: `.ts`, `.tsx`, `.js`, `.jsx`

#### Archivos JSON (package.json)
- **Parser**: `json/json`
- **Foco**: Validación de dependencias

### Reglas Específicas de Comandos

**`obsidianmd/commands/no-command-in-command-id`** - `error`
- Prohíbe incluir la palabra "command" en IDs de comandos.
- Mejora la limpieza y consistencia de los identificadores.

**`obsidianmd/commands/no-command-in-command-name`** - `error`
- Prohíbe incluir "command" en nombres de comandos mostrados al usuario.
- Los nombres deben ser descriptivos de la acción, no de su naturaleza técnica.

**`obsidianmd/commands/no-default-hotkeys`** - `error`
- Prohíbe definir hotkeys por defecto en comandos.
- Los usuarios deben elegir sus propios atajos de teclado.

**`obsidianmd/commands/no-plugin-id-in-command-id`** - `error`
- Evita redundancia incluyendo el ID del plugin en IDs de comandos.
- Obsidian ya prefija automáticamente con el ID del plugin.

**`obsidianmd/commands/no-plugin-name-in-command-name`** - `error`
- Evita incluir el nombre del plugin en nombres de comandos.
- Obsidian ya muestra el contexto del plugin en la interfaz.

### Reglas de Configuración y UI

**`obsidianmd/settings-tab/no-manual-html-headings`** - `error`
- Prohíbe crear headings HTML manualmente en settings.
- Usa las APIs oficiales de Obsidian para crear secciones.

**`obsidianmd/settings-tab/no-problematic-settings-headings`** - `error`
- Detecta headings problemáticos que pueden causar conflictos en la UI.
- Asegura compatibilidad con el sistema de configuración de Obsidian.

**`obsidianmd/ui/sentence-case`** - `error` (con `enforceCamelCaseLower: true`)
- Fuerza el uso de sentence case en textos de interfaz.
- Mantiene consistencia visual con el resto de Obsidian.

### Reglas de API y Desarrollo

**`obsidianmd/vault/iterate`** - `error`
- Asegura el uso correcto de métodos de iteración del vault.
- Previene problemas de rendimiento y memory leaks.

**`obsidianmd/no-forbidden-elements`** - `error`
- Prohíbe el uso de elementos HTML que pueden causar problemas de seguridad.
- Mantiene la aplicación segura y estable.

**`obsidianmd/no-sample-code`** - `error`
- Detecta y prohíbe código de ejemplo no removido.
- Asegura que solo código de producción esté presente.

**`obsidianmd/no-plugin-as-component`** - `error`
- Prohíbe usar la instancia del plugin como componente.
- Promueve separación de responsabilidades.

**`obsidianmd/no-tfile-tfolder-cast`** - `error`
- Prohíbe casteos inseguros entre tipos TFile y TFolder.
- Previene errores de runtime por tipos incorrectos.

**`obsidianmd/no-view-references-in-plugin`** - `error`
- Prohíbe referencias directas a vistas desde la clase principal del plugin.
- Mejora la arquitectura y mantenibilidad.

**`obsidianmd/no-static-styles-assignment`** - `error`
- Prohíbe asignación estática de estilos.
- Promueve el uso de clases CSS y temas dinámicos.

### Reglas de Calidad de Código

**`obsidianmd/object-assign`** - `error`
- Controla el uso de `Object.assign()` para evitar mutaciones peligrosas.
- Promueve inmutabilidad donde sea apropiado.

**`obsidianmd/platform`** - `error`
- Asegura el uso correcto de APIs específicas de plataforma.
- Previene código incompatible entre desktop y mobile.

**`obsidianmd/prefer-abstract-input-suggest`** - `error`
- Prefiere el uso de `AbstractInputSuggest` sobre implementaciones custom.
- Mantiene consistencia con los patrones de UI de Obsidian.

**`obsidianmd/prefer-file-manager-trash-file`** - `warn`
- Recomienda usar `FileManager.trashFile()` en lugar de eliminar archivos directamente.
- Respeta las preferencias del usuario sobre eliminación.

**`obsidianmd/regex-lookbehind`** - `error`
- Detecta uso de regex lookbehind que puede no ser compatible.
- Asegura compatibilidad con todos los entornos de JavaScript.

### Reglas de Validación

**`obsidianmd/sample-names`** - `error`
- Detecta nombres de ejemplo no cambiados (como "Sample Plugin").
- Asegura que el plugin tenga identidad propia.

**`obsidianmd/validate-manifest`** - `error`
- Valida la estructura y contenido del archivo `manifest.json`.
- Asegura compatibilidad con los estándares de Obsidian.

**`obsidianmd/validate-license`** - `error`
- Valida que el archivo de licencia esté presente y sea válido.
- Asegura cumplimiento legal y de distribución.

### Reglas Generales Modificadas

#### Control de Console y Debugging

**`no-console`** - `error` (permite: `warn`, `error`, `debug`)
- Prohíbe `console.log()` pero permite métodos de logging apropiados.
- Mantiene logs limpios en producción.

#### Variables y Globales

**`no-unused-vars`** - `off`
- Deshabilitada en favor de la versión TypeScript.

**`@typescript-eslint/no-unused-vars`** - `warn` (con `args: 'none'`)
- Configuración más permisiva para argumentos de función.
- Adaptada para patrones comunes en desarrollo de plugins.

#### Restricciones de APIs

**`no-restricted-globals`** - `error`
- **`app`**: Evita el objeto global app, usa la referencia del plugin.
- **`fetch`**: Usa `requestUrl()` de Obsidian en lugar de `fetch()`.
- **`localStorage`**: Prefiere `App#saveLocalStorage/loadLocalStorage`.

**`no-restricted-imports`** - `error`
- Prohíbe librerías HTTP externas: `axios`, `superagent`, `got`, `ofetch`, `ky`, `node-fetch`
- Prohíbe `moment` (viene bundled con Obsidian)
- Dirige hacia el uso de APIs nativas de Obsidian

#### Tipos y Seguridad

**`@typescript-eslint/no-explicit-any`** - `error` (con `fixToUnknown: true`)
- Configuración más estricta que sugiere `unknown` como alternativa.

**`@microsoft/sdl/no-document-write`** - `error`
- Prohíbe `document.write()` por razones de seguridad.

**`@microsoft/sdl/no-inner-html`** - `error`  
- Prohíbe `innerHTML` para prevenir XSS.

#### Imports y Dependencias

**`import/no-nodejs-modules`** - `error` (excepto plugins desktop-only)
- Prohíbe imports de módulos Node.js en plugins que deben funcionar en mobile.

**`import/no-extraneous-dependencies`** - `error`
- Asegura que todas las dependencias estén declaradas en package.json.

**`depend/ban-dependencies`** - `error` (en package.json)
- Usa presets: `native`, `microutilities`, `preferred`
- Prohíbe dependencias problemáticas o innecesarias.

### Configuraciones Especiales para Locales

La configuración `recommendedWithLocalesEn` incluye reglas adicionales para archivos de idioma inglés:

#### Archivos JSON de Inglés
- **Patrones**: `**/en.json`, `**/en*.json`, `**/en/*.json`, etc.
- **Regla**: `obsidianmd/ui/sentence-case-json` - `warn`

#### Módulos TypeScript/JavaScript de Inglés  
- **Patrones**: `**/en.ts`, `**/en-*.js`, `**/en_*.mjs`, etc.
- **Regla**: `obsidianmd/ui/sentence-case-locale-module` - `warn`

## Resumen

Esta configuración proporciona:

- **47+ reglas específicas** para desarrollo con TypeScript
- **20+ reglas específicas** para plugins de Obsidian  
- **Validación de seguridad** con reglas SDL de Microsoft
- **Control de dependencias** para mantener bundles pequeños
- **Consistencia de UI** con estándares de Obsidian
- **Mejores prácticas** para APIs de Obsidian

El objetivo es crear plugins robustos, seguros y consistentes con el ecosistema de Obsidian.