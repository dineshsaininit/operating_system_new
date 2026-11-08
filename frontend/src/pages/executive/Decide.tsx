import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, FileSignature, NotebookPen, ShieldCheck, Hourglass, Check, X, Pencil, MessageSquare, Gavel, Image as ImageIcon, Info } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, DraftLabel, EmptyState, Field, InfoNote, Modal, PageHeader, ReasonDialog, SkeletonList, Tabs, Textarea } from '@/components/ui';
import type { DecideItem, DecideType } from '@/types';
import { cn, daysBetween, relative } from '@/lib/utils';

const TYPE_META: Record<DecideType, { label: string; icon: typeof Gavel; tone: string; approve: string; reject: string; done: string }> = {
  appointment: { label: 'Appointment', icon: CalendarClock, tone: 'from-teal-400 to-emerald-600', approve: 'Approve', reject: 'Decline', done: 'Appointment approved' },
  draft: { label: 'Draft send', icon: FileSignature, tone: 'from-orange-400 to-amber-600', approve: 'Approve send', reject: 'Reject', done: 'Send approved' },
  minutes: { label: 'Minutes', icon: NotebookPen, tone: 'from-blue-400 to-indigo-600', approve: 'Approve', reject: 'Return', done: 'Minutes approved' },
  verification: { label: 'Verification', icon: ShieldCheck, tone: 'from-green-400 to-emerald-600', approve: 'Verify', reject: 'Reopen', done: 'Task verified' },
  extension: { label: 'Extension', icon: Hourglass, tone: 'from-purple-400 to-fuchsia-600', approve: 'Grant', reject: 'Refuse', done: 'Extension granted' },
  'emergency-message': { label: 'Emergency message', icon: Gavel, tone: 'from-red-400 to-rose-600', approve: 'Approve', reject: 'Reject', done: 'Message approved' },
};

