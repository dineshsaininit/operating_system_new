/** Auth, dashboards, calendar, appointment requests, public endpoints, queue & visitors (stages 1–3). */
import { Router, type Request } from 'express';
import type { CalendarEvent, QueueEntry, RoleId } from '../../../frontend/src/types/index.js';
import { audit } from '../audit.js';
import { COOKIE, R, actorOf, allow, createSession, destroySession, roleOf, tokenOf } from '../auth.js';
import { config } from '../config.js';
import { addDecide, find, notify, recordApproval, resolveDecide } from '../domain.js';
import { fail, requireFields } from '../errors.js';
import { db } from '../store.js';
import { nextSeq, now, uid } from '../util.js';

export const front = Router();
const q = () => db();

// ───────────── Auth & account (SCR-01, SCR-59) ─────────────
front.post('/auth/sign-in', (req, res) => {
  requireFields(req.body, 'role');
  const role = req.body.role as RoleId;
  const deviceName = String(req.body.deviceName || 'Unnamed device').slice(0, 80);
  const s = createSession(role, deviceName);
  // Private-environment sign-ins are not written to the official ledger (separate environment, ARC-04).
  if (role !== 'ROLE-11') audit({ name: s.user.name, role }, 'auth.sign_in', deviceName);
  res.cookie(COOKIE, s.token, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, maxAge: config.sessionTtlHours * 3600_000, path: '/' });
  const { lastSeenAt: _l, expiresAt: _e, ...session } = s;
  res.json(session);
});

front.post('/auth/sign-out', (req, res) => {
  if (req.session) audit(actorOf(req), 'auth.sign_out', 'session');
  destroySession(tokenOf(req));
  res.clearCookie(COOKIE, { path: '/' });
  res.status(204).end();
});

front.get('/me/devices', allow(...R.OFFICIAL), (_req, res) => { res.json(q().devices); });
front.delete('/me/devices/:id', allow(...R.OFFICIAL), (req, res) => {
  find(q().devices, req.params.id, 'Device');
  q().devices = q().devices.filter((d) => d.id !== req.params.id);
  audit(actorOf(req), 'device.revoke', String(req.params.id));
  res.status(204).end();
});

// ───────────── Dashboards (SCR-02, SCR-20) ─────────────
const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };

front.get('/exec/today', allow(...R.EXEC_PA), (_req, res) => {
  const today = new Date().toDateString();
  res.json({
    commitments: q().calendar.filter((e) => e.status !== 'cancelled' && new Date(e.start).toDateString() === today && ['meeting', 'appointment', 'focus', 'site-visit', 'internal'].includes(e.type)),
    dueToday: q().tasks.filter((t) => !['closed', 'verified', 'cancelled'].includes(t.state) && new Date(t.due) <= endOfToday()),
    decideCount: q().decide.filter((d) => d.status === 'pending').length,
    alert: { title: 'Heavy rain advisory after 15:00', source: 'public IMD feed', sourceTime: '07:40' },
    queueWaiting: q().queue.filter((x) => x.status === 'waiting').length,
    execStatus: q().execStatus,
  });
});

front.get('/pa/console', allow(...R.EXEC_PA), (_req, res) => {
  res.json({
    queue: q().queue.filter((x) => ['waiting', 'called', 'in-meeting'].includes(x.status)),
    inboxCount: q().requests.filter((r) => r.status === 'requested').length,
    decideCount: q().decide.filter((d) => d.status === 'pending').length,
    followUpsDue: q().tasks.filter((t) => !['closed', 'verified', 'cancelled', 'draft'].includes(t.state) && new Date(t.due).getTime() <= Date.now() + 86400000),
    execStatus: q().execStatus,
    whisperLast: q().whisperLast,
  });
});

const TONES = ['busy', 'available', 'away', 'travel'];
front.put('/exec/status', allow(...R.EXEC_PA), (req, res) => {
  requireFields(req.body, 'text', 'tone');
  if (!TONES.includes(req.body.tone)) fail(422, 'Invalid tone', { tone: `One of ${TONES.join(', ')}` });
  q().execStatus = { text: String(req.body.text).slice(0, 120), tone: req.body.tone };
  audit(actorOf(req), 'exec.status', q().execStatus.text);
  res.status(204).end();
});

