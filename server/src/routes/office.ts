/** Records, governance and platform administration (stages 6–7). */
import { createHash } from 'node:crypto';
import { Router } from 'express';
import type { ConfigState, CsrStage, DecisionEntry, OfficeDocument, RoleId, StatutoryItem, User } from '../../../src/types/index.js';
import { audit, verifyChain } from '../audit.js';
import { R, actorOf, allow, deny, roleOf } from '../auth.js';
import { find, newTask, notify, recordApproval } from '../domain.js';
import { fail, requireFields } from '../errors.js';
import { db } from '../store.js';
import { nextSeq, now, uid } from '../util.js';

export const office = Router();
const q = () => db();

// ───────────── Decision log (SCR-56) ─────────────
office.get('/decisions', allow(...R.EXEC_PA), (_req, res) => { res.json(q().decisions); });

office.post('/decisions', allow(...R.EXEC_PA), (req, res) => {
  requireFields(req.body, 'title', 'basis', 'date');
  const b = req.body;
  const e: DecisionEntry = {
    id: nextSeq(q().decisions.map((d) => d.id), 'DL', 29, 3),
    title: String(b.title).slice(0, 300), basis: String(b.basis).slice(0, 2000), fileRef: String(b.fileRef || '—'),
    date: b.date, reviewDate: b.reviewDate || undefined, meetingRef: b.meetingRef || undefined,
    recordedBy: actorOf(req).name, status: roleOf(req) === 'ROLE-01' ? 'confirmed' : 'draft',
  };
  q().decisions.unshift(e);
  audit(actorOf(req), 'decision.record', e.id);
  res.status(201).json(e);
});

office.post('/decisions/:id/confirm', allow(...R.EXEC_PA), (req, res) => {
  const d = find(q().decisions, req.params.id, 'Decision');
  if (roleOf(req) !== 'ROLE-01') deny(req, `decision ${d.id}`, 'Only the executive can confirm a decision record');
  if (d.status === 'confirmed') fail(409, 'Already confirmed');
  recordApproval(req, 'decision', d.id, 'approved', { delegable: false });
  d.status = 'confirmed';
  audit(actorOf(req), 'decision.confirm', d.id);
  res.status(204).end();
});

// ───────────── Documents (SCR-13) ─────────────
const CLASSES = ['PUB', 'INT', 'OFF', 'RES'];
/** Non-executives see that a restricted item exists (so the UI can show the access flow) but never its title or tags. */
const maskFor = (role: RoleId) => (d: OfficeDocument): OfficeDocument => (d.dataClass === 'RES' && role !== 'ROLE-01' ? { ...d, title: 'Restricted document', tags: ['restricted'], owner: '—' } : d);

office.get('/documents', allow(...R.EXEC_PA), (req, res) => { res.json(q().documents.map(maskFor(roleOf(req)))); });

office.get('/documents/:id', allow(...R.EXEC_PA), (req, res) => {
  const d = find(q().documents, req.params.id, 'Document');
  if (d.dataClass === 'RES' && roleOf(req) !== 'ROLE-01') {
    audit(actorOf(req), 'read.denied', `${d.id} (RES)`, 'denied');
    fail(403, 'Class not authorized for your role');
  }
  if (d.dataClass === 'OFF' || d.dataClass === 'RES') audit(actorOf(req), 'read.document', `${d.id} (${d.dataClass})`);
  res.json(d);
});

office.post('/documents', allow(...R.EXEC_PA), (req, res) => {
  requireFields(req.body, 'title', 'dataClass');
  const { title, dataClass } = req.body;
  if (!CLASSES.includes(dataClass)) fail(422, 'Invalid data class', { dataClass: CLASSES.join(', ') });
  if (dataClass === 'RES' && roleOf(req) !== 'ROLE-01') deny(req, 'document upload (RES)', 'Only the executive can file RES documents');
  const tags = Array.isArray(req.body.tags) ? req.body.tags.map(String).slice(0, 20) : [];
  // Real implementation: multipart upload → malware scan → class gate. The demo stores metadata only.
  const d: OfficeDocument = { id: uid('DOC'), title: String(title).slice(0, 200), dataClass, kind: 'PDF', updatedAt: now(), sizeKb: 200 + Math.round(Math.random() * 800), tags, owner: actorOf(req).name };
  q().documents.unshift(d);
  audit(actorOf(req), 'document.upload', `${d.id} (${dataClass})`);
  res.status(201).json(d);
});

