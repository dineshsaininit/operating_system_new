import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Users, ListChecks, FileText, History, StickyNote, NotebookPen, Sparkles, CalendarDays, AlertTriangle, CloudRain, Lock, Star, Loader2, RefreshCw, Target } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { db } from '@/data/mockDb';
import { aiChat, aiEnabled, GUARDRAIL_SYSTEM, officeContext } from '@/services/ai';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, CardHeader, EmptyState, InfoNote, PageHeader, SkeletonList, Textarea } from '@/components/ui';
import { SpeakButton } from '@/components/domain';
import { Markdown, cleanAi } from '@/components/Markdown';
import { cn, dueLabel, fmtTime } from '@/lib/utils';

export function PreMeetingBrief() {
  const { id } = useParams();
  const { data: m, loading } = useApi(() => api.meetings.get(id!), [id]);
  const { toast } = useToast();
  const [note, setNote] = useState('');
  if (loading) return <Card><SkeletonList /></Card>;
  if (!m) return <Card><EmptyState title="Brief not available" description="Generation failed — showing linked items list instead." /></Card>;

  const readout = `Brief for ${m.title}. ${m.purpose}. From ${fmtTime(m.start)} to ${fmtTime(m.end)} at ${m.location}. Attendees: ${m.attendees.join(', ')}. Open items: ${m.openItems.map((o) => `${o.text}, ${o.status}`).join('; ')}.`;
  return (
    <div className="animate-fade-in">
      <PageHeader title={`Brief · ${m.title}`} subtitle="Prepare in one minute." screen="SCR-08" release="P0" env="executive"
        actions={<><SpeakButton text={readout} /><Link to={`/exec/meetings?open=${m.id}`}><Button variant="secondary" icon={NotebookPen}>Open minutes</Button></Link></>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Purpose" icon={Target} />
          <div className="p-5">
            <p className="text-lg font-medium">{m.purpose}</p>
            <p className="mt-1 text-sm text-muted">{fmtTime(m.start)}–{fmtTime(m.end)} · {m.location} · Chair: {m.chair}</p>
            <p className="label mt-6 flex items-center gap-1"><Users className="h-3 w-3" />Attendees (posts)</p>
            <div className="flex flex-wrap gap-1.5">{m.attendees.map((a) => <Badge key={a} tone="blue">{a}</Badge>)}</div>
            <p className="label mt-6 flex items-center gap-1"><ListChecks className="h-3 w-3" />Open items from last review</p>
            {m.openItems.length === 0 ? <p className="text-sm text-muted">No open items — first recorded review.</p> : (
              <div className="divide-y divide-line rounded-xl ring-1 ring-line">
                {m.openItems.map((o) => (
                  <div key={o.text} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>{o.text}</span><Badge tone={o.status === 'done' ? 'green' : o.status === 'open' ? 'amber' : 'blue'}>{o.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Documents" icon={FileText} />
            <div className="space-y-2 p-4">{m.documents.length ? m.documents.map((d) => <Link to="/exec/documents" key={d} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm ring-1 ring-line hover:ring-primary/40"><FileText className="h-4 w-4 text-muted" />{d}</Link>) : <p className="text-sm text-muted">No documents linked</p>}</div>
          </Card>
          <Card>
            <CardHeader title="Related visitors" subtitle="Context only" icon={History} iconClass="bg-slate-500/10 text-muted" />
            <p className="p-4 text-sm">2 visits this month on water pressure (Ward W2)</p>
          </Card>
          <Card>
            <CardHeader title="Your note" icon={StickyNote} iconClass="bg-amber-500/10 text-warn" />
            <div className="p-4"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Points to raise…" /><Button size="sm" className="mt-2" disabled={!note.trim()} onClick={() => { toast('success', 'Note added to brief'); setNote(''); }}>Add note</Button></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function Briefing() {
  const { data, loading } = useApi(() => api.dashboard.today());
  const { toast } = useToast();
  const [summary, setSummary] = useState<string | null>(null);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [rating, setRating] = useState(0);

  const overdue = db.tasks.filter((t) => new Date(t.due) < new Date(new Date().setHours(0, 0, 0, 0)) && !['closed', 'verified', 'cancelled'].includes(t.state));
  const dueToday = db.tasks.filter((t) => dueLabel(t.due).text === 'due today' && !['closed', 'verified', 'cancelled'].includes(t.state));
  const visitorsToday = data?.commitments.filter((c) => c.type === 'appointment') ?? [];
  const focus = data?.commitments.find((c) => c.type === 'focus');

  const sections = [
    { icon: CalendarDays, title: 'Today', text: `${data?.commitments.length ?? 0} fixed commitments${focus ? ` · focus ${fmtTime(focus.start)}–${fmtTime(focus.end)}` : ''}`, items: data?.commitments.map((c) => `${fmtTime(c.start)} ${c.title}`) ?? [] },
    { icon: AlertTriangle, title: 'Due and overdue', text: `${overdue.length} overdue · ${dueToday.length} due today`, items: overdue.map((t) => `${t.title} — ${t.ownerPost} (${dueLabel(t.due).text})`) },
    { icon: Users, title: 'Visitors', text: `${visitorsToday.length} visitor appointment(s) · walk-in window 17:30`, items: visitorsToday.map((v) => `${fmtTime(v.start)} ${v.title}`) },
    { icon: CloudRain, title: 'Weather (public)', text: 'Heavy rain advisory after 15:00 · IMD, fetched 06:58', items: [] },
  ];
  const deterministic = sections.map((s) => `${s.title}: ${s.text}.`).join(' ');

  const genSummary = async () => {
    setAiState('loading');
    try {
      const r = await aiChat([
        { role: 'system', content: `${GUARDRAIL_SYSTEM}\nOFFICE DATA: ${officeContext()}` },
        { role: 'user', content: 'Write the morning briefing for the Deputy Municipal Commissioner in at most 5 short bullet points: what matters most today, what is overdue and who owns it, and any risk. Cite record IDs.' },
      ], 'Briefing summary');
      setSummary(r.text); setAiState('idle');
    } catch { setAiState('error'); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Morning briefing" subtitle={`Compiled ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · 07:30`} screen="SCR-10" release="P0" env="executive"
        actions={<SpeakButton text={summary ? cleanAi(summary).replace(/[[\]*#`|]/g, '') : deterministic} label="Listen" size="md" />} />

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {loading ? <Card><SkeletonList /></Card> : sections.map((s) => (
            <Card key={s.title} className="p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{s.title}</p>
                  <p className="mt-1 text-[15px] font-semibold">{s.text}</p>
                  {s.items.length > 0 && <ul className="mt-2 space-y-1 text-sm text-muted">{s.items.slice(0, 6).map((i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />{i}</li>)}</ul>}
                </div>
              </div>
            </Card>
          ))}
          <Card className="border-dashed p-5">
            <div className="flex items-center gap-3 text-sm text-muted"><Lock className="h-5 w-5" /><div><p className="font-semibold text-ink">Ward exceptions — not available</p><p>Section hidden — governance views not authorized (P2, DEC-006).</p></div></div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 text-white">
              <p className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4" /> AI summary</p>
              <p className="text-xs text-white/80">Optional · verify against the list · cites records</p>
            </div>
            <div className="p-5">
              {!aiEnabled() ? <InfoNote tone="amber">AI summary off — showing deterministic text only.</InfoNote> :
                aiState === 'loading' ? <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Summarising…</p> :
                  aiState === 'error' ? <InfoNote tone="red">AI summary unavailable — showing list.</InfoNote> :
                    summary ? <div className="text-sm"><Markdown text={summary} /></div> :
                      <p className="text-sm text-muted">Generate a five-point summary from today’s records.</p>}
              {aiEnabled() && <Button variant="ai" size="sm" className="mt-4" icon={summary ? RefreshCw : Sparkles} loading={aiState === 'loading'} onClick={genSummary}>{summary ? 'Regenerate' : 'Generate summary'}</Button>}
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold">Was this useful?</p>
            <p className="text-xs text-muted">Helps set targets after a measured baseline.</p>
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => { setRating(n); db.briefingRatings.push(n); toast('success', 'Thanks — rating recorded'); }} aria-label={`${n} stars`}
                  className={cn('rounded-lg p-1.5 transition', n <= rating ? 'text-amber-500' : 'text-line hover:text-amber-400')}><Star className="h-7 w-7" fill="currentColor" /></button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
