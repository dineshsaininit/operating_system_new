import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Inbox, ShieldAlert, Sparkles, Lock, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Release } from '@/types';

// ───────────────────────────── CountUp ─────────────────────────────
/** Animates a number from 0 to its value (eased); respects reduced motion. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(value); return; }
    let raf = 0; const start = performance.now(); const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{n.toLocaleString('en-IN')}</>;
}

// ───────────────────────────── Button ─────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'ai' | 'white' | 'glass';
type BtnSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

const VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-gradient-to-b from-primary to-[rgb(var(--primary)/0.88)] text-white shadow-[0_6px_16px_-6px_rgb(var(--primary)/0.6)] hover:shadow-[0_10px_22px_-8px_rgb(var(--primary)/0.75)] hover:brightness-110',
  secondary: 'bg-surface-2 text-ink border border-line hover:bg-line/60',
  outline: 'border border-primary/40 text-primary hover:bg-primary/10',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white shadow-sm hover:brightness-110',
  success: 'bg-ok text-white shadow-sm hover:brightness-110',
  ai: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:brightness-110',
  white: 'bg-white text-navy-800 shadow-sm hover:bg-blue-50',
  glass: 'border border-white/20 bg-white/10 text-white hover:bg-white/20',
};
const SIZE: Record<BtnSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon: Icon, iconRight: IconRight, className, children, disabled, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      className={cn('inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition disabled:pointer-events-none disabled:opacity-50', VARIANT[variant], SIZE[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className={size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : null}
      {children}
      {IconRight && !loading && <IconRight className="h-4 w-4" />}
    </button>
  );
});

// ───────────────────────────── Card ─────────────────────────────
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...rest}>{children}</div>;
}

export function CardHeader({ title, subtitle, icon: Icon, action, className, iconClass }: { title: ReactNode; subtitle?: ReactNode; icon?: LucideIcon; action?: ReactNode; className?: string; iconClass?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary', iconClass)}><Icon className="h-[18px] w-[18px]" /></div>}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

// ───────────────────────────── Badge ─────────────────────────────
export type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'orange' | 'teal';
const TONES: Record<Tone, string> = {
  gray: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300',
  blue: 'bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300',
  green: 'bg-green-500/10 text-green-700 ring-green-500/25 dark:text-green-300',
  amber: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  red: 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300',
  purple: 'bg-purple-500/10 text-purple-700 ring-purple-500/25 dark:text-purple-300',
  orange: 'bg-orange-500/10 text-orange-700 ring-orange-500/25 dark:text-orange-300',
  teal: 'bg-teal-500/10 text-teal-700 ring-teal-500/25 dark:text-teal-300',
};

export function Badge({ tone = 'gray', children, className, dot, icon: Icon }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean; icon?: LucideIcon }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

const RELEASE_TONE: Record<Release, Tone> = { P0: 'blue', P1: 'teal', P2: 'amber', P3: 'gray', PT: 'purple' };
export function ReleaseBadge({ release, className }: { release: Release; className?: string }) {
  return <span title={`Planned release ${release}`} className={cn('rounded px-1.5 py-px font-mono text-[9px] font-bold ring-1 ring-inset', TONES[RELEASE_TONE[release]], className)}>{release}</span>;
}

export function DraftLabel() {
  return <Badge tone="orange" icon={Sparkles}>AI DRAFT</Badge>;
}

// ───────────────────────────── Form fields ─────────────────────────────
export function Field({ label, hint, error, children, required, className }: { label: string; hint?: string; error?: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}{required && <span className="text-danger"> *</span>}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-danger">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn('input', className)} {...p} />;
});
export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('input appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%2394a3b8%27 stroke-width=%272%27><path d=%27M4 6l4 4 4-4%27/></svg>")] bg-[right_0.6rem_center] bg-no-repeat pr-8', className)} {...p}>{children}</select>;
}
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('input min-h-[90px] resize-y leading-relaxed', className)} {...p} />;
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-center justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink">{label}</span>}
          {description && <span className="block text-xs text-muted">{description}</span>}
        </span>
      )}
      <button
        type="button" role="switch" aria-checked={checked} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-line')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

// ───────────────────────────── Tabs / segmented ─────────────────────────────
export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[]; className?: string }) {
  return (
    <div className={cn('nav-scroll flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-line', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.value} role="tab" aria-selected={value === it.value} onClick={() => onChange(it.value)}
          className={cn('flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            value === it.value ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink')}
        >
          {it.label}
          {it.count !== undefined && <span className={cn('rounded-full px-1.5 text-[10px]', value === it.value ? 'bg-primary/10 text-primary' : 'bg-line/70')}>{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────────── Modal / Drawer ─────────────────────────────
function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEsc(open, onClose);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-[80] flex animate-backdrop-in items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" className={cn('flex max-h-[92vh] w-full animate-scale-in flex-col rounded-t-2xl border border-line bg-surface shadow-lift sm:rounded-2xl', w)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2/50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEsc(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] animate-backdrop-in bg-slate-950/40 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className={cn('absolute right-0 top-0 flex h-full w-full animate-slide-in flex-col border-l border-line bg-surface shadow-lift', width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-ink">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-muted">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmation that requires a written reason — used for every reason-required action in the SRS. */
export function ReasonDialog({ open, onClose, onConfirm, title, label = 'Reason', confirmText = 'Confirm', tone = 'danger', presets }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<unknown> | void; title: string; label?: string; confirmText?: string; tone?: 'danger' | 'primary'; presets?: string[] }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(''); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle="A reason is required and is stored in the audit ledger." size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} disabled={!reason.trim()} loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(reason.trim()); onClose(); } finally { setBusy(false); } }}>{confirmText}</Button>
      </>}>
      {presets && <div className="mb-3 flex flex-wrap gap-1.5">{presets.map((p) => <button key={p} onClick={() => setReason(p)} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:border-primary hover:text-primary">{p}</button>)}</div>}
      <Field label={label} required><Textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Write a short reason…" /></Field>
    </Modal>
  );
}

// ───────────────────────────── States ─────────────────────────────
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted ring-1 ring-line"><Icon className="h-6 w-6" /></div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
        </div>
      ))}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'blue', hint, onClick, trend }: { label: string; value: ReactNode; icon: LucideIcon; tone?: Tone; hint?: ReactNode; onClick?: () => void; trend?: ReactNode }) {
  const ring: Record<Tone, string> = {
    blue: 'from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-300', green: 'from-green-500/15 to-green-500/5 text-green-600 dark:text-green-300',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-300', red: 'from-red-500/15 to-red-500/5 text-red-600 dark:text-red-300',
    purple: 'from-purple-500/15 to-purple-500/5 text-purple-600 dark:text-purple-300', gray: 'from-slate-500/15 to-slate-500/5 text-slate-600 dark:text-slate-300',
    orange: 'from-orange-500/15 to-orange-500/5 text-orange-600 dark:text-orange-300', teal: 'from-teal-500/15 to-teal-500/5 text-teal-600 dark:text-teal-300',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={cn('card group relative flex w-full items-start justify-between gap-3 overflow-hidden p-4 text-left lift')}>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink tabular-nums">{typeof value === 'number' ? <CountUp value={value} /> : value}</p>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        {trend}
      </div>
      <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110', ring[tone])}><Icon className="h-5 w-5" /></div>
      <span className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-current opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-[0.07]" />
    </Comp>
  );
}

