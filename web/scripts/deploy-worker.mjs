// Build dist/worker.js, then upload it with the same Workers script API
// call the old deploy used. Reads credentials from the environment only.
// --dry-run builds and prints the target and payload size, and does not send.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerPath = join(root, 'dist', 'worker.js');
const dryRun = process.argv.includes('--dry-run');
const preview = process.argv.includes('--preview');

const prodName = process.env.CLOUDFLARE_SCRIPT_NAME || 'setupviz';
const scriptName = preview
  ? (process.env.CLOUDFLARE_PREVIEW_SCRIPT_NAME || prodName + '-preview')
  : prodName;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const token = process.env.CLOUDFLARE_API_TOKEN || '';

if (!/^[A-Za-z0-9_-]+$/.test(scriptName)) {
  console.error('CLOUDFLARE_SCRIPT_NAME / preview name must be letters, numbers, _ or -');
  process.exit(1);
}
if (accountId && !/^[a-f0-9]{32}$/i.test(accountId)) {
  console.error('CLOUDFLARE_ACCOUNT_ID is not a 32-character account id');
  process.exit(1);
}

const built = spawnSync(process.execPath, [join(root, 'scripts', 'build-worker.mjs'), workerPath], {
  stdio: 'inherit',
});
if (built.status !== 0) process.exit(built.status || 1);

const code = readFileSync(workerPath, 'utf8');
let boundary = 'F' + Date.now();
while (code.includes(boundary)) boundary += 'x';
const meta = { main_module: 'worker.js', compatibility_date: '2026-10-01' };
const body = [
  `--${boundary}`,
  'Content-Disposition: form-data; name="metadata"',
  'Content-Type: application/json',
  '',
  JSON.stringify(meta),
  `--${boundary}`,
  'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
  'Content-Type: application/javascript+module',
  '',
  code,
  `--${boundary}--`,
  '',
].join('\r\n');

const account = accountId || '${CLOUDFLARE_ACCOUNT_ID}';
const target = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${scriptName}`;
const payloadBytes = Buffer.byteLength(body);

if (dryRun) {
  console.log('dry-run: request not sent');
  console.log('PUT ' + target);
  console.log('content-type: multipart/form-data; boundary=' + boundary);
  console.log('payload: ' + payloadBytes + ' bytes');
  console.log('script: ' + scriptName + (preview ? ' (preview)' : ' (production)'));
  console.log('account id: ' + (accountId ? 'set' : 'not set'));
  console.log('token: ' + (token ? 'set' : 'not set'));
  process.exit(0);
}

if (!accountId || !token) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
  process.exit(1);
}

const res = await fetch(target, {
  method: 'PUT',
  headers: {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
  },
  body,
});
const json = await res.json().catch(() => ({}));
if (!res.ok || json.success === false) {
  console.error('upload failed: HTTP ' + res.status);
  if (Array.isArray(json.errors) && json.errors.length) {
    for (const err of json.errors) console.error(err.code + ' ' + err.message);
  }
  process.exit(1);
}
const id = json.result && json.result.id;
console.log('uploaded ' + scriptName + (id ? ' ' + id : ''));
