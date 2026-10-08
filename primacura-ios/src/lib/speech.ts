import * as Speech from 'expo-speech';
import { speakable } from './speakable';

// Read-aloud with the phone's built-in voice (on-device, nothing uploaded).
let run = 0; // bumps on every new request so a stopped queue never continues

// Speak several pieces in order; onIndex(i) fires as piece i starts, onEnd when all are done.
export function speakAll(pieces: string[], onIndex?: (i: number) => void, onEnd?: () => void) {
  const mine = ++run;
  Speech.stop();
  const next = (i: number) => {
    if (mine !== run) return;
    if (i >= pieces.length) { onEnd?.(); return; }
    Speech.speak(speakable(pieces[i]), {
      language: 'en-US',
      rate: 0.95,
      onStart: () => { if (mine === run) onIndex?.(i); },
      onDone: () => next(i + 1),
      onError: () => next(i + 1),
    });
  };
  next(0);
}

export function stopSpeaking() {
  run++;
  Speech.stop();
}
