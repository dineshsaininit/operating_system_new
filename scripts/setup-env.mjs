#!/usr/bin/env node
/**
 * First-run helper: creates frontend/.env.local and backend/.env from the examples if they don't exist,
 * pointing the frontend at the backend. Never overwrites existing files, never writes keys.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fe = path.join(root, 'frontend', '.env.local');
const be = path.join(root, 'backend', '.env');

if (!existsSync(be)) {
  copyFileSync(path.join(root, 'backend', '.env.example'), be);
  console.log('✔ created backend/.env — add your AI keys there (GROQ_API_KEY, GOOGLE_API_KEY, MISTRAL_API_KEY)');
} else console.log('• backend/.env already exists — left unchanged');

if (!existsSync(fe)) {
  const example = readFileSync(path.join(root, 'frontend', '.env.example'), 'utf8');
  writeFileSync(fe, example.replace(/^VITE_API_BASE_URL=.*$/m, 'VITE_API_BASE_URL=/api'));
  console.log('✔ created frontend/.env.local — connected to the backend (VITE_API_BASE_URL=/api)');
} else console.log('• frontend/.env.local already exists — left unchanged');

console.log('\nNext: npm run dev   →   http://localhost:5173');
