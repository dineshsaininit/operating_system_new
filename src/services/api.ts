/**
 * ════════════════════════════════════════════════════════════════════════════
 *  AASIOM COMMAND OS — API LAYER  (the only place the UI talks to data)
 * ════════════════════════════════════════════════════════════════════════════
 *  Every method below declares BOTH:
 *    1. the REST endpoint the real backend must implement   → { method, path, body }
 *    2. a mock implementation running on synthetic data     → () => ...
 *
 *  While VITE_API_BASE_URL is empty, the mock runs (with realistic latency).
 *  Once the backend exists, set VITE_API_BASE_URL and the same calls go over HTTP.
 *  The full contract is documented in BACKEND_API_CONTRACT.md.
 *
 *  Rules mirrored from the SRS that the BACKEND MUST ALSO ENFORCE server-side:
 *   - Task state machine BR-011 (EXEC-FR-037)       - Approval records for every approval (ENT-37)
 *   - Weekly nudge cap BR-013                        - Absence mode holds items w/o delegation (BR-049)
 *   - Audit event for every write/approval/send      - No AI or system account can approve anything
 * ════════════════════════════════════════════════════════════════════════════
 */
import type {
  AbsenceState, AppNotification, AppointmentRequest, CalendarEvent, ConfigState, CsrProject, CsrStage, DecideItem,
  DecisionEntry, Draft, Emergency, FamilyEvent, Expense, Holding, Meeting, PeaceSettings, QueueEntry, RoleId, Session,
  Task, TaskState, User, Visitor, AuditEvent, AIInteraction, StatutoryItem, Inspection, DakItem, Lang,
} from '@/types';
import { db, persistDb } from '@/data/mockDb';
import { bus } from './bus';
import { ApiError, USE_MOCK, http, setAuthToken } from './http';
import { fakeHash, sleep, uid } from '@/lib/utils';

// ───────────────────────────── plumbing ─────────────────────────────
type Req = { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; body?: unknown };

let actor: { name: string; role: RoleId } = { name: 'anonymous', role: 'ROLE-12' };

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

async function call<T>(req: Req, mock: () => T | Promise<T>, opts: { mutate?: boolean } = {}): Promise<T> {
  let result: T;
  if (USE_MOCK) {
    await sleep(req.method === 'GET' ? 220 + Math.random() * 200 : 300 + Math.random() * 250);
    result = clone(await mock());
  } else {
    result = await http<T>(req.method, req.path, req.body);
  }
  if (opts.mutate || req.method !== 'GET') { if (USE_MOCK) persistDb(); bus.emit(); }
  return result;
}

/** Append-only hash-chained audit event (mock of PLT-M02). */
function audit(action: string, object: string, result: AuditEvent['result'] = 'ok') {
  const prev = db.audit[0]?.hash ?? '00000000000000';
  const ev = {
    id: `AE-${String(db.audit.length + 1).padStart(4, '0')}`,
    at: new Date().toISOString(),
    actor: actor.name.replace(' (synthetic)', ''),
    role: actor.role,
    action,
    object,
    result,
  };
  db.audit.unshift({ ...ev, prevHash: prev, hash: fakeHash(prev + JSON.stringify(ev)) });
  return ev.id;
}

function notify(n: Omit<AppNotification, 'id' | 'at' | 'read' | 'held'>) {
  const now = new Date();
  const hhmm = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = db.peace.from.split(':').map(Number);
  const [th, tm] = db.peace.to.split(':').map(Number);
  const from = fh * 60 + fm, to = th * 60 + tm;
  const inPeace = db.peace.enabled && (from > to ? hhmm >= from || hhmm < to : hhmm >= from && hhmm < to);
  db.notifications.unshift({ ...n, id: uid('N'), at: now.toISOString(), read: false, held: inPeace && n.tier !== 'interrupt' });
}

function fail(status: number, message: string): never {
  throw new ApiError(status, message, undefined, uid('REF'));
}

const can = (...roles: RoleId[]) => roles.includes(actor.role);

// BR-011 task state machine
export const TASK_TRANSITIONS: Record<TaskState, TaskState[]> = {
  draft: ['assigned', 'cancelled'],
  assigned: ['acknowledged', 'cancelled'],
  acknowledged: ['in-progress', 'cancelled'],
  'in-progress': ['submitted', 'cancelled'],
  submitted: ['verified', 'closed', 'reopened'],
  verified: ['closed'],
  reopened: ['in-progress', 'cancelled'],
  closed: [],
  cancelled: [],
};

