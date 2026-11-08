import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, NotebookPen, FileText, ScrollText, Building2, HandHeart, Scale, Siren, Search, Phone, Mail, Lock, Camera, BookOpen, LineChart, ListOrdered, ArrowRight, Users, Clock, History, Check, X, CornerUpRight } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { db } from '@/data/mockDb';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { canAccess } from '@/config/navigation';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, InfoNote, KeyValue, Modal, PageHeader, ReasonDialog, ReleaseBadge, Select, SkeletonList, TableWrap, Textarea } from '@/components/ui';
import { QUEUE_META, REQUEST_META } from '@/components/domain';
import { cn, fmtDateTime, fmtTime } from '@/lib/utils';
import type { Release } from '@/types';

const TILES: { to: string; label: string; sub: string; icon: typeof ClipboardList; release: Release; c: string; needsAuth?: boolean }[] = [
  { to: '/exec/tasks', label: 'Tasks', sub: 'Commitment ledger', icon: ClipboardList, release: 'P0', c: 'from-blue-500 to-indigo-600' },
  { to: '/exec/meetings', label: 'Meetings', sub: 'Notes and minutes', icon: NotebookPen, release: 'P0', c: 'from-sky-500 to-blue-600' },
  { to: '/exec/documents', label: 'Documents', sub: 'Office records', icon: FileText, release: 'P0', c: 'from-slate-500 to-slate-700' },
  { to: '/gov/decisions', label: 'Decision log', sub: 'Record only', icon: ScrollText, release: 'P0', c: 'from-indigo-500 to-violet-600' },
  { to: '/exec/insights', label: 'Insights', sub: 'Baseline metrics', icon: LineChart, release: 'P0', c: 'from-cyan-500 to-teal-600' },
  { to: '/exec/queue', label: 'Visitor queue', sub: 'Who is waiting', icon: ListOrdered, release: 'P0', c: 'from-teal-500 to-emerald-600' },
  { to: '/gov/zone', label: 'Wards', sub: 'Zone exceptions', icon: Building2, release: 'P2', c: 'from-green-500 to-emerald-700', needsAuth: true },
  { to: '/gov/pm', label: 'Participate Mumbai', sub: 'CSR projects', icon: HandHeart, release: 'P2', c: 'from-emerald-500 to-teal-700', needsAuth: true },
  { to: '/gov/statutory', label: 'Statutory', sub: 'Deadlines (unverified rules)', icon: Scale, release: 'P2', c: 'from-amber-500 to-orange-600', needsAuth: true },
  { to: '/gov/rulebook', label: 'Rulebook', sub: 'Cited search', icon: BookOpen, release: 'P1', c: 'from-orange-500 to-amber-600' },
  { to: '/gov/inspection', label: 'Inspection', sub: 'Field capture', icon: Camera, release: 'P1', c: 'from-lime-500 to-green-600' },
  { to: '/gov/emergency', label: 'Emergency', sub: 'Incident mode', icon: Siren, release: 'P1', c: 'from-red-500 to-rose-600' },
];

