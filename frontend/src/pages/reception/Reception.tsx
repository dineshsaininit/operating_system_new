import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, CheckCircle2, CornerUpRight, PhoneCall, WifiOff, Wifi, UserCheck, Info, Volume2, ArrowLeft, Building2, Droplets, Construction, Trash2, HeartPulse, Receipt, TreePine, HelpCircle } from 'lucide-react';
import { useApi } from '@/services/useApi';
import { api } from '@/services/api';
import { CATEGORIES, WARDS, db } from '@/data/mockDb';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, CardHeader, Field, InfoNote, Input, PageHeader, Select, Toggle } from '@/components/ui';
import { QUEUE_META } from '@/components/domain';
import { LANG_LABEL, SPEECH_LANG } from '@/i18n/strings';
import { cn, fmtTime } from '@/lib/utils';
import type { Lang, QueueEntry } from '@/types';

export function ReceptionCheckIn() {
  const { t, lang, setLang } = useApp();
  const { data: queue } = useApi(() => api.queue.list());
  const { run, toast } = useToast();
  const [offline, setOffline] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', category: '', ward: 'W1', purpose: '', noticeRead: false });
  const [issued, setIssued] = useState<QueueEntry | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const waiting = (queue ?? []).filter((q) => q.status === 'waiting');
  const desk = db.config.categories.find((c) => c.name === form.category)?.rightDesk;

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.category) e.category = 'Choose a category';
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) e.mobile = 'Enter 10 digits or leave empty';
    if (!form.noticeRead) e.notice = 'Read the privacy notice to the visitor first';
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      const entry = await api.queue.register({ ...form, offline });
      setIssued(entry);
      toast('success', `Token ${entry.token} issued`, offline ? 'Stored locally — will sync when online' : form.mobile ? 'SMS sent with status link' : 'Printed token');
      setForm({ name: '', mobile: '', category: '', ward: 'W1', purpose: '', noticeRead: false });
    } catch (err) { toast('error', 'Not registered', (err as Error).message); }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Reception check-in" subtitle="Register walk-ins fast. Large text; Marathi / English toggle." screen="SCR-27" release="P0" env="executive"
        actions={<>
          <div className="flex rounded-xl bg-surface-2 p-1 ring-1 ring-line">{(['mr', 'en'] as Lang[]).map((l) => <button key={l} onClick={() => setLang(l)} className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', lang === l ? 'bg-surface shadow-sm' : 'text-muted')}>{LANG_LABEL[l]}</button>)}</div>
          <Badge tone={offline ? 'red' : 'green'} icon={offline ? WifiOff : Wifi}>{offline ? 'Offline — local queue' : 'Online'}</Badge>
          <Link to="/kiosk"><Button variant="secondary">Kiosk mode</Button></Link>
        </>} />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="grid gap-5 text-base sm:grid-cols-2">
            <Field label={t('name')} required error={errors.name} className="sm:col-span-2"><Input className="h-12 text-base" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Visitor name" autoFocus /></Field>
            <Field label={`${t('mobile')} (optional)`} error={errors.mobile}><Input className="h-12 text-base" inputMode="numeric" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit mobile" /></Field>
            <Field label={t('ward')}><Select className="h-12 text-base" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })}>{WARDS.map((w) => <option key={w} value={w}>Ward {w}</option>)}<option value="—">Not ward-specific</option></Select></Field>
            <Field label={t('category')} required error={errors.category} className="sm:col-span-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIES.slice(0, 8).map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, category: c })} className={cn('rounded-xl border px-3 py-3 text-sm font-medium transition', form.category === c ? 'border-primary bg-primary/10 text-primary ring-4 ring-primary/10' : 'border-line hover:border-primary/40')}>{c}</button>
                ))}
              </div>
              <Select className="mt-2" value={CATEGORIES.slice(0, 8).includes(form.category) ? '' : form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">More categories…</option>{CATEGORIES.slice(8).map((c) => <option key={c}>{c}</option>)}</Select>
            </Field>
            <Field label={`${t('purpose')} (short)`} className="sm:col-span-2"><Input className="h-12 text-base" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Follow-up on pending application" /></Field>
            <div className={cn('rounded-xl border p-4 sm:col-span-2', errors.notice ? 'border-danger/50 bg-red-500/[0.04]' : 'border-line bg-surface-2/60')}>
              <Toggle checked={form.noticeRead} onChange={(v) => setForm({ ...form, noticeRead: v })} label={`Privacy notice read to visitor in ${LANG_LABEL[lang]}`} description="Version 1.2 — what we keep and for how long" />
              {errors.notice && <p className="mt-1 text-xs font-medium text-danger">{errors.notice}</p>}
            </div>
            {desk && desk !== 'PA triage' && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4 sm:col-span-2">
                <CornerUpRight className="mt-0.5 h-5 w-5 text-warn" />
                <div className="flex-1 text-sm"><p className="font-semibold">Right desk suggestion</p><p className="text-muted">Ward {form.ward} {desk} handles this category. The visitor may choose to go there directly.</p></div>
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" icon={Ticket} onClick={submit}>{t('register')}</Button>
            <Toggle checked={offline} onChange={setOffline} label="Simulate offline" />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><Info className="h-3.5 w-3.5" />Offline? Tokens continue as L-nn and sync later.</p>
        </Card>

        <div className="space-y-5">
          {issued && (
            <Card className="overflow-hidden border-2 border-ok/40">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-center text-white">
                <CheckCircle2 className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm font-medium text-emerald-50">Token issued</p>
                <p className="font-mono text-6xl font-extrabold tracking-tight">{issued.token}</p>
                <p className="mt-2 text-sm">Estimated wait {issued.waitMin[0]}–{issued.waitMin[1]} min</p>
              </div>
              <div className="space-y-2 p-4 text-sm">
                {issued.repeatMatch && <InfoNote tone="purple" icon={UserCheck}>Possible repeat visitor — 1 record. PA will confirm.</InfoNote>}
                {issued.routeSuggestion && <InfoNote tone="amber" icon={CornerUpRight}>Suggested desk: {issued.routeSuggestion}</InfoNote>}
              </div>
            </Card>
          )}
          <Card className="overflow-hidden">
            <CardHeader title="Today’s queue" subtitle={`${waiting.length} waiting`} icon={Ticket} action={<Button size="sm" icon={PhoneCall} onClick={async () => { const n = await run(api.queue.callNext(), 'Next visitor called'); if (n) toast('info', `Calling ${n.token}`, n.visitorName); }}>Call next</Button>} />
            <div className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {(queue ?? []).filter((q) => ['waiting', 'called', 'in-meeting'].includes(q.status)).map((q) => (
                <div key={q.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-14 font-mono text-lg font-bold">{q.token}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{q.visitorName}</p><p className="text-xs text-muted">{q.category} · {fmtTime(q.arrivedAt)}</p></div>
                  <Badge tone={QUEUE_META[q.status].tone}>{QUEUE_META[q.status].label}</Badge>
                  {['waiting', 'called'].includes(q.status) && <Button size="xs" variant="ghost" onClick={() => run(api.queue.setStatus(q.id, 'left'), `${q.token} marked left`)}>Left</Button>}
                </div>
              ))}
            </div>
            <p className="border-t border-line px-5 py-2.5 text-[11px] text-muted">Reception sees today’s queue only — no history, no notes.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

const KIOSK_CATS = [
  { c: 'Water supply', i: Droplets, mr: 'पाणीपुरवठा' }, { c: 'Building permission', i: Building2, mr: 'इमारत परवानगी' },
  { c: 'Roads', i: Construction, mr: 'रस्ते' }, { c: 'Solid waste', i: Trash2, mr: 'घनकचरा' },
  { c: 'Health', i: HeartPulse, mr: 'आरोग्य' }, { c: 'Property tax', i: Receipt, mr: 'मालमत्ता कर' },
  { c: 'Gardens and trees', i: TreePine, mr: 'उद्याने व झाडे' }, { c: 'Other', i: HelpCircle, mr: 'इतर' },
];

export function Kiosk() {
  const [lang, setLang] = useState<'mr' | 'en'>('mr');
  const [step, setStep] = useState<'cat' | 'details' | 'done'>('cat');
  const [cat, setCat] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [token, setToken] = useState<QueueEntry | null>(null);
  const [err, setErr] = useState('');
  const say = (en: string, mr: string) => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(lang === 'mr' ? mr : en); u.lang = SPEECH_LANG[lang]; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  };
  const L = (en: string, mr: string) => (lang === 'mr' ? mr : en);

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-br from-navy-900 to-navy-700 text-white">
      <div className="flex items-center justify-between px-8 py-5">
        <Link to="/reception" className="flex items-center gap-2 text-sm text-blue-200 hover:text-white"><ArrowLeft className="h-4 w-4" />Exit kiosk (staff)</Link>
        <p className="text-sm font-semibold text-blue-100">{L('Office of the Deputy Municipal Commissioner', 'उपायुक्त कार्यालय')} · SCR-28</p>
        <div className="flex gap-1 rounded-xl bg-white/10 p-1">{(['mr', 'en'] as const).map((l) => <button key={l} onClick={() => setLang(l)} className={cn('rounded-lg px-4 py-2 text-lg font-semibold', lang === l ? 'bg-white text-navy-800' : 'text-white')}>{l === 'mr' ? 'मराठी' : 'English'}</button>)}</div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        {step === 'cat' && (
          <div className="w-full max-w-5xl animate-fade-in text-center">
            <h1 className="text-4xl font-extrabold sm:text-5xl">{L('Welcome. What is your visit about?', 'स्वागत आहे. आपल्या भेटीचा विषय कोणता?')}</h1>
            <button onClick={() => say('Please choose the subject of your visit', 'कृपया आपल्या भेटीचा विषय निवडा')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-blue-100"><Volume2 className="h-5 w-5" />{L('Hear instructions', 'सूचना ऐका')}</button>
            <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
              {KIOSK_CATS.map((k) => (
                <button key={k.c} onClick={() => { setCat(k.c); setStep('details'); say('Please enter your name', 'कृपया आपले नाव लिहा'); }} className="flex flex-col items-center gap-3 rounded-3xl border-2 border-white/15 bg-white/[0.06] p-8 transition hover:border-white/60 hover:bg-white/10 focus:ring-4 focus:ring-white/40">
                  <k.i className="h-12 w-12 text-blue-200" /><span className="text-xl font-bold">{lang === 'mr' ? k.mr : k.c}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 'details' && (
          <div className="w-full max-w-xl animate-fade-in">
            <h2 className="text-center text-4xl font-extrabold">{L('Your details', 'आपली माहिती')}</h2>
            <div className="mt-8 space-y-5">
              <label className="block"><span className="text-lg font-semibold text-blue-100">{L('Name', 'नाव')}</span><input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-16 w-full rounded-2xl border-2 border-white/20 bg-white/10 px-5 text-2xl text-white outline-none focus:border-white" autoFocus /></label>
              <label className="block"><span className="text-lg font-semibold text-blue-100">{L('Mobile (optional, for SMS updates)', 'मोबाईल (ऐच्छिक)')}</span><input value={mobile} inputMode="numeric" onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-2 h-16 w-full rounded-2xl border-2 border-white/20 bg-white/10 px-5 text-2xl tracking-widest text-white outline-none focus:border-white" /></label>
              <p className="rounded-2xl bg-white/10 p-4 text-base text-blue-100">{L('By continuing you confirm you have read the privacy notice v1.2 displayed beside this kiosk.', 'पुढे जाऊन आपण कियॉस्कजवळील गोपनीयता सूचना v1.2 वाचल्याचे मान्य करता.')}</p>
              {err && <p className="text-center text-lg font-semibold text-red-300">{L('Please see reception', 'कृपया स्वागत कक्षाशी संपर्क साधा')} — {err}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep('cat')} className="h-16 flex-1 rounded-2xl border-2 border-white/20 text-xl font-bold">{L('Back', 'मागे')}</button>
                <button disabled={!name.trim()} onClick={async () => {
                  try { const t = await api.queue.register({ name, mobile, category: cat, ward: '—', purpose: '', noticeRead: true, kiosk: true }); setToken(t); setStep('done'); say(`Your token is ${t.token}`, `आपला टोकन क्रमांक ${t.token}`); setTimeout(() => { setStep('cat'); setName(''); setMobile(''); setToken(null); }, 15000); }
                  catch (e) { setErr((e as Error).message); }
                }} className="h-16 flex-[2] rounded-2xl bg-white text-xl font-bold text-navy-800 disabled:opacity-40">{L('Get token', 'टोकन मिळवा')}</button>
              </div>
            </div>
          </div>
        )}
        {step === 'done' && token && (
          <div className="animate-fade-in text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-300" />
            <p className="mt-4 text-2xl text-blue-100">{L('Your token', 'आपला टोकन')}</p>
            <p className="font-mono text-[120px] font-extrabold leading-none">{token.token}</p>
            <p className="mt-4 text-2xl">{L('Estimated wait', 'अंदाजे प्रतीक्षा')} {token.waitMin[0]}–{token.waitMin[1]} {L('min', 'मिनिटे')}</p>
            <p className="mt-2 text-lg text-blue-200">{L('Please take a seat. Your token will be called.', 'कृपया बसा. आपला टोकन पुकारला जाईल.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
