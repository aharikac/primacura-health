// Contact form limits. Keep in sync with the iOS app and ContactForm in pchService.py.
export const MAX_NAME_CHARS = 50;
export const MAX_EMAIL_CHARS = 60;
export const MAX_MESSAGE_WORDS = 300;
export const MAX_MESSAGE_CHARS = 2500; // backstop for very long "words"

export const countWords = (text: string) => (text.match(/\S+/g) ?? []).length;

// Keeps text up to the end of its Nth word (anything typed or pasted past it is dropped).
export function limitWords(text: string, max = MAX_MESSAGE_WORDS): string {
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text))) {
    n += 1;
    if (n === max) {
      const end = m.index + m[0].length;
      return end < text.length && /\S/.test(text.slice(end)) ? text.slice(0, end) : text;
    }
  }
  return text;
}
