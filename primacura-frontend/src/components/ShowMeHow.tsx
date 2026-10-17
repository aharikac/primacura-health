import { Play } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { linkTitle } from './howToAge';

// "Show me how" under a guide step: one clear, full-width button that opens the
// matching How-To card. The card's name sits under the label.
export function ShowMeHow({ howToId, onOpen }: { howToId: string; onOpen: (id: string) => void }) {
  const { t, howTos } = useI18n();
  const card = howTos.find((h) => h.id === howToId);
  if (!card) return null;
  const title = linkTitle(card);
  return (
    <button type="button" className="step-howto" onClick={() => onOpen(card.id)} aria-label={`${t('showMeHow')}: ${title}`}>
      <span className="step-howto-play" aria-hidden="true"><Play size={13} fill="currentColor" /></span>
      <span className="step-howto-text">
        <b>{t('showMeHow')}</b>
        <small>{title}</small>
      </span>
    </button>
  );
}
