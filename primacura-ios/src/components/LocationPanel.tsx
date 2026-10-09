import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Share, Linking, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { LocateFixed, MapPin, RefreshCw, Share2 } from 'lucide-react-native';

// The person's GPS position, to read out to 911. It stays on this phone: it is
// never sent to the PrimaCura server.
type Fix = { lat: number; lng: number; acc: number };
const hemi = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'error';

/** Asks for the GPS position. Shared by the panel and the home-screen button. */
export function useLocationFix(autoStart = false) {
  const [status, setStatus] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
  const [fix, setFix] = useState<Fix | null>(null);
  const [error, setError] = useState('');

  const locate = async () => {
    setStatus('locating');
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('error');
        setError('Location is off for PrimaCura. Turn it on in Settings, or tell 911 a nearby address or landmark.');
        return;
      }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setFix({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy ?? 0) });
      setStatus('ready');
    } catch {
      setStatus('error');
      setError('Could not find your location. Try again near a window, or tell 911 a nearby address or landmark.');
    }
  };

  useEffect(() => { if (autoStart) locate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, fix, error, locate };
}

/** The coordinates card, with Share / Map / Update. */
export function LocationCard({ fix, onUpdate, compact = false }: { fix: Fix; onUpdate: () => void; compact?: boolean }) {
  const decimal = `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}`;
  return (
    <View style={[styles.box, styles.ready, compact && styles.readyCompact]} accessibilityLiveRegion="polite">
      <View style={styles.head}>
        <LocateFixed size={15} color="#d33b32" />
        <Text style={styles.headText}>YOUR LOCATION</Text>
        <Text style={styles.acc}>±{fix.acc} m</Text>
      </View>
      <Text style={[styles.coords, compact && styles.coordsCompact]} selectable>{hemi(fix.lat, 'N', 'S')}, {hemi(fix.lng, 'E', 'W')}</Text>
      <Text style={styles.decimal} selectable>{decimal}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => Share.share({ message: `My location: ${decimal} https://maps.apple.com/?ll=${fix.lat},${fix.lng}` })}>
          <Share2 size={15} color="#3f3f46" /><Text style={styles.actionText}>Share</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => Linking.openURL(`https://maps.apple.com/?ll=${fix.lat},${fix.lng}&q=My%20location`)}>
          <MapPin size={15} color="#3f3f46" /><Text style={styles.actionText}>Map</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={onUpdate} accessibilityLabel="Update location">
          <RefreshCw size={15} color="#3f3f46" /><Text style={styles.actionText}>Update</Text>
        </Pressable>
      </View>
      {!compact ? <Text style={styles.note}>Read these numbers to the 911 dispatcher. Your location stays on this phone.</Text> : null}
    </View>
  );
}

export function LocationPanel({ compact = false, autoStart = false }: { compact?: boolean; autoStart?: boolean }) {
  const { status, fix, error, locate } = useLocationFix(autoStart);

  if (status !== 'ready' || !fix) {
    return (
      <View style={styles.box}>
        <Pressable style={[styles.start, compact && styles.startCompact]} onPress={locate} disabled={status === 'locating'} accessibilityRole="button">
          {status === 'locating' ? <ActivityIndicator color="#b42318" /> : <MapPin size={16} color="#b42318" />}
          <Text style={styles.startText}>{status === 'locating' ? 'Finding your location…' : 'Show my location for 911'}</Text>
        </Pressable>
        {status === 'error' ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      </View>
    );
  }

  return <LocationCard fix={fix} onUpdate={locate} compact={compact} />;
}

const styles = StyleSheet.create({
  box: { width: '100%', gap: 6 },
  start: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#f5c2bd', backgroundColor: '#fff1f0' },
  startCompact: { paddingVertical: 9 },
  startText: { color: '#b42318', fontSize: 14, fontWeight: '800' },
  error: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#9f1d15' },
  ready: { padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: '#e5e7eb', borderLeftWidth: 8, borderLeftColor: '#d33b32' },
  readyCompact: { padding: 10, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headText: { color: '#d33b32', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  acc: { marginLeft: 'auto', color: '#71717a', fontSize: 12, fontWeight: '700' },
  coords: { fontSize: 19, fontWeight: '900', color: '#050505' },
  coordsCompact: { fontSize: 16 },
  decimal: { fontSize: 13, fontWeight: '700', color: '#52525b' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, borderRadius: 9, borderWidth: 1.5, borderColor: '#e4e4e7', backgroundColor: '#fff' },
  actionText: { fontSize: 13, fontWeight: '800', color: '#3f3f46' },
  note: { fontSize: 12.5, fontWeight: '600', color: '#71717a' },
});
