/** Tasks, Decide, drafts, meetings, notifications, Peace Mode and absence (stages 4–5). */
import { Router, type Request } from 'express';
import type { AbsenceState, Draft, Meeting, PeaceSettings, Task, TaskState } from '../../../frontend/src/types/index.js';
import { audit, type Actor } from '../audit.js';
import { R, actorOf, allow, deny, roleOf } from '../auth.js';
import { TASK_STATES, TASK_TRANSITIONS, addDecide, find, newTask, notify, officerScope, publicNotification, recordApproval, resolveDecide, weekKey } from '../domain.js';
import { fail, requireFields } from '../errors.js';
import { db } from '../store.js';
import { now, uid } from '../util.js';

export const work = Router();
const q = () => db();
const TASK_ROLES = [...R.EXEC_PA, ...R.OFFICERS];
const OFFICER_MOVES: TaskState[] = ['acknowledged', 'in-progress', 'submitted'];

/** Find a task the caller may see (officers: own ward/department only; others get a 404, never a hint). */
function visibleTask(req: Request, id: string | string[]): Task {
  const t = find(q().tasks, id, 'Task');
  const scope = officerScope(req);
  if (scope && !scope(t)) { audit(actorOf(req), 'read.denied', `task ${id}`, 'denied'); fail(404, 'Task not found'); }
  return t;
}

/** BR-013: counters reset when the ISO week changes. */
function rollNudgeWeek() {
  const wk = weekKey();
  const d = q();
  if (d.nudgeWeek !== wk) { if (d.nudgeWeek) d.tasks.forEach((t) => (t.nudgesThisWeek = 0)); d.nudgeWeek = wk; }
}

// ───────────── Tasks / commitment ledger (SCR-11, SCR-24, SCR-31) ─────────────
work.get('/tasks', allow(...TASK_ROLES), (req, res) => {
  rollNudgeWeek();
  const scope = officerScope(req);
  res.json(scope ? q().tasks.filter(scope) : q().tasks);
});

const PRIORITIES = ['high', 'normal', 'low'];
const SOURCES = ['Meeting', 'Visit', 'Voice', 'Document', 'Inspection', 'Manual', 'Exception'];

work.post('/tasks', allow(...R.EXEC_PA), (req, res) => {
  const b = req.body ?? {};
  requireFields(b, 'title');
  if (b.due && isNaN(+new Date(b.due))) fail(422, 'due must be an ISO-8601 date', { due: 'ISO-8601' });
  if (b.priority && !PRIORITIES.includes(b.priority)) fail(422, 'Invalid priority', { priority: PRIORITIES.join(', ') });
  const assigned = !!(String(b.ownerPost ?? '').trim() && b.due);
  const t = newTask(actorOf(req), {
    title: String(b.title).trim().slice(0, 300), ownerPost: String(b.ownerPost ?? '').trim(), due: b.due ?? '',
    verificationRequired: !!b.verificationRequired, priority: b.priority ?? 'normal', ward: b.ward || undefined,
    source: SOURCES.includes(b.source) ? b.source : 'Manual', sourceRef: b.sourceRef || undefined, notes: b.notes || undefined,
  }, assigned ? 'assigned' : 'draft');
  if (assigned) t.history = [{ state: 'draft', at: t.createdAt, by: t.createdBy }, { state: 'assigned', at: t.createdAt, by: t.createdBy }];
  q().tasks.unshift(t);
  audit(actorOf(req), 'task.create', t.id);
  res.status(201).json(t);
});

