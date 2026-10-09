import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, MapPin, Mic, Phone, ShieldAlert, Square, User } from 'lucide-react';
import { SearchBox } from './SearchBox';
import { LocationCard, useLocationFix } from './LocationPanel';

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
          <span className="brand-slogan">The First Care</span>
        </div>
      </header>

      {/* 1 · Describe it: heading, search box and the speak alternative sit together. */}
      <section className="hp-ask" aria-label="Describe the emergency">
        <h1 className="hp-heading">Describe what's<br />happening.</h1>
        <SearchBox value={query} onChange={setQuery} home onSearch={() => onSearch()} loading={loading} />
        <div className="hp-speak">
          <span className="hp-speak-label">Or speak using microphone</span>
          <div className="hp-speak-controls">
            {mics.length > 1 && (
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                disabled={isRecording || loading}
                className="mic-selector hp-mic"
                aria-label="Microphone"
              >
                {mics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            )}
            {loading ? (
              <button type="button" className="hp-speak-btn" disabled aria-label="Processing audio description">
                <span className="spin">⏳</span> Processing…
              </button>
            ) : !isRecording ? (
              <button type="button" className="hp-speak-btn" onClick={onStartRecording} aria-label="Start talking to describe the situation">
                <Mic size={18} strokeWidth={2.6} /> Speak
              </button>
            ) : (
              <button type="button" className="hp-speak-btn recording" onClick={onStopRecording} aria-label="Stop talking and process the description of the situation">
                <Square size={13} fill="currentColor" /> Stop
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
          <span>Pick a First-Aid Guide</span>
          <ChevronRight size={20} strokeWidth={2.8} aria-hidden="true" />
        </button>
        <p className="hp-note">Step-by-step first aid for when medical help isn't nearby.</p>
      </section>

      {/* 3 · Utilities: quiet, grouped tightly. */}
      <footer className="hp-utility">
        <div className="hp-pair">
          <a href="tel:911" className="hp-pair-btn hp-call" aria-label="Call 911">
            <Phone size={16} fill="currentColor" aria-hidden="true" /> Call 911
          </a>
          <span className="hp-pair-btn hp-call-note" role="note">
            <Phone size={15} fill="currentColor" aria-hidden="true" /> Emergency? Dial 911
          </span>
          <button
            type="button"
            className={`hp-pair-btn hp-loc ${locOpen ? 'open' : ''}`}
            onClick={toggleLocation}
            aria-expanded={locOpen}
            aria-controls="hp-loc-panel"
            aria-label={locOpen ? 'Hide my location' : 'Show my location for 911'}
          >
            <MapPin size={16} strokeWidth={2.6} aria-hidden="true" />
            {location.status === 'locating' ? 'Finding…' : 'My location'}
            <ChevronDown size={16} strokeWidth={2.6} className="hp-chev" aria-hidden="true" />
          </button>
        </div>

        {locOpen && (
          <div id="hp-loc-panel" className="hp-loc-panel">
            {location.status === 'error' && <p className="loc-error" role="alert">{location.error}</p>}
            {location.status === 'ready' && location.fix && <LocationCard fix={location.fix} onUpdate={location.locate} compact />}
          </div>
        )}

        <nav className="hp-links" aria-label="More">
          <button onClick={onOpenAbout} className="hp-link"><User size={13} /> About</button>
          <span aria-hidden="true">·</span>
          <button onClick={onOpenDisclaimer} className="hp-link"><ShieldAlert size={13} /> Disclaimer</button>
          <span aria-hidden="true">·</span>
          <button onClick={onOpenContact} className="hp-link">Contact</button>
        </nav>
      </footer>
    </main>
  );
}
