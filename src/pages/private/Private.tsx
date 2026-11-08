import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Fingerprint, Lock, ShieldCheck, LogOut, Wallet, CalendarClock, Plus, Upload, FolderLock, FileText, KeyRound, Loader2, Eye, Download, Info, CalendarHeart, Users, Receipt, FileCheck2, AlertTriangle, Moon, Sun } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { PRIVATE_NAV } from '@/config/navigation';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, CardHeader, Field, InfoNote, Input, KeyValue, Modal, PageHeader, Select, SkeletonList, StatCard, TableWrap, Tabs, Toggle } from '@/components/ui';
import { AXIS, ChartCard, ChartTooltip, GRID, SERIES } from '@/components/charts';
import { SyntheticStrip } from '@/components/layout/AppShell';
import { cn, daysBetween, downloadCsv, fmtDate, fmtDateTime, fmtTime, inr } from '@/lib/utils';
import type { Holding } from '@/types';

/** The Private app is a separate environment: own identity, own keys, own store. It never reads official data. */
export function PrivateShell() {
  const { signOut, theme, setTheme } = useApp();
  const nav = useNavigate();
  const [unlocked, setUnlocked] = useState(() => { try { return sessionStorage.getItem('aasiom.private.unlocked') === '1'; } catch { return false; } });
  if (!unlocked) return <PrivateUnlock onUnlock={() => { try { sessionStorage.setItem('aasiom.private.unlocked', '1'); } catch { /* ignore */ } setUnlocked(true); }} />;
  return (
    <div className="min-h-full bg-bg">
      <SyntheticStrip />
      <header className="sticky top-0 z-20 bg-gradient-to-r from-[#2a1145] via-[#3b1764] to-[#4c1d7a] text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-sm font-bold">Private Wealth & Life</p><p className="text-[10px] uppercase tracking-wider text-purple-200">Separate app · own keys</p></div></div>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-lg p-2 hover:bg-white/10" aria-label="Toggle theme">{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            <Button size="sm" variant="ghost" className="text-purple-100 hover:bg-white/10 hover:text-white" icon={Lock} onClick={() => { try { sessionStorage.removeItem('aasiom.private.unlocked'); } catch { /* ignore */ } setUnlocked(false); }}>Lock</Button>
            <Button size="sm" variant="ghost" className="text-purple-100 hover:bg-white/10 hover:text-white" icon={LogOut} onClick={async () => { try { sessionStorage.removeItem('aasiom.private.unlocked'); } catch { /* ignore */ } await signOut(); nav('/'); }}>Sign out</Button>
          </div>
        </div>
        <nav className="nav-scroll mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {PRIVATE_NAV.map((i) => (
            <NavLink key={i.key} to={i.path} end={i.path === '/private'} className={({ isActive }) => cn('flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold', isActive ? 'bg-white text-purple-900' : 'text-purple-100 hover:bg-white/10')}>
              <i.icon className="h-3.5 w-3.5" />{i.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
    </div>
  );
}

function PrivateUnlock({ onUnlock }: { onUnlock: () => void }) {
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const unlock = () => {
    if (cooldown) return;
    setBusy(true);
    setTimeout(() => { setBusy(false); onUnlock(); }, 900);
  };
  return (
    <div className="grid min-h-full place-items-center bg-gradient-to-br from-[#1d0b33] via-[#2e1150] to-[#4c1d7a] p-6 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10"><ShieldCheck className="h-8 w-8" /></div>
        <h1 className="mt-5 text-2xl font-bold">Private Wealth & Life</h1>
        <p className="mt-1 text-sm text-purple-200">SCR-46 · Separate app with its own identity and client-held keys. No official data enters here.</p>
        <button onClick={unlock} disabled={busy || !!cooldown} className="mx-auto mt-10 grid h-28 w-28 place-items-center rounded-full bg-white/10 ring-4 ring-white/20 transition hover:bg-white/15 disabled:opacity-50">
          {busy ? <Loader2 className="h-12 w-12 animate-spin" /> : <Fingerprint className="h-14 w-14" />}
        </button>
        <p className="mt-4 text-sm font-medium">{busy ? 'Decrypting…' : cooldown ? `Too many attempts — wait ${cooldown}s` : 'Unlock with passkey or biometrics'}</p>
        <button className="mt-8 text-xs text-purple-200 underline" onClick={() => { const n = fails + 1; setFails(n); if (n >= 3) { setCooldown(30); const t = setInterval(() => setCooldown((c) => { if (c <= 1) { clearInterval(t); setFails(0); return 0; } return c - 1; }), 1000); } }}>Simulate a failed attempt ({fails}/3)</button>
        <p className="mt-2 text-xs text-purple-300"><KeyRound className="mr-1 inline h-3 w-3" />Recovery uses your offline recovery kit</p>
      </div>
    </div>
  );
}

const KIND_TONE = { Insurance: 'blue', EMI: 'amber', Declaration: 'purple', Tax: 'red', Health: 'green', Property: 'teal' } as const;

export function PrivateDashboard() {
  const { data, loading } = useApi(() => api.private.dashboard());
  if (loading || !data) return <Card><SkeletonList /></Card>;
  const net = data.holdings.reduce((n, h) => n + h.value, 0);
  const debt = data.liabilities.reduce((n, l) => n + l.outstanding, 0);
  const dues = data.dues.slice().sort((a, b) => +new Date(a.due) - +new Date(b.due));
  return (
    <div className="animate-fade-in">
      <PageHeader title="Due soon" subtitle="Renewals, EMIs, declarations and reminders for the next 60 days." screen="SCR-47" release="PT" env="private" />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Recorded holdings" value={inr(net)} icon={Wallet} tone="purple" hint="values as of statement dates" />
        <StatCard label="Outstanding loans" value={inr(debt)} icon={AlertTriangle} tone="amber" />
        <StatCard label="Due in 30 days" value={dues.filter((d) => -daysBetween(d.due) <= 30).length} icon={CalendarClock} tone="blue" />
        <StatCard label="Declarations to prepare" value={dues.filter((d) => d.kind === 'Declaration').length} icon={FileCheck2} tone="red" />
      </div>
      <Card>
        <CardHeader title="Next 60 days" icon={CalendarClock} iconClass="bg-purple-500/10 text-priv" />
        <div className="divide-y divide-line">
          {dues.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-center ring-1 ring-line"><div><p className="text-sm font-bold leading-none">{new Date(d.due).getDate()}</p><p className="text-[10px] uppercase text-muted">{new Date(d.due).toLocaleDateString('en-IN', { month: 'short' })}</p></div></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">{d.title}</p><p className="text-xs text-muted">in {-daysBetween(d.due)} days{d.amount ? ` · ${inr(d.amount)}` : ''}</p></div>
              <Badge tone={KIND_TONE[d.kind]}>{d.kind}</Badge>{d.verifyRule && <Badge tone="amber">verify rule</Badge>}
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-5"><InfoNote tone="purple" icon={Info}>Holdings are a record only — no investment recommendations, ever.</InfoNote></div>
    </div>
  );
}

export function Holdings() {
  const { data, loading } = useApi(() => api.private.holdings());
  const { run } = useToast();
  const [adding, setAdding] = useState(false);
  const [owner, setOwner] = useState('all');
  const [f, setF] = useState<Omit<Holding, 'id'>>({ name: '', kind: 'Mutual fund', owner: 'Self', value: 0, asOf: new Date().toISOString() });
  const list = (data ?? []).filter((h) => owner === 'all' || h.owner === owner);
  const byKind = useMemo(() => Object.entries(list.reduce<Record<string, number>>((a, h) => { a[h.kind] = (a[h.kind] ?? 0) + h.value; return a; }, {})).map(([kind, v]) => ({ kind, Value: Math.round(v / 1000) })).sort((a, b) => b.Value - a.Value), [list]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Holdings & assets" subtitle="Your own record of holdings by owner, valued ‘as of’ each statement date." screen="SCR-48" release="PT" env="private"
        actions={<><Button variant="secondary" icon={Upload} onClick={() => run(Promise.resolve(), 'Statement parsed', 'Review imported rows (parse failure → manual entry)')}>Import statement</Button><Button icon={Plus} onClick={() => setAdding(true)}>Add holding</Button></>} />
      <Tabs className="mb-4" value={owner} onChange={setOwner} items={[{ value: 'all', label: 'All owners' }, { value: 'Self', label: 'Self' }, { value: 'Spouse', label: 'Spouse' }, { value: 'Joint', label: 'Joint' }]} />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          {loading ? <SkeletonList /> : (
            <TableWrap>
              <table className="table-base">
                <thead><tr><th>Holding</th><th>Type</th><th>Owner</th><th className="text-right">Value</th><th>As of</th></tr></thead>
                <tbody>{list.map((h) => <tr key={h.id}><td className="font-medium">{h.name}</td><td><Badge tone="purple">{h.kind}</Badge></td><td>{h.owner}</td><td className="text-right font-semibold tabular-nums">{inr(h.value)}</td><td className="text-muted">{fmtDate(h.asOf)}</td></tr>)}</tbody>
                <tfoot><tr><td colSpan={3} className="px-4 py-3 font-semibold">Total</td><td className="px-4 py-3 text-right font-bold tabular-nums">{inr(list.reduce((n, h) => n + h.value, 0))}</td><td /></tr></tfoot>
              </table>
            </TableWrap>
          )}
        </Card>
        <ChartCard title="By asset type" subtitle="₹ thousands" table={{ headers: ['Type', '₹ thousand'], rows: byKind.map((b) => [b.kind, b.Value]) }}>
          <ResponsiveContainer>
            <BarChart data={byKind} layout="vertical" margin={{ top: 4, right: 12, left: 20, bottom: 0 }}>
              <CartesianGrid {...GRID} horizontal={false} vertical />
              <XAxis type="number" {...AXIS} />
              <YAxis type="category" dataKey="kind" {...AXIS} width={80} />
              <Tooltip content={<ChartTooltip unit="k" />} cursor={{ fill: 'rgb(var(--muted) / 0.08)' }} />
              <Bar dataKey="Value" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add holding" footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={!f.name || !f.value} onClick={async () => { await run(api.private.addHolding(f), 'Holding added', 'Encrypted with your private key'); setAdding(false); }}>Add</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Holding['kind'] })}>{['Equity', 'Mutual fund', 'Deposit', 'PF', 'Bond', 'Gold', 'Bank'].map((k) => <option key={k}>{k}</option>)}</Select></Field>
          <Field label="Owner"><Select value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>{['Self', 'Spouse', 'Joint'].map((k) => <option key={k}>{k}</option>)}</Select></Field>
          <Field label="Value (₹)"><Input type="number" value={f.value || ''} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} /></Field>
          <Field label="As of"><Input type="date" value={f.asOf.slice(0, 10)} onChange={(e) => setF({ ...f, asOf: new Date(e.target.value).toISOString() })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function Liabilities() {
  const { data, loading } = useApi(() => api.private.liabilities());
  if (loading || !data) return <Card><SkeletonList /></Card>;
  return (
    <div className="animate-fade-in">
      <PageHeader title="Loans & insurance" subtitle="Loan schedules, rate resets and policy renewals." screen="SCR-49" release="PT" env="private" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Loans" icon={Wallet} iconClass="bg-purple-500/10 text-priv" />
          <div className="divide-y divide-line">{data.loans.map((l) => (
            <div key={l.id} className="p-5"><div className="flex justify-between"><p className="font-semibold">{l.name}</p><Badge>{l.lender}</Badge></div>
              <KeyValue className="mt-3" items={[['Outstanding', inr(l.outstanding)], ['EMI', inr(l.emi)], ['Rate', `${l.rate}%`], ['Next EMI', fmtDate(l.nextDue)], ...(l.resetDate ? [['Rate reset', fmtDate(l.resetDate)] as [string, string]] : [])]} /></div>
          ))}</div>
        </Card>
        <Card>
          <CardHeader title="Insurance policies" icon={ShieldCheck} iconClass="bg-purple-500/10 text-priv" />
          <div className="divide-y divide-line">{data.policies.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3.5"><div className="flex-1"><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-muted">{p.insurer} · cover {inr(p.cover)} · premium {inr(p.premium)}</p></div><Badge tone={-daysBetween(p.renewal) <= 30 ? 'amber' : 'gray'}>renews {fmtDate(p.renewal)}</Badge></div>
          ))}</div>
        </Card>
      </div>
    </div>
  );
}

export function Vault() {
  const { data, loading } = useApi(() => api.private.vault());
  const { run, toast } = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState<string | null>(null);
  const folder = data?.find((f) => f.id === open);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Document vault" subtitle="Encrypted on this device before upload. The server only ever stores ciphertext." screen="SCR-50" release="PT" env="private" />
      {loading ? <Card><SkeletonList /></Card> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data!.map((f) => (
            <button key={f.id} onClick={() => setOpen(f.id)} className="card p-5 text-left lift">
              <FolderLock className="h-8 w-8 text-priv" /><p className="mt-3 font-semibold">{f.name}</p><p className="text-xs text-muted">{f.files.length} files · encrypted</p>
            </button>
          ))}
        </div>
      )}
      <Modal open={!!folder} onClose={() => setOpen(null)} title={folder?.name ?? ''} subtitle="Client-side encrypted" size="lg"
        footer={<label className="cursor-pointer"><span className="inline-flex h-10 items-center gap-2 rounded-lg bg-priv px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add document</span><input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file && folder) run(api.private.addVaultFile(folder.id, file.name, Math.round(file.size / 1000)), 'Encrypted and stored', 'Key never leaves this device'); }} /></label>}>
        <div className="divide-y divide-line">
          {folder?.files.map((x) => (
            <div key={x.name} className="flex items-center gap-3 py-3">
              <FileText className="h-5 w-5 text-muted" /><div className="flex-1"><p className="text-sm font-medium">{x.name}</p><p className="text-xs text-muted">{x.sizeKb} KB · added {fmtDate(x.addedAt)}</p></div>
              <Button size="xs" variant="secondary" icon={decrypting === x.name ? Loader2 : Eye} onClick={() => { setDecrypting(x.name); setTimeout(() => { setDecrypting(null); toast('success', 'Decrypted locally', x.name); }, 800); }}>{decrypting === x.name ? 'Decrypting' : 'Open'}</Button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export function FamilyCalendar() {
  const { data, loading } = useApi(() => api.private.family());
  const { run } = useToast();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: '', date: new Date().toISOString().slice(0, 10), start: '18:00', end: '19:00', who: 'Family', blockWork: true });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Family calendar & contacts" subtitle="Personal schedule. ‘Block work time’ projects an opaque Busy block into the official calendar — nothing else crosses." screen="SCR-51" release="PT" env="private" actions={<Button icon={Plus} onClick={() => setAdding(true)}>Add event</Button>} />
      <div className="mb-4"><InfoNote tone="purple" icon={Lock}>One-way projection: the official calendar sees only “Busy”, never the title, people or place.</InfoNote></div>
      <Card>
        {loading ? <SkeletonList /> : (
          <div className="divide-y divide-line">
            {(data ?? []).slice().sort((a, b) => +new Date(a.start) - +new Date(b.start)).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <CalendarHeart className="h-5 w-5 text-priv" />
                <div className="min-w-0 flex-1"><p className="font-medium">{e.title}</p><p className="text-xs text-muted">{fmtDate(e.start)} · {fmtTime(e.start)}–{fmtTime(e.end)} · {e.who}</p></div>
                <Toggle checked={e.blockWork} onChange={() => run(api.private.toggleBlock(e.id), e.blockWork ? 'Busy block removed' : 'Busy block projected', 'Official calendar shows only “Busy”')} label={<span className="text-xs">Block work time</span>} />
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="mt-5"><CardHeader title="Personal contacts" icon={Users} iconClass="bg-purple-500/10 text-priv" /><p className="p-5 text-sm text-muted">Private address book (optional feature — phone contacts are an alternative).</p></Card>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add family event" footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={!f.title} onClick={async () => { await run(api.private.addFamilyEvent({ title: f.title, who: f.who, blockWork: f.blockWork, start: new Date(`${f.date}T${f.start}`).toISOString(), end: new Date(`${f.date}T${f.end}`).toISOString() }), 'Event added'); setAdding(false); }}>Add</Button></>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title" className="sm:col-span-3"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Start"><Input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
          <Field label="End"><Input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
          <div className="sm:col-span-3"><Toggle checked={f.blockWork} onChange={(v) => setF({ ...f, blockWork: v })} label="Block work time" description="Projects an opaque Busy block" /></div>
        </div>
      </Modal>
    </div>
  );
}

export function ComplianceReminders() {
  const { data, loading } = useApi(() => api.private.compliance());
  const { toast } = useToast();
  return (
    <div className="animate-fade-in">
      <PageHeader title="Compliance reminders" subtitle="Property returns and transaction intimations with thresholds you configure. Drafts carry a ‘verify’ label." screen="SCR-52" release="PT" env="private" />
      <div className="mb-4"><InfoNote tone="amber">Thresholds and deadlines must be verified against the applicable conduct rules — the app does not determine legal obligations.</InfoNote></div>
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? <Card><SkeletonList /></Card> : (data ?? []).map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between gap-2"><p className="font-semibold">{c.title}</p><Badge tone={c.status === 'filed' ? 'green' : c.status === 'prepared' ? 'blue' : 'amber'}>{c.status}</Badge></div>
            <p className="mt-1 text-xs text-muted">Due {fmtDate(c.due)}{c.threshold ? ` · threshold ${inr(c.threshold)} (user-set)` : ''}</p>
            {c.status !== 'filed' && <div className="mt-4 flex gap-2"><Button size="sm" variant="secondary" icon={Download} onClick={() => toast('success', 'Draft summary exported', 'Marked VERIFY — check before filing')}>Export draft</Button><Badge tone="amber">verify</Badge></div>}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ExpensesTax() {
  const { data, loading } = useApi(() => api.private.expenses());
  const { run, toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), category: 'Groceries', amount: 0, note: '' });
  const monthly = useMemo(() => {
    const m: Record<string, number> = {};
    (data ?? []).forEach((e) => { const k = new Date(e.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); m[k] = (m[k] ?? 0) + e.amount; });
    return Object.entries(m).map(([month, total]) => ({ month, Total: Math.round(total / 1000) })).reverse();
  }, [data]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Expenses & tax pack" subtitle="Monthly totals and year folders; export a pack for your CA." screen="SCR-53" release="PT" env="private"
        actions={<><Button variant="secondary" icon={Download} onClick={() => { downloadCsv('tax-pack-expenses.csv', (data ?? []).map((e) => ({ date: e.date.slice(0, 10), category: e.category, amount: e.amount }))); toast('success', 'Tax pack exported'); }}>Export CA pack</Button><Button icon={Plus} onClick={() => setAdding(true)}>Add expense</Button></>} />
      {loading ? <Card><SkeletonList /></Card> : (
        <ChartCard title="Monthly spending" subtitle="₹ thousands" table={{ headers: ['Month', '₹ thousand'], rows: monthly.map((m) => [m.month, m.Total]) }}>
          <ResponsiveContainer>
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="month" {...AXIS} />
              <YAxis {...AXIS} />
              <Tooltip content={<ChartTooltip unit="k" />} cursor={{ fill: 'rgb(var(--muted) / 0.08)' }} />
              <Bar dataKey="Total" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add expense" footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={!f.amount} onClick={async () => { await run(api.private.addExpense({ ...f, date: new Date(f.date).toISOString() }), 'Expense added'); setAdding(false); }}>Add</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{['Groceries', 'Utilities', 'Fuel', 'Education', 'Medical', 'Household help', 'Dining'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Amount (₹)"><Input type="number" value={f.amount || ''} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
          <Field label="Note"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        </div>
      </Modal>
      <p className="mt-4 flex items-center gap-1 text-xs text-muted"><Receipt className="h-3.5 w-3.5" />{(data ?? []).length} entries · {fmtDateTime(new Date().toISOString())}</p>
    </div>
  );
}
