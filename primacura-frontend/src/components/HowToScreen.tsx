import { useEffect, useState } from 'react';
import { ArrowLeft, Phone, TriangleAlert } from 'lucide-react';
import { howTos } from '../data/howTo';
import { howToIcon } from './howToIcons';
import { StepDiagram } from './StepDiagram';
import { CprRhythm } from './CprRhythm';

// One How-To card: what it's for, the key numbers, numbered moves and what to
// watch out for. Cards in the same group (e.g. CPR) switch with age tabs.
export function HowToScreen({
  howToId,
  onBack,
  backLabel = 'Back',
}: {
  howToId: string;
  onBack: () => void;
  backLabel?: string;
}) {
  const [currentId, setCurrentId] = useState(howToId);
  useEffect(() => setCurrentId(howToId), [howToId]);

  const card = howTos.find((h) => h.id === currentId) ?? howTos[0];
  const siblings = card.group ? howTos.filter((h) => h.group === card.group) : [];
  const Icon = howToIcon(card.id);

  return (
    <main className="howto-screen">
      <header className="inner-page-header tight-bottom">
        <div className="header-top-row">
          <button className="nav-back-btn" onClick={onBack} aria-label={`Back to ${backLabel}`}>
            <div className="nav-icon-circle">
              <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
            </div>
            {backLabel}
          </button>
          <div className="inner-brand">
            <span className="inner-brand-title">PrimaCura</span>
            <span className="inner-brand-slogan">The First Care</span>
          </div>
        </div>
      </header>

      <section className="howto-hero">
        <div className="howto-hero-icon" aria-hidden="true">
          <Icon size={30} strokeWidth={2.4} />
        </div>
        <div className="howto-hero-text">
          <span className="howto-eyebrow">How-To</span>
          <h1>{card.title}</h1>
        </div>
      </section>
      <p className="howto-summary">{card.summary}</p>

      {siblings.length > 1 && (
        <div className="howto-tabs" role="tablist" aria-label="Who is it for">
          {siblings.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === card.id}
              className={`howto-tab ${s.id === card.id ? 'active' : ''}`}
              onClick={() => setCurrentId(s.id)}
            >
              {s.age}
            </button>
          ))}
        </div>
      )}

      {card.keyFacts.length > 0 && (
        <ul className="howto-facts" aria-label="Key facts">
          {card.keyFacts.map((fact) => (
            <li key={fact} className="howto-fact">{fact}</li>
          ))}
        </ul>
      )}

      {card.rhythm && <CprRhythm key={card.id} initialMode={card.rhythm} />}

      <ol className="howto-steps">
        {card.steps.map((step, i) => (
          <li key={`${card.id}-${i}`} className="howto-step">
            <span className="howto-step-num" aria-hidden="true">{i + 1}</span>
            <div className="howto-step-body">
              {step.lead && <strong className="howto-step-lead">{step.lead}</strong>}
              <p>{step.text}</p>
              {step.diagram && <StepDiagram id={step.diagram} />}
            </div>
          </li>
        ))}
      </ol>

      {card.watchOut.length > 0 && (
        <aside className="howto-watch" aria-label="Watch out">
          <div className="howto-watch-title">
            <TriangleAlert size={18} strokeWidth={2.6} aria-hidden="true" /> Watch out
          </div>
          <ul>
            {card.watchOut.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </aside>
      )}

      {/* Text only on the web (no dial link). */}
      <div className="emergency-pill" role="note">
        <Phone size={16} fill="currentColor" aria-hidden="true" /> Life-threatening? Call 911 first.
      </div>
    </main>
  );
}
