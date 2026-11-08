import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { Building2, Plus, ExternalLink, AlertTriangle, Scale, Gavel, MapPin, Layers, FileBarChart, Play, CheckSquare, Square, Download, Network, MessageSquare, Clock, Info, ShieldAlert } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { db } from '@/data/mockDb';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { AuthorizationBanner, Badge, Button, Card, CardHeader, EmptyState, Field, InfoNote, Input, Modal, PageHeader, Progress, Select, SkeletonList, StatCard, TableWrap, Tabs, Toggle } from '@/components/ui';
import { NewTaskModal } from '@/pages/executive/Tasks';
import { TaskStateBadge } from '@/components/domain';
import { ChartTooltip, SERIES } from '@/components/charts';
import { cn, daysBetween, dueLabel, fmtDate } from '@/lib/utils';
import type { StatutoryItem, Task } from '@/types';

const SRC = { griev: 'Grievance system · 07:00', forms: 'Ward forms', stat: 'Tracker (rules: unverified)', legal: 'Legal system · stale 2 d' };

export function ZoneDashboard() {
  const { data, loading } = useApi(() => api.governance.wards());
  const { toast } = useToast();
  const [taskFor, setTaskFor] = useState<Partial<Task> | null>(null);
  const wards = data ?? [];
  const rows: { label: string; key: 'grievancesOverdue' | 'repeatComplaints' | 'formStatus' | 'statutoryDue7d' | 'courtDatesWeek'; src: string; stale?: boolean }[] = [
    { label: 'Grievances overdue > SLA', key: 'grievancesOverdue', src: SRC.griev },
    { label: 'Repeat complaints (same location)', key: 'repeatComplaints', src: SRC.griev },
    { label: 'Weekly form submitted', key: 'formStatus', src: SRC.forms },
    { label: 'Statutory items due 7 d', key: 'statutoryDue7d', src: SRC.stat },
    { label: 'Court dates this week', key: 'courtDatesWeek', src: SRC.legal, stale: true },
  ];
  const max = (k: string) => Math.max(...wards.map((w) => Number((w as any)[k]) || 0));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Zone dashboard" subtitle="Compare wards by exception — what needs attention, not everything." screen="SCR-33" release="P2" env="governance" />
      <AuthorizationBanner />
      {loading ? <Card><SkeletonList /></Card> : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {wards.map((w) => (
              <Link key={w.id} to={`/gov/ward?w=${w.id}`} className="card p-4 lift">
                <div className="flex items-center justify-between"><p className="font-semibold">{w.name}</p><Badge tone={w.grievancesOverdue > 20 ? 'red' : w.grievancesOverdue > 12 ? 'amber' : 'green'}>{w.grievancesOverdue > 20 ? 'attention' : w.grievancesOverdue > 12 ? 'watch' : 'ok'}</Badge></div>
                <p className="mt-2 text-3xl font-bold">{w.grievancesOverdue}</p>
                <p className="text-xs text-muted">overdue grievances · 6-week trend</p>
                <div className="mt-2 h-10">
                  <ResponsiveContainer><LineChart data={w.trend.map((v, i) => ({ wk: `W-${5 - i}`, Overdue: v }))}><Tooltip content={<ChartTooltip />} /><Line dataKey="Overdue" stroke={SERIES[0]} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
                </div>
              </Link>
            ))}
          </div>
          <Card className="overflow-hidden">
            <CardHeader title="Exceptions by ward" subtitle="Darker cell = higher relative to other wards" icon={Building2} iconClass="bg-green-500/10 text-gov" />
            <TableWrap>
              <table className="table-base">
                <thead><tr><th>Exception</th>{wards.map((w) => <th key={w.id} className="text-center">{w.name}</th>)}<th>Source</th><th /></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td className="font-medium">{r.label}</td>
                      {wards.map((w) => {
                        const v = w[r.key];
                        if (r.key === 'formStatus') return <td key={w.id} className="text-center">{v === 'submitted' ? <Badge tone="green">✓ submitted</Badge> : <Badge tone="amber">{String(v)}</Badge>}</td>;
                        const intensity = Number(v) / Math.max(1, max(r.key));
                        return <td key={w.id} className="text-center"><span className="inline-block min-w-[44px] rounded-lg px-2 py-1 font-semibold tabular-nums" style={{ background: `rgb(42 120 214 / ${0.06 + intensity * 0.32})` }}>{String(v)}</span></td>;
                      })}
                      <td className={cn('text-xs', r.stale ? 'font-medium text-warn' : 'text-muted')}>{r.stale && <AlertTriangle className="mr-1 inline h-3 w-3" />}{r.src}</td>
                      <td className="text-right"><Button size="xs" variant="ghost" icon={Plus} onClick={() => setTaskFor({ title: `Review: ${r.label}`, source: 'Exception', sourceRef: r.label })}>Task</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </>
      )}
      <NewTaskModal open={!!taskFor} onClose={() => setTaskFor(null)} preset={taskFor ?? undefined} onCreated={(t) => toast('success', `Task ${t.id} created from exception`)} />
    </div>
  );
}

