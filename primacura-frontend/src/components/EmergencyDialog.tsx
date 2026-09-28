import { Phone } from 'lucide-react';

export function EmergencyDialog({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="confirm-heading">
          <span className="confirm-dot" />
          <h2 id="confirm-title">CONFIRM EMERGENCY CALL</h2>
        </div>
        <p>This will dial <strong>911</strong> from your phone. Only use in a real emergency.</p>
        <a className="call-button call-button-sheet" href="tel:911">
          <Phone size={26} fill="currentColor" aria-hidden="true" />
          <span>YES, CALL 911</span>
        </a>
        <button className="cancel-button" onClick={onCancel}>Cancel</button>
      </section>
    </div>
  );
}