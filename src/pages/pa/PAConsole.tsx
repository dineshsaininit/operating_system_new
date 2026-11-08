import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users, Inbox, Gavel, ListChecks, Send, Radio, PhoneCall, Check, X, CornerUpRight, ArrowUpRight, Pause, Play, ArrowUp, ArrowDown, UserSearch, Info, Clock, Globe, Phone, Mail, FileText, Footprints } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, CardHeader, Drawer, EmptyState, Field, InfoNote, KeyValue, PageHeader, ReasonDialog, Select, SkeletonList, StatCard, TableWrap, Tabs, Textarea } from '@/components/ui';
import { QUEUE_META, REQUEST_META } from '@/components/domain';
import { RedirectDialog } from '@/pages/executive/Office';
import { cn, daysBetween, dueLabel, fmtDateTime, fmtTime, relative } from '@/lib/utils';
import type { AppointmentRequest, QueueEntry, RequestChannel } from '@/types';

const WHISPERS = ['Urgent call waiting', 'Visitor waiting beyond slot', 'Senior officer at door', 'Please join next meeting', 'Running late — next appointment'];
const STATUSES: { text: string; tone: 'busy' | 'available' | 'away' | 'travel' }[] = [
  { text: 'Available', tone: 'available' }, { text: 'In meeting until 11:30', tone: 'busy' }, { text: 'On site visit', tone: 'travel' }, { text: 'Away from office', tone: 'away' },
];

