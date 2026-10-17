import { useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Condition } from '../types';
import { useI18n } from '../lib/i18n';
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
  const { t, conditions, howTos, cardAge } = useI18n();
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConditions = useMemo(() => {
    if (!normalizedQuery) return conditions;
    return conditions.filter(({ title, description }) => `${title} ${description}`.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, conditions]);
  const filteredHowTos = useMemo(() => {
    if (!normalizedQuery) return howTos;
    return howTos.filter(({ title, summary, age }) => `${title} ${summary} ${cardAge(age)}`.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, howTos]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="guides-screen">
      <header className="inner-page-header" style={{ padding: '28px 20px 0', boxSizing: 'border-box' }}>
        <div className="header-top-row">
          <button className="nav-back-btn" onClick={onBack} aria-label={t('backToHome')}>
            <div className="nav-icon-circle">
              <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
            </div>
            {t('home')}
          </button>
          
          <div className="inner-brand">
            <span className="inner-brand-title">PrimaCura</span>
            <span className="inner-brand-slogan">{t('slogan')}</span>
          </div>
        </div>

        <div className="header-title-row">
          <h1>{t('guidesTitle')}</h1>
          <p>{tab === 'guides' ? t('guidesPick') : t('howToPick')}</p>
        </div>
      </header>
      <div className="guides-tabs" role="tablist" aria-label={t('guideType')}>
        <button role="tab" aria-selected={tab === 'guides'} className={`guides-tab ${tab === 'guides' ? 'active' : ''}`} onClick={() => onTabChange('guides')}>
          {t('emergencies')}
        </button>
        <button role="tab" aria-selected={tab === 'howto'} className={`guides-tab ${tab === 'howto' ? 'active' : ''}`} onClick={() => onTabChange('howto')}>
          {t('howTo')}
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
                  {card.age !== 'Any' && <span className="howto-tile-age">{cardAge(card.age)}</span>}
                </button>
              );
            })}
          </div>
        )}
        {((tab === 'guides' && filteredConditions.length === 0) || (tab === 'howto' && filteredHowTos.length === 0)) && (
          <div className="empty-state">
            <h2>{t('noGuides1')}<br />{t('noGuides2')}</h2>
            <p>{t('tryAgain1')}<br />{t('tryAgain2')}</p>
          </div>
        )}
      </div>
    </main>
  );
}
