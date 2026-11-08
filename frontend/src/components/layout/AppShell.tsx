import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, Search, Menu, X, ChevronDown, LogOut, Moon, Sun, Monitor, Languages, Type, WifiOff, Siren, Plane,
  FlaskConical, Keyboard, UserCircle, Repeat2, RotateCcw, Command, Sun as TodayIcon, Gavel, Sparkles, LayoutGrid,
} from 'lucide-react';
import { NAV, ROLE_META, canAccess } from '@/config/navigation';
import { useApp } from '@/store/AppContext';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { resetDemoData } from '@/data/mockDb';
import { cn, relative } from '@/lib/utils';
import { LANG_LABEL } from '@/i18n/strings';
import { Avatar, Badge, Modal, ReleaseBadge } from '@/components/ui';
import { CommandPalette } from './CommandPalette';
import { BackendStatusPill } from '@/components/BackendStatus';
import type { Lang, RoleId } from '@/types';

/**
 * Each role only fetches what it is entitled to — the backend enforces RBAC and answers 403 otherwise.
 * Keep these lists in step with the backend's `allow(...)` guards.
 */
const CAN_SEE = {
  decide: ['ROLE-01', 'ROLE-02'],
  requests: ['ROLE-01', 'ROLE-02'],
  queue: ['ROLE-01', 'ROLE-02', 'ROLE-04'],
  emergency: ['ROLE-01', 'ROLE-02'],
  absence: ['ROLE-01', 'ROLE-02'],
} satisfies Record<string, RoleId[]>;
const none = <T,>(v: T) => Promise.resolve(v);

function useCounts() {
  const { session } = useApp();
  const role = session!.user.role;
  const may = (k: keyof typeof CAN_SEE) => (CAN_SEE[k] as RoleId[]).includes(role);
  const { data: decide } = useApi(() => (may('decide') ? api.decide.list() : none([])), [role]);
  const { data: reqs } = useApi(() => (may('requests') ? api.requests.list() : none([])), [role]);
  const { data: queue } = useApi(() => (may('queue') ? api.queue.list() : none([])), [role]);
  const { data: notes } = useApi(() => api.notifications.list(), [role]);
  return {
    decide: decide?.length ?? 0,
    inbox: reqs?.filter((r) => r.status === 'requested').length ?? 0,
    queue: queue?.filter((q) => q.status === 'waiting').length ?? 0,
    notifications: notes?.filter((n) => !n.read).length ?? 0,
    notes: notes ?? [],
  };
}

function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 shadow-lg shadow-blue-900/40 transition-transform duration-500 hover:rotate-[8deg] hover:scale-110">
        <svg viewBox="0 0 64 64" className="h-5 w-5"><path d="M32 10 52 52H41.5L32 31 22.5 52H12Z" fill="#fff" /><circle cx="32" cy="45" r="4.5" fill="#F59E0B" /></svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight text-white">AASIOM</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200/70">Command OS</p>
        </div>
      )}
    </Link>
  );
}

