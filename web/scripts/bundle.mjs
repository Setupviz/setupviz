// Bundles an ES module from src/ and everything it imports into one classic script, so pages
// and the Worker run the same code without a third-party bundler.
//
// It supports exactly the module syntax src/ uses, and fails the build on anything else:
//   import { a, b } from './x.js';
//   export function name / export async function name / export const name
// Each module runs in its own strict function scope, in dependency order. Import cycles are
// an error: keep the graph one-way (data, then rules, then layout, then entry points).
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

const IMPORT = /^import \{([^}]*)\} from '(\.\/[\w-]+\.js)';$/;
const EXPORT = /^export (?:async function|function|const) ([A-Za-z_$][\w$]*)/;

function parse(file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const imports = [], exports = [], body = [];
  lines.forEach((line, i) => {
    const where = basename(file) + ':' + (i + 1);
    if (/^\s*import\b/.test(line)) {
      const m = line.match(IMPORT);
      if (!m) throw new Error(where + ': unsupported import');
      const names = m[1].split(',').map((n) => n.trim()).filter(Boolean);
      if (names.some((n) => !/^[A-Za-z_$][\w$]*$/.test(n))) throw new Error(where + ': only plain named imports are supported');
      imports.push({ from: join(dirname(file), m[2]), names });
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
  return { file, imports, exports, body: body.join('\n') };
}

export function bundle(entry) {
  const modules = new Map(), order = [], visiting = new Set();
  function visit(file) {
    if (modules.has(file)) return;
    if (visiting.has(file)) throw new Error('import cycle through ' + basename(file));
    visiting.add(file);
    const mod = parse(file);
    mod.imports.forEach((imp) => visit(imp.from));
    visiting.delete(file);
    modules.set(file, mod);
    order.push(mod);
  }
  visit(join(srcDir, entry));
  const id = (file) => '$' + basename(file, '.js').replace(/\W/g, '_');
  const out = order.map((mod) => {
    const head = mod.imports.map((imp) => {
      const missing = imp.names.filter((n) => !modules.get(imp.from).exports.includes(n));
      if (missing.length) throw new Error(basename(mod.file) + ': ' + basename(imp.from) + ' does not export ' + missing.join(', '));
      return 'const { ' + imp.names.join(', ') + ' } = ' + id(imp.from) + ';';
    });
    return 'const ' + id(mod.file) + ' = (function () {\n\'use strict\';\n' + head.join('\n') + '\n' + mod.body +
      '\nreturn { ' + mod.exports.join(', ') + ' };\n})();';
  });
  return '// Built from web/src by scripts/bundle.mjs. Edit the modules, not this file.\n(function () {\n' + out.join('\n') + '\n})();\n';
}

// Runs a site bundle outside the browser and returns the globals it publishes
// (SV, SVDesk, SVImage). The build and the tests use this to read the same code pages run.
export function runSite(source = bundle('entry-site.js')) {
  const sandbox = { window: {}, btoa, atob };
  runInNewContext(source, sandbox);
  return sandbox.window;
}
