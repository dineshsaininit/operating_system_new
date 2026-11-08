import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Download, BellRing, ArrowUpRight, Paperclip, CheckCircle2, ShieldCheck, History, Mic, Sparkles, Filter } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api, TASK_TRANSITIONS } from '@/services/api';
import { aiChat, aiEnabled } from '@/services/ai';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, Drawer, EmptyState, Field, InfoNote, Input, KeyValue, Modal, PageHeader, ReasonDialog, Select, SkeletonList, TableWrap, Tabs, Toggle } from '@/components/ui';
import { MicButton, TASK_STATE_META, TaskStateBadge } from '@/components/domain';
import { cn, daysBetween, downloadCsv, dueLabel, fmtDate, fmtDateTime } from '@/lib/utils';
import type { Task, TaskState } from '@/types';
import { WARDS } from '@/data/mockDb';

type View = 'all' | 'overdue' | 'week' | 'owner' | 'ward' | 'done';
const OPEN = (t: Task) => !['closed', 'verified', 'cancelled'].includes(t.state);
const OWNERS = ['AE Ward W3', 'JE Ward W1', 'Ward W1 nodal officer', 'EE Roads', 'EE Water W2', 'Garden JE', 'AE SWD Ward W4', 'Medical Officer Health W4', 'PA', 'Disaster management cell'];

const ACTION_LABEL: Partial<Record<TaskState, string>> = {
  assigned: 'Assign', acknowledged: 'Mark acknowledged', 'in-progress': 'Start work', submitted: 'Submit for verification',
  verified: 'Verify', closed: 'Close', reopened: 'Reopen', cancelled: 'Cancel task',
};

