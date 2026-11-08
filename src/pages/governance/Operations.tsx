import { useState } from 'react';
import { Siren, Phone, CheckCircle2, Clock, FileText, Send, XCircle, Mail, ScanLine, CornerUpRight, Camera, MapPin, Plus, Check, BookOpen, Search, Loader2, ScrollText, Download, ArrowRightLeft, Sparkles, Quote, WifiOff, Navigation } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { aiChat, aiEnabled } from '@/services/ai';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { AuthorizationBanner, Badge, Button, Card, CardHeader, EmptyState, Field, InfoNote, Input, Modal, PageHeader, Progress, ReasonDialog, Select, SkeletonList, StatCard, TableWrap, Tabs, Textarea } from '@/components/ui';
import { MicButton, TaskStateBadge } from '@/components/domain';
import { Markdown } from '@/components/Markdown';
import { REDIRECT_TARGETS } from '@/pages/executive/Office';
import { cn, downloadCsv, fmtDate, fmtDateTime, fmtTime, relative } from '@/lib/utils';
import type { DakItem, Emergency } from '@/types';

const EM_TEMPLATES: Record<string, string> = {
  'Heavy rain / flooding': 'Heavy rainfall alert for Zone II. Avoid low-lying areas and subways. Helpline: ward control room (synthetic). — Office of the DMC Zone II',
  'Building collapse': 'An incident has been reported. Rescue teams are on site. Please avoid the area and follow instructions of officials. — Office of the DMC Zone II',
  'Fire': 'Fire incident reported. Emergency services are responding. Keep roads clear for vehicles. — Office of the DMC Zone II',
};