work.post('/tasks/:id/transition', allow(...TASK_ROLES), (req, res) => {
  const t = visibleTask(req, req.params.id);
  const to = req.body?.to as TaskState;
  const note: string | undefined = req.body?.note ? String(req.body.note).slice(0, 500) : undefined;
  const actor = actorOf(req);
  if (!TASK_STATES.includes(to)) fail(422, 'Unknown task state', { to: TASK_STATES.join(', ') });
  if (!TASK_TRANSITIONS[t.state].includes(to)) {
    audit(actor, 'task.transition_rejected', `${t.id} ${t.state}→${to}`, 'error');
    fail(409, `Invalid transition ${t.state} → ${to} (BR-011)`);
  }
  if (R.OFFICERS.includes(roleOf(req)) && !OFFICER_MOVES.includes(to)) deny(req, `task ${t.id} → ${to}`, 'Officers can acknowledge, start and submit tasks only');
  if (t.state === 'draft' && to === 'assigned' && (!t.ownerPost || !t.due)) fail(422, 'A task cannot leave Draft without owner and due date');
  if (to === 'cancelled' && !note?.trim()) fail(422, 'Cancellation needs a reason', { note: 'Required' });
  if (to === 'closed' && t.verificationRequired && t.state !== 'verified') fail(409, 'Verification required before closure');
  if (to === 'verified' || to === 'reopened') recordApproval(req, 'verification', t.id, to === 'verified' ? 'approved' : 'rejected', { roles: R.EXEC_PA, reason: note });
  if (to === 'closed' && t.verificationRequired && !R.EXEC_PA.includes(roleOf(req))) deny(req, `task ${t.id} close`, 'Only the assigner or delegate can close a verified task');

  t.state = to;
  t.history.push({ state: to, at: now(), by: actor.name, ...(note ? { note } : {}) });
  if (to === 'verified' || to === 'reopened') resolveDecide(t.id, to === 'verified' ? 'approved' : 'rejected');
  if (to === 'submitted') {
    if (!q().decide.some((d) => d.refId === t.id && d.status === 'pending')) {
      addDecide({ type: 'verification', title: 'Task verification', subtitle: `${t.title} — evidence: ${t.evidence} item(s)`, sources: [t.id], refId: t.id });
    }
    notify({ tier: 'digest', title: 'Task submitted for verification', body: t.title, category: 'task', link: '/exec/decide' });
  }
  audit(actor, `task.${to}`, `${t.id}${note ? ` — ${note}` : ''}`);
  res.json(t);
});

work.post('/tasks/:id/nudge', allow(...R.EXEC_PA), (req, res) => {
  rollNudgeWeek();
  const t = find(q().tasks, req.params.id, 'Task');
  if (!['assigned', 'acknowledged', 'in-progress', 'reopened'].includes(t.state)) fail(409, `Cannot nudge a task in state ${t.state}`);
  if (t.nudgesThisWeek >= t.nudgeCap) {
    audit(actorOf(req), 'task.nudge', `${t.id} (cap reached)`, 'denied');
    fail(409, `Weekly nudge cap reached for ${t.ownerPost} (BR-013) — escalate instead`);
  }
  t.nudgesThisWeek += 1;
  audit(actorOf(req), 'task.nudge', `${t.id} (${t.nudgesThisWeek}/${t.nudgeCap})`);
  res.status(204).end();
});

work.post('/tasks/:id/escalate', allow(...R.EXEC_PA), (req, res) => {
  const t = find(q().tasks, req.params.id, 'Task');
  t.escalated = true;
  notify({ tier: 'normal', title: 'Task escalated', body: t.title, category: 'task', link: '/exec/tasks', audience: ['ROLE-01'] });
  audit(actorOf(req), 'task.escalate', t.id);
  res.status(204).end();
});

work.post('/tasks/:id/evidence', allow(...TASK_ROLES), (req, res) => {
  const t = visibleTask(req, req.params.id);
  const count = Number(req.body?.count);
  if (!Number.isInteger(count) || count < 1 || count > 50) fail(422, 'count must be an integer from 1 to 50', { count: '1–50' });
  t.evidence += count;
  audit(actorOf(req), 'task.evidence_upload', `${t.id} +${count}`);
  res.status(204).end();
});