export default function Tasks() {
  const { data, loading } = useApi(() => api.tasks.list());
  const { run, toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>('all');
  const [q, setQ] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('open'));
  const [creating, setCreating] = useState(false);
  const [reasonFor, setReasonFor] = useState<{ task: Task; to: TaskState } | null>(null);

  useEffect(() => { const o = params.get('open'); if (o) setOpenId(o); }, [params]);

  const tasks = data ?? [];
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const filtered = useMemo(() => {
    let l = tasks;
    if (view === 'overdue') l = l.filter((t) => OPEN(t) && daysBetween(t.due) > 0);
    if (view === 'week') l = l.filter((t) => OPEN(t) && new Date(t.due) <= weekEnd);
    if (view === 'done') l = l.filter((t) => !OPEN(t));
    if (view === 'all' || view === 'owner' || view === 'ward') l = l.filter(OPEN);
    if (wardFilter) l = l.filter((t) => t.ward === wardFilter);
    if (q) l = l.filter((t) => (t.title + t.ownerPost + t.id).toLowerCase().includes(q.toLowerCase()));
    return l.slice().sort((a, b) => +new Date(a.due) - +new Date(b.due));
  }, [tasks, view, q, wardFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    if (view !== 'owner' && view !== 'ward') return null;
    return filtered.reduce<Record<string, Task[]>>((acc, t) => { const k = view === 'owner' ? t.ownerPost : (t.ward ? `Ward ${t.ward}` : 'Office / zone'); (acc[k] ||= []).push(t); return acc; }, {});
  }, [filtered, view]);

  const open = tasks.find((t) => t.id === openId) ?? null;
  const counts = { overdue: tasks.filter((t) => OPEN(t) && daysBetween(t.due) > 0).length, week: tasks.filter((t) => OPEN(t) && new Date(t.due) <= weekEnd).length, all: tasks.filter(OPEN).length, done: tasks.filter((t) => !OPEN(t)).length };

  const transition = async (t: Task, to: TaskState, note?: string) => {
    if ((to === 'cancelled' || to === 'reopened') && !note) { setReasonFor({ task: t, to }); return; }
    await run(api.tasks.transition(t.id, to, note), `${TASK_STATE_META[to].label}`, `${t.id} · transition recorded with actor and time`);
  };

  const Row = ({ t }: { t: Task }) => {
    const d = dueLabel(t.due);
    return (
      <tr className="cursor-pointer" onClick={() => { setOpenId(t.id); setParams({ open: t.id }); }}>
        <td>
          <div className="flex items-center gap-2">
            {t.priority === 'high' && <span className="h-2 w-2 shrink-0 rounded-full bg-danger" title="High priority" />}
            <div className="min-w-0"><p className="truncate font-medium">{t.title}</p><p className="font-mono text-[10px] text-muted">{t.id}</p></div>
          </div>
        </td>
        <td className="text-muted">{t.source}{t.sourceRef && <span className="block text-[11px]">{t.sourceRef}</span>}</td>
        <td>{t.ownerPost}</td>
        <td>{t.ward ?? '—'}</td>
        <td><Badge tone={OPEN(t) ? d.tone : 'gray'}>{OPEN(t) ? d.text : fmtDate(t.due)}</Badge></td>
        <td><TaskStateBadge state={t.state} />{t.escalated && <Badge tone="red" className="ml-1">escalated</Badge>}</td>
        <td className="text-muted">{t.evidence ? <span className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{t.evidence}</span> : '—'}</td>
      </tr>
    );
  };

  const Table = ({ list }: { list: Task[] }) => (
    <TableWrap>
      <table className="table-base">
        <thead><tr><th className="min-w-[260px]">Task</th><th>Source</th><th>Owner post</th><th>Ward</th><th>Due</th><th>State</th><th>Evidence</th></tr></thead>
        <tbody>{list.map((t) => <Row key={t.id} t={t} />)}</tbody>
      </table>
    </TableWrap>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tasks" subtitle="Commitment ledger — every instruction tracked until it is done and verified." screen="SCR-11" release="P0" env="executive"
        actions={<>
          <Button variant="secondary" icon={Download} onClick={() => downloadCsv('tasks.csv', filtered.map((t) => ({ id: t.id, title: t.title, owner: t.ownerPost, ward: t.ward ?? '', due: t.due.slice(0, 10), state: t.state, evidence: t.evidence })))}>Export</Button>
          <Button icon={Plus} onClick={() => setCreating(true)}>New task</Button>
        </>} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={view} onChange={setView} items={[
          { value: 'all', label: 'Open', count: counts.all }, { value: 'overdue', label: 'Overdue', count: counts.overdue }, { value: 'week', label: 'This week', count: counts.week },
          { value: 'owner', label: 'By owner' }, { value: 'ward', label: 'By ward' }, { value: 'done', label: 'Done', count: counts.done },
        ]} />
        <div className="flex flex-1 gap-2 lg:justify-end">
          <div className="relative w-full max-w-xs"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="pl-8" /></div>
          <Select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} className="w-36"><option value="">All wards</option>{WARDS.map((w) => <option key={w} value={w}>Ward {w}</option>)}</Select>
        </div>
      </div>

      {loading ? <Card><SkeletonList rows={6} /></Card> : filtered.length === 0 ? <Card><EmptyState icon={CheckCircle2} title="No open tasks" description="Nothing matches this view." /></Card> :
        grouped ? (
          <div className="space-y-4">{Object.entries(grouped).map(([k, l]) => (
            <Card key={k} className="overflow-hidden"><div className="flex items-center justify-between border-b border-line bg-surface-2/50 px-4 py-2.5"><p className="text-sm font-semibold">{k}</p><Badge>{l.length}</Badge></div><Table list={l} /></Card>
          ))}</div>
        ) : <Card className="overflow-hidden"><Table list={filtered} /></Card>}

      {/* Detail drawer */}
      <Drawer open={!!open} onClose={() => { setOpenId(null); setParams({}); }} title={open?.title ?? ''} subtitle={open && <span className="flex items-center gap-2"><span className="font-mono">{open.id}</span><TaskStateBadge state={open.state} /></span>}
        footer={open && (
          <>
            {TASK_TRANSITIONS[open.state].filter((s) => !(s === 'verified' && !open.verificationRequired) && !(s === 'closed' && open.verificationRequired && open.state !== 'verified')).map((s) => (
              <Button key={s} size="sm" variant={s === 'cancelled' ? 'ghost' : s === 'reopened' ? 'secondary' : s === 'verified' || s === 'closed' ? 'success' : 'primary'} className={s === 'cancelled' ? 'text-danger' : ''} onClick={() => transition(open, s)}>{ACTION_LABEL[s]}</Button>
            ))}
          </>
        )}>
        {open && (
          <div className="space-y-6">
            <KeyValue items={[
              ['Owner post', open.ownerPost], ['Due', <><span>{fmtDate(open.due)}</span> <Badge tone={dueLabel(open.due).tone}>{dueLabel(open.due).text}</Badge></>],
              ['Ward', open.ward ?? '—'], ['Source', `${open.source}${open.sourceRef ? ` · ${open.sourceRef}` : ''}`],
              ['Verification', open.verificationRequired ? <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-ok" />Required before closure</span> : 'Not required'],
              ['Created by', `${open.createdBy} · ${fmtDate(open.createdAt)}`],
            ]} />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-2 p-4 ring-1 ring-line">
                <p className="text-xs font-semibold text-muted">Nudges this week</p>
                <p className="mt-1 text-2xl font-bold">{open.nudgesThisWeek}<span className="text-sm text-muted">/{open.nudgeCap}</span></p>
                <Button size="xs" variant="outline" className="mt-2" icon={BellRing} disabled={!OPEN(open) || open.nudgesThisWeek >= open.nudgeCap} onClick={() => run(api.tasks.nudge(open.id), 'Follow-up sent', 'Counted against the weekly cap (BR-013)')}>Send follow-up</Button>
              </div>
              <div className="rounded-xl bg-surface-2 p-4 ring-1 ring-line">
                <p className="text-xs font-semibold text-muted">Evidence</p>
                <p className="mt-1 text-2xl font-bold">{open.evidence}<span className="text-sm text-muted"> item(s)</span></p>
                <Button size="xs" variant="outline" className="mt-2" icon={ArrowUpRight} disabled={!OPEN(open) || open.escalated} onClick={() => run(api.tasks.escalate(open.id), 'Escalated to PA')}>Escalate</Button>
              </div>
            </div>
            {open.nudgesThisWeek >= open.nudgeCap && OPEN(open) && <InfoNote tone="amber">Weekly nudge cap reached — escalate instead of sending more reminders.</InfoNote>}
            <div>
              <p className="label flex items-center gap-1"><History className="h-3 w-3" /> State history</p>
              <ol className="relative ml-2 space-y-4 border-l-2 border-line pl-5">
                {open.history.slice().reverse().map((h, i) => (
                  <li key={i} className="relative">
                    <span className={cn('absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-surface', i === 0 ? 'bg-primary' : 'bg-line')} />
                    <div className="flex flex-wrap items-center gap-2"><TaskStateBadge state={h.state} /><span className="text-xs text-muted">{fmtDateTime(h.at)} · {h.by.replace(' (synthetic)', '')}</span></div>
                    {h.note && <p className="mt-1 text-sm text-muted">“{h.note}”</p>}
                  </li>
                ))}
              </ol>
            </div>
            <InfoNote>Transitions follow BR-011: Draft → Assigned → Acknowledged → In progress → Submitted → Verified/Closed; Submitted → Reopened; any open state → Cancelled with reason. The server rejects anything else.</InfoNote>
          </div>
        )}
      </Drawer>

      <NewTaskModal open={creating} onClose={() => setCreating(false)} onCreated={(t) => { toast('success', `Task ${t.id} created`, t.state === 'draft' ? 'Saved as Draft — add owner and due date to assign' : 'Assigned and owner notified via approved channel'); }} />
      <ReasonDialog open={!!reasonFor} onClose={() => setReasonFor(null)} title={reasonFor ? `${ACTION_LABEL[reasonFor.to]}: ${reasonFor.task.title}` : ''} onConfirm={(r) => transition(reasonFor!.task, reasonFor!.to, r)} />
    </div>
  );
}