export function WardOperations() {
  const { session } = useApp();
  const { data: wards } = useApi(() => api.governance.wards());
  const { data: tasks } = useApi(() => api.tasks.list());
  const { toast } = useToast();
  const own = session!.user.role === 'ROLE-05' ? session!.user.scope.replace('Ward ', '') : null;
  const [ward, setWard] = useState(own ?? new URLSearchParams(location.search).get('w') ?? 'W2');
  const [taskFor, setTaskFor] = useState<Partial<Task> | null>(null);
  const w = wards?.find((x) => x.id === ward);
  const wardTasks = (tasks ?? []).filter((t) => t.ward === ward && !['closed', 'verified', 'cancelled'].includes(t.state));
  const pack = [
    { title: `Water pressure complaints cluster (${w?.repeatComplaints ?? 0} repeats)`, src: SRC.griev },
    { title: 'Pothole repairs — 1 road pending', src: 'Project register · 06:30' },
    { title: 'Monsoon readiness checklist — 2 items open', src: 'Readiness tracker · today' },
  ];
  return (
    <div className="animate-fade-in">
      <PageHeader title={`Ward ${ward} — operations`} subtitle="A ward’s exceptions and open items. Ward officers see their own ward only." screen="SCR-17" release="P2" env="governance"
        actions={!own && <Tabs value={ward} onChange={setWard} items={['W1', 'W2', 'W3', 'W4'].map((x) => ({ value: x, label: `Ward ${x}` }))} />} />
      <AuthorizationBanner />
      {w && (
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Overdue grievances" value={w.grievancesOverdue} icon={AlertTriangle} tone="red" hint={SRC.griev} />
          <StatCard label="Statutory due (7 d)" value={w.statutoryDue7d} icon={Scale} tone="amber" hint="rules unverified" />
          <StatCard label="Open review items" value={w.openReviewItems} icon={CheckSquare} tone="blue" />
          <Card className="p-4"><p className="text-xs font-medium text-muted">Monsoon readiness</p><p className="mt-1.5 text-2xl font-bold">{w.readiness[0]}/{w.readiness[1]}</p><Progress className="mt-2" value={w.readiness[0]} max={w.readiness[1]} tone="green" /></Card>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Review pack (weekly)" icon={FileBarChart} iconClass="bg-green-500/10 text-gov" />
          <div className="divide-y divide-line">
            {pack.map((p) => (
              <div key={p.title} className="flex flex-wrap items-center gap-2 px-5 py-3.5">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{p.title}</p><p className="text-[11px] text-muted">{p.src}</p></div>
                <Button size="xs" variant="secondary" icon={Plus} onClick={() => setTaskFor({ title: p.title, ward, source: 'Exception', sourceRef: p.src })}>Create task</Button>
                <Button size="xs" variant="ghost" icon={ExternalLink} onClick={() => toast('info', 'Source system link', 'Opens the authorized source system (read-only)')}>Open source</Button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Open tasks in this ward" icon={CheckSquare} />
          <div className="divide-y divide-line">
            {wardTasks.length === 0 ? <EmptyState title="No exceptions this week" /> : wardTasks.map((t) => (
              <Link key={t.id} to={`/exec/tasks?open=${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.title}</p><p className="text-xs text-muted">{t.ownerPost}</p></div>
                <TaskStateBadge state={t.state} /><Badge tone={dueLabel(t.due).tone}>{dueLabel(t.due).text}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>
      <NewTaskModal open={!!taskFor} onClose={() => setTaskFor(null)} preset={taskFor ?? undefined} onCreated={(t) => toast('success', `Task ${t.id} created`)} />
    </div>
  );
}

export function DepartmentCoordination() {
  const { data, loading } = useApi(() => api.tasks.list());
  const { toast } = useToast();
  const [comment, setComment] = useState<Record<string, string>>({});
  const shared = (data ?? []).filter((t) => ['EE Roads', 'EE Water W2', 'AE SWD Ward W4', 'Garden JE'].includes(t.ownerPost) && !['closed', 'cancelled'].includes(t.state));
  const supporting: Record<string, string[]> = { 'EE Roads': ['AC Ward W2', 'Traffic police liaison'], 'EE Water W2': ['AC Ward W2'], 'AE SWD Ward W4': ['SWM Officer W4'], 'Garden JE': ['AC Ward W2', 'Tree authority'] };
  return (
    <div className="animate-fade-in">
      <PageHeader title="Department coordination" subtitle="Cross-department tasks with one owner and supporting posts. Only the owner submits." screen="SCR-18" release="P2" env="governance" />
      <AuthorizationBanner decision="DEC-014">Department reporting lines must be confirmed (DEC-014) before officers are onboarded.</AuthorizationBanner>
      {loading ? <Card><SkeletonList /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shared.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{t.title}</p><p className="text-xs text-muted">{t.id} · due {fmtDate(t.due)}</p></div><TaskStateBadge state={t.state} /></div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs"><Network className="h-3.5 w-3.5 text-muted" /><Badge tone="blue">Owner: {t.ownerPost}</Badge>{(supporting[t.ownerPost] ?? []).map((s) => <Badge key={s}>Supporting: {s}</Badge>)}</div>
              <div className="mt-4 flex gap-2"><Input value={comment[t.id] ?? ''} onChange={(e) => setComment({ ...comment, [t.id]: e.target.value })} placeholder="Add a coordination comment…" /><Button variant="secondary" icon={MessageSquare} disabled={!comment[t.id]?.trim()} onClick={() => { toast('success', 'Comment added', 'Visible to owner and supporting posts'); setComment({ ...comment, [t.id]: '' }); }}>Post</Button></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatutoryItems() {
  const { data, loading } = useApi(() => api.governance.statutory());
  const { run } = useToast();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState<{ title: string; type: StatutoryItem['type']; received: string; due: string; owner: string }>({ title: '', type: 'RTI', received: new Date().toISOString().slice(0, 10), due: '', owner: '' });
  return (
    <div className="animate-fade-in">
      <PageHeader title="Statutory items" subtitle="RTI, legislature questions, RTS and notices. Due dates come only from validated rule tables — otherwise the PA confirms each date." screen="SCR-39" release="P2" env="governance" actions={<Button icon={Plus} onClick={() => setAdding(true)}>Add item</Button>} />
      <div className="mb-4"><InfoNote tone="amber" icon={ShieldAlert}>Time limits are not computed from unverified rules (DEC-038). Items with unverified rules show a manual date set by the PA.</InfoNote></div>
      <Card className="overflow-hidden">
        {loading ? <SkeletonList /> : (
          <TableWrap>
            <table className="table-base">
              <thead><tr><th>Item</th><th>Type</th><th>Received</th><th>Rule status</th><th>Due</th><th>Owner</th><th>Status</th></tr></thead>
              <tbody>
                {(data ?? []).map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.title}</td><td><Badge>{s.type}</Badge></td><td className="text-muted">{fmtDate(s.received)}</td>
                    <td>{s.ruleStatus === 'validated' ? <Badge tone="green">validated rule</Badge> : <Badge tone="amber">unverified</Badge>}</td>
                    <td>{s.due ? <><span className="font-medium">{fmtDate(s.due)}</span>{s.manualDate && <span className="block text-[11px] text-muted">manual date set by PA</span>}</> : <span className="text-xs text-warn">set manual date</span>}</td>
                    <td>{s.owner}</td><td><Badge tone={s.status === 'open' ? 'blue' : 'green'}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add statutory item" subtitle="Rule status starts as unverified until the rule table is validated."
        footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={!f.title || !f.owner} onClick={async () => { await run(api.governance.addStatutory({ ...f, received: new Date(f.received).toISOString(), due: f.due ? new Date(f.due).toISOString() : undefined }), 'Item added'); setAdding(false); }}>Add</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as StatutoryItem['type'] })}>{['RTI', 'Notice', 'LAQ', 'RTS', 'Appeal'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Received"><Input type="date" value={f.received} onChange={(e) => setF({ ...f, received: e.target.value })} /></Field>
          <Field label="Manual due date" hint="Confirm from the governing rule"><Input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
          <Field label="Owner post" required><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function LegalAudit() {
  const { data, loading } = useApi(() => api.governance.legal());
  const [tab, setTab] = useState<'court' | 'audit'>('court');
  const buckets = [['< 90 d', 0, 90], ['90–180 d', 90, 180], ['180–365 d', 180, 365], ['> 1 year', 365, 99999]] as const;
  return (
    <div className="animate-fade-in">
      <PageHeader title="Legal & audit" subtitle="Court dates and audit paras. Stay alerts are advisory — legal advice comes from counsel." screen="SCR-40" release="P2" env="governance"
        actions={<Tabs value={tab} onChange={setTab} items={[{ value: 'court', label: 'Court dates', count: data?.cases.length }, { value: 'audit', label: 'Audit paras', count: data?.paras.length }]} />} />
      <AuthorizationBanner decision="DEC-006 (ILMS)" />
      {loading ? <Card><SkeletonList /></Card> : tab === 'court' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.cases.slice().sort((a, b) => +new Date(a.nextDate) - +new Date(b.nextDate)).map((c) => {
            const d = -daysBetween(c.nextDate);
            return (
              <Card key={c.id} className="flex gap-4 p-5">
                <div className={cn('grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-center', d <= 3 ? 'bg-red-500/10 text-danger' : 'bg-primary/10 text-primary')}>
                  <div><p className="text-xl font-bold leading-none">{new Date(c.nextDate).getDate()}</p><p className="text-[10px] font-semibold uppercase">{new Date(c.nextDate).toLocaleDateString('en-IN', { month: 'short' })}</p></div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-xs text-muted">{c.court} · {c.counsel}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5"><Badge>{c.stage}</Badge><Badge tone={d <= 3 ? 'red' : 'blue'}>in {d} d</Badge>{c.stayAlert && <Badge tone="amber" icon={Gavel}>advisory: stay order check</Badge>}</div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {buckets.map(([l, lo, hi]) => <StatCard key={l} label={`Aged ${l}`} value={data!.paras.filter((p) => p.ageDays >= lo && p.ageDays < hi && p.status !== 'settled').length} icon={Clock} tone={lo >= 365 ? 'red' : lo >= 180 ? 'amber' : 'blue'} />)}
          </div>
          <Card className="overflow-hidden">
            <TableWrap>
              <table className="table-base">
                <thead><tr><th>Para</th><th>Title</th><th>Year</th><th>Department</th><th>Age</th><th>Status</th></tr></thead>
                <tbody>{data!.paras.map((p) => <tr key={p.id}><td className="font-mono text-xs">{p.id}</td><td className="font-medium">{p.title}</td><td>{p.year}</td><td>{p.dept}</td><td>{p.ageDays} d</td><td><Badge tone={p.status === 'open' ? 'amber' : p.status === 'replied' ? 'blue' : 'green'}>{p.status}</Badge></td></tr>)}</tbody>
              </table>
            </TableWrap>
          </Card>
        </>
      )}
    </div>
  );
}

/** Schematic map — real GIS tiles need authorization (DEC-006); this draws a synthetic ward layout. */
export function MapView() {
  const [layers, setLayers] = useState({ grievances: true, projects: true, csr: false, inspections: true });
  const [sel, setSel] = useState<string | null>(null);
  const points = [
    { id: 'G1', layer: 'grievances', x: 120, y: 110, label: 'Water pressure cluster (8)', ward: 'W2' },
    { id: 'G2', layer: 'grievances', x: 380, y: 260, label: 'Repeat garbage complaints (11)', ward: 'W4' },
    { id: 'P1', layer: 'projects', x: 210, y: 300, label: 'Nullah N-4 desilting', ward: 'W3' },
    { id: 'P2', layer: 'projects', x: 330, y: 120, label: 'Road restoration pkg 3', ward: 'W1' },
    { id: 'C1', layer: 'csr', x: 270, y: 210, label: 'Lake beautification (CSR-04)', ward: 'W3' },
    { id: 'I1', layer: 'inspections', x: 430, y: 330, label: 'SWD outfall inspection IN-07', ward: 'W4' },
  ];
  const color: Record<string, string> = { grievances: 'var(--series-2)', projects: 'var(--series-1)', csr: 'var(--series-3)', inspections: '#6250d6' };
  const wardsPoly = [
    { id: 'W1', d: 'M250 40 L470 40 L470 190 L300 180 Z', lx: 380, ly: 100 }, { id: 'W2', d: 'M30 40 L250 40 L300 180 L30 200 Z', lx: 130, ly: 70 },
    { id: 'W3', d: 'M30 200 L300 180 L320 380 L30 380 Z', lx: 120, ly: 350 }, { id: 'W4', d: 'M300 180 L470 190 L470 380 L320 380 Z', lx: 420, ly: 230 },
  ];
  const vis = points.filter((p) => layers[p.layer as keyof typeof layers]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Map" subtitle="Authorized items on a base map. Every item is also available as a list (keyboard alternative)." screen="SCR-37" release="P2" env="governance" />
      <AuthorizationBanner>Schematic synthetic layout. Real base layers and overlays need written authorization for each GIS source (DEC-006).</AuthorizationBanner>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden p-3">
          <svg viewBox="0 0 500 420" className="w-full rounded-xl bg-surface-2" role="img" aria-label="Schematic map of wards W1 to W4 with item markers">
            {wardsPoly.map((w) => <g key={w.id}><path d={w.d} fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth={2} /><text x={w.lx} y={w.ly} fontSize={14} fontWeight={700} fill="rgb(var(--muted))" textAnchor="middle">Ward {w.id}</text></g>)}
            <path d="M30 260 C 160 240, 260 300, 470 280" stroke="#93c5fd" strokeWidth={6} fill="none" opacity={0.6} />
            {vis.map((p) => (
              <g key={p.id} onClick={() => setSel(p.id)} className="cursor-pointer">
                <circle cx={p.x} cy={p.y} r={sel === p.id ? 13 : 10} fill={color[p.layer]} stroke="rgb(var(--surface))" strokeWidth={2} />
                {sel === p.id && <text x={p.x + 16} y={p.y + 4} fontSize={11} fontWeight={600} fill="rgb(var(--ink))">{p.label}</text>}
              </g>
            ))}
          </svg>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4" />Permitted layers</p>
            <div className="space-y-3">
              {(Object.keys(layers) as (keyof typeof layers)[]).map((k) => (
                <Toggle key={k} checked={layers[k]} onChange={(v) => setLayers({ ...layers, [k]: v })} label={<span className="flex items-center gap-2 capitalize"><span className="h-3 w-3 rounded-full" style={{ background: color[k] }} />{k}</span>} />
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Items (list view)" icon={MapPin} />
            <div className="divide-y divide-line">
              {vis.map((p) => <button key={p.id} onClick={() => setSel(p.id)} className={cn('flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm hover:bg-surface-2', sel === p.id && 'bg-primary/5')}><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color[p.layer] }} /><span className="flex-1">{p.label}</span><span className="text-xs text-muted">{p.ward}</span></button>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const RUNBOOKS: Record<string, string[]> = {
  'Heavy rain — Orange alert': ['Activate ward control rooms', 'Position standby pumps at low-lying junctions', 'Alert disaster cell and fire brigade liaison', 'Issue public advisory (approved template)', 'Confirm shelter readiness in schools'],
  'Festival crowd management': ['Coordinate with police on barricading', 'Deploy additional SWM staff', 'Set up first-aid booths', 'Confirm drinking water points'],
  'Building collapse (C-1)': ['Cordon and evacuate', 'Inform fire brigade and NDRF liaison', 'Open shelter', 'Structural audit of adjacent buildings'],
};

export function ReportsRunbooks() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'reports' | 'runbooks'>('reports');
  const [compiling, setCompiling] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [book, setBook] = useState(Object.keys(RUNBOOKS)[0]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const templates = [
    { name: 'Weekly zone review deck', missing: ['Ward W3 weekly form (late)'] },
    { name: 'Monthly commitment ledger report', missing: [] },
    { name: 'Monsoon readiness status', missing: [] },
    { name: 'Participate Mumbai quarterly impact', missing: ['CSR-04 milestone 2 evidence'] },
  ];
  return (
    <div className="animate-fade-in">
      <PageHeader title="Reports & runbooks" subtitle="Compile recurring reports for executive approval; run checklists during events." screen="SCR-38" release="P2" env="governance" actions={<Tabs value={tab} onChange={setTab} items={[{ value: 'reports', label: 'Reports' }, { value: 'runbooks', label: 'Runbooks' }]} />} />
      {tab === 'reports' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.name} className="p-5">
              <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-green-500/10 text-gov"><FileBarChart className="h-5 w-5" /></div><div className="flex-1"><p className="font-semibold">{t.name}</p><p className="text-xs text-muted">Template · last compiled {fmtDate(new Date(Date.now() - 6 * 86400000).toISOString())}</p></div></div>
              {t.missing.length > 0 && <div className="mt-3"><InfoNote tone="amber" icon={Info}>Missing data: {t.missing.join(', ')}</InfoNote></div>}
              {compiling === t.name && <Progress className="mt-3" value={60} />}
              <div className="mt-4 flex gap-2">
                <Button size="sm" icon={Play} loading={compiling === t.name} onClick={() => { setCompiling(t.name); setTimeout(() => { setCompiling(null); setDone((d) => [...d, t.name]); toast('success', 'Report compiled', 'Draft ready — request approval before circulation'); }, 1400); }}>Compile</Button>
                {done.includes(t.name) && <><Button size="sm" variant="secondary" onClick={() => toast('success', 'Approval requested', 'Added to Decide')}>Request approval</Button><Button size="sm" variant="ghost" icon={Download} onClick={() => toast('info', 'Export available after approval')}>Export</Button></>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit p-2">{Object.keys(RUNBOOKS).map((b) => <button key={b} onClick={() => setBook(b)} className={cn('block w-full rounded-lg px-3 py-2.5 text-left text-sm', book === b ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-surface-2')}>{b}</button>)}</Card>
          <Card>
            <CardHeader title={book} subtitle={`${RUNBOOKS[book].filter((s) => checked[book + s]).length}/${RUNBOOKS[book].length} steps done`} icon={CheckSquare} />
            <div className="p-5">
              <Progress className="mb-4" tone="green" value={RUNBOOKS[book].filter((s) => checked[book + s]).length} max={RUNBOOKS[book].length} />
              {RUNBOOKS[book].map((s) => (
                <button key={s} onClick={() => setChecked({ ...checked, [book + s]: !checked[book + s] })} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-surface-2">
                  {checked[book + s] ? <CheckSquare className="h-5 w-5 text-ok" /> : <Square className="h-5 w-5 text-muted" />}<span className={cn(checked[book + s] && 'text-muted line-through')}>{s}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

