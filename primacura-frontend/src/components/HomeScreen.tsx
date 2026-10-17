import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Languages, MapPin, Mic, Phone, ShieldAlert, Square, User } from 'lucide-react';
import { SearchBox } from './SearchBox';
import { LocationCard, useLocationFix } from './LocationPanel';
import { useI18n } from '../lib/i18n';

export function HomeScreen({
  query,
  setQuery,
  onSearch,
  onOpenDisclaimer,
  onOpenAbout,
  onOpenGuides,
  onOpenContact,
  loading,
  isRecording,
  onStartRecording,
  onStopRecording,
  mics,
  selectedMic,
  setSelectedMic,
  recordingTimeLeft,
}: {
  query: string;
  setQuery: (value: string) => void;
  onSearch: (overrideQuery?: string) => void;
  onOpenDisclaimer: () => void;
  onOpenAbout: () => void;
  onOpenGuides: () => void;
  onOpenContact: () => void;
  loading: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  mics: MediaDeviceInfo[];
  selectedMic: string;
  setSelectedMic: (value: string) => void;
  recordingTimeLeft: number;
}) {
  // Location stays on this device. "My location" toggles the details open and shut.
  const { t, lang, setLang } = useI18n();
  const location = useLocationFix();
  const [locOpen, setLocOpen] = useState(false);
  const toggleLocation = () => {
    if (locOpen) { setLocOpen(false); return; }
    setLocOpen(true);
    if (location.status !== 'ready' && location.status !== 'locating') location.locate();
  };

  return (
    <main className="home-screen hp">
      <header className="hp-brand">
        <div className="brand-mark">+</div>
        <div className="brand-text">
          <span className="brand-title">PrimaCura</span>
          <span className="brand-slogan">{t('slogan')}</span>
        </div>
        <button type="button" className="lang-switch" onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                aria-label={t('langSwitchLabel')} title={t('langSwitchLabel')}>
          {/* Language icon + EN | ES, the current one highlighted (no flags: a language is not a country). */}
          <Languages size={16} strokeWidth={2.4} aria-hidden="true" />
          <span className={lang === 'en' ? 'on' : ''} aria-hidden="true">EN</span>
          <span className={lang === 'es' ? 'on' : ''} aria-hidden="true">ES</span>
        </button>
      </header>

      {/* 1 · Describe it: heading, search box and the speak alternative sit together. */}
      <section className="hp-ask" aria-label={t('describeLabel')}>
        <h1 className="hp-heading">{t('heading1')}<br />{t('heading2')}</h1>
        <SearchBox value={query} onChange={setQuery} home onSearch={() => onSearch()} loading={loading} />
        <div className="hp-speak">
          <span className="hp-speak-label">{t('speakLabel')}</span>
          <div className="hp-speak-controls">
            {mics.length > 1 && (
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                disabled={isRecording || loading}
                className="mic-selector hp-mic"
                aria-label={t('microphone')}
              >
                {mics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `${t('microphone')} ${mic.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            )}
            {loading ? (
              <button type="button" className="hp-speak-btn" disabled aria-label={t('processingAria')}>
                <span className="spin">⏳</span> {t('processing')}
              </button>
            ) : !isRecording ? (
              <button type="button" className="hp-speak-btn" onClick={onStartRecording} aria-label={t('speakAria')}>
                <Mic size={18} strokeWidth={2.6} /> {t('speak')}
              </button>
            ) : (
              <button type="button" className="hp-speak-btn recording" onClick={onStopRecording} aria-label={t('stopAria')}>
                <Square size={13} fill="currentColor" /> {t('stop')}
                <span className="record-timer">0:{recordingTimeLeft < 10 ? `0${recordingTimeLeft}` : recordingTimeLeft}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2 · Or browse: the guides button with its one-line explanation. */}
      <section className="hp-browse">
        <button className="hp-guides" onClick={onOpenGuides}>
          <BookOpen size={22} strokeWidth={2.4} aria-hidden="true" />
          <span>{t('pickGuide')}</span>
          <ChevronRight size={20} strokeWidth={2.8} aria-hidden="true" />
        </button>
        <p className="hp-note">{t('homeNote')}</p>
      </section>

      {/* 3 · Utilities: quiet, grouped tightly. */}
      <footer className="hp-utility">
        <div className="hp-pair">
          <a href="tel:911" className="hp-pair-btn hp-call" aria-label={t('call911')}>
            <Phone size={16} fill="currentColor" aria-hidden="true" /> {t('call911')}
          </a>
          <span className="hp-pair-btn hp-call-note" role="note">
            <Phone size={15} fill="currentColor" aria-hidden="true" /> {t('emergencyDial')}
          </span>
          <button
            type="button"
            className={`hp-pair-btn hp-loc ${locOpen ? 'open' : ''}`}
            onClick={toggleLocation}
            aria-expanded={locOpen}
            aria-controls="hp-loc-panel"
            aria-label={locOpen ? t('hideLocation') : t('showLocation911')}
          >
            <MapPin size={16} strokeWidth={2.6} aria-hidden="true" />
            {location.status === 'locating' ? t('finding') : t('myLocation')}
            <ChevronDown size={16} strokeWidth={2.6} className="hp-chev" aria-hidden="true" />
          </button>
        </div>

        {locOpen && (
          <div id="hp-loc-panel" className="hp-loc-panel">
            {location.status === 'error' && <p className="loc-error" role="alert">{location.error}</p>}
            {location.status === 'ready' && location.fix && <LocationCard fix={location.fix} onUpdate={location.locate} compact />}
          </div>
        )}

        <nav className="hp-links" aria-label={t('more')}>
          <button onClick={onOpenAbout} className="hp-link"><User size={13} /> {t('about')}</button>
          <span aria-hidden="true">·</span>
          <button onClick={onOpenDisclaimer} className="hp-link"><ShieldAlert size={13} /> {t('disclaimer')}</button>
          <span aria-hidden="true">·</span>
          <button onClick={onOpenContact} className="hp-link">{t('contact')}</button>
        </nav>
      </footer>
    </main>
  );
}