export function PageHeader({ title, subtitle, actions, screen, release, env }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; screen?: string; release?: Release; env?: 'executive' | 'governance' | 'private' | 'platform' | 'public' }) {
  const envTone: Record<string, Tone> = { executive: 'blue', governance: 'green', private: 'purple', platform: 'gray', public: 'teal' };
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {env && <Badge tone={envTone[env]} dot>{env === 'executive' ? 'Executive OS' : env === 'governance' ? 'Governance OS' : env === 'private' ? 'Private OS' : env === 'public' ? 'Public' : 'Platform'}</Badge>}
          {screen && <span className="font-mono text-[10px] font-semibold text-muted">{screen}</span>}
          {release && <ReleaseBadge release={release} />}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AuthorizationBanner({ decision = 'DEC-006', children }: { decision?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
      <div className="text-ink/90">
        <span className="font-semibold">Concept on synthetic data.</span>{' '}
        {children ?? <>Live data requires written authorization for each source ({decision}). Source times are shown on every number.</>}
      </div>
    </div>
  );
}

export function InfoNote({ children, icon: Icon = Lock, tone = 'blue' }: { children: ReactNode; icon?: LucideIcon; tone?: 'blue' | 'amber' | 'red' | 'purple' | 'gray' }) {
  const t = { blue: 'text-primary bg-primary/[0.06] border-primary/20', amber: 'text-warn bg-amber-500/[0.07] border-amber-500/25', red: 'text-danger bg-red-500/[0.06] border-red-500/20', purple: 'text-priv bg-purple-500/[0.06] border-purple-500/20', gray: 'text-muted bg-surface-2 border-line' }[tone];
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs', t)}>
      <Icon className="mt-px h-4 w-4 shrink-0" />
      <div className="text-ink/80">{children}</div>
    </div>
  );
}

export function Progress({ value, max = 100, tone = 'blue', className }: { value: number; max?: number; tone?: Tone; className?: string }) {
  const c: Record<Tone, string> = { blue: 'bg-blue-500', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-purple-500', gray: 'bg-slate-400', orange: 'bg-orange-500', teal: 'bg-teal-500' };
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-line/70', className)}>
      <div className={cn('h-full rounded-full transition-all duration-1000 ease-out', c[tone])} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

export function Avatar({ name, className, tone }: { name: string; className?: string; tone?: string }) {
  const initials = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const palette = ['from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-rose-500', 'from-purple-500 to-fuchsia-600', 'from-sky-500 to-cyan-600', 'from-amber-500 to-orange-600'];
  const idx = [...name].reduce((n, c) => n + c.charCodeAt(0), 0) % palette.length;
  return <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xs font-bold text-white', tone ?? palette[idx], className)}>{initials}</div>;
}

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-x-auto', className)}>{children}</div>;
}

export function KeyValue({ items, className }: { items: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items.map(([k, v]) => (
        <div key={k}><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</dt><dd className="mt-0.5 text-sm text-ink">{v}</dd></div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{children}</h2>
      {action}
    </div>
  );
}
