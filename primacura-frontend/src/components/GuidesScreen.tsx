import { useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Condition } from '../types';
import { conditions } from '../data/conditions';
import { SearchBox } from './SearchBox';

export function GuidesScreen({
  query,
  setQuery,
  onBack,
  onOpenProtocol,
}: {
  query: string;
  setQuery: (value: string) => void;
  onBack: () => void;
  onOpenProtocol: (condition: Condition) => void;
}) {
  const filteredConditions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conditions;
    return conditions.filter(({ title, description }) => `${title} ${description}`.toLowerCase().includes(normalizedQuery));
  }, [query]);

  return (
    <main className="guides-screen">
      <header className="inner-page-header" style={{ padding: '28px 20px 0', boxSizing: 'border-box' }}>
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
          <h1>First-Aid Guides</h1>
          <p>Select a condition to view its protocol.</p>
        </div>
      </header>
      <SearchBox value={query} onChange={setQuery} />
      <div className="guide-list" aria-live="polite">
        {filteredConditions.length > 0 ? (
          filteredConditions.map((condition) => (
            <button className="guide-row" key={condition.title} onClick={() => onOpenProtocol(condition)}>
              <div>
                <h2>{condition.title}</h2>
                <p>{condition.description}</p>
              </div>
              <ArrowRight className="guide-arrow" size={24} strokeWidth={2.8} aria-hidden="true" />
            </button>
          ))
        ) : (
          <div className="empty-state">
            <h2>NO GUIDES<br />FOUND</h2>
            <p>Try a different search<br />term.</p>
          </div>
        )}
      </div>
    </main>
  );
}