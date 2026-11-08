import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, Moon, Sun, Languages, Keyboard, LogOut, ClipboardList, Inbox, Users } from 'lucide-react';
import { ALL_NAV_ITEMS, canAccess } from '@/config/navigation';
import { useApp } from '@/store/AppContext';
import { db } from '@/data/mockDb';
import { cn } from '@/lib/utils';
import { ReleaseBadge } from '@/components/ui';

interface Cmd { id: string; group: string; label: string; hint?: string; icon: React.ComponentType<{ className?: string }>; run: () => void; extra?: React.ReactNode }

/** Global Ctrl/⌘+K palette: jump to any permitted screen, search records, run quick actions. */
export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, session, setTheme, theme, setLang, lang, setShortcutsOpen, signOut } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [paletteOpen]);

  const role = session?.user.role;
  const cmds = useMemo<Cmd[]>(() => {
    if (!role) return [];
    const go = (p: string) => () => { nav(p); setPaletteOpen(false); };
    const screens: Cmd[] = ALL_NAV_ITEMS.filter((i) => canAccess(role, i.path)).map((i) => ({
      id: i.key, group: 'Screens', label: i.label, hint: `${i.screen} · ${i.keywords ?? ''}`, icon: i.icon, run: go(i.path), extra: <ReleaseBadge release={i.release} />,
    }));
    const records: Cmd[] = [];
    if (['ROLE-01', 'ROLE-02'].includes(role)) {
      db.tasks.forEach((t) => records.push({ id: t.id, group: 'Tasks', label: `${t.id} · ${t.title}`, hint: t.ownerPost, icon: ClipboardList, run: go(`/exec/tasks?open=${t.id}`) }));
    }
    if (role === 'ROLE-02') {
      db.requests.forEach((r) => records.push({ id: r.id, group: 'Requests', label: `${r.id} · ${r.visitorName}`, hint: r.purpose, icon: Inbox, run: go(`/pa/inbox?open=${r.id}`) }));
      db.visitors.forEach((v) => records.push({ id: v.id, group: 'Visitors', label: v.name, hint: v.mobile, icon: Users, run: go(`/pa/visitors/${v.id}`) }));
    }
    const actions: Cmd[] = [
      { id: 'theme', group: 'Actions', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', icon: theme === 'dark' ? Sun : Moon, run: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); setPaletteOpen(false); } },
      { id: 'lang', group: 'Actions', label: `Language: cycle (now ${lang.toUpperCase()})`, icon: Languages, run: () => { setLang(lang === 'en' ? 'mr' : lang === 'mr' ? 'hi' : 'en'); } },
      { id: 'keys', group: 'Actions', label: 'Keyboard shortcuts', icon: Keyboard, run: () => { setPaletteOpen(false); setShortcutsOpen(true); } },
      { id: 'out', group: 'Actions', label: 'Sign out', icon: LogOut, run: async () => { setPaletteOpen(false); await signOut(); nav('/'); } },
    ];
    return [...screens, ...records, ...actions];
  }, [role, theme, lang, nav, setPaletteOpen, setTheme, setLang, setShortcutsOpen, signOut]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? cmds.filter((c) => (c.label + ' ' + (c.hint ?? '') + ' ' + c.group).toLowerCase().includes(s)) : cmds.filter((c) => c.group !== 'Tasks' && c.group !== 'Requests' && c.group !== 'Visitors');
    return list.slice(0, 40);
  }, [q, cmds]);

  useEffect(() => setIdx(0), [q]);

  if (!paletteOpen) return null;

  const groups = filtered.reduce<Record<string, Cmd[]>>((acc, c) => { (acc[c.group] ||= []).push(c); return acc; }, {});
  let running = -1;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex animate-backdrop-in items-start justify-center bg-slate-950/50 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setPaletteOpen(false)}>
      <div className="w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-lift" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-muted" />
          <input
            ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search screens, tasks, requests, visitors…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(filtered.length - 1, i + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === 'Enter') filtered[idx]?.run();
              if (e.key === 'Escape') setPaletteOpen(false);
            }}
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">No results for “{q}”</p>}
          {Object.entries(groups).map(([g, items]) => (
            <div key={g} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted">{g}</p>
              {items.map((c) => {
                running += 1;
                const i = running;
                const I = c.icon;
                return (
                  <button key={c.group + c.id} onMouseEnter={() => setIdx(i)} onClick={c.run}
                    className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', idx === i ? 'bg-primary/10 text-ink' : 'text-ink/90')}>
                    <I className={cn('h-4 w-4 shrink-0', idx === i ? 'text-primary' : 'text-muted')} />
                    <span className="min-w-0 flex-1 truncate text-sm">{c.label}</span>
                    {c.extra}
                    {idx === i && <CornerDownLeft className="h-3.5 w-3.5 text-muted" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-line bg-surface-2/60 px-4 py-2 text-[11px] text-muted">
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span className="ml-auto">Only screens your role may open are listed</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
