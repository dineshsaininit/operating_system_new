import { Link, useNavigate } from 'react-router-dom';
import { CloudRain, Clock, Phone, BookOpenCheck, Gavel, ChevronRight, CheckCircle2, ListOrdered, CalendarDays, FileText, AlertTriangle, Shield, Sparkles, MapPin } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, CardHeader, CountUp, EmptyState, Skeleton } from '@/components/ui';
import { EVENT_STYLE, SpeakButton } from '@/components/domain';
import { cn, dueLabel, fmtTime, greeting } from '@/lib/utils';

export default function Today() {
  const { data, loading } = useApi(() => api.dashboard.today());
  const { data: pa } = useApi(() => api.dashboard.pa());
  const { session, t } = useApp();
  const { toast } = useToast();
  const nav = useNavigate();
  const first = session!.user.name.replace(' (synthetic)', '');

  const now = Date.now();
  const nextUp = data?.commitments.find((e) => new Date(e.end).getTime() > now);
  const dueCount = data?.dueToday.length ?? 0;
  const overdue = data?.dueToday.filter((x) => new Date(x.due) < new Date(new Date().setHours(0, 0, 0, 0))).length ?? 0;
  const nothing = data && data.decideCount === 0 && dueCount === 0;

  const readout = data ? `${greeting()}. You have ${data.commitments.length} fixed commitments today${nextUp ? `, next is ${nextUp.title} at ${fmtTime(nextUp.start)}` : ''}. ${data.decideCount} items are waiting in Decide. ${dueCount} tasks are due, ${overdue} overdue. Alert: ${data.alert.title}.` : '';

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="shine aurora relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-[#123266] to-blue-700 p-6 text-white shadow-[0_30px_60px_-30px_rgb(30_64_175/0.7)] sm:p-8">
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="absolute -right-20 -top-24 h-72 w-72 animate-float rounded-full bg-blue-400/25 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 animate-float-slow rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute right-1/4 top-6 h-24 w-24 animate-float rounded-full bg-cyan-300/10 blur-2xl [animation-delay:-5s]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-200">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · SCR-02</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting()}, {first}.</h1>
            {loading ? <Skeleton className="mt-3 h-6 w-72 bg-white/10" /> : (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold', nothing ? 'bg-green-400/20 text-green-100' : 'bg-white/10 text-white')}>
                  <span className={cn('h-2 w-2 rounded-full', nothing ? 'bg-green-400' : data!.decideCount ? 'bg-amber-400' : 'bg-blue-300')} />
                  {nothing ? t('nothingNeedsYou') : `${data!.decideCount} items in Decide · ${overdue ? `${overdue} overdue` : 'nothing overdue'} · 1 alert`}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100"><Shield className="h-3.5 w-3.5" /> No interruptions pending</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <SpeakButton text={readout} label="Read out" size="md" variant="glass" />
            <Button variant="glass" icon={BookOpenCheck} onClick={() => nav('/exec/briefing')}>{t('openBriefing')}</Button>
            <Button variant="white" icon={Phone} onClick={() => { api.dashboard.replyWhisper('Please call me'); toast('success', 'PA notified', 'Silent request sent to the PA console'); }}>{t('callPA')}</Button>
          </div>
        </div>
        {nextUp && (
          <div className="relative mt-6 flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><Clock className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-blue-200">Up next · {fmtTime(nextUp.start)}–{fmtTime(nextUp.end)}</p>
                <p className="text-base font-semibold">{nextUp.title}</p>
              </div>
            </div>
            {nextUp.briefReady && nextUp.meetingId && (
              <Link to={`/exec/brief/${nextUp.meetingId}`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-navy-800 hover:bg-blue-50">Open brief <ChevronRight className="h-4 w-4" /></Link>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Fixed commitments */}
        <Card className="lg:col-span-1">
          <CardHeader title={t('fixedCommitments')} subtitle="From the calendar of record" icon={CalendarDays} action={<Link to="/exec/calendar" className="text-xs font-semibold text-primary">Calendar</Link>} />
          <div className="p-2">
            {loading ? <div className="space-y-2 p-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div> :
              data!.commitments.length === 0 ? <EmptyState title="No appointments" /> :
                <ol className="relative">
                  {data!.commitments.map((e) => {
                    const past = new Date(e.end).getTime() < now;
                    const live = new Date(e.start).getTime() <= now && !past;
                    return (
                      <li key={e.id} className={cn('flex items-start gap-3 rounded-xl px-3 py-2.5', past && 'opacity-50', live && 'bg-primary/[0.06]')}>
                        <span className="w-12 pt-0.5 text-right font-mono text-xs font-semibold text-muted">{fmtTime(e.start)}</span>
                        <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', EVENT_STYLE[e.type].dot, live && 'animate-pulse')} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.title}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {e.type === 'focus' && <Badge tone="purple">protected</Badge>}
                            {e.briefReady && <Badge tone="green">brief ready</Badge>}
                            {e.location && <span className="flex items-center gap-1 text-[11px] text-muted"><MapPin className="h-3 w-3" />{e.location}</span>}
                            {live && <Badge tone="blue" dot>now</Badge>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>}
          </div>
        </Card>

        {/* Due today */}
        <Card>
          <CardHeader title={t('dueToday')} subtitle="Commitment ledger" icon={CheckCircle2} iconClass="bg-amber-500/10 text-warn" action={<Link to="/exec/tasks" className="text-xs font-semibold text-primary">All tasks</Link>} />
          <div className="divide-y divide-line/70">
            {loading ? <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div> :
              dueCount === 0 ? <EmptyState icon={CheckCircle2} title="Nothing due today" /> :
                data!.dueToday.slice(0, 5).map((tk) => {
                  const d = dueLabel(tk.due);
                  return (
                    <Link key={tk.id} to={`/exec/tasks?open=${tk.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/60">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{tk.title}</p>
                        <p className="text-xs text-muted">{tk.ownerPost}</p>
                      </div>
                      <Badge tone={d.tone}>{d.text}</Badge>
                    </Link>
                  );
                })}
            {dueCount > 5 && <Link to="/exec/tasks" className="block px-5 py-2.5 text-xs font-semibold text-primary">+{dueCount - 5} more · View all ›</Link>}
          </div>
        </Card>

        {/* Alert + Decide + queue */}
        <div className="space-y-5">
          <Card className="overflow-hidden border-l-4 border-l-danger">
            <div className="flex items-start gap-3 p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-danger"><CloudRain className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-danger">{t('oneAlert')}</p>
                <p className="mt-1 text-sm font-semibold">{data?.alert.title ?? '…'}</p>
                <p className="mt-0.5 text-xs text-muted">Source: {data?.alert.source} · source time {data?.alert.sourceTime}</p>
              </div>
            </div>
          </Card>
          <button onClick={() => nav('/exec/decide')} className="card group flex w-full items-center gap-4 p-5 text-left lift">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"><Gavel className="h-6 w-6" /></div>
            <div className="flex-1">
              <p className="text-2xl font-bold tabular-nums">{data ? <CountUp value={data.decideCount} /> : '–'}</p>
              <p className="text-xs text-muted">waiting for your decision</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted transition group-hover:translate-x-1" />
          </button>
          <button onClick={() => nav('/exec/queue')} className="card group flex w-full items-center gap-4 p-5 text-left lift">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"><ListOrdered className="h-6 w-6" /></div>
            <div className="flex-1">
              <p className="text-2xl font-bold tabular-nums">{data ? <CountUp value={data.queueWaiting} /> : '–'}</p>
              <p className="text-xs text-muted">visitors waiting · PA manages the queue</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted transition group-hover:translate-x-1" />
          </button>
          {pa?.whisperLast && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-muted">Last whisper reply</p>
              <p className="mt-1 text-sm font-semibold">“{pa.whisperLast.text}” <span className="font-normal text-muted">· {fmtTime(pa.whisperLast.at)}</span></p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {['5 minutes', 'Send in', 'Call later', 'Ask to wait'].map((r) => (
                  <Button key={r} size="sm" variant="secondary" onClick={() => { api.dashboard.replyWhisper(r); toast('success', `Replied: “${r}”`); }}>{r}</Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { to: '/exec/ask', icon: Sparkles, label: 'Ask the assistant', sub: 'Permission-bound answers with sources', c: 'text-ai bg-orange-500/10' },
          { to: '/exec/documents', icon: FileText, label: 'Documents', sub: 'Search office records by class', c: 'text-primary bg-primary/10' },
          { to: '/gov/emergency', icon: AlertTriangle, label: 'Emergency mode', sub: 'Declare and coordinate an incident', c: 'text-danger bg-red-500/10' },
        ].map((x) => (
          <Link key={x.to} to={x.to} className="card flex items-center gap-3 p-4 lift">
            <div className={cn('grid h-10 w-10 place-items-center rounded-xl', x.c)}><x.icon className="h-5 w-5" /></div>
            <div><p className="text-sm font-semibold">{x.label}</p><p className="text-xs text-muted">{x.sub}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
