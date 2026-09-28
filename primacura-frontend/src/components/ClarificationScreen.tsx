import { ArrowLeft } from 'lucide-react';
import { SearchBox } from './SearchBox';

export function ClarificationScreen({
  message,
  query,
  setQuery,
  onSearch,
  onBack,
  loading,
}: {
  message: string;
  query: string;
  setQuery: (value: string) => void;
  onSearch: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  return (
    <main className="clarification-screen">
      <header className="inner-page-header tight-bottom">
        
        <div className="header-top-row">
          <button className="nav-back-btn" onClick={onBack} aria-label="Back to home">
            <div className="nav-icon-circle">
              <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
            </div>
            Home
          </button>
          
          <div className="inner-brand">
            <span className="inner-brand-title">PrimaCura</span>
            <span className="inner-brand-slogan">The First Care</span>
          </div>
        </div>

        <div className="header-title-row">
          <div className="eyebrow">MORE INFO NEEDED</div>
          <h1 style={{ margin: 0 }}>Please clarify the situation</h1>
        </div>
        
      </header>
      <div className="safety-reminder">
        <strong>CHECK SCENE FOR SAFETY.</strong>
        <span>If it's life-threatening, call 911 immediately.</span>
      </div>

      {/* Replaces the single <p> tag */}
      <FormattedMessage text={message} />

      <SearchBox value={query} onChange={setQuery} home onSearch={onSearch} loading={loading} />
    </main>
  );
}

// Helper to convert backend markdown (**bold** and \n\n) into styled React elements
const FormattedMessage = ({ text }: { text: string }) => {
  if (!text) return null;
  
  return (
    <div className="clarification-message-container">
      {text.split('\n\n').map((paragraph, pIndex) => (
        <p key={pIndex} className="clarification-paragraph">
          {paragraph.split(/(\*\*.*?\*\*)/).map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIndex} className="clarification-highlight">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      ))}
    </div>
  );
};