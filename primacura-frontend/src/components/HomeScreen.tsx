import { Mic, Phone, ShieldAlert, Square } from 'lucide-react';
import { SearchBox } from './SearchBox';

export function HomeScreen({
  query,
  setQuery,
  onSearch,
  onOpenDisclaimer,
  onOpenGuides,
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
  onSearch: () => void;
  onOpenDisclaimer: () => void;
  onOpenGuides: () => void;
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
        <div className="brand" style={{ marginBottom: '12px' }}>
          <div className="brand-mark">+</div>
          <div className="brand-text">
            <span className="brand-title">PrimaCura</span>
            <span className="brand-slogan">The First Care</span>
          </div>
        </div>
        <section className="home-intro">
          <p className="eyebrow">WHAT'S THE SITUATION?</p>
          <h1>Describe what's<br />happening.</h1>
        </section>
        <SearchBox value={query} onChange={setQuery} home onSearch={onSearch} loading={loading} />   
        <div className="speech-section">
          <p className="speech-label">OR Describe the Situation using your Microphone:</p>  
          <div className="speech-controls">
            {mics.length > 0 && (
              <select 
                value={selectedMic} 
                onChange={(e) => setSelectedMic(e.target.value)}
                disabled={isRecording}
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
              {!isRecording ? (
                <button 
                  type="button" 
                  className="record-button" 
                  onClick={onStartRecording} 
                  aria-label="Start talking to describe the situation"
                >
                  <Mic />
                  Speak
                </button>
              ) : (
                <button 
                  type="button" 
                  className="record-button" 
                  onClick={onStopRecording} 
                  aria-label="Stop talking and process the description of the situation"
                >
                  <Square size={16} fill="currentColor" />
                  <span>Stop</span>
                  <span className="record-timer">(0:{recordingTimeLeft < 10 ? `0${recordingTimeLeft}` : recordingTimeLeft})</span>
                </button>
              )}
            </>
          </div>
        </div>
      </div>
      <div className="home-actions">
        <button className="known-button" onClick={onOpenGuides}>Browse First-Aid Guides</button>
        <a href="tel:911" className="call-button">
          <span className="call-icon"><Phone size={28} fill="currentColor" aria-hidden="true" /></span>
          <span className="call-copy"><strong>CALL 911</strong><small>Dial emergency services</small></span>
        </a>
        <div className="desktop-emergency-message">
          <strong>EMERGENCY?</strong>
          If it's life-threatening, dial 911 immediately.
        </div>
        <p className="home-note">Step-by-step first-aid protocols when medical staff isn't nearby.</p>
        <button onClick={onOpenDisclaimer} className="disclaimer-link">
          <ShieldAlert size={14} /> Legal Disclaimer & Terms
        </button>
      </div>
    </main>
  );
}