export default function Decide() {
  const { data, loading } = useApi(() => api.decide.list());
  const { run } = useToast();
  const [filter, setFilter] = useState<'all' | DecideType>('all');
  const [rejecting, setRejecting] = useState<DecideItem | null>(null);
  const [editing, setEditing] = useState<DecideItem | null>(null);
  const [readBack, setReadBack] = useState<DecideItem | null>(null);
  const [editBody, setEditBody] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const items = (data ?? []).slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const shown = filter === 'all' ? items : items.filter((i) => i.type === filter);
  const count = (t: DecideType) => items.filter((i) => i.type === t).length;

  const approve = async (item: DecideItem) => {
    setBusy(item.id);
    await run(api.decide.approve(item), `${TYPE_META[item.type].done}`, 'Approval record written (ENT-37)');
    setBusy(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Decide" subtitle="Items waiting for your approval, oldest first. Nothing is sent or approved until you tap." screen="SCR-03" release="P0" env="executive" />

      <Tabs className="mb-5" value={filter} onChange={setFilter} items={[
        { value: 'all', label: 'All', count: items.length },
        { value: 'appointment', label: 'Appointments', count: count('appointment') },
        { value: 'draft', label: 'Drafts', count: count('draft') },
        { value: 'minutes', label: 'Minutes', count: count('minutes') },
        { value: 'verification', label: 'Verification', count: count('verification') },
        { value: 'extension', label: 'Extensions', count: count('extension') },
      ]} />

      {loading ? <Card><SkeletonList rows={4} /></Card> : shown.length === 0 ? (
        <Card><EmptyState icon={Check} title="No decisions waiting" description="New items appear here when the PA escalates a request, a draft needs approval, or a task is submitted for verification." /></Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {shown.map((item) => {
            const m = TYPE_META[item.type];
            const age = daysBetween(item.createdAt);
            return (
              <Card key={item.id} className="flex flex-col overflow-hidden lift">
                <div className="flex items-start gap-4 p-5">
                  <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow', m.tone)}><m.icon className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold">{item.title}</p>
                      {item.aiDraft && <DraftLabel />}
                      <Badge tone={age >= 2 ? 'amber' : 'gray'}>{age === 0 ? relative(item.createdAt) : `${age} d old`}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">{item.subtitle}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-muted">Sources:</span>
                      {item.sources.map((s) => <span key={s} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted ring-1 ring-line">{s}</span>)}
                    </div>
                    {item.body && item.type === 'draft' && (
                      <pre className="mt-3 max-h-28 overflow-hidden whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-sans text-xs leading-relaxed text-ink/80 ring-1 ring-line">{item.body}</pre>
                    )}
                    {item.type === 'verification' && (
                      <div className="mt-3 flex gap-2">
                        {[1, 2, 3].map((i) => <div key={i} className="grid h-16 w-20 place-items-center rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500 dark:from-slate-700 dark:to-slate-800"><ImageIcon className="h-5 w-5" /></div>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/40 px-5 py-3">
                  <Button size="sm" variant="success" icon={Check} loading={busy === item.id} className="min-h-[44px] sm:min-h-0"
                    onClick={() => (item.type === 'draft' ? setReadBack(item) : approve(item))}>{m.approve}</Button>
                  {(item.type === 'draft' || item.type === 'minutes' || item.type === 'appointment') && (
                    <Button size="sm" variant="secondary" icon={Pencil} className="min-h-[44px] sm:min-h-0" onClick={() => { setEditing(item); setEditBody(item.body ?? item.subtitle); }}>Edit</Button>
                  )}
                  <Button size="sm" variant="ghost" icon={X} className="min-h-[44px] text-danger hover:bg-red-500/10 sm:min-h-0" onClick={() => setRejecting(item)}>{m.reject}</Button>
                  <Link to="/pa" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-primary"><MessageSquare className="h-3.5 w-3.5" />Ask PA</Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6"><InfoNote icon={Info}>AI drafts are labelled <b>AI DRAFT</b>. No AI service or system account can approve anything — every approval writes an approval record to the audit ledger.</InfoNote></div>

      <ReasonDialog open={!!rejecting} onClose={() => setRejecting(null)} title={rejecting ? `${TYPE_META[rejecting.type].reject}: ${rejecting.title}` : ''}
        presets={rejecting?.type === 'appointment' ? ['Not within this office’s remit', 'Ward officer can resolve', 'Insufficient details'] : rejecting?.type === 'verification' ? ['Evidence insufficient', 'Work incomplete on site'] : undefined}
        onConfirm={(r) => run(api.decide.reject(rejecting!, r), 'Recorded', 'Reason stored with the decision')} confirmText={rejecting ? TYPE_META[rejecting.type].reject : 'Confirm'} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit — ${editing?.title}`} subtitle="Your edit replaces the draft; the AI DRAFT label is removed." size="lg"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={async () => { await run(api.decide.edit(editing!.id, editBody), 'Edit saved'); setEditing(null); }}>Save edit</Button></>}>
        <Field label="Content"><Textarea rows={10} value={editBody} onChange={(e) => setEditBody(e.target.value)} /></Field>
      </Modal>

      <Modal open={!!readBack} onClose={() => setReadBack(null)} title="Read back before sending" subtitle="Confirm exactly what will be sent." size="lg"
        footer={<><Button variant="secondary" onClick={() => setReadBack(null)}>Go back</Button><Button variant="success" icon={Check} onClick={async () => { const i = readBack!; setReadBack(null); await approve(i); }}>Approve send</Button></>}>
        <div className="mb-3 flex items-center gap-2">{readBack?.aiDraft && <DraftLabel />}<Badge tone="blue">{readBack?.subtitle}</Badge></div>
        <pre className="whitespace-pre-wrap rounded-xl bg-surface-2 p-4 font-sans text-sm leading-relaxed ring-1 ring-line">{readBack?.body}</pre>
      </Modal>
    </div>
  );
}
