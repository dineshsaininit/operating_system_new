/**
 * AI gateway (PLT-M03). Provider keys live only here, never in the browser bundle.
 * Order: Groq → Google Gemini → Mistral. Every call — answered, refused or failed — is logged to the
 * AI interaction log and the audit ledger. Policy refusals happen before any provider is contacted.
 */
import { Router } from 'express';
import type { AIInteraction } from '../../../frontend/src/types/index.js';
import { audit } from '../audit.js';
import { R, actorOf, allow } from '../auth.js';
import { config } from '../config.js';
import { fail } from '../errors.js';
import { db } from '../store.js';
import { nextSeq, now } from '../util.js';

export const ai = Router();

interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string }
interface AiResult { text: string; provider: string; model: string }

const PROHIBITED = /\b(sanction|sign (the|this)|approve (the )?(expenditure|payment|bill)|demolition order|penalt(y|ies) order|enforcement order|issue (an? )?order|quasi[- ]judicial|override (the )?officer)\b/i;

/** Prepended to every request, whatever the client sends. */
const SERVER_GUARDRAIL = `Server policy (always applies): you assist and never decide. You cannot approve, sign, sanction expenditure, authorize enforcement, issue quasi-judicial decisions or override an officer. Anything written for sending is a DRAFT for human approval. Do not compute statutory time limits. Data is synthetic (demo).`;

const REFUSAL = 'I can’t do that. Approving, signing, sanctioning or issuing orders must be done by an authorised officer — the system only assists. I can help you prepare a briefing note or a DRAFT for the officer’s review instead.';

const providers = () => [
  { name: 'groq', key: config.ai.groqKey, model: config.ai.groqModel, call: callGroq },
  { name: 'gemini', key: config.ai.geminiKey, model: config.ai.geminiModel, call: callGemini },
  { name: 'mistral', key: config.ai.mistralKey, model: config.ai.mistralModel, call: callMistral },
].filter((p) => p.key);

const signal = () => AbortSignal.timeout(config.ai.timeoutMs);

async function callGroq(messages: ChatMsg[], temperature: number): Promise<AiResult> {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', signal: signal(),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.ai.groqKey}` },
    body: JSON.stringify({ model: config.ai.groqModel, messages, temperature, max_tokens: 2000 }),
  });
  if (!r.ok) throw new Error(`groq ${r.status}`);
  const j = await r.json() as { choices?: { message?: { content?: string } }[] };
  return { text: j.choices?.[0]?.message?.content ?? '', provider: 'groq', model: config.ai.groqModel };
}

async function callGemini(messages: ChatMsg[], temperature: number): Promise<AiResult> {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.ai.geminiModel}:generateContent`, {
    method: 'POST', signal: signal(),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.ai.geminiKey },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature, maxOutputTokens: 1500 } }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const j = await r.json() as { candidates?: { content?: { parts?: { text: string }[] } }[] };
  return { text: j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '', provider: 'gemini', model: config.ai.geminiModel };
}

async function callMistral(messages: ChatMsg[], temperature: number): Promise<AiResult> {
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST', signal: signal(),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.ai.mistralKey}` },
    body: JSON.stringify({ model: config.ai.mistralModel, messages, temperature, max_tokens: 1200 }),
  });
  if (!r.ok) throw new Error(`mistral ${r.status}`);
  const j = await r.json() as { choices?: { message?: { content?: string } }[] };
  return { text: j.choices?.[0]?.message?.content ?? '', provider: 'mistral', model: config.ai.mistralModel };
}

function logAi(actorName: string, entry: Omit<AIInteraction, 'id' | 'at' | 'actor'>) {
  const log = db().aiLog;
  log.unshift({ ...entry, id: nextSeq(log.map((x) => x.id), 'AI', 1, 4), at: now(), actor: actorName.replace(' (synthetic)', '') });
}

ai.get('/ai/status', allow(...R.OFFICIAL), (_req, res) => {
  const p = providers();
  res.json({ enabled: db().config.aiEnabled && p.length > 0, configured: p.length > 0, providers: p.map((x) => x.name) });
});

ai.post('/ai/chat', allow(...R.EXEC_PA), async (req, res) => {
  const { feature, messages, temperature } = req.body ?? {};
  if (typeof feature !== 'string' || !feature.trim()) fail(422, 'feature is required', { feature: 'Required' });
  if (!Array.isArray(messages) || !messages.length || messages.some((m: ChatMsg) => !['system', 'user', 'assistant'].includes(m?.role) || typeof m?.content !== 'string')) {
    fail(422, 'messages must be a non-empty array of { role, content }');
  }
  const msgs = messages as ChatMsg[];
  const promptChars = msgs.reduce((n, m) => n + m.content.length, 0);
  if (promptChars > 120_000) fail(422, 'Prompt too large');
  if (!db().config.aiEnabled) fail(409, 'AI is disabled in Configuration (feature flag)');

  const actor = actorOf(req);
  const lastUser = [...msgs].reverse().find((m) => m.role === 'user')?.content ?? '';
  if (PROHIBITED.test(lastUser)) {
    logAi(actor.name, { feature, provider: '—', model: '—', promptChars, outcome: 'refused' });
    audit(actor, 'ai.call', `${feature} (refused by policy)`);
    res.json({ text: REFUSAL, provider: 'guardrail', model: 'policy' });
    return;
  }

  const list = providers();
  if (!list.length) fail(503, 'No AI provider key configured on the server');

  const t = Math.min(1, Math.max(0, Number.isFinite(temperature) ? Number(temperature) : 0.3));
  const withPolicy: ChatMsg[] = [{ role: 'system', content: SERVER_GUARDRAIL }, ...msgs];
  const errors: string[] = [];
  for (const p of list) {
    try {
      const r = await p.call(withPolicy, t);
      if (!r.text.trim()) throw new Error(`${p.name} empty response`);
      logAi(actor.name, { feature, provider: r.provider, model: r.model, promptChars, outcome: errors.length ? 'fallback' : 'answered' });
      audit(actor, 'ai.call', feature);
      res.json(r);
      return;
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  logAi(actor.name, { feature, provider: 'all', model: '—', promptChars, outcome: 'failed' });
  audit(actor, 'ai.call', `${feature} (all providers failed)`, 'error');
  fail(502, `All AI providers failed (${errors.join('; ')})`);
});
