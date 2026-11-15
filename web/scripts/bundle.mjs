// Bundles an ES module from src/ and everything it imports into one classic script, so pages
// and the Worker run the same code without a third-party bundler.
//
// It supports exactly the module syntax src/ uses, and fails the build on anything else:
//   import { a, b } from './x.js';        (or '../x.js', './dir/x.js')
//   export function name / export async function name / export const name
// Each module runs in its own strict function scope, in dependency order. Import cycles are
// an error: keep the graph one-way (data, then rules, then layout, then pages).
//
// Shared bundles: a bundle built with { expose: true } registers its modules on
// window.SVModules. A page bundle built with { shared: ['entry-site.js'] } reads any module
// that bundle already contains from the registry instead of including a second copy, so a
// page script can import shared code and still be small. The shared bundle must load first.
// If it failed to load, those imports are undefined, as the old globals were, so the page's
// own error handling runs (the builder shows its "Couldn't load setup data" message).
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

const IMPORT = /^import \{([^}]*)\} from '(\.{1,2}\/[\w/-]+\.js)';$/;
const EXPORT = /^export (?:async function|function|const) ([A-Za-z_$][\w$]*)/;
const REGISTRY = 'SVModules';

// A module's name is its path under src/, like 'fit.js' or 'pages/builder.js'.
const nameOf = (file) => relative(srcDir, file).split(sep).join('/');
const idOf = (name) => '$' + name.replace(/\.js$/, '').replace(/\W/g, '_');

function parse(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const imports = [], exports = [], body = [];
  lines.forEach((line, i) => {
    const where = nameOf(file) + ':' + (i + 1);
    if (/^\s*import\b/.test(line)) {
      const m = line.match(IMPORT);
      if (!m) throw new Error(where + ': unsupported import');
      const names = m[1].split(',').map((n) => n.trim()).filter(Boolean);
      if (names.some((n) => !/^[A-Za-z_$][\w$]*$/.test(n))) throw new Error(where + ': only plain named imports are supported');
      const from = join(dirname(file), m[2]);
      if (relative(srcDir, from).startsWith('..')) throw new Error(where + ': imports must stay inside src/');
      imports.push({ from: nameOf(from), names });
      return;
    }
    if (/^\s*export\b/.test(line)) {
      const m = line.match(EXPORT);
      if (!m) throw new Error(where + ': unsupported export');
      exports.push(m[1]);
      body.push(line.slice('export '.length));
      return;
    }
    body.push(line);
  });
  return { name: nameOf(file), imports, exports, body: body.join('\n') };
}

// Every module an entry needs, dependencies first.
function graph(entry, skip = new Set()) {
  const modules = new Map(), visiting = new Set();
  function visit(name) {
    if (modules.has(name) || skip.has(name)) return;
    if (visiting.has(name)) throw new Error('import cycle through ' + name);
    visiting.add(name);
    const mod = parse(join(srcDir, name));
    mod.imports.forEach((imp) => visit(imp.from));
    visiting.delete(name);
    modules.set(name, mod);
  }
  visit(entry);
  return modules;
}

export function bundle(entry, { expose = false, shared = [] } = {}) {
  const external = new Map();
  for (const other of shared) for (const [name, mod] of graph(other)) external.set(name, mod);
  const modules = graph(entry, new Set(external.keys()));
  const exportsOf = (name) => (modules.get(name) || external.get(name)).exports;
  const out = [...modules.values()].map((mod) => {
    const head = mod.imports.map((imp) => {
      const missing = imp.names.filter((n) => !exportsOf(imp.from).includes(n));
      if (missing.length) throw new Error(mod.name + ': ' + imp.from + ' does not export ' + missing.join(', '));
      const source = external.has(imp.from)
        ? '(window.' + REGISTRY + ' && window.' + REGISTRY + '[' + JSON.stringify(imp.from) + '] || {})' : idOf(imp.from);
      return 'const { ' + imp.names.join(', ') + ' } = ' + source + ';';
    });
    return 'const ' + idOf(mod.name) + ' = (function () {\n\'use strict\';\n' + head.join('\n') + '\n' + mod.body +
      '\nreturn { ' + mod.exports.join(', ') + ' };\n})();';
  });
  if (expose) {
    const names = [...modules.keys()].filter((name) => name !== entry);
    out.push('var registry = window.' + REGISTRY + ' || (window.' + REGISTRY + ' = {});\n' +
      names.map((name) => 'registry[' + JSON.stringify(name) + '] = ' + idOf(name) + ';').join('\n'));
  }
  return '// Built from web/src by scripts/bundle.mjs. Edit the modules, not this file.\n(function () {\n' + out.join('\n') + '\n})();\n';
}

// Runs a site bundle outside the browser and returns the globals it publishes
// (SV, SVDesk, SVImage). The build and the tests use this to read the same code pages run.
export function runSite(source = bundle('entry-site.js')) {
  const sandbox = { window: {}, btoa, atob };
  runInNewContext(source, sandbox);
  return sandbox.window;
}
