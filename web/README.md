# SetupViz web
SetupViz website — plan your desk setup in 3D before you buy.

## Worker

Build the module from the files in this folder. This writes `dist/worker.js`, which is gitignored:

```bash
node scripts/build-worker.mjs
```

Check the upload without sending it:

```bash
node scripts/deploy-worker.mjs --dry-run
node scripts/deploy-worker.mjs --dry-run --preview
```

Deploy requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. `CLOUDFLARE_SCRIPT_NAME` defaults to `setupviz`. `--preview` deploys `CLOUDFLARE_PREVIEW_SCRIPT_NAME`, or `<script-name>-preview` when that variable is unset:

```bash
node scripts/deploy-worker.mjs
node scripts/deploy-worker.mjs --preview
```
