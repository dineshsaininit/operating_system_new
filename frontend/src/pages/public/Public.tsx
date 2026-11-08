import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Send, CheckCircle2, Search, RefreshCw, ShieldCheck, Paperclip, Ticket, Clock, ArrowLeft, Copy } from 'lucide-react';
import { api } from '@/services/api';
import { CATEGORIES, WARDS } from '@/data/mockDb';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { REQUEST_META, QUEUE_META } from '@/components/domain';
import { SyntheticStrip } from '@/components/layout/AppShell';
import { LANG_LABEL } from '@/i18n/strings';
import { cn, fmtDateTime } from '@/lib/utils';
import type { Lang } from '@/types';

function PublicShell({ children }: { children: ReactNode }) {
  const { lang, setLang } = useApp();
  return (
    <div className="min-h-full bg-bg">
      <SyntheticStrip />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white"><Building2 className="h-5 w-5" /></div>
            <div><p className="text-sm font-bold">Office of the Deputy Municipal Commissioner</p><p className="text-xs text-muted">Zone II (synthetic office) · Public services</p></div>
          </div>
          <div className="flex rounded-xl bg-surface-2 p-1 ring-1 ring-line">{(['en', 'mr', 'hi'] as Lang[]).map((l) => <button key={l} onClick={() => setLang(l)} className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold', lang === l ? 'bg-surface shadow-sm' : 'text-muted')}>{LANG_LABEL[l]}</button>)}</div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted">
        <div className="flex flex-wrap gap-4 border-t border-line pt-6"><Link to="/public/request" className="hover:text-primary">Request a meeting</Link><Link to="/public/status" className="hover:text-primary">Check status</Link><Link to="/" className="hover:text-primary">Staff sign-in</Link><span className="ml-auto">Accessible to GIGW / WCAG 2.1 AA (target)</span></div>
      </footer>
    </div>
  );
}

export function PublicRequest() {
  const { t, lang } = useApp();
  const { toast } = useToast();
  const [f, setF] = useState({ name: '', mobile: '', category: '', ward: '', purpose: '', notice: false, file: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Please enter your name';
    if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
    if (!f.category) e.category = 'Choose a category';
    if (f.purpose.trim().length < 10) e.purpose = 'Describe your purpose in at least 10 characters';
    if (!f.notice) e.notice = 'Please confirm you have read the privacy notice';
    setErrors(e);
    return !Object.keys(e).length;
  };

  if (ref) return (
    <PublicShell>
      <Card className="mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ok/10 text-ok"><CheckCircle2 className="h-9 w-9" /></div>
        <h1 className="mt-4 text-2xl font-bold">Request received</h1>
        <p className="mt-1 text-sm text-muted">We will inform you by SMS once the office has reviewed your request.</p>
        <div className="mt-6 rounded-2xl bg-surface-2 p-5 ring-1 ring-line">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your reference</p>
          <p className="mt-1 font-mono text-3xl font-extrabold">{ref}</p>
          <Button size="sm" variant="ghost" icon={Copy} className="mt-2" onClick={() => { navigator.clipboard.writeText(ref); toast('info', 'Copied'); }}>Copy</Button>
        </div>
        <div className="mt-6 flex justify-center gap-2"><Link to={`/public/status?ref=${ref}`}><Button icon={Search}>{t('checkStatus')}</Button></Link><Button variant="secondary" onClick={() => { setRef(null); setF({ name: '', mobile: '', category: '', ward: '', purpose: '', notice: false, file: '' }); }}>New request</Button></div>
      </Card>
    </PublicShell>
  );

  return (
    <PublicShell>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <Badge tone="teal" className="mb-2">SCR-29 · P0</Badge>
          <h1 className="text-3xl font-bold tracking-tight">{t('requestMeeting')}</h1>
          <p className="mt-1 text-sm text-muted">Fields marked * are required. You will receive a one-time password (OTP) to confirm your mobile number.</p>
          <Card className="mt-6 p-6">
            <form className="grid gap-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (validate()) { setOtp(''); setOtpOpen(true); } }} noValidate>
              <Field label={t('name')} required error={errors.name}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name" autoComplete="name" /></Field>
              <Field label={`${t('mobile')} (OTP)`} required error={errors.mobile}><Input value={f.mobile} inputMode="numeric" onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit mobile" autoComplete="tel" /></Field>
              <Field label={t('category')} required error={errors.category}><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">Choose…</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label={t('ward')}><Select value={f.ward} onChange={(e) => setF({ ...f, ward: e.target.value })}><option value="">Choose…</option>{WARDS.map((w) => <option key={w} value={w}>Ward {w}</option>)}<option value="—">Don’t know</option></Select></Field>
              <Field label={t('purpose')} required error={errors.purpose} className="sm:col-span-2" hint={`${f.purpose.length}/500`}><Textarea maxLength={500} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} placeholder="Briefly describe what you would like to discuss" /></Field>
              <Field label="Attachment (optional)" hint="PDF or JPG up to 5 MB" className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line px-3 py-3 text-sm text-muted hover:border-primary/50">
                  <Paperclip className="h-4 w-4" />{f.file || 'Choose a file'}
                  <input type="file" accept=".pdf,.jpg,.jpeg" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file && file.size > 5e6) { toast('error', 'File too large', 'Maximum 5 MB'); return; } setF({ ...f, file: file?.name ?? '' }); }} />
                </label>
              </Field>
              <div className="sm:col-span-2">
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={f.notice} onChange={(e) => setF({ ...f, notice: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[rgb(var(--primary))]" />
                  <span>{t('privacyNotice')} — <button type="button" className="font-semibold text-primary underline" onClick={() => setNoticeOpen(true)}>read notice</button></span>
                </label>
                {errors.notice && <p className="mt-1 text-xs font-medium text-danger">{errors.notice}</p>}
              </div>
              <div className="sm:col-span-2"><Button type="submit" size="lg" icon={Send}>{t('submit')}</Button></div>
            </form>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" />Public hours</p>
            <p className="mt-2 text-sm text-muted">Walk-in window: Monday–Friday, 17:30–18:30. Appointments are confirmed by SMS.</p>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-ok" />Your data</p>
            <p className="mt-2 text-sm text-muted">We keep your name, mobile and purpose only to handle this request, for the period stated in the notice. History is never used to decide your request.</p>
          </Card>
          <Link to="/public/status" className="card flex items-center gap-3 p-5 hover:shadow-lift"><Ticket className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold">Already have a reference or token?</p><p className="text-xs text-muted">Check your status</p></div></Link>
        </aside>
      </div>

      <Modal open={otpOpen} onClose={() => setOtpOpen(false)} title="Confirm your mobile" subtitle={`We sent a 6-digit code to ${f.mobile.replace(/^(\d{2})\d{6}/, '$1XXXXXX')} (demo: any 6 digits)`} size="sm"
        footer={<><Button variant="secondary" onClick={() => setOtpOpen(false)}>Cancel</Button><Button loading={busy} disabled={otp.length !== 6} onClick={async () => {
          setBusy(true);
          try { const r = await api.requests.submitPublic({ name: f.name, mobile: f.mobile, category: f.category, ward: f.ward || '—', purpose: f.purpose, lang }); setRef(r.ref); setOtpOpen(false); }
          catch (e) { toast('error', 'Could not submit', (e as Error).message); } finally { setBusy(false); }
        }}>Verify and submit</Button></>}>
        <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" className="h-14 text-center font-mono text-2xl tracking-[0.5em]" autoFocus aria-label="One-time password" />
      </Modal>
      <Modal open={noticeOpen} onClose={() => setNoticeOpen(false)} title="Privacy notice v1.2" subtitle="Synthetic sample text">
        <div className="space-y-3 text-sm leading-relaxed text-ink/85">
          <p><b>What we collect:</b> your name, mobile number, category, ward and purpose; optionally an attachment.</p>
          <p><b>Why:</b> to schedule and handle your meeting request and to send you status updates by SMS.</p>
          <p><b>How long:</b> visitor records are kept for the period set in the office retention schedule (shown in configuration), then deleted.</p>
          <p><b>Your rights:</b> you can ask to access or correct your data, or withdraw SMS consent, at the reception desk.</p>
        </div>
      </Modal>
    </PublicShell>
  );
}

type StatusResult = Awaited<ReturnType<typeof api.requests.publicStatus>>;

export function PublicStatus() {
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get('ref') ?? '');
  const [res, setRes] = useState<StatusResult | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string>('');

  const check = async (r = ref) => {
    if (!r.trim()) return;
    setBusy(true);
    setRes(await api.requests.publicStatus(r.trim()));
    setCheckedAt(new Date().toISOString());
    setBusy(false);
  };
  useEffect(() => { if (params.get('ref')) check(params.get('ref')!); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl">
        <Link to="/public/request" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Request a meeting</Link>
        <Badge tone="teal" className="mb-2 block w-fit">SCR-30 · P0</Badge>
        <h1 className="text-3xl font-bold tracking-tight">Visitor status</h1>
        <p className="mt-1 text-sm text-muted">Enter your request reference (e.g. AR-1042) or token (e.g. W-13). You see only your own record.</p>
        <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); check(); }}>
          <Input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="AR-1042 or W-13" className="h-12 font-mono text-lg" />
          <Button size="lg" icon={Search} loading={busy}>Check</Button>
        </form>
        {res === null && <Card className="mt-6 p-6 text-center text-sm text-muted">No record found. Links expire after the visit — request an OTP at reception if needed.</Card>}
        {res && (
          <Card className="mt-6 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white">
              <p className="text-sm text-blue-100">{res.kind === 'token' ? 'Token' : 'Request'}</p>
              <p className="font-mono text-5xl font-extrabold">{res.ref}</p>
            </div>
            <div className="space-y-4 p-6">
              {res.kind === 'token' ? (
                <>
                  <div className="flex items-center justify-between"><span className="text-sm text-muted">Status</span><Badge tone={QUEUE_META[res.status].tone} dot>{QUEUE_META[res.status].label}</Badge></div>
                  {res.status === 'waiting' && <>
                    <div className="flex items-center justify-between"><span className="text-sm text-muted">Position</span><span className="text-2xl font-bold">#{res.position}</span></div>
                    <div className="flex items-center justify-between"><span className="text-sm text-muted">Estimated wait</span><span className="text-lg font-semibold">{res.wait[0]}–{res.wait[1]} min</span></div>
                  </>}
                  {res.status === 'called' && <p className="rounded-xl bg-amber-500/10 p-3 text-center font-semibold text-warn">Please proceed to the DMC office now.</p>}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between"><span className="text-sm text-muted">Status</span><Badge tone={REQUEST_META[res.status].tone} dot>{REQUEST_META[res.status].label}</Badge></div>
                  {res.slot && <div className="flex items-center justify-between"><span className="text-sm text-muted">Appointment</span><span className="font-semibold">{fmtDateTime(res.slot)}</span></div>}
                  {res.redirectTarget && <div className="flex items-center justify-between"><span className="text-sm text-muted">Please contact</span><span className="font-semibold">{res.redirectTarget}</span></div>}
                </>
              )}
              <div className="flex items-center justify-between border-t border-line pt-4 text-xs text-muted"><span>Checked {checkedAt && fmtDateTime(checkedAt)}</span><Button size="xs" variant="ghost" icon={RefreshCw} onClick={() => check()}>Refresh</Button></div>
            </div>
          </Card>
        )}
      </div>
    </PublicShell>
  );
}
