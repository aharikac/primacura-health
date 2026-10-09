import { Play } from 'lucide-react';
import { howTos } from '../data/howTo';
import { linkTitle } from './howToAge';

// "Show me how" under a guide step: one clear, full-width button that opens the
// matching How-To card. The card's name sits under the label.
export function ShowMeHow({ howToId, onOpen }: { howToId: string; onOpen: (id: string) => void }) {
  const card = howTos.find((h) => h.id === howToId);
  if (!card) return null;
  const title = linkTitle(card);
  return (
    <button type="button" className="step-howto" onClick={() => onOpen(card.id)} aria-label={`Show me how: ${title}`}>
      <span className="step-howto-play" aria-hidden="true"><Play size={13} fill="currentColor" /></span>
      <span className="step-howto-text">
        <b>Show me how</b>
        <small>{title}</small>
      </span>
    </button>
  );
}
