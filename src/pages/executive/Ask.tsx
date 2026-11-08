import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Sparkles, Bot, User2, Copy, RotateCcw, ShieldAlert, Languages, Loader2, ClipboardPlus, Info } from 'lucide-react';
import { aiChat, aiEnabled, GUARDRAIL_SYSTEM, officeContext, type ChatMsg } from '@/services/ai';
import { db } from '@/data/mockDb';
import { api } from '@/services/api';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/store/ToastContext';
import { Badge, Button, Card, InfoNote, PageHeader } from '@/components/ui';
import { MicButton, SpeakButton } from '@/components/domain';
import { Markdown, cleanAi } from '@/components/Markdown';
import { LANG_LABEL } from '@/i18n/strings';
import { cn } from '@/lib/utils';
import type { Lang } from '@/types';

interface Msg { role: 'user' | 'assistant'; content: string; provider?: string; refused?: boolean; fallback?: boolean }

const EXAMPLES = [
  'What is overdue and who owns it?',
  'Summarise my day in three lines',
  'Which ward needs attention this week and why?',
  'Draft a polite reminder to EE Roads about the bill query',
  'Who is waiting in the queue right now?',
  'Sanction the road contractor bill',
];

/** Deterministic fallback when AI is unavailable: keyword match over office records. */
function localAnswer(q: string): string {
  const s = q.toLowerCase();
  const lines: string[] = [];
  if (/overdue|late|pending/.test(s)) {
    db.tasks.filter((t) => new Date(t.due) < new Date() && !['closed', 'verified', 'cancelled'].includes(t.state)).forEach((t) => lines.push(`• ${t.title} — ${t.ownerPost} [${t.id}]`));
  }
  if (/queue|waiting|visitor/.test(s)) db.queue.filter((q2) => q2.status === 'waiting').forEach((q2) => lines.push(`• ${q2.token} ${q2.category}, Ward ${q2.ward}, est. ${q2.waitMin.join('–')} min`));
  if (/ward|attention|grievance/.test(s)) db.wards.forEach((w) => lines.push(`• ${w.name}: ${w.grievancesOverdue} overdue grievances, ${w.repeatComplaints} repeat complaints`));
  if (/day|today|calendar|schedule/.test(s)) db.calendar.filter((e) => new Date(e.start).toDateString() === new Date().toDateString()).forEach((e) => lines.push(`• ${new Date(e.start).toTimeString().slice(0, 5)} ${e.title} [${e.id}]`));
  return lines.length ? `AI unavailable — showing matching records:\n${lines.join('\n')}` : 'AI unavailable and nothing matched in office records. Try “overdue”, “queue”, “ward” or “today”.';
}

