import { useEffect, useState } from 'react';
import { Moon, BellRing, Lock, Save, Plane, FileWarning, MessageSquareText, Clock } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, CardHeader, Field, InfoNote, Input, PageHeader, Select, SkeletonList, Textarea, Toggle } from '@/components/ui';
import { TIER_META } from '@/components/domain';
import { cn } from '@/lib/utils';
import type { AbsenceState, PeaceSettings, Tier } from '@/types';

export function PeaceModeSettings() {
  const { data, loading } = useApi(() => api.peace.get());
  const { run } = useToast();
  const [p, setP] = useState<PeaceSettings | null>(null);
  useEffect(() => { if (data) setP(data); }, [data]);
  if (loading || !p) return <Card><SkeletonList /></Card>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Notifications & Peace Mode" subtitle="Control interruptions. Only you can change these settings." screen="SCR-15" release="P0" env="executive"
        actions={<Button icon={Save} onClick={() => run(api.peace.save(p), 'Settings saved')}>Save</Button>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-800 p-6 text-white">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <Moon className="h-8 w-8 text-indigo-200" />
            <p className="mt-3 text-xl font-bold">Peace Mode</p>
            <p className="text-sm text-indigo-200">Only Interrupt items reach you</p>
            <div className="mt-4"><Toggle checked={p.enabled} onChange={(v) => setP({ ...p, enabled: v })} label={<span className="text-white">{p.enabled ? 'ON' : 'OFF'}</span>} /></div>
          </div>
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="From"><Input type="time" value={p.from} onChange={(e) => setP({ ...p, from: e.target.value })} /></Field>
              <Field label="To"><Input type="time" value={p.to} onChange={(e) => setP({ ...p, to: e.target.value })} /></Field>
            </div>
            <Toggle checked={p.duringFocus} onChange={(v) => setP({ ...p, duringFocus: v })} label="Also during focus blocks" description="Focus blocks behave like Peace Mode" />
            <Field label="End-of-day digest time" hint="Held items are delivered together at this time"><Input type="time" value={p.digestTime} onChange={(e) => setP({ ...p, digestTime: e.target.value })} /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Tier per category" subtitle="Interrupt · Normal · Digest" icon={BellRing} />
          <div className="divide-y divide-line">
            {p.categories.map((c, i) => (
              <div key={c.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  {c.fixed && <p className="flex items-center gap-1 text-[11px] text-muted"><Lock className="h-3 w-3" /> Fixed — always Interrupt</p>}
                </div>
                <div className="flex gap-1 rounded-lg bg-surface-2 p-1 ring-1 ring-line">
                  {(['interrupt', 'normal', 'digest'] as Tier[]).map((t) => (
                    <button key={t} disabled={c.fixed} onClick={() => setP({ ...p, categories: p.categories.map((x, j) => (j === i ? { ...x, tier: t } : x)) })}
                      className={cn('rounded-md px-2.5 py-1 text-xs font-semibold capitalize disabled:cursor-not-allowed', c.tier === t ? (t === 'interrupt' ? 'bg-danger text-white' : t === 'normal' ? 'bg-primary text-white' : 'bg-slate-500 text-white') : 'text-muted')}>{t}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 border-t border-line p-5">
            {(Object.keys(TIER_META) as Tier[]).map((t) => <p key={t} className="flex items-center gap-2 text-xs text-muted"><Badge tone={TIER_META[t].tone}>{TIER_META[t].label}</Badge>{TIER_META[t].description}</p>)}
          </div>
        </Card>
      </div>
      <div className="mt-5"><InfoNote>Lock-screen and watch text is always generic; details open in the app after unlock.</InfoNote></div>
    </div>
  );
}

export function AbsenceDelegation() {
  const { session } = useApp();
  const { data, loading } = useApi(() => api.absence.get());
  const { run } = useToast();
  const [a, setA] = useState<AbsenceState | null>(null);
  useEffect(() => { if (data) setA(data); }, [data]);
  if (loading || !a) return <Card><SkeletonList /></Card>;
  const isPA = session!.user.role === 'ROLE-02';

  return (
    <div className="animate-fade-in">
      <PageHeader title="Absence & delegation" subtitle="Set an absence period and see how items are routed. Without a written delegation record, items are held — never routed." screen="SCR-62" release="P0" env="executive" />
      {isPA && <div className="mb-4"><InfoNote tone="amber">You are setting absence on the executive’s instruction. This is recorded with your name.</InfoNote></div>}
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader title="Absence period" icon={Plane} action={<Badge tone={a.active ? 'purple' : 'gray'} dot>{a.active ? 'Active' : 'Off'}</Badge>} />
          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From"><Input type="date" value={a.from?.slice(0, 10) ?? ''} onChange={(e) => setA({ ...a, from: e.target.value })} /></Field>
              <Field label="To"><Input type="date" value={a.to?.slice(0, 10) ?? ''} onChange={(e) => setA({ ...a, to: e.target.value })} /></Field>
            </div>
            <Field label="Delegation record (reference only)" hint="Reference to a written delegation order. The system never creates delegation itself (BR-049).">
              <Select value={a.delegationRecord ?? ''} onChange={(e) => setA({ ...a, delegationRecord: e.target.value || undefined })}>
                <option value="">None — hold all items</option>
                <option value="ORD/Z2/2026/031 (synthetic)">ORD/Z2/2026/031 (synthetic) — AC W2 for appointments</option>
              </Select>
            </Field>
            <Field label="Visitor message preview"><Textarea value={a.visitorMessage} onChange={(e) => setA({ ...a, visitorMessage: e.target.value })} /></Field>
            <div className="flex gap-2">
              {!a.active ? (
                <Button icon={Plane} disabled={!a.from || !a.to} onClick={() => run(api.absence.set({ ...a, active: true }), 'Absence mode started')}>Start absence</Button>
              ) : (
                <Button variant="danger" onClick={() => run(api.absence.set({ ...a, active: false }), 'Absence mode ended', 'Held items return to normal routing')}>End absence</Button>
              )}
            </div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Held items</p>
            <p className="mt-1 text-4xl font-extrabold">{a.heldItems}</p>
            <p className="text-sm text-muted">{a.active ? 'Requests and decisions waiting for return' : 'Absence is off'}</p>
          </Card>
          {!a.delegationRecord ? (
            <InfoNote tone="amber" icon={FileWarning}>No delegation record → hold-only. The PA is notified of each held item; nothing is approved on the executive’s behalf.</InfoNote>
          ) : (
            <InfoNote icon={Clock}>Routing under {a.delegationRecord}. Only the categories named in the order are routed.</InfoNote>
          )}
          <Card className="p-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="h-4 w-4 text-muted" />What visitors see</p>
            <p className="rounded-xl bg-surface-2 p-3 text-sm italic text-muted ring-1 ring-line">{a.visitorMessage}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