work.post('/tasks/:id/extension', allow(...TASK_ROLES), (req, res) => {
  const t = visibleTask(req, req.params.id);
  const days = Number(req.body?.days);
  if (!Number.isInteger(days) || days < 1 || days > 60) fail(422, 'days must be an integer from 1 to 60', { days: '1–60' });
  requireFields(req.body, 'reason');
  addDecide({ type: 'extension', title: 'Extension request', subtitle: `${t.title} · +${days} d · ${req.body.reason}`, sources: [t.id], refId: t.id, body: String(days) });
  notify({ tier: 'normal', title: 'Item added to Decide', body: `Extension: ${t.title}`, category: 'decide', link: '/exec/decide', audience: ['ROLE-01'] });
  audit(actorOf(req), 'task.extension_request', `${t.id} +${days}d`);
  res.status(204).end();
});

// ───────────── Meetings helpers ─────────────
function approveMinutes(actor: Actor, m: Meeting) {
  m.minutesStatus = 'approved';
  for (const a of m.actions.filter((x) => !x.taskId)) {
    const t = newTask(actor, { title: a.text, source: 'Meeting', sourceRef: m.title, ownerPost: a.ownerPost, due: a.due, verificationRequired: true });
    q().tasks.unshift(t);
    a.taskId = t.id;
    audit(actor, 'task.create', `${t.id} (from minutes ${m.id})`);
  }
  resolveDecide(m.id, 'approved');
  audit(actor, 'minutes.approve', m.id);
}

// ───────────── Decide queue (SCR-03) ─────────────
work.get('/decide', allow(...R.EXEC_PA), (_req, res) => { res.json(q().decide.filter((d) => d.status === 'pending')); });

function pendingDecide(id: string | string[]) {
  const d = find(q().decide, id, 'Decide item');
  if (d.status !== 'pending') fail(409, `Already ${d.status}`);
  if (d.type === 'appointment') fail(409, 'Appointments are decided via /appointment-requests/:id/approve or /decline');
  if (d.type === 'verification') fail(409, 'Verifications are decided via /tasks/:id/transition');
  return d;
}

work.post('/decide/:id/approve', allow(...R.EXEC_PA), (req, res) => {
  const d = pendingDecide(req.params.id);
  recordApproval(req, d.type, d.refId, 'approved');
  d.status = 'approved';
  if (d.type === 'draft') { const dr = q().drafts.find((x) => x.id === d.refId); if (dr) { dr.status = 'approved'; dr.updatedAt = now(); } }
  if (d.type === 'minutes') { const m = q().meetings.find((x) => x.id === d.refId); if (m) approveMinutes(actorOf(req), m); }
  if (d.type === 'extension') {
    const t = q().tasks.find((x) => x.id === d.refId);
    if (t) { const nd = new Date(t.due || Date.now()); nd.setDate(nd.getDate() + Number(d.body || 3)); t.due = nd.toISOString(); }
  }
  audit(actorOf(req), `approval.${d.type}`, d.refId);
  res.status(204).end();
});

work.post('/decide/:id/reject', allow(...R.EXEC_PA), (req, res) => {
  const d = pendingDecide(req.params.id);
  requireFields(req.body, 'reason');
  recordApproval(req, d.type, d.refId, 'rejected', { reason: req.body.reason });
  d.status = 'rejected';
  if (d.type === 'draft') { const dr = q().drafts.find((x) => x.id === d.refId); if (dr) dr.status = 'rejected'; }
  if (d.type === 'minutes') { const m = q().meetings.find((x) => x.id === d.refId); if (m) m.minutesStatus = 'draft'; }
  audit(actorOf(req), `rejection.${d.type}`, `${d.refId} — ${req.body.reason}`);
  res.status(204).end();
});

work.patch('/decide/:id', allow(...R.EXEC_PA), (req, res) => {
  const d = find(q().decide, req.params.id, 'Decide item');
  if (d.status !== 'pending') fail(409, `Already ${d.status}`);
  if (typeof req.body?.body !== 'string') fail(422, 'body is required', { body: 'Required' });
  d.body = req.body.body; d.aiDraft = false;
  const dr = q().drafts.find((x) => x.id === d.refId);
  if (dr) { dr.body = req.body.body; dr.aiGenerated = false; dr.updatedAt = now(); }
  audit(actorOf(req), 'decide.edit', d.id);
  res.status(204).end();
});