export default function Ask() {
  const { lang, setLang, session } = useApp();
  const { toast, run } = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const enabled = aiEnabled();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, thinking]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput('');
    const next: Msg[] = [...msgs, { role: 'user', content: q }];
    setMsgs(next);
    setThinking(true);
    try {
      const history: ChatMsg[] = [
        { role: 'system', content: `${GUARDRAIL_SYSTEM}\nAnswer in ${LANG_LABEL[lang]}. The user is ${session?.user.post}.\nOFFICE DATA (synthetic): ${officeContext()}` },
        ...next.slice(-8).map((m) => ({ role: m.role, content: m.content }) as ChatMsg),
      ];
      const res = await aiChat(history, 'Ask assistant');
      setMsgs([...next, { role: 'assistant', content: res.text, provider: `${res.provider} · ${res.model}`, refused: res.provider === 'guardrail' }]);
    } catch (e) {
      setMsgs([...next, { role: 'assistant', content: localAnswer(q), fallback: true, provider: (e as Error).message }]);
    } finally {
      setThinking(false);
    }
  };

  const toDraft = async (content: string) => {
    await run(api.drafts.save({ title: 'Draft from assistant', body: content, aiGenerated: true, channel: 'in-app', recipient: '' }), 'Saved to Drafts & outbox', 'Labelled AI DRAFT — needs approval before sending');
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Ask" subtitle="Ask, draft or look up — by voice or text. Answers cite office records; nothing is sent without approval." screen="SCR-04" release="P1" env="executive"
        actions={
          <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-line">
            <Languages className="ml-1.5 h-4 w-4 text-muted" />
            {(['en', 'mr', 'hi'] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold', lang === l ? 'bg-surface text-ink shadow-sm' : 'text-muted')}>{LANG_LABEL[l]}</button>
            ))}
          </div>
        } />

      {!enabled && <div className="mb-4"><InfoNote tone="amber" icon={ShieldAlert}>AI is off (feature flag in Configuration or no provider key in <code>.env.local</code>). The assistant falls back to deterministic record search.</InfoNote></div>}

      <Card className="flex h-[calc(100vh-280px)] min-h-[480px] flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {msgs.length === 0 ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/30"><Sparkles className="h-8 w-8" /></div>
              <h2 className="mt-4 text-xl font-bold">How can I help, {session?.user.name.split(' ')[0]}?</h2>
              <p className="mt-1 text-sm text-muted">I only see what your role may see, and I cite the records I used.</p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {EXAMPLES.map((e) => (
                  <button key={e} onClick={() => send(e)} className="rounded-xl border border-line bg-surface-2/50 px-4 py-3 text-left text-sm text-ink/90 transition hover:border-ai/50 hover:bg-orange-500/[0.04]">{e}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {msgs.map((m, i) => (
                <div key={i} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                  <div className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', m.role === 'user' ? 'bg-primary text-white' : m.refused ? 'bg-red-500/10 text-danger' : 'bg-gradient-to-br from-orange-400 to-amber-500 text-white')}>
                    {m.role === 'user' ? <User2 className="h-4 w-4" /> : m.refused ? <ShieldAlert className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn('max-w-[85%] animate-fade-up rounded-2xl px-4 py-3 text-sm leading-relaxed', m.role === 'user' ? 'rounded-tr-sm bg-primary text-white' : 'rounded-tl-sm bg-surface-2 ring-1 ring-line')}>
                    {m.role === 'assistant' ? <Markdown text={m.content} /> : <div className="whitespace-pre-wrap">{m.content}</div>}
                    {m.role === 'assistant' && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                        {m.refused ? <Badge tone="red">Refused by policy</Badge> : m.fallback ? <Badge tone="amber">Fallback · record search</Badge> : <Badge tone="orange" icon={Sparkles}>AI · verify before use</Badge>}
                        <span className="truncate text-[10px] text-muted">{m.provider}</span>
                        <div className="ml-auto flex gap-1">
                          <SpeakButton text={cleanAi(m.content).replace(/[[\]*#`|]/g, '')} label="Listen" size="xs" />
                          <Button size="xs" variant="ghost" icon={Copy} onClick={() => { navigator.clipboard.writeText(m.content); toast('info', 'Copied'); }}>Copy</Button>
                          {!m.refused && <Button size="xs" variant="ghost" icon={ClipboardPlus} onClick={() => toDraft(m.content)}>To draft</Button>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white"><Bot className="h-4 w-4" /></div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-3 text-sm text-muted ring-1 ring-line"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>
        <div className="border-t border-line bg-surface p-3 sm:p-4">
          <form className="mx-auto flex max-w-3xl items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <MicButton onResult={(t) => setInput((v) => (v ? v + ' ' : '') + t)} />
            <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Ask about tasks, visitors, wards, today… or dictate"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className="input max-h-40 min-h-[40px] flex-1 resize-none py-2.5" />
            {msgs.length > 0 && <Button type="button" variant="ghost" icon={RotateCcw} onClick={() => setMsgs([])} aria-label="New conversation" />}
            <Button type="submit" variant="ai" icon={Send} disabled={!input.trim() || thinking}>Send</Button>
          </form>
          <p className="mx-auto mt-2 flex max-w-3xl items-center gap-1.5 text-[11px] text-muted"><Info className="h-3 w-3" /> Refuses statutory, sanction and enforcement intents. Every call is logged for the Security Auditor.</p>
        </div>
      </Card>
    </div>
  );
}