front.post('/pa/whisper', allow(...R.PA), (req, res) => {
  requireFields(req.body, 'type');
  // Generic lock-screen text: the note body is visible only inside the app.
  notify({ tier: 'interrupt', title: `PA whisper: ${req.body.type}`, body: req.body.note || undefined, category: 'whisper', link: '/exec/today', audience: ['ROLE-01'] });
  audit(actorOf(req), 'whisper.send', String(req.body.type));
  res.status(204).end();
});

const WHISPER_REPLIES = ['5 minutes', 'Send in', 'Call later', 'Ask to wait'];
front.post('/exec/whisper-reply', allow(...R.EXEC), (req, res) => {
  requireFields(req.body, 'text');
  if (!WHISPER_REPLIES.includes(req.body.text)) fail(422, 'Reply must be one of the preset replies', { text: WHISPER_REPLIES.join(' | ') });
  q().whisperLast = { text: req.body.text, at: now() };
  notify({ tier: 'normal', title: `Executive replied: ${req.body.text}`, category: 'whisper', link: '/pa', audience: ['ROLE-02'] });
  audit(actorOf(req), 'whisper.reply', req.body.text);
  res.status(204).end();
});

// ───────────── Calendar (SCR-06, SCR-21) ─────────────
const CLASH_TYPES = ['focus', 'meeting', 'appointment', 'busy', 'site-visit'];
const EVENT_TYPES = ['meeting', 'appointment', 'focus', 'busy', 'buffer', 'internal', 'walkin-window', 'site-visit'];

function findClash(start: string, end: string, ignoreId?: string) {
  return q().calendar.find((x) => x.id !== ignoreId && x.status !== 'cancelled' && CLASH_TYPES.includes(x.type) && new Date(start) < new Date(x.end) && new Date(end) > new Date(x.start));
}
function validRange(start: unknown, end: unknown) {
  const s = new Date(String(start)), e = new Date(String(end));
  if (isNaN(+s) || isNaN(+e)) fail(422, 'start and end must be ISO-8601 timestamps', { start: 'ISO-8601', end: 'ISO-8601' });
  if (e <= s) fail(422, 'End must be after start', { end: 'Must be after start' });
}

front.get('/calendar', allow(...R.EXEC_PA), (_req, res) => {
  // Private items exist here only as opaque Busy blocks projected by the private service.
  res.json(q().calendar.filter((e) => e.status !== 'cancelled').map((e) => (e.type === 'busy' ? { id: e.id, title: 'Busy', type: 'busy', start: e.start, end: e.end } : e)));
});

front.post('/calendar', allow(...R.EXEC_PA), (req, res) => {
  requireFields(req.body, 'title', 'type', 'start', 'end');
  const { overrideReason, id: _ignored, ...e } = req.body as CalendarEvent & { overrideReason?: string };
  if (!EVENT_TYPES.includes(e.type)) fail(422, 'Invalid event type', { type: EVENT_TYPES.join(', ') });
  validRange(e.start, e.end);
  const clash = findClash(e.start, e.end);
  if (clash && !overrideReason?.trim()) fail(409, `Conflicts with "${clash.type === 'busy' ? 'Busy' : clash.title}" — override needs a reason`);
  const ev: CalendarEvent = { ...e, id: uid('EV'), ...(roleOf(req) === 'ROLE-02' && e.status === 'proposed' ? { proposedBy: 'PA' as const } : {}) };
  q().calendar.push(ev);
  audit(actorOf(req), overrideReason ? 'calendar.override' : 'calendar.create', `${ev.title}${overrideReason ? ` — ${overrideReason}` : ''}`);
  res.status(201).json(ev);
});

front.patch('/calendar/:id', allow(...R.EXEC_PA), (req, res) => {
  const e = find(q().calendar, req.params.id, 'Event');
  if (e.type === 'busy') fail(409, 'Busy blocks are managed by their owner and cannot be moved here');
  requireFields(req.body, 'start', 'end');
  validRange(req.body.start, req.body.end);
  e.start = req.body.start; e.end = req.body.end;
  audit(actorOf(req), 'calendar.move', e.id);
  res.status(204).end();
});

front.post('/calendar/:id/accept', allow(...R.EXEC), (req, res) => {
  const e = find(q().calendar, req.params.id, 'Event');
  if (e.status !== 'proposed') fail(409, 'Only a proposed event can be accepted');
  e.status = 'confirmed';
  audit(actorOf(req), 'calendar.accept_proposal', e.id);
  res.status(204).end();
});

