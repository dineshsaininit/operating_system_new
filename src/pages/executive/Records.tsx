import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NotebookPen, Check, CloudUpload, Sparkles, Plus, Trash2, ListChecks, Gavel, Search, FileText, FileSpreadsheet, Image as ImageIcon, Lock, Upload, Eye, Loader2, Send } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { aiChat, aiEnabled } from '@/services/ai';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, CardHeader, Drawer, EmptyState, Field, InfoNote, Input, KeyValue, Modal, PageHeader, Select, SkeletonList, TableWrap, Tabs, Textarea } from '@/components/ui';
import { CLASS_META } from '@/components/domain';
import { cn, fmtDate, fmtDateTime, fmtTime } from '@/lib/utils';
import type { DataClass, Meeting, MeetingAction, OfficeDocument } from '@/types';

const MIN_META: Record<Meeting['minutesStatus'], { label: string; tone: 'gray' | 'amber' | 'blue' | 'green' }> = {
  none: { label: 'No notes', tone: 'gray' }, draft: { label: 'Draft', tone: 'amber' }, 'pending-approval': { label: 'Awaiting chair', tone: 'blue' }, approved: { label: 'Approved', tone: 'green' },
};

export function Meetings() {
  const { data, loading } = useApi(() => api.meetings.list());
  const { session } = useApp();
  const { run, toast } = useToast();
  const [params] = useSearchParams();
  const [sel, setSel] = useState<string | null>(params.get('open'));
  const [notes, setNotes] = useState('');
  const [actions, setActions] = useState<MeetingAction[]>([]);
  const [decisions, setDecisions] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [extracting, setExtracting] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number>();

  const meetings = data ?? [];
  const m = meetings.find((x) => x.id === sel) ?? meetings[0];
  useEffect(() => { if (m) { setNotes(m.notes); setActions(m.actions); setDecisions(m.decisions); setSaveState('saved'); } }, [m?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onNotes = (v: string) => {
    setNotes(v); setSaveState('dirty');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setSaveState('saving');
      try { await api.meetings.saveNotes(m!.id, v); setSaveState('saved'); }
      catch { try { localStorage.setItem(`notes.${m!.id}`, v); } catch { /* ignore */ } setSaveState('error'); }
    }, 900);
  };

  const insertMarker = (marker: string) => {
    const ta = taRef.current; if (!ta) return;
    const pos = ta.selectionStart;
    const v = notes.slice(0, pos) + `\n- [${marker}] ` + notes.slice(pos);
    onNotes(v);
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = pos + marker.length + 6; }, 0);
  };

  const extractMarked = () => {
    const a: MeetingAction[] = []; const d: string[] = [];
    notes.split('\n').forEach((line) => {
      const am = line.match(/\[ACTION\]\s*(.+)/i); if (am) a.push({ id: `A-${Math.random().toString(36).slice(2, 6)}`, text: am[1].trim(), ownerPost: '', due: new Date(Date.now() + 5 * 86400000).toISOString() });
      const dm = line.match(/\[DECISION\]\s*(.+)/i); if (dm) d.push(dm[1].trim());
    });
    return { a, d };
  };

  const extractAI = async () => {
    setExtracting(true);
    try {
      const r = await aiChat([
        { role: 'system', content: 'Extract action items and decisions from meeting notes. Reply ONLY with JSON {"actions":[{"text":string,"ownerPost":string}],"decisions":[string]}. Owner must be a post (e.g. "AE Ward W3"), or "" if not stated. Do not invent.' },
        { role: 'user', content: notes },
      ], 'Minutes action extraction', 0);
      const j = JSON.parse(r.text.replace(/```json|```/g, '').trim());
      setActions(j.actions.map((x: { text: string; ownerPost: string }) => ({ id: `A-${Math.random().toString(36).slice(2, 6)}`, text: x.text, ownerPost: x.ownerPost, due: new Date(Date.now() + 5 * 86400000).toISOString() })));
      setDecisions(j.decisions);
      toast('info', 'Draft actions extracted', 'Review owners and dates — nothing becomes a task until minutes are approved');
    } catch {
      const { a, d } = extractMarked(); setActions(a); setDecisions(d);
      toast('warning', 'AI unavailable — used [ACTION]/[DECISION] markers instead');
    } finally { setExtracting(false); }
  };

  const isChair = session!.user.role === 'ROLE-01';

  return (
    <div className="animate-fade-in">
      <PageHeader title="Meetings & minutes" subtitle="Capture notes, mark actions, approve minutes. Approved actions become tasks automatically." screen="SCR-12" release="P0" env="executive" />
      {loading ? <Card><SkeletonList /></Card> : (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <Card className="h-fit overflow-hidden">
            <div className="border-b border-line px-4 py-3 text-sm font-semibold">Meetings</div>
            <div className="divide-y divide-line">
              {meetings.map((x) => (
                <button key={x.id} onClick={() => setSel(x.id)} className={cn('block w-full px-4 py-3 text-left transition hover:bg-surface-2', m?.id === x.id && 'bg-primary/[0.06]')}>
                  <p className="truncate text-sm font-medium">{x.title}</p>
                  <div className="mt-1 flex items-center gap-2"><span className="text-xs text-muted">{fmtDate(x.start)} · {fmtTime(x.start)}</span><Badge tone={MIN_META[x.minutesStatus].tone}>{MIN_META[x.minutesStatus].label}</Badge></div>
                </button>
              ))}
            </div>
          </Card>

          {m && (
            <div className="space-y-5">
              <Card>
                <CardHeader title={m.title} subtitle={`${fmtDateTime(m.start)} · ${m.location} · v${m.version}`} icon={NotebookPen}
                  action={<span className={cn('flex items-center gap-1.5 text-xs font-medium', saveState === 'error' ? 'text-danger' : 'text-muted')}>
                    {saveState === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saveState === 'saved' ? <Check className="h-3.5 w-3.5 text-ok" /> : <CloudUpload className="h-3.5 w-3.5" />}
                    {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'All changes saved' : saveState === 'error' ? 'Save failed — local copy kept' : 'Unsaved'}
                  </span>} />
                <div className="p-5">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Button size="xs" variant="secondary" icon={ListChecks} onClick={() => insertMarker('ACTION')} disabled={m.minutesStatus === 'approved'}>Mark action</Button>
                    <Button size="xs" variant="secondary" icon={Gavel} onClick={() => insertMarker('DECISION')} disabled={m.minutesStatus === 'approved'}>Mark decision</Button>
                    {aiEnabled() && <Button size="xs" variant="ai" icon={Sparkles} loading={extracting} onClick={extractAI} disabled={!notes.trim() || m.minutesStatus === 'approved'}>Extract actions (AI)</Button>}
                    {!aiEnabled() && <Button size="xs" variant="outline" onClick={() => { const { a, d } = extractMarked(); setActions(a); setDecisions(d); }}>Collect marked items</Button>}
                  </div>
                  <textarea ref={taRef} value={notes} onChange={(e) => onNotes(e.target.value)} disabled={m.minutesStatus === 'approved'} placeholder="Type notes… Use “Mark action” to tag action items."
                    className="input min-h-[240px] resize-y font-mono text-[13px] leading-relaxed" />
                </div>
              </Card>

              <div className="grid gap-5 xl:grid-cols-2">
                <Card>
                  <CardHeader title="Action items" subtitle="Become tasks when minutes are approved" icon={ListChecks} action={m.minutesStatus !== 'approved' && <Button size="xs" variant="ghost" icon={Plus} onClick={() => setActions([...actions, { id: `A-${Date.now()}`, text: '', ownerPost: '', due: new Date(Date.now() + 5 * 86400000).toISOString() }])}>Add</Button>} />
                  <div className="space-y-2 p-4">
                    {actions.length === 0 && <p className="text-sm text-muted">No actions yet</p>}
                    {actions.map((a, i) => (
                      <div key={a.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-surface-2 p-3 ring-1 ring-line">
                        <Input value={a.text} disabled={m.minutesStatus === 'approved'} onChange={(e) => setActions(actions.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="Action" />
                        {m.minutesStatus !== 'approved' ? <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setActions(actions.filter((_, j) => j !== i))} aria-label="Remove" /> : a.taskId ? <Badge tone="green">{a.taskId}</Badge> : <span />}
                        <div className="col-span-2 grid grid-cols-2 gap-2">
                          <Input value={a.ownerPost} disabled={m.minutesStatus === 'approved'} onChange={(e) => setActions(actions.map((x, j) => (j === i ? { ...x, ownerPost: e.target.value } : x)))} placeholder="Owner post" />
                          <Input type="date" value={a.due.slice(0, 10)} disabled={m.minutesStatus === 'approved'} onChange={(e) => setActions(actions.map((x, j) => (j === i ? { ...x, due: new Date(e.target.value).toISOString() } : x)))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Decisions" subtitle="Also recorded in the decision log" icon={Gavel} />
                  <div className="space-y-2 p-4">
                    {decisions.length === 0 ? <p className="text-sm text-muted">No decisions yet</p> : decisions.map((d, i) => <div key={i} className="rounded-xl bg-surface-2 px-3 py-2.5 text-sm ring-1 ring-line">{d}</div>)}
                  </div>
                </Card>
              </div>

              <Card className="flex flex-wrap items-center gap-3 p-4">
                <Badge tone={MIN_META[m.minutesStatus].tone} dot>{MIN_META[m.minutesStatus].label}</Badge>
                <span className="text-xs text-muted">Version history: {m.version} saved version(s)</span>
                <div className="ml-auto flex gap-2">
                  {m.minutesStatus !== 'approved' && <Button variant="secondary" onClick={() => run(api.meetings.setActions(m.id, actions, decisions), 'Actions saved')}>Save actions</Button>}
                  {(m.minutesStatus === 'draft' || m.minutesStatus === 'none') && <Button icon={Send} disabled={!actions.length && !decisions.length} onClick={async () => { await api.meetings.setActions(m.id, actions, decisions); await run(api.meetings.submitMinutes(m.id), 'Sent to chair for approval', 'Appears in the executive’s Decide queue'); }}>Submit for approval</Button>}
                  {m.minutesStatus === 'pending-approval' && isChair && <Button variant="success" icon={Check} onClick={async () => { await api.meetings.setActions(m.id, actions, decisions); await run(api.meetings.approveMinutes(m.id), 'Minutes approved', `${actions.length} task(s) created from action items`); }}>Approve minutes</Button>}
                  {m.minutesStatus === 'pending-approval' && !isChair && <span className="text-xs text-muted">Waiting for the chair</span>}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const KIND_ICON = { PDF: FileText, DOCX: FileText, XLSX: FileSpreadsheet, Image: ImageIcon, Note: NotebookPen };

export function Documents() {
  const { data, loading } = useApi(() => api.documents.list());
  const { run, toast } = useToast();
  const { session } = useApp();
  const [q, setQ] = useState('');
  const [cls, setCls] = useState<'all' | DataClass>('all');
  const [viewing, setViewing] = useState<OfficeDocument | null>(null);
  const [uploading, setUploading] = useState(false);
  const [up, setUp] = useState({ title: '', dataClass: 'INT' as DataClass, tags: '' });

  const docs = (data ?? []).filter((d) => (cls === 'all' || d.dataClass === cls) && (d.title + d.tags.join(' ')).toLowerCase().includes(q.toLowerCase()));
  const open = async (d: OfficeDocument) => {
    try { await api.documents.open(d.id); setViewing(d); }
    catch (e) { toast('error', 'Class not authorized', `${(e as Error).message}. Request access from the System Administrator if needed.`); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Documents" subtitle="Office notes and attachments with classification. Every read of Official or Restricted records is audited." screen="SCR-13" release="P0" env="executive"
        actions={<Button icon={Upload} onClick={() => setUploading(true)}>Upload</Button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles and tags…" className="pl-9" /></div>
        <Tabs value={cls} onChange={setCls} items={[{ value: 'all', label: 'All' }, ...(['PUB', 'INT', 'OFF', 'RES'] as DataClass[]).map((c) => ({ value: c, label: CLASS_META[c].label }))]} />
      </div>
      <Card className="overflow-hidden">
        {loading ? <SkeletonList /> : docs.length === 0 ? <EmptyState title="No documents" /> : (
          <TableWrap>
            <table className="table-base">
              <thead><tr><th>Document</th><th>Class</th><th>Tags</th><th>Owner</th><th>Updated</th><th className="text-right">Size</th><th /></tr></thead>
              <tbody>
                {docs.map((d) => {
                  const I = KIND_ICON[d.kind];
                  const locked = d.dataClass === 'RES' && session!.user.role !== 'ROLE-01';
                  return (
                    <tr key={d.id}>
                      <td><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-muted ring-1 ring-line"><I className="h-4 w-4" /></div><div><p className="font-medium">{d.title}</p><p className="text-[11px] text-muted">{d.kind} · {d.id}</p></div></div></td>
                      <td><Badge tone={CLASS_META[d.dataClass].tone}>{CLASS_META[d.dataClass].label}</Badge></td>
                      <td><div className="flex flex-wrap gap-1">{d.tags.map((t) => <span key={t} className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted ring-1 ring-line">{t}</span>)}</div></td>
                      <td className="text-muted">{d.owner}</td>
                      <td className="text-muted">{fmtDate(d.updatedAt)}</td>
                      <td className="text-right text-muted">{d.sizeKb >= 1000 ? `${(d.sizeKb / 1000).toFixed(1)} MB` : `${d.sizeKb} KB`}</td>
                      <td className="text-right"><Button size="xs" variant={locked ? 'ghost' : 'secondary'} icon={locked ? Lock : Eye} onClick={() => open(d)}>{locked ? 'Restricted' : 'Open'}</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <Drawer open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title ?? ''} subtitle={viewing && <Badge tone={CLASS_META[viewing.dataClass].tone}>{CLASS_META[viewing.dataClass].label}</Badge>}>
        {viewing && (
          <div className="space-y-5">
            <div className="grid aspect-[3/4] place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 ring-1 ring-line dark:from-slate-800 dark:to-slate-900">
              <div className="text-center"><FileText className="mx-auto h-12 w-12" /><p className="mt-2 text-sm font-medium">Preview (synthetic)</p></div>
            </div>
            <KeyValue items={[['ID', viewing.id], ['Owner', viewing.owner], ['Updated', fmtDateTime(viewing.updatedAt)], ['Tags', viewing.tags.join(', ')]]} />
            <InfoNote>This read was written to the audit ledger.</InfoNote>
          </div>
        )}
      </Drawer>
      <Modal open={uploading} onClose={() => setUploading(false)} title="Upload document" subtitle="Files are scanned and classified before they are stored."
        footer={<><Button variant="secondary" onClick={() => setUploading(false)}>Cancel</Button><Button disabled={!up.title.trim()} onClick={async () => { await run(api.documents.upload(up.title, up.dataClass, up.tags.split(',').map((t) => t.trim()).filter(Boolean)), 'Uploaded', 'Malware scan passed (simulated)'); setUploading(false); setUp({ title: '', dataClass: 'INT', tags: '' }); }}>Upload</Button></>}>
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-line p-8 text-center hover:border-primary/50">
            <Upload className="h-8 w-8 text-muted" /><p className="mt-2 text-sm font-medium">Drop a file or click to browse</p><p className="text-xs text-muted">PDF, DOCX, XLSX, JPG up to 25 MB</p>
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUp((u) => ({ ...u, title: f.name.replace(/\.[^.]+$/, '') })); }} />
          </label>
          <Field label="Title" required><Input value={up.title} onChange={(e) => setUp({ ...up, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Classification"><Select value={up.dataClass} onChange={(e) => setUp({ ...up, dataClass: e.target.value as DataClass })}>{(['PUB', 'INT', 'OFF', 'RES'] as DataClass[]).map((c) => <option key={c} value={c}>{CLASS_META[c].label}</option>)}</Select></Field>
            <Field label="Tags" hint="Comma separated"><Input value={up.tags} onChange={(e) => setUp({ ...up, tags: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
