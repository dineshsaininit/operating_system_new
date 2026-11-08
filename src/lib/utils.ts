import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge our custom colour tokens so `variant` classes can be overridden reliably.
const COLORS = ['bg', 'surface', 'surface-2', 'line', 'ink', 'muted', 'primary', 'primary-soft', 'exec', 'gov', 'priv', 'ai', 'danger', 'warn', 'ok', 'navy-900', 'navy-800', 'navy-700', 'navy-600'];
const twMerge = extendTailwindMerge({ extend: { theme: { colors: COLORS } } });

/** Class combiner: later classes win over earlier conflicting ones. */
export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

/** ISO timestamp for today + dayOffset at HH:MM (local time). */
export function at(dayOffset: number, hhmm = '09:00'): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function minutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

export const fmtDateLong = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

export const fmtDateTime = (iso: string) => `${fmtDate(iso)} · ${fmtTime(iso)}`;

export function isSameDay(a: string | Date, b: string | Date) {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export function daysBetween(fromIso: string, toIso: string = new Date().toISOString()) {
  const a = new Date(fromIso); a.setHours(0, 0, 0, 0);
  const b = new Date(toIso); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function relative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (Math.abs(diff) < 1) return 'just now';
  if (diff > 0) {
    if (diff < 60) return `${Math.round(diff)} min ago`;
    if (diff < 1440) return `${Math.round(diff / 60)} h ago`;
    return `${Math.round(diff / 1440)} d ago`;
  }
  const f = -diff;
  if (f < 60) return `in ${Math.round(f)} min`;
  if (f < 1440) return `in ${Math.round(f / 60)} h`;
  return `in ${Math.round(f / 1440)} d`;
}

export function dueLabel(dueIso: string): { text: string; tone: 'red' | 'amber' | 'green' | 'gray' } {
  const d = daysBetween(dueIso);
  if (d > 0) return { text: `overdue ${d} d`, tone: 'red' };
  if (d === 0) return { text: 'due today', tone: 'amber' };
  if (d >= -3) return { text: `in ${-d} d`, tone: 'amber' };
  return { text: fmtDate(dueIso), tone: 'gray' };
}

export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export const uid = (prefix = 'ID') => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/** Short, non-cryptographic hash used only to visualise the audit hash chain in the mock. */
export function fakeHash(input: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