office.get('/directory', allow(...R.EXEC_PA), (_req, res) => { res.json(q().contacts); });

// ───────────── Governance (SCR-14, 17–19, 26, 31–40, 54–55) ─────────────
const wardOf = (scope: string) => scope.replace(/^Ward\s+/i, '').trim();

office.get('/gov/wards', allow('ROLE-01', 'ROLE-02', 'ROLE-05', 'ROLE-06'), (req, res) => {
  const u = req.session!.user;
  res.json(u.role === 'ROLE-05' ? q().wards.filter((w) => w.id === wardOf(u.scope)) : q().wards);
});

office.post('/gov/wards/:id/weekly-form', allow('ROLE-01', 'ROLE-05'), (req, res) => {
  const w = find(q().wards, req.params.id, 'Ward');
  const u = req.session!.user;
  if (u.role === 'ROLE-05' && wardOf(u.scope) !== w.id) deny(req, `ward form ${w.id}`, 'You can submit the form for your own ward only');
  const values = req.body ?? {};
  const bad = Object.entries(values).filter(([, v]) => typeof v !== 'number' || !Number.isFinite(v) || v < 0);
  if (!Object.keys(values).length || bad.length) fail(422, 'Every field must be a non-negative number', Object.fromEntries(bad.map(([k]) => [k, 'Number ≥ 0'])));
  w.formStatus = 'submitted';
  if (typeof values.grievancesOverdue === 'number') { w.grievancesOverdue = values.grievancesOverdue; w.trend = [...w.trend.slice(-5), values.grievancesOverdue]; }
  audit(actorOf(req), 'ward_form.submit', w.id);
  res.status(204).end();
});

const STAT_TYPES = ['RTI', 'Notice', 'LAQ', 'RTS', 'Appeal'];
office.get('/gov/statutory', allow(...R.EXEC_PA), (_req, res) => { res.json(q().statutory); });
office.post('/gov/statutory', allow(...R.EXEC_PA), (req, res) => {
  requireFields(req.body, 'title', 'type', 'received', 'owner');
  const b = req.body;
  if (!STAT_TYPES.includes(b.type)) fail(422, 'Invalid type', { type: STAT_TYPES.join(', ') });
  // DEC-038: the rule starts unverified and the server never computes a deadline from it — only a manual date.
  const s: StatutoryItem = { id: uid('ST'), title: String(b.title), type: b.type, received: b.received, owner: String(b.owner), due: b.due || undefined, manualDate: !!b.due, ruleStatus: 'unverified', status: 'open' };
  q().statutory.unshift(s);
  audit(actorOf(req), 'statutory.add', s.title);
  res.status(201).json(s);
});

office.get('/gov/legal', allow(...R.EXEC_PA), (_req, res) => { res.json({ cases: q().legal, paras: q().auditParas }); });

const CSR_STAGES: CsrStage[] = ['Interest', 'Due diligence', 'External approval', 'Execution', 'Impact report', 'Closed'];
office.get('/gov/csr', allow('ROLE-01', 'ROLE-07'), (_req, res) => { res.json(q().csr); });
office.post('/gov/csr/:id/stage', allow('ROLE-01', 'ROLE-07'), (req, res) => {
  const p = find(q().csr, req.params.id, 'CSR project');
  const stage = req.body?.stage as CsrStage;
  const approvalRef = req.body?.approvalRef ? String(req.body.approvalRef).trim() : undefined;
  if (!CSR_STAGES.includes(stage)) fail(422, 'Invalid stage', { stage: CSR_STAGES.join(', ') });
  if (stage === 'Execution' && !p.approvalRef && !approvalRef) fail(422, 'Cannot move to Execution without a Screening Committee / MC approval reference', { approvalRef: 'Required for Execution' });
  if (approvalRef) p.approvalRef = approvalRef;
  p.stage = stage; p.updatedAt = now();
  audit(actorOf(req), 'csr.stage', `${p.id} → ${stage}`);
  res.status(204).end();
});

