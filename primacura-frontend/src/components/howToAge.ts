import { howTos } from '../data/howTo';
import { HowTo } from '../types';

// The age question shown before a How-To card when the steps differ by age
// (home quick actions, and "Show me how" links to cards marked ask_age).
// Keep in sync with the iOS app's howToAge.ts.
export const AGE_OPTIONS = ['Adult', 'Child (1 year to puberty)', 'Infant (under 1 year)'];
export const AGE_HINTS = ['Teen or grown-up', 'Toddler to pre-teen', 'Baby under 1 year old'];

// The card in `group` for the tapped age option ("Adult", "Child (...)", "Infant (...)").
export const cardForAge = (group: string, option: string): string => {
  const age = option.split(' ')[0];
  const cards = howTos.filter((h) => h.group === group);
  return (cards.find((h) => h.age.split('/').includes(age)) ?? cards[0]).id;
};

// Title without the age part, for a link that will ask the age ("Recovery Position").
export const linkTitle = (card: HowTo): string => (card.askAge ? card.title.split(' — ')[0] : card.title);
