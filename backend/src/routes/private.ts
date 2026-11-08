/**
 * Private Wealth & Life OS (SCR-46–53) — a separate service.
 *  - Its own store (private.json) and its own session table: official tokens are not recognised here.
 *  - It never reads official stores. Its ONLY outbound effect is an opaque `Busy` block on the official
 *    calendar (start/end only — no title, attendees or category), via projectBusy/removeBusy.
 *  - Vault: the server stores ciphertext only. In this demo only file metadata is posted.
 * In production, run this router as its own process with its own identity provider and keys.
 */
import { Router } from 'express';
import type { Expense, FamilyEvent, Holding } from '../../../frontend/src/types/index.js';
import { attachPrivateSession, allow, PRIVATE_ROLE } from '../auth.js';
import { find } from '../domain.js';
import { fail, requireFields } from '../errors.js';
import { db, pdb, save, savePrivate } from '../store.js';
import { now, uid } from '../util.js';

export const priv = Router();
priv.use(attachPrivateSession, allow(PRIVATE_ROLE));
// Persist the private store after every mutating request.
priv.use((req, res, next) => { res.on('finish', () => { if (req.method !== 'GET' && res.statusCode < 500) savePrivate(); }); next(); });

const p = () => pdb();
const blockId = (familyEventId: string) => `EV-P-${familyEventId}`;

/** The one-way projection into the official calendar. Writes start/end only. */
function projectBusy(fe: FamilyEvent) {
  const cal = db().calendar;
  if (!cal.some((c) => c.id === blockId(fe.id))) cal.push({ id: blockId(fe.id), title: 'Busy', type: 'busy', start: fe.start, end: fe.end });
  save();
}
function removeBusy(fe: FamilyEvent) {
  // Also removes seed-era blocks that were created before ids were linked (same window, type busy).
  db().calendar = db().calendar.filter((c) => c.id !== blockId(fe.id) && !(c.type === 'busy' && c.start === fe.start && c.end === fe.end));
  save();
}

priv.get('/dashboard', (_req, res) => { res.json({ dues: p().privateDues, holdings: p().holdings, liabilities: p().liabilities }); });

const HOLDING_KINDS = ['Equity', 'Mutual fund', 'Deposit', 'PF', 'Bond', 'Gold', 'Bank'];
priv.get('/holdings', (_req, res) => { res.json(p().holdings); });
priv.post('/holdings', (req, res) => {
  requireFields(req.body, 'name', 'kind', 'owner');
  const b = req.body as Omit<Holding, 'id'>;
  if (!HOLDING_KINDS.includes(b.kind)) fail(422, 'Invalid kind', { kind: HOLDING_KINDS.join(', ') });
  const value = Number(b.value);
  if (!Number.isFinite(value) || value < 0) fail(422, 'value must be a non-negative number', { value: 'Number ≥ 0' });
  const h: Holding = { id: uid('H'), name: String(b.name), kind: b.kind, owner: String(b.owner), value, asOf: b.asOf || now() };
  p().holdings.push(h);
  res.status(201).json(h);
});

priv.get('/liabilities', (_req, res) => { res.json({ loans: p().liabilities, policies: p().policies }); });

priv.get('/vault', (_req, res) => { res.json(p().vault); });
priv.post('/vault/:id/files', (req, res) => {
  const f = find(p().vault, req.params.id, 'Folder');
  requireFields(req.body, 'name');
  const sizeKb = Math.max(0, Number(req.body.sizeKb) || 0);
  const file = { name: String(req.body.name).slice(0, 200), sizeKb, addedAt: now() };
  f.files.push(file);
  res.status(201).json(file);
});

priv.get('/family-events', (_req, res) => { res.json(p().familyEvents); });
priv.post('/family-events', (req, res) => {
  requireFields(req.body, 'title', 'start', 'end');
  const b = req.body as Omit<FamilyEvent, 'id'>;
  if (isNaN(+new Date(b.start)) || isNaN(+new Date(b.end)) || new Date(b.end) <= new Date(b.start)) fail(422, 'start/end must be ISO-8601 and end after start');
  const fe: FamilyEvent = { id: uid('FE'), title: String(b.title), start: b.start, end: b.end, blockWork: !!b.blockWork, who: String(b.who || 'Self') };
  p().familyEvents.push(fe);
  if (fe.blockWork) projectBusy(fe);
  res.status(201).json(fe);
});
priv.post('/family-events/:id/toggle-block', (req, res) => {
  const fe = find(p().familyEvents, req.params.id, 'Event');
  fe.blockWork = !fe.blockWork;
  if (fe.blockWork) projectBusy(fe); else removeBusy(fe);
  res.json(fe);
});

priv.get('/expenses', (_req, res) => { res.json(p().expenses); });
priv.post('/expenses', (req, res) => {
  requireFields(req.body, 'date', 'category');
  const b = req.body as Omit<Expense, 'id'>;
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) fail(422, 'amount must be a positive number', { amount: 'Number > 0' });
  const e: Expense = { id: uid('EX'), date: b.date, category: String(b.category), amount, note: String(b.note ?? '') };
  p().expenses.unshift(e);
  res.status(201).json(e);
});

priv.get('/compliance', (_req, res) => { res.json(p().compliance); });
