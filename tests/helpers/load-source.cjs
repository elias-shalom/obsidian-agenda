// Carga módulos reales de `src/` en Node sin empaquetar: transpila TypeScript al vuelo y resuelve
// las importaciones relativas. Solo para módulos puros; `obsidian` se sustituye por `stubs`.
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const cache = new Map();

function resolveFile(from, request) {
  const base = path.resolve(path.dirname(from), request);
  for (const candidate of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && candidate.endsWith('.ts')) return candidate;
  }
  throw new Error(`No se encuentra ${request} importado desde ${from}`);
}

function loadModule(file, stubs) {
  if (cache.has(file)) return cache.get(file).exports;

  const module = { exports: {} };
  cache.set(file, module);

  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const localRequire = (request) => {
    if (request in stubs) return stubs[request];
    if (request.startsWith('.')) return loadModule(resolveFile(file, request), stubs);
    return require(request);
  };
  new Function('require', 'module', 'exports', outputText)(localRequire, module, module.exports);
  return module.exports;
}

/** Carga `src/<relativePath>` (por ejemplo `core/area.ts`) con sus dependencias reales. */
function loadSource(relativePath, stubs = {}) {
  return loadModule(path.join(__dirname, '..', '..', 'src', relativePath), stubs);
}

module.exports = { loadSource };
