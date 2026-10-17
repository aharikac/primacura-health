import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize2, MapPin, Phone, Square, Speech, X } from 'lucide-react';
import { Condition } from '../types';
import { ShowMeHow } from './ShowMeHow';
import { StepDiagram } from './StepDiagram';
import { CprRhythm } from './CprRhythm';
import { useI18n } from '../lib/i18n';
import { LocationPanel } from './LocationPanel';
import { speakAll, speechSupported, stopSpeaking } from '../lib/speech';
import { factsLine, splitSentences } from '../lib/stepText';
import { MoreBelow, useMoreBelow } from './MoreBelow';

// One step at a time, and the step is the page: the action in big type, the
// picture right in the page (tap to enlarge), the details one sentence per line
// with the key numbers last in bold red, then one clear "Show me how" button.
// Helpers stay small and docked at the bottom: the CPR beat (slim bar, CPR steps
// only), then Back (quiet text), read-aloud and Next (the one big button).
export function ProtocolScreen({
  condition,
  stepIndex,
  onStepChange,
  onOpenHowTo,
  onBack,
  onDone,
  backLabel,
}: {
  condition: Condition;
  // The current step lives in App so "Show me how" -> Back returns to the same step.
  stepIndex: number;
  onStepChange: (index: number) => void;
  onOpenHowTo: (howToId: string) => void;
  onBack: () => void;
  onDone?: () => void; // DONE on the last step; defaults to onBack
  backLabel?: string;
}) {
  const { t, lang, diagrams } = useI18n();
  const total = condition.steps.length;
  const isLast = stepIndex === total - 1;
  const text = condition.steps[stepIndex];
  const rawAction = condition.actions?.[stepIndex] ?? null;
  const action = rawAction && text.startsWith(rawAction) ? rawAction : null;
  const details = action ? text.slice(action.length).trim() : text;
  const lines = splitSentences(details);
  const keyLine = factsLine(condition.facts?.[stepIndex] ?? []);
  const howToId = condition.howTo?.[stepIndex] ?? null;
  const diagramId = condition.diagram?.[stepIndex] ?? null;

  // The rhythm bar shows on CPR steps; once started it stays (keeping the beat)
  // on every step until Stop.
  const hasRhythm = !!condition.rhythm?.some(Boolean);
  const [rhythmRunning, setRhythmRunning] = useState(false);
  const showRhythm = !!condition.rhythm?.[stepIndex] || rhythmRunning;

  const [pictureOpen, setPictureOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  useEffect(() => setPictureOpen(false), [stepIndex]);

  // "More below" hint: shown while the step has content under the fold.
  const bodyRef = useRef<HTMLDivElement>(null);
  const { more, check: checkMore, scrollDown } = useMoreBelow(bodyRef, stepIndex);

  // Read aloud: once switched on, each step is read as you move to it.
  const [readAloud, setReadAloud] = useState(false);
  useEffect(() => {
    if (!readAloud) return;
    speakAll([`${t('stepN', { n: stepIndex + 1 })}. ${action ?? ''} ${details} ${keyLine}`], undefined, undefined, lang);
  }, [readAloud, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopSpeaking(), []);
  const toggleReadAloud = () => {
    if (readAloud) stopSpeaking();
    setReadAloud(!readAloud);
  };

  return (
    <main className="step-screen">
      <header className="step-header">
        <div className="step-header-row">
          <button className="step-back" onClick={onBack} aria-label={t('backTo', { x: backLabel ?? t('guidesTitle') })}>
            <ArrowLeft size={20} strokeWidth={2.8} />
          </button>
          <div className="step-title">
            <span>{t('stepNofM', { n: stepIndex + 1, m: total })}</span>
            <b>{condition.title}</b>
          </div>
          <button className="step-loc" onClick={() => setLocationOpen(true)} aria-label={t('showLocation911')}>
            <MapPin size={17} strokeWidth={2.6} />
          </button>
          {/* Web: a label only, no dial link. */}
          <div className="step-911" role="note" aria-label={t('lifeThreateningCall')}>
            <Phone size={14} fill="currentColor" aria-hidden="true" /> 911
          </div>
        </div>
        <div className="step-progress" aria-hidden="true">
          {condition.steps.map((_, i) => (
            <i key={i} className={i < stepIndex ? 'done' : i === stepIndex ? 'now' : ''} />
          ))}
        </div>
      </header>

      <div className="step-scroll">
      <div className="step-body" key={stepIndex} ref={bodyRef} onScroll={checkMore}>
        {action ? <h1 className="step-action">{action}</h1> : null}
        {diagramId && diagrams[diagramId] && (
          <button type="button" className="step-picture" onClick={() => setPictureOpen(true)} aria-label={t('tapToEnlargeAria', { x: diagrams[diagramId].alt })}>
            <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: diagrams[diagramId].svg }} />
            <span className="step-picture-zoom" aria-hidden="true"><Maximize2 size={12} strokeWidth={2.6} /> {t('tapToEnlarge')}</span>
          </button>
        )}
        {(lines.length > 0 || keyLine) && (
          <ul className={`step-lines ${action ? '' : 'large'}`}>
            {lines.map((line, i) => <li key={i}>{line}</li>)}
            {keyLine && <li className="key">{keyLine}</li>}
          </ul>
        )}
        {howToId && <ShowMeHow howToId={howToId} onOpen={onOpenHowTo} />}
      </div>
      <MoreBelow show={more} onClick={scrollDown} />
      </div>

      <div className="step-dock">
        {hasRhythm && (
          <div hidden={!showRhythm}>
            <CprRhythm variant="bar" onRunningChange={setRhythmRunning} />
          </div>
        )}
        <div className="step-navrow">
          {stepIndex > 0 && (
            <button className="step-prev" onClick={() => onStepChange(stepIndex - 1)} aria-label={t('previousStep')}>
              <ChevronLeft size={22} strokeWidth={2.6} /> {t('back')}
            </button>
          )}
          <span className="step-navrow-spacer" />
          {speechSupported && (
            <button
              className={`step-speak ${readAloud ? 'on' : ''}`}
              onClick={toggleReadAloud}
              aria-pressed={readAloud}
              aria-label={readAloud ? t('stopReadingAloud') : t('readStepsAloud')}
              title={readAloud ? t('stopReading') : t('readAloud')}
            >
              {readAloud ? <Square size={16} fill="currentColor" /> : <Speech size={22} strokeWidth={2.4} />}
            </button>
          )}
          <button className="step-next" onClick={() => (isLast ? (onDone ?? onBack)() : onStepChange(stepIndex + 1))}>
            {isLast ? t('done') : <>{t('next')} <ChevronRight size={22} strokeWidth={2.8} /></>}
          </button>
        </div>
      </div>

      {locationOpen && (
        <div className="step-sheet-backdrop" onClick={() => setLocationOpen(false)}>
          <div className="step-sheet" role="dialog" aria-label={t('yourLocation')} onClick={(e) => e.stopPropagation()}>
            <div className="step-sheet-grab" aria-hidden="true" />
            <div className="step-sheet-head">
              <b>{t('yourLocation911')}</b>
              <button onClick={() => setLocationOpen(false)} aria-label={t('close')}><X size={20} strokeWidth={2.6} /></button>
            </div>
            <LocationPanel autoStart />
          </div>
        </div>
      )}

      {pictureOpen && diagramId && (
        <div className="step-sheet-backdrop" onClick={() => setPictureOpen(false)}>
          <div className="step-sheet" role="dialog" aria-label={t('picture')} onClick={(e) => e.stopPropagation()}>
            <div className="step-sheet-grab" aria-hidden="true" />
            <div className="step-sheet-head">
              <b>{action ?? condition.title}</b>
              <button onClick={() => setPictureOpen(false)} aria-label={t('closePicture')}><X size={20} strokeWidth={2.6} /></button>
            </div>
            <StepDiagram id={diagramId} />
          </div>
        </div>
      )}
    </main>
  );
}