front.post('/calendar/:id/cancel', allow(...R.EXEC_PA), (req, res) => {
  const e = find(q().calendar, req.params.id, 'Event');
  requireFields(req.body, 'reason');
  if (e.type === 'busy') fail(409, 'Busy blocks are managed by their owner');
  e.status = 'cancelled';
  audit(actorOf(req), 'calendar.cancel', `${e.id} — ${req.body.reason}`);
  res.status(204).end();
});

// ───────────── Appointment requests (SCR-07, SCR-22, SCR-29, SCR-30) ─────────────
front.get('/appointment-requests', allow(...R.EXEC_PA), (_req, res) => { res.json(q().requests); });
front.get('/appointment-requests/:id', allow(...R.EXEC_PA), (req, res) => { res.json(find(q().requests, req.params.id, 'Request')); });

function openRequest(id: string | string[]) {
  const r = find(q().requests, id, 'Request');
  if (!['requested', 'escalated', 'held'].includes(r.status)) fail(409, `Request is already ${r.status}`);
  return r;
}

front.post('/appointment-requests/:id/approve', allow(...R.EXEC_PA), (req, res) => {
  const r = openRequest(req.params.id);
  requireFields(req.body, 'slot');
  const start = new Date(req.body.slot);
  if (isNaN(+start)) fail(422, 'slot must be an ISO-8601 timestamp', { slot: 'ISO-8601' });
  if (r.reserved && roleOf(req) !== 'ROLE-01') {
    audit(actorOf(req), 'appointment.approve', `${r.id} (reserved)`, 'denied');
    fail(403, 'Reserved category — only the executive can approve. Escalate it to Decide.');
  }
  recordApproval(req, 'appointment', r.id, 'approved', { roles: R.EXEC_PA });
  r.status = 'approved'; r.slot = start.toISOString();
  const end = new Date(start.getTime() + 15 * 60000);
  q().calendar.push({ id: uid('EV'), title: `Visitor: ${r.visitorName}`, type: 'appointment', start: start.toISOString(), end: end.toISOString(), location: 'DMC office', status: 'confirmed' });
  resolveDecide(r.id, 'approved');
  audit(actorOf(req), 'appointment.approve', r.id);
  // Confirmation SMS is queued; actual delivery waits for the DEC-010 sender ID.
  audit({ name: 'SYSTEM', role: 'SYSTEM' }, 'sms.send', `${r.id} confirmation${q().config.smsSenderApproved ? '' : ' (simulated — DEC-010 sender ID pending)'}`);
  res.status(204).end();
});

front.post('/appointment-requests/:id/decline', allow(...R.EXEC_PA), (req, res) => {
  const r = openRequest(req.params.id);
  requireFields(req.body, 'reason');
  if (r.reserved && roleOf(req) !== 'ROLE-01') fail(403, 'Reserved category — only the executive can decide. Escalate it to Decide.');
  recordApproval(req, 'appointment', r.id, 'rejected', { roles: R.EXEC_PA, reason: req.body.reason });
  r.status = 'declined'; r.reason = req.body.reason;
  resolveDecide(r.id, 'rejected');
  audit(actorOf(req), 'appointment.decline', `${r.id} — ${req.body.reason}`);
  res.status(204).end();
});

front.post('/appointment-requests/:id/redirect', allow(...R.EXEC_PA), (req, res) => {
  const r = openRequest(req.params.id);
  requireFields(req.body, 'target', 'reason');
  r.status = 'redirected'; r.redirectTarget = req.body.target; r.reason = req.body.reason;
  resolveDecide(r.id, 'rejected');
  audit(actorOf(req), 'appointment.redirect', `${r.id} → ${req.body.target}`);
  res.status(204).end();
});

front.post('/appointment-requests/:id/escalate', allow(...R.EXEC_PA), (req, res) => {
  const r = openRequest(req.params.id);
  r.status = 'escalated';
  if (!q().decide.some((d) => d.refId === r.id && d.status === 'pending')) {
    addDecide({ type: 'appointment', title: 'Appointment request (escalated by PA)', subtitle: `${r.visitorName} · ${r.category} · Ward ${r.ward}`, sources: [r.id], refId: r.id });
  }
  notify({ tier: 'normal', title: 'Item added to Decide', body: r.visitorName, category: 'decide', link: '/exec/decide', audience: ['ROLE-01'] });
  audit(actorOf(req), 'appointment.escalate', r.id);
  res.status(204).end();
});

