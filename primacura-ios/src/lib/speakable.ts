// Turns guide text into words a speech engine says clearly
// ("100–120/min" -> "100 to 120 a minute", "2 in" -> "2 inches", "911" -> "9 1 1").
// Keep in sync with the web app's src/lib/speakable.ts.
export function speakable(text: string): string {
  return text
    .replace(/½/g, ' and a half')
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
    .replace(/\b911\b/g, '9 1 1')
    .replace(/\bAED\b/g, 'A E D')
    .replace(/\bEMS\b/g, 'E M S')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