office.get('/gov/emergency', allow(...R.EXEC_PA), (_req, res) => { res.json(q().emergency); });
office.post('/gov/emergency', allow(...R.EXEC_PA), (req, res) => {
  requireFields(req.body, 'title', 'summary');
  if (q().emergency.active) fail(409, 'An emergency is already active — close it first');
  const { title, kind, summary } = req.body;
  q().emergency = { ...q().emergency, active: true, id: uid('EM'), title, kind: kind || 'Other', summary, declaredAt: now(), declaredBy: actorOf(req).name, callLog: [], contactTree: q().emergency.contactTree.map((c) => ({ ...c, acknowledged: false })) };
  // Interrupt tier overrides Peace Mode; the visitor queue is paused for the duration.
  notify({ tier: 'interrupt', title: `Emergency declared: ${title}`, category: 'emergency', link: '/gov/emergency', audience: R.OFFICIAL });
  q().queuePaused = true;
  audit(actorOf(req), 'emergency.declare', title);
  audit(actorOf(req), 'queue.pause', 'emergency');
  res.status(201).json(q().emergency);
});
office.post('/gov/emergency/calls', allow(...R.EXEC_PA), (req, res) => {
  if (!q().emergency.active) fail(409, 'No active emergency');
  requireFields(req.body, 'who', 'outcome');
  const { who, outcome } = req.body;
  q().emergency.callLog.unshift({ at: now(), who, outcome });
  const c = q().emergency.contactTree.find((x) => x.post === who);
  if (c && outcome === 'Acknowledged') c.acknowledged = true;
  audit(actorOf(req), 'emergency.call_log', `${who}: ${outcome}`);
  res.status(204).end();
});
office.post('/gov/emergency/close', allow(...R.EXEC_PA), (req, res) => {
  if (!q().emergency.active) fail(409, 'No active emergency');
  requireFields(req.body, 'closingNote');
  audit(actorOf(req), 'emergency.close', req.body.closingNote);
  q().emergency = { ...q().emergency, active: false };
  res.status(204).end();
});

office.get('/gov/dak', allow(...R.EXEC_PA), (_req, res) => { res.json(q().dak); });
office.post('/gov/dak/:id/route', allow('ROLE-02'), (req, res) => {
  const d = find(q().dak, req.params.id, 'Dak item');
  requireFields(req.body, 'route');
  if (d.status === 'routed') fail(409, 'Already routed');
  d.status = 'routed'; d.suggestedRoute = req.body.route;
  audit(actorOf(req), 'dak.route', `${d.id} → ${req.body.route}`);
  if (req.body.createTask) {
    const t = newTask(actorOf(req), { title: d.subject, source: 'Document', sourceRef: d.id, ownerPost: req.body.route, due: new Date(Date.now() + 7 * 86400000).toISOString() });
    q().tasks.unshift(t);
    audit(actorOf(req), 'task.create', `${t.id} (from dak ${d.id})`);
  }
  res.status(204).end();
});

