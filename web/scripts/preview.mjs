// Build the site and serve it on this computer, to look at a branch before it is deployed.
// Pages work; anything that needs the database (upvotes, saved setups) does not.
import { buildWorker, serveWorker } from './verify/serve.mjs';

const port = Number(process.env.PORT) || 8787;
await buildWorker();
await serveWorker(port, { fresh: true });
console.log(`SetupViz preview: http://localhost:${port}/home  (Ctrl+C to stop)`);
