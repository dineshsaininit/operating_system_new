import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Camera, Hourglass, Send, ClipboardCheck, FileCheck2, HandHeart, AlertTriangle, ChevronRight, Flag, Upload, Award, Users, Plus, ArrowRight, Milestone, Building } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { AuthorizationBanner, Badge, Button, Card, CardHeader, EmptyState, Field, InfoNote, Input, KeyValue, Modal, PageHeader, Progress, Select, SkeletonList, StatCard, Textarea } from '@/components/ui';
import { TaskStateBadge } from '@/components/domain';
import { cn, dueLabel, fmtDate, inr } from '@/lib/utils';
import type { CsrProject, CsrStage, Task } from '@/types';

export function OfficerInbox() {
  const { session } = useApp();
  const { data, loading } = useApi(() => api.tasks.list());
  const { run } = useToast();
  const [ext, setExt] = useState<Task | null>(null);
  const [days, setDays] = useState(3);
  const [reason, setReason] = useState('');
  const u = session!.user;
  // Ward officers see their ward; department officers see tasks assigned to their post only.
  const mine = (data ?? []).filter((t) => (u.role === 'ROLE-05' ? t.ward === u.scope.replace('Ward ', '') : t.ownerPost === 'EE Roads') && !['closed', 'verified', 'cancelled', 'draft'].includes(t.state));
  return (
    <div className="animate-fade-in">
      <PageHeader title="My assigned tasks" subtitle={`${u.post} · ${u.scope}. Acknowledge, update, add evidence and submit.`} screen="SCR-31" release="P1" env="governance" />
      {loading ? <Card><SkeletonList /></Card> : mine.length === 0 ? <Card><EmptyState icon={ClipboardCheck} title="No tasks assigned" /></Card> : (
        <div className="space-y-4">
          {mine.map((t) => {
            const d = dueLabel(t.due);
            return (
              <Card key={t.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-[15px] font-semibold">{t.title}</p><p className="text-xs text-muted">{t.id} · from {t.createdBy.replace(' (synthetic)', '')} · {t.source}</p></div>
                  <div className="flex gap-2"><TaskStateBadge state={t.state} /><Badge tone={d.tone}>{d.text}</Badge></div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>Evidence: {t.evidence} item(s)</span>{t.verificationRequired && <Badge tone="green">verification required</Badge>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {t.state === 'assigned' && <Button size="sm" icon={Check} onClick={() => run(api.tasks.transition(t.id, 'acknowledged'), 'Acknowledged')}>Acknowledge</Button>}
                  {(t.state === 'acknowledged' || t.state === 'reopened') && <Button size="sm" onClick={() => run(api.tasks.transition(t.id, 'in-progress'), 'Marked in progress')}>Start work</Button>}
                  {['acknowledged', 'in-progress', 'reopened'].includes(t.state) && (
                    <label className="inline-flex"><span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 text-xs font-semibold hover:bg-line/60"><Camera className="h-4 w-4" />Add evidence</span>
                      <input type="file" accept="image/*,application/pdf" multiple capture="environment" className="hidden" onChange={(e) => e.target.files?.length && run(api.tasks.addEvidence(t.id, e.target.files.length), 'Evidence uploaded')} /></label>
                  )}
                  {t.state === 'in-progress' && <Button size="sm" variant="success" icon={Send} disabled={t.verificationRequired && t.evidence === 0} onClick={() => run(api.tasks.transition(t.id, 'submitted'), 'Submitted for verification')}>Submit</Button>}
                  {t.state !== 'submitted' && <Button size="sm" variant="ghost" icon={Hourglass} onClick={() => setExt(t)}>Request extension</Button>}
                  {t.state === 'submitted' && <span className="text-xs text-muted">Waiting for verification by the assigner</span>}
                </div>
                {t.verificationRequired && t.evidence === 0 && t.state === 'in-progress' && <p className="mt-2 text-xs text-warn">Add evidence before submitting.</p>}
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={!!ext} onClose={() => setExt(null)} title="Request extension" subtitle={ext?.title} size="sm"
        footer={<><Button variant="secondary" onClick={() => setExt(null)}>Cancel</Button><Button disabled={!reason.trim()} onClick={async () => { await run(api.tasks.requestExtension(ext!.id, days, reason), 'Extension requested', 'Appears in the assigner’s Decide queue'); setExt(null); setReason(''); }}>Send request</Button></>}>
        <div className="space-y-4">
          <Field label="Extra days"><Select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d} days</option>)}</Select></Field>
          <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why more time is needed" /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function WeeklyWardForm() {
  const { session } = useApp();
  const { run } = useToast();
  const ward = session!.user.scope.replace('Ward ', '');
  const fields = [
    { k: 'grievancesClosed', l: 'Grievances closed this week', max: 500 }, { k: 'drainsDesilted', l: 'Drains desilted (count)', max: 200 },
    { k: 'potholesFixed', l: 'Potholes repaired', max: 500 }, { k: 'inspections', l: 'Field inspections done', max: 100 },
    { k: 'encroachmentsRemoved', l: 'Encroachments removed', max: 200 }, { k: 'complaintsPending', l: 'Complaints pending > 7 days', max: 500 },
  ];
  const [v, setV] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const errs = Object.fromEntries(fields.map((f) => [f.k, v[f.k] === undefined || v[f.k] === '' ? 'Required' : !/^\d+$/.test(v[f.k]) ? 'Whole number only' : Number(v[f.k]) > f.max ? `Looks too high (max ${f.max}) — check` : '']));
  const valid = Object.values(errs).every((e) => !e);
  const [touched, setTouched] = useState(false);
  if (done) return <Card className="mx-auto max-w-lg p-10 text-center"><FileCheck2 className="mx-auto h-12 w-12 text-ok" /><p className="mt-3 text-lg font-semibold">Weekly form submitted</p><p className="text-sm text-muted">Ward {ward} · week ending {fmtDate(new Date().toISOString())}</p></Card>;
  return (
    <div className="animate-fade-in">
      <PageHeader title={`Weekly ward form — Ward ${ward}`} subtitle="Submit weekly figures. Inline validation; you approve your own ward’s submission." screen="SCR-32" release="P2" env="governance" />
      <Card className="max-w-3xl p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((f) => <Field key={f.k} label={f.l} required error={touched ? errs[f.k] : undefined}><Input inputMode="numeric" value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} /></Field>)}
          <Field label="Remarks" className="sm:col-span-2"><Textarea placeholder="Anything the zone office should know" /></Field>
        </div>
        <Button className="mt-6" icon={Send} onClick={async () => { setTouched(true); if (!valid) return; await run(api.governance.submitWardForm(ward, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)]))), 'Form submitted'); setDone(true); }}>Submit</Button>
      </Card>
    </div>
  );
}

const STAGES: CsrStage[] = ['Interest', 'Due diligence', 'External approval', 'Execution', 'Impact report'];

export function PMOverview() {
  const { data, loading } = useApi(() => api.governance.csr());
  const projects = data ?? [];
  const delayed = projects.filter((p) => p.flags.some((f) => /slip|delay/i.test(f)));
  const awaiting = projects.filter((p) => p.stage === 'Interest' || p.flags.length);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Participate Mumbai" subtitle="Which projects or partners need attention." screen="SCR-19" release="P2" env="governance" />
      <AuthorizationBanner decision="DEC-039" />
      {loading ? <Card><SkeletonList /></Card> : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Active projects" value={projects.filter((p) => p.stage !== 'Closed').length} icon={HandHeart} tone="green" />
            <StatCard label="Pipeline value" value={`₹${projects.reduce((n, p) => n + p.valueLakh, 0)} L`} icon={Building} tone="blue" />
            <StatCard label="Delayed" value={delayed.length} icon={AlertTriangle} tone="red" />
            <StatCard label="Partners awaiting response" value={awaiting.length} icon={Users} tone="amber" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><CardHeader title="Needs attention" icon={Flag} iconClass="bg-red-500/10 text-danger" />
              <div className="divide-y divide-line">{[...delayed, ...awaiting.filter((a) => !delayed.includes(a))].map((p) => <Link key={p.id} to={`/gov/csr/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{p.title}</p><p className="text-xs text-muted">{p.partner} · {p.flags[0] ?? 'awaiting response'}</p></div><Badge>{p.stage}</Badge><ChevronRight className="h-4 w-4 text-muted" /></Link>)}</div>
            </Card>
            <Card><CardHeader title="Next milestones" icon={Milestone} iconClass="bg-green-500/10 text-gov" />
              <div className="space-y-4 p-5">{projects.filter((p) => p.stage === 'Execution').map((p) => <div key={p.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{p.title}</span><span className="text-muted">{p.milestone[0]}/{p.milestone[1]}</span></div><Progress value={p.milestone[0]} max={p.milestone[1]} tone="green" /></div>)}</div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export function CsrPipeline() {
  const { data, loading } = useApi(() => api.governance.csr());
  const { run, toast } = useToast();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [move, setMove] = useState<{ p: CsrProject; to: CsrStage } | null>(null);
  const [ref, setRef] = useState('');
  const projects = (data ?? []).filter((p) => (p.partner + p.title).toLowerCase().includes(q.toLowerCase()));

  const doMove = async (p: CsrProject, to: CsrStage, approvalRef?: string) => {
    try { await api.governance.moveCsr(p.id, to, approvalRef); toast('success', `Moved to ${to}`, 'Stage event recorded'); setMove(null); }
    catch (e) { if ((e as Error).message.includes('approval reference')) { setMove({ p, to }); setRef(''); } else toast('error', 'Rule violation', (e as Error).message); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="CSR partner pipeline" subtitle="Stages are configurable until DEC-039 confirms the official lifecycle. Advisory flags never move a stage automatically." screen="SCR-34" release="P2" env="governance"
        actions={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Match partners / projects…" className="w-64" />} />
      {loading ? <Card><SkeletonList /></Card> : (
        <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-3 xl:grid-cols-5">
          {STAGES.map((s, si) => {
            const col = projects.filter((p) => p.stage === s);
            return (
              <div key={s} className="min-w-[220px] rounded-2xl border border-line bg-surface-2/60 p-3">
                <div className="mb-3 flex items-center justify-between px-1"><p className="text-sm font-semibold">{s}</p><Badge>{col.length}</Badge></div>
                <div className="space-y-2">
                  {col.map((p) => (
                    <div key={p.id} className="rounded-xl border border-line bg-surface p-3 shadow-card">
                      <button onClick={() => nav(`/gov/csr/${p.id}`)} className="text-left"><p className="text-sm font-semibold leading-snug hover:text-primary">{p.partner}</p><p className="mt-0.5 text-xs text-muted">{p.title}</p></button>
                      <div className="mt-2 flex flex-wrap gap-1"><Badge tone="green">₹{p.valueLakh} L</Badge><Badge>Ward {p.ward}</Badge>{p.flags.map((f) => <Badge key={f} tone="amber" icon={Flag} className="whitespace-normal text-left">{f}</Badge>)}{p.stage === 'External approval' && !p.approvalRef && <Badge tone="gray">ref. pending</Badge>}</div>
                      {p.stage === 'Execution' && <Progress className="mt-2" value={p.milestone[0]} max={p.milestone[1]} tone="green" />}
                      {si < STAGES.length - 1 && <Button size="xs" variant="secondary" className="mt-3 w-full" iconRight={ArrowRight} title={`Move to ${STAGES[si + 1]}`} onClick={() => doMove(p, STAGES[si + 1])}>Advance stage</Button>}
                    </div>
                  ))}
                  {col.length === 0 && <p className="py-6 text-center text-xs text-muted">No proposals</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={!!move} onClose={() => setMove(null)} title="Approval reference required" subtitle="Screening Committee or MC approval must be recorded with its reference before Execution." size="sm"
        footer={<><Button variant="secondary" onClick={() => setMove(null)}>Cancel</Button><Button disabled={!ref.trim()} onClick={() => run(doMove(move!.p, move!.to, ref), 'Approval recorded')}>Record and move</Button></>}>
        <Field label="Approval reference" required><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="SC/2026/__ (synthetic)" /></Field>
      </Modal>
    </div>
  );
}

export function CsrProjectDetail() {
  const { id } = useParams();
  const { data, loading } = useApi(() => api.governance.csr());
  const { toast, run } = useToast();
  const p = data?.find((x) => x.id === id);
  if (loading) return <Card><SkeletonList /></Card>;
  if (!p) return <Card><EmptyState title="Project not found" /></Card>;
  const si = STAGES.indexOf(p.stage as CsrStage);
  return (
    <div className="animate-fade-in">
      <PageHeader title={p.title} subtitle={`${p.partner} · Ward ${p.ward}`} screen="SCR-35" release="P2" env="governance" actions={<Badge tone="green" dot>{p.stage}</Badge>} />
      <Card className="mb-5 p-5">
        <div className="flex items-center">
          {STAGES.map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5"><div className={cn('grid h-8 w-8 place-items-center rounded-full text-xs font-bold', i <= si ? 'bg-gov text-white' : 'bg-surface-2 text-muted ring-1 ring-line')}>{i < si ? <Check className="h-4 w-4" /> : i + 1}</div><span className={cn('hidden text-center text-[11px] sm:block', i === si ? 'font-semibold' : 'text-muted')}>{s}</span></div>
              {i < STAGES.length - 1 && <div className={cn('mx-1 h-0.5 flex-1', i < si ? 'bg-gov' : 'bg-line')} />}
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Project" icon={HandHeart} iconClass="bg-green-500/10 text-gov" />
          <div className="space-y-5 p-5">
            <KeyValue items={[['Partner', p.partner], ['Value', inr(p.valueLakh * 100000)], ['Approval reference', p.approvalRef ?? 'Not recorded'], ['Last update', fmtDate(p.updatedAt)], ['Milestones', `${p.milestone[0]} of ${p.milestone[1]}`]]} />
            <Progress value={p.milestone[0]} max={p.milestone[1]} tone="green" />
            {p.flags.length > 0 && <InfoNote tone="amber" icon={Flag}>Advisory flags: {p.flags.join('; ')}. Flags never change the stage on their own.</InfoNote>}
          </div>
        </Card>
        <div className="space-y-3">
          <Card className="p-5 space-y-2">
            <label className="block"><span className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white"><Upload className="h-4 w-4" />Upload evidence</span><input type="file" multiple className="hidden" onChange={() => toast('success', 'Evidence uploaded', 'Linked to current milestone')} /></label>
            <Button variant="secondary" className="w-full" icon={Award} onClick={() => run(api.drafts.save({ title: `Recognition letter — ${p.partner}`, body: `Draft recognition for ${p.partner} for "${p.title}". (synthetic)`, aiGenerated: false, channel: 'letter', recipient: p.partner }), 'Recognition drafted', 'In Drafts & outbox — needs executive approval')}>Draft recognition</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function VolunteerDrives() {
  const { toast } = useToast();
  const [drives, setDrives] = useState([
    { id: 'VD-1', title: 'Beach clean-up (synthetic)', date: new Date(Date.now() + 5 * 864e5).toISOString(), volunteers: 120, hours: 360 },
    { id: 'VD-2', title: 'Tree plantation — Ward W2 (synthetic)', date: new Date(Date.now() - 9 * 864e5).toISOString(), volunteers: 64, hours: 192 },
  ]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Volunteer drives" subtitle="Track drives and hours — only if not already served by the public portal (DEC-042)." screen="SCR-36" release="P3" env="governance"
        actions={<Button icon={Plus} onClick={() => { setDrives([{ id: `VD-${drives.length + 1}`, title: 'New drive (synthetic)', date: new Date(Date.now() + 14 * 864e5).toISOString(), volunteers: 0, hours: 0 }, ...drives]); toast('success', 'Drive created'); }}>Create drive</Button>} />
      <AuthorizationBanner decision="DEC-042">Future release concept (P3).</AuthorizationBanner>
      <div className="grid gap-4 md:grid-cols-2">{drives.map((d) => <Card key={d.id} className="p-5"><p className="font-semibold">{d.title}</p><p className="text-xs text-muted">{fmtDate(d.date)}</p><div className="mt-3 flex gap-3"><Badge tone="green">{d.volunteers} volunteers</Badge><Badge tone="blue">{d.hours} hours</Badge></div></Card>)}</div>
    </div>
  );
}