// ───────────── Public (no sign-in) ─────────────
/** Tiny fixed-window rate limiter for the unauthenticated endpoints. */
const hits = new Map<string, { n: number; reset: number }>();
function rateLimit(req: Request, max: number, windowMs = 60_000) {
  const key = `${req.ip}:${req.path.split('/')[2]}`;
  const t = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < t) { hits.set(key, { n: 1, reset: t + windowMs }); return; }
  if (++h.n > max) fail(429, 'Too many requests — please try again in a minute');
}

front.post('/public/appointment-requests', (req, res) => {
  rateLimit(req, 10);
  requireFields(req.body, 'name', 'mobile', 'category', 'ward', 'purpose');
  const p = req.body as { name: string; mobile: string; category: string; ward: string; purpose: string; lang?: string };
  const digits = String(p.mobile).replace(/\D/g, '');
  if (digits.length !== 10) fail(422, 'Enter a 10-digit mobile number', { mobile: '10 digits' });
  const cat = q().config.categories.find((c) => c.name === p.category);
  if (!cat) fail(422, 'Unknown category', { category: 'Pick a listed category' });
  const ref = nextSeq(q().requests.map((r) => r.id), 'AR', 1043);
  const reserved = cat.reserved;
  const name = String(p.name).slice(0, 80);
  q().requests.unshift({
    id: ref, receivedAt: now(), channel: 'web', visitorName: `${name}${name.includes('synthetic') ? '' : ' (synthetic)'}`,
    mobile: digits.replace(/^(\d{2})\d{6}/, '$1XXXXXX'), category: p.category, ward: p.ward, purpose: String(p.purpose).slice(0, 500),
    reserved, priorVisits: 0, status: q().absence.active && !q().absence.delegationRecord ? 'held' : 'requested',
  });
  if (reserved) addDecide({ type: 'appointment', title: 'Appointment request', subtitle: `${name} · Ward ${p.ward} · reserved category`, sources: [ref], refId: ref });
  notify({ tier: reserved ? 'normal' : 'digest', title: `New appointment request ${ref}`, category: 'request', link: '/pa/inbox' });
  audit({ name: 'Public visitor', role: 'ROLE-12' }, 'public.request_submit', ref);
  res.status(201).json({ ref });
});

front.get('/public/status/:ref', (req, res) => {
  rateLimit(req, 30);
  const ref = req.params.ref.trim().toLowerCase();
  const qe = q().queue.find((x) => x.token.toLowerCase() === ref);
  if (qe) {
    const ahead = q().queue.filter((x) => x.status === 'waiting' && new Date(x.arrivedAt) < new Date(qe.arrivedAt)).length;
    res.json({ kind: 'token', ref: qe.token, status: qe.status, position: ahead + 1, wait: qe.waitMin });
    return;
  }
  const r = q().requests.find((x) => x.id.toLowerCase() === ref);
  // Own record only: just the status fields — never name, mobile or purpose.
  res.json(r ? { kind: 'request', ref: r.id, status: r.status, slot: r.slot, redirectTarget: r.redirectTarget } : null);
});

// ───────────── Queue & visitors (SCR-09, SCR-23, SCR-27, SCR-28, SCR-58) ─────────────
const QUEUE_ROLES: RoleId[] = ['ROLE-01', 'ROLE-02', 'ROLE-04'];
const QUEUE_STATUSES: QueueEntry['status'][] = ['waiting', 'called', 'in-meeting', 'done', 'redirected', 'left'];

front.get('/queue/today', allow(...QUEUE_ROLES), (_req, res) => {
  // Reception sees today only, no history.
  const today = new Date().toDateString();
  res.json(q().queue.filter((x) => new Date(x.arrivedAt).toDateString() === today));
});

