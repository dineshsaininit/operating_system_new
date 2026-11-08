import { useEffect, useRef, useState } from 'react';
import { Volume2, Square, Mic, MicOff } from 'lucide-react';
import type { CalendarEventType, DataClass, QueueStatus, RequestStatus, TaskState, Tier } from '@/types';
import { Badge, Button, type Tone } from './ui';
import { SPEECH_LANG } from '@/i18n/strings';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';

export const TASK_STATE_META: Record<TaskState, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'gray' },
  assigned: { label: 'Assigned', tone: 'blue' },
  acknowledged: { label: 'Acknowledged', tone: 'teal' },
  'in-progress': { label: 'In progress', tone: 'purple' },
  submitted: { label: 'Submitted', tone: 'amber' },
  verified: { label: 'Verified', tone: 'green' },
  closed: { label: 'Closed', tone: 'green' },
  reopened: { label: 'Reopened', tone: 'orange' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
};
export const TaskStateBadge = ({ state }: { state: TaskState }) => <Badge tone={TASK_STATE_META[state].tone} dot>{TASK_STATE_META[state].label}</Badge>;

export const REQUEST_META: Record<RequestStatus, { label: string; tone: Tone }> = {
  requested: { label: 'Requested', tone: 'blue' }, approved: { label: 'Approved', tone: 'green' }, declined: { label: 'Declined', tone: 'red' },
  redirected: { label: 'Redirected', tone: 'amber' }, escalated: { label: 'With executive', tone: 'purple' }, held: { label: 'Held', tone: 'gray' },
};

export const QUEUE_META: Record<QueueStatus, { label: string; tone: Tone }> = {
  waiting: { label: 'Waiting', tone: 'blue' }, called: { label: 'Called', tone: 'amber' }, 'in-meeting': { label: 'In meeting', tone: 'green' },
  done: { label: 'Done', tone: 'gray' }, redirected: { label: 'Routed', tone: 'purple' }, left: { label: 'Left', tone: 'gray' },
};

export const TIER_META: Record<Tier, { label: string; tone: Tone; description: string }> = {
  interrupt: { label: 'Interrupt', tone: 'red', description: 'Reaches you immediately, even in Peace Mode' },
  normal: { label: 'Normal', tone: 'blue', description: 'Push and in-app, held during Peace Mode' },
  digest: { label: 'Digest', tone: 'gray', description: 'Collected into the next digest' },
};

export const CLASS_META: Record<DataClass, { label: string; tone: Tone }> = {
  PUB: { label: 'Public', tone: 'green' }, INT: { label: 'Internal', tone: 'blue' }, OFF: { label: 'Official', tone: 'amber' }, RES: { label: 'Restricted', tone: 'red' },
};

export const EVENT_STYLE: Record<CalendarEventType, { label: string; cls: string; dot: string }> = {
  meeting: { label: 'Meeting', cls: 'bg-blue-500/10 border-blue-500/40 text-blue-800 dark:text-blue-200', dot: 'bg-blue-500' },
  appointment: { label: 'Appointment', cls: 'bg-teal-500/10 border-teal-500/40 text-teal-800 dark:text-teal-200', dot: 'bg-teal-500' },
  focus: { label: 'Focus block', cls: 'bg-indigo-500/10 border-indigo-500/40 text-indigo-800 dark:text-indigo-200 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(99_102_241/0.08)_6px,rgb(99_102_241/0.08)_12px)]', dot: 'bg-indigo-500' },
  busy: { label: 'Busy (private)', cls: 'bg-purple-500/10 border-purple-500/40 text-purple-800 dark:text-purple-200', dot: 'bg-purple-500' },
  buffer: { label: 'Buffer', cls: 'bg-slate-500/5 border-slate-400/40 border-dashed text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  internal: { label: 'Internal', cls: 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-200', dot: 'bg-slate-500' },
  'walkin-window': { label: 'Walk-in window', cls: 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200', dot: 'bg-amber-500' },
  'site-visit': { label: 'Site visit', cls: 'bg-green-500/10 border-green-500/40 text-green-800 dark:text-green-200', dot: 'bg-green-500' },
};

/** Read-out button using the browser speech engine (voice read-out NFR for Today and Briefing). */
export function SpeakButton({ text, label = 'Read aloud', size = 'sm', variant = 'secondary' }: { text: string; label?: string; size?: 'xs' | 'sm' | 'md'; variant?: 'secondary' | 'glass' }) {
  const { lang } = useApp();
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  if (!('speechSynthesis' in window)) return null;
  return (
    <Button variant={variant} size={size} icon={speaking ? Square : Volume2} onClick={() => {
      if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = SPEECH_LANG[lang]; u.rate = 1.02;
      u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setSpeaking(true);
    }}>{speaking ? 'Stop' : label}</Button>
  );
}

/** Push-to-talk mic using the Web Speech API where the browser supports it. */
export function useSpeechInput(onResult: (text: string) => void) {
  const { lang } = useApp();
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const supported = !!SR;
  const start = () => {
    if (!SR) return;
    const rec = new SR();
    rec.lang = SPEECH_LANG[lang]; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => onResult(e.results[0][0].transcript);
    rec.onend = () => setListening(false); rec.onerror = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  };
  const stop = () => { recRef.current?.stop(); setListening(false); };
  return { supported, listening, start, stop };
}

export function MicButton({ onResult, className }: { onResult: (t: string) => void; className?: string }) {
  const { supported, listening, start, stop } = useSpeechInput(onResult);
  return (
    <button type="button" disabled={!supported} title={supported ? 'Push to talk' : 'Voice input not supported in this browser'}
      onClick={() => (listening ? stop() : start())}
      className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition', listening ? 'animate-pulse-ring bg-danger text-white' : 'bg-surface-2 text-muted ring-1 ring-line hover:text-primary', !supported && 'opacity-40', className)}
      aria-label={listening ? 'Stop listening' : 'Start voice input'}>
      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </button>
  );
}
