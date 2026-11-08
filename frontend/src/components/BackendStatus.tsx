import { useEffect, useRef, useState } from 'react';
import { Server, ServerOff, FlaskConical, Activity } from 'lucide-react';
import { API_BASE, USE_MOCK } from '@/services/http';
import { cn } from '@/lib/utils';

export type BackendState =
  | { mode: 'mock' }
  | { mode: 'checking' }
  | { mode: 'live'; latencyMs: number; demoMode: boolean; checkedAt: string }
  | { mode: 'offline'; checkedAt: string };

/** Polls the public /health endpoint and measures round-trip latency. Shared by every indicator on screen. */
let shared: BackendState = USE_MOCK ? { mode: 'mock' } : { mode: 'checking' };
const listeners = new Set<(s: BackendState) => void>();
let timer: number | undefined;

async function probe() {
  const t0 = performance.now();
  try {
    const ctrl = new AbortController();
    const to = window.setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`${API_BASE}/health`, { signal: ctrl.signal, cache: 'no-store' });
    window.clearTimeout(to);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    shared = { mode: 'live', latencyMs: Math.max(1, Math.round(performance.now() - t0)), demoMode: !!j.demoMode, checkedAt: new Date().toISOString() };
  } catch {
    shared = { mode: 'offline', checkedAt: new Date().toISOString() };
  }
  listeners.forEach((l) => l(shared));
}

export function useBackendStatus(): BackendState {
  const [s, setS] = useState<BackendState>(shared);
  useEffect(() => {
    if (USE_MOCK) return;
    listeners.add(setS);
    if (listeners.size === 1) { probe(); timer = window.setInterval(probe, 15_000); }
    return () => { listeners.delete(setS); if (!listeners.size) window.clearInterval(timer); };
  }, []);
  return s;
}

/** Compact pill: "Live API · 12 ms" / "Backend offline" / "Demo mode". */
export function BackendStatusPill({ className, variant = 'light' }: { className?: string; variant?: 'light' | 'dark' }) {
  const s = useBackendStatus();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const meta = {
    live: { dot: 'bg-emerald-500', ring: 'bg-emerald-500/50', text: s.mode === 'live' ? `Live API · ${s.latencyMs} ms` : '', tone: variant === 'dark' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300', icon: Server },
    offline: { dot: 'bg-red-500', ring: 'bg-red-500/50', text: 'Backend offline', tone: variant === 'dark' ? 'border-red-400/30 bg-red-400/10 text-red-200' : 'border-red-500/30 bg-red-500/[0.08] text-red-700 dark:text-red-300', icon: ServerOff },
    mock: { dot: 'bg-amber-500', ring: '', text: 'Demo mode', tone: variant === 'dark' ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : 'border-amber-500/30 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300', icon: FlaskConical },
    checking: { dot: 'bg-slate-400', ring: 'bg-slate-400/50', text: 'Connecting…', tone: variant === 'dark' ? 'border-white/20 bg-white/5 text-slate-200' : 'border-line bg-surface-2 text-muted', icon: Activity },
  }[s.mode];
  const Icon = meta.icon;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button onClick={() => setOpen((v) => !v)} className={cn('flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition hover:brightness-105', meta.tone)} aria-label={`Backend status: ${meta.text}`}>
        <span className="relative flex h-2 w-2">
          {meta.ring && <span className={cn('absolute inline-flex h-full w-full animate-ping-soft rounded-full', meta.ring)} />}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', meta.dot)} />
        </span>
        <Icon className="hidden h-3.5 w-3.5 sm:block" />
        <span className="whitespace-nowrap tabular-nums">{meta.text}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 origin-top-right animate-scale-in rounded-2xl border border-line bg-surface p-4 text-left text-ink shadow-lift">
          <p className="text-sm font-semibold">System connection</p>
          <div className="mt-3 space-y-2 text-xs">
            <Row k="Frontend" v="React · Vite" ok />
            <Row k="Data source" v={s.mode === 'mock' ? 'In-browser mock' : `${API_BASE || '/api'}`} ok={s.mode !== 'offline'} />
            {s.mode === 'live' && <><Row k="Backend" v="Express · reachable" ok /><Row k="Round trip" v={`${s.latencyMs} ms`} ok /><Row k="Server demo mode" v={s.demoMode ? 'on' : 'off'} ok /></>}
            {s.mode === 'offline' && <p className="rounded-lg bg-red-500/[0.08] p-2 text-red-700 dark:text-red-300">Start it with <code className="font-mono">npm run dev</code> at the repo root.</p>}
            {s.mode === 'mock' && <p className="rounded-lg bg-amber-500/[0.08] p-2 text-amber-800 dark:text-amber-200">Set <code className="font-mono">VITE_API_BASE_URL=/api</code> in <code className="font-mono">frontend/.env.local</code> to use the backend.</p>}
          </div>
          {'checkedAt' in s && <p className="mt-3 text-[10px] text-muted">Checked {new Date(s.checkedAt).toLocaleTimeString('en-IN')}</p>}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, ok }: { k: string; v: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="flex items-center gap-1.5 font-medium"><span className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-emerald-500' : 'bg-red-500')} />{v}</span>
    </div>
  );
}