export function OfficeHub() {
  const { session } = useApp();
  const { data: contacts, loading } = useApi(() => api.contacts.list());
  const [q, setQ] = useState('');
  const role = session!.user.role;
  const tiles = TILES.filter((t) => canAccess(role, t.to) && (db.config.showFutureReleases || t.release === 'P0'));
  const list = (contacts ?? []).filter((c) => (c.post + c.holder + c.dept + (c.ward ?? '')).toLowerCase().includes(q.toLowerCase()));

  useEffect(() => { if (window.location.hash === '#directory') document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }); }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Office" subtitle="Every area of the office in one place. Areas without release or authorization explain why." screen="SCR-05" release="P0" env="executive" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="card group relative flex flex-col p-4 lift">
            <div className={cn('grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow', t.c)}><t.icon className="h-5 w-5" /></div>
            <p className="mt-3 text-sm font-semibold">{t.label}</p>
            <p className="text-xs text-muted">{t.sub}</p>
            <div className="mt-3 flex items-center gap-1.5">
              <ReleaseBadge release={t.release} />
              {t.needsAuth && !db.config.governanceAuthorized && <span className="flex items-center gap-1 text-[10px] font-medium text-warn"><Lock className="h-3 w-3" />awaiting authorization</span>}
            </div>
            <ArrowRight className="absolute right-4 top-4 h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      <Card className="mt-6" id="directory">
        <CardHeader title="Directory" subtitle="Role-based — follows postings, not people" icon={Users}
          action={<div className="relative w-56"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by post, ward…" className="pl-8" /></div>} />
        {loading ? <SkeletonList /> : (
          <TableWrap>
            <table className="table-base">
              <thead><tr><th>Post</th><th>Current holder</th><th>Department</th><th>Ward</th><th className="text-right">Contact</th></tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.post}</td><td className="text-muted">{c.holder}</td><td>{c.dept}</td><td>{c.ward ?? '—'}</td>
                    <td className="text-right">
                      <a href={`tel:${c.phone}`} className="mr-1 inline-flex rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-primary" title={c.phone}><Phone className="h-4 w-4" /></a>
                      <a href={`mailto:${c.email}`} className="inline-flex rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-primary" title={c.email}><Mail className="h-4 w-4" /></a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}

export function ExecQueue() {
  const { data, loading } = useApi(() => api.queue.list());
  const { toast } = useToast();
  const live = (data ?? []).filter((q) => ['waiting', 'called', 'in-meeting'].includes(q.status));
  return (
    <div className="animate-fade-in">
      <PageHeader title="Visitor queue" subtitle="Who is waiting. Personal details beyond name are not shown here." screen="SCR-09" release="P0" env="executive"
        actions={<Button icon={ArrowRight} onClick={() => { api.dashboard.replyWhisper('Call next visitor'); toast('success', 'PA asked to call next'); }}>Ask PA to call next</Button>} />
      <Card>
        {loading ? <SkeletonList /> : live.length === 0 ? <EmptyState icon={Users} title="No one waiting" /> : (
          <div className="divide-y divide-line">
            {live.map((q, i) => (
              <div key={q.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="grid h-12 w-16 place-items-center rounded-xl bg-surface-2 font-mono text-lg font-bold ring-1 ring-line">{q.token}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{q.visitorName}</p>
                  <p className="text-xs text-muted">{q.category} · Ward {q.ward} · {q.type === 'appointment' ? `appointment ${q.appointmentTime ? fmtTime(q.appointmentTime) : ''}` : 'walk-in'}</p>
                </div>
                <div className="text-right">
                  <Badge tone={QUEUE_META[q.status].tone} dot>{QUEUE_META[q.status].label}</Badge>
                  <p className="mt-1 text-xs text-muted">{q.status === 'waiting' ? `est. ${q.waitMin[0]}–${q.waitMin[1]} min` : `#${i + 1}`}</p>
                </div>
                {q.status === 'waiting' && q.routeSuggestion && (
                  <Button size="sm" variant="outline" icon={CornerUpRight} onClick={() => { api.dashboard.replyWhisper(`Route ${q.token} to ward`); toast('success', `PA asked to route ${q.token}`, q.routeSuggestion); }}>Route to ward</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function AppointmentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { session } = useApp();
  const { run } = useToast();
  const { data: r, loading } = useApi(() => api.requests.get(id!), [id]);
  const { data: visitors } = useApi(() => api.visitors.list());
  const [declining, setDeclining] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [slot, setSlot] = useState('');
  const visitor = visitors?.find((v) => v.id === r?.visitorId);
  const slots = [2, 3, 4].map((d) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(d === 3 ? 17 : 12, d === 3 ? 30 : 0, 0, 0); return x.toISOString(); });

  if (loading) return <Card><SkeletonList /></Card>;
  if (!r) return <Card><EmptyState title="Request not found" /></Card>;
  const canApprove = !r.reserved || session!.user.role === 'ROLE-01';

  return (
    <div className="animate-fade-in">
      <PageHeader title={`Request ${r.id}`} subtitle={`${r.visitorName} · ${r.category} · Ward ${r.ward}`} screen="SCR-07" release="P0" env="executive" actions={<Badge tone={REQUEST_META[r.status].tone} dot>{REQUEST_META[r.status].label}</Badge>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Purpose" icon={Clock} />
          <div className="p-5">
            <p className="text-[15px] leading-relaxed">{r.purpose}</p>
            <KeyValue className="mt-5" items={[['Received', `${fmtDateTime(r.receivedAt)} · ${r.channel}`], ['Category', <>{r.category} {r.reserved && <Badge tone="purple">reserved</Badge>}</>], ['Ward', r.ward], ['Mobile', r.mobile]]} />
            {r.status === 'requested' || r.status === 'escalated' ? (
              <>
                <p className="label mt-6">Slot options (conflict-checked)</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {slots.map((s) => (
                    <button key={s} onClick={() => setSlot(s)} className={cn('rounded-xl border p-3 text-left text-sm', slot === s ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-line hover:border-primary/40')}>
                      <p className="font-semibold">{new Date(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="text-xs text-muted">{fmtTime(s)} · <span className="text-ok">✓ free</span></p>
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="success" icon={Check} disabled={!slot || !canApprove} onClick={async () => { await run(api.requests.approve(r.id, slot), 'Appointment approved', 'Confirmation queued via approved SMS template'); nav(-1); }}>Approve</Button>
                  <Button variant="secondary" icon={CornerUpRight} onClick={() => setRedirecting(true)}>Redirect</Button>
                  <Button variant="ghost" icon={X} className="text-danger" onClick={() => setDeclining(true)}>Decline</Button>
                </div>
                {!canApprove && <p className="mt-2 text-xs text-warn">Reserved category — only the executive can approve.</p>}
              </>
            ) : <InfoNote>{r.status === 'approved' ? `Approved for ${r.slot ? fmtDateTime(r.slot) : '—'}` : `${REQUEST_META[r.status].label}${r.reason ? ` — ${r.reason}` : ''}${r.redirectTarget ? ` → ${r.redirectTarget}` : ''}`}</InfoNote>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Visitor history" subtitle="Context only" icon={History} iconClass="bg-slate-500/10 text-muted" />
          <div className="p-5">
            {visitor ? visitor.visits.map((v) => (
              <div key={v.ref} className="mb-3 border-l-2 border-line pl-3">
                <p className="text-xs text-muted">{fmtDateTime(v.date)} · {v.type}</p><p className="text-sm font-medium">{v.purpose}</p><p className="text-xs text-muted">{v.outcome}</p>
              </div>
            )) : <p className="text-sm text-muted">{r.priorVisits ? `${r.priorVisits} earlier visit(s) on record` : 'First recorded visit'}</p>}
            <InfoNote tone="amber">History must not decide the outcome of a request.</InfoNote>
          </div>
        </Card>
      </div>
      <ReasonDialog open={declining} onClose={() => setDeclining(false)} title="Decline request" onConfirm={async (reason) => { await run(api.requests.decline(r.id, reason), 'Declined', 'Visitor informed with the reason'); }} />
      <RedirectDialog open={redirecting} onClose={() => setRedirecting(false)} onConfirm={async (t, reason) => { await run(api.requests.redirect(r.id, t, reason), `Redirected to ${t}`); }} />
    </div>
  );
}

export const REDIRECT_TARGETS = ['Ward W1 Assistant Commissioner', 'Ward W2 Executive Engineer (Water)', 'Ward W3 Assistant Engineer (Building)', 'Ward W4 Licence Inspector', 'EE Roads', 'Participate Mumbai Cell', 'Disaster Management Cell'];

export function RedirectDialog({ open, onClose, onConfirm, defaultTarget }: { open: boolean; onClose: () => void; onConfirm: (target: string, reason: string) => Promise<unknown>; defaultTarget?: string }) {
  const [target, setTarget] = useState(defaultTarget ?? REDIRECT_TARGETS[0]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setReason(''); setTarget(defaultTarget && REDIRECT_TARGETS.includes(defaultTarget) ? defaultTarget : REDIRECT_TARGETS[0]); } }, [open, defaultTarget]);
  return (
    <Modal open={open} onClose={onClose} title="Redirect to the right desk" subtitle="The visitor is told where to go and why. Stored in the audit ledger." size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button icon={CornerUpRight} disabled={!reason.trim()} loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(target, reason.trim()); onClose(); } finally { setBusy(false); } }}>Redirect</Button>
      </>}>
      <div className="space-y-4">
        <Field label="Redirect target"><Select value={target} onChange={(e) => setTarget(e.target.value)}>{REDIRECT_TARGETS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Ward office handles this category directly" /></Field>
      </div>
    </Modal>
  );
}
