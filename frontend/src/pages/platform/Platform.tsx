import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus, KeyRound, Check, X, ShieldAlert, Settings2, Save, Sparkles, Database, Tags, Clock, Link2, Flag, FileSearch, Link as LinkIcon, CheckCircle2, AlertOctagon, Search, Download, DatabaseBackup, FileArchive, Activity, Server, BellRing, MonitorSmartphone, Smartphone, Laptop, Watch, LogOut, Trash2, Lock, ArrowLeft, Inbox, Filter, Fingerprint, Languages, RotateCcw } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { aiConfigured } from '@/services/ai';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { ROLE_META } from '@/config/navigation';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, InfoNote, Input, KeyValue, Modal, PageHeader, Progress, ReasonDialog, Select, SkeletonList, StatCard, TableWrap, Tabs, Toggle } from '@/components/ui';
import { TIER_META } from '@/components/domain';
import { LANG_LABEL } from '@/i18n/strings';
import { cn, downloadCsv, fmtDateTime, relative, uid } from '@/lib/utils';
import type { ConfigState, Lang, Tier } from '@/types';

export function UsersRoles() {
  const { data: users, loading } = useApi(() => api.admin.users());
  const { data: reqs } = useApi(() => api.admin.accessRequests());
  const { run } = useToast();
  const [q, setQ] = useState('');
  const [bg, setBg] = useState(false);
  const [deact, setDeact] = useState<string | null>(null);
  const pending = (reqs ?? []).filter((r) => r.status === 'pending');
  const list = (users ?? []).filter((u) => (u.name + u.post + u.role).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="animate-fade-in">
      <PageHeader title="Users & roles" subtitle="Provision accounts, approve role grants, manage break-glass. Grants need an approval record." screen="SCR-42" release="P0" env="platform"
        actions={<><Button variant="secondary" icon={KeyRound} onClick={() => setBg(true)}>Break-glass request</Button><Button icon={UserPlus} onClick={() => run(Promise.resolve(), 'Access request form opened', 'Requests are raised by the office administrator')}>Access request</Button></>} />
      <div className="mb-5 grid grid-cols-3 gap-4">
        <StatCard label="Users" value={users?.length ?? '–'} icon={ShieldCheck} />
        <StatCard label="Pending requests" value={pending.length} icon={UserPlus} tone="amber" />
        <StatCard label="Break-glass active" value={0} icon={KeyRound} tone="red" hint="ROLE-09 has no standing access" />
      </div>
      {pending.length > 0 && (
        <Card className="mb-5 border-l-4 border-l-warn">
          <CardHeader title="Pending role grants" icon={UserPlus} iconClass="bg-amber-500/10 text-warn" />
          <div className="divide-y divide-line">
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{r.userName} → {r.requestedRole} ({ROLE_META[r.requestedRole].name}, {r.scope})</p><p className="text-xs text-muted">Requested by {r.requestedBy} · {relative(r.at)} · reason: {r.reason}</p></div>
                <Button size="sm" variant="success" icon={Check} onClick={() => run(api.admin.decideAccess(r.id, true), 'Grant approved', 'Approval record written')}>Approve</Button>
                <Button size="sm" variant="ghost" icon={X} className="text-danger" onClick={() => run(api.admin.decideAccess(r.id, false), 'Grant rejected')}>Reject</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3"><Search className="h-4 w-4 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="flex-1 bg-transparent text-sm outline-none" /></div>
        {loading ? <SkeletonList /> : (
          <TableWrap>
            <table className="table-base">
              <thead><tr><th>User (synthetic)</th><th>Role</th><th>Scope</th><th>MFA</th><th>Devices</th><th>Last sign-in</th><th>Status</th><th /></tr></thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td><div className="flex items-center gap-3"><Avatar name={u.name} className="h-8 w-8" /><div><p className="font-medium">{u.name}</p><p className="text-xs text-muted">{u.post}</p></div></div></td>
                    <td><Badge tone="blue">{u.role}</Badge><span className="block text-[11px] text-muted">{ROLE_META[u.role].short}</span></td>
                    <td>{u.scope}</td>
                    <td><Badge tone={u.mfa === 'passkey' ? 'green' : 'gray'}>{u.mfa}</Badge></td>
                    <td>{u.devices ? `${u.devices} bound` : '—'}</td>
                    <td className="text-muted">{relative(u.lastSignIn)}</td>
                    <td><Badge tone={u.status === 'active' ? 'green' : u.status === 'pending' ? 'amber' : 'gray'} dot>{u.status}</Badge></td>
                    <td className="text-right">{u.status === 'active' ? <Button size="xs" variant="ghost" className="text-danger" onClick={() => setDeact(u.id)}>Deactivate</Button> : <Button size="xs" variant="ghost" onClick={() => run(api.admin.setUserStatus(u.id, 'active'), 'User activated')}>Activate</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <ReasonDialog open={!!deact} onClose={() => setDeact(null)} title="Deactivate user" confirmText="Deactivate" presets={['Transferred', 'Left service', 'Security concern']} onConfirm={(r) => run(api.admin.setUserStatus(deact!, 'deactivated'), 'User deactivated', r)} />
      <ReasonDialog open={bg} onClose={() => setBg(false)} title="Break-glass access (time-boxed)" label="Reason and incident reference" confirmText="Submit for approval" tone="primary" presets={['INC-xxx: production diagnosis (60 min)', 'Restore drill support (30 min)']} onConfirm={(r) => run(api.admin.breakGlass(r, 60), 'Break-glass requested', 'Needs ROLE-08 approval; Security Reviewer notified')} />
    </div>
  );
}

export function Configuration() {
  const { data, loading } = useApi(() => api.admin.config());
  const { session } = useApp();
  const { run } = useToast();
  const [c, setC] = useState<ConfigState | null>(null);
  const [tab, setTab] = useState<'office' | 'flags' | 'retention' | 'integrations'>('office');
  useEffect(() => { if (data) setC(data); }, [data]);
  if (loading || !c) return <Card><SkeletonList /></Card>;
  const officeOnly = session!.user.role === 'ROLE-03';
  return (
    <div className="animate-fade-in">
      <PageHeader title="Configuration" subtitle={officeOnly ? 'Office items only: categories, templates and office hours.' : 'Org structure, categories, retention, channels, authorizations, AI and feature flags.'} screen="SCR-43" release="P0" env="platform"
        actions={<Button icon={Save} onClick={() => run(api.admin.saveConfig(c), 'Configuration saved', 'Change written to configuration history')}>Save changes</Button>} />
      <Tabs className="mb-5" value={tab} onChange={setTab} items={[{ value: 'office', label: 'Office & categories' }, ...(officeOnly ? [] : [{ value: 'flags' as const, label: 'AI & feature flags' }, { value: 'retention' as const, label: 'Retention' }, { value: 'integrations' as const, label: 'Authorizations' }])]} />
      {tab === 'office' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <Card className="overflow-hidden">
            <CardHeader title="Request categories" subtitle="Reserved categories go to the executive’s Decide queue" icon={Tags} />
            <TableWrap>
              <table className="table-base">
                <thead><tr><th>Category</th><th>Reserved</th><th>Right desk</th></tr></thead>
                <tbody>
                  {c.categories.map((cat, i) => (
                    <tr key={cat.name}>
                      <td className="font-medium">{cat.name}</td>
                      <td><Toggle checked={cat.reserved} onChange={(v) => setC({ ...c, categories: c.categories.map((x, j) => (j === i ? { ...x, reserved: v } : x)) })} /></td>
                      <td><Input value={cat.rightDesk} onChange={(e) => setC({ ...c, categories: c.categories.map((x, j) => (j === i ? { ...x, rightDesk: e.target.value } : x)) })} className="h-8 py-1" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
          <Card>
            <CardHeader title="Office hours" icon={Clock} />
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3"><Field label="Opens"><Input type="time" value={c.officeHours.from} onChange={(e) => setC({ ...c, officeHours: { ...c.officeHours, from: e.target.value } })} /></Field><Field label="Closes"><Input type="time" value={c.officeHours.to} onChange={(e) => setC({ ...c, officeHours: { ...c.officeHours, to: e.target.value } })} /></Field></div>
              <Field label="Walk-in window"><Input value={c.officeHours.walkIn} onChange={(e) => setC({ ...c, officeHours: { ...c.officeHours, walkIn: e.target.value } })} /></Field>
            </div>
          </Card>
        </div>
      )}
      {tab === 'flags' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="AI gateway" subtitle="Single controlled route to models — policy, redaction, logging" icon={Sparkles} iconClass="bg-orange-500/10 text-ai" />
            <div className="space-y-4 p-5">
              <Toggle checked={c.aiEnabled} onChange={(v) => setC({ ...c, aiEnabled: v })} label="AI features enabled" description="P0 ships with AI disabled until DEC-008. Enabled here for the synthetic demo." />
              <InfoNote tone={aiConfigured() ? 'blue' : 'amber'}>{aiConfigured() ? 'Provider keys detected (Groq → Gemini → Mistral fallback). Keys must move to the backend gateway before any real deployment.' : 'No provider key found in .env.local.'}</InfoNote>
            </div>
          </Card>
          <Card>
            <CardHeader title="Feature flags" icon={Flag} />
            <div className="space-y-4 p-5">
              <Toggle checked={c.showFutureReleases} onChange={(v) => setC({ ...c, showFutureReleases: v })} label="Show future-release modules" description="P1/P2/P3 concepts appear with release badges" />
              {Object.entries(c.featureFlags).map(([k, v]) => <Toggle key={k} checked={v} onChange={(nv) => setC({ ...c, featureFlags: { ...c.featureFlags, [k]: nv } })} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())} />)}
            </div>
          </Card>
        </div>
      )}
      {tab === 'retention' && (
        <Card className="max-w-2xl">
          <CardHeader title="Retention schedule" subtitle="Values need validation by the records owner" icon={Database} />
          <div className="divide-y divide-line">
            {Object.entries(c.retentionDays).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-5 py-3"><span className="text-sm font-medium">{k}</span><div className="flex items-center gap-2"><Input type="number" min={1} value={v} onChange={(e) => setC({ ...c, retentionDays: { ...c.retentionDays, [k]: Number(e.target.value) } })} className="h-8 w-24 py-1 text-right" /><span className="text-xs text-muted">days</span></div></div>
            ))}
          </div>
        </Card>
      )}
      {tab === 'integrations' && (
        <Card className="max-w-2xl">
          <CardHeader title="Institutional authorizations" subtitle="Each switch reflects a recorded written decision — never flip without the record" icon={Link2} />
          <div className="space-y-4 p-5">
            <Toggle checked={c.governanceAuthorized} onChange={(v) => setC({ ...c, governanceAuthorized: v })} label="Governance data sources authorized (DEC-006)" description="Read-only adapters to BMC systems. Write-back recommended never (DEC-035)." />
            <Toggle checked={c.smsSenderApproved} onChange={(v) => setC({ ...c, smsSenderApproved: v })} label="SMS sender ID approved (DEC-010)" description="Without it, SMS sends are blocked and simulated" />
            <Toggle checked={c.whatsappEnabled} onChange={(v) => setC({ ...c, whatsappEnabled: v })} label="WhatsApp channel (DEC-013)" description="Messaging officers/citizens over WhatsApp" />
          </div>
        </Card>
      )}
    </div>
  );
}

export function AuditLogs() {
  const { data: events, loading } = useApi(() => api.admin.audit());
  const { data: ai } = useApi(() => api.admin.aiLog());
  const { toast } = useToast();
  const [tab, setTab] = useState<'audit' | 'ai'>('audit');
  const [q, setQ] = useState('');
  const [result, setResult] = useState<'all' | 'ok' | 'denied' | 'error'>('all');
  const [chain, setChain] = useState<{ ok: boolean; checked: number } | null>(null);
  const [sampling, setSampling] = useState(false);
  const list = (events ?? []).filter((e) => (result === 'all' || e.result === result) && (e.actor + e.action + e.object).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="animate-fade-in">
      <PageHeader title="Audit & AI logs" subtitle="Append-only, hash-chained ledger of reads, writes, approvals, sends and AI calls. Read-only." screen="SCR-44" release="P0" env="platform"
        actions={<>
          <Button variant="secondary" icon={LinkIcon} onClick={async () => { const r = await api.admin.verifyChain(); setChain(r); toast(r.ok ? 'success' : 'error', r.ok ? 'Chain verified' : 'Chain broken', `${r.checked} events checked`); }}>Verify chain</Button>
          <Button variant="secondary" icon={Download} onClick={() => downloadCsv(tab === 'audit' ? 'audit-events.csv' : 'ai-interactions.csv', (tab === 'audit' ? list : ai ?? []) as unknown as Record<string, unknown>[])}>Export</Button>
        </>} />
      {chain && (chain.ok ? <div className="mb-4"><InfoNote icon={CheckCircle2}>Hash chain intact — {chain.checked} events verified {relative(new Date().toISOString())}.</InfoNote></div> : <div className="mb-4"><InfoNote tone="red" icon={AlertOctagon}>Chain broken alert — investigate immediately.</InfoNote></div>)}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'audit', label: 'Audit ledger', count: events?.length }, { value: 'ai', label: 'AI interactions', count: ai?.length }]} />
        {tab === 'audit' && <>
          <Tabs value={result} onChange={setResult} items={[{ value: 'all', label: 'All' }, { value: 'ok', label: 'OK' }, { value: 'denied', label: 'Denied' }, { value: 'error', label: 'Error' }]} />
          <div className="relative flex-1 sm:max-w-xs sm:ml-auto"><Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter actor, action, object" className="pl-9" /></div>
        </>}
      </div>
      <Card className="overflow-hidden">
        {loading ? <SkeletonList /> : tab === 'audit' ? (
          <TableWrap>
            <table className="table-base">
              <thead><tr><th>ID</th><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Object</th><th>Result</th><th>Hash ← prev</th></tr></thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono text-xs">{e.id}</td><td className="whitespace-nowrap text-muted">{fmtDateTime(e.at)}</td><td>{e.actor}</td><td><Badge>{e.role}</Badge></td>
                    <td className="font-mono text-xs">{e.action}</td><td className="max-w-[240px] truncate">{e.object}</td>
                    <td><Badge tone={e.result === 'ok' ? 'green' : e.result === 'denied' ? 'amber' : 'red'}>{e.result}</Badge></td>
                    <td className="font-mono text-[10px] text-muted">{e.hash.slice(0, 8)} ← {e.prevHash.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <TableWrap>
            <table className="table-base">
              <thead><tr><th>ID</th><th>Time</th><th>Actor</th><th>Feature</th><th>Provider · model</th><th>Prompt size</th><th>Outcome</th><th>Human approved</th></tr></thead>
              <tbody>
                {(ai ?? []).map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono text-xs">{a.id}</td><td className="whitespace-nowrap text-muted">{fmtDateTime(a.at)}</td><td>{a.actor}</td><td>{a.feature}</td>
                    <td className="text-xs">{a.provider} · {a.model}</td><td className="text-muted">{a.promptChars} chars</td>
                    <td><Badge tone={a.outcome === 'answered' ? 'green' : a.outcome === 'refused' ? 'purple' : a.outcome === 'fallback' ? 'amber' : 'red'}>{a.outcome}</Badge></td>
                    <td>{a.humanApproved ? <Badge tone="green">yes</Badge> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="sm" loading={sampling} onClick={() => { setSampling(true); setTimeout(() => { setSampling(false); toast('info', 'Sample drawn', '10 random events selected for review'); }, 700); }}>Draw review sample</Button>
        <Button variant="secondary" size="sm" onClick={() => toast('success', 'Finding recorded', 'Linked to the selected events')}>Record finding</Button>
      </div>
    </div>
  );
}

export function ExportDecommission() {
  const { run, toast } = useToast();
  const [scope, setScope] = useState('Full office export');
  const [format, setFormat] = useState('JSON + CSV (open formats)');
  const [job, setJob] = useState<{ jobId: string; checksum: string; files: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [decom, setDecom] = useState(false);
  const start = async () => {
    setJob(null); setProgress(5);
    const t = setInterval(() => setProgress((p) => Math.min(95, p + 15)), 250);
    const r = await run(api.admin.exportJob(scope, format), 'Export complete', 'Checksums generated');
    clearInterval(t); setProgress(100); if (r) setJob(r);
  };
  return (
    <div className="animate-fade-in">
      <PageHeader title="Export & decommissioning" subtitle="Full export in open formats with checksums, and verified decommissioning with a certificate." screen="SCR-45" release="P0" env="platform" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Export" icon={FileArchive} />
          <div className="space-y-4 p-5">
            <Field label="Scope"><Select value={scope} onChange={(e) => setScope(e.target.value)}>{['Full office export', 'Tasks and decisions', 'Visitor records (retention-limited)', 'Audit ledger'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Format"><Select value={format} onChange={(e) => setFormat(e.target.value)}>{['JSON + CSV (open formats)', 'CSV only', 'PDF/A for records'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Button icon={DatabaseBackup} onClick={start} loading={progress > 0 && progress < 100}>Start export</Button>
            {progress > 0 && <Progress value={progress} tone={progress === 100 ? 'green' : 'blue'} />}
            {job && <div className="space-y-2 rounded-xl bg-surface-2 p-4 text-sm ring-1 ring-line"><p><b>Job</b> {job.jobId} · {job.files} files</p><p className="break-all font-mono text-xs text-muted">{job.checksum}</p><Button size="sm" variant="secondary" icon={Check} onClick={() => toast('success', 'Receipt confirmed', 'Checksum verified by recipient')}>Confirm receipt</Button></div>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Decommission office" subtitle="Irreversible — requires a verified export first" icon={Trash2} iconClass="bg-red-500/10 text-danger" />
          <div className="space-y-4 p-5">
            <InfoNote tone="red" icon={ShieldAlert}>Decommissioning deletes office data after the retention period and issues a certificate. Only possible after a confirmed export.</InfoNote>
            <Button variant="danger" disabled={!job} onClick={() => setDecom(true)}>Begin decommissioning</Button>
          </div>
        </Card>
      </div>
      <ReasonDialog open={decom} onClose={() => setDecom(false)} title="Confirm decommissioning" label="Authority reference and reason" confirmText="Decommission" onConfirm={() => run(Promise.resolve(), 'Decommissioning scheduled', `Certificate ${uid('CERT')} will be issued on completion`)} />
    </div>
  );
}

const DEVICE_ICON = { mobile: Smartphone, tablet: MonitorSmartphone, desktop: Laptop, watch: Watch };

export function NotificationCentre() {
  const { data, loading } = useApi(() => api.notifications.list());
  const { run } = useToast();
  const nav = useNavigate();
  const [tab, setTab] = useState<'all' | Tier | 'held'>('all');
  const list = (data ?? []).filter((n) => (tab === 'all' ? true : tab === 'held' ? n.held : n.tier === tab));
  const held = (data ?? []).filter((n) => n.held).length;
  return (
    <div className="animate-fade-in">
      <PageHeader title="Notification centre" subtitle="Every notification and its state. Lock-screen text is generic; details open here after unlock." screen="SCR-57" release="P0" env="platform"
        actions={<>{held > 0 && <Button variant="secondary" onClick={() => run(api.notifications.releaseHeld(), 'Held items released')}>Release {held} held</Button>}<Button variant="secondary" icon={Check} onClick={() => run(api.notifications.markAllRead(), 'All marked read')}>Mark all read</Button></>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ value: 'all', label: 'All', count: data?.length }, { value: 'interrupt', label: 'Interrupt' }, { value: 'normal', label: 'Normal' }, { value: 'digest', label: 'Digest' }, { value: 'held', label: 'Held', count: held }]} />
      <Card className="overflow-hidden">
        {loading ? <SkeletonList /> : list.length === 0 ? <EmptyState icon={BellRing} title="No notifications" /> : (
          <div className="divide-y divide-line">
            {list.map((n) => (
              <div key={n.id} className={cn('flex items-start gap-4 px-5 py-4', !n.read && 'bg-primary/[0.03]')}>
                <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-line' : 'bg-primary')} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</p><Badge tone={TIER_META[n.tier].tone} aria-label={`Tier ${n.tier}`}>{TIER_META[n.tier].label}</Badge>{n.held && <Badge tone="purple">held · Peace Mode</Badge>}</div>
                  {n.body && <p className="mt-0.5 text-xs text-muted">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-muted">{fmtDateTime(n.at)} · {relative(n.at)}</p>
                </div>
                <div className="flex gap-1">
                  {n.link && <Button size="xs" variant="secondary" onClick={() => { api.notifications.markRead(n.id); nav(n.link!); }}>Open</Button>}
                  {!n.read && <Button size="xs" variant="ghost" onClick={() => run(api.notifications.markRead(n.id), 'Marked read', ' ')}>Mark read</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function AccountDevices() {
  const { session, lang, setLang } = useApp();
  const { data: devices } = useApi(() => api.auth.devices());
  const { run, toast } = useToast();
  const u = session!.user;
  const [revoke, setRevoke] = useState<string | null>(null);
  return (
    <div className="animate-fade-in">
      <PageHeader title="My account & devices" subtitle="Manage your sign-in factors, bound devices and sessions." screen="SCR-59" release="P0" env="platform" />
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card className="p-6 text-center">
          <Avatar name={u.name} className="mx-auto h-20 w-20 text-xl" />
          <p className="mt-3 text-lg font-semibold">{u.name}</p>
          <p className="text-sm text-muted">{u.post}</p>
          <Badge tone="blue" className="mt-2">{u.role} · {ROLE_META[u.role].name}</Badge>
          <KeyValue className="mt-6 text-left sm:grid-cols-1" items={[['Scope', u.scope], ['Email', u.email ?? '—'], ['Recovery status', <Badge key="r" tone="green">2 recovery methods set</Badge>]]} />
          <div className="mt-5 text-left"><p className="label flex items-center gap-1"><Languages className="h-3 w-3" />Language</p><div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">{(['en', 'mr', 'hi'] as Lang[]).map((l) => <button key={l} onClick={() => setLang(l)} className={cn('rounded-md py-1.5 text-xs font-medium', lang === l ? 'bg-surface shadow-sm' : 'text-muted')}>{LANG_LABEL[l]}</button>)}</div></div>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Sign-in factors" icon={Fingerprint} action={<Button size="sm" variant="secondary" onClick={() => toast('info', 'Enrol a factor', 'Follow the passkey prompt on your device')}>Add factor</Button>} />
            <div className="divide-y divide-line">
              <div className="flex items-center gap-3 px-5 py-3"><KeyRound className="h-5 w-5 text-ok" /><div className="flex-1"><p className="text-sm font-medium">Passkey (FIDO2)</p><p className="text-xs text-muted">Phishing-resistant · primary</p></div><Badge tone="green">active</Badge></div>
              <div className="flex items-center gap-3 px-5 py-3"><Smartphone className="h-5 w-5 text-muted" /><div className="flex-1"><p className="text-sm font-medium">Authenticator app</p><p className="text-xs text-muted">Backup factor</p></div><Badge>backup</Badge></div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Bound devices" icon={MonitorSmartphone} />
            <div className="divide-y divide-line">
              {(devices ?? []).map((d) => {
                const I = DEVICE_ICON[d.kind];
                return (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 ring-1 ring-line"><I className="h-5 w-5 text-muted" /></div>
                    <div className="flex-1"><p className="text-sm font-medium">{d.name} {d.current && <Badge tone="blue" className="ml-1">this device</Badge>}</p><p className="text-xs text-muted">Bound {relative(d.boundAt)} · last seen {relative(d.lastSeen)}</p></div>
                    {!d.current && <Button size="xs" variant="ghost" className="text-danger" onClick={() => setRevoke(d.id)}>Revoke</Button>}
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="flex flex-wrap items-center gap-3 p-5">
            <LogOut className="h-5 w-5 text-muted" /><div className="flex-1"><p className="text-sm font-medium">Other sessions</p><p className="text-xs text-muted">Sign out everywhere except this device</p></div>
            <Button variant="secondary" onClick={() => toast('success', 'Other sessions signed out')}>Sign out other sessions</Button>
          </Card>
        </div>
      </div>
      <ReasonDialog open={!!revoke} onClose={() => setRevoke(null)} title="Revoke device" confirmText="Revoke" presets={['Device lost', 'Device replaced', 'No longer used']} onConfirm={() => run(api.auth.revokeDevice(revoke!), 'Device revoked')} />
    </div>
  );
}

export function OperationsHealth() {
  const { session } = useApp();
  const { data, loading } = useApi(() => api.admin.health());
  const { run, toast } = useToast();
  if (session!.user.role === 'ROLE-09') return (
    <div className="animate-fade-in">
      <PageHeader title="Operations health" subtitle="Support engineers have no standing access." screen="SCR-60" release="P0" env="platform" />
      <Card className="mx-auto max-w-lg p-8 text-center"><Lock className="mx-auto h-10 w-10 text-muted" /><p className="mt-3 font-semibold">Break-glass required</p><p className="mt-1 text-sm text-muted">Request time-boxed access approved by the System Administrator. Every action is recorded.</p><Button className="mt-5" icon={KeyRound} onClick={() => run(api.admin.breakGlass('Support diagnosis', 60), 'Break-glass requested', 'Waiting for ROLE-08 approval')}>Request break-glass</Button></Card>
    </div>
  );
  if (loading || !data) return <Card><SkeletonList /></Card>;
  const healthy = data.services.filter((s) => s.status === 'healthy').length;
  return (
    <div className="animate-fade-in">
      <PageHeader title="Operations health" subtitle="Service status, scheduled jobs, security alerts, backups and restore tests." screen="SCR-60" release="P0" env="platform"
        actions={<Button variant="secondary" icon={RotateCcw} onClick={() => toast('success', 'Restore request raised', 'Requires approval; drill runs on a non-production copy')}>Start restore request</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Services healthy" value={`${healthy}/${data.services.length}`} icon={Server} tone={healthy === data.services.length ? 'green' : 'amber'} />
        <StatCard label="Open alerts" value={data.alerts.filter((a) => !a.acknowledged).length} icon={ShieldAlert} tone="red" />
        <StatCard label="Last backup" value={relative(data.lastBackup)} icon={DatabaseBackup} tone="blue" />
        <StatCard label="Last restore test" value={relative(data.lastRestoreTest)} icon={RotateCcw} tone="purple" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Services" icon={Activity} />
          <div className="divide-y divide-line">
            {data.services.map((s) => (
              <div key={s.name} className="flex items-center gap-3 px-5 py-3">
                <span className={cn('h-2.5 w-2.5 rounded-full', s.status === 'healthy' ? 'bg-ok' : s.status === 'degraded' ? 'bg-warn' : 'bg-danger')} />
                <span className="flex-1 text-sm font-medium">{s.name}</span>
                <span className="text-xs tabular-nums text-muted">{s.latencyMs} ms</span>
                <span className="w-16 text-right text-xs tabular-nums text-muted">{s.uptime}%</span>
                <Badge tone={s.status === 'healthy' ? 'green' : s.status === 'degraded' ? 'amber' : 'red'}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Security alerts" icon={ShieldAlert} iconClass="bg-red-500/10 text-danger" />
            <div className="divide-y divide-line">
              {data.alerts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <Badge tone={a.sev <= 2 ? 'red' : a.sev === 3 ? 'amber' : 'gray'}>SEV-{a.sev}</Badge>
                  <div className="flex-1"><p className="text-sm">{a.title}</p><p className="text-xs text-muted">{relative(a.at)}</p></div>
                  {a.acknowledged ? <Badge tone="green">ack</Badge> : <Button size="xs" variant="secondary" onClick={() => run(api.admin.ackAlert(a.id), 'Alert acknowledged')}>Acknowledge</Button>}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Scheduled jobs" icon={Clock} />
            <div className="divide-y divide-line">
              {data.jobs.map((j) => <div key={j.name} className="flex items-center gap-3 px-5 py-2.5 text-sm"><span className="flex-1">{j.name}</span><span className="text-xs text-muted">{relative(j.lastRun)}</span><Badge tone={j.status === 'ok' ? 'green' : j.status === 'missed' ? 'amber' : 'red'}>{j.status}</Badge></div>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AccessDenied() {
  const nav = useNavigate();
  const loc = useLocation();
  const { toast } = useToast();
  const ref = (loc.state as { ref?: string } | null)?.ref ?? uid('REF');
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="card max-w-md p-8 text-center" style={{ outline: 'none' }} role="alert" tabIndex={-1} ref={(el) => el?.focus()}>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-danger"><Lock className="h-8 w-8" /></div>
        <h1 className="mt-4 text-xl font-bold">You don’t have access to this</h1>
        <p className="mt-1 text-sm text-muted">Your role does not include this screen or record. No details are shown.</p>
        <p className="mt-3 font-mono text-xs text-muted">Reference: {ref}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => nav(-1)}>Go back</Button>
          <Button icon={Inbox} onClick={() => toast('success', 'Access requested', `Sent to the office administrator with reference ${ref}`)}>Request access</Button>
        </div>
        <p className="mt-4 text-[11px] text-muted">SCR-61 · This denial was recorded in the audit ledger.</p>
        <Link to="/" className="mt-2 inline-block text-xs text-primary">Home</Link>
      </div>
    </div>
  );
}
