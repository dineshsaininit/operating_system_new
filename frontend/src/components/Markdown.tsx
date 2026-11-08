import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Normalises model output: strips zero-width chars and maps non-breaking hyphens so IDs like T‑101 match. */
export const cleanAi = (t: string) => t.replace(/[​-‍﻿]/g, '').replace(/[‐‑‒–]/g, '-');

const routeFor = (id: string) =>
  id.startsWith('T-') ? `/exec/tasks?open=${id}` : id.startsWith('AR-') ? '/exec/decide' : id.startsWith('EV-') ? '/exec/calendar'
    : id.startsWith('DL-') ? '/gov/decisions' : /^W\d$/.test(id) ? '/gov/zone' : id.startsWith('DOC-') ? '/exec/documents' : '#';

/** Inline: **bold**, *italic*, `code`, and [ID] citations as clickable chips. */
function inline(text: string, key: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[A-Z]{1,3}-[A-Z0-9-]+\])/g);
  return parts.map((p, i) => {
    const k = `${key}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={k} className="font-semibold text-ink">{inline(p.slice(2, -2), k)}</strong>;
    if (/^\*[^*]+\*$/.test(p)) return <em key={k}>{p.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(p)) return <code key={k} className="rounded bg-surface px-1 font-mono text-[12px] ring-1 ring-line">{p.slice(1, -1)}</code>;
    const m = p.match(/^\[([A-Z]{1,3}-[A-Z0-9-]+)\]$/);
    if (m) return <Link key={k} to={routeFor(m[1])} className="mx-0.5 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-px font-mono text-[11px] font-semibold text-primary transition hover:bg-primary/20">{m[1]}</Link>;
    return <Fragment key={k}>{p}</Fragment>;
  });
}

/** Minimal, safe Markdown renderer for AI answers (no HTML injection — everything is rendered as React text). */
export function Markdown({ text }: { text: string }) {
  const lines = cleanAi(text).split('\n');
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => { if (list.length) { out.push(<ul key={`ul-${out.length}`} className="my-1.5 space-y-1 pl-1">{list}</ul>); list = []; } };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) { list.push(<li key={i} className="flex gap-2"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><span>{inline(bullet[1], `l${i}`)}</span></li>); return; }
    flush();
    if (!line.trim()) { out.push(<div key={i} className="h-2" />); return; }
    const h = line.match(/^#{1,4}\s+(.*)$/);
    if (h) { out.push(<p key={i} className="mt-1 font-semibold text-ink">{inline(h[1], `h${i}`)}</p>); return; }
    if (/^\|.*\|$/.test(line)) { if (/^\|[\s:|-]+\|$/.test(line)) return; out.push(<p key={i} className="font-mono text-xs">{inline(line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()).join('  ·  '), `t${i}`)}</p>); return; }
    out.push(<p key={i}>{inline(line, `p${i}`)}</p>);
  });
  flush();
  return <div className="space-y-0.5 leading-relaxed">{out}</div>;
}
