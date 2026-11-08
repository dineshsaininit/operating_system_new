#!/usr/bin/env node
/**
 * Starts the backend (port 8000) and the frontend (port 5173) together with labelled, coloured output.
 * No dependencies. Ctrl+C stops both.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const c = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);

for (const dir of ['frontend', 'backend']) {
  if (!existsSync(path.join(root, dir, 'node_modules'))) {
    console.error(c('31', `✖ ${dir}/node_modules is missing — run "npm run setup" first.`));
    process.exit(1);
  }
}

console.log(c('1;34', '\n  AASIOM Command OS'));
console.log(c('2', '  ─────────────────────────────────────────────'));
console.log(`  ${c('36', '● backend ')} http://localhost:8000/api`);
console.log(`  ${c('35', '● frontend')} http://localhost:5173`);
console.log(c('2', '  Ctrl+C stops both · synthetic data only\n'));

const procs = [];
function run(name, color, dir) {
  const child = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], { cwd: path.join(root, dir), shell: isWin, env: process.env });
  const tag = c(color, `[${name}]`.padEnd(11));
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? '';
      for (const l of lines) if (l.trim()) out.write(`${tag} ${l}\n`);
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${tag} exited with code ${code}`);
    shutdown(code ?? 0);
  });
  procs.push(child);
}

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const p of procs) {
    if (p.exitCode === null) {
      if (isWin) spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
      else p.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(code), 300);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('backend', '36', 'backend');
run('frontend', '35', 'frontend');