office.get('/gov/inspections', allow(...R.EXEC_PA), (_req, res) => { res.json(q().inspections); });
office.post('/gov/inspections', allow(...R.EXEC), (req, res) => {
  requireFields(req.body, 'location', 'notes');
  const b = req.body;
  const i = { id: uid('IN'), at: now(), location: String(b.location), notes: String(b.notes), photos: Math.max(0, Number(b.photos) || 0), draftTasks: Array.isArray(b.draftTasks) ? b.draftTasks.map(String).filter(Boolean) : [], status: 'captured' as const };
  q().inspections.unshift(i);
  audit(actorOf(req), 'inspection.capture', i.location);
  res.status(201).json(i);
});
office.post('/gov/inspections/:id/confirm', allow(...R.EXEC), (req, res) => {
  const i = find(q().inspections, req.params.id, 'Inspection');
  if (i.status === 'confirmed') fail(409, 'Already confirmed');
  i.status = 'confirmed';
  for (const dt of i.draftTasks) {
    const t = newTask(actorOf(req), { title: dt, source: 'Inspection', sourceRef: i.id, ownerPost: 'Ward officer (assign)', due: new Date(Date.now() + 5 * 86400000).toISOString(), verificationRequired: true, evidence: i.photos }, 'draft');
    q().tasks.unshift(t);
  }
  audit(actorOf(req), 'inspection.confirm_tasks', i.id);
  res.status(204).end();
});

// ───────────── Platform administration (SCR-42–45, SCR-60) ─────────────
const ADMIN: RoleId[] = ['ROLE-08'];
const AUDITORS: RoleId[] = ['ROLE-10', 'ROLE-08'];

office.get('/admin/users', allow(...ADMIN), (_req, res) => { res.json(q().users); });
office.patch('/admin/users/:id', allow(...ADMIN), (req, res) => {
  const u = find(q().users, req.params.id, 'User');
  const status = req.body?.status as User['status'];
  if (!['active', 'deactivated', 'pending'].includes(status)) fail(422, 'Invalid status', { status: 'active | deactivated | pending' });
  if (u.id === req.session!.user.id && status !== 'active') fail(409, 'You cannot deactivate your own account');
  u.status = status;
  // Deactivation ends that user's sessions immediately.
  if (status !== 'active') for (const [tok, s] of Object.entries(q().sessions)) if (s.user.id === u.id) delete q().sessions[tok];
  audit(actorOf(req), `user.${status}`, u.name);
  res.status(204).end();
});

office.get('/admin/access-requests', allow('ROLE-08', 'ROLE-03'), (_req, res) => { res.json(q().accessRequests); });
for (const verb of ['approve', 'reject'] as const) {
  office.post(`/admin/access-requests/:id/${verb}`, allow(...ADMIN), (req, res) => {
    const r = find(q().accessRequests, req.params.id, 'Access request');
    if (r.status !== 'pending') fail(409, `Already ${r.status}`);
    recordApproval(req, 'role.grant', r.id, verb === 'approve' ? 'approved' : 'rejected', { roles: ADMIN, delegable: false });
    r.status = verb === 'approve' ? 'approved' : 'rejected';
    if (verb === 'approve') q().users.push({ id: nextSeq(q().users.map((u) => u.id), 'U', 1, 2), name: r.userName, post: r.scope, role: r.requestedRole, scope: r.scope, mfa: 'otp-app', devices: 0, lastSignIn: now(), status: 'pending' });
    audit(actorOf(req), verb === 'approve' ? 'role.grant_approve' : 'role.grant_reject', `${r.userName} → ${r.requestedRole}`);
    res.status(204).end();
  });
}

office.post('/admin/break-glass', allow('ROLE-09', 'ROLE-08'), (req, res) => {
  requireFields(req.body, 'reason');
  const minutes = Number(req.body.minutes) || 60;
  if (minutes < 5 || minutes > 240) fail(422, 'minutes must be between 5 and 240', { minutes: '5–240' });
  const bg = { id: uid('BG'), at: now(), by: actorOf(req).name, reason: String(req.body.reason), minutes, status: 'pending' as const };
  q().breakGlass.unshift(bg);
  notify({ tier: 'interrupt', title: 'Break-glass request awaiting approval', body: `${bg.by}: ${bg.reason} (${minutes} min)`, category: 'security', link: '/admin/users', audience: ['ROLE-08', 'ROLE-10'] });
  audit(actorOf(req), 'break_glass.request', `${minutes} min — ${bg.reason}`);
  res.status(201).json({ id: bg.id, status: bg.status });
});

