/**
 * AI gateway client (frontend side of PLT-M03).
 *
 * Providers are tried in order: Groq → Google Gemini → Mistral. If all fail, the caller shows the
 * deterministic fallback ("AI summary unavailable — showing list"), as the SRS requires.
 *
 * Guardrails mirrored from the SRS (AI-FR-*):
 *  - AI never approves, signs, sanctions, authorizes enforcement or issues quasi-judicial decisions.
 *  - Everything it writes is a DRAFT that a human must approve.
 *  - Every call is logged in the AI interaction log (visible to the Security Auditor, SCR-44).
 *  - Only synthetic data is sent (Gate 0). In production these calls move behind the backend gateway.
 */
import { api } from './api';
import { db } from '@/data/mockDb';
import { USE_MOCK, http } from './http';

export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string }
export interface AiResult { text: string; provider: string; model: string }

const env = import.meta.env;
const KEYS = {
  groq: env.VITE_GROQ_API_KEY as string | undefined,
  gemini: env.VITE_GOOGLE_API_KEY as string | undefined,
  mistral: env.VITE_MISTRAL_API_KEY as string | undefined,
};
const MODELS = {
  groq: (env.VITE_GROQ_MODEL as string) || 'openai/gpt-oss-120b',
  gemini: (env.VITE_GEMINI_MODEL as string) || 'gemini-flash-latest',
  mistral: (env.VITE_MISTRAL_MODEL as string) || 'mistral-small-latest',
};

// With a real backend, provider keys live only on the server; this tracks whether it has any.
let serverAiConfigured = false;
export async function refreshAiStatus() {
  if (USE_MOCK) return;
  try { serverAiConfigured = (await http<{ configured: boolean }>('GET', '/ai/status')).configured; } catch { serverAiConfigured = false; }
}

export const aiConfigured = () => (USE_MOCK ? !!(KEYS.groq || KEYS.gemini || KEYS.mistral) : serverAiConfigured);
export const aiEnabled = () => db.config.aiEnabled && aiConfigured();

const PROHIBITED = /\b(sanction|sign (the|this)|approve (the )?(expenditure|payment|bill)|demolition order|penalt(y|ies) order|enforcement order|issue (an? )?order|quasi[- ]judicial|override (the )?officer)\b/i;

export const GUARDRAIL_SYSTEM = `You are the AASIOM Command OS assistant for the Office of the Deputy Municipal Commissioner (synthetic demo data only).
Rules you must always follow:
- You assist; you never decide. You cannot approve, sign, sanction expenditure, authorize enforcement, issue quasi-judicial decisions or override an officer. If asked, politely refuse and say a human officer must do it.
- Anything you write for sending is a DRAFT for human approval.
- Do not compute statutory time limits; say they must be confirmed from validated rule tables.
- Ground answers in the office data provided. Cite record IDs in square brackets like [T-101] or [AR-1042]. If the data does not contain the answer, say "Not found in office records."
- Be concise and professional. Use short bullet points when listing.`;

/** Abort a provider call after 25 s so the chain can fall through instead of hanging. */
function timeoutSignal(ms = 25_000) { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; }

async function callGroq(messages: ChatMsg[], temperature: number): Promise<AiResult> {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEYS.groq}` },
    body: JSON.stringify({ model: MODELS.groq, messages, temperature, max_tokens: 2000 }),
    signal: timeoutSignal(),
  });
  if (!r.ok) throw new Error(`groq ${r.status}`);
  const j = await r.json();
  return { text: j.choices?.[0]?.message?.content ?? '', provider: 'groq', model: MODELS.groq };
}

async function callGemini(messages: ChatMsg[], temperature: number): Promise<AiResult> {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEYS.gemini! },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature, maxOutputTokens: 1500 } }),
    signal: timeoutSignal(),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const j = await r.json();
  return { text: j.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join('') ?? '', provider: 'gemini', model: MODELS.gemini };
}

async function callMistral(messages: ChatMsg[], temperature: number): Promise<AiResult> {
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEYS.mistral}` },
    body: JSON.stringify({ model: MODELS.mistral, messages, temperature, max_tokens: 1200 }),
    signal: timeoutSignal(),
  });
  if (!r.ok) throw new Error(`mistral ${r.status}`);
  const j = await r.json();
  return { text: j.choices?.[0]?.message?.content ?? '', provider: 'mistral', model: MODELS.mistral };
}

