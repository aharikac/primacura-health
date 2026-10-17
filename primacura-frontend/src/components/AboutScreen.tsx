import React from 'react';
import { User, ShieldPlus, ArrowLeft, ListChecks, Mic, Speech, MapPin, Quote, Languages } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export function AboutScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <main className="about-screen">
      
      {/* Standardized Header using index.css classes */}
      <header className="inner-page-header">
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
          <h1>{t('aboutTitle')}</h1>
          <p>{t('aboutSub')}</p>
        </div>
      </header>

      <div className="about-body">
        <section className="about-card">
          <div className="about-card-head">
            <span className="about-icon"><ShieldPlus size={20} strokeWidth={2.4} /></span>
            <h2>{t('mission')}</h2>
          </div>
          <p>{t('missionText')}</p>
          <ul className="about-features">
            <li><ListChecks size={18} strokeWidth={2.4} />{t('featSteps')}</li>
            <li><Mic size={18} strokeWidth={2.4} />{t('featSpeak')}</li>
            <li><Speech size={18} strokeWidth={2.4} />{t('featRead')}</li>
            <li><MapPin size={18} strokeWidth={2.4} />{t('featLocation')}</li>
            <li><Languages size={18} strokeWidth={2.4} />{t('featSpanish')}</li>
          </ul>
        </section>

        <section className="about-card about-card-dev">
          <div className="about-card-head">
            <span className="about-icon"><User size={20} strokeWidth={2.4} /></span>
            <h2>{t('developer')}</h2>
          </div>
          <div className="about-dev-id">
            <span className="about-avatar" aria-hidden="true">HA</span>
            <div>
              <strong className="about-dev-name">Harika Appalla</strong>
              <span>{t('devRole')}</span>
            </div>
          </div>
          <p>
            {t('devText1')}<strong className="about-dev-name">Harika Appalla</strong>{t('devText2')}
          </p>
          <blockquote className="about-quote">
            <Quote size={22} strokeWidth={2.6} aria-hidden="true" />
            <p>{t('devQuote')}</p>
          </blockquote>
        </section>
      </div>

    </main>
  );
}