export function NewTaskModal({ open, onClose, onCreated, preset }: { open: boolean; onClose: () => void; onCreated?: (t: Task) => void; preset?: Partial<Task> }) {
  const [form, setForm] = useState({ title: '', ownerPost: '', due: '', ward: '', verificationRequired: true, priority: 'normal' as Task['priority'] });
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [err, setErr] = useState('');
  const { toast } = useToast();
  useEffect(() => { if (open) { setForm({ title: preset?.title ?? '', ownerPost: preset?.ownerPost ?? '', due: '', ward: preset?.ward ?? '', verificationRequired: true, priority: 'normal' }); setErr(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Voice-to-task (EXEC-M11): dictation → AI extracts owner/due/ward → human confirms. */
  const fromVoice = async (text: string) => {
    setForm((f) => ({ ...f, title: text }));
    if (!aiEnabled()) return;
    setParsing(true);
    try {
      const r = await aiChat([
        { role: 'system', content: `Extract a task from dictation. Reply ONLY with JSON: {"title": string, "ownerPost": one of ${JSON.stringify(OWNERS)} or "", "ward": one of ["W1","W2","W3","W4",""], "dueInDays": number|null}. Today is ${new Date().toDateString()}.` },
        { role: 'user', content: text },
      ], 'Voice-to-task', 0);
      const j = JSON.parse(r.text.replace(/```json|```/g, '').trim());
      const due = j.dueInDays != null ? new Date(Date.now() + j.dueInDays * 86400000).toISOString().slice(0, 10) : '';
      setForm((f) => ({ ...f, title: j.title || text, ownerPost: j.ownerPost || f.ownerPost, ward: j.ward || f.ward, due: due || f.due }));
      toast('info', 'Draft task extracted', 'Check every field before saving — AI output is a draft');
    } catch { /* keep raw text */ } finally { setParsing(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New task" subtitle="A task cannot leave Draft without an owner and a due date." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={async () => {
        if (!form.title.trim()) { setErr('What needs to be done is required'); return; }
        setBusy(true);
        try {
          const t = await api.tasks.create({ ...form, ward: form.ward || undefined, due: form.due ? new Date(form.due).toISOString() : '', source: preset?.source ?? 'Manual', sourceRef: preset?.sourceRef });
          onCreated?.(t); onClose();
        } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
      }}>{form.ownerPost && form.due ? 'Create and assign' : 'Save as draft'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What needs to be done" required className="sm:col-span-2" error={err}>
          <div className="flex gap-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Submit desilting report for nullah N-4" autoFocus />
            <MicButton onResult={fromVoice} />
          </div>
          {parsing && <p className="mt-1 flex items-center gap-1 text-xs text-ai"><Sparkles className="h-3 w-3" />Extracting owner, ward and due date…</p>}
          {!parsing && <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Mic className="h-3 w-3" />Dictate in Marathi, Hindi or English — becomes a draft for you to confirm</p>}
        </Field>
        <Field label="Owner post"><Select value={form.ownerPost} onChange={(e) => setForm({ ...form, ownerPost: e.target.value })}><option value="">— choose —</option>{OWNERS.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field label="Due date"><Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></Field>
        <Field label="Ward"><Select value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })}><option value="">Office / zone</option>{WARDS.map((w) => <option key={w} value={w}>Ward {w}</option>)}</Select></Field>
        <Field label="Priority"><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Task['priority'] })}><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></Select></Field>
        <div className="sm:col-span-2"><Toggle checked={form.verificationRequired} onChange={(v) => setForm({ ...form, verificationRequired: v })} label="Verification required" description="Only the assigner or delegate can close after reviewing evidence" /></div>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><Filter className="h-3 w-3" />Owner is a post, not a person — tasks follow transfers automatically.</p>
    </Modal>
  );
}
