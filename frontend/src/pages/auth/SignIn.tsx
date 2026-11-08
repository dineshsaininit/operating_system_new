import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fingerprint, KeyRound, MonitorSmartphone, ShieldCheck, ArrowRight, ArrowLeft, Lock, CalendarCheck2, ListChecks, BellOff, Building2, Globe, Ticket, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { ROLE_META } from '@/config/navigation';
import { Button, Field, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { BackendStatusPill } from '@/components/BackendStatus';
import type { RoleId } from '@/types';

const DEMO_ROLES: RoleId[] = ['ROLE-01', 'ROLE-02', 'ROLE-04', 'ROLE-05', 'ROLE-07', 'ROLE-08', 'ROLE-10', 'ROLE-11', 'ROLE-03', 'ROLE-06', 'ROLE-09'];

type Step = 'role' | 'mfa' | 'device';

export default function SignIn() {
  const { signIn, session } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<RoleId>('ROLE-01');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [device, setDevice] = useState('Office desktop');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { if (session) nav(ROLE_META[session.user.role].home, { replace: true }); }, [session, nav]);

  const usesPasskey = ['ROLE-01', 'ROLE-02', 'ROLE-08', 'ROLE-09', 'ROLE-10', 'ROLE-11'].includes(role);
  const usesPin = role === 'ROLE-04';

  const verify = async () => {
    setError('');
    if (!usesPasskey && otp.join('').length < (usesPin ? 4 : 6)) { setError(usesPin ? 'Enter the 4-digit desk PIN' : 'Enter the 6-digit code from your authenticator app'); return; }
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 900));
    setVerifying(false);
    setStep('device');
  };

  const finish = async () => {
    setVerifying(true);
    try {
      const s = await signIn(role, device || 'Unnamed device');
      nav(ROLE_META[s.user.role].home, { replace: true });
    } catch (e) { setError((e as Error).message); setVerifying(false); }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="aurora relative hidden overflow-hidden bg-gradient-to-br from-navy-900 via-[#0E2A5C] to-navy-800 p-12 text-white lg:flex lg:flex-col">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="absolute -right-32 -top-32 h-96 w-96 animate-float rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-96 w-96 animate-float-slow rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-56 w-56 animate-float rounded-full bg-purple-500/15 blur-3xl [animation-delay:-7s]" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 shadow-lg shadow-blue-900/50">
            <svg viewBox="0 0 64 64" className="h-6 w-6"><path d="M32 10 52 52H41.5L32 31 22.5 52H12Z" fill="#fff" /><circle cx="32" cy="45" r="4.5" fill="#F59E0B" /></svg>
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">AASIOM Command OS</p>
            <p className="text-xs text-blue-200/70">Office of the Deputy Municipal Commissioner · Zone II</p>
          </div>
        </div>
        <div className="relative mt-auto max-w-lg animate-fade-up">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-blue-100"><Sparkles className="h-3.5 w-3.5 text-amber-300" /> Less coordination. More governance.</p>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">One desk for every <span className="bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">appointment, visitor and commitment.</span></h1>
          <p className="mt-4 text-[15px] leading-relaxed text-blue-100/80">A single calendar and visitor queue, a ledger that tracks every instruction until it is done and verified, and a one-minute daily briefing. Humans approve everything.</p>
          <div className="stagger mt-10 grid grid-cols-2 gap-3">
            {[
              [CalendarCheck2, 'Calendar & queue', 'Requests, walk-ins, tokens, wait estimates'],
              [ListChecks, 'Commitment ledger', 'Owner, due date, evidence, verification'],
              [BellOff, 'Peace Mode', 'Three-tier notifications, focus protection'],
              [ShieldCheck, 'Audit by design', 'Hash-chained ledger of every action'],
            ].map(([I, t, d]) => {
              const Icon = I as typeof Lock;
              return (
                <div key={t as string} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.08]">
                  <Icon className="h-5 w-5 text-blue-300" />
                  <p className="mt-2 text-sm font-semibold">{t as string}</p>
                  <p className="mt-0.5 text-xs text-blue-100/60">{d as string}</p>
                </div>
              );
            })}
          </div>
        </div>
        <p className="relative mt-10 text-[11px] text-blue-200/50">Final planning draft — pending approval. Synthetic data only until written institutional authorization (Gate 0).</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col bg-surface">
        <div className="flex items-center justify-between border-b border-line px-6 py-3 text-xs">
          <div className="flex items-center gap-2"><span className="rounded-full bg-amber-400/15 px-2.5 py-1 font-bold text-amber-700 dark:text-amber-300">SYNTHETIC DATA</span><BackendStatusPill /></div>
          <div className="flex items-center gap-4 font-medium text-muted">
            <Link to="/public/request" className="flex items-center gap-1.5 hover:text-primary"><Globe className="h-3.5 w-3.5" />Request a meeting</Link>
            <Link to="/public/status" className="flex items-center gap-1.5 hover:text-primary"><Ticket className="h-3.5 w-3.5" />Visitor status</Link>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-2">
              {(['role', 'mfa', 'device'] as Step[]).map((s, i) => (
                <div key={s} className="flex flex-1 items-center gap-2">
                  <div className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-bold', step === s ? 'bg-primary text-white' : (['role', 'mfa', 'device'].indexOf(step) > i ? 'bg-ok text-white' : 'bg-surface-2 text-muted ring-1 ring-line'))}>
                    {['role', 'mfa', 'device'].indexOf(step) > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={cn('text-xs font-semibold', step === s ? 'text-ink' : 'text-muted')}>{['Account', 'Verify', 'Device'][i]}</span>
                  {i < 2 && <div className="h-px flex-1 bg-line" />}
                </div>
              ))}
            </div>

            {step === 'role' && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
                <p className="mt-1 text-sm text-muted">Choose a demo account. Each role sees only the screens it is permitted to (RBAC).</p>
                <div className="stagger mt-6 grid max-h-[380px] grid-cols-1 gap-2 overflow-y-auto p-1 sm:grid-cols-2">
                  {DEMO_ROLES.map((r) => (
                    <button key={r} onClick={() => setRole(r)}
                      className={cn('rounded-xl border p-3 text-left transition duration-200', role === r ? 'border-primary bg-primary/[0.06] ring-4 ring-primary/10' : 'border-line hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card')}>
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full bg-gradient-to-br', ROLE_META[r].color)} />
                        <span className="text-[13px] font-semibold">{ROLE_META[r].name}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted">{ROLE_META[r].description}</p>
                    </button>
                  ))}
                </div>
                <Button className="mt-6 w-full" size="lg" iconRight={ArrowRight} onClick={() => { setOtp(['', '', '', '', '', '']); setStep('mfa'); }}>Continue</Button>
                {role === 'ROLE-11' && <p className="mt-3 text-center text-xs text-priv">Opens the separate Private app — its own identity, keys and store.</p>}
              </div>
            )}

            {step === 'mfa' && (
              <div className="animate-fade-in">
                <button onClick={() => setStep('role')} className="mb-4 flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" />Back</button>
                <h2 className="text-2xl font-bold tracking-tight">{usesPasskey ? 'Confirm with your passkey' : usesPin ? 'Enter desk PIN' : 'Two-step verification'}</h2>
                <p className="mt-1 text-sm text-muted">{ROLE_META[role].name} accounts use {usesPasskey ? 'a phishing-resistant passkey (FIDO2)' : usesPin ? 'a PIN on a locked-down device, shift-based session' : 'an authenticator app code'}.</p>
                {usesPasskey ? (
                  <button onClick={verify} disabled={verifying} className="group mt-8 flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/[0.03] p-8 transition hover:border-primary/60">
                    <div className={cn('grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg', verifying && 'animate-pulse')}>
                      {verifying ? <Loader2 className="h-9 w-9 animate-spin" /> : <Fingerprint className="h-10 w-10" />}
                    </div>
                    <p className="mt-4 text-sm font-semibold">{verifying ? 'Verifying…' : 'Touch your security key or use biometrics'}</p>
                    <p className="mt-1 text-xs text-muted">Simulated in this demo — click to continue</p>
                  </button>
                ) : (
                  <>
                    <div className="mt-8 flex justify-center gap-2">
                      {otp.slice(0, usesPin ? 4 : 6).map((v, i) => (
                        <input key={i} ref={(el) => (otpRefs.current[i] = el)} value={v} inputMode="numeric" maxLength={1} aria-label={`Digit ${i + 1}`}
                          type={usesPin ? 'password' : 'text'}
                          onChange={(e) => {
                            const d = e.target.value.replace(/\D/g, '');
                            const n = [...otp]; n[i] = d; setOtp(n);
                            if (d && i < (usesPin ? 3 : 5)) otpRefs.current[i + 1]?.focus();
                          }}
                          onKeyDown={(e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); if (e.key === 'Enter') verify(); }}
                          className="h-14 w-12 rounded-xl border border-line bg-surface text-center text-xl font-bold focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15" />
                      ))}
                    </div>
                    <p className="mt-3 text-center text-xs text-muted">Demo: any digits work</p>
                    <Button className="mt-6 w-full" size="lg" loading={verifying} icon={KeyRound} onClick={verify}>{verifying ? 'Verifying' : 'Verify'}</Button>
                  </>
                )}
                {error && <p className="mt-3 text-center text-sm font-medium text-danger">{error}</p>}
              </div>
            )}

            {step === 'device' && (
              <div className="animate-fade-in">
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-ok/10 text-ok"><MonitorSmartphone className="h-6 w-6" /></div>
                <h2 className="text-2xl font-bold tracking-tight">Bind this device</h2>
                <p className="mt-1 text-sm text-muted">Official accounts work only on bound devices. You can revoke it any time from Account & devices.</p>
                <Field label="Device name" className="mt-6"><Input value={device} onChange={(e) => setDevice(e.target.value)} autoFocus /></Field>
                <div className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted ring-1 ring-line">
                  <p className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Session timeout and re-verification apply. Sign-ins are written to the audit ledger.</p>
                </div>
                <Button className="mt-6 w-full" size="lg" loading={verifying} iconRight={ArrowRight} onClick={finish}>Bind device and continue</Button>
                {error && <p className="mt-3 text-center text-sm font-medium text-danger">{error}</p>}
              </div>
            )}

            <div className="mt-10 grid grid-cols-3 gap-2 border-t border-line pt-6 text-center">
              <Link to="/public/request" className="rounded-xl p-2 text-xs text-muted hover:bg-surface-2 hover:text-ink"><Globe className="mx-auto mb-1 h-4 w-4" />Public request</Link>
              <Link to="/public/status" className="rounded-xl p-2 text-xs text-muted hover:bg-surface-2 hover:text-ink"><Ticket className="mx-auto mb-1 h-4 w-4" />Token status</Link>
              <a href="#about" onClick={(e) => e.preventDefault()} className="rounded-xl p-2 text-xs text-muted"><Building2 className="mx-auto mb-1 h-4 w-4" />BMC Zone II</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