// ───────────── Drafts & outbox (SCR-25) ─────────────
const CHANNELS: Draft['channel'][] = ['email', 'sms', 'letter', 'in-app'];
const LANGS = ['en', 'mr', 'hi'];

function draftFields(b: Record<string, unknown>): Partial<Draft> {
  const out: Partial<Draft> = {};
  if (b.title !== undefined) out.title = String(b.title).slice(0, 200);
  if (b.recipient !== undefined) out.recipient = String(b.recipient).slice(0, 200);
  if (b.body !== undefined) out.body = String(b.body).slice(0, 20000);
  if (b.template !== undefined) out.template = b.template ? String(b.template) : undefined;
  if (b.aiGenerated !== undefined) out.aiGenerated = !!b.aiGenerated;
  if (b.channel !== undefined) { if (!CHANNELS.includes(b.channel as Draft['channel'])) fail(422, 'Invalid channel', { channel: CHANNELS.join(', ') }); out.channel = b.channel as Draft['channel']; }
  if (b.language !== undefined) { if (!LANGS.includes(b.language as string)) fail(422, 'Invalid language', { language: LANGS.join(', ') }); out.language = b.language as Draft['language']; }
  return out;
}

work.get('/drafts', allow(...R.EXEC_PA), (_req, res) => { res.json(q().drafts); });

work.post('/drafts', allow(...R.EXEC_PA), (req, res) => {
  requireFields(req.body, 'title', 'body');
  const d: Draft = { id: uid('DR'), recipient: '', channel: 'email', language: 'en', aiGenerated: false, ...draftFields(req.body), status: 'draft', updatedAt: now() } as Draft;
  q().drafts.unshift(d);
  audit(actorOf(req), 'draft.create', d.id);
  res.status(201).json(d);
});

work.put('/drafts/:id', allow(...R.EXEC_PA), (req, res) => {
  const d = find(q().drafts, req.params.id, 'Draft');
  if (d.status === 'sent') fail(409, 'A sent draft cannot be edited');
  Object.assign(d, draftFields(req.body ?? {}), { updatedAt: now() });
  // Editing an approved (or pending) draft sends it back to draft; any pending approval is withdrawn.
  if (['approved', 'pending-approval'].includes(d.status)) { d.status = 'draft'; resolveDecide(d.id, 'rejected'); }
  audit(actorOf(req), 'draft.update', d.id);
  res.json(d);
});

work.post('/drafts/:id/request-approval', allow(...R.EXEC_PA), (req, res) => {
  const d = find(q().drafts, req.params.id, 'Draft');
  if (!['draft', 'rejected', 'failed'].includes(d.status)) fail(409, `Draft is ${d.status}`);
  d.status = 'pending-approval';
  addDecide({ type: 'draft', title: 'Draft reply', subtitle: d.title, sources: [d.id], refId: d.id, aiDraft: d.aiGenerated, body: d.body });
  notify({ tier: 'normal', title: 'Item added to Decide', body: d.title, category: 'decide', link: '/exec/decide', audience: ['ROLE-01'] });
  audit(actorOf(req), 'draft.request_approval', d.id);
  res.status(204).end();
});

work.post('/drafts/:id/send', allow(...R.EXEC_PA), (req, res) => {
  const d = find(q().drafts, req.params.id, 'Draft');
  if (d.status !== 'approved') { audit(actorOf(req), 'send.blocked', `${d.id} — not approved`, 'denied'); fail(409, 'Only approved drafts can be sent (AI-FR-004)'); }
  if (d.channel === 'sms' && !q().config.smsSenderApproved) {
    d.status = 'failed';
    audit(actorOf(req), 'send.blocked', `${d.id} — SMS sender ID not approved (DEC-010)`, 'error');
    fail(409, 'Channel blocked: SMS sender ID not approved (DEC-010)');
  }
  d.status = 'sent'; d.updatedAt = now();
  audit(actorOf(req), 'send', `${d.id} via ${d.channel}`);
  res.status(204).end();
});

