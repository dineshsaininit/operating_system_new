import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { attachPrivateSession, attachSession, tokenOf } from './auth.js';
import { config } from './config.js';
import { errorHandler, fail } from './errors.js';
import { ai } from './routes/ai.js';
import { front } from './routes/front.js';
import { office } from './routes/office.js';
import { priv } from './routes/private.js';
import { work } from './routes/work.js';
import { db, pdb, resetAll, save } from './store.js';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'no-store'); next(); });

  const api = express.Router();
  api.get('/health', (_req, res) => { res.json({ ok: true, service: 'aasiom-command-os-backend', demoMode: config.demoMode, time: new Date().toISOString() }); });

  // Private service first, with its own session lookup — official middleware never sees it.
  api.use('/private', priv);

  // Official environment: attach session, persist after every request that changed state.
  api.use(attachSession);
  api.use((req, res, next) => {
    const before = db().audit.length;
    res.on('finish', () => { if (req.method !== 'GET' || db().audit.length !== before) save(); });
    next();
  });

  if (config.demoMode) {
    // Demo-only: restore the synthetic dataset. Any signed-in user (official or private) may trigger it.
    api.post('/demo/reset', (req, res, next) => attachPrivateSession(req, res, () => {
      const signedIn = !!db().sessions[tokenOf(req) ?? ''] || !!pdb().sessions[tokenOf(req) ?? ''];
      if (!signedIn) return next(fail(401, 'Sign in first'));
      resetAll();
      res.status(204).end();
    }));
  }

  api.use(front, work, office, ai);
  api.use((req, _res, next) => next(fail(404, `No route for ${req.method} ${req.baseUrl}${req.path}`)));
  app.use('/api', api);

  // Optional: serve the built frontend (npm run build at the repo root) from the same origin.
  if (existsSync(path.join(DIST, 'index.html'))) {
    app.use(express.static(DIST, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api\/).*/, (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(DIST, 'index.html')); });
  }

  app.use(errorHandler);
  return app;
}