export function PAConsole() {
  const { data, loading } = useApi(() => api.dashboard.pa());
  const { run, toast } = useToast();
  const [whisper, setWhisper] = useState(WHISPERS[0]);
  const [note, setNote] = useState('');

  if (loading || !data) return <Card><SkeletonList rows={6} /></Card>;
  const toneDot = { available: 'bg-ok', busy: 'bg-danger', away: 'bg-slate-400', travel: 'bg-warn' }[data.execStatus.tone];

  return (
    <div className="animate-fade-in">
      <PageHeader title="PA console" subtitle="Run the day — queue, requests, decisions, follow-ups and the executive’s status in one place." screen="SCR-20" release="P0" env="executive" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Link to="/pa/queue"><StatCard label="Waiting in queue" value={data.queue.filter((q) => q.status === 'waiting').length} icon={Users} tone="teal" /></Link>
        <Link to="/pa/inbox"><StatCard label="Requests in inbox" value={data.inboxCount} icon={Inbox} tone="blue" /></Link>
        <StatCard label="In executive’s Decide" value={data.decideCount} icon={Gavel} tone="amber" />
        <Link to="/pa/follow-ups"><StatCard label="Follow-ups due" value={data.followUpsDue.length} icon={ListChecks} tone="red" /></Link>
        <Card className="col-span-2 p-4 lg:col-span-1">
          <p className="text-xs font-medium text-muted">Executive status</p>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-semibold"><span className={cn('h-2.5 w-2.5 rounded-full', toneDot)} />{data.execStatus.text}</p>
          <Select className="mt-2 h-8 py-1 text-xs" value={data.execStatus.text} onChange={(e) => { const s = STATUSES.find((x) => x.text === e.target.value)!; run(api.dashboard.setExecStatus(s.text, s.tone), 'Status updated'); }}>
            {STATUSES.map((s) => <option key={s.text}>{s.text}</option>)}
          </Select>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Queue now" subtitle="Live" icon={Radio} iconClass="bg-teal-500/10 text-teal-600" action={<Button size="sm" icon={PhoneCall} onClick={async () => { const n = await run(api.queue.callNext(), 'Next visitor called'); if (n === null) toast('info', 'No one waiting'); }}>Call next</Button>} />
          {data.queue.length === 0 ? <EmptyState title="No one waiting" /> : (
            <TableWrap>
              <table className="table-base">
                <thead><tr><th>Token</th><th>Visitor</th><th>Category</th><th>Wait est.</th><th>Status</th></tr></thead>
                <tbody>
                  {data.queue.map((q) => (
                    <tr key={q.id}>
                      <td className="font-mono font-bold">{q.token}</td>
                      <td>{q.visitorName}</td>
                      <td>{q.category}{q.routeSuggestion && <span className="block text-[11px] text-warn">right desk: {q.routeSuggestion}</span>}</td>
                      <td className="text-muted">{q.status === 'waiting' ? `${q.waitMin[0]}–${q.waitMin[1]} min` : 'now'}</td>
                      <td><Badge tone={QUEUE_META[q.status].tone} dot>{QUEUE_META[q.status].label}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>

        <Card>
          <CardHeader title="Silent whisper" subtitle="Generic text on lock screen and watch" icon={Send} iconClass="bg-indigo-500/10 text-indigo-600" />
          <div className="space-y-3 p-5">
            <Field label="Type"><Select value={whisper} onChange={(e) => setWhisper(e.target.value)}>{WHISPERS.map((w) => <option key={w}>{w}</option>)}</Select></Field>
            <Field label="Optional note" hint="Shown only after unlock"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <Button className="w-full" icon={Send} onClick={async () => { await run(api.dashboard.sendWhisper(whisper, note), 'Whisper sent', 'Reply expected within 60 s — otherwise use other means'); setNote(''); }}>Send whisper</Button>
            {data.whisperLast && <div className="rounded-xl bg-surface-2 p-3 text-sm ring-1 ring-line">Last reply: <b>“{data.whisperLast.text}”</b> <span className="text-muted">· {fmtTime(data.whisperLast.at)}</span></div>}
          </div>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <CardHeader title="Follow-ups due today" subtitle="Nudges count against a weekly cap per officer" icon={ListChecks} iconClass="bg-red-500/10 text-danger" action={<Link to="/pa/follow-ups" className="text-xs font-semibold text-primary">Open board</Link>} />
        <TableWrap>
          <table className="table-base">
            <thead><tr><th>Task</th><th>Owner post</th><th>Due</th><th>Nudges this week</th><th /></tr></thead>
            <tbody>
              {data.followUpsDue.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.title}</td><td>{t.ownerPost}</td>
                  <td><Badge tone={dueLabel(t.due).tone}>{dueLabel(t.due).text}</Badge></td>
                  <td><span className={cn('font-semibold', t.nudgesThisWeek >= t.nudgeCap && 'text-danger')}>{t.nudgesThisWeek} of {t.nudgeCap}</span></td>
                  <td className="text-right">{t.nudgesThisWeek >= t.nudgeCap ? <Button size="xs" variant="outline" icon={ArrowUpRight} onClick={() => run(api.tasks.escalate(t.id), 'Escalated')}>Escalate</Button> : <Button size="xs" variant="secondary" icon={Send} onClick={() => run(api.tasks.nudge(t.id), 'Follow-up sent')}>Send follow-up</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}

const CHANNEL_ICON: Record<RequestChannel, typeof Globe> = { web: Globe, phone: Phone, letter: FileText, 'walk-in': Footprints, email: Mail };

export function RequestInbox() {
  const { data, loading } = useApi(() => api.requests.list());
  const { run } = useToast();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<'all' | 'reserved' | 'old' | 'W1' | 'W2' | 'W3' | 'W4' | 'done'>('all');
  const [sel, setSel] = useState<AppointmentRequest | null>(null);
  const [slot, setSlot] = useState('');
  const [declining, setDeclining] = useState<AppointmentRequest | null>(null);
  const [redirecting, setRedirecting] = useState<AppointmentRequest | null>(null);

  const all = data ?? [];
  useEffect(() => { const o = params.get('open'); if (o && data) setSel(data.find((r) => r.id === o) ?? null); }, [params, data]);
  const open = all.filter((r) => r.status === 'requested');
  const list = filter === 'done' ? all.filter((r) => r.status !== 'requested')
    : filter === 'reserved' ? open.filter((r) => r.reserved)
      : filter === 'old' ? open.filter((r) => daysBetween(r.receivedAt) > 3)
        : filter.startsWith('W') ? open.filter((r) => r.ward === filter) : open;
  const current = sel ? all.find((r) => r.id === sel.id) ?? null : null;
  const slots = [1, 2, 3].map((d) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(d === 2 ? 17 : 12, d === 2 ? 30 : 0, 0, 0); return x.toISOString(); });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Request inbox" subtitle="Appointment requests from web, phone, letter and walk-ins. Reserved categories go to the executive." screen="SCR-22" release="P0" env="executive" />
      <Tabs className="mb-4" value={filter} onChange={setFilter} items={[
        { value: 'all', label: 'All open', count: open.length }, { value: 'reserved', label: 'Reserved → Decide', count: open.filter((r) => r.reserved).length },
        { value: 'old', label: 'Older than 3 days', count: open.filter((r) => daysBetween(r.receivedAt) > 3).length },
        ...(['W1', 'W2', 'W3', 'W4'] as const).map((w) => ({ value: w, label: `Ward ${w}`, count: open.filter((r) => r.ward === w).length })),
        { value: 'done', label: 'Handled' },
      ]} />
      <Card className="overflow-hidden">
        {loading ? <SkeletonList rows={6} /> : list.length === 0 ? <EmptyState icon={Inbox} title="No requests" /> : (
          <TableWrap>
            <table className="table-base">
              <thead><tr><th>Ref</th><th>Received</th><th>Visitor</th><th className="min-w-[220px]">Purpose (category)</th><th>Ward</th><th>History</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {list.map((r) => {
                  const CI = CHANNEL_ICON[r.channel];
                  return (
                    <tr key={r.id} className={cn('cursor-pointer', current?.id === r.id && 'bg-primary/[0.05]')} onClick={() => { setSel(r); setSlot(''); }}>
                      <td className="font-mono text-xs font-semibold">{r.id}</td>
                      <td className="text-muted"><span className="flex items-center gap-1.5"><CI className="h-3.5 w-3.5" />{relative(r.receivedAt)}</span></td>
                      <td className="font-medium">{r.visitorName}</td>
                      <td>{r.purpose}<span className="block text-[11px] text-muted">{r.category} {r.reserved && <Badge tone="purple" className="ml-1">reserved</Badge>}</span></td>
                      <td>{r.ward}</td>
                      <td className="text-muted">{r.priorVisits ? `${r.priorVisits} earlier` : 'none'}</td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        {r.status !== 'requested' ? <Badge tone={REQUEST_META[r.status].tone}>{REQUEST_META[r.status].label}</Badge> : r.reserved ? (
                          <Button size="xs" variant="outline" icon={ArrowUpRight} onClick={() => run(api.requests.escalate(r.id), 'Escalated to executive', 'Added to the Decide queue')}>Escalate to executive</Button>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button size="xs" variant="success" icon={Check} onClick={() => { setSel(r); setSlot(''); }}>Approve + slot</Button>
                            <Button size="xs" variant="secondary" icon={CornerUpRight} onClick={() => setRedirecting(r)}>Redirect</Button>
                            <Button size="xs" variant="ghost" icon={X} className="text-danger" onClick={() => setDeclining(r)} aria-label="Decline" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>

      <Drawer open={!!current} onClose={() => setSel(null)} title={current ? `${current.id} · ${current.visitorName}` : ''} subtitle={current && <Badge tone={REQUEST_META[current.status].tone}>{REQUEST_META[current.status].label}</Badge>}
        footer={current?.status === 'requested' && !current.reserved && <>
          <Button variant="ghost" className="text-danger" onClick={() => setDeclining(current)}>Decline</Button>
          <Button variant="secondary" icon={CornerUpRight} onClick={() => setRedirecting(current)}>Redirect</Button>
          <Button variant="success" icon={Check} disabled={!slot} onClick={async () => { await run(api.requests.approve(current.id, slot), 'Approved and booked', 'Confirmation SMS queued (approved template)'); setSel(null); }}>Approve slot</Button>
        </>}>
        {current && (
          <div className="space-y-5">
            <p className="text-[15px] leading-relaxed">{current.purpose}</p>
            <KeyValue items={[['Category', current.category], ['Ward', current.ward], ['Channel', current.channel], ['Received', fmtDateTime(current.receivedAt)], ['Mobile', current.mobile], ['Earlier visits', String(current.priorVisits)]]} />
            {current.status === 'requested' && !current.reserved && (
              <div>
                <p className="label">Suggested slots (conflict-checked)</p>
                <div className="space-y-2">
                  {slots.map((s, i) => (
                    <button key={s} onClick={() => setSlot(s)} className={cn('flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm', slot === s ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-line hover:border-primary/40')}>
                      <span className="font-medium">{new Date(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtTime(s)}{i === 1 ? '' : `–${fmtTime(new Date(new Date(s).getTime() + 15 * 60000).toISOString())}`}</span>
                      <span className="text-xs text-muted">{i === 1 ? 'walk-in window' : <span className="text-ok">✓ free</span>}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {current.reserved && current.status === 'requested' && <InfoNote tone="purple">Reserved category — the executive decides. <Button size="xs" variant="outline" className="ml-2" onClick={() => run(api.requests.escalate(current.id), 'Escalated to executive')}>Escalate</Button></InfoNote>}
            {current.visitorId && <Link to={`/pa/visitors/${current.visitorId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><UserSearch className="h-4 w-4" />Open visitor record</Link>}
            <InfoNote tone="amber" icon={Info}>Visitor history is context only.</InfoNote>
          </div>
        )}
      </Drawer>
      <ReasonDialog open={!!declining} onClose={() => setDeclining(null)} title={`Decline ${declining?.id}`} presets={['Not within this office’s remit', 'Ward officer can resolve', 'Duplicate request']} onConfirm={async (r) => { await run(api.requests.decline(declining!.id, r), 'Declined', 'Visitor informed with reason'); setSel(null); }} />
      <RedirectDialog open={!!redirecting} onClose={() => setRedirecting(null)} onConfirm={async (t, r) => { await run(api.requests.redirect(redirecting!.id, t, r), `Redirected to ${t}`); setSel(null); }} />
    </div>
  );
}

export function QueueManagement() {
  const { data, loading } = useApi(() => api.queue.list());
  const { run, toast } = useToast();
  const [paused, setPaused] = useState(api.queue.paused);
  const [reorder, setReorder] = useState<{ q: QueueEntry; dir: -1 | 1 } | null>(null);
  const [routing, setRouting] = useState<QueueEntry | null>(null);
  const [showDone, setShowDone] = useState(false);
  const list = (data ?? []).filter((q) => showDone || ['waiting', 'called', 'in-meeting'].includes(q.status));

  return (
    <div className="animate-fade-in">
      <PageHeader title="Queue management" subtitle="Today’s visitors in order. Reordering needs a reason; estimates update visitors by SMS when they move more than 10 minutes." screen="SCR-23" release="P0" env="executive"
        actions={<>
          <Button variant={paused ? 'success' : 'secondary'} icon={paused ? Play : Pause} onClick={async () => { await run(api.queue.setPaused(!paused), paused ? 'Queue resumed' : 'Queue paused', paused ? undefined : 'Visitors see “paused” on their status link'); setPaused(!paused); }}>{paused ? 'Resume queue' : 'Pause queue'}</Button>
          <Button icon={PhoneCall} disabled={paused} onClick={async () => { const n = await run(api.queue.callNext(), 'Next visitor called', 'SMS and reception screen updated'); if (n === null) toast('info', 'No one waiting'); }}>Call next</Button>
        </>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone="amber" icon={Clock}>Walk-in window 17:30–18:30</Badge>
        {paused && <Badge tone="red" dot>Paused</Badge>}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show completed</label>
      </div>
      <Card className="overflow-hidden">
        {loading ? <SkeletonList rows={6} /> : list.length === 0 ? <EmptyState icon={Users} title="No one waiting" /> : (
          <TableWrap>
            <table className="table-base">
              <thead><tr><th>#</th><th>Token</th><th>Visitor</th><th>Type</th><th>Category</th><th>Arrived</th><th>Wait estimate</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {list.map((q, i) => (
                  <tr key={q.id} className={cn(q.status === 'called' && 'bg-amber-500/[0.06]', q.status === 'in-meeting' && 'bg-green-500/[0.05]')}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="font-mono text-base font-bold">{q.token}</td>
                    <td className="font-medium">{q.visitorName}{q.repeatMatch && <Link to={`/pa/visitors/${q.visitorId ?? 'V-01'}`} className="ml-2"><Badge tone="purple">Repeat? confirm</Badge></Link>}</td>
                    <td>{q.type === 'appointment' ? `Appt ${q.appointmentTime ? fmtTime(q.appointmentTime) : ''}` : 'Walk-in'}</td>
                    <td>{q.category}</td>
                    <td className="text-muted">{fmtTime(q.arrivedAt)}</td>
                    <td>{q.status === 'waiting' ? `${q.waitMin[0]}–${q.waitMin[1]} min` : q.status === 'in-meeting' || q.status === 'called' ? 'now' : '—'}</td>
                    <td><Badge tone={QUEUE_META[q.status].tone} dot>{QUEUE_META[q.status].label}</Badge></td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {q.status === 'waiting' && <>
                          <Button size="xs" variant="ghost" icon={ArrowUp} onClick={() => setReorder({ q, dir: -1 })} aria-label="Move up" />
                          <Button size="xs" variant="ghost" icon={ArrowDown} onClick={() => setReorder({ q, dir: 1 })} aria-label="Move down" />
                          <Button size="xs" variant={q.routeSuggestion ? 'outline' : 'secondary'} icon={CornerUpRight} onClick={() => setRouting(q)}>{q.routeSuggestion ? `Route` : 'Route'}</Button>
                        </>}
                        {q.status === 'called' && <Button size="xs" variant="success" onClick={() => run(api.queue.setStatus(q.id, 'in-meeting'), `${q.token} in meeting`)}>In meeting</Button>}
                        {q.status === 'in-meeting' && <Button size="xs" variant="secondary" onClick={() => run(api.queue.setStatus(q.id, 'done'), `${q.token} done`)}>Done</Button>}
                        {['waiting', 'called'].includes(q.status) && <Button size="xs" variant="ghost" className="text-muted" onClick={() => run(api.queue.setStatus(q.id, 'left'), `${q.token} marked left`)}>Left</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <div className="mt-4"><InfoNote icon={Info}><b>How estimates are computed:</b> rolling median meeting length for this category over 20 working days, shown as a range. SMS update when the estimate moves by more than 10 minutes.</InfoNote></div>
      <ReasonDialog open={!!reorder} onClose={() => setReorder(null)} title={`Move ${reorder?.q.token} ${reorder?.dir === -1 ? 'up' : 'down'}`} tone="primary" confirmText="Reorder"
        presets={['Senior citizen', 'Medical urgency', 'Executive instruction', 'Appointment slot reached']} onConfirm={(r) => run(api.queue.reorder(reorder!.q.id, reorder!.dir, r), 'Queue reordered')} />
      <RedirectDialog open={!!routing} onClose={() => setRouting(null)} defaultTarget={routing?.routeSuggestion} onConfirm={(t) => run(api.queue.route(routing!.id, t), `${routing!.token} routed`, t)} />
    </div>
  );
}