work.delete('/drafts/:id', allow(...R.EXEC_PA), (req, res) => {
  const d = find(q().drafts, req.params.id, 'Draft');
  if (d.status === 'sent') fail(409, 'A sent draft is part of the record and cannot be deleted');
  q().drafts = q().drafts.filter((x) => x.id !== d.id);
  resolveDecide(d.id, 'rejected');
  audit(actorOf(req), 'draft.delete', d.id);
  res.status(204).end();
});

// ───────────── Meetings (SCR-08, SCR-12) ─────────────
work.get('/meetings', allow(...R.EXEC_PA), (_req, res) => { res.json(q().meetings); });
work.get('/meetings/:id', allow(...R.EXEC_PA), (req, res) => { res.json(find(q().meetings, req.params.id, 'Meeting')); });

work.put('/meetings/:id/notes', allow(...R.EXEC_PA), (req, res) => {
  const m = find(q().meetings, req.params.id, 'Meeting');
  if (typeof req.body?.notes !== 'string') fail(422, 'notes is required', { notes: 'Required' });
  if (m.minutesStatus === 'approved') fail(409, 'Minutes are approved and locked');
  m.notes = req.body.notes.slice(0, 50000); m.version += 1;
  if (m.minutesStatus === 'none') m.minutesStatus = 'draft';
  res.json({ version: m.version });
});

work.put('/meetings/:id/actions', allow(...R.EXEC_PA), (req, res) => {
  const m = find(q().meetings, req.params.id, 'Meeting');
  if (m.minutesStatus === 'approved') fail(409, 'Minutes are approved and locked');
  const { actions, decisions } = req.body ?? {};
  if (!Array.isArray(actions) || !Array.isArray(decisions)) fail(422, 'actions and decisions must be arrays');
  m.actions = actions.map((a: Meeting['actions'][number]) => ({ id: a.id || uid('A'), text: String(a.text ?? ''), ownerPost: String(a.ownerPost ?? ''), due: String(a.due ?? ''), ...(a.taskId ? { taskId: a.taskId } : {}) }));
  m.decisions = decisions.map(String);
  audit(actorOf(req), 'meeting.actions_update', m.id);
  res.status(204).end();
});

work.post('/meetings/:id/submit-minutes', allow(...R.EXEC_PA), (req, res) => {
  const m = find(q().meetings, req.params.id, 'Meeting');
  if (m.minutesStatus === 'approved') fail(409, 'Minutes are already approved');
  if (m.minutesStatus === 'pending-approval') fail(409, 'Minutes are already awaiting approval');
  m.minutesStatus = 'pending-approval';
  addDecide({ type: 'minutes', title: 'Minutes for approval', subtitle: `${m.title} · ${m.actions.length} actions, ${m.decisions.length} decisions`, sources: [m.id], refId: m.id });
  audit(actorOf(req), 'minutes.submit', m.id);
  res.status(204).end();
});

work.post('/meetings/:id/approve-minutes', allow(...R.EXEC_PA), (req, res) => {
  const m = find(q().meetings, req.params.id, 'Meeting');
  if (roleOf(req) !== 'ROLE-01') deny(req, `minutes ${m.id}`, 'Only the chair can approve minutes');
  if (m.minutesStatus === 'approved') fail(409, 'Minutes are already approved');
  recordApproval(req, 'minutes', m.id, 'approved', { delegable: false });
  approveMinutes(actorOf(req), m);
  res.status(204).end();
});

// ───────────── Notifications (SCR-57) ─────────────
const visibleNotifications = (req: Request) => q().notifications.filter((n) => !n.audience || n.audience.includes(roleOf(req)));