/** Sends a chat to the first provider that works. Throws if AI is disabled or every provider fails. */
export async function aiChat(messages: ChatMsg[], feature: string, temperature = 0.3): Promise<AiResult> {
  if (!db.config.aiEnabled) throw new Error('AI is disabled in Configuration (feature flag)');
  // Real backend: the server-side gateway does guardrails, provider fallback and logging (contract §4).
  if (!USE_MOCK) { const r = await http<AiResult>('POST', '/ai/chat', { feature, messages, temperature }); api.logAi({ feature, provider: r.provider, model: r.model, promptChars: 0, outcome: 'answered' }); return r; }
  if (!aiConfigured()) throw new Error('No AI provider key configured in .env.local');

  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const promptChars = messages.reduce((n, m) => n + m.content.length, 0);
  if (PROHIBITED.test(lastUser)) {
    api.logAi({ feature, provider: '—', model: '—', promptChars, outcome: 'refused' });
    return { text: 'I can’t do that. Approving, signing, sanctioning or issuing orders must be done by an authorised officer — the system only assists. I can help you prepare a briefing note or a DRAFT for the officer’s review instead.', provider: 'guardrail', model: 'policy' };
  }

  const chain: [keyof typeof KEYS, typeof callGroq][] = [['groq', callGroq], ['gemini', callGemini], ['mistral', callMistral]];
  const errors: string[] = [];
  for (const [name, fn] of chain) {
    if (!KEYS[name]) continue;
    try {
      const res = await fn(messages, temperature);
      if (!res.text.trim()) throw new Error(`${name} empty response`);
      api.logAi({ feature, provider: res.provider, model: res.model, promptChars, outcome: errors.length ? 'fallback' : 'answered' });
      return res;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  api.logAi({ feature, provider: 'all', model: '—', promptChars, outcome: 'failed' });
  throw new Error(`All AI providers failed (${errors.join('; ')})`);
}

/** Compact snapshot of synthetic office data that grounds the assistant's answers. */
export function officeContext(): string {
  const open = db.tasks.filter((t) => !['closed', 'cancelled', 'verified'].includes(t.state));
  const today = new Date().toDateString();
  return JSON.stringify({
    today: new Date().toDateString(),
    calendarToday: db.calendar.filter((e) => new Date(e.start).toDateString() === today && e.status !== 'cancelled').map((e) => ({ id: e.id, title: e.type === 'busy' ? 'Busy (private)' : e.title, type: e.type, start: new Date(e.start).toTimeString().slice(0, 5), end: new Date(e.end).toTimeString().slice(0, 5) })),
    openTasks: open.map((t) => ({ id: t.id, title: t.title, owner: t.ownerPost, ward: t.ward, due: t.due.slice(0, 10), state: t.state, escalated: !!t.escalated })),
    decidePending: db.decide.filter((d) => d.status === 'pending').map((d) => ({ id: d.refId, type: d.type, summary: d.subtitle })),
    queue: db.queue.filter((q) => q.status === 'waiting').map((q) => ({ token: q.token, category: q.category, ward: q.ward, wait: q.waitMin.join('-') + ' min' })),
    requests: db.requests.filter((r) => r.status === 'requested').map((r) => ({ id: r.id, category: r.category, ward: r.ward, purpose: r.purpose, reserved: r.reserved })),
    wards: db.wards.map((w) => ({ id: w.id, grievancesOverdue: w.grievancesOverdue, repeatComplaints: w.repeatComplaints, weeklyForm: w.formStatus })),
    decisions: db.decisions.slice(0, 5).map((d) => ({ id: d.id, title: d.title, date: d.date.slice(0, 10) })),
    alert: 'Heavy rain advisory after 15:00 (public IMD feed, 07:40)',
  });
}
