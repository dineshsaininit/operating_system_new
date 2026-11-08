/**
 * Identity, sessions and RBAC (SEC-FR-003, NFR-029).
 * The UI hides buttons by role, but that is UX only: every route below declares the roles it allows.
 */
import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { RoleId } from '../../frontend/src/types/index.js';
import { audit, type Actor } from './audit.js';
import { config } from './config.js';
import { fail } from './errors.js';
import { db, pdb, save, savePrivate, type StoredSession } from './store.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request { session?: StoredSession }
  }
}

export const COOKIE = 'aasiom_sid';
export const PRIVATE_ROLE: RoleId = 'ROLE-11';

/** Role groups mirroring src/config/navigation.ts. */
export const R = {
  EXEC: ['ROLE-01'] as RoleId[],
  PA: ['ROLE-02'] as RoleId[],
  EXEC_PA: ['ROLE-01', 'ROLE-02'] as RoleId[],
  OFFICERS: ['ROLE-05', 'ROLE-06'] as RoleId[],
  OFFICIAL: ['ROLE-01', 'ROLE-02', 'ROLE-03', 'ROLE-04', 'ROLE-05', 'ROLE-06', 'ROLE-07', 'ROLE-08', 'ROLE-09', 'ROLE-10'] as RoleId[],
};

export const actorOf = (req: Request): Actor => req.session ? { name: req.session.user.name, role: req.session.user.role } : { name: 'anonymous', role: 'ROLE-12' };
export const roleOf = (req: Request): RoleId => req.session?.user.role ?? 'ROLE-12';

function tokenFrom(req: Request): string | undefined {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7).trim();
  return req.cookies?.[COOKIE];
}

function lookup(table: Record<string, StoredSession>, token: string | undefined): StoredSession | undefined {
  if (!token) return undefined;
  const s = table[token];
  if (!s) return undefined;
  if (new Date(s.expiresAt) < new Date()) { delete table[token]; return undefined; }
  return s;
}

/** Attaches the session if a valid official token is present. Does not reject. */
export const attachSession: RequestHandler = (req, _res, next) => {
  req.session = lookup(db().sessions, tokenFrom(req));
  next();
};

/** Attaches a session from the private store only (used by the /private service). */
export const attachPrivateSession: RequestHandler = (req, _res, next) => {
  req.session = lookup(pdb().sessions, tokenFrom(req));
  next();
};

/** Route guard: 401 without a session, 403 (audited) for a role outside `roles`. */
export function allow(...roles: RoleId[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session) fail(401, 'Session expired — please sign in again');
    if (!roles.includes(req.session.user.role)) {
      audit(actorOf(req), 'access.denied', `${req.method} ${req.baseUrl}${req.path}`, 'denied');
      save();
      fail(403, 'You are not permitted to do this');
    }
    next();
  };
}

/** Inline check inside a handler (for rules that depend on the record, e.g. RES documents). */
export function deny(req: Request, object: string, message = 'You are not permitted to do this'): never {
  audit(actorOf(req), 'access.denied', object, 'denied');
  save();
  fail(403, message);
}

export function createSession(role: RoleId, deviceName: string): StoredSession {
  const official = role !== PRIVATE_ROLE;
  const user = db().users.find((u) => u.role === role && u.status === 'active');
  if (!user) fail(401, 'No active account for this role');
  const token = randomBytes(32).toString('hex');
  const t = new Date();
  const session: StoredSession = {
    user: { ...user, lastSignIn: t.toISOString() },
    token,
    deviceName,
    signedInAt: t.toISOString(),
    lastSeenAt: t.toISOString(),
    expiresAt: new Date(t.getTime() + config.sessionTtlHours * 3600_000).toISOString(),
  };
  user.lastSignIn = t.toISOString();
  if (official) db().sessions[token] = session;
  else { pdb().sessions[token] = session; savePrivate(); }
  return session;
}

export function destroySession(token: string | undefined) {
  if (!token) return;
  delete db().sessions[token];
  if (pdb().sessions[token]) { delete pdb().sessions[token]; savePrivate(); }
}

export const tokenOf = tokenFrom;