office.get('/admin/config', allow(...R.OFFICIAL), (_req, res) => { res.json(q().config); });
const OFFICE_ITEMS: (keyof ConfigState)[] = ['categories', 'officeHours'];
office.put('/admin/config', allow('ROLE-08', 'ROLE-03'), (req, res) => {
  const next = req.body as ConfigState;
  if (!next || typeof next !== 'object' || !Array.isArray(next.categories)) fail(422, 'Body must be a full ConfigState');
  const cur = q().config;
  const changed = (Object.keys(cur) as (keyof ConfigState)[]).filter((k) => next[k] !== undefined && JSON.stringify(next[k]) !== JSON.stringify(cur[k]));
  if (roleOf(req) === 'ROLE-03') {
    const forbidden = changed.filter((k) => !OFFICE_ITEMS.includes(k));
    if (forbidden.length) deny(req, `config ${forbidden.join(', ')}`, `Office administrators may change office items only (not: ${forbidden.join(', ')})`);
  }
  q().config = { ...cur, ...Object.fromEntries(changed.map((k) => [k, next[k]])) };
  audit(actorOf(req), 'config.update', changed.join(', ') || 'no change');
  res.status(204).end();
});

office.get('/audit/events', allow(...AUDITORS), (_req, res) => { res.json(q().audit); });
office.post('/audit/verify', allow(...AUDITORS), (req, res) => {
  const r = verifyChain();
  res.json(r);
  // Record the verification after computing it, so the result reflects the ledger as it was checked.
  audit(actorOf(req), 'audit.verify', `${r.checked} events — ${r.ok ? 'intact' : `broken at ${r.brokenAt}`}`, r.ok ? 'ok' : 'error');
});
office.get('/audit/ai-interactions', allow(...AUDITORS), (_req, res) => { res.json(q().aiLog); });

office.get('/ops/health', allow('ROLE-08', 'ROLE-09'), (_req, res) => {
  const backup = q().jobs.find((j) => j.name === 'Nightly backup');
  res.json({ services: q().services, jobs: q().jobs, alerts: q().securityAlerts, lastBackup: backup?.lastRun ?? null, lastRestoreTest: new Date(Date.now() - 23 * 86400000).toISOString() });
});
office.post('/ops/alerts/:id/ack', allow(...ADMIN), (req, res) => {
  const a = find(q().securityAlerts, req.params.id, 'Alert');
  a.acknowledged = true;
  audit(actorOf(req), 'alert.ack', a.id);
  res.status(204).end();
});

const EXPORT_SCOPES: Record<string, (keyof ReturnType<typeof db>)[]> = {
  'Full office export': ['calendar', 'requests', 'tasks', 'decide', 'drafts', 'meetings', 'decisions', 'documents', 'contacts', 'visitors', 'audit', 'aiLog', 'approvals', 'config'],
  'Tasks and decisions': ['tasks', 'decisions', 'approvals'],
  'Visitor records (retention-limited)': ['visitors', 'queue', 'requests'],
  'Audit ledger': ['audit', 'aiLog'],
};
office.post('/admin/exports', allow(...ADMIN), (req, res) => {
  requireFields(req.body, 'scope', 'format');
  const keys = EXPORT_SCOPES[req.body.scope];
  if (!keys) fail(422, 'Unknown scope', { scope: Object.keys(EXPORT_SCOPES).join(' | ') });
  const snapshot = JSON.stringify(Object.fromEntries(keys.map((k) => [k, q()[k]])));
  const checksum = `sha256:${createHash('sha256').update(snapshot).digest('hex')}`;
  const jobId = uid('EXP');
  audit(actorOf(req), 'export.start', `${req.body.scope} as ${req.body.format} (${jobId})`);
  res.json({ jobId, checksum, files: keys.length });
});