function Sidebar({ onNavigate, counts }: { onNavigate?: () => void; counts: ReturnType<typeof useCounts> }) {
  const { session, t } = useApp();
  const role = session!.user.role;
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(role)) })).filter((s) => s.items.length);
  const envDot: Record<string, string> = { executive: 'bg-blue-400', governance: 'bg-green-400', platform: 'bg-slate-400' };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-navy-800 to-navy-900 text-slate-300">
      <div className="flex h-16 items-center px-5"><Logo /></div>
      <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Office</p>
        <p className="mt-0.5 text-sm font-semibold text-white">DMC Zone II (synthetic)</p>
        <p className="text-[11px] text-slate-400">Wards W1–W4 · BMC</p>
      </div>
      <nav className="nav-scroll flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {sections.map((s) => (
          <div key={s.title}>
            <p className="mb-1.5 flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <span className={cn('h-1.5 w-1.5 rounded-full', envDot[s.env])} />{s.title}
            </p>
            <div className="space-y-0.5">
              {s.items.map((i) => {
                const count = i.badge ? counts[i.badge] : 0;
                return (
                  <NavLink
                    key={i.key} to={i.path} end={i.path === '/pa' || i.path === '/private'} onClick={onNavigate}
                    className={({ isActive }) => cn(
                      'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition',
                      isActive && !i.path.includes('#') ? 'relative bg-gradient-to-r from-blue-500/25 to-blue-500/[0.04] text-white ring-1 ring-white/10 before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-1 before:rounded-r-full before:bg-blue-400 before:shadow-[0_0_12px_2px_rgb(96_165_250/0.6)]' : 'text-slate-300/90 hover:translate-x-0.5 hover:bg-white/[0.06] hover:text-white',
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <i.icon className={cn('h-[17px] w-[17px] shrink-0', isActive && !i.path.includes('#') ? 'text-blue-300' : 'text-slate-400 group-hover:text-slate-200')} />
                        <span className="flex-1 truncate">{i.i18n ? t(i.i18n) : i.label}</span>
                        {count > 0 && <span className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-1.5 py-px text-[10px] font-bold text-white shadow-[0_0_10px_rgb(59_130_246/0.5)]">{count}</span>}
                        {i.release !== 'P0' && <ReleaseBadge release={i.release} className="opacity-70" />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3 text-[10px] leading-relaxed text-slate-500">
        SRS v1.1 · Final planning draft<br />Full stack · synthetic data only
      </div>
    </div>
  );
}

function NotificationPopover({ counts, onClose }: { counts: ReturnType<typeof useCounts>; onClose: () => void }) {
  const nav = useNavigate();
  const tierTone = { interrupt: 'red', normal: 'blue', digest: 'gray' } as const;
  return (
    <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-1.5rem))] origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm font-semibold">Notifications</p>
        <button className="text-xs font-semibold text-primary" onClick={() => api.notifications.markAllRead()}>Mark all read</button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {counts.notes.slice(0, 7).map((n) => (
          <button key={n.id} onClick={() => { api.notifications.markRead(n.id); if (n.link) nav(n.link); onClose(); }}
            className={cn('flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left hover:bg-surface-2', !n.read && 'bg-primary/[0.04]')}>
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{n.title}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge tone={tierTone[n.tier]}>{n.tier}</Badge>
                {n.held && <Badge tone="purple">held</Badge>}
                <span className="text-[11px] text-muted">{relative(n.at)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <Link to="/notifications" onClick={onClose} className="block bg-surface-2/60 py-2.5 text-center text-xs font-semibold text-primary hover:underline">Open notification centre</Link>
    </div>
  );
}

function UserMenu({ onClose }: { onClose: () => void }) {
  const { session, signOut, switchRole, theme, setTheme, lang, setLang, textScale, setTextScale, setShortcutsOpen } = useApp();
  const nav = useNavigate();
  const [roleOpen, setRoleOpen] = useState(false);
  const roles: RoleId[] = ['ROLE-01', 'ROLE-02', 'ROLE-03', 'ROLE-04', 'ROLE-05', 'ROLE-06', 'ROLE-07', 'ROLE-08', 'ROLE-09', 'ROLE-10', 'ROLE-11'];
  const u = session!.user;
  return (
    <div className="absolute right-0 top-12 z-50 w-72 origin-top-right animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <Avatar name={u.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{u.name}</p>
          <p className="truncate text-xs text-muted">{u.post}</p>
          <Badge tone="blue" className="mt-1">{u.role} · {ROLE_META[u.role].short}</Badge>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <div>
          <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted">Theme</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
            {([['light', Sun], ['dark', Moon], ['system', Monitor]] as const).map(([k, I]) => (
              <button key={k} onClick={() => setTheme(k)} className={cn('flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium capitalize', theme === k ? 'bg-surface text-ink shadow-sm' : 'text-muted')}><I className="h-3.5 w-3.5" />{k}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 flex items-center gap-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted"><Languages className="h-3 w-3" /> Language</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
            {(['en', 'mr', 'hi'] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={cn('rounded-md py-1.5 text-xs font-medium', lang === l ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>{LANG_LABEL[l]}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-muted"><span className="flex items-center gap-1"><Type className="h-3 w-3" /> Text size</span><span>{textScale}%</span></p>
          <input type="range" min={90} max={200} step={10} value={textScale} onChange={(e) => setTextScale(Number(e.target.value))} className="w-full accent-[rgb(var(--primary))]" aria-label="Text size" />
        </div>
      </div>
      <div className="border-t border-line p-1.5">
        <button onClick={() => setRoleOpen((v) => !v)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"><Repeat2 className="h-4 w-4 text-muted" />Switch demo role<ChevronDown className={cn('ml-auto h-4 w-4 text-muted transition', roleOpen && 'rotate-180')} /></button>
        {roleOpen && (
          <div className="max-h-56 overflow-y-auto px-1.5 pb-1">
            {roles.map((r) => (
              <button key={r} onClick={async () => { await switchRole(r); onClose(); nav(ROLE_META[r].home); }}
                className={cn('flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-surface-2', r === u.role && 'text-primary')}>
                <span>{ROLE_META[r].name}</span><span className="font-mono text-[10px] text-muted">{r}</span>
              </button>
            ))}
          </div>
        )}
        <Link to="/account" onClick={onClose} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"><UserCircle className="h-4 w-4 text-muted" />Account & devices</Link>
        <button onClick={() => { onClose(); setShortcutsOpen(true); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"><Keyboard className="h-4 w-4 text-muted" />Keyboard shortcuts</button>
        <button onClick={() => { if (confirm('Reset all synthetic demo data to its original state?')) resetDemoData(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"><RotateCcw className="h-4 w-4 text-muted" />Reset demo data</button>
        <button onClick={async () => { await signOut(); nav('/'); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-red-500/10"><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </div>
  );
}

function useOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

function Banners() {
  const { online, session } = useApp();
  const role = session!.user.role;
  const { data: em } = useApi(() => ((CAN_SEE.emergency as RoleId[]).includes(role) ? api.governance.emergency() : none(null)), [role]);
  const { data: absence } = useApi(() => ((CAN_SEE.absence as RoleId[]).includes(role) ? api.absence.get() : none(null)), [role]);
  return (
    <>
      {em?.active && (
        <Link to={canAccess(role, '/gov/emergency') ? '/gov/emergency' : '#'} className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-sm font-bold text-white">
          <Siren className="h-4 w-4 animate-pulse" /> EMERGENCY MODE: {em.title} · declared {relative(em.declaredAt!)} — queue paused, Peace Mode overridden
        </Link>
      )}
      {absence?.active && ['ROLE-01', 'ROLE-02'].includes(role) && (
        <Link to="/exec/absence" className="flex items-center justify-center gap-2 bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white">
          <Plane className="h-3.5 w-3.5" /> Absence mode on — {absence.delegationRecord ? `routing under delegation ${absence.delegationRecord}` : `${absence.heldItems} items held (no delegation record)`}
        </Link>
      )}
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white">
          <WifiOff className="h-3.5 w-3.5" /> You are offline — showing cached data; actions that need the server are disabled
        </div>
      )}
    </>
  );
}

function ExecBottomTabs() {
  const { t } = useApp();
  const items = [
    { to: '/exec/today', label: t('today'), icon: TodayIcon },
    { to: '/exec/decide', label: t('decide'), icon: Gavel },
    { to: '/exec/ask', label: t('ask'), icon: Sparkles },
    { to: '/exec/office', label: t('office'), icon: LayoutGrid },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', isActive ? 'text-primary' : 'text-muted')}>
          <i.icon className="h-5 w-5" />{i.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function ShortcutsModal() {
  const { shortcutsOpen, setShortcutsOpen } = useApp();
  const rows: [string, string][] = [
    ['Ctrl / ⌘ + K', 'Command palette — search & jump'],
    ['?', 'Show this help'],
    ['G then T', 'Go to Today'], ['G then D', 'Go to Decide'], ['G then K', 'Go to Tasks'], ['G then Q', 'Go to Queue'],
    ['G then C', 'Go to Calendar'], ['G then N', 'Go to Notifications'], ['G then A', 'Go to Ask assistant'],
    ['Esc', 'Close dialogs and panels'],
  ];
  return (
    <Modal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title="Keyboard shortcuts" subtitle="Desktop keyboard navigation (accessibility NFR)" size="sm">
      <div className="divide-y divide-line">
        {rows.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between py-2.5 text-sm"><span className="text-muted">{d}</span><span className="kbd text-[11px]">{k}</span></div>
        ))}
      </div>
    </Modal>
  );
}

function useGlobalShortcuts() {
  const { setPaletteOpen, setShortcutsOpen, session } = useApp();
  const nav = useNavigate();
  useEffect(() => {
    let g = false; let timer: number | undefined;
    const map: Record<string, string> = { t: '/exec/today', d: '/exec/decide', k: '/exec/tasks', q: session?.user.role === 'ROLE-02' ? '/pa/queue' : '/exec/queue', c: session?.user.role === 'ROLE-02' ? '/pa/calendar' : '/exec/calendar', n: '/notifications', a: '/exec/ask' };
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true); return; }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === '?') { setShortcutsOpen(true); return; }
      if (g && map[e.key.toLowerCase()]) { nav(map[e.key.toLowerCase()]); g = false; return; }
      if (e.key.toLowerCase() === 'g') { g = true; clearTimeout(timer); timer = window.setTimeout(() => (g = false), 1200); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [nav, setPaletteOpen, setShortcutsOpen, session]);
}

export function SyntheticStrip() {
  const { t } = useApp();
  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-400/15 px-3 py-1 text-[10.5px] font-bold tracking-wide text-amber-800 dark:text-amber-300">
      <FlaskConical className="h-3 w-3" /> {t('syntheticBanner')}
    </div>
  );
}

export default function AppShell({ children }: { children?: ReactNode }) {
  const { session, setPaletteOpen, t } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const counts = useCounts();
  const loc = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  useOutside(notifRef, () => setNotifOpen(false));
  useOutside(userRef, () => setUserOpen(false));
  useGlobalShortcuts();

  useEffect(() => { setMobileOpen(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const u = session!.user;
  const isExec = u.role === 'ROLE-01';
  const [clock, setClock] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setClock(new Date()), 30_000); return () => clearInterval(i); }, []);

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] lg:block"><Sidebar counts={counts} /></aside>
      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] animate-fade-in">
            <Sidebar counts={counts} onNavigate={() => setMobileOpen(false)} />
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-300 hover:bg-white/10" aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[264px]">
        <SyntheticStrip />
        <Banners />
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <button onClick={() => setPaletteOpen(true)} className="group flex h-10 max-w-md flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface-2/70 px-3 text-sm text-muted transition hover:border-primary/40">
            <Search className="h-4 w-4" /><span className="flex-1 truncate text-left">{t('search')}</span>
            <span className="hidden items-center gap-0.5 sm:flex"><span className="kbd flex items-center"><Command className="h-2.5 w-2.5" /></span><span className="kbd">K</span></span>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <BackendStatusPill className="mr-1 hidden sm:block" />
            <div className="mr-2 hidden text-right xl:block">
              <p className="text-sm font-semibold tabular-nums text-ink">{clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
              <p className="text-[11px] text-muted">{clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
            </div>
            <div ref={notifRef} className="relative">
              <button onClick={() => setNotifOpen((v) => !v)} className="relative rounded-xl p-2.5 text-muted transition hover:bg-surface-2 hover:text-ink" aria-label={`Notifications, ${counts.notifications} unread`}>
                <Bell key={counts.notifications} className={cn('h-5 w-5', counts.notifications > 0 && 'animate-wiggle')} />
                {counts.notifications > 0 && <><span className="absolute right-1.5 top-1.5 h-4 w-4 animate-ping-soft rounded-full bg-danger/60" /><span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-surface">{counts.notifications}</span></>}
              </button>
              {notifOpen && <NotificationPopover counts={counts} onClose={() => setNotifOpen(false)} />}
            </div>
            <div ref={userRef} className="relative">
              <button onClick={() => setUserOpen((v) => !v)} className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition hover:bg-surface-2">
                <Avatar name={u.name} className="h-8 w-8" />
                <div className="hidden text-left md:block">
                  <p className="max-w-[160px] truncate text-[13px] font-semibold leading-tight text-ink">{u.name.replace(' (synthetic)', '')}</p>
                  <p className="text-[11px] leading-tight text-muted">{ROLE_META[u.role].name}</p>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-muted md:block" />
              </button>
              {userOpen && <UserMenu onClose={() => setUserOpen(false)} />}
            </div>
          </div>
        </header>
        <div key={`p-${loc.pathname}`} className="route-progress pointer-events-none fixed left-0 right-0 top-0 z-[60] h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 lg:left-[264px]" />
        <main className={cn('mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8', isExec && 'pb-24 md:pb-8')}>
          <div key={loc.pathname} className="page-enter">{children ?? <Outlet />}</div>
        </main>
      </div>
      {isExec && <ExecBottomTabs />}
      <CommandPalette />
      <ShortcutsModal />
    </div>
  );
}
