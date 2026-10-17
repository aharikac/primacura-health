import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { clipKey, speakable } from './speakable';
import { clipId } from './clipId';
import { AUDIO } from '../data/speechAudio';
import { Lang } from '../types';

// Read-aloud. Every guide and How-To sentence is pre-recorded with a natural
// voice (assets/audio, see scripts/generate-speech.py); anything without a
// recording falls back to the phone's built-in voice. Nothing is uploaded.
const SYNTH_LANG: Record<Lang, string> = { en: 'en-US', es: 'es-US', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-HK' };
let run = 0; // bumps on every new request so a stopped queue never continues
let current: AudioPlayer | null = null;

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

// "Step 3. Push hard…" is said as two clips, "Step 3." and the step itself,
// so one recording of each step works whatever number it has.
function units(piece: string, lang: Lang): string[] {
  const m = piece.match(/^\s*((?:Step|Paso) \d+\.|第\d+步。)\s*([\s\S]+)$/);
  return (m ? [m[1], m[2]] : [piece]).map((t) => speakable(t, lang)).filter(Boolean);
}

function releaseCurrent() {
  const p = current;
  current = null;
  if (p) { try { p.pause(); p.remove(); } catch { /* already released */ } }
}

function sayOne(text: string, mine: number, done: () => void, lang: Lang) {
  if (mine !== run) return;
  const source = AUDIO[clipId(clipKey(text, lang))];
  if (source !== undefined) {
    try {
      const player = createAudioPlayer(source);
      current = player;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        sub.remove();
        if (current === player) releaseCurrent();
        done();
      };
      const sub = player.addListener('playbackStatusUpdate', (s) => { if (s.didJustFinish) finish(); });
      player.play();
      return;
    } catch {
      releaseCurrent(); // fall through to the device voice
    }
  }
  // No recording: the phone's own voice in the text's language (Cantonese for zh-Hant).
  Speech.speak(text, { language: SYNTH_LANG[lang], rate: 0.95, useApplicationAudioSession: true, onDone: done, onError: done });
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
  void ensurePlaybackSession().then(() => next(0));
}

export function stopSpeaking() {
  run++;
  releaseCurrent();
  Speech.stop();
}
