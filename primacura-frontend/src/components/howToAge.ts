import { howTos } from '../data/howTo';
import { HowTo } from '../types';
import { AGE_OPTIONS } from '../lib/i18n';

// The age question shown before a How-To card when the steps differ by age
// (home quick actions, and "Show me how" links to cards marked ask_age).
// Keep in sync with the iOS app's howToAge.ts.
// The answers (English values, as the backend sends them); the labels and hints
// shown on the buttons are in lib/i18n.tsx (ageLabels, ageHints).
export { AGE_OPTIONS };

// The card in `group` for the tapped age option ("Adult", "Child (...)", "Infant (...)").
// Card ids and ages are the same in English and Spanish.
export const cardForAge = (group: string, option: string): string => {
  const age = option.split(' ')[0];
  const cards = howTos.filter((h) => h.group === group);
  return (cards.find((h) => h.age.split('/').includes(age)) ?? cards[0]).id;
};

// Title without the age part, for a link that will ask the age ("Recovery Position").
export const linkTitle = (card: HowTo): string => (card.askAge ? card.title.split(' — ')[0] : card.title);
