/**
 * On-device speech-to-text with whisper.cpp (via whisper.rn).
 *
 * The recording never leaves the phone: we record a 16 kHz mono WAV,
 * transcribe it here, and send only the resulting text to the backend.
 * English and Spanish are sent as spoken (the backend answers Spanish in
 * Spanish); other languages are translated to English on the device.
 *
 * The model ships inside the app bundle so speech works on first use and
 * offline. Download it once with:  sh scripts/fetch-whisper-model.sh
 */
import { initWhisper } from 'whisper.rn';
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  type RecordingOptions,
} from 'expo-audio';

// Multilingual "base" model, 5-bit quantised (~57 MB). Good accuracy for short
// emergency descriptions at a size that is reasonable to bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MODEL_ASSET = require('../../assets/models/ggml-base-q5_1.bin');

/** whisper.cpp expects 16 kHz, mono, 16-bit little-endian PCM WAV. */
export const WHISPER_RECORDING_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

type WhisperContext = Awaited<ReturnType<typeof initWhisper>>;
let contextPromise: Promise<WhisperContext> | null = null;

/** Load the model once. Call early (app start) so the first "Speak" is fast. */
export function loadWhisper(): Promise<WhisperContext> {
  if (contextPromise) return contextPromise;
  const pending: Promise<WhisperContext> = initWhisper({ filePath: MODEL_ASSET }).catch((error: unknown) => {
    contextPromise = null; // allow a retry next time
    throw error;
  });
  contextPromise = pending;
  return pending;
}

/**
 * Transcribe a recorded WAV file on the device ('' if nothing heard).
 * English and Spanish come back as spoken (the backend reads Spanish and answers
 * in Spanish); any other language is translated to English on the device.
 */
export async function transcribeOnDevice(fileUri: string): Promise<{ text: string; lang: 'en' | 'es' | null }> {
  const context = await loadWhisper();
  const first = await context.transcribe(fileUri, { language: 'auto', translate: false }).promise;
  const spoken = (first.language || '').toLowerCase();
  if (spoken === 'en' || spoken === 'es') return { text: cleanTranscript(first.result), lang: spoken };
  const { result } = await context.transcribe(fileUri, { language: 'auto', translate: true }).promise;
  return { text: cleanTranscript(result), lang: null };
}

/** Drop whisper's non-speech markers such as "[BLANK_AUDIO]" or "(wind blowing)". */
export function cleanTranscript(text: string): string {
  return text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
