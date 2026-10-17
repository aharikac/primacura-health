import { speakable } from './speakable';
import { clipId } from './clipId';
import { AUDIO } from '../data/speechAudio';
import { Lang } from '../types';

// Read-aloud. Every guide and How-To sentence is pre-recorded with a natural
// voice (public/audio, see scripts/generate-speech.py); anything without a
// recording falls back to the browser's built-in voice. Nothing is uploaded.
const hasSynth = typeof window !== 'undefined' && 'speechSynthesis' in window;
export const speechSupported = hasSynth || Object.keys(AUDIO).length > 0;

let run = 0; // bumps on every new request so a stopped queue never continues
let current: HTMLAudioElement | null = null;

// "Step 3. Push hard…" is said as two clips, "Step 3." and the step itself,
// so one recording of each step works whatever number it has.
function units(piece: string, lang: Lang): string[] {
  const m = piece.match(/^\s*((?:Step|Paso) \d+\.)\s+([\s\S]+)$/);
  return (m ? [m[1], m[2]] : [piece]).map((t) => speakable(t, lang)).filter(Boolean);
}

// The device voice for text with no recording: a Spanish voice for Spanish text.
function voiceFor(lang: Lang): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang === 'es' ? 'es' : 'en';
  return voices.find((v) => v.lang === (lang === 'es' ? 'es-US' : 'en-US'))
    ?? voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
}

function sayOne(text: string, mine: number, done: () => void, lang: Lang) {
  if (mine !== run) return;
  const url = AUDIO[clipId(text)];
  if (url) {
    const audio = new Audio(url);
    current = audio;
    audio.onended = () => { if (current === audio) current = null; done(); };
    audio.onerror = () => { if (current === audio) current = null; synth(text, mine, done, lang); };
    audio.play().catch(() => { if (current === audio) current = null; synth(text, mine, done, lang); });
    return;
  }
  synth(text, mine, done, lang);
}

function synth(text: string, mine: number, done: () => void, lang: Lang) {
  if (mine !== run) return;
  if (!hasSynth) { done(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'es' ? 'es-US' : 'en-US';
  const voice = voiceFor(lang);
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.onend = done;
  u.onerror = done;
  window.speechSynthesis.speak(u);
}

// Speak several pieces in order; onIndex(i) fires as piece i starts, onEnd when all are done.
export function speakAll(pieces: string[], onIndex?: (i: number) => void, onEnd?: () => void, lang: Lang = 'en') {
  stopSpeaking();
  const mine = run;
  const queue = pieces.flatMap((p, i) => units(p, lang).map((text, k) => ({ text, piece: i, first: k === 0 })));
  const next = (j: number) => {
    if (mine !== run) return;
    if (j >= queue.length) { onEnd?.(); return; }
    const item = queue[j];
    if (item.first) onIndex?.(item.piece);
    sayOne(item.text, mine, () => next(j + 1), lang);
  };
  next(0);
}

export function stopSpeaking() {
  run++;
  if (current) { current.pause(); current = null; }
  if (hasSynth) window.speechSynthesis.cancel();
}
