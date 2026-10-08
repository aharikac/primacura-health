import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Image as ImageIcon, MapPin, Phone, Square, Speech, X } from 'lucide-react';
import { Condition } from '../types';
import { ShowMeHow } from './ShowMeHow';
import { StepDiagram } from './StepDiagram';
import { CprRhythm } from './CprRhythm';
import { diagrams } from '../data/diagrams';
import { LocationPanel } from './LocationPanel';
import { speakAll, speechSupported, stopSpeaking } from '../lib/speech';

// One step at a time: the action in big type, details under it, key numbers as
// pills, then small chips for the picture and "Show me how". The CPR rhythm bar
// and Back/Next are docked at the bottom, so nothing ever covers the step.
export function ProtocolScreen({
  condition,
  stepIndex,
  onStepChange,
  onOpenHowTo,
  onBack,
  onDone,
  backLabel = 'First-Aid Guides',
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
  const total = condition.steps.length;
  const isLast = stepIndex === total - 1;
  const text = condition.steps[stepIndex];
  const rawAction = condition.actions?.[stepIndex] ?? null;
  const action = rawAction && text.startsWith(rawAction) ? rawAction : null;
  const details = action ? text.slice(action.length).trim() : text;
  const facts = condition.facts?.[stepIndex] ?? [];
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

  // Read aloud: once switched on, each step is read as you move to it.
  const [readAloud, setReadAloud] = useState(false);
  useEffect(() => {
    if (!readAloud) return;
    speakAll([`Step ${stepIndex + 1}. ${action ?? ''} ${details}`]);
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
          <button className="step-back" onClick={onBack} aria-label={`Back to ${backLabel}`}>
            <ArrowLeft size={20} strokeWidth={2.8} />
          </button>
          <div className="step-title">
            <span>Step {stepIndex + 1} of {total}</span>
            <b>{condition.title}</b>
          </div>
          <button className="step-loc" onClick={() => setLocationOpen(true)} aria-label="Show my location for 911">
            <MapPin size={17} strokeWidth={2.6} />
          </button>
          {/* Web: a label only, no dial link. */}
          <div className="step-911" role="note" aria-label="Life-threatening? Call 911">
            <Phone size={14} fill="currentColor" aria-hidden="true" /> 911
          </div>
        </div>
        <div className="step-progress" aria-hidden="true">
          {condition.steps.map((_, i) => (
            <i key={i} className={i < stepIndex ? 'done' : i === stepIndex ? 'now' : ''} />
          ))}
        </div>
      </header>

      <div className="step-body" key={stepIndex}>
        {action ? <h1 className="step-action">{action}</h1> : null}
        {details && <p className={action ? 'step-details' : 'step-details step-details-only'}>{details}</p>}
        {facts.length > 0 && (
          <ul className="step-facts" aria-label="Key numbers">
            {facts.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}
        {(diagramId || howToId) && (
          <div className="step-chips">
            {diagramId && diagrams[diagramId] && (
              <button type="button" className="step-chip" onClick={() => setPictureOpen(true)}>
                <span className="step-chip-icon" aria-hidden="true"><ImageIcon size={18} strokeWidth={2.4} /></span>
                <span className="step-chip-text">See picture</span>
              </button>
            )}
            {howToId && <ShowMeHow howToId={howToId} onOpen={onOpenHowTo} />}
          </div>
        )}
      </div>

      <div className="step-dock">
        {hasRhythm && (
          <div hidden={!showRhythm}>
            <CprRhythm variant="bar" onRunningChange={setRhythmRunning} />
          </div>
        )}
        <div className="protocol-actions">
          {stepIndex > 0 && (
            <button className="step-nav step-nav-back" onClick={() => onStepChange(stepIndex - 1)}>
              <ArrowLeft size={24} strokeWidth={2.8} /> BACK
            </button>
          )}
          {speechSupported && (
            <button
              className={`step-speak ${readAloud ? 'on' : ''}`}
              onClick={toggleReadAloud}
              aria-pressed={readAloud}
              aria-label={readAloud ? 'Stop reading aloud' : 'Read steps aloud'}
              title={readAloud ? 'Stop reading' : 'Read aloud'}
            >
              {readAloud ? <Square size={18} fill="currentColor" /> : <Speech size={24} strokeWidth={2.4} />}
            </button>
          )}
          <button
            className={`step-nav step-nav-next ${stepIndex === 0 ? 'step-nav-full' : ''}`}
            onClick={() => (isLast ? (onDone ?? onBack)() : onStepChange(stepIndex + 1))}
          >
            {isLast ? 'DONE' : 'NEXT'} <ArrowRight size={24} strokeWidth={2.8} />
          </button>
        </div>
      </div>

      {locationOpen && (
        <div className="step-sheet-backdrop" onClick={() => setLocationOpen(false)}>
          <div className="step-sheet" role="dialog" aria-label="Your location" onClick={(e) => e.stopPropagation()}>
            <div className="step-sheet-grab" aria-hidden="true" />
            <div className="step-sheet-head">
              <b>Your location for 911</b>
              <button onClick={() => setLocationOpen(false)} aria-label="Close"><X size={20} strokeWidth={2.6} /></button>
            </div>
            <LocationPanel autoStart />
          </div>
        </div>
      )}

      {pictureOpen && diagramId && (
        <div className="step-sheet-backdrop" onClick={() => setPictureOpen(false)}>
          <div className="step-sheet" role="dialog" aria-label="Picture" onClick={(e) => e.stopPropagation()}>
            <div className="step-sheet-grab" aria-hidden="true" />
            <div className="step-sheet-head">
              <b>{action ?? condition.title}</b>
              <button onClick={() => setPictureOpen(false)} aria-label="Close picture"><X size={20} strokeWidth={2.6} /></button>
            </div>
            <StepDiagram id={diagramId} />
          </div>
        </div>
      )}
    </main>
  );
}
