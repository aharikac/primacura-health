import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';
import { speakable } from './speakable';

// Read-aloud with the phone's built-in voice (on-device, nothing uploaded).
let run = 0; // bumps on every new request so a stopped queue never continues

// iOS mutes app audio when the ring/silent switch is on, unless the audio
// session is set to play in silent mode. Someone following first-aid steps
// should always hear them, so switch it on before speaking.
let sessionReady: Promise<void> | null = null;
function ensurePlaybackSession() {
  if (!sessionReady) {
    sessionReady = setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false })
      .catch(() => undefined)
      .finally(() => { sessionReady = null; });
  }
  return sessionReady;
}

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
      useApplicationAudioSession: true,
      onStart: () => { if (mine === run) onIndex?.(i); },
      onDone: () => next(i + 1),
      onError: () => next(i + 1),
    });
  };
  void ensurePlaybackSession().then(() => next(0));
}

export function stopSpeaking() {
  run++;
  Speech.stop();
}
