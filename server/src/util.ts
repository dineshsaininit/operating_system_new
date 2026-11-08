import { randomBytes } from 'node:crypto';

/** ISO timestamp for today + dayOffset at HH:MM (server local time). Same semantics as the frontend helper. */
export function at(dayOffset: number, hhmm = '09:00'): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export const minutesAgo = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
export const now = () => new Date().toISOString();

/** Short random id with a prefix, e.g. `EV-K3J9QZ`. */
export const uid = (prefix = 'ID') => `${prefix}-${randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`;

/** Next sequential id for ids shaped like `T-114` / `AR-1043` / `DL-033`. */
export function nextSeq(ids: string[], prefix: string, start: number, pad = 0): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  const max = ids.reduce((m, id) => { const x = re.exec(id); return x ? Math.max(m, Number(x[1])) : m; }, start - 1);
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
}

export const clone = <T>(v: T): T => (v === undefined ? v : structuredClone(v));

export const OPEN_TASK = (state: string) => !['closed', 'verified', 'cancelled'].includes(state);
