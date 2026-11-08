/**
 * Append-only, hash-chained audit ledger (PLT-M02).
 * Each event stores sha256(prevHash + canonical JSON of the event body). The list is kept newest-first
 * (the order the UI expects), so the chain runs from the end of the array to the start.
 */
import { createHash } from 'node:crypto';
import type { AuditEvent, RoleId } from '../../src/types/index.js';
import { db } from './store.js';
import { nextSeq, now } from './util.js';

export const GENESIS = '0'.repeat(64);

type Body = Omit<AuditEvent, 'hash' | 'prevHash'>;

const body = (e: AuditEvent | Body): Body => ({ id: e.id, at: e.at, actor: e.actor, role: e.role, action: e.action, object: e.object, result: e.result });
const hashOf = (prev: string, b: Body) => createHash('sha256').update(prev + JSON.stringify(b)).digest('hex');

/** Recompute the chain for seed data (newest-first array). */
export function rechain(events: AuditEvent[]): AuditEvent[] {
  const chron = [...events].reverse();
  let prev = GENESIS;
  const out = chron.map((e) => { const b = body(e); const hash = hashOf(prev, b); const ev = { ...b, prevHash: prev, hash }; prev = hash; return ev; });
  return out.reverse();
}

export interface Actor { name: string; role: RoleId | 'SYSTEM' }

export function audit(actor: Actor, action: string, object: string, result: AuditEvent['result'] = 'ok'): string {
  const ledger = db().audit;
  const prev = ledger[0]?.hash ?? GENESIS;
  const b: Body = {
    id: nextSeq(ledger.map((e) => e.id), 'AE', 1, 4),
    at: now(),
    actor: actor.name.replace(' (synthetic)', ''),
    role: actor.role,
    action,
    object,
    result,
  };
  ledger.unshift({ ...b, prevHash: prev, hash: hashOf(prev, b) });
  return b.id;
}

/** Verifies both links (prevHash) and content (hash recomputation), so edits to old events are detected. */
export function verifyChain(): { ok: boolean; checked: number; brokenAt?: string } {
  const chron = [...db().audit].reverse();
  let prev = GENESIS;
  for (const e of chron) {
    if (e.prevHash !== prev || e.hash !== hashOf(prev, body(e))) return { ok: false, checked: chron.length, brokenAt: e.id };
    prev = e.hash;
  }
  return { ok: true, checked: chron.length };
}
