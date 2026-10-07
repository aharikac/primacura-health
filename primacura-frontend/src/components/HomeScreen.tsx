import { Mic, Phone, ShieldAlert, Square, User } from 'lucide-react';
import { SearchBox } from './SearchBox';

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
  return (
    <main className="home-screen">
      <div className="home-top">
        <div className="brand" style={{ marginBottom: '8px' }}>
          <div className="brand-mark">+</div>
          <div className="brand-text">
            <span className="brand-title">PrimaCura</span>
            <span className="brand-slogan">The First Care</span>
          </div>
        </div>
        
        <section className="home-intro" style={{ marginBottom: '8px' }}>
          <h1 style={{ fontSize: '28px', lineHeight: '1.1', margin: 0 }}>Describe what's<br />happening.</h1>
        </section>

        <SearchBox value={query} onChange={setQuery} home onSearch={() => onSearch()} loading={loading} />   
        
        <div className="speech-section" style={{ marginTop: '8px', marginBottom: '4px' }}>
          <p className="speech-label" style={{ marginBottom: '6px', fontSize: '12px' }}>OR Speak using your Microphone:</p>  
          <div className="speech-controls">
            {mics.length > 0 && (
              <select 
                value={selectedMic} 
                onChange={(e) => setSelectedMic(e.target.value)}
                disabled={isRecording || loading}
                className="mic-selector"
              >
                {mics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            )}
            <>
              {loading ? (
                <button 
                  type="button" 
                  className="record-button" 
                  disabled
                  style={{ opacity: 0.7, cursor: 'wait' }}
                  aria-label="Processing audio description"
                >
                  <span className="spin">⏳</span>
                  <span>Processing...</span>
                </button>
              ) : !isRecording ? (
                <button 
                  type="button" 
                  className="record-button" 
                  onClick={onStartRecording} 
                  aria-label="Start talking to describe the situation"
                >
                  <Mic size={18} />
                  Speak
                </button>
              ) : (
                <button 
                  type="button" 
                  className="record-button" 
                  onClick={onStopRecording} 
                  aria-label="Stop talking and process the description of the situation"
                >
                  <Square size={14} fill="currentColor" />
                  <span>Stop</span>
                  <span className="record-timer">(0:{recordingTimeLeft < 10 ? `0${recordingTimeLeft}` : recordingTimeLeft})</span>
                </button>
              )}
            </>
          </div>
        </div>

        <div className="quick-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px', marginBottom: '0px' }}>
          <button 
            type="button"
            disabled={loading || isRecording}
            style={{ flex: 1, padding: '8px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.85rem' }}
            onClick={() => {
              const text = "The child is choking";
              setQuery(text);
              onSearch(text);
            }}
          >
            Choking Relief
          </button>
          <button 
            type="button"
            disabled={loading || isRecording}
            style={{ flex: 1, padding: '8px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.85rem' }}
            onClick={() => {
              const text = "Cardiac arrest, the child is completely limp and not breathing";
              setQuery(text);
              onSearch(text);
            }}
          >
            CPR for Child
          </button>
        </div>
      </div>
      
      <div className="home-actions" style={{ gap: '10px', marginTop: '10px' }}>
        <button className="known-button" style={{ height: '44px' }} onClick={onOpenGuides}>Browse First-Aid Guides</button>
        
        {/* Adjusted to fit on a single line */}
        <p className="home-note" style={{ fontSize: '11px', letterSpacing: '-0.2px', whiteSpace: 'nowrap', margin: '0 0 4px 0' }}>Step-by-step first-aid protocols when medical staff isn't nearby.</p>
        
        <a href="tel:911" className="call-button" style={{ minHeight: '64px', padding: '8px 20px' }}>
          <span className="call-icon" style={{ width: '50px', height: '50px', flex: '0 0 50px' }}><Phone size={24} fill="currentColor" aria-hidden="true" /></span>
          <span className="call-copy">
            <strong style={{ fontSize: '22px' }}>CALL 911</strong>
            <small style={{ fontSize: '13px' }}>Dial emergency services</small>
          </span>
        </a>
        
        <div className="desktop-emergency-message" style={{ padding: '10px 16px' }}>
          <strong>EMERGENCY?</strong>
          If it's life-threatening, dial 911 immediately.
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
          <button onClick={onOpenAbout} className="disclaimer-link">
            <User size={14} /> About
          </button>
          <span style={{ color: '#d1d5db' }}>•</span>
          <button onClick={onOpenDisclaimer} className="disclaimer-link">
            <ShieldAlert size={14} /> Disclaimer
          </button>
          <span style={{ color: '#d1d5db' }}>•</span>
          <button onClick={onOpenContact} className="disclaimer-link">
            Contact
          </button>
        </div>
      </div>
    </main>
  );
}
