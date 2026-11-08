import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: number; tone: Tone; title: string; body?: string }

const Ctx = createContext<{ toast: (tone: Tone, title: string, body?: string) => void; run: <T>(p: Promise<T>, ok: string, okBody?: string) => Promise<T | undefined> } | null>(null);

const ICON = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const TONE = {
  success: 'border-ok/30 text-ok',
  error: 'border-danger/30 text-danger',
  info: 'border-primary/30 text-primary',
  warning: 'border-warn/30 text-warn',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const toast = useCallback((tone: Tone, title: string, body?: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, tone, title, body }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), tone === 'error' ? 6500 : 4000);
  }, []);

  /** Runs an API promise, shows success or the server's error message. */
  const run = useCallback(async <T,>(p: Promise<T>, ok: string, okBody?: string) => {
    try { const r = await p; toast('success', ok, okBody ?? 'Recorded in the audit ledger'); return r; }
    catch (e) { toast('error', 'Action not completed', (e as Error).message); return undefined; }
  }, [toast]);

  return (
    <Ctx.Provider value={{ toast, run }}>
      {children}
      <div className="fixed bottom-20 right-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 md:bottom-5" role="status" aria-live="polite">
        {items.map((t) => {
          const I = ICON[t.tone];
          return (
            <div key={t.id} className={cn('relative flex animate-toast-in items-start gap-3 overflow-hidden rounded-xl border bg-surface/95 p-3.5 shadow-lift backdrop-blur', TONE[t.tone])}>
              <I className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs text-muted">{t.body}</p>}
              </div>
              <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} className="text-muted hover:text-ink" aria-label="Dismiss"><X className="h-4 w-4" /></button>
              <span className="absolute bottom-0 left-0 h-0.5 w-full origin-left bg-current opacity-40" style={{ animation: `toast-timer ${t.tone === 'error' ? 6.5 : 4}s linear forwards` }} />
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used inside ToastProvider');
  return c;
}
