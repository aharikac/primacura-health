// Read-aloud clips: every sentence the apps can read aloud, recorded once with a
// natural voice (scripts/generate-speech.py) and bundled with both apps.
//
//   scripts/speech-manifest.json        id + text of every clip (written by generate-guides.mjs)
//   primacura-frontend/public/audio/    the recordings, <id>.mp3 (the one place they are stored)
//   primacura-ios/assets/audio/         copy for the iOS bundle (kept in sync automatically)
//   src/data/speechAudio.ts             per app: which clips exist (generated)
//
// The apps look up a clip by the id of the exact text they are about to say; when
// there is no clip (new or edited text not recorded yet) they fall back to the
// device voice, so a missing recording never breaks read-aloud.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';

// Keep in sync with src/lib/speakable.ts in both apps.
export function speakable(text, lang = 'en') {
  if (lang === 'es') return speakableEs(text);
  if (lang === 'zh-Hans' || lang === 'zh-Hant') return speakableZh(text);
  return text
    .replace(/½/g, ' and a half')
    // Phone numbers digit by digit (1-800-222-1222), before "2-3" becomes "2 to 3".
    .replace(/\b(?:\d{1,3}-)?\d{3}-\d{3}-\d{4}\b/g, (m) => m.split('-').map((g) => g.split('').join(' ')).join(', '))
    .replace(/(\d)\s*[-–]\s*(\d)/g, '$1 to $2')
    .replace(/(\d)\s*:\s*(\d)/g, '$1 to $2')
    .replace(/\/min\b/g, ' a minute')
    .replace(/(\d|half)\s*in\b/g, '$1 inches')
    .replace(/(\d)\s*cm\b/g, '$1 centimeters')
    .replace(/(\d)\s*mg\b/g, '$1 milligrams')
    .replace(/(\d)\s*g\b/g, '$1 grams')
    .replace(/(\d)\s*oz\b/g, '$1 ounces')
    .replace(/(\d)\s*lb\b/g, '$1 pounds')
    .replace(/(\d)\+/g, '$1 or more')
    .replace(/×/g, ' times ')
    .replace(/\s+·\s+/g, ', ')
    .replace(/\b911\b/g, '9 1 1')
    .replace(/\bAED\b/g, 'A E D')
    .replace(/\bEMS\b/g, 'E M S')
    .replace(/\s+/g, ' ')
    .trim();
}

// Spanish guides ("100–120/min" -> "100 a 120 por minuto", "2 pulg" -> "2 pulgadas").
function speakableEs(text) {
  return text
    .replace(/(\d)\s*½/g, '$1 y media')
    .replace(/½/g, 'media')
    .replace(/\b(?:\d{1,3}-)?\d{3}-\d{3}-\d{4}\b/g, (m) => m.split('-').map((g) => g.split('').join(' ')).join(', '))
    .replace(/(\d)\s*[-–]\s*(\d)/g, '$1 a $2')
    .replace(/(\d)\s*:\s*(\d)/g, '$1 a $2')
    .replace(/\/min\b/g, ' por minuto')
    .replace(/(\d|media)\s*pulg\b\.?/g, '$1 pulgadas')
    .replace(/(\d)\s*cm\b/g, '$1 centímetros')
    .replace(/(\d)\s*mg\/dL\b/g, '$1 miligramos por decilitro')
    .replace(/(\d)\s*mg\b/g, '$1 miligramos')
    .replace(/(\d)\s*kg\b/g, '$1 kilos')
    .replace(/(\d)\s*g\b/g, '$1 gramos')
    .replace(/(\d)\s*oz\b/g, '$1 onzas')
    .replace(/(\d)\s*lb\b/g, '$1 libras')
    .replace(/(\d)\s*min\b/g, '$1 minutos')
    .replace(/(\d)\s*seg\b/g, '$1 segundos')
    .replace(/(\d)\+/g, '$1 o más')
    .replace(/×/g, ' por ')
    .replace(/\b2\.ª/g, 'segunda')
    .replace(/\s+·\s+/g, ', ')
    .replace(/\b911\b/g, '9 1 1')
    .replace(/\bDEA\b/g, 'D E A')
    .replace(/\bRCP\b/g, 'R C P')
    .replace(/\s+/g, ' ')
    .trim();
}

// Chinese guides ("100–120次" -> "100到120次", "30 : 2" -> "30比2", "AED" -> "A E D").
function speakableZh(text) {
  return text
    .replace(/(\d)\s*½/g, '$1.5')
    .replace(/½/g, '0.5')
    .replace(/\b(?:\d{1,3}-)?\d{3}-\d{3}-\d{4}\b/g, (m) => m.split('-').map((g) => g.split('').join(' ')).join('，'))
    .replace(/(\d)\s*[-–]\s*(\d)/g, '$1到$2')
    .replace(/(\d)\s*:\s*(\d)/g, '$1比$2')
    .replace(/mg\/dL/g, '毫克每分升')
    .replace(/×/g, '乘')
    .replace(/\s+·\s+/g, '，')
    .replace(/\b911\b/g, '9 1 1')
    .replace(/\bAED\b/g, 'A E D')
    .replace(/\s+/g, ' ')
    .trim();
}

