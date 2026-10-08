import { speakable } from './speakable';

// Read-aloud with the browser's built-in speech (no network, nothing uploaded).
export const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

let run = 0; // bumps on every new request so a stopped queue never continues

// Speak several pieces in order; onIndex(i) fires as piece i starts, onEnd when all are done.
export function speakAll(pieces: string[], onIndex?: (i: number) => void, onEnd?: () => void) {
  if (!speechSupported) return;
  const mine = ++run;
  window.speechSynthesis.cancel();
  const next = (i: number) => {
    if (mine !== run) return;
    if (i >= pieces.length) { onEnd?.(); return; }
    const u = new SpeechSynthesisUtterance(speakable(pieces[i]));
    u.lang = 'en-US';
    u.rate = 0.95;
    u.onstart = () => mine === run && onIndex?.(i);
    u.onend = () => next(i + 1);
    u.onerror = () => next(i + 1);
    window.speechSynthesis.speak(u);
  };
  next(0);
}

export function stopSpeaking() {
  run++;
  if (speechSupported) window.speechSynthesis.cancel();
}
