import { Lang } from '../types';

// Turns guide text into words a speech engine says clearly
// ("100–120/min" -> "100 to 120 a minute", "2 in" -> "2 inches", "911" -> "9 1 1").
// Keep in sync with scripts/speech-clips.mjs and the other app's src/lib/speakable.ts.
export function speakable(text: string, lang: Lang = 'en'): string {
  if (lang === 'es') return speakableEs(text);
  return text
    .replace(/½/g, ' and a half')
    // Phone numbers digit by digit (1-800-222-1222), before "2-3" becomes "2 to 3".
    .replace(/\b(?:\d{1,3}-)?\d{3}-\d{3}-\d{4}\b/g, (m: string) => m.split('-').map((g) => g.split('').join(' ')).join(', '))
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
function speakableEs(text: string): string {
  return text
    .replace(/(\d)\s*½/g, '$1 y media')
    .replace(/½/g, 'media')
    .replace(/\b(?:\d{1,3}-)?\d{3}-\d{3}-\d{4}\b/g, (m: string) => m.split('-').map((g) => g.split('').join(' ')).join(', '))
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
