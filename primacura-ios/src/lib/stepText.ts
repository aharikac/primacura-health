// Turns a step's details into one line per sentence, so each instruction
// starts on its own line. Splits after . ! or ? (and a closing quote) when the
// next sentence starts with a capital, a digit or an opening quote; decimals
// like "0.5" never split because there is no space after the point.
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    let end = i + 1;
    while (end < text.length && /["”')]/.test(text[end])) end++;
    let next = end;
    while (next < text.length && text[next] === ' ') next++;
    if (next === end || next >= text.length) continue;
    if (!/["“A-Z0-9]/.test(text[next])) continue;
    const piece = text.slice(start, end).trim();
    if (piece) out.push(piece);
    start = next;
    i = next - 1;
  }
  const last = text.slice(start).trim();
  if (last) out.push(last);
  return out;
}

// The key numbers for a step as one short line, e.g. "30 pushes · 100–120/min · At least 2 in".
export function factsLine(facts: string[]): string {
  return facts.map((f) => f.trim()).filter(Boolean).join(' · ');
}
