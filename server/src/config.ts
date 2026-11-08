import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load server/.env if present (Node >= 20.12 has a built-in loader; no dotenv dependency needed).
const envFile = path.join(ROOT, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const env = process.env;
const bool = (v: string | undefined, d: boolean) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

export const config = {
  port: Number(env.PORT || 8000),
  dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
  /** Comma-separated list of browser origins allowed to call the API with credentials. */
  corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()).filter(Boolean),
  /** Demo mode: enables POST /demo/reset. Must be false for anything beyond a local synthetic demo. */
  demoMode: bool(env.DEMO_MODE, true),
  sessionTtlHours: Number(env.SESSION_TTL_HOURS || 12),
  cookieSecure: bool(env.COOKIE_SECURE, false),
  ai: {
    groqKey: env.GROQ_API_KEY || '',
    geminiKey: env.GOOGLE_API_KEY || '',
    mistralKey: env.MISTRAL_API_KEY || '',
    groqModel: env.GROQ_MODEL || 'openai/gpt-oss-120b',
    geminiModel: env.GEMINI_MODEL || 'gemini-flash-latest',
    mistralModel: env.MISTRAL_MODEL || 'mistral-small-latest',
    timeoutMs: Number(env.AI_TIMEOUT_MS || 25_000),
  },
};

export type Config = typeof config;
