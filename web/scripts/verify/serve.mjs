import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function buildWorker() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/build-worker.mjs'], { cwd: root, stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('build-worker exited ' + code))));
  });
}

export async function serveWorker(port) {
  const worker = (await import(pathToFileURL(join(root, 'dist', 'worker.js')).href)).default;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value == null) continue;
        if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
        else headers.set(key, value);
      }
      const response = await worker.fetch(new Request(url, { method: req.method, headers }));
      const body = Buffer.from(await response.arrayBuffer());
      const out = {};
      response.headers.forEach((value, key) => { out[key] = value; });
      res.writeHead(response.status, out);
      res.end(body);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(err && err.stack || err));
    }
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return server;
}
