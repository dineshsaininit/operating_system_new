/**
 * Persistence. Two physically separate JSON stores:
 *   - official.json  → Executive / Governance / Platform data
 *   - private.json   → Private Wealth & Life OS (ARC-04: separate store, never read by official code)
 *
 * Writes are atomic (write temp file, then rename). The dataset is small and Node is single-threaded,
 * so a synchronous save after every mutating request is simple and safe. Swap this module for a real
 * database (Postgres etc.) without touching the routes: they only use `db()` / `save()`.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { AppNotification, RoleId, Session } from '../../src/types/index.js';
import { config } from './config.js';
import { createSeed, type Seed } from './seed.js';
import { rechain } from './audit.js';

const PRIVATE_KEYS = ['privateDues', 'holdings', 'liabilities', 'policies', 'vault', 'familyEvents', 'expenses', 'compliance'] as const;
type PrivateKey = (typeof PRIVATE_KEYS)[number];

/** ENT-37 ApprovalRecord — written for every approval and rejection. */
export interface ApprovalRecord {
  id: string;
  at: string;
  kind: string;
  refId: string;
  decision: 'approved' | 'rejected';
  by: string;
  role: RoleId;
  reason?: string;
  delegationRecord?: string;
}

export interface StoredSession extends Session {
  lastSeenAt: string;
  expiresAt: string;
}

/** Notifications carry an audience on the server so reception never sees the executive's whispers. */
export type StoredNotification = AppNotification & { audience?: RoleId[] };

export type OfficialDb = Omit<Seed, PrivateKey | 'notifications'> & {
  notifications: StoredNotification[];
  sessions: Record<string, StoredSession>;
  approvals: ApprovalRecord[];
  queuePaused: boolean;
  /** ISO week the nudge counters belong to (BR-013 weekly reset). */
  nudgeWeek?: string;
  breakGlass: { id: string; at: string; by: string; reason: string; minutes: number; status: 'pending' | 'approved' | 'rejected' }[];
  seededAt: string;
};

/** The private store keeps its own sessions: an official token can never open private data and vice versa. */
export type PrivateDb = Pick<Seed, PrivateKey> & { sessions: Record<string, StoredSession>; seededAt: string };

class JsonStore<T> {
  private data!: T;
  constructor(private file: string, private fresh: () => T) {}

  load() {
    if (existsSync(this.file)) {
      try { this.data = JSON.parse(readFileSync(this.file, 'utf8')); return this; } catch (e) {
        console.warn(`[store] ${path.basename(this.file)} is corrupt (${(e as Error).message}); reseeding`);
      }
    }
    this.data = this.fresh();
    this.save();
    return this;
  }
  get() { return this.data; }
  save() {
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 1));
    renameSync(tmp, this.file);
  }
  reset() { this.data = this.fresh(); this.save(); }
}

const ALL_OFFICIAL: RoleId[] = ['ROLE-01', 'ROLE-02'];

function freshOfficial(): OfficialDb {
  const s = createSeed();
  const { privateDues, holdings, liabilities, policies, vault, familyEvents, expenses, compliance, notifications, ...rest } = s;
  void privateDues; void holdings; void liabilities; void policies; void vault; void familyEvents; void expenses; void compliance;
  return {
    ...rest,
    audit: rechain(rest.audit),
    notifications: notifications.map((n) => ({ ...n, audience: ALL_OFFICIAL })),
    sessions: {},
    approvals: [],
    queuePaused: false,
    breakGlass: [],
    seededAt: new Date().toISOString(),
  };
}

function freshPrivate(): PrivateDb {
  const s = createSeed();
  return { privateDues: s.privateDues, holdings: s.holdings, liabilities: s.liabilities, policies: s.policies, vault: s.vault, familyEvents: s.familyEvents, expenses: s.expenses, compliance: s.compliance, sessions: {}, seededAt: new Date().toISOString() };
}

let official: JsonStore<OfficialDb>;
let priv: JsonStore<PrivateDb>;

export function initStores(dataDir = config.dataDir) {
  official = new JsonStore(path.join(dataDir, 'official.json'), freshOfficial).load();
  priv = new JsonStore(path.join(dataDir, 'private.json'), freshPrivate).load();
}

export const db = () => official.get();
export const save = () => official.save();
export const pdb = () => priv.get();
export const savePrivate = () => priv.save();

/** Restore the synthetic dataset. Active sessions are kept so the person who pressed "reset" stays signed in. */
export function resetAll() {
  const sessions = official.get().sessions, privSessions = priv.get().sessions;
  official.reset();
  priv.reset();
  official.get().sessions = sessions;
  priv.get().sessions = privSessions;
  official.save();
  priv.save();
}
