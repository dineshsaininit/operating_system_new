/** Shared business helpers used by several route modules. Mirrors the mock behaviour in src/services/api.ts. */
import type { Request } from 'express';
import type { DecideItem, RoleId, Task, TaskState } from '../../src/types/index.js';
import { audit, type Actor } from './audit.js';
import { actorOf, roleOf } from './auth.js';
import { fail } from './errors.js';
import { db, type ApprovalRecord, type StoredNotification } from './store.js';
import { nextSeq, now, uid } from './util.js';

// BR-011 task state machine (identical to TASK_TRANSITIONS in src/services/api.ts)
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

export const TASK_STATES = Object.keys(TASK_TRANSITIONS) as TaskState[];

/** 404 helper. */
export function find<T extends { id: string }>(list: T[], rawId: string | string[], what = 'Record'): T {
  const id = String(rawId);
  const x = list.find((i) => i.id === id);
  if (!x) fail(404, `${what} not found`);
  return x;
}

const EXEC_PA: RoleId[] = ['ROLE-01', 'ROLE-02'];

/** Is "now" inside the Peace Mode quiet window? Interrupt-tier always gets through. */
function inPeaceWindow(): boolean {
  const p = db().peace;
  if (!p.enabled) return false;
  const d = new Date();
  const hhmm = d.getHours() * 60 + d.getMinutes();
  const [fh, fm] = p.from.split(':').map(Number);
  const [th, tm] = p.to.split(':').map(Number);
  const from = fh * 60 + fm, to = th * 60 + tm;
  return from > to ? hhmm >= from || hhmm < to : hhmm >= from && hhmm < to;
}

export function notify(n: Omit<StoredNotification, 'id' | 'at' | 'read' | 'held'>) {
  db().notifications.unshift({
    audience: EXEC_PA,
    ...n,
    id: uid('N'),
    at: now(),
    read: false,
    held: inPeaceWindow() && n.tier !== 'interrupt',
  });
}

export function addDecide(item: Omit<DecideItem, 'id' | 'createdAt' | 'status'>): DecideItem {
  const d: DecideItem = { ...item, id: uid('D'), createdAt: now(), status: 'pending' };
  db().decide.unshift(d);
  return d;
}

export function resolveDecide(refId: string, status: DecideItem['status']) {
  db().decide.filter((d) => d.refId === refId && d.status === 'pending').forEach((d) => (d.status = status));
}

/**
 * Approval gate shared by every approval path (rules 4–6 of the contract):
 *  - No AI or SYSTEM account can approve anything.
 *  - Absence mode without a written delegation record → held (409, BR-049).
 *  - Only ROLE-01, or ROLE-02 acting under a written delegation, may approve executive items.
 * Writes an ENT-37 ApprovalRecord plus an audit event.
 */
export function recordApproval(req: Request, kind: string, refId: string, decision: ApprovalRecord['decision'], opts: { reason?: string; roles?: RoleId[]; delegable?: boolean } = {}) {
  const actor = actorOf(req);
  const role = roleOf(req);
  if (!req.session || (actor.role as string) === 'SYSTEM' || /\b(ai|system|bot)\b/i.test(actor.name)) fail(403, 'Automated accounts cannot approve');
  const a = db().absence;
  const allowed = opts.roles ?? ['ROLE-01'];
  const delegated = opts.delegable !== false && role === 'ROLE-02' && a.active && !!a.delegationRecord;
  if (!allowed.includes(role) && !delegated) fail(403, 'Only the executive (or a written delegate) can decide this');
  if (decision === 'approved' && a.active && !a.delegationRecord && role !== 'ROLE-01') {
    audit(actor, `approval.held`, refId, 'denied');
    fail(409, 'Absence mode: held — no written delegation record (BR-049)');
  }
  const rec: ApprovalRecord = {
    id: nextSeq(db().approvals.map((x) => x.id), 'APR', 1, 5),
    at: now(), kind, refId, decision, by: actor.name, role, reason: opts.reason,
    delegationRecord: delegated ? a.delegationRecord : undefined,
  };
  db().approvals.unshift(rec);
  return rec;
}

export function nextTaskId() {
  return nextSeq(db().tasks.map((t) => t.id), 'T', 101);
}

export function newTask(actor: Actor, t: Partial<Task> & Pick<Task, 'title' | 'ownerPost' | 'due'>, state: TaskState = 'assigned'): Task {
  const at = now();
  const history: Task['history'] = state === 'assigned' && !t.history
    ? [{ state: 'assigned', at, by: actor.name }]
    : [{ state: 'draft', at, by: actor.name }];
  return {
    id: nextTaskId(),
    source: 'Manual',
    verificationRequired: false,
    evidence: 0,
    nudgesThisWeek: 0,
    nudgeCap: 3,
    priority: 'normal',
    createdBy: actor.name,
    createdAt: at,
    history,
    ...t,
    state,
  };
}

/** Scope for officer roles: ROLE-05 sees its ward, ROLE-06 sees its department's posts. */
export function officerScope(req: Request): ((t: Task) => boolean) | null {
  const u = req.session!.user;
  if (u.role === 'ROLE-05') { const ward = u.scope.replace(/^Ward\s+/i, '').trim(); return (t) => t.ward === ward || t.ownerPost.includes(ward); }
  if (u.role === 'ROLE-06') { const dept = u.scope.replace(/\s*\(.*\)\s*$/, '').trim(); return (t) => t.ownerPost.toLowerCase().includes(dept.toLowerCase()); }
  return null;
}

/** ISO week key, used to reset the weekly nudge counter (BR-013). */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7)}`;
}

/** Strips server-only fields before sending a notification to the client. */
export const publicNotification = ({ audience: _a, ...n }: StoredNotification) => n;
