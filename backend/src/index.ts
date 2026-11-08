import { createApp } from './app.js';
import { config } from './config.js';
import { initStores } from './store.js';

initStores();
const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`AASIOM backend listening on http://localhost:${config.port}/api  (data: ${config.dataDir}, demo mode: ${config.demoMode})`);
  if (!config.ai.groqKey && !config.ai.geminiKey && !config.ai.mistralKey) console.log('AI gateway: no provider keys set — /ai/chat will return 503 (UI falls back to deterministic text).');
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => server.close(() => process.exit(0)));
