import { CirclePlay } from 'lucide-react';
import { howTos } from '../data/howTo';
import { howToIcon } from './howToIcons';
import { linkTitle } from './howToAge';

// "Show me how" chip under a guide step: opens the matching How-To card.
export function ShowMeHow({ howToId, onOpen }: { howToId: string; onOpen: (id: string) => void }) {
  const card = howTos.find((h) => h.id === howToId);
  if (!card) return null;
  const Icon = howToIcon(card.id);
  return (
    <button type="button" className="step-chip step-chip-howto" onClick={() => onOpen(card.id)}>
      <span className="step-chip-icon" aria-hidden="true">
        <Icon size={18} strokeWidth={2.4} />
      </span>
      <span className="step-chip-text">
        <small><CirclePlay size={11} strokeWidth={3} aria-hidden="true" /> Show me how</small>
        {linkTitle(card)}
      </span>
    </button>
  );
}
