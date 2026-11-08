import { useState, type ReactNode } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { Card } from './ui';
import { cn } from '@/lib/utils';

/** Recessive axis/grid styling shared by every chart (thin marks, quiet grid). */
export const AXIS = { stroke: 'rgb(var(--muted))', fontSize: 11, tickLine: false, axisLine: false } as const;
export const GRID = { stroke: 'var(--grid)', strokeDasharray: '0', vertical: false } as const;
export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

export function ChartTooltip({ active, payload, label, unit = '' }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-ink">{p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}

/** Card wrapper with a chart/table toggle so every chart has an accessible table view. */
export function ChartCard({ title, subtitle, children, table, legend }: { title: string; subtitle?: string; children: ReactNode; table: { headers: string[]; rows: (string | number)[][] }; legend?: { label: string; color: string }[] }) {
  const [mode, setMode] = useState<'chart' | 'table'>('chart');
  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <div className="flex rounded-lg bg-surface-2 p-0.5 ring-1 ring-line">
          {(['chart', 'table'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} aria-label={`${m} view`} className={cn('rounded-md p-1.5', mode === m ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>
              {m === 'chart' ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>
      {legend && legend.length > 1 && mode === 'chart' && (
        <div className="flex flex-wrap gap-4 px-5 pt-3">
          {legend.map((l) => <span key={l.label} className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />{l.label}</span>)}
        </div>
      )}
      <div className="flex-1 p-3 pt-2">
        {mode === 'chart' ? <div className="h-64">{children}</div> : (
          <div className="max-h-64 overflow-auto">
            <table className="table-base">
              <thead><tr>{table.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'tabular-nums' : ''}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
