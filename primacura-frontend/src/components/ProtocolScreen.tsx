import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Condition } from '../types';

export function ProtocolScreen({
  condition,
  onBack,
  onDone,
  backLabel = 'First-Aid Guides',
}: {
  condition: Condition;
  onBack: () => void;
  onDone?: () => void;   // DONE on the last step; defaults to onBack
  backLabel?: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const isLast = stepIndex === condition.steps.length - 1;

  return (
    <main className="protocol-screen">
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

        <div className="header-title-row">
          <h1>{condition.title}</h1>
          <p>Follow these steps carefully.</p>
        </div>
      </header>
      <div className="protocol-body">
        <div className="step-counter">STEP {stepIndex + 1} OF {condition.steps.length}</div>
        <p key={stepIndex} className="step-text">{condition.steps[stepIndex].replace(/([.!?])\s+/g, '$1\n\n')}</p>
      </div>
      <div className="protocol-actions">
        {stepIndex > 0 && (
          <button className="step-nav step-nav-back" onClick={() => setStepIndex(stepIndex - 1)}>
            <ArrowLeft size={24} strokeWidth={2.8} /> BACK
          </button>
        )}
        <button
          className={`step-nav step-nav-next ${stepIndex === 0 ? 'step-nav-full' : ''}`}
          onClick={() => (isLast ? (onDone ?? onBack)() : setStepIndex(stepIndex + 1))}
        >
          {isLast ? 'DONE' : 'NEXT'} <ArrowRight size={24} strokeWidth={2.8} />
        </button>
      </div>
    </main>
  );
}