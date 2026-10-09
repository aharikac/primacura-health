import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationCard, useLocationFix } from './LocationPanel';
import { BookOpen, ChevronDown, ChevronRight, Mail, MapPin, Mic, Phone, Search, ShieldAlert, Square, User } from 'lucide-react-native';

const RED = '#d33b32';

// Home: three groups spaced evenly down the screen, tight spacing inside each.
//   1 Describe it  (heading, search box, speak)   ← main focus
//   2 Browse       (guides button + one-line note)
//   3 Utilities    (Call 911 / My location pair, links) ← quiet, cosy
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
  recordingTimeLeft,
}: {
  query: string;
  setQuery: (value: string) => void;
  onSearch: () => void;
  onOpenDisclaimer: () => void;
  onOpenAbout: () => void;
  onOpenGuides: () => void;
  onOpenContact: () => void;
  loading: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recordingTimeLeft: number;
}) {
  // Location stays on this phone. "My location" opens and closes the details.
  const location = useLocationFix();
  const [locOpen, setLocOpen] = useState(false);
  const toggleLocation = () => {
    if (locOpen) { setLocOpen(false); return; }
    setLocOpen(true);
    if (location.status !== 'ready' && location.status !== 'locating') location.locate();
  };
  const [focused, setFocused] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>+</Text></View>
          <View>
            <Text style={styles.brandTitle}>PrimaCura</Text>
            <Text style={styles.brandSlogan}>The First Care</Text>
          </View>
        </View>

        {/* 1 · Describe it */}
        <View style={styles.ask}>
          <Text style={styles.heading}>Describe what's{'\n'}happening.</Text>

          <View style={[styles.searchBox, focused && styles.searchBoxFocused]}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Type the situation in detail..."
              placeholderTextColor="#a1a1aa"
              onSubmitEditing={onSearch}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="search"
              multiline
              blurOnSubmit
              editable={!loading}
              accessibilityLabel="Describe the situation"
            />
            <TouchableOpacity style={styles.searchButton} onPress={onSearch} disabled={loading} accessibilityRole="button" accessibilityLabel="Get help">
              {loading ? <ActivityIndicator color="#fff" /> : <Search color="#fff" size={26} strokeWidth={2.8} />}
            </TouchableOpacity>
          </View>

          <View style={styles.speakRow}>
            <Text style={styles.speakLabel}>Or speak using microphone</Text>
            {loading ? (
              <View style={[styles.speakButton, styles.speakBusy]} accessibilityLabel="Processing audio description">
                <ActivityIndicator color="#050505" />
                <Text style={styles.speakText}>Processing…</Text>
              </View>
            ) : !isRecording ? (
              <TouchableOpacity style={styles.speakButton} onPress={onStartRecording} accessibilityRole="button" accessibilityLabel="Start talking to describe the situation">
                <Mic color="#050505" size={18} strokeWidth={2.6} />
                <Text style={styles.speakText}>Speak</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.speakButton, styles.speakRecording]} onPress={onStopRecording} accessibilityRole="button" accessibilityLabel="Stop talking and process the description of the situation">
                <Square color="#fff" size={13} fill="#fff" />
                <Text style={[styles.speakText, styles.speakTextOn]}>Stop</Text>
                <Text style={styles.timer}>0:{recordingTimeLeft < 10 ? `0${recordingTimeLeft}` : recordingTimeLeft}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 2 · Browse */}
        <View style={styles.browse}>
          <TouchableOpacity style={styles.guides} onPress={onOpenGuides} activeOpacity={0.85} accessibilityRole="button">
            <BookOpen size={22} color="#fff" strokeWidth={2.4} />
            <Text style={styles.guidesText}>Pick a First-Aid Guide</Text>
            <ChevronRight size={20} color="#fff" strokeWidth={2.8} />
          </TouchableOpacity>
          <Text style={styles.note}>Step-by-step first aid for when medical help isn't nearby.</Text>
        </View>

        {/* 3 · Utilities */}
        <View style={styles.utility}>
          <View style={styles.pair}>
            <TouchableOpacity
              style={styles.pairButton}
              onPress={() => Linking.openURL('tel:911')}
              accessibilityRole="button"
              accessibilityLabel="Call 911"
              accessibilityHint="Use if it's life-threatening"
            >
              <Phone size={16} color={RED} fill={RED} />
              <Text style={styles.callText}>Call 911</Text>
            </TouchableOpacity>
            <View style={styles.pairDivider} />
            <TouchableOpacity
              style={[styles.pairButton, locOpen && styles.pairButtonOpen]}
              onPress={toggleLocation}
              accessibilityRole="button"
              accessibilityLabel={locOpen ? 'Hide my location' : 'Show my location for 911'}
              accessibilityState={{ expanded: locOpen }}
            >
              {location.status === 'locating' ? <ActivityIndicator size="small" color={RED} /> : <MapPin size={16} color={RED} strokeWidth={2.6} />}
              <Text style={[styles.locText, locOpen && styles.locTextOpen]}>{location.status === 'locating' ? 'Finding…' : 'My location'}</Text>
              <ChevronDown size={16} color={locOpen ? RED : '#a1a1aa'} strokeWidth={2.6} style={locOpen ? styles.chevUp : undefined} />
            </TouchableOpacity>
          </View>

          {locOpen && location.status === 'error' ? <Text style={styles.locError} accessibilityRole="alert">{location.error}</Text> : null}
          {locOpen && location.status === 'ready' && location.fix ? <LocationCard fix={location.fix} onUpdate={location.locate} compact /> : null}

          <View style={styles.links}>
            <TouchableOpacity style={styles.link} onPress={onOpenAbout}>
              <User size={13} color="#8a8f99" />
              <Text style={styles.linkText}>About</Text>
            </TouchableOpacity>
            <Text style={styles.dot}>·</Text>
            <TouchableOpacity style={styles.link} onPress={onOpenDisclaimer}>
              <ShieldAlert size={13} color="#8a8f99" />
              <Text style={styles.linkText}>Disclaimer</Text>
            </TouchableOpacity>
            <Text style={styles.dot}>·</Text>
            <TouchableOpacity style={styles.link} onPress={onOpenContact}>
              <Mail size={13} color="#8a8f99" />
              <Text style={styles.linkText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  // space-between + a minimum gap: the three groups spread evenly on tall
  // phones and close up (never touching) on short ones.
  container: { flexGrow: 1, justifyContent: 'space-between', gap: 20, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: 40, height: 40, borderRadius: 10, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: -2 },
  brandTitle: { fontSize: 22, fontWeight: '900', color: '#050505', letterSpacing: -0.6 },
  brandSlogan: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1.5, textTransform: 'uppercase' },

  ask: { gap: 14 },
  heading: { fontSize: 30, lineHeight: 34, fontWeight: '900', color: '#050505', letterSpacing: -1 },
  searchBox: {
    flexDirection: 'row', minHeight: 104, borderRadius: 16, borderWidth: 2.5, borderColor: '#050505', backgroundColor: '#fff', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 4,
  },
  searchBoxFocused: { borderColor: RED, shadowColor: RED, shadowOpacity: 0.22 },
  searchInput: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 17, fontWeight: '600', color: '#050505', maxHeight: 150, textAlignVertical: 'top' },
  searchButton: { width: 66, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },

  speakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingLeft: 4 },
  speakLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#52525b' },
  speakButton: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 20, borderRadius: 22, borderWidth: 2, borderColor: '#050505', backgroundColor: '#fff' },
  speakBusy: { opacity: 0.7 },
  speakRecording: { backgroundColor: '#991b1b', borderColor: '#991b1b' },
  speakText: { fontSize: 15, fontWeight: '900', color: '#050505' },
  speakTextOn: { color: '#fff' },
  timer: { fontSize: 14, fontWeight: '700', color: '#fee2e2' },

  browse: { gap: 8 },
  guides: {
    minHeight: 66, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, borderRadius: 16, backgroundColor: RED,
    shadowColor: RED, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  guidesText: { flex: 1, fontSize: 17, fontWeight: '900', color: '#fff' },
  note: { textAlign: 'center', fontSize: 12.5, fontWeight: '600', color: '#71717a' },

  utility: { gap: 8 },
  pair: { flexDirection: 'row', borderRadius: 12, borderWidth: 1.5, borderColor: '#e4e4e7', backgroundColor: '#fff', overflow: 'hidden' },
  pairButton: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  pairButtonOpen: { backgroundColor: '#fff1f0' },
  pairDivider: { width: 1.5, backgroundColor: '#e4e4e7' },
  callText: { fontSize: 15, fontWeight: '800', color: '#991b1b' },
  locText: { fontSize: 15, fontWeight: '800', color: '#27272a' },
  locTextOpen: { color: '#991b1b' },
  chevUp: { transform: [{ rotate: '180deg' }] },
  locError: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#9f1d15' },

  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  linkText: { fontSize: 12, fontWeight: '700', color: '#8a8f99' },
  dot: { color: '#d4d4d8', fontSize: 12 },
});