// The full stop after a How-To title or step lead: "Push. " / "按压。". Keep in sync
// with HowToScreen in both apps.
export function stop(lang) {
  return lang === 'zh-Hans' || lang === 'zh-Hant' ? '。' : '. ';
}

// "Step 3." in each language; the apps say it as its own clip before the step.
export function stepLabel(lang, n) {
  if (lang === 'es') return `Paso ${n}.`;
  if (lang === 'zh-Hans' || lang === 'zh-Hant') return `第${n}步。`;
  return `Step ${n}.`;
}

// What a clip's id is the hash of. Cantonese (zh-Hant) recordings are kept apart
// from Mandarin ones, since the same characters can appear in both.
export function clipKey(spoken, lang = 'en') {
  return lang === 'zh-Hant' ? `yue|${spoken}` : spoken;
}

// Keep in sync with src/lib/clipId.ts in both apps (cyrb53, base 36).
export function clipId(text) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// The guides' safety step, which the backend puts first in every guide it sends.
export function readSafetyStep(pchCorePy, lang = 'en') {
  const sfx = { es: '_ES', 'zh-Hans': '_ZH_HANS', 'zh-Hant': '_ZH_HANT' }[lang] ?? '';
  const action = (pchCorePy.match(new RegExp(`^SAFETY_ACTION${sfx}\\s*=\\s*"([^"]+)"`, 'm')) || [])[1];
  const step = (pchCorePy.match(new RegExp(`^SAFETY_STEP${sfx}\\s*=\\s*f"([^"]+)"`, 'm')) || [])[1];
  return action && step ? step.replace(`{SAFETY_ACTION${sfx}}`, action) : null;
}

const MAX_STEP_NUMBER = 20;

// Every piece of text the apps read aloud. Long pieces start with "Step N." in
// the apps; that prefix is its own short clip, so the same step body is reused
// whatever number it has (guides from chat start with the safety step).
// lang: the language of the guides (other than "en", the clips carry it so they are
// recorded with that language's voice).
export function collectSpeech({ conditions, cards, safetyStep, lang = 'en' }) {
  const texts = new Set();
  for (let n = 1; n <= MAX_STEP_NUMBER; n++) texts.add(stepLabel(lang, n));
  // Guide step: "<action> <details> <key numbers>" (ProtocolScreen).
  for (const c of conditions) {
    c.steps.forEach((text, i) => {
      const facts = (c.facts?.[i] ?? []).join(' · ');
      texts.add(`${text} ${facts}`);
    });
  }
  if (safetyStep) texts.add(safetyStep);
  // How-To card: "<title>." then "<lead>. <text>" per step (HowToScreen).
  for (const card of cards ?? []) {
    texts.add(`${card.title}${stop(lang)}`.trim());
    for (const s of card.steps) texts.add(`${s.lead ? `${s.lead}${stop(lang)}` : ''}${s.text}`);
  }
  const clips = new Map();
  for (const t of texts) {
    const spoken = speakable(t, lang);
    if (spoken) clips.set(clipId(clipKey(spoken, lang)), spoken);
  }
  return [...clips].map(([id, text]) => (lang === 'en' ? { id, text } : { id, text, lang })).sort((a, b) => a.id.localeCompare(b.id));
}

export function manifestContent(clips) {
  return JSON.stringify({
    _note: 'GENERATED by scripts/generate-guides.mjs. Record missing clips with: python3 scripts/generate-speech.py',
    clips,
  }, null, 2) + '\n';
}

// Clips that have a recording, as each app needs them.
export function audioMaps(clips, audioDir) {
  const have = clips.filter((c) => existsSync(path.join(audioDir, `${c.id}.mp3`)));
  const head = [
    '// GENERATED FILE - DO NOT EDIT.',
    '// Recorded read-aloud clips (primacura-frontend/public/audio). Record new ones: python3 scripts/generate-speech.py',
  ];
  const web = [...head, 'export const AUDIO: Record<string, string> = {',
    ...have.map((c) => `  ${JSON.stringify(c.id)}: '/audio/${c.id}.mp3',`), '};', ''].join('\n');
  const ios = [...head, '/* eslint-disable @typescript-eslint/no-require-imports */',
    'export const AUDIO: Record<string, number> = {',
    ...have.map((c) => `  ${JSON.stringify(c.id)}: require('../../assets/audio/${c.id}.mp3'),`), '};', ''].join('\n');
  return { web, ios, have };
}

// Mirror the recordings into the iOS bundle folder (copy new/changed, drop stale).
// Returns the list of differences; only changes files when apply is true.
export function syncIosAudio(have, audioDir, iosDir, apply) {
  const diffs = [];
  if (apply) mkdirSync(iosDir, { recursive: true });
  const wanted = new Set(have.map((c) => `${c.id}.mp3`));
  for (const f of wanted) {
    const src = path.join(audioDir, f), dst = path.join(iosDir, f);
    if (existsSync(dst) && readFileSync(src).equals(readFileSync(dst))) continue;
    diffs.push(`copy ${f}`);
    if (apply) copyFileSync(src, dst);
  }
  if (existsSync(iosDir)) {
    for (const f of readdirSync(iosDir)) {
      if (f.endsWith('.mp3') && !wanted.has(f)) {
        diffs.push(`remove ${f}`);
        if (apply) unlinkSync(path.join(iosDir, f));
      }
    }
  }
  return diffs;
}
