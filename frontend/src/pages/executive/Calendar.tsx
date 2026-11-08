import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Target, Check, AlertTriangle, CalendarPlus, Lock, MapPin, Users, X } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { useToast } from '@/store/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, Drawer, Field, Input, KeyValue, Modal, PageHeader, ReasonDialog, Select, Skeleton, Tabs } from '@/components/ui';
import { EVENT_STYLE } from '@/components/domain';
import { cn, fmtDateLong, fmtTime, isSameDay } from '@/lib/utils';
import type { CalendarEvent, CalendarEventType } from '@/types';
import { ApiError } from '@/services/http';

const START_H = 8, END_H = 20, PX = 52; // px per hour

function startOfWeek(d: Date) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }

export default function CalendarPage({ mode = 'exec' }: { mode?: 'exec' | 'pa' }) {
  const { data, loading } = useApi(() => api.calendar.list());
  const { run, toast } = useToast();
  const nav = useNavigate();
  const [view, setView] = useState<'week' | 'day' | 'agenda'>(() => (window.innerWidth < 768 ? 'agenda' : 'week'));
  const [anchor, setAnchor] = useState(new Date());
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [booking, setBooking] = useState<{ type: CalendarEventType; date: string; start: string; end: string; title: string; location: string } | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<CalendarEvent | null>(null);

  const days = useMemo(() => {
    if (view === 'day') { const d = new Date(anchor); d.setHours(0, 0, 0, 0); return [d]; }
    const s = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
  }, [anchor, view]);

  const events = data ?? [];
  const proposals = events.filter((e) => e.status === 'proposed');
  const shift = (n: number) => { const d = new Date(anchor); d.setDate(d.getDate() + n * (view === 'day' ? 1 : 7)); setAnchor(d); };
  const weekNo = (() => { const d = new Date(Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())); const dn = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dn); const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((+d - +y) / 86400000 + 1) / 7); })();

  const openBooking = (type: CalendarEventType, day = new Date(), hour = 12) => {
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const hh = (h: number) => String(h).padStart(2, '0');
    setBooking({
      type, date: iso, start: `${hh(hour)}:00`,
      end: type === 'focus' ? `${hh(hour + 1)}:30` : `${hh(hour)}:20`,
      title: type === 'focus' ? 'Focus block' : '', location: 'DMC office',
    });
  };

  const submitBooking = async (overrideReason?: string) => {
    if (!booking) return;
    const start = new Date(`${booking.date}T${booking.start}`); const end = new Date(`${booking.date}T${booking.end}`);
    if (end <= start) { toast('error', 'End time must be after start time'); return; }
    try {
      await api.calendar.create({ title: booking.title || EVENT_STYLE[booking.type].label, type: booking.type, start: start.toISOString(), end: end.toISOString(), location: booking.location, status: 'confirmed' }, overrideReason);
      toast('success', overrideReason ? 'Booked with override' : 'Booked', overrideReason ? `Reason recorded: ${overrideReason}` : 'Conflict check passed');
      setBooking(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && mode === 'pa') setConflict(e.message);
      else toast('error', 'Not booked', (e as Error).message);
    }
  };

  const nowTop = ((new Date().getHours() + new Date().getMinutes() / 60) - START_H) * PX;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={mode === 'pa' ? 'Calendar & booking' : 'Calendar'}
        subtitle={mode === 'pa' ? 'Book and manage slots. Conflicts, buffers and private busy blocks are respected; overrides need a reason.' : 'Your day and week. Protect time with focus blocks; accept the PA’s proposals.'}
        screen={mode === 'pa' ? 'SCR-21' : 'SCR-06'} release="P0" env="executive"
        actions={<>
          <Button variant="secondary" icon={Target} onClick={() => openBooking('focus', new Date(), 15)}>Add focus block</Button>
          {mode === 'pa' && <Button icon={CalendarPlus} onClick={() => openBooking('appointment')}>Book slot</Button>}
        </>}
      />

      {proposals.length > 0 && mode === 'exec' && (
        <Card className="mb-5 border-l-4 border-l-primary">
          <CardHeader title="PA proposals" subtitle="Conflict check passed · travel time included" icon={CalendarPlus} />
          <div className="divide-y divide-line">
            {proposals.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p.title}</p><p className="text-xs text-muted">{fmtDateLong(p.start)} · {fmtTime(p.start)}–{fmtTime(p.end)} · travel time 25 min</p></div>
                <Button size="sm" variant="success" icon={Check} onClick={() => run(api.calendar.acceptProposal(p.id), 'Proposal accepted')}>Accept</Button>
                <Button size="sm" variant="ghost" icon={X} onClick={() => setCancelling(p)}>Decline</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => shift(-1)} aria-label="Previous" />
            <Button size="sm" variant="secondary" onClick={() => setAnchor(new Date())}>Today</Button>
            <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => shift(1)} aria-label="Next" />
          </div>
          <p className="text-sm font-semibold">{view === 'day' ? fmtDateLong(anchor.toISOString()) : `Week ${weekNo} · ${days[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${days[days.length - 1].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</p>
          <Tabs className="ml-auto" value={view} onChange={setView} items={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'agenda', label: 'Agenda' }]} />
        </div>

        <div className="flex flex-wrap gap-3 border-b border-line px-4 py-2">
          {(Object.keys(EVENT_STYLE) as CalendarEventType[]).map((k) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] text-muted"><span className={cn('h-2 w-2 rounded-full', EVENT_STYLE[k].dot)} />{EVENT_STYLE[k].label}</span>
          ))}
        </div>

        {loading ? <div className="p-6"><Skeleton className="h-96" /></div> : view === 'agenda' ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }).map((d) => {
              const evs = events.filter((e) => isSameDay(e.start, d)).sort((a, b) => +new Date(a.start) - +new Date(b.start));
              return (
                <div key={d.toISOString()} className="px-4 py-3">
                  <p className={cn('mb-2 text-xs font-bold uppercase tracking-wider', isSameDay(d, new Date()) ? 'text-primary' : 'text-muted')}>{fmtDateLong(d.toISOString())}</p>
                  {evs.length === 0 ? <p className="text-sm text-muted">No appointments</p> : evs.map((e) => (
                    <button key={e.id} onClick={() => setSelected(e)} className={cn('mb-1.5 flex w-full items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-left', EVENT_STYLE[e.type].cls)}>
                      <span className="w-24 font-mono text-xs">{fmtTime(e.start)}–{fmtTime(e.end)}</span>
                      <span className="flex-1 truncate text-sm font-medium">{e.title}</span>
                      {e.status === 'proposed' && <Badge tone="blue">proposed</Badge>}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid border-b border-line" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
                <div />
                {days.map((d) => (
                  <div key={d.toISOString()} className={cn('border-l border-line px-2 py-2 text-center', isSameDay(d, new Date()) && 'bg-primary/[0.05]')}>
                    <p className="text-[11px] font-semibold uppercase text-muted">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                    <p className={cn('mx-auto mt-0.5 grid h-7 w-7 place-items-center rounded-full text-sm font-bold', isSameDay(d, new Date()) && 'bg-primary text-white')}>{d.getDate()}</p>
                  </div>
                ))}
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, height: (END_H - START_H) * PX }}>
                <div className="relative">
                  {Array.from({ length: END_H - START_H }, (_, i) => (
                    <span key={i} className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-muted" style={{ top: i * PX }}>{i ? `${String(START_H + i).padStart(2, '0')}:00` : ''}</span>
                  ))}
                </div>
                {days.map((d) => (
                  <div key={d.toISOString()} className={cn('relative border-l border-line', isSameDay(d, new Date()) && 'bg-primary/[0.025]')}>
                    {Array.from({ length: END_H - START_H }, (_, i) => (
                      <button key={i} onClick={() => openBooking(mode === 'pa' ? 'appointment' : 'focus', d, START_H + i)} className="absolute inset-x-0 border-t border-line/60 hover:bg-primary/[0.04]" style={{ top: i * PX, height: PX }} aria-label={`Add at ${START_H + i}:00`} />
                    ))}
                    {isSameDay(d, new Date()) && nowTop > 0 && nowTop < (END_H - START_H) * PX && (
                      <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: nowTop }}><span className="-ml-1 h-2.5 w-2.5 rounded-full bg-danger" /><span className="h-px flex-1 bg-danger" /></div>
                    )}
                    {events.filter((e) => isSameDay(e.start, d)).map((e) => {
                      const s = new Date(e.start), en = new Date(e.end);
                      const top = ((s.getHours() + s.getMinutes() / 60) - START_H) * PX;
                      const h = Math.max(20, ((+en - +s) / 3600000) * PX - 2);
                      if (top < 0) return null;
                      return (
                        <button key={e.id} onClick={() => setSelected(e)} title={e.title}
                          className={cn('absolute inset-x-1 z-[5] overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:z-20 hover:shadow-md', EVENT_STYLE[e.type].cls, e.status === 'proposed' && 'border-dashed opacity-80 ring-1 ring-primary/40')}
                          style={{ top, height: h }}>
                          <p className="truncate font-semibold">{e.type === 'busy' && <Lock className="mr-1 inline h-3 w-3" />}{e.title}</p>
                          {h > 30 && <p className="truncate opacity-75">{fmtTime(e.start)}–{fmtTime(e.end)}</p>}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Event detail */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ''} subtitle={selected && <span className="flex items-center gap-2"><span className={cn('h-2 w-2 rounded-full', EVENT_STYLE[selected.type].dot)} />{EVENT_STYLE[selected.type].label}</span>}
        footer={selected && selected.type !== 'busy' && <>
          {selected.meetingId && <Button variant="secondary" onClick={() => nav(`/exec/brief/${selected.meetingId}`)}>Open brief</Button>}
          <Button variant="danger" onClick={() => setCancelling(selected)}>Cancel event</Button>
        </>}>
        {selected && (
          <div className="space-y-5">
            <KeyValue items={[
              ['When', `${fmtDateLong(selected.start)} · ${fmtTime(selected.start)}–${fmtTime(selected.end)}`],
              ['Location', selected.location ? <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selected.location}</span> : '—'],
              ['Ward', selected.ward ?? '—'],
              ['Status', selected.status ?? 'confirmed'],
            ]} />
            {selected.attendees && (
              <div><p className="label flex items-center gap-1"><Users className="h-3 w-3" /> Attendees (posts)</p><div className="flex flex-wrap gap-1.5">{selected.attendees.map((a) => <Badge key={a}>{a}</Badge>)}</div></div>
            )}
            {selected.type === 'busy' && <div className="rounded-xl bg-purple-500/[0.06] p-4 text-sm ring-1 ring-purple-500/20"><Lock className="mb-2 h-5 w-5 text-priv" />Opaque busy block projected one-way from the Private app. No details cross into the official system.</div>}
            {selected.type === 'focus' && <div className="rounded-xl bg-indigo-500/[0.06] p-4 text-sm ring-1 ring-indigo-500/20">Protected focus time. Only Interrupt-tier notifications reach the executive; the PA can override with a recorded reason.</div>}
          </div>
        )}
      </Drawer>

      {/* Booking */}
      <Modal open={!!booking} onClose={() => setBooking(null)} title={booking?.type === 'focus' ? 'Add focus block' : 'Book a slot'} subtitle="The system checks conflicts with meetings, focus blocks, buffers and private busy blocks."
        footer={<><Button variant="secondary" onClick={() => setBooking(null)}>Cancel</Button><Button onClick={() => submitBooking()}>Check and book</Button></>}>
        {booking && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type"><Select value={booking.type} onChange={(e) => setBooking({ ...booking, type: e.target.value as CalendarEventType })}>
              {(['appointment', 'meeting', 'focus', 'site-visit', 'internal', 'walkin-window'] as CalendarEventType[]).map((t) => <option key={t} value={t}>{EVENT_STYLE[t].label}</option>)}
            </Select></Field>
            <Field label="Date"><Input type="date" value={booking.date} onChange={(e) => setBooking({ ...booking, date: e.target.value })} /></Field>
            <Field label="Title" className="sm:col-span-2"><Input value={booking.title} onChange={(e) => setBooking({ ...booking, title: e.target.value })} placeholder="e.g. Visitor: name (synthetic)" /></Field>
            <Field label="Start"><Input type="time" value={booking.start} onChange={(e) => setBooking({ ...booking, start: e.target.value })} /></Field>
            <Field label="End"><Input type="time" value={booking.end} onChange={(e) => setBooking({ ...booking, end: e.target.value })} /></Field>
            <Field label="Location" className="sm:col-span-2"><Input value={booking.location} onChange={(e) => setBooking({ ...booking, location: e.target.value })} /></Field>
          </div>
        )}
      </Modal>

      <ReasonDialog open={!!conflict} onClose={() => setConflict(null)} title="Conflict detected" label={conflict ?? ''} confirmText="Override and book" tone="primary"
        presets={['Executive instructed', 'Urgent public matter', 'Short call only']}
        onConfirm={(r) => submitBooking(r)} />
      <ReasonDialog open={!!cancelling} onClose={() => setCancelling(null)} title={`Cancel: ${cancelling?.title}`} confirmText="Cancel event"
        onConfirm={async (r) => { await run(api.calendar.cancel(cancelling!.id, r), 'Event cancelled', 'Visitor and attendees notified via approved channels'); setSelected(null); }} />
      {mode === 'pa' && <div className="mt-4 flex items-center gap-2 text-xs text-muted"><AlertTriangle className="h-3.5 w-3.5" /> Click an empty slot to book. 15-minute buffers are added automatically after meetings.</div>}
      {mode === 'exec' && <div className="mt-4 flex items-center gap-2 text-xs text-muted"><Plus className="h-3.5 w-3.5" /> Click an empty slot to add a focus block. Colours always come with text labels.</div>}
    </div>
  );
}
