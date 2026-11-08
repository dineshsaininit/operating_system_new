import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search, UserRound, Pencil, Unlink, ShieldQuestion, AlertTriangle, ArrowUpRight, Send, ShieldCheck, Clock, Plus, Sparkles, Mail, MessageSquare, FileText, Bell, Trash2, Check, Ban } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { aiChat, aiEnabled, GUARDRAIL_SYSTEM } from '@/services/ai';
import { db } from '@/data/mockDb';
import { useToast } from '@/store/ToastContext';
import { Avatar, Badge, Button, Card, CardHeader, DraftLabel, Drawer, EmptyState, Field, InfoNote, Input, KeyValue, Modal, PageHeader, Progress, Select, SkeletonList, TableWrap, Tabs, Textarea } from '@/components/ui';
import { LANG_LABEL } from '@/i18n/strings';
import { cn, daysBetween, fmtDate, fmtDateTime, relative } from '@/lib/utils';
import type { Draft, Lang, Task } from '@/types';

export function VisitorsList() {
  const { data, loading } = useApi(() => api.visitors.list());
  const [q, setQ] = useState('');
  const list = (data ?? []).filter((v) => (v.name + v.mobile).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="animate-fade-in">
      <PageHeader title="Visitors" subtitle="Prior official interactions — assistive context, never a basis for decisions." screen="SCR-58" release="P0" env="executive" />
      <div className="relative mb-4 max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or masked mobile…" className="pl-9" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? <Card className="sm:col-span-3"><SkeletonList /></Card> : list.map((v) => (
          <Link key={v.id} to={`/pa/visitors/${v.id}`} className="card flex items-start gap-4 p-5 lift">
            <Avatar name={v.name} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{v.name}</p>
              <p className="text-xs text-muted">{v.mobile} · {LANG_LABEL[v.language]}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge>{v.visits.length} visit(s)</Badge>
                {v.commitments.some((c) => c.overdue) && <Badge tone="red">overdue commitment</Badge>}
                <span className="text-[11px] text-muted">last {relative(v.visits[0].date)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function VisitorRecord() {
  const { id } = useParams();
  const { data: v, loading } = useApi(() => api.visitors.get(id!), [id]);
  const { run, toast } = useToast();
  const [dpOpen, setDpOpen] = useState(false);
  const [dpKind, setDpKind] = useState('Access to my data');
  if (loading) return <Card><SkeletonList /></Card>;
  if (!v) return <Card><EmptyState title="Visitor not found" /></Card>;
  return (
    <div className="animate-fade-in">
      <PageHeader title={<span className="flex items-center gap-3">{v.name}<Badge tone="amber">context only</Badge></span>} subtitle="Visitor record — profile, visits, appointments and open commitments." screen="SCR-58" release="P0" env="executive"
        actions={<>
          <Button variant="secondary" icon={Pencil} onClick={() => toast('info', 'Edit contact', 'Contact edits are audited')}>Edit contact</Button>
          <Button variant="secondary" icon={Unlink} onClick={() => toast('warning', 'Record unlink requested', 'PA chooses which record to keep on merge conflict')}>Unlink record</Button>
          <Button variant="outline" icon={ShieldQuestion} onClick={() => setDpOpen(true)}>Data request</Button>
        </>} />
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader title="Profile" icon={UserRound} />
          <div className="p-5">
            <KeyValue className="sm:grid-cols-1" items={[['Name', v.name], ['Mobile', v.mobile], ['Preferred language', LANG_LABEL[v.language]], ['Privacy notice', `Version ${v.noticeVersion} (${fmtDate(v.noticeDate)})`]]} />
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader title="Visits and appointments" icon={Clock} />
            <TableWrap>
              <table className="table-base">
                <thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Purpose</th><th>Outcome</th></tr></thead>
                <tbody>{v.visits.map((x) => <tr key={x.ref}><td>{fmtDate(x.date)}</td><td>{x.type}</td><td className="font-mono text-xs">{x.ref}</td><td>{x.purpose}</td><td className="text-muted">{x.outcome}</td></tr>)}</tbody>
              </table>
            </TableWrap>
          </Card>
          <Card>
            <CardHeader title="Open commitments to this visitor" icon={AlertTriangle} iconClass="bg-amber-500/10 text-warn" />
            <div className="p-5">
              {v.commitments.length === 0 ? <p className="text-sm text-muted">None</p> : v.commitments.map((c) => (
                <div key={c.text} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 ring-1 ring-line">
                  <div><p className="text-sm font-medium">{c.text}</p><p className="text-xs text-muted">Owner: {c.owner} · due {fmtDate(c.due)}</p></div>
                  {c.overdue && <Badge tone="red">overdue</Badge>}
                </div>
              ))}
            </div>
          </Card>
          <InfoNote tone="amber">Context only: history must not decide the outcome of a request. Reception sees today’s visit only.</InfoNote>
        </div>
      </div>
      <Modal open={dpOpen} onClose={() => setDpOpen(false)} title="Record a data-protection request" subtitle="Logged against the visitor; response tracked to closure."
        footer={<><Button variant="secondary" onClick={() => setDpOpen(false)}>Cancel</Button><Button onClick={async () => { await run(api.visitors.recordDataRequest(v.id, dpKind), 'Data request recorded'); setDpOpen(false); }}>Record request</Button></>}>
        <Field label="Request type"><Select value={dpKind} onChange={(e) => setDpKind(e.target.value)}>{['Access to my data', 'Correction', 'Erasure (subject to retention rules)', 'Withdraw consent for SMS'].map((k) => <option key={k}>{k}</option>)}</Select></Field>
      </Modal>
    </div>
  );
}

export function FollowUpBoard() {
  const { data, loading } = useApi(() => api.tasks.list());
  const { run } = useToast();
  const [sel, setSel] = useState<Task | null>(null);
  const open = (data ?? []).filter((t) => !['closed', 'verified', 'cancelled', 'draft'].includes(t.state));
  const cols = [
    { key: 'overdue', title: 'Overdue', tone: 'border-t-danger', list: open.filter((t) => daysBetween(t.due) > 0 && !t.escalated && t.state !== 'submitted') },
    { key: 'soon', title: 'Due in 3 days', tone: 'border-t-warn', list: open.filter((t) => daysBetween(t.due) <= 0 && daysBetween(t.due) >= -3 && t.state !== 'submitted' && !t.escalated) },
    { key: 'esc', title: 'Escalated to PA', tone: 'border-t-purple-500', list: open.filter((t) => t.escalated) },
    { key: 'verify', title: 'Awaiting verification', tone: 'border-t-ok', list: open.filter((t) => t.state === 'submitted') },
  ];
  const owners = Object.values(open.reduce<Record<string, { owner: string; used: number; cap: number }>>((acc, t) => {
    const o = acc[t.ownerPost] ??= { owner: t.ownerPost, used: 0, cap: t.nudgeCap }; o.used = Math.max(o.used, t.nudgesThisWeek); return acc;
  }, {})).sort((a, b) => b.used - a.used);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Follow-up board" subtitle="Commitment ledger — chase what is overdue. Reminders follow a ladder with a weekly cap per officer." screen="SCR-24" release="P0" env="executive" />
      {loading ? <Card><SkeletonList /></Card> : (
        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {cols.map((c) => (
              <div key={c.key} className={cn('rounded-2xl border border-line border-t-4 bg-surface-2/60 p-3', c.tone)}>
                <div className="mb-3 flex items-center justify-between px-1"><p className="text-sm font-semibold">{c.title}</p><Badge>{c.list.length}</Badge></div>
                <div className="space-y-2">
                  {c.list.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted">Nothing here</p>}
                  {c.list.map((t) => (
                    <button key={t.id} onClick={() => setSel(t)} className="block w-full rounded-xl border border-line bg-surface p-3 text-left shadow-card lift">
                      <p className="text-sm font-medium leading-snug">{t.title}</p>
                      <p className="mt-1 text-xs text-muted">{t.ownerPost} · {daysBetween(t.due) > 0 ? `${daysBetween(t.due)} d late` : daysBetween(t.due) === 0 ? 'today' : fmtDate(t.due)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={cn('text-[11px] font-semibold', t.nudgesThisWeek >= t.nudgeCap ? 'text-danger' : 'text-muted')}>nudges {t.nudgesThisWeek}/{t.nudgeCap}</span>
                        {c.key === 'verify' && <Badge tone="green">{t.evidence} evidence</Badge>}
                        {c.key === 'esc' && <Badge tone="purple">ladder finished</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Card className="h-fit">
            <CardHeader title="Nudge budget" subtitle="Weekly cap per officer (BR-013)" icon={Bell} />
            <div className="space-y-4 p-5">
              {owners.map((o) => (
                <div key={o.owner}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{o.owner}</span><span className={cn(o.used >= o.cap ? 'text-danger' : 'text-muted')}>{o.used} of {o.cap}</span></div>
                  <Progress value={o.used} max={o.cap} tone={o.used >= o.cap ? 'red' : o.used >= o.cap - 1 ? 'amber' : 'blue'} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.title ?? ''} subtitle={sel?.id}
        footer={sel && <>
          {sel.state === 'submitted' ? <Button variant="success" icon={ShieldCheck} onClick={async () => { await run(api.tasks.transition(sel.id, sel.verificationRequired ? 'verified' : 'closed', 'Evidence reviewed by PA (delegate)'), 'Verified'); setSel(null); }}>Verify</Button> : <>
            <Button variant="secondary" icon={ArrowUpRight} disabled={sel.escalated} onClick={async () => { await run(api.tasks.escalate(sel.id), 'Escalated'); setSel(null); }}>Escalate</Button>
            <Button icon={Send} disabled={sel.nudgesThisWeek >= sel.nudgeCap} onClick={async () => { await run(api.tasks.nudge(sel.id), 'Follow-up sent', 'Via approved channel'); setSel(null); }}>Send follow-up</Button>
          </>}
          {sel.state !== 'submitted' && <Button variant="ghost" onClick={async () => { await run(api.tasks.transition(sel.id, 'cancelled', 'Closed by PA — no longer required'), 'Closed'); setSel(null); }}>Close</Button>}
        </>}>
        {sel && <div className="space-y-4">
          <KeyValue items={[['Owner', sel.ownerPost], ['Due', fmtDate(sel.due)], ['Nudges this week', `${sel.nudgesThisWeek} of ${sel.nudgeCap}`], ['Evidence', `${sel.evidence} item(s)`]]} />
          {sel.nudgesThisWeek >= sel.nudgeCap && <InfoNote tone="amber">Weekly cap reached — escalate rather than send more reminders.</InfoNote>}
        </div>}
      </Drawer>
    </div>
  );
}

const DRAFT_META: Record<Draft['status'], { label: string; tone: 'gray' | 'amber' | 'blue' | 'green' | 'red' }> = {
  draft: { label: 'Draft', tone: 'gray' }, 'pending-approval': { label: 'Awaiting approval', tone: 'amber' }, approved: { label: 'Approved', tone: 'blue' }, sent: { label: 'Sent', tone: 'green' }, rejected: { label: 'Rejected', tone: 'red' }, failed: { label: 'Channel blocked', tone: 'red' },
};
const CH_ICON = { email: Mail, sms: MessageSquare, letter: FileText, 'in-app': Bell };
const TEMPLATES = ['Appointment confirmed', 'Acknowledgement', 'Follow-up reminder', 'Contractor notice', 'Redirect to ward'];

export function DraftsOutbox() {
  const { data, loading } = useApi(() => api.drafts.list());
  const { run, toast } = useToast();
  const [tab, setTab] = useState<'all' | Draft['status']>('all');
  const [edit, setEdit] = useState<Partial<Draft> | null>(null);
  const [brief, setBrief] = useState('');
  const [gen, setGen] = useState(false);
  const list = (data ?? []).filter((d) => tab === 'all' || d.status === tab);

  const generate = async () => {
    if (!edit) return;
    setGen(true);
    try {
      const r = await aiChat([
        { role: 'system', content: `${GUARDRAIL_SYSTEM}\nWrite official correspondence for a municipal office. Output only the message body. Language: ${LANG_LABEL[(edit.language ?? 'en') as Lang]}. Channel: ${edit.channel}. ${edit.channel === 'sms' ? 'Max 300 characters.' : ''} Sign as "Office of the DMC Zone II (synthetic)".` },
        { role: 'user', content: `Template: ${edit.template ?? 'free'}. Recipient: ${edit.recipient || 'unspecified'}. Brief: ${brief}` },
      ], 'Communication drafting', 0.4);
      setEdit({ ...edit, body: r.text.trim(), aiGenerated: true });
    } catch (e) { toast('error', 'AI unavailable', (e as Error).message); } finally { setGen(false); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Drafts & outbox" subtitle="Prepare messages from templates; send only through approved channels after approval." screen="SCR-25" release="P0" env="executive"
        actions={<Button icon={Plus} onClick={() => { setEdit({ title: '', body: '', channel: 'email', language: 'en', recipient: '', template: TEMPLATES[1] }); setBrief(''); }}>New draft</Button>} />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[{ value: 'all', label: 'All', count: data?.length }, ...(['draft', 'pending-approval', 'approved', 'sent', 'failed'] as Draft['status'][]).map((s) => ({ value: s, label: DRAFT_META[s].label, count: data?.filter((d) => d.status === s).length }))]} />
      {loading ? <Card><SkeletonList /></Card> : list.length === 0 ? <Card><EmptyState icon={FileText} title="No drafts" /></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((d) => {
            const CI = CH_ICON[d.channel];
            return (
              <Card key={d.id} className="flex flex-col">
                <div className="flex items-start gap-3 p-5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted ring-1 ring-line"><CI className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{d.title}</p>{d.aiGenerated && <DraftLabel />}<Badge tone={DRAFT_META[d.status].tone}>{DRAFT_META[d.status].label}</Badge></div>
                    <p className="text-xs text-muted">To {d.recipient || '—'} · {d.channel.toUpperCase()} · {LANG_LABEL[d.language]} · {relative(d.updatedAt)}</p>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-ink/80">{d.body}</p>
                    {d.status === 'failed' && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-danger"><Ban className="h-3.5 w-3.5" />SMS sender ID not approved (DEC-010)</p>}
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-line bg-surface-2/40 px-5 py-3">
                  {['draft', 'rejected', 'failed', 'approved'].includes(d.status) && <Button size="xs" variant="secondary" icon={Pencil} onClick={() => { setEdit(d); setBrief(''); }}>Edit</Button>}
                  {['draft', 'rejected'].includes(d.status) && <Button size="xs" icon={Send} onClick={() => run(api.drafts.requestApproval(d.id), 'Approval requested', 'Added to the executive’s Decide queue')}>Request approval</Button>}
                  {d.status === 'approved' && <Button size="xs" variant="success" icon={Check} onClick={() => run(api.drafts.send(d.id), 'Sent', `Delivery tracked on ${d.channel}`)}>Send</Button>}
                  {d.status !== 'sent' && <Button size="xs" variant="ghost" icon={Trash2} className="ml-auto text-muted" onClick={() => run(api.drafts.remove(d.id), 'Draft deleted')} aria-label="Delete" />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit draft' : 'New draft'} subtitle="Edits to an approved draft return it to Draft." size="lg"
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={!edit?.title || !edit?.body} onClick={async () => { await run(api.drafts.save(edit as Draft), 'Draft saved'); setEdit(null); }}>Save draft</Button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required className="sm:col-span-2"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="Recipient"><Input value={edit.recipient} onChange={(e) => setEdit({ ...edit, recipient: e.target.value })} /></Field>
            <Field label="Template"><Select value={edit.template} onChange={(e) => setEdit({ ...edit, template: e.target.value })}>{TEMPLATES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Channel" hint={!db.config.smsSenderApproved ? 'SMS blocked until sender ID approved (DEC-010)' : undefined}><Select value={edit.channel} onChange={(e) => setEdit({ ...edit, channel: e.target.value as Draft['channel'] })}><option value="email">E-mail</option><option value="sms">SMS</option><option value="letter">Letter</option><option value="in-app">In-app</option></Select></Field>
            <Field label="Language"><Select value={edit.language} onChange={(e) => setEdit({ ...edit, language: e.target.value as Lang })}>{(['en', 'mr', 'hi'] as Lang[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}</Select></Field>
            {aiEnabled() && (
              <div className="rounded-xl border border-orange-500/25 bg-orange-500/[0.04] p-3 sm:col-span-2">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ai"><Sparkles className="h-3.5 w-3.5" />Draft with AI — output is labelled AI DRAFT and needs approval</p>
                <div className="flex gap-2"><Input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. confirm Thursday 12:00 meeting, bring property documents" /><Button variant="ai" loading={gen} disabled={!brief.trim()} onClick={generate}>Generate</Button></div>
              </div>
            )}
            <Field label="Message" required className="sm:col-span-2"><Textarea rows={8} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value, aiGenerated: false /* a human edit removes the AI label */ })} /></Field>
            {edit.aiGenerated && <div className="sm:col-span-2"><DraftLabel /></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