front.post('/queue', allow('ROLE-02', 'ROLE-04'), (req, res) => {
  const v = req.body ?? {};
  if (!v.noticeRead) fail(422, 'Privacy notice must be read to the visitor first', { noticeRead: 'Required' });
  requireFields(v, 'name', 'category', 'ward');
  const prefix = v.offline ? 'L' : 'W';
  const today = new Date().toDateString();
  const todays = q().queue.filter((x) => new Date(x.arrivedAt).toDateString() === today);
  const token = nextSeq(todays.map((x) => x.token), prefix, prefix === 'W' ? 11 : 1, 2);
  const waiting = todays.filter((x) => x.status === 'waiting').length;
  const desk = q().config.categories.find((c) => c.name === v.category)?.rightDesk;
  const name = String(v.name).slice(0, 80);
  const entry: QueueEntry = {
    id: uid('Q'), token, visitorName: `${name}${name.includes('synthetic') ? '' : ' (synthetic)'}`, type: 'walk-in', category: v.category, ward: v.ward,
    arrivedAt: now(), status: 'waiting', waitMin: [waiting * 8 + 10, waiting * 10 + 25], purpose: v.purpose,
    routeSuggestion: desk && desk !== 'PA triage' ? `${v.ward !== '—' ? `Ward ${v.ward} ` : ''}${desk}` : undefined,
    repeatMatch: q().visitors.some((x) => x.name.split(' ')[0] === name.split(' ')[0]),
  };
  q().queue.push(entry);
  audit(actorOf(req), v.kiosk ? 'kiosk.check_in' : 'visitor.register', entry.token);
  res.status(201).json(entry);
});

front.post('/queue/call-next', allow(...QUEUE_ROLES), (req, res) => {
  if (q().queuePaused) fail(409, 'Queue is paused');
  q().queue.filter((x) => x.status === 'called' || x.status === 'in-meeting').forEach((x) => (x.status = 'done'));
  const next = q().queue.find((x) => x.status === 'waiting');
  if (!next) { res.json(null); return; }
  next.status = 'called';
  q().queue.filter((x) => x.status === 'waiting').forEach((x) => { x.waitMin = [Math.max(0, x.waitMin[0] - 10), Math.max(5, x.waitMin[1] - 10)]; });
  audit(actorOf(req), 'queue.call_next', next.token);
  res.json(next);
});

front.post('/queue/pause', allow('ROLE-01', 'ROLE-02'), (req, res) => {
  q().queuePaused = !!req.body?.paused;
  audit(actorOf(req), q().queuePaused ? 'queue.pause' : 'queue.resume', 'today');
  res.status(204).end();
});

front.patch('/queue/:id', allow(...QUEUE_ROLES), (req, res) => {
  const e = find(q().queue, req.params.id, 'Queue entry');
  if (!QUEUE_STATUSES.includes(req.body?.status)) fail(422, 'Invalid status', { status: QUEUE_STATUSES.join(', ') });
  e.status = req.body.status;
  audit(actorOf(req), `queue.${e.status}`, e.token);
  res.status(204).end();
});

front.post('/queue/:id/route', allow(...QUEUE_ROLES), (req, res) => {
  const e = find(q().queue, req.params.id, 'Queue entry');
  requireFields(req.body, 'target');
  e.status = 'redirected'; e.routeSuggestion = req.body.target;
  audit(actorOf(req), 'queue.route', `${e.token} → ${req.body.target}`);
  res.status(204).end();
});

front.post('/queue/:id/reorder', allow('ROLE-01', 'ROLE-02'), (req, res) => {
  if (!String(req.body?.reason ?? '').trim()) fail(422, 'Reorder needs a reason', { reason: 'Required' });
  const dir = Number(req.body.dir);
  if (dir !== -1 && dir !== 1) fail(422, 'dir must be -1 or 1', { dir: '-1 | 1' });
  const list = q().queue;
  const i = list.findIndex((x) => x.id === req.params.id);
  if (i < 0) fail(404, 'Queue entry not found');
  const j = i + dir;
  if (j >= 0 && j < list.length) {
    [list[i], list[j]] = [list[j], list[i]];
    audit(actorOf(req), 'queue.reorder', `${list[j].token} — ${req.body.reason}`);
  }
  res.status(204).end();
});

front.get('/visitors', allow('ROLE-01', 'ROLE-02', 'ROLE-04'), (_req, res) => { res.json(q().visitors); });
front.get('/visitors/:id', allow('ROLE-01', 'ROLE-02', 'ROLE-04'), (req, res) => {
  const v = find(q().visitors, req.params.id, 'Visitor');
  audit(actorOf(req), 'read.visitor_record', v.id);
  res.json(v);
});
front.post('/visitors/:id/data-requests', allow('ROLE-02', 'ROLE-04'), (req, res) => {
  const v = find(q().visitors, req.params.id, 'Visitor');
  requireFields(req.body, 'kind');
  audit(actorOf(req), 'dp.request', `${v.id} — ${req.body.kind}`);
  res.status(204).end();
});
