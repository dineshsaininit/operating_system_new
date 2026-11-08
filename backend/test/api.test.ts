/**
 * Integration tests over real HTTP against a throwaway data directory.
 * They exercise the rules in section 2 of BACKEND_API_CONTRACT.md.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { Server } from 'node:http';

const dir = mkdtempSync(path.join(tmpdir(), 'aasiom-test-'));
process.env.DATA_DIR = dir;
process.env.GROQ_API_KEY = ''; process.env.GOOGLE_API_KEY = ''; process.env.MISTRAL_API_KEY = '';

const { initStores, db } = await import('../src/store.js');
const { createApp } = await import('../src/app.js');

let server: Server;
let base = '';
const tokens: Record<string, string> = {};

async function call(method: string, p: string, body?: unknown, token?: string) {
  const r = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  return { status: r.status, body: text ? JSON.parse(text) : undefined, headers: r.headers };
}
const as = (role: string) => ({
  get: (p: string) => call('GET', p, undefined, tokens[role]),
  post: (p: string, b?: unknown) => call('POST', p, b ?? {}, tokens[role]),
  put: (p: string, b?: unknown) => call('PUT', p, b, tokens[role]),
  patch: (p: string, b?: unknown) => call('PATCH', p, b, tokens[role]),
  del: (p: string) => call('DELETE', p, undefined, tokens[role]),
});
const EXEC = 'ROLE-01', PA = 'ROLE-02', ADMIN3 = 'ROLE-03', RECEPTION = 'ROLE-04', WARD = 'ROLE-05', DEPT = 'ROLE-06', PM = 'ROLE-07', SYSADMIN = 'ROLE-08', AUDITOR = 'ROLE-10', PRIVATE = 'ROLE-11';

before(async () => {
  initStores(dir);
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  for (const role of [EXEC, PA, ADMIN3, RECEPTION, WARD, DEPT, PM, SYSADMIN, AUDITOR, PRIVATE]) {
    const r = await call('POST', '/auth/sign-in', { role, deviceName: 'Test device' });
    assert.equal(r.status, 200, `sign-in ${role}`);
    tokens[role] = r.body.token;
  }
});
after(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });

describe('auth & RBAC', () => {
  it('sign-in returns a Session and sets an HttpOnly cookie', async () => {
    const r = await call('POST', '/auth/sign-in', { role: PA, deviceName: 'x' });
    assert.equal(r.body.user.role, PA);
    assert.match(r.body.token, /^[0-9a-f]{64}$/);
    assert.match(r.headers.get('set-cookie') ?? '', /aasiom_sid=.*HttpOnly/i);
  });
  it('401 without a session, 401 for an unknown role', async () => {
    assert.equal((await call('GET', '/tasks')).status, 401);
    assert.equal((await call('POST', '/auth/sign-in', { role: 'ROLE-13' })).status, 401);
  });
  it('403 for a role outside the endpoint, with referenceId, and the denial is audited', async () => {
    const r = await as(RECEPTION).get('/tasks');
    assert.equal(r.status, 403);
    assert.ok(r.body.referenceId);
    assert.equal(db().audit[0].action, 'access.denied');
    assert.equal(db().audit[0].result, 'denied');
  });
  it('officers only see their own ward / department', async () => {
    const w = await as(WARD).get('/tasks');
    assert.ok(w.body.length > 0 && w.body.every((t: { ward?: string; ownerPost: string }) => t.ward === 'W3' || t.ownerPost.includes('W3')));
    const d = await as(DEPT).get('/tasks');
    assert.ok(d.body.length > 0 && d.body.every((t: { ownerPost: string }) => /roads/i.test(t.ownerPost)));
  });
});

describe('task state machine (BR-011)', () => {
  it('creates draft without owner+due, assigned with them', async () => {
    const a = await as(PA).post('/tasks', { title: 'X', ownerPost: '', due: '', verificationRequired: false, priority: 'normal' });
    assert.equal(a.body.state, 'draft');
    const b = await as(PA).post('/tasks', { title: 'Y', ownerPost: 'EE Roads', due: new Date().toISOString(), verificationRequired: true, priority: 'high' });
    assert.equal(b.body.state, 'assigned');
    const draftMove = await as(PA).post(`/tasks/${a.body.id}/transition`, { to: 'assigned' });
    assert.equal(draftMove.status, 422);
  });
  it('rejects invalid transitions with 409 and audits them', async () => {
    const r = await as(PA).post('/tasks/T-101/transition', { to: 'closed' });
    assert.equal(r.status, 409);
    assert.equal(db().audit[0].action, 'task.transition_rejected');
  });
  it('cancel needs a reason; closure needs verification; officers cannot verify', async () => {
    assert.equal((await as(PA).post('/tasks/T-110/transition', { to: 'cancelled' })).status, 422);
    assert.equal((await as(EXEC).post('/tasks/T-102/transition', { to: 'closed' })).status, 409);
    const officer = await as(WARD).post('/tasks/T-101/transition', { to: 'in-progress' });
    assert.equal(officer.status, 200);
    assert.equal((await as(WARD).post('/tasks/T-101/transition', { to: 'submitted' })).status, 200);
    assert.equal((await as(WARD).post('/tasks/T-101/transition', { to: 'verified' })).status, 403);
    // submitted → Decide verification item created
    assert.ok((await as(EXEC).get('/decide')).body.some((d: { refId: string; type: string }) => d.refId === 'T-101' && d.type === 'verification'));
    const v = await as(EXEC).post('/tasks/T-101/transition', { to: 'verified', note: 'ok' });
    assert.equal(v.status, 200);
    assert.ok(db().approvals.some((a) => a.refId === 'T-101' && a.decision === 'approved'));
    assert.equal((await as(EXEC).post('/tasks/T-101/transition', { to: 'closed' })).status, 200);
  });
  it('officers get 404 (not 403) for tasks outside their scope — never leak what exists', async () => {
    assert.equal((await as(WARD).post('/tasks/T-107/evidence', { count: 1 })).status, 404);
  });
});

describe('nudge cap (BR-013)', () => {
  it('returns 409 at the weekly cap', async () => {
    assert.equal((await as(PA).post('/tasks/T-105/nudge')).status, 409);
    assert.equal((await as(PA).post('/tasks/T-103/nudge')).status, 204);
  });
});

describe('appointments, absence & approvals', () => {
  it('reserved categories: PA gets 403, executive approves and an event is created', async () => {
    assert.equal((await as(PA).post('/appointment-requests/AR-1040/approve', { slot: new Date().toISOString() })).status, 403);
    const before = db().calendar.length;
    assert.equal((await as(EXEC).post('/appointment-requests/AR-1040/approve', { slot: new Date(Date.now() + 86400000).toISOString() })).status, 204);
    assert.equal(db().calendar.length, before + 1);
    assert.ok(db().approvals.some((a) => a.refId === 'AR-1040'));
    assert.equal((await as(EXEC).post('/appointment-requests/AR-1040/approve', { slot: new Date().toISOString() })).status, 409);
  });
  it('PA cannot record their own delegation; absence without delegation holds PA approvals (409)', async () => {
    assert.equal((await as(PA).put('/absence', { active: true, delegationRecord: 'mine', heldItems: 0, visitorMessage: 'x' })).status, 403);
    assert.equal((await as(EXEC).put('/absence', { active: true, heldItems: 0, visitorMessage: 'Away' })).status, 204);
    assert.equal((await as(PA).post('/appointment-requests/AR-1042/approve', { slot: new Date().toISOString() })).status, 409);
    assert.equal((await as(EXEC).put('/absence', { active: false, heldItems: 0, visitorMessage: 'Away' })).status, 204);
    assert.equal((await as(PA).post('/appointment-requests/AR-1042/approve', { slot: new Date().toISOString() })).status, 204);
  });
  it('Decide approvals are executive-only unless delegated', async () => {
    assert.equal((await as(PA).post('/decide/D-2/approve')).status, 403);
    assert.equal((await as(EXEC).post('/decide/D-2/approve')).status, 204);
    assert.equal(db().drafts.find((d) => d.id === 'DR-201')!.status, 'approved');
  });
  it('approving minutes creates a task per action item', async () => {
    const n = db().tasks.length;
    assert.equal((await as(EXEC).post('/decide/D-3/approve')).status, 204);
    assert.equal(db().tasks.length, n + 1); // MT-04 has 2 actions, one already linked to T-106
    assert.equal(db().meetings.find((m) => m.id === 'MT-04')!.minutesStatus, 'approved');
  });
});

describe('drafts & sends (AI-FR-004, DEC-010)', () => {
  it('only approved drafts send; SMS blocked without approved sender ID', async () => {
    assert.equal((await as(PA).post('/drafts/DR-202/send')).status, 409);
    const sms = await as(PA).put('/drafts/DR-203', { title: 'Reply', body: 'b', channel: 'sms' });
    assert.equal(sms.body.status, 'draft'); // editing an approved draft returns it to draft
    assert.equal((await as(PA).post('/drafts/DR-201/send')).status, 204); // approved above via Decide
  });
  it('sms with unapproved sender is blocked with 409', async () => {
    const d = await as(PA).post('/drafts', { title: 't', body: 'b', channel: 'sms' });
    db().drafts.find((x) => x.id === d.body.id)!.status = 'approved';
    const r = await as(PA).post(`/drafts/${d.body.id}/send`);
    assert.equal(r.status, 409);
    assert.match(r.body.message, /DEC-010/);
  });
});

describe('documents & data classes', () => {
  it('RES is masked and 403 for non-executives; executive reads are audited', async () => {
    const list = await as(PA).get('/documents');
    const res = list.body.find((d: { id: string }) => d.id === 'DOC-15');
    assert.equal(res.title, 'Restricted document');
    assert.equal((await as(PA).get('/documents/DOC-15')).status, 403);
    assert.equal(db().audit[0].action, 'read.denied');
    assert.equal((await as(EXEC).get('/documents/DOC-15')).status, 200);
    assert.equal(db().audit[0].action, 'read.document');
  });
});

describe('calendar', () => {
  it('409 on clash unless overrideReason', async () => {
    const ev = db().calendar.find((e) => e.type === 'meeting')!;
    const body = { title: 'Clash', type: 'meeting', start: ev.start, end: ev.end };
    assert.equal((await as(PA).post('/calendar', body)).status, 409);
    assert.equal((await as(PA).post('/calendar', { ...body, overrideReason: 'urgent' })).status, 201);
  });
});

describe('governance', () => {
  it('CSR → Execution requires an approval ref (422)', async () => {
    assert.equal((await as(PM).post('/gov/csr/CSR-01/stage', { stage: 'Execution' })).status, 422);
    assert.equal((await as(PM).post('/gov/csr/CSR-01/stage', { stage: 'Execution', approvalRef: 'SC/1' })).status, 204);
  });
  it('declaring an emergency pauses the queue', async () => {
    assert.equal((await as(EXEC).post('/gov/emergency', { title: 'Flood', kind: 'Flood', summary: 's' })).status, 201);
    assert.equal(db().queuePaused, true);
    assert.equal((await as(PA).post('/queue/call-next')).status, 409);
    assert.equal((await as(EXEC).post('/gov/emergency/close', { closingNote: 'done' })).status, 204);
    assert.equal((await as(PA).post('/queue/pause', { paused: false })).status, 204);
  });
});

describe('queue & public', () => {
  it('requires the privacy notice; offline tokens use L-', async () => {
    assert.equal((await as(RECEPTION).post('/queue', { name: 'A', category: 'Health', ward: 'W1', purpose: 'p', noticeRead: false })).status, 422);
    const r = await as(RECEPTION).post('/queue', { name: 'A', category: 'Health', ward: 'W1', purpose: 'p', noticeRead: true, offline: true });
    assert.match(r.body.token, /^L-\d\d$/);
  });
  it('public submit + status exposes status only', async () => {
    const r = await call('POST', '/public/appointment-requests', { name: 'Test Person', mobile: '9876543210', category: 'Roads', ward: 'W2', purpose: 'p', lang: 'en' });
    assert.equal(r.status, 201);
    const s = await call('GET', `/public/status/${r.body.ref}`);
    assert.deepEqual(Object.keys(s.body).sort(), ['kind', 'ref', 'status'].sort());
    assert.equal((await call('GET', '/public/status/NOPE')).body, null);
  });
});

describe('private environment isolation', () => {
  it('official tokens cannot open /private and private tokens cannot open official data', async () => {
    assert.equal((await as(EXEC).get('/private/dashboard')).status, 401);
    assert.equal((await as(PRIVATE).get('/tasks')).status, 401);
    assert.equal((await as(PRIVATE).get('/private/dashboard')).status, 200);
  });
  it('blockWork projects only an opaque Busy block into the official calendar', async () => {
    const start = new Date(Date.now() + 9 * 86400000).toISOString();
    const end = new Date(Date.now() + 9 * 86400000 + 3600000).toISOString();
    const fe = await as(PRIVATE).post('/private/family-events', { title: 'Secret thing', start, end, blockWork: true, who: 'Self' });
    const cal = (await as(EXEC).get('/calendar')).body as { title: string; start: string }[];
    const block = cal.find((e) => e.start === start)!;
    assert.deepEqual(Object.keys(block).sort(), ['end', 'id', 'start', 'title', 'type']);
    assert.equal(block.title, 'Busy');
    assert.ok(!JSON.stringify(cal).includes('Secret thing'));
    await as(PRIVATE).post(`/private/family-events/${fe.body.id}/toggle-block`);
    assert.ok(!(await as(EXEC).get('/calendar')).body.some((e: { start: string }) => e.start === start));
  });
});

describe('platform', () => {
  it('ROLE-03 may change office items only', async () => {
    const cfg = (await as(ADMIN3).get('/admin/config')).body;
    assert.equal((await as(ADMIN3).put('/admin/config', { ...cfg, aiEnabled: !cfg.aiEnabled })).status, 403);
    assert.equal((await as(ADMIN3).put('/admin/config', { ...cfg, officeHours: { ...cfg.officeHours, from: '10:00' } })).status, 204);
  });
  it('only ROLE-08 grants roles, and writes an approval record', async () => {
    assert.equal((await as(ADMIN3).post('/admin/access-requests/RQ-21/approve')).status, 403);
    assert.equal((await as(SYSADMIN).post('/admin/access-requests/RQ-21/approve')).status, 204);
    assert.ok(db().approvals.some((a) => a.refId === 'RQ-21'));
  });
  it('hash chain verifies, and detects tampering', async () => {
    const ok = await as(AUDITOR).post('/audit/verify');
    assert.equal(ok.body.ok, true);
    assert.ok(ok.body.checked > 9);
    const victim = db().audit[db().audit.length - 3];
    const original = victim.object;
    victim.object = 'tampered';
    const bad = await as(AUDITOR).post('/audit/verify');
    assert.equal(bad.body.ok, false);
    victim.object = original;
  });
  it('AI: policy refusal is logged even with no provider keys; otherwise 503', async () => {
    const refused = await as(EXEC).post('/ai/chat', { feature: 'Ask', messages: [{ role: 'user', content: 'Please sanction the bill' }] });
    assert.equal(refused.body.provider, 'guardrail');
    assert.equal(db().aiLog[0].outcome, 'refused');
    assert.equal((await as(EXEC).post('/ai/chat', { feature: 'Ask', messages: [{ role: 'user', content: 'Summarise my day' }] })).status, 503);
    assert.equal((await as(RECEPTION).post('/ai/chat', { feature: 'Ask', messages: [{ role: 'user', content: 'x' }] })).status, 403);
  });
});
