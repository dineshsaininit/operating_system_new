import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { Users, Timer, CheckCircle2, BellRing, Info } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { InfoNote, PageHeader, StatCard, Tabs } from '@/components/ui';
import { AXIS, ChartCard, ChartTooltip, GRID, SERIES } from '@/components/charts';

/**
 * NEW (not in the SRS): baseline metrics. The SRS promises no improvement figures —
 * targets are set only after a measured baseline. This screen is where that baseline is read.
 * Series here are synthetic and deterministic so the demo is stable.
 */
function series(n: number, base: number, amp: number, seed: number) {
  return Array.from({ length: n }, (_, i) => Math.max(0, Math.round(base + amp * Math.sin((i + seed) * 0.9) + ((i * 7 + seed) % 5) - 2)));
}

export default function Insights() {
  const [range, setRange] = useState<'2w' | '6w'>('2w');
  const { data: tasks } = useApi(() => api.tasks.list());
  const { data: requests } = useApi(() => api.requests.list());
  const days = range === '2w' ? 10 : 30;

  const visitors = useMemo(() => {
    const appt = series(days, 7, 2, 1), walk = series(days, 11, 4, 3);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
      return { day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), Appointments: appt[i], 'Walk-ins': walk[i] };
    });
  }, [days]);

  const wait = useMemo(() => {
    const w = series(days, 32, 8, 5);
    return visitors.map((v, i) => ({ day: v.day, 'Median wait': w[i] }));
  }, [visitors, days]);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    (requests ?? []).forEach((r) => { m[r.category] = (m[r.category] ?? 0) + 1; });
    return Object.entries(m).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  }, [requests]);

  const ledger = useMemo(() => {
    const created = series(6, 14, 3, 2), closed = series(6, 11, 3, 4);
    return ['W-5', 'W-4', 'W-3', 'W-2', 'Last wk', 'This wk'].map((w, i) => ({ week: w, Created: created[i], Closed: closed[i] }));
  }, []);

  const totalVisitors = visitors.reduce((n, v) => n + v.Appointments + v['Walk-ins'], 0);
  const medianWait = [...wait].map((w) => w['Median wait']).sort((a, b) => a - b)[Math.floor(wait.length / 2)];
  const open = (tasks ?? []).filter((t) => !['closed', 'verified', 'cancelled'].includes(t.state));
  const onTime = tasks ? Math.round((tasks.filter((t) => ['closed', 'verified'].includes(t.state)).length / Math.max(1, tasks.length)) * 100) : 0;
  const capped = open.filter((t) => t.nudgesThisWeek >= t.nudgeCap).length;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Insights" subtitle="Baseline metrics for the office. Targets are set only after a measured baseline — no improvement figure is promised." screen="NEW" release="P0" env="executive"
        actions={<Tabs value={range} onChange={setRange} items={[{ value: '2w', label: 'Last 2 weeks' }, { value: '6w', label: 'Last 6 weeks' }]} />} />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Visitors served" value={totalVisitors} icon={Users} hint={`${days} working days`} />
        <StatCard label="Median wait" value={`${medianWait} min`} icon={Timer} tone="amber" hint="Arrival → called" />
        <StatCard label="Tasks closed or verified" value={`${onTime}%`} icon={CheckCircle2} tone="green" hint={`${open.length} still open`} />
        <StatCard label="Officers at nudge cap" value={capped} icon={BellRing} tone="red" hint="Escalate, don’t nudge" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Visitors per day" subtitle="Appointments vs walk-ins"
          legend={[{ label: 'Appointments', color: SERIES[0] }, { label: 'Walk-ins', color: SERIES[1] }]}
          table={{ headers: ['Day', 'Appointments', 'Walk-ins'], rows: visitors.map((v) => [v.day, v.Appointments, v['Walk-ins']]) }}>
          <ResponsiveContainer>
            <BarChart data={visitors} barGap={2} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="day" {...AXIS} interval="preserveStartEnd" minTickGap={16} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--muted) / 0.08)' }} />
              <Bar dataKey="Appointments" stackId="v" fill={SERIES[0]} stroke="rgb(var(--surface))" strokeWidth={2} maxBarSize={22} />
              <Bar dataKey="Walk-ins" stackId="v" fill={SERIES[1]} stroke="rgb(var(--surface))" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Median wait time" subtitle="Minutes from arrival to being called"
          table={{ headers: ['Day', 'Median wait (min)'], rows: wait.map((w) => [w.day, w['Median wait']]) }}>
          <ResponsiveContainer>
            <LineChart data={wait} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="day" {...AXIS} interval="preserveStartEnd" minTickGap={16} />
              <YAxis {...AXIS} unit="m" />
              <Tooltip content={<ChartTooltip unit=" min" />} cursor={{ stroke: 'rgb(var(--muted))', strokeDasharray: '3 3' }} />
              <Line type="monotone" dataKey="Median wait" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: 'rgb(var(--surface))', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Commitment ledger" subtitle="Tasks created vs closed per week"
          legend={[{ label: 'Created', color: SERIES[0] }, { label: 'Closed', color: SERIES[2] }]}
          table={{ headers: ['Week', 'Created', 'Closed'], rows: ledger.map((l) => [l.week, l.Created, l.Closed]) }}>
          <ResponsiveContainer>
            <BarChart data={ledger} barGap={2} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="week" {...AXIS} />
              <YAxis {...AXIS} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--muted) / 0.08)' }} />
              <Bar dataKey="Created" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="Closed" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Open requests by category" subtitle="From the request inbox"
          table={{ headers: ['Category', 'Requests'], rows: byCategory.map((c) => [c.category, c.count]) }}>
          <ResponsiveContainer>
            <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 16, left: 40, bottom: 0 }}>
              <CartesianGrid {...GRID} horizontal={false} vertical />
              <XAxis type="number" {...AXIS} allowDecimals={false} />
              <YAxis type="category" dataKey="category" {...AXIS} width={110} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--muted) / 0.08)' }} />
              <Bar dataKey="count" name="Requests" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="mt-5"><InfoNote icon={Info}>Added beyond the SRS. Figures come from the office’s own records (synthetic here). They never profile individual officers or visitors.</InfoNote></div>
    </div>
  );
}
