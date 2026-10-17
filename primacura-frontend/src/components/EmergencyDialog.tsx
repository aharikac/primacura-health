import { Phone } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export function EmergencyDialog({ onCancel }: { onCancel: () => void }) {
  const { t } = useI18n();
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-heading">
          <span className="confirm-dot" />
          <h2 id="confirm-title">{t('confirmCall')}</h2>
        </div>
        <p>{t('confirmCallText1')}<strong>911</strong>{t('confirmCallText2')}</p>
        <a className="call-button call-button-sheet" href="tel:911">
          <Phone size={26} fill="currentColor" aria-hidden="true" />
          <span>{t('yesCall')}</span>
        </a>
        <button className="cancel-button" onClick={onCancel}>{t('cancel')}</button>
      </section>
    </div>
  );
}