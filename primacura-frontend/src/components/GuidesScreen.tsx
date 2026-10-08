import { useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Condition } from '../types';
import { conditions } from '../data/conditions';
import { howTos } from '../data/howTo';
import { howToIcon } from './howToIcons';
import { SearchBox } from './SearchBox';

export type GuidesTab = 'guides' | 'howto';

export function GuidesScreen({
  query,
  setQuery,
  tab,
  onTabChange,
  onBack,
  onOpenProtocol,
  onOpenHowTo,
}: {
  query: string;
  setQuery: (value: string) => void;
  tab: GuidesTab;
  onTabChange: (tab: GuidesTab) => void;
  onBack: () => void;
  onOpenProtocol: (condition: Condition) => void;
  onOpenHowTo: (howToId: string) => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConditions = useMemo(() => {
    if (!normalizedQuery) return conditions;
    return conditions.filter(({ title, description }) => `${title} ${description}`.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);
  const filteredHowTos = useMemo(() => {
    if (!normalizedQuery) return howTos;
    return howTos.filter(({ title, summary, age }) => `${title} ${summary} ${age}`.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery]);

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
          <p>{tab === 'guides' ? 'Select a condition to view its protocol.' : 'Learn each skill, move by move.'}</p>
        </div>
      </header>
      <div className="guides-tabs" role="tablist" aria-label="Guide type">
        <button role="tab" aria-selected={tab === 'guides'} className={`guides-tab ${tab === 'guides' ? 'active' : ''}`} onClick={() => onTabChange('guides')}>
          Emergencies
        </button>
        <button role="tab" aria-selected={tab === 'howto'} className={`guides-tab ${tab === 'howto' ? 'active' : ''}`} onClick={() => onTabChange('howto')}>
          How-To
        </button>
      </div>
      <SearchBox value={query} onChange={setQuery} />
      <div className="guide-list" aria-live="polite">
        {tab === 'guides' && filteredConditions.length > 0 &&
          filteredConditions.map((condition) => (
            <button className="guide-row" key={condition.title} onClick={() => onOpenProtocol(condition)}>
              <div>
                <h2>{condition.title}</h2>
                <p>{condition.description}</p>
              </div>
              <ArrowRight className="guide-arrow" size={24} strokeWidth={2.8} aria-hidden="true" />
            </button>
          ))}
        {tab === 'howto' && filteredHowTos.length > 0 && (
          <div className="howto-grid">
            {filteredHowTos.map((card) => {
              const Icon = howToIcon(card.id);
              return (
                <button className="howto-tile" key={card.id} onClick={() => onOpenHowTo(card.id)}>
                  <span className="howto-tile-icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={2.4} />
                  </span>
                  <span className="howto-tile-title">{card.title}</span>
                  {card.age !== 'Any' && <span className="howto-tile-age">{card.age}</span>}
                </button>
              );
            })}
          </div>
        )}
        {((tab === 'guides' && filteredConditions.length === 0) || (tab === 'howto' && filteredHowTos.length === 0)) && (
          <div className="empty-state">
            <h2>NO GUIDES<br />FOUND</h2>
            <p>Try a different search<br />term.</p>
          </div>
        )}
      </div>
    </main>
  );
}