// ───────────────────────────── API ─────────────────────────────
export const api = {
  // ── Auth (SCR-01, SCR-59) ──
  auth: {
    signIn: (role: RoleId, deviceName: string) =>
      call<Session>({ method: 'POST', path: '/auth/sign-in', body: { role, deviceName } }, () => {
        const user = db.users.find((u) => u.role === role && u.status === 'active');
        if (!user) fail(401, 'No active account for this role');
        actor = { name: user.name, role: user.role };
        audit('auth.sign_in', deviceName);
        return { user, token: uid('TOK'), deviceName, signedInAt: new Date().toISOString() };
      }),
    resume: (s: Session) => { actor = { name: s.user.name, role: s.user.role }; setAuthToken(s.token); },
    signOut: () => call<void>({ method: 'POST', path: '/auth/sign-out' }, () => { audit('auth.sign_out', 'session'); setAuthToken(null); }),
    devices: () => call({ method: 'GET', path: '/me/devices' }, () => db.devices),
    revokeDevice: (id: string) => call({ method: 'DELETE', path: `/me/devices/${id}` }, () => {
      db.devices = db.devices.filter((d) => d.id !== id); audit('device.revoke', id);
    }),
  },

  // ── Dashboard aggregates (SCR-02, SCR-20) ──
  dashboard: {
    today: () => call({ method: 'GET', path: '/exec/today' }, () => {
      const today = new Date().toDateString();
      return {
        commitments: db.calendar.filter((e) => new Date(e.start).toDateString() === today && ['meeting', 'appointment', 'focus', 'site-visit', 'internal'].includes(e.type)),
        dueToday: db.tasks.filter((t) => !['closed', 'verified', 'cancelled'].includes(t.state) && new Date(t.due) <= new Date(new Date().setHours(23, 59))),
        decideCount: db.decide.filter((d) => d.status === 'pending').length,
        alert: { title: 'Heavy rain advisory after 15:00', source: 'public IMD feed', sourceTime: '07:40' },
        queueWaiting: db.queue.filter((q) => q.status === 'waiting').length,
        execStatus: db.execStatus,
      };
    }),
    pa: () => call({ method: 'GET', path: '/pa/console' }, () => ({
      queue: db.queue.filter((q) => ['waiting', 'called', 'in-meeting'].includes(q.status)),
      inboxCount: db.requests.filter((r) => r.status === 'requested').length,
      decideCount: db.decide.filter((d) => d.status === 'pending').length,
      followUpsDue: db.tasks.filter((t) => !['closed', 'verified', 'cancelled', 'draft'].includes(t.state) && new Date(t.due) <= new Date(Date.now() + 86400000)),
      execStatus: db.execStatus,
      whisperLast: db.whisperLast,
    })),
    setExecStatus: (text: string, tone: 'busy' | 'available' | 'away' | 'travel') =>
      call({ method: 'PUT', path: '/exec/status', body: { text, tone } }, () => { db.execStatus = { text, tone }; audit('exec.status', text); }),
    sendWhisper: (type: string, note: string) =>
      call({ method: 'POST', path: '/pa/whisper', body: { type, note } }, () => {
        notify({ tier: 'interrupt', title: `PA whisper: ${type}`, body: note || undefined, category: 'whisper', link: '/exec/today' });
        audit('whisper.send', type);
        // simulate the executive replying with a preset after a moment
        setTimeout(() => { db.whisperLast = { text: ['5 minutes', 'Send in', 'Call later', 'Ask to wait'][Math.floor(Math.random() * 4)], at: new Date().toISOString() }; bus.emit(); }, 6000);
      }),
    replyWhisper: (text: string) => call({ method: 'POST', path: '/exec/whisper-reply', body: { text } }, () => {
      db.whisperLast = { text, at: new Date().toISOString() }; audit('whisper.reply', text);
    }),
  },

  // ── Calendar (SCR-06, SCR-21) ──
  calendar: {
    list: () => call<CalendarEvent[]>({ method: 'GET', path: '/calendar' }, () => db.calendar.filter((e) => e.status !== 'cancelled')),
    create: (e: Omit<CalendarEvent, 'id'>, overrideReason?: string) =>
      call<CalendarEvent>({ method: 'POST', path: '/calendar', body: { ...e, overrideReason } }, () => {
        const clash = db.calendar.find((x) => x.status !== 'cancelled' && ['focus', 'meeting', 'appointment', 'busy', 'site-visit'].includes(x.type) && new Date(e.start) < new Date(x.end) && new Date(e.end) > new Date(x.start));
        if (clash && !overrideReason) fail(409, `Conflicts with "${clash.title}" — override needs a reason`);
        const ev = { ...e, id: uid('EV') };
        db.calendar.push(ev);
        audit(overrideReason ? 'calendar.override' : 'calendar.create', `${ev.title}${overrideReason ? ` — ${overrideReason}` : ''}`);
        return ev;
      }),
    move: (id: string, start: string, end: string) => call({ method: 'PATCH', path: `/calendar/${id}`, body: { start, end } }, () => {
      const e = db.calendar.find((x) => x.id === id); if (!e) fail(404, 'Not found');
      e.start = start; e.end = end; audit('calendar.move', id);
    }),
    acceptProposal: (id: string) => call({ method: 'POST', path: `/calendar/${id}/accept` }, () => {
      const e = db.calendar.find((x) => x.id === id); if (!e) fail(404, 'Not found');
      e.status = 'confirmed'; audit('calendar.accept_proposal', id);
    }),
    cancel: (id: string, reason: string) => call({ method: 'POST', path: `/calendar/${id}/cancel`, body: { reason } }, () => {
      const e = db.calendar.find((x) => x.id === id); if (!e) fail(404, 'Not found');
      e.status = 'cancelled'; audit('calendar.cancel', `${id} — ${reason}`);
    }),
  },

  // ── Appointment requests (SCR-07, SCR-22, SCR-29) ──
  requests: {
    list: () => call<AppointmentRequest[]>({ method: 'GET', path: '/appointment-requests' }, () => db.requests),
    get: (id: string) => call<AppointmentRequest | undefined>({ method: 'GET', path: `/appointment-requests/${id}` }, () => db.requests.find((r) => r.id === id)),
    approve: (id: string, slot: string) => call({ method: 'POST', path: `/appointment-requests/${id}/approve`, body: { slot } }, () => {
      const r = db.requests.find((x) => x.id === id); if (!r) fail(404, 'Not found');
      if (db.absence.active && !db.absence.delegationRecord) fail(409, 'Absence mode: held — no written delegation record (BR-049)');
      if (r.reserved && !can('ROLE-01')) fail(403, 'Reserved category — only the executive can approve');
      r.status = 'approved'; r.slot = slot;
      const start = new Date(slot); const end = new Date(start.getTime() + 15 * 60000);
      db.calendar.push({ id: uid('EV'), title: `Visitor: ${r.visitorName}`, type: 'appointment', start: start.toISOString(), end: end.toISOString(), location: 'DMC office' });
      db.decide.filter((d) => d.refId === id).forEach((d) => (d.status = 'approved'));
      audit('appointment.approve', id);
      audit('sms.send', `${id} confirmation${db.config.smsSenderApproved ? '' : ' (simulated — DEC-010 sender ID pending)'}`);
    }),
    decline: (id: string, reason: string) => call({ method: 'POST', path: `/appointment-requests/${id}/decline`, body: { reason } }, () => {
      const r = db.requests.find((x) => x.id === id); if (!r) fail(404, 'Not found');
      r.status = 'declined'; r.reason = reason;
      db.decide.filter((d) => d.refId === id).forEach((d) => (d.status = 'rejected'));
      audit('appointment.decline', `${id} — ${reason}`);
    }),
    redirect: (id: string, target: string, reason: string) => call({ method: 'POST', path: `/appointment-requests/${id}/redirect`, body: { target, reason } }, () => {
      const r = db.requests.find((x) => x.id === id); if (!r) fail(404, 'Not found');
      r.status = 'redirected'; r.redirectTarget = target; r.reason = reason;
      db.decide.filter((d) => d.refId === id).forEach((d) => (d.status = 'rejected'));
      audit('appointment.redirect', `${id} → ${target}`);
    }),
    escalate: (id: string) => call({ method: 'POST', path: `/appointment-requests/${id}/escalate` }, () => {
      const r = db.requests.find((x) => x.id === id); if (!r) fail(404, 'Not found');
      r.status = 'escalated';
      db.decide.unshift({ id: uid('D'), type: 'appointment', title: 'Appointment request (escalated by PA)', subtitle: `${r.visitorName} · ${r.category} · Ward ${r.ward}`, createdAt: new Date().toISOString(), sources: [r.id], refId: r.id, status: 'pending' });
      notify({ tier: 'normal', title: 'Item added to Decide', body: r.visitorName, category: 'decide', link: '/exec/decide' });
      audit('appointment.escalate', id);
    }),
    /** Public form (SCR-29). Returns a reference number. */
    submitPublic: (p: { name: string; mobile: string; category: string; ward: string; purpose: string; lang: Lang }) =>
      call<{ ref: string }>({ method: 'POST', path: '/public/appointment-requests', body: p }, () => {
        const ref = `AR-${1043 + db.requests.length - 9}`;
        const reserved = db.config.categories.find((c) => c.name === p.category)?.reserved ?? false;
        db.requests.unshift({ id: ref, receivedAt: new Date().toISOString(), channel: 'web', visitorName: `${p.name} (synthetic)`, mobile: p.mobile.replace(/^(\d{2})\d{6}/, '$1XXXXXX'), category: p.category, ward: p.ward, purpose: p.purpose, reserved, priorVisits: 0, status: 'requested' });
        if (reserved) db.decide.unshift({ id: uid('D'), type: 'appointment', title: 'Appointment request', subtitle: `${p.name} · Ward ${p.ward} · reserved category`, createdAt: new Date().toISOString(), sources: [ref], refId: ref, status: 'pending' });
        notify({ tier: reserved ? 'normal' : 'digest', title: `New appointment request ${ref}`, category: 'request', link: '/pa/inbox' });
        audit('public.request_submit', ref);
        return { ref };
      }),
    publicStatus: (ref: string) => call({ method: 'GET', path: `/public/status/${ref}` }, () => {
      const r = db.requests.find((x) => x.id.toLowerCase() === ref.toLowerCase());
      const q = db.queue.find((x) => x.token.toLowerCase() === ref.toLowerCase());
      if (q) {
        const ahead = db.queue.filter((x) => x.status === 'waiting' && new Date(x.arrivedAt) < new Date(q.arrivedAt)).length;
        return { kind: 'token' as const, ref: q.token, status: q.status, position: ahead + 1, wait: q.waitMin };
      }
      if (r) return { kind: 'request' as const, ref: r.id, status: r.status, slot: r.slot, redirectTarget: r.redirectTarget };
      return null;
    }),
  },

  // ── Queue & visitors (SCR-09, SCR-23, SCR-27, SCR-28, SCR-58) ──
  queue: {
    list: () => call<QueueEntry[]>({ method: 'GET', path: '/queue/today' }, () => db.queue),
    register: (v: { name: string; mobile?: string; category: string; ward: string; purpose: string; noticeRead: boolean; offline?: boolean; kiosk?: boolean }) =>
      call<QueueEntry>({ method: 'POST', path: '/queue', body: v }, () => {
        if (!v.noticeRead) fail(422, 'Privacy notice must be read to the visitor first');
        const prefix = v.offline ? 'L' : 'W';
        const n = db.queue.filter((q) => q.token.startsWith(prefix)).length + (prefix === 'W' ? 11 : 1);
        const waiting = db.queue.filter((q) => q.status === 'waiting').length;
        const desk = db.config.categories.find((c) => c.name === v.category)?.rightDesk;
        const entry: QueueEntry = {
          id: uid('Q'), token: `${prefix}-${String(n).padStart(2, '0')}`, visitorName: `${v.name}${v.name.includes('synthetic') ? '' : ' (synthetic)'}`, type: 'walk-in', category: v.category, ward: v.ward,
          arrivedAt: new Date().toISOString(), status: 'waiting', waitMin: [waiting * 8 + 10, waiting * 10 + 25], purpose: v.purpose,
          routeSuggestion: desk && desk !== 'PA triage' ? `${v.ward !== '—' ? `Ward ${v.ward} ` : ''}${desk}` : undefined,
          repeatMatch: db.visitors.some((x) => x.name.split(' ')[0] === v.name.split(' ')[0]),
        };
        db.queue.push(entry);
        audit(v.kiosk ? 'kiosk.check_in' : 'visitor.register', entry.token);
        return entry;
      }),
    callNext: () => call<QueueEntry | null>({ method: 'POST', path: '/queue/call-next' }, () => {
      db.queue.filter((q) => q.status === 'called' || q.status === 'in-meeting').forEach((q) => (q.status = 'done'));
      const next = db.queue.find((q) => q.status === 'waiting');
      if (!next) return null;
      next.status = 'called';
      db.queue.filter((q) => q.status === 'waiting').forEach((q) => { q.waitMin = [Math.max(0, q.waitMin[0] - 10), Math.max(5, q.waitMin[1] - 10)]; });
      audit('queue.call_next', next.token);
      return next;
    }),
    setStatus: (id: string, status: QueueEntry['status']) => call({ method: 'PATCH', path: `/queue/${id}`, body: { status } }, () => {
      const q = db.queue.find((x) => x.id === id); if (!q) fail(404, 'Not found');
      q.status = status; audit(`queue.${status}`, q.token);
    }),
    route: (id: string, target: string) => call({ method: 'POST', path: `/queue/${id}/route`, body: { target } }, () => {
      const q = db.queue.find((x) => x.id === id); if (!q) fail(404, 'Not found');
      q.status = 'redirected'; q.routeSuggestion = target; audit('queue.route', `${q.token} → ${target}`);
    }),
    reorder: (id: string, dir: -1 | 1, reason: string) => call({ method: 'POST', path: `/queue/${id}/reorder`, body: { dir, reason } }, () => {
      if (!reason.trim()) fail(422, 'Reorder needs a reason');
      const i = db.queue.findIndex((x) => x.id === id); const j = i + dir;
      if (i < 0 || j < 0 || j >= db.queue.length) return;
      [db.queue[i], db.queue[j]] = [db.queue[j], db.queue[i]];
      audit('queue.reorder', `${db.queue[j].token} — ${reason}`);
    }),
    paused: false as boolean,
    setPaused: (p: boolean) => call({ method: 'POST', path: '/queue/pause', body: { paused: p } }, () => { api.queue.paused = p; audit(p ? 'queue.pause' : 'queue.resume', 'today'); }),
  },
  visitors: {
    list: () => call<Visitor[]>({ method: 'GET', path: '/visitors' }, () => db.visitors),
    get: (id: string) => call<Visitor | undefined>({ method: 'GET', path: `/visitors/${id}` }, () => { audit('read.visitor_record', id); return db.visitors.find((v) => v.id === id); }),
    recordDataRequest: (id: string, kind: string) => call({ method: 'POST', path: `/visitors/${id}/data-requests`, body: { kind } }, () => { audit('dp.request', `${id} — ${kind}`); }),
  },

  // ── Tasks & follow-ups (SCR-11, SCR-24, SCR-31) ──
  tasks: {
    list: () => call<Task[]>({ method: 'GET', path: '/tasks' }, () => db.tasks),
    create: (t: Pick<Task, 'title' | 'ownerPost' | 'due' | 'verificationRequired' | 'priority'> & Partial<Task>) =>
      call<Task>({ method: 'POST', path: '/tasks', body: t }, () => {
        if (!t.title?.trim()) fail(422, 'Title is required');
        const assigned = !!(t.ownerPost && t.due);
        const task: Task = {
          id: `T-${114 + db.tasks.length - 13}`, source: 'Manual', ward: undefined, evidence: 0, nudgesThisWeek: 0, nudgeCap: 3,
          createdBy: actor.name, createdAt: new Date().toISOString(), ...t,
          state: assigned ? 'assigned' : 'draft',
          history: [{ state: 'draft', at: new Date().toISOString(), by: actor.name }, ...(assigned ? [{ state: 'assigned' as TaskState, at: new Date().toISOString(), by: actor.name }] : [])],
        };
        db.tasks.unshift(task);
        audit('task.create', task.id);
        return task;
      }),
    transition: (id: string, to: TaskState, note?: string) => call<Task>({ method: 'POST', path: `/tasks/${id}/transition`, body: { to, note } }, () => {
      const t = db.tasks.find((x) => x.id === id); if (!t) fail(404, 'Not found');
      if (!TASK_TRANSITIONS[t.state].includes(to)) { audit('task.transition_rejected', `${id} ${t.state}→${to}`, 'error'); fail(409, `Invalid transition ${t.state} → ${to} (BR-011)`); }
      if (t.state === 'draft' && to === 'assigned' && (!t.ownerPost || !t.due)) fail(422, 'A task cannot leave Draft without owner and due date');
      if (to === 'verified' && !can('ROLE-01', 'ROLE-02')) fail(403, 'Only the assigner or delegate can verify');
      if (to === 'closed' && t.verificationRequired && t.state !== 'verified') fail(409, 'Verification required before closure');
      if (to === 'cancelled' && !note?.trim()) fail(422, 'Cancellation needs a reason');
      t.state = to;
      t.history.push({ state: to, at: new Date().toISOString(), by: actor.name, note });
      if (to === 'verified' || to === 'reopened') db.decide.filter((d) => d.refId === id).forEach((d) => (d.status = to === 'verified' ? 'approved' : 'rejected'));
      if (to === 'submitted') {
        db.decide.unshift({ id: uid('D'), type: 'verification', title: 'Task verification', subtitle: `${t.title} — evidence: ${t.evidence} item(s)`, createdAt: new Date().toISOString(), sources: [t.id], refId: t.id, status: 'pending' });
        notify({ tier: 'digest', title: 'Task submitted for verification', body: t.title, category: 'task', link: '/exec/decide' });
      }
      audit(`task.${to}`, `${id}${note ? ` — ${note}` : ''}`);
      return t;
    }),
    nudge: (id: string) => call({ method: 'POST', path: `/tasks/${id}/nudge` }, () => {
      const t = db.tasks.find((x) => x.id === id); if (!t) fail(404, 'Not found');
      if (t.nudgesThisWeek >= t.nudgeCap) fail(409, `Weekly nudge cap reached for ${t.ownerPost} (BR-013) — escalate instead`);
      t.nudgesThisWeek += 1;
      audit('task.nudge', `${id} (${t.nudgesThisWeek}/${t.nudgeCap})`);
    }),
    escalate: (id: string) => call({ method: 'POST', path: `/tasks/${id}/escalate` }, () => {
      const t = db.tasks.find((x) => x.id === id); if (!t) fail(404, 'Not found');
      t.escalated = true; audit('task.escalate', id);
    }),
    addEvidence: (id: string, count: number) => call({ method: 'POST', path: `/tasks/${id}/evidence`, body: { count } }, () => {
      const t = db.tasks.find((x) => x.id === id); if (!t) fail(404, 'Not found');
      t.evidence += count; audit('task.evidence_upload', `${id} +${count}`);
    }),
    requestExtension: (id: string, days: number, reason: string) => call({ method: 'POST', path: `/tasks/${id}/extension`, body: { days, reason } }, () => {
      const t = db.tasks.find((x) => x.id === id); if (!t) fail(404, 'Not found');
      db.decide.unshift({ id: uid('D'), type: 'extension', title: 'Extension request', subtitle: `${t.title} · +${days} d · ${reason}`, createdAt: new Date().toISOString(), sources: [id], refId: id, status: 'pending', body: String(days) });
      audit('task.extension_request', `${id} +${days}d`);
    }),
  },

  // ── Decide queue (SCR-03) ──
  decide: {
    list: () => call<DecideItem[]>({ method: 'GET', path: '/decide' }, () => db.decide.filter((d) => d.status === 'pending')),
    approve: async (item: DecideItem) => {
      if (item.type === 'appointment') {
        const slot = new Date(); slot.setDate(slot.getDate() + 2); slot.setHours(12, 0, 0, 0);
        return api.requests.approve(item.refId, slot.toISOString());
      }
      if (item.type === 'verification') return api.tasks.transition(item.refId, 'verified', 'Evidence reviewed');
      return call({ method: 'POST', path: `/decide/${item.id}/approve` }, () => {
        const d = db.decide.find((x) => x.id === item.id); if (!d) fail(404, 'Not found');
        d.status = 'approved';
        if (d.type === 'draft') { const dr = db.drafts.find((x) => x.id === d.refId); if (dr) dr.status = 'approved'; }
        if (d.type === 'minutes') { const m = db.meetings.find((x) => x.id === d.refId); if (m) m.minutesStatus = 'approved'; }
        if (d.type === 'extension') { const t = db.tasks.find((x) => x.id === d.refId); if (t) { const nd = new Date(t.due); nd.setDate(nd.getDate() + Number(d.body || 3)); t.due = nd.toISOString(); } }
        audit(`approval.${d.type}`, d.refId);
      });
    },
    reject: async (item: DecideItem, reason: string) => {
      if (item.type === 'appointment') return api.requests.decline(item.refId, reason);
      if (item.type === 'verification') return api.tasks.transition(item.refId, 'reopened', reason);
      return call({ method: 'POST', path: `/decide/${item.id}/reject`, body: { reason } }, () => {
        const d = db.decide.find((x) => x.id === item.id); if (!d) fail(404, 'Not found');
        d.status = 'rejected';
        if (d.type === 'draft') { const dr = db.drafts.find((x) => x.id === d.refId); if (dr) dr.status = 'rejected'; }
        audit(`rejection.${d.type}`, `${d.refId} — ${reason}`);
      });
    },
    edit: (id: string, body: string) => call({ method: 'PATCH', path: `/decide/${id}`, body: { body } }, () => {
      const d = db.decide.find((x) => x.id === id); if (!d) fail(404, 'Not found');
      d.body = body; d.aiDraft = false;
      const dr = db.drafts.find((x) => x.id === d.refId); if (dr) { dr.body = body; dr.aiGenerated = false; }
      audit('decide.edit', id);
    }),
  },

  // ── Drafts & outbox (SCR-25) ──
  drafts: {
    list: () => call<Draft[]>({ method: 'GET', path: '/drafts' }, () => db.drafts),
    save: (d: Partial<Draft> & { title: string; body: string }) => call<Draft>({ method: d.id ? 'PUT' : 'POST', path: d.id ? `/drafts/${d.id}` : '/drafts', body: d }, () => {
      if (d.id) {
        const ex = db.drafts.find((x) => x.id === d.id); if (!ex) fail(404, 'Not found');
        Object.assign(ex, d, { updatedAt: new Date().toISOString(), status: ex.status === 'approved' ? 'draft' : ex.status });
        audit('draft.update', ex.id); return ex;
      }
      const nd: Draft = { id: uid('DR'), recipient: '', channel: 'email', language: 'en', status: 'draft', aiGenerated: false, updatedAt: new Date().toISOString(), ...d };
      db.drafts.unshift(nd); audit('draft.create', nd.id); return nd;
    }),
    requestApproval: (id: string) => call({ method: 'POST', path: `/drafts/${id}/request-approval` }, () => {
      const d = db.drafts.find((x) => x.id === id); if (!d) fail(404, 'Not found');
      d.status = 'pending-approval';
      db.decide.unshift({ id: uid('D'), type: 'draft', title: 'Draft reply', subtitle: d.title, createdAt: new Date().toISOString(), sources: [d.id], refId: d.id, status: 'pending', aiDraft: d.aiGenerated, body: d.body });
      notify({ tier: 'normal', title: 'Item added to Decide', body: d.title, category: 'decide', link: '/exec/decide' });
      audit('draft.request_approval', id);
    }),
    send: (id: string) => call({ method: 'POST', path: `/drafts/${id}/send` }, () => {
      const d = db.drafts.find((x) => x.id === id); if (!d) fail(404, 'Not found');
      if (d.status !== 'approved') fail(409, 'Only approved drafts can be sent (AI-FR-004)');
      if (d.channel === 'sms' && !db.config.smsSenderApproved) { d.status = 'failed'; audit('send.blocked', `${id} — SMS sender ID not approved (DEC-010)`, 'error'); fail(409, 'Channel blocked: SMS sender ID not approved (DEC-010)'); }
      d.status = 'sent'; audit('send', `${id} via ${d.channel}`);
    }),
    remove: (id: string) => call({ method: 'DELETE', path: `/drafts/${id}` }, () => { db.drafts = db.drafts.filter((x) => x.id !== id); audit('draft.delete', id); }),
  },

  // ── Meetings (SCR-08, SCR-12) ──
  meetings: {
    list: () => call<Meeting[]>({ method: 'GET', path: '/meetings' }, () => db.meetings),
    get: (id: string) => call<Meeting | undefined>({ method: 'GET', path: `/meetings/${id}` }, () => db.meetings.find((m) => m.id === id)),
    saveNotes: (id: string, notes: string) => call({ method: 'PUT', path: `/meetings/${id}/notes`, body: { notes } }, () => {
      const m = db.meetings.find((x) => x.id === id); if (!m) fail(404, 'Not found');
      m.notes = notes; m.version += 1; if (m.minutesStatus === 'none') m.minutesStatus = 'draft';
    }),
    setActions: (id: string, actions: Meeting['actions'], decisions: string[]) => call({ method: 'PUT', path: `/meetings/${id}/actions`, body: { actions, decisions } }, () => {
      const m = db.meetings.find((x) => x.id === id); if (!m) fail(404, 'Not found');
      m.actions = actions; m.decisions = decisions; audit('meeting.actions_update', id);
    }),
    submitMinutes: (id: string) => call({ method: 'POST', path: `/meetings/${id}/submit-minutes` }, () => {
      const m = db.meetings.find((x) => x.id === id); if (!m) fail(404, 'Not found');
      m.minutesStatus = 'pending-approval';
      db.decide.unshift({ id: uid('D'), type: 'minutes', title: 'Minutes for approval', subtitle: `${m.title} · ${m.actions.length} actions, ${m.decisions.length} decisions`, createdAt: new Date().toISOString(), sources: [m.id], refId: m.id, status: 'pending' });
      audit('minutes.submit', id);
    }),
    approveMinutes: (id: string) => call({ method: 'POST', path: `/meetings/${id}/approve-minutes` }, () => {
      const m = db.meetings.find((x) => x.id === id); if (!m) fail(404, 'Not found');
      if (!can('ROLE-01')) fail(403, 'Only the chair can approve minutes');
      m.minutesStatus = 'approved';
      m.actions.filter((a) => !a.taskId).forEach((a) => {
        const t: Task = { id: `T-${114 + db.tasks.length - 13}`, title: a.text, source: 'Meeting', sourceRef: m.title, ownerPost: a.ownerPost, due: a.due, state: 'assigned', verificationRequired: true, evidence: 0, nudgesThisWeek: 0, nudgeCap: 3, priority: 'normal', createdBy: actor.name, createdAt: new Date().toISOString(), history: [{ state: 'assigned', at: new Date().toISOString(), by: actor.name }] };
        db.tasks.unshift(t); a.taskId = t.id;
      });
      db.decide.filter((d) => d.refId === id).forEach((d) => (d.status = 'approved'));
      audit('minutes.approve', id);
    }),
  },

  // ── Notifications & Peace Mode (SCR-15, SCR-57, SCR-62) ──
  notifications: {
    list: () => call<AppNotification[]>({ method: 'GET', path: '/notifications' }, () => db.notifications),
    markRead: (id: string) => call({ method: 'POST', path: `/notifications/${id}/read` }, () => { const n = db.notifications.find((x) => x.id === id); if (n) n.read = true; }),
    markAllRead: () => call({ method: 'POST', path: '/notifications/read-all' }, () => { db.notifications.forEach((n) => (n.read = true)); }),
    releaseHeld: () => call({ method: 'POST', path: '/notifications/release-held' }, () => { db.notifications.forEach((n) => (n.held = false)); }),
  },
  peace: {
    get: () => call<PeaceSettings>({ method: 'GET', path: '/me/peace-mode' }, () => db.peace),
    save: (p: PeaceSettings) => call({ method: 'PUT', path: '/me/peace-mode', body: p }, () => {
      if (!can('ROLE-01')) fail(403, 'Only the executive can change Peace Mode');
      db.peace = { ...p, categories: p.categories.map((c) => (c.fixed ? { ...c, tier: 'interrupt' } : c)) }; audit('peace.update', 'settings');
    }),
  },
  absence: {
    get: () => call<AbsenceState>({ method: 'GET', path: '/absence' }, () => ({ ...db.absence, heldItems: db.absence.active ? db.decide.filter((d) => d.status === 'pending').length + db.requests.filter((r) => r.status === 'requested').length : 0 })),
    set: (a: AbsenceState) => call({ method: 'PUT', path: '/absence', body: a }, () => { db.absence = a; audit(a.active ? 'absence.start' : 'absence.end', `${a.from ?? ''}–${a.to ?? ''}`); }),
  },

  // ── Records (SCR-13, SCR-56, SCR-05) ──
  decisions: {
    list: () => call<DecisionEntry[]>({ method: 'GET', path: '/decisions' }, () => db.decisions),
    create: (d: Omit<DecisionEntry, 'id' | 'recordedBy' | 'status'>) => call({ method: 'POST', path: '/decisions', body: d }, () => {
      const e: DecisionEntry = { ...d, id: `DL-0${33 + db.decisions.length - 4}`, recordedBy: actor.name, status: can('ROLE-01') ? 'confirmed' : 'draft' };
      db.decisions.unshift(e); audit('decision.record', e.id); return e;
    }),
    confirm: (id: string) => call({ method: 'POST', path: `/decisions/${id}/confirm` }, () => {
      const d = db.decisions.find((x) => x.id === id); if (!d) fail(404, 'Not found');
      if (!can('ROLE-01')) fail(403, 'Only the executive can confirm a decision record');
      d.status = 'confirmed'; audit('decision.confirm', id);
    }),
  },
  documents: {
    list: () => call({ method: 'GET', path: '/documents' }, () => db.documents),
    open: (id: string) => call({ method: 'GET', path: `/documents/${id}` }, () => {
      const d = db.documents.find((x) => x.id === id); if (!d) fail(404, 'Not found');
      if (d.dataClass === 'RES' && !can('ROLE-01')) { audit('read.denied', `${id} (RES)`, 'denied'); fail(403, 'Class not authorized for your role'); }
      audit(`read.document`, `${id} (${d.dataClass})`); return d;
    }),
    upload: (title: string, dataClass: 'PUB' | 'INT' | 'OFF' | 'RES', tags: string[]) => call({ method: 'POST', path: '/documents', body: { title, dataClass, tags } }, () => {
      const d = { id: uid('DOC'), title, dataClass, kind: 'PDF' as const, updatedAt: new Date().toISOString(), sizeKb: 200 + Math.round(Math.random() * 800), tags, owner: actor.name };
      db.documents.unshift(d); audit('document.upload', d.id); return d;
    }),
  },
  contacts: { list: () => call({ method: 'GET', path: '/directory' }, () => db.contacts) },

  // ── Governance (SCR-14, 17–19, 26, 31–41, 54–55) ──
  governance: {
    wards: () => call({ method: 'GET', path: '/gov/wards' }, () => db.wards),
    statutory: () => call<StatutoryItem[]>({ method: 'GET', path: '/gov/statutory' }, () => db.statutory),
    addStatutory: (s: Omit<StatutoryItem, 'id' | 'status' | 'ruleStatus'>) => call({ method: 'POST', path: '/gov/statutory', body: s }, () => {
      db.statutory.unshift({ ...s, id: uid('ST'), status: 'open', ruleStatus: 'unverified', manualDate: !!s.due }); audit('statutory.add', s.title);
    }),
    legal: () => call({ method: 'GET', path: '/gov/legal' }, () => ({ cases: db.legal, paras: db.auditParas })),
    csr: () => call<CsrProject[]>({ method: 'GET', path: '/gov/csr' }, () => db.csr),
    moveCsr: (id: string, stage: CsrStage, approvalRef?: string) => call({ method: 'POST', path: `/gov/csr/${id}/stage`, body: { stage, approvalRef } }, () => {
      const p = db.csr.find((x) => x.id === id); if (!p) fail(404, 'Not found');
      if (stage === 'Execution' && !p.approvalRef && !approvalRef) fail(422, 'Cannot move to Execution without a Screening Committee / MC approval reference');
      if (approvalRef) p.approvalRef = approvalRef;
      p.stage = stage; p.updatedAt = new Date().toISOString(); audit('csr.stage', `${id} → ${stage}`);
    }),
    emergency: () => call<Emergency>({ method: 'GET', path: '/gov/emergency' }, () => db.emergency),
    declareEmergency: (title: string, kind: string, summary: string) => call({ method: 'POST', path: '/gov/emergency', body: { title, kind, summary } }, () => {
      db.emergency = { ...db.emergency, active: true, id: uid('EM'), title, kind, summary, declaredAt: new Date().toISOString(), declaredBy: actor.name, callLog: [], contactTree: db.emergency.contactTree.map((c) => ({ ...c, acknowledged: false })) };
      notify({ tier: 'interrupt', title: `Emergency declared: ${title}`, category: 'emergency', link: '/gov/emergency' });
      audit('emergency.declare', title);
    }),
    logCall: (who: string, outcome: string) => call({ method: 'POST', path: '/gov/emergency/calls', body: { who, outcome } }, () => {
      db.emergency.callLog.unshift({ at: new Date().toISOString(), who, outcome });
      const c = db.emergency.contactTree.find((x) => x.post === who); if (c && outcome === 'Acknowledged') c.acknowledged = true;
      audit('emergency.call_log', `${who}: ${outcome}`);
    }),
    closeEmergency: (closingNote: string) => call({ method: 'POST', path: '/gov/emergency/close', body: { closingNote } }, () => {
      audit('emergency.close', closingNote); db.emergency = { ...db.emergency, active: false };
    }),
    dak: () => call<DakItem[]>({ method: 'GET', path: '/gov/dak' }, () => db.dak),
    routeDak: (id: string, route: string, createTask: boolean) => call({ method: 'POST', path: `/gov/dak/${id}/route`, body: { route, createTask } }, () => {
      const d = db.dak.find((x) => x.id === id); if (!d) fail(404, 'Not found');
      d.status = 'routed'; d.suggestedRoute = route; audit('dak.route', `${id} → ${route}`);
      if (createTask) db.tasks.unshift({ id: `T-${114 + db.tasks.length - 13}`, title: d.subject, source: 'Document', sourceRef: id, ownerPost: route, due: new Date(Date.now() + 7 * 86400000).toISOString(), state: 'assigned', verificationRequired: false, evidence: 0, nudgesThisWeek: 0, nudgeCap: 3, priority: 'normal', createdBy: actor.name, createdAt: new Date().toISOString(), history: [{ state: 'assigned', at: new Date().toISOString(), by: actor.name }] });
    }),
    inspections: () => call<Inspection[]>({ method: 'GET', path: '/gov/inspections' }, () => db.inspections),
    captureInspection: (i: Omit<Inspection, 'id' | 'at' | 'status'>) => call({ method: 'POST', path: '/gov/inspections', body: i }, () => {
      db.inspections.unshift({ ...i, id: uid('IN'), at: new Date().toISOString(), status: 'captured' }); audit('inspection.capture', i.location);
    }),
    confirmInspection: (id: string) => call({ method: 'POST', path: `/gov/inspections/${id}/confirm` }, () => {
      const i = db.inspections.find((x) => x.id === id); if (!i) fail(404, 'Not found');
      i.status = 'confirmed';
      i.draftTasks.forEach((dt) => db.tasks.unshift({ id: `T-${114 + db.tasks.length - 13}`, title: dt, source: 'Inspection', sourceRef: id, ownerPost: 'Ward officer (assign)', due: new Date(Date.now() + 5 * 86400000).toISOString(), state: 'draft', verificationRequired: true, evidence: i.photos, nudgesThisWeek: 0, nudgeCap: 3, priority: 'normal', createdBy: actor.name, createdAt: new Date().toISOString(), history: [{ state: 'draft', at: new Date().toISOString(), by: actor.name }] }));
      audit('inspection.confirm_tasks', id);
    }),
    submitWardForm: (ward: string, values: Record<string, number>) => call({ method: 'POST', path: `/gov/wards/${ward}/weekly-form`, body: values }, () => {
      const w = db.wards.find((x) => x.id === ward); if (w) w.formStatus = 'submitted'; audit('ward_form.submit', ward);
    }),
  },

  // ── Platform (SCR-42–45, 60) ──
  admin: {
    users: () => call<User[]>({ method: 'GET', path: '/admin/users' }, () => db.users),
    accessRequests: () => call({ method: 'GET', path: '/admin/access-requests' }, () => db.accessRequests),
    decideAccess: (id: string, approve: boolean) => call({ method: 'POST', path: `/admin/access-requests/${id}/${approve ? 'approve' : 'reject'}` }, () => {
      if (!can('ROLE-08')) fail(403, 'Only the System Administrator approves role grants');
      const r = db.accessRequests.find((x) => x.id === id); if (!r) fail(404, 'Not found');
      r.status = approve ? 'approved' : 'rejected';
      if (approve) db.users.push({ id: uid('U'), name: r.userName, post: r.scope, role: r.requestedRole, scope: r.scope, mfa: 'otp-app', devices: 0, lastSignIn: new Date().toISOString(), status: 'pending' });
      audit(approve ? 'role.grant_approve' : 'role.grant_reject', `${r.userName} → ${r.requestedRole}`);
    }),
    setUserStatus: (id: string, status: User['status']) => call({ method: 'PATCH', path: `/admin/users/${id}`, body: { status } }, () => {
      const u = db.users.find((x) => x.id === id); if (!u) fail(404, 'Not found');
      u.status = status; audit(`user.${status}`, u.name);
    }),
    breakGlass: (reason: string, minutes: number) => call({ method: 'POST', path: '/admin/break-glass', body: { reason, minutes } }, () => {
      audit('break_glass.request', `${minutes} min — ${reason}`);
    }),
    config: () => call<ConfigState>({ method: 'GET', path: '/admin/config' }, () => db.config),
    saveConfig: (c: ConfigState) => call({ method: 'PUT', path: '/admin/config', body: c }, () => { db.config = c; audit('config.update', 'configuration'); }),
    audit: () => call<AuditEvent[]>({ method: 'GET', path: '/audit/events' }, () => db.audit),
    verifyChain: () => call<{ ok: boolean; checked: number }>({ method: 'POST', path: '/audit/verify' }, () => {
      const chron = [...db.audit].reverse();
      let ok = true;
      for (let i = 1; i < chron.length; i++) if (chron[i].prevHash !== chron[i - 1].hash) ok = false;
      return { ok, checked: chron.length };
    }),
    aiLog: () => call<AIInteraction[]>({ method: 'GET', path: '/audit/ai-interactions' }, () => db.aiLog),
    health: () => call({ method: 'GET', path: '/ops/health' }, () => ({ services: db.services, jobs: db.jobs, alerts: db.securityAlerts, lastBackup: db.jobs.find((j) => j.name === 'Nightly backup')!.lastRun, lastRestoreTest: new Date(Date.now() - 23 * 86400000).toISOString() })),
    ackAlert: (id: string) => call({ method: 'POST', path: `/ops/alerts/${id}/ack` }, () => { const a = db.securityAlerts.find((x) => x.id === id); if (a) a.acknowledged = true; audit('alert.ack', id); }),
    exportJob: (scope: string, format: string) => call<{ jobId: string; checksum: string; files: number }>({ method: 'POST', path: '/admin/exports', body: { scope, format } }, () => {
      audit('export.start', `${scope} as ${format}`);
      return { jobId: uid('EXP'), checksum: `sha256:${fakeHash(scope + format + Date.now())}${fakeHash(format)}`, files: 12 + Math.round(Math.random() * 20) };
    }),
  },

  /** Records an AI call in the AI interaction log (SCR-44). */
  logAi: (entry: Omit<AIInteraction, 'id' | 'at' | 'actor'>) => {
    db.aiLog.unshift({ ...entry, id: `AI-${String(db.aiLog.length + 1).padStart(4, '0')}`, at: new Date().toISOString(), actor: actor.name.replace(' (synthetic)', '') });
    audit('ai.call', entry.feature);
    if (USE_MOCK) persistDb();
    bus.emit();
  },

  // ── Private Wealth & Life OS (separate service, separate keys — never mixed with official data) ──
  private: {
    dashboard: () => call({ method: 'GET', path: '/private/dashboard' }, () => ({ dues: db.privateDues, holdings: db.holdings, liabilities: db.liabilities })),
    holdings: () => call<Holding[]>({ method: 'GET', path: '/private/holdings' }, () => db.holdings),
    addHolding: (h: Omit<Holding, 'id'>) => call({ method: 'POST', path: '/private/holdings', body: h }, () => { db.holdings.push({ ...h, id: uid('H') }); }),
    liabilities: () => call({ method: 'GET', path: '/private/liabilities' }, () => ({ loans: db.liabilities, policies: db.policies })),
    vault: () => call({ method: 'GET', path: '/private/vault' }, () => db.vault),
    addVaultFile: (folderId: string, name: string, sizeKb: number) => call({ method: 'POST', path: `/private/vault/${folderId}/files`, body: { name, sizeKb } }, () => {
      const f = db.vault.find((x) => x.id === folderId); if (f) f.files.push({ name, sizeKb, addedAt: new Date().toISOString() });
    }),
    family: () => call<FamilyEvent[]>({ method: 'GET', path: '/private/family-events' }, () => db.familyEvents),
    addFamilyEvent: (e: Omit<FamilyEvent, 'id'>) => call({ method: 'POST', path: '/private/family-events', body: e }, () => {
      db.familyEvents.push({ ...e, id: uid('FE') });
      // One-way opaque busy-block projection (the ONLY thing that crosses into the official calendar)
      if (e.blockWork) db.calendar.push({ id: uid('EV'), title: 'Busy', type: 'busy', start: e.start, end: e.end });
    }),
    toggleBlock: (id: string) => call({ method: 'POST', path: `/private/family-events/${id}/toggle-block` }, () => {
      const e = db.familyEvents.find((x) => x.id === id); if (!e) return;
      e.blockWork = !e.blockWork;
      if (e.blockWork) db.calendar.push({ id: `EV-P-${id}`, title: 'Busy', type: 'busy', start: e.start, end: e.end });
      else db.calendar = db.calendar.filter((c) => c.id !== `EV-P-${id}` && !(c.type === 'busy' && c.start === e.start && c.end === e.end));
    }),
    expenses: () => call<Expense[]>({ method: 'GET', path: '/private/expenses' }, () => db.expenses),
    addExpense: (e: Omit<Expense, 'id'>) => call({ method: 'POST', path: '/private/expenses', body: e }, () => { db.expenses.unshift({ ...e, id: uid('EX') }); }),
    compliance: () => call({ method: 'GET', path: '/private/compliance' }, () => db.compliance),
  },
};

export type Api = typeof api;
