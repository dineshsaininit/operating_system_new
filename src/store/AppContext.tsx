import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, RoleId, Session } from '@/types';
import { api } from '@/services/api';
import { translate, type StringKey } from '@/i18n/strings';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
  session: Session | null;
  signIn: (role: RoleId, device: string) => Promise<Session>;
  signOut: () => Promise<void>;
  switchRole: (role: RoleId) => Promise<void>;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: StringKey) => string;
  theme: Theme;
  setTheme: (t: Theme) => void;
  textScale: number;
  setTextScale: (n: number) => void;
  online: boolean;
  paletteOpen: boolean;
  setPaletteOpen: (b: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (b: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    // sessionStorage: a closed tab ends the session (session timeout behaviour for shared office devices)
    try { const s = sessionStorage.getItem('aasiom.session'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [lang, setLangState] = useState<Lang>(() => read('aasiom.lang', 'en'));
  const [theme, setThemeState] = useState<Theme>(() => read('aasiom.theme', 'system'));
  const [textScale, setTextScaleState] = useState<number>(() => read('aasiom.textScale', 100));
  const [online, setOnline] = useState(navigator.onLine);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => { if (session) api.auth.resume(session); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => root.classList.toggle('dark', theme === 'dark' || (theme === 'system' && mq.matches));
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => { document.documentElement.style.fontSize = `${textScale}%`; }, [textScale]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const persistSession = (s: Session | null) => {
    setSession(s);
    try { s ? sessionStorage.setItem('aasiom.session', JSON.stringify(s)) : sessionStorage.removeItem('aasiom.session'); } catch { /* ignore */ }
  };

  const signIn = useCallback(async (role: RoleId, device: string) => {
    const s = await api.auth.signIn(role, device);
    persistSession(s);
    return s;
  }, []);

  const signOut = useCallback(async () => { await api.auth.signOut(); persistSession(null); }, []);
  const switchRole = useCallback(async (role: RoleId) => { await signIn(role, session?.deviceName ?? 'Demo device'); }, [signIn, session]);

  const value = useMemo<AppState>(() => ({
    session, signIn, signOut, switchRole,
    lang, setLang: (l) => { setLangState(l); write('aasiom.lang', l); },
    t: (k) => translate(k, lang),
    theme, setTheme: (t) => { const r = document.documentElement; r.classList.add('theme-anim'); setThemeState(t); write('aasiom.theme', t); window.setTimeout(() => r.classList.remove('theme-anim'), 450); },
    textScale, setTextScale: (n) => { setTextScaleState(n); write('aasiom.textScale', n); },
    online, paletteOpen, setPaletteOpen, shortcutsOpen, setShortcutsOpen,
  }), [session, signIn, signOut, switchRole, lang, theme, textScale, online, paletteOpen, shortcutsOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}
