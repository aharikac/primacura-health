import { ArrowLeft } from 'lucide-react';
import { SearchBox } from './SearchBox';
import { optionIcon } from './optionIcons';

export function ClarificationScreen({
  message,
  options = [],
  hints = [],
  onSelectOption,
  query,
  setQuery,
  onSearch,
  onBack,
  backLabel = 'Home',
  loading,
}: {
  message: string;
  options?: string[];
  hints?: string[];
  onSelectOption?: (option: string) => void;
  query: string;
  setQuery: (value: string) => void;
  onSearch: () => void;
  onBack: () => void;
  backLabel?: string;
  loading: boolean;
}) {
  return (
    <main className="clarification-screen">
      <header className="inner-page-header tight-bottom">
        
        <div className="header-top-row">
          <button className="nav-back-btn" onClick={onBack} aria-label={backLabel === 'Home' ? 'Back to home' : 'Back to the previous question'}>
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
          <h1 style={{ margin: 0 }}>Please clarify the situation</h1>
        </div>
        
      </header>
      <div className="safety-reminder">
        <strong>CHECK SCENE FOR SAFETY.</strong>
        <span>If it's life-threatening, call 911 immediately.</span>
      </div>

      {/* With buttons, the question and its answers share one card so the
          question reads as the label for the buttons. Tapping sends the exact
          option label, which the backend always resolves. */}
      {options.length > 0 && onSelectOption ? (
        <section className="clarification-message-container clarification-choice"
                 role="group" aria-labelledby="clarification-question">
          <div id="clarification-question" className="choice-question">
            <MessageParagraphs text={message} />
          </div>
          <div className="clarification-options">
            {options.map((option, i) => {
              const Icon = optionIcon(option);
              const hint = hints[i];
              return (
                <button
                  key={option}
                  type="button"
                  className="clarification-option-btn"
                  onClick={() => onSelectOption(option)}
                  disabled={loading}
                >
                  <span className="option-icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={2.4} />
                  </span>
                  <span className="option-text">
                    <span className="option-label">{option}</span>
                    {hint && <span className="option-hint">{hint}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        message && (
          <div className="clarification-message-container">
            <MessageParagraphs text={message} />
          </div>
        )
      )}

      {/* The text box only appears when we need the person to type: with
          buttons on screen, "None of these" is the way to describe instead. */}
      {options.length === 0 && (
        <SearchBox value={query} onChange={setQuery} home onSearch={onSearch} loading={loading} />
      )}
    </main>
  );
}

// Converts backend markdown (**bold** and \n\n) into styled paragraphs.
const MessageParagraphs = ({ text }: { text: string }) => (
  <>
    {text.split('\n\n').map((paragraph, pIndex) => (
      <p key={pIndex} className="clarification-paragraph">
        {paragraph.split(/(\*\*.*?\*\*)/).map((part, partIndex) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={partIndex} className="clarification-highlight">
              {part.slice(2, -2)}
            </strong>
          ) : (
            part
          ),
        )}
      </p>
    ))}
  </>
);