work.get('/notifications', allow(...R.OFFICIAL), (req, res) => { res.json(visibleNotifications(req).map(publicNotification)); });
work.post('/notifications/read-all', allow(...R.OFFICIAL), (req, res) => { visibleNotifications(req).forEach((n) => (n.read = true)); res.status(204).end(); });
work.post('/notifications/release-held', allow(...R.OFFICIAL), (req, res) => { visibleNotifications(req).forEach((n) => (n.held = false)); res.status(204).end(); });
work.post('/notifications/:id/read', allow(...R.OFFICIAL), (req, res) => {
  const n = visibleNotifications(req).find((x) => x.id === req.params.id);
  if (!n) fail(404, 'Notification not found');
  n.read = true;
  res.status(204).end();
});

// ───────────── Peace Mode (SCR-15) ─────────────
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
work.get('/me/peace-mode', allow(...R.EXEC_PA), (_req, res) => { res.json(q().peace); });
work.put('/me/peace-mode', allow(...R.EXEC_PA), (req, res) => {
  if (roleOf(req) !== 'ROLE-01') deny(req, 'peace-mode', 'Only the executive can change Peace Mode');
  const p = req.body as PeaceSettings;
  for (const k of ['from', 'to', 'digestTime'] as const) if (!HHMM.test(String(p?.[k]))) fail(422, `${k} must be HH:MM`, { [k]: 'HH:MM' });
  if (!Array.isArray(p.categories)) fail(422, 'categories must be an array');
  const known = new Map(q().peace.categories.map((c) => [c.key, c]));
  q().peace = {
    enabled: !!p.enabled, from: p.from, to: p.to, duringFocus: !!p.duringFocus, digestTime: p.digestTime,
    // Unknown keys are dropped; the fixed `emergency` category is always interrupt.
    categories: [...known.values()].map((c) => {
      const inc = p.categories.find((x) => x.key === c.key);
      const tier = c.fixed ? 'interrupt' : inc && ['interrupt', 'normal', 'digest'].includes(inc.tier) ? inc.tier : c.tier;
      return { ...c, tier };
    }),
  };
  audit(actorOf(req), 'peace.update', 'settings');
  res.status(204).end();
});

// ───────────── Absence & delegation (SCR-62) ─────────────
work.get('/absence', allow(...R.EXEC_PA), (_req, res) => {
  const a = q().absence;
  const held = a.active ? q().decide.filter((d) => d.status === 'pending').length + q().requests.filter((r) => ['requested', 'held'].includes(r.status)).length : 0;
  res.json({ ...a, heldItems: held });
});

work.put('/absence', allow(...R.EXEC_PA), (req, res) => {
  const b = req.body as AbsenceState;
  const cur = q().absence;
  const changesAuthority = !!b.active !== cur.active || (b.delegationRecord ?? '') !== (cur.delegationRecord ?? '') || b.from !== cur.from || b.to !== cur.to;
  // A PA must never be able to write their own delegation and then approve under it.
  if (roleOf(req) !== 'ROLE-01' && changesAuthority) deny(req, 'absence', 'Only the executive can start/end absence or record a delegation');
  const next: AbsenceState = {
    active: !!b.active, from: b.from || undefined, to: b.to || undefined,
    delegationRecord: b.delegationRecord?.trim() || undefined, heldItems: 0,
    visitorMessage: String(b.visitorMessage ?? cur.visitorMessage).slice(0, 1000),
  };
  if (!next.active && cur.active) q().requests.filter((r) => r.status === 'held').forEach((r) => (r.status = 'requested'));
  q().absence = next;
  audit(actorOf(req), next.active ? (cur.active ? 'absence.update' : 'absence.start') : cur.active ? 'absence.end' : 'absence.update', `${next.from ?? ''}–${next.to ?? ''}${next.delegationRecord ? ` · delegation ${next.delegationRecord}` : ''}`);
  res.status(204).end();
});
