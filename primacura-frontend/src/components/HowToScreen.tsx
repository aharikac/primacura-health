import { useEffect, useRef, useState } from 'react';
import { speakAll, speechSupported, stopSpeaking } from '../lib/speech';
import { ArrowLeft, Phone, Square, TriangleAlert, Volume2 } from 'lucide-react';
import { howTos } from '../data/howTo';
import { howToIcon } from './howToIcons';
import { StepDiagram } from './StepDiagram';
import { CprRhythm } from './CprRhythm';
import { MoreBelow, useMoreBelow } from './MoreBelow';
import { factsLine } from '../lib/stepText';

// One How-To card. The numbered steps and their pictures are the page; the key
// numbers are one bold line of text, and the CPR beat is a slim bar docked at
// the bottom (CPR cards only). A "More below" hint shows while there is more
// to scroll. Cards in the same group (e.g. CPR) switch with age tabs.
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

  // Listen: reads the steps in order, highlighting the one being read.
  const [speaking, setSpeaking] = useState<number | null>(null);
  const stepRefs = useRef<(HTMLLIElement | null)[]>([]);
  useEffect(() => { stopSpeaking(); setSpeaking(null); }, [currentId]);
  useEffect(() => () => stopSpeaking(), []);
  const listen = () => {
    if (speaking !== null) { stopSpeaking(); setSpeaking(null); return; }
    setSpeaking(-1);
    speakAll(
      [`${card.title}.`, ...card.steps.map((s, i) => `Step ${i + 1}. ${s.lead ? s.lead + '. ' : ''}${s.text}`)],
      (i) => {
        setSpeaking(i - 1);
        stepRefs.current[i - 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      () => setSpeaking(null),
    );
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const { more, check, scrollDown } = useMoreBelow(scrollRef, currentId);
  const keyLine = factsLine(card.keyFacts);
  const siblings = card.group ? howTos.filter((h) => h.group === card.group) : [];
  const Icon = howToIcon(card.id);

  return (
    <main className="howto-screen">
      <div className="howto-scrollwrap">
      <div className="howto-scroll" ref={scrollRef} onScroll={check}>
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
      {speechSupported && (
        <button className={`read-aloud listen ${speaking !== null ? 'on' : ''}`} onClick={listen} aria-pressed={speaking !== null}>
          {speaking !== null ? <Square size={13} fill="currentColor" /> : <Volume2 size={15} />}
          {speaking !== null ? 'Stop listening' : 'Listen to the steps'}
        </button>
      )}

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

      {keyLine && <p className="howto-key"><span aria-hidden="true" />{keyLine}</p>}

      <ol className="howto-steps">
        {card.steps.map((step, i) => (
          <li
            key={`${card.id}-${i}`}
            ref={(el) => { stepRefs.current[i] = el; }}
            className={`howto-step ${speaking === i ? 'speaking' : ''}`}
          >
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
      </div>
      <MoreBelow show={more} onClick={scrollDown} />
      </div>

      {card.rhythm && (
        <div className="howto-dock">
          <CprRhythm key={card.id} variant="bar" initialMode={card.rhythm} />
        </div>
      )}
    </main>
  );
}
