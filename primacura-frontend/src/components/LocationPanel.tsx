import { useEffect, useState } from 'react';
import { Check, Copy, LocateFixed, MapPin, RefreshCw } from 'lucide-react';

// The person's GPS position, to read out to 911. It stays on this device: it is
// never sent to the PrimaCura server.
type Fix = { lat: number; lng: number; acc: number };

const hemi = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'error';

/** Asks the browser for the GPS position. Shared by the panel and the home-screen button. */
export function useLocationFix(autoStart = false) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState('');

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setError('This browser cannot share your location. Tell 911 a nearby address or landmark.');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setFix({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) });
        setStatus('ready');
      },
      (e) => {
        setStatus('error');
        setError(
          e.code === e.PERMISSION_DENIED
            ? 'Location is turned off for this site. Allow it in your browser settings, or tell 911 a nearby address or landmark.'
            : 'Could not find your location. Try again outside or near a window, or tell 911 a nearby address or landmark.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  useEffect(() => { if (autoStart) locate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, fix, error, locate };
}

/** The coordinates card, with Copy / Map / Update. */
export function LocationCard({ fix, onUpdate, compact = false }: { fix: Fix; onUpdate: () => void; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const decimal = `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(decimal);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the numbers are on screen to read out */ }
  };

  return (
    <div className={`loc ready ${compact ? 'compact' : ''}`} aria-live="polite">
      <div className="loc-head">
        <LocateFixed size={16} strokeWidth={2.6} aria-hidden="true" /> Your location
        <span className="loc-acc">±{fix.acc} m</span>
      </div>
      <div className="loc-coords">{hemi(fix.lat, 'N', 'S')}, {hemi(fix.lng, 'E', 'W')}</div>
      <div className="loc-decimal">{decimal}</div>
      <div className="loc-actions">
        <button onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}</button>
        <a href={`https://maps.google.com/?q=${fix.lat},${fix.lng}`} target="_blank" rel="noreferrer">
          <MapPin size={15} /> Map
        </a>
        <button onClick={onUpdate} aria-label="Update location"><RefreshCw size={15} /> Update</button>
      </div>
      {!compact && <p className="loc-note">Read these numbers to the 911 dispatcher. Your location stays on this device.</p>}
    </div>
  );
}

export function LocationPanel({ compact = false, autoStart = false }: { compact?: boolean; autoStart?: boolean }) {
  const { status, fix, error, locate } = useLocationFix(autoStart);

  if (status !== 'ready' || !fix) {
    return (
      <div className={`loc ${compact ? 'compact' : ''}`}>
        <button className="loc-start" onClick={locate} disabled={status === 'locating'}>
          <MapPin size={16} strokeWidth={2.6} aria-hidden="true" />
          {status === 'locating' ? 'Finding your location…' : 'Show my location for 911'}
        </button>
        {status === 'error' && <p className="loc-error" role="alert">{error}</p>}
      </div>
    );
  }

  return <LocationCard fix={fix} onUpdate={locate} compact={compact} />;
}