export function EmergencyMode() {
  const { data: em, loading } = useApi(() => api.governance.emergency());
  const { run } = useToast();
  const [declaring, setDeclaring] = useState(false);
  const [closing, setClosing] = useState(false);
  const [f, setF] = useState({ title: '', kind: 'Heavy rain / flooding', summary: '' });
  const [msg, setMsg] = useState('');
  const [msgApproved, setMsgApproved] = useState(false);

  if (loading || !em) return <Card><SkeletonList /></Card>;
  const acked = em.contactTree.filter((c) => c.acknowledged).length;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Emergency mode" subtitle="Declare and coordinate an incident. Overrides Peace Mode, pauses the visitor queue, works offline with a local log." screen="SCR-14" release="P1" env="governance"
        actions={em.active ? <Button variant="secondary" icon={XCircle} onClick={() => setClosing(true)}>Close emergency</Button> : <Button variant="danger" icon={Siren} onClick={() => setDeclaring(true)}>Declare emergency</Button>} />

      {!em.active ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <Card className="p-10 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-500/10 text-ok"><CheckCircle2 className="h-10 w-10" /></div>
            <p className="mt-4 text-lg font-semibold">No active emergency</p>
            <p className="mt-1 text-sm text-muted">The contact tree is cached on this device so it works without a connection.</p>
            <Button variant="danger" size="lg" className="mt-6" icon={Siren} onClick={() => setDeclaring(true)}>Declare emergency</Button>
          </Card>
          <ContactTree em={em} />
        </div>
      ) : (
        <>
          <div className="mb-5 overflow-hidden rounded-2xl border-2 border-danger bg-red-500/[0.06]">
            <div className="flex flex-wrap items-center gap-4 bg-danger px-5 py-3 text-white"><Siren className="h-6 w-6 animate-pulse" /><div className="flex-1"><p className="text-lg font-bold">{em.title}</p><p className="text-sm text-red-100">{em.kind} · declared {relative(em.declaredAt!)} by {em.declaredBy?.replace(' (synthetic)', '')}</p></div><Badge className="bg-white/20 text-white ring-white/30">ACTIVE</Badge></div>
            <p className="px-5 py-3 text-sm">{em.summary}</p>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Contacts acknowledged" value={`${acked}/${em.contactTree.length}`} icon={CheckCircle2} tone="green" />
            <StatCard label="Calls logged" value={em.callLog.length} icon={Phone} tone="blue" />
            <StatCard label="Visitor queue" value="Paused" icon={Clock} tone="amber" />
            <StatCard label="Escalation" value="5 min" icon={Siren} tone="red" hint="unacknowledged → next contact" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <ContactTree em={em} live onLog={(who, outcome) => run(api.governance.logCall(who, outcome), `Call logged: ${outcome}`)} />
            <div className="space-y-5">
              <Card>
                <CardHeader title="Public message" subtitle="Template → approval → send" icon={Send} iconClass="bg-red-500/10 text-danger" />
                <div className="space-y-3 p-5">
                  <Select onChange={(e) => { setMsg(EM_TEMPLATES[e.target.value] ?? ''); setMsgApproved(false); }} defaultValue=""><option value="" disabled>Choose a template…</option>{Object.keys(EM_TEMPLATES).map((k) => <option key={k}>{k}</option>)}</Select>
                  <Textarea rows={4} value={msg} onChange={(e) => { setMsg(e.target.value); setMsgApproved(false); }} />
                  <div className="flex gap-2">
                    <Button variant="success" size="sm" icon={Check} disabled={!msg || msgApproved} onClick={() => setMsgApproved(true)}>Approve message</Button>
                    <Button size="sm" icon={Send} disabled={!msgApproved} onClick={() => run(Promise.resolve(), 'Message sent', 'Via approved channels; delivery tracked')}>Send</Button>
                  </div>
                  <p className="text-[11px] text-muted">Only the executive or PA can approve. No message goes out unapproved.</p>
                </div>
              </Card>
              <Card>
                <CardHeader title="Call log" icon={FileText} />
                <div className="max-h-64 divide-y divide-line overflow-y-auto">
                  {em.callLog.length === 0 ? <p className="p-5 text-sm text-muted">No calls logged yet</p> : em.callLog.map((c, i) => <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm"><span className="font-mono text-xs text-muted">{fmtTime(c.at)}</span><span className="flex-1">{c.who}</span><Badge tone={c.outcome === 'Acknowledged' ? 'green' : 'amber'}>{c.outcome}</Badge></div>)}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <Modal open={declaring} onClose={() => setDeclaring(false)} title="Declare emergency" subtitle="Notifies the contact tree at Interrupt tier and overrides Peace Mode."
        footer={<><Button variant="secondary" onClick={() => setDeclaring(false)}>Cancel</Button><Button variant="danger" icon={Siren} disabled={!f.title || !f.summary} onClick={async () => { await run(api.governance.declareEmergency(f.title, f.kind, f.summary), 'Emergency declared', 'Contact tree notified'); setDeclaring(false); }}>Declare</Button></>}>
        <div className="space-y-4">
          <Field label="Title" required><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Waterlogging at junctions in W3 and W4" /></Field>
          <Field label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.keys(EM_TEMPLATES).map((k) => <option key={k}>{k}</option>)}<option>Other</option></Select></Field>
          <Field label="Incident summary" required><Textarea value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
        </div>
      </Modal>
      <ReasonDialog open={closing} onClose={() => setClosing(false)} title="Close emergency" label="Closing note" confirmText="Close emergency" onConfirm={(r) => run(api.governance.closeEmergency(r), 'Emergency closed', 'Queue resumed; Peace Mode restored')} />
    </div>
  );
}

function ContactTree({ em, live, onLog }: { em: Emergency; live?: boolean; onLog?: (who: string, outcome: string) => void }) {
  return (
    <Card>
      <CardHeader title="Contact tree" subtitle="Cached for offline use" icon={Phone} iconClass="bg-red-500/10 text-danger" action={<Badge icon={WifiOff}>cached</Badge>} />
      <div className="divide-y divide-line">
        {em.contactTree.map((c) => (
          <div key={c.post} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-xs font-bold ring-1 ring-line">L{c.level}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{c.post}</p><p className="text-xs text-muted">{c.name} · {c.phone}</p></div>
            {live && (c.acknowledged ? <Badge tone="green" icon={CheckCircle2}>Acknowledged</Badge> : <>
              <a href={`tel:${c.phone}`}><Button size="xs" variant="secondary" icon={Phone}>Call</Button></a>
              <Button size="xs" variant="success" onClick={() => onLog?.(c.post, 'Acknowledged')}>Ack</Button>
              <Button size="xs" variant="ghost" onClick={() => onLog?.(c.post, 'No answer')}>No answer</Button>
            </>)}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DakIntake() {
  const { data, loading } = useApi(() => api.governance.dak());
  const { run, toast } = useToast();
  const [sel, setSel] = useState<DakItem | null>(null);
  const [route, setRoute] = useState('');
  const [mkTask, setMkTask] = useState(true);
  const [scanning, setScanning] = useState(false);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Dak intake" subtitle="Register and triage inward letters. Extraction is a suggestion — low confidence means manual entry." screen="SCR-26" release="P2" env="governance"
        actions={<Button icon={ScanLine} loading={scanning} onClick={() => { setScanning(true); setTimeout(() => { setScanning(false); toast('success', 'Letter scanned', 'OCR complete — review the extracted fields'); }, 1500); }}>Upload / scan</Button>} />
      <AuthorizationBanner decision="DEC-008">OCR/AI on official documents needs approval (DEC-008). Shown here on synthetic letters.</AuthorizationBanner>
      {scanning && <Card className="mb-4 p-4"><p className="mb-2 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />OCR in progress…</p><Progress value={65} /></Card>}
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <Card className="overflow-hidden">
          {loading ? <SkeletonList /> : (
            <TableWrap>
              <table className="table-base">
                <thead><tr><th>Received</th><th>From</th><th>Subject</th><th>Confidence</th><th>Status</th></tr></thead>
                <tbody>
                  {(data ?? []).map((d) => (
                    <tr key={d.id} className={cn('cursor-pointer', sel?.id === d.id && 'bg-primary/5')} onClick={() => { setSel(d); setRoute(d.suggestedRoute); }}>
                      <td className="text-muted">{fmtDateTime(d.receivedAt)}</td><td>{d.from}</td><td className="font-medium">{d.subject}</td>
                      <td><div className="flex items-center gap-2"><Progress className="w-16" value={d.confidence * 100} tone={d.confidence > 0.85 ? 'green' : d.confidence > 0.6 ? 'amber' : 'red'} /><span className="text-xs">{Math.round(d.confidence * 100)}%</span></div></td>
                      <td><Badge tone={d.status === 'routed' ? 'green' : d.status === 'review' ? 'amber' : 'gray'}>{d.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
        <Card className="h-fit">
          <CardHeader title={sel ? sel.id : 'Select a letter'} subtitle="Extracted fields — confirm before routing" icon={Mail} />
          {sel ? (
            <div className="space-y-4 p-5">
              {sel.confidence < 0.6 && <InfoNote tone="amber">Low confidence — enter fields manually.</InfoNote>}
              <Field label="From"><Input defaultValue={sel.from} /></Field>
              <Field label="Subject"><Input defaultValue={sel.subject} /></Field>
              <Field label="Route to" hint={`Suggested: ${sel.suggestedRoute}`}><Select value={route} onChange={(e) => setRoute(e.target.value)}>{[sel.suggestedRoute, ...REDIRECT_TARGETS, 'PA'].filter((v, i, a) => a.indexOf(v) === i).map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mkTask} onChange={(e) => setMkTask(e.target.checked)} />Create a task for the recipient</label>
              <Button className="w-full" icon={CornerUpRight} disabled={sel.status === 'routed'} onClick={async () => { await run(api.governance.routeDak(sel.id, route, mkTask), 'Letter routed', mkTask ? 'Task created' : undefined); setSel(null); }}>Confirm and route</Button>
            </div>
          ) : <EmptyState icon={Mail} title="No letter selected" />}
        </Card>
      </div>
    </div>
  );
}

export function InspectionCapture() {
  const { data, loading } = useApi(() => api.governance.inspections());
  const { run, toast } = useToast();
  const [f, setF] = useState({ location: '', notes: '', photos: 0, tasks: [''] });
  const [locating, setLocating] = useState(false);
  const locate = () => {
    setLocating(true);
    if (!navigator.geolocation) { setF({ ...f, location: 'Ward W2 — Lane 4 (synthetic)' }); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setF((x) => ({ ...x, location: `${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)} (device location)` })); setLocating(false); },
      () => { setF((x) => ({ ...x, location: 'Ward W2 — Lane 4 (synthetic)' })); setLocating(false); },
      { timeout: 5000 },
    );
  };
  return (
    <div className="animate-fade-in">
      <PageHeader title="Inspection capture" subtitle="Field notes with photos and location — stored offline, converted to draft tasks you confirm." screen="SCR-55" release="P1" env="governance" />
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="New capture" icon={Camera} iconClass="bg-green-500/10 text-gov" />
          <div className="space-y-4 p-5">
            <Field label="Location"><div className="flex gap-2"><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Place or use device location" /><Button variant="secondary" icon={MapPin} loading={locating} onClick={locate}>Locate</Button></div></Field>
            <Field label="Notes"><div className="flex gap-2"><Textarea rows={4} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="What did you observe?" /><MicButton onResult={(t) => setF((x) => ({ ...x, notes: (x.notes ? x.notes + ' ' : '') + t }))} /></div></Field>
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line text-sm text-muted hover:border-primary/50">
              <Camera className="h-8 w-8" /><span className="mt-1 font-semibold">{f.photos ? `${f.photos} photo(s) attached` : 'Large capture button — add photos'}</span>
              <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => setF({ ...f, photos: f.photos + (e.target.files?.length ?? 0) })} />
            </label>
            <div>
              <p className="label">Draft tasks</p>
              {f.tasks.map((t, i) => <Input key={i} className="mb-2" value={t} onChange={(e) => setF({ ...f, tasks: f.tasks.map((x, j) => (j === i ? e.target.value : x)) })} placeholder="e.g. Replace broken grating" />)}
              <Button size="xs" variant="ghost" icon={Plus} onClick={() => setF({ ...f, tasks: [...f.tasks, ''] })}>Add draft task</Button>
            </div>
            <Button className="w-full" disabled={!f.location || !f.notes} onClick={async () => { await run(api.governance.captureInspection({ location: f.location, notes: f.notes, photos: f.photos, draftTasks: f.tasks.filter(Boolean) }), 'Inspection captured', 'Stored locally first, synced when online'); setF({ location: '', notes: '', photos: 0, tasks: [''] }); }}>Save capture</Button>
            <Button variant="ghost" size="sm" icon={Navigation} onClick={() => toast('info', 'Route planned', 'Site-visit route ordered by distance (synthetic)')}>Plan route for today’s visits</Button>
          </div>
        </Card>
        <div className="space-y-4">
          {loading ? <Card><SkeletonList /></Card> : (data ?? []).map((i) => (
            <Card key={i.id} className="p-5">
              <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{i.location}</p><p className="text-xs text-muted">{fmtDateTime(i.at)} · {i.photos} photos</p></div><Badge tone={i.status === 'confirmed' ? 'green' : 'amber'}>{i.status}</Badge></div>
              <p className="mt-2 text-sm text-ink/80">{i.notes}</p>
              <div className="mt-3 space-y-1">{i.draftTasks.map((t) => <p key={t} className="flex items-center gap-2 text-sm"><Check className="h-3.5 w-3.5 text-muted" />{t}</p>)}</div>
              {i.status === 'captured' && <Button size="sm" className="mt-3" icon={Check} onClick={() => run(api.governance.confirmInspection(i.id), 'Tasks confirmed', 'Draft tasks created — assign owners in Tasks')}>Confirm tasks</Button>}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

const RULEBOOK = [
  { id: 'MMC-Act-s351', title: 'MMC Act — Section 351 (synthetic excerpt)', page: 214, text: 'Notice for removal of unauthorised construction shall specify the work and allow a period for the owner to show cause.' },
  { id: 'GR-2019-SWM', title: 'Government Resolution — Solid Waste Management (synthetic)', page: 3, text: 'Ward offices shall publish collection timings and display them at collection points and on the public portal.' },
  { id: 'Circ-2024-RTI', title: 'Circular — RTI handling procedure (synthetic)', page: 2, text: 'Applications shall be registered on the day of receipt and forwarded to the Public Information Officer of the concerned department.' },
  { id: 'Circ-2023-Monsoon', title: 'Circular — Pre-monsoon works (synthetic)', page: 5, text: 'Desilting of major nullahs shall be completed and certified with photographs before the onset of monsoon.' },
];

export function RulebookSearch() {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; cites: typeof RULEBOOK } | null>(null);
  const ask = async () => {
    setBusy(true);
    const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const cites = RULEBOOK.filter((r) => words.some((w) => (r.title + r.text).toLowerCase().includes(w)));
    if (!cites.length) { setAnswer({ text: 'Not found in loaded sources.', cites: [] }); setBusy(false); return; }
    let text = cites.map((c) => `${c.text} [${c.id}]`).join('\n\n');
    if (aiEnabled()) {
      try {
        const r = await aiChat([{ role: 'system', content: 'Answer ONLY from the passages given. Cite passage IDs in square brackets. If not covered, say "Not found in loaded sources." Never give a legal opinion; note that an officer must confirm.' }, { role: 'user', content: `Passages:\n${cites.map((c) => `[${c.id}] ${c.text}`).join('\n')}\n\nQuestion: ${q}` }], 'Rulebook search', 0);
        text = r.text;
      } catch { /* deterministic passages */ }
    }
    setAnswer({ text, cites }); setBusy(false);
  };
  return (
    <div className="animate-fade-in">
      <PageHeader title="Rulebook search" subtitle="Look up statutes, GRs and circulars with cited passages side by side. Not legal advice." screen="SCR-54" release="P1" env="governance" />
      <Card className="p-5">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(); }}>
          <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} className="h-11 pl-9" placeholder="e.g. What must a notice for unauthorised construction include?" /></div>
          <Button size="lg" icon={busy ? Loader2 : BookOpen} disabled={busy}>{busy ? 'Searching' : 'Ask'}</Button>
        </form>
        {!answer && <div className="mt-4 flex flex-wrap gap-2">{['Garbage collection timings rule', 'RTI registration procedure', 'Desilting certification before monsoon'].map((e) => <button key={e} onClick={() => setQ(e)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-primary hover:text-primary">{e}</button>)}</div>}
      </Card>
      {answer && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card className="p-5"><p className="mb-2 flex items-center gap-2 text-sm font-semibold">{aiEnabled() && <Sparkles className="h-4 w-4 text-ai" />}Answer</p><div className="text-sm"><Markdown text={answer.text} /></div><p className="mt-4 text-[11px] text-muted">Confirm with the source and the competent officer before relying on it.</p></Card>
          <div className="space-y-3">{answer.cites.map((c) => <Card key={c.id} className="p-4"><p className="flex items-center gap-2 text-xs font-bold text-primary"><Quote className="h-3.5 w-3.5" />{c.id} · p. {c.page}</p><p className="mt-1 text-sm font-medium">{c.title}</p><p className="mt-2 border-l-2 border-primary/40 pl-3 text-sm italic text-ink/80">{c.text}</p></Card>)}</div>
        </div>
      )}
    </div>
  );
}

export function DecisionLog() {
  const { data, loading } = useApi(() => api.decisions.list());
  const { session } = useApp();
  const { run } = useToast();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: '', basis: '', fileRef: '', date: new Date().toISOString().slice(0, 10), reviewDate: '' });
  const list = (data ?? []).filter((d) => (d.title + d.basis + d.fileRef).toLowerCase().includes(q.toLowerCase()));
  const isExec = session!.user.role === 'ROLE-01';
  return (
    <div className="animate-fade-in">
      <PageHeader title="Decision log" subtitle="A record of decisions with basis and e-Office file reference. Record only — the system never makes or signs decisions." screen="SCR-56" release="P0" env="governance"
        actions={<><Button variant="secondary" icon={Download} onClick={() => downloadCsv('decision-log.csv', list.map((d) => ({ id: d.id, title: d.title, basis: d.basis, fileRef: d.fileRef, date: d.date.slice(0, 10), status: d.status })))}>Export</Button><Button icon={Plus} onClick={() => setAdding(true)}>Record decision</Button></>} />
      <div className="relative mb-4 max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search decisions…" className="pl-9" /></div>
      {loading ? <Card><SkeletonList /></Card> : list.length === 0 ? <Card><EmptyState icon={ScrollText} title="No decisions recorded" /></Card> : (
        <div className="space-y-3">
          {list.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-start gap-4 p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600"><ScrollText className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{d.title}</p><Badge tone={d.status === 'confirmed' ? 'green' : 'amber'}>{d.status}</Badge><Badge>record only</Badge></div>
                <p className="mt-1 text-sm text-muted">Basis: {d.basis}</p>
                <p className="mt-1 text-xs text-muted"><span className="font-mono">{d.id}</span> · {fmtDate(d.date)} · file {d.fileRef} · recorded by {d.recordedBy.replace(' (synthetic)', '')}{d.reviewDate && ` · review ${fmtDate(d.reviewDate)}`}{d.meetingRef && ` · from ${d.meetingRef}`}</p>
              </div>
              {d.status === 'draft' && isExec && <Button size="sm" variant="success" icon={Check} onClick={() => run(api.decisions.confirm(d.id), 'Decision confirmed')}>Confirm</Button>}
            </Card>
          ))}
        </div>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Record a decision" subtitle={isExec ? 'Recorded as confirmed.' : 'Recorded as draft — the executive confirms.'}
        footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={!f.title || !f.basis} onClick={async () => { await run(api.decisions.create({ ...f, date: new Date(f.date).toISOString(), reviewDate: f.reviewDate ? new Date(f.reviewDate).toISOString() : undefined, fileRef: f.fileRef || '—' }), 'Decision recorded'); setAdding(false); setF({ title: '', basis: '', fileRef: '', date: new Date().toISOString().slice(0, 10), reviewDate: '' }); }}>Record</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Decision" required className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Basis" required className="sm:col-span-2"><Textarea value={f.basis} onChange={(e) => setF({ ...f, basis: e.target.value })} /></Field>
          <Field label="e-Office file reference"><Input value={f.fileRef} onChange={(e) => setF({ ...f, fileRef: e.target.value })} placeholder="eOffice/Z2/…" /></Field>
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Review date (optional)"><Input type="date" value={f.reviewDate} onChange={(e) => setF({ ...f, reviewDate: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function HandoverDossier() {
  const { data: tasks } = useApi(() => api.tasks.list());
  const { data: decisions } = useApi(() => api.decisions.list());
  const { data: requests } = useApi(() => api.requests.list());
  const { toast } = useToast();
  const [gen, setGen] = useState<'idle' | 'running' | 'done'>('idle');
  const [tab, setTab] = useState<'tasks' | 'requests' | 'decisions'>('tasks');
  const openTasks = (tasks ?? []).filter((t) => !['closed', 'verified', 'cancelled'].includes(t.state));
  const openReq = (requests ?? []).filter((r) => r.status === 'requested');
  return (
    <div className="animate-fade-in">
      <PageHeader title="Handover dossier" subtitle="Everything open for a post, ready for the successor. Access switches at the effective time of transfer." screen="SCR-41" release="P0" env="governance"
        actions={<>
          <Button icon={ArrowRightLeft} loading={gen === 'running'} onClick={() => { setGen('running'); setTimeout(() => { setGen('done'); toast('success', 'Dossier generated', 'Includes open items by type with sources'); }, 1500); }}>Generate dossier</Button>
          {gen === 'done' && <Button variant="secondary" icon={Download} onClick={() => downloadCsv('handover-dossier.csv', [...openTasks.map((t) => ({ type: 'Task', id: t.id, title: t.title, owner: t.ownerPost, due: t.due.slice(0, 10) })), ...openReq.map((r) => ({ type: 'Request', id: r.id, title: r.purpose, owner: 'PA', due: '' }))])}>Export</Button>}
        </>} />
      {gen === 'running' && <Card className="mb-4 p-4"><p className="mb-2 text-sm">Generating…</p><Progress value={70} /></Card>}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <StatCard label="Open tasks" value={openTasks.length} icon={FileText} />
        <StatCard label="Open requests" value={openReq.length} icon={Mail} tone="amber" />
        <StatCard label="Decisions (record)" value={decisions?.length ?? 0} icon={ScrollText} tone="purple" />
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-line p-3"><Tabs value={tab} onChange={setTab} items={[{ value: 'tasks', label: 'Tasks', count: openTasks.length }, { value: 'requests', label: 'Requests', count: openReq.length }, { value: 'decisions', label: 'Decisions', count: decisions?.length }]} /></div>
        <TableWrap>
          <table className="table-base">
            {tab === 'tasks' && <><thead><tr><th>Task</th><th>Owner</th><th>Due</th><th>State</th></tr></thead><tbody>{openTasks.map((t) => <tr key={t.id}><td className="font-medium">{t.title}</td><td>{t.ownerPost}</td><td>{fmtDate(t.due)}</td><td><TaskStateBadge state={t.state} /></td></tr>)}</tbody></>}
            {tab === 'requests' && <><thead><tr><th>Ref</th><th>Visitor</th><th>Purpose</th></tr></thead><tbody>{openReq.map((r) => <tr key={r.id}><td className="font-mono text-xs">{r.id}</td><td>{r.visitorName}</td><td>{r.purpose}</td></tr>)}</tbody></>}
            {tab === 'decisions' && <><thead><tr><th>ID</th><th>Decision</th><th>File</th></tr></thead><tbody>{(decisions ?? []).map((d) => <tr key={d.id}><td className="font-mono text-xs">{d.id}</td><td>{d.title}</td><td className="text-muted">{d.fileRef}</td></tr>)}</tbody></>}
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
