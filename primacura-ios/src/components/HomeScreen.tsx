import { View, Text, TouchableOpacity, StyleSheet, Linking, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Phone, ShieldAlert, Square, Search, BookOpen, ChevronRight, User, Mail } from 'lucide-react-native';

// One-tap shortcuts for the two most time-critical situations. The text is
// sent to the backend like a typed description, so the same protocol logic
// (including the age-specific steps) applies.
export const QUICK_ACTIONS = [
  { label: 'Choking Relief', query: 'The child is choking' },
  { label: 'CPR for Child', query: 'Cardiac arrest, the child is completely limp and not breathing' },
] as const;

export function HomeScreen({
  query,
  setQuery,
  onSearch,
  onOpenDisclaimer,
  onOpenAbout,
  onOpenGuides,
  onOpenContact,
  onQuickAction,
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
  onQuickAction: (query: string) => void;
  loading: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recordingTimeLeft: number;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false} 
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* TOP SECTION: Branding */}
        <View style={styles.topSection}>
          <View style={styles.brand}>
            <Text style={styles.brandMark}>+</Text>
            <View>
              <Text style={styles.brandTitle}>PrimaCura</Text>
              <Text style={styles.brandSlogan}>The First Care</Text>
            </View>
          </View>
        </View>

        {/* MIDDLE SECTION: Search (Dominant) and Compact Mic */}
        <View style={styles.middleSection}>
          <View style={styles.introAndSearchGroup}>
            <View style={styles.homeIntro}>
              <Text style={styles.eyebrow}>WHAT'S THE SITUATION?</Text>
              <Text style={styles.heading}>Describe what's{"\n"}happening.</Text>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={"Type the situation in\ndetail..."}
                placeholderTextColor="#9ca3af"
                onSubmitEditing={onSearch}
                returnKeyType="search"
                multiline={true}
                blurOnSubmit={true}
                editable={!loading}
              />
              <TouchableOpacity style={styles.searchButton} onPress={onSearch} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Search color="#fff" size={24} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.speechSection}>
            <Text style={styles.speechLabel}>Or speak about the situation:</Text>  
            <View style={styles.speechControls}>
              {loading ? (
                <TouchableOpacity style={[styles.recordButton, { opacity: 0.7 }]} disabled accessibilityLabel="Processing audio description">
                  <ActivityIndicator color="#050505" />
                  <Text style={styles.recordButtonText}>Processing...</Text>
                </TouchableOpacity>
              ) : !isRecording ? (
                <TouchableOpacity style={styles.recordButton} onPress={onStartRecording} accessibilityLabel="Start talking to describe the situation">
                  <Mic color="#050505" size={18} />
                  <Text style={styles.recordButtonText}>Speak</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.recordButtonActive} onPress={onStopRecording} accessibilityLabel="Stop talking and process the description of the situation">
                  <Square color="#fff" size={14} fill="#fff" />
                  <Text style={styles.recordButtonTextActive}>Stop</Text>
                  <Text style={styles.recordTimer}>
                    (0:{recordingTimeLeft < 10 ? `0${recordingTimeLeft}` : recordingTimeLeft})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.quickActionButton, (loading || isRecording) && styles.quickActionDisabled]}
                onPress={() => onQuickAction(action.query)}
                disabled={loading || isRecording}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Text style={styles.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* BOTTOM SECTION */}
        <View style={styles.bottomSection}>
          
          <TouchableOpacity style={styles.knownButton} onPress={onOpenGuides}>
            <View style={styles.knownButtonLeftGroup}>
              <BookOpen size={22} color="#fff" />
              <Text style={styles.knownButtonText}>Browse First-Aid Guides</Text>
            </View>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.emergencyActionButton} onPress={() => Linking.openURL('tel:911')}>
            <View style={styles.emergencyActionTop}>
              <View style={styles.emergencyActionTitleRow}>
                <Phone size={20} color="#991b1b" fill="#991b1b" />
                <Text style={styles.emergencyActionTitle}>EMERGENCY? CALL 911</Text>
              </View>
              <ShieldAlert size={18} color="#991b1b" />
            </View>
            <Text style={styles.emergencyActionSubtitle}>
              If it's life-threatening, dial emergency services immediately.
            </Text>
          </TouchableOpacity>

          <Text style={styles.homeNote}>Step-by-step first-aid protocols when medical staff isn't nearby.</Text>
          
          <View style={styles.footerLinksRow}>
            <TouchableOpacity style={styles.footerLink} onPress={onOpenAbout}>
              <User size={14} color="#6b7280" />
              <Text style={styles.footerLinkText}>About</Text>
            </TouchableOpacity>

            <Text style={styles.footerDivider}>•</Text>

            <TouchableOpacity style={styles.footerLink} onPress={onOpenDisclaimer}>
              <ShieldAlert size={14} color="#6b7280" />
              <Text style={styles.footerLinkText}>Disclaimer</Text>
            </TouchableOpacity>

            <Text style={styles.footerDivider}>•</Text>

            <TouchableOpacity style={styles.footerLink} onPress={onOpenContact}>
              <Mail size={14} color="#6b7280" />
              <Text style={styles.footerLinkText}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  container: {
    flexGrow: 1, 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24, // Increased from 4 for top breathing room
    paddingBottom: 24, // Increased from 12
  },
  topSection: {
    flexShrink: 0, 
    marginBottom: 36, // Significantly increased from 16 to separate branding and prompt
  },
  brand: { 
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  brandMark: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#d33b32', 
    marginRight: 8 
  },
  brandTitle: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#050505', 
    letterSpacing: -0.5 
  },
  brandSlogan: { 
    fontSize: 10, 
    fontWeight: '600', 
    color: '#6b7280', 
    textTransform: 'uppercase', 
    letterSpacing: 1 
  },
  middleSection: {
    gap: 24, // Increased from 16 to spread search and speech blocks
    marginBottom: 24, 
  },
  introAndSearchGroup: {
    gap: 16, // Increased from 12
  },
  homeIntro: { 
    marginBottom: 4,
  },
  eyebrow: { 
    color: '#d33b32', 
    fontSize: 14, 
    fontWeight: '800', 
    letterSpacing: 1.5 
  },
  heading: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#050505', 
    lineHeight: 34, 
    letterSpacing: -1 
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'stretch', 
    gap: 10, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    paddingHorizontal: 20, 
    paddingTop: 16, 
    paddingBottom: 16,
    fontSize: 17, 
    fontWeight: '500', 
    color: '#050505',
    minHeight: 90, 
    maxHeight: 140, // longer text scrolls inside the box
    borderWidth: 1,
    borderColor: '#e4e4e7',
    textAlignVertical: 'top', 
  },
  searchButton: { 
    backgroundColor: '#050505', 
    borderRadius: 14, 
    width: 64, 
    alignItems: 'center', 
    justifyContent: 'center',
    minHeight: 90, 
  },
  speechSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#fafafa', 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#e4e4e7' 
  },
  speechLabel: { 
    flex: 1,
    fontSize: 13, 
    fontWeight: '600', 
    color: '#6b7280', 
    marginRight: 8,
  },
  speechControls: { 
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  recordButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#fff', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e4e4e7' 
  },
  recordButtonText: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#050505' 
  },
  recordButtonActive: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#991b1b', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 30 
  },
  recordButtonTextActive: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#fff' 
  },
  recordTimer: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#fee2e2' 
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionDisabled: {
    opacity: 0.5,
  },
  quickActionText: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 14,
  },
  bottomSection: {
    alignItems: 'center', 
    gap: 20, // Increased from 16
    // marginTop: 'auto' has been removed so the parent container spaces everything evenly
  },
  knownButton: { 
    width: '100%', 
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#d33b32', 
    paddingVertical: 18, 
    paddingHorizontal: 20,
    minHeight: 68,
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#d33b32', 
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  knownButtonLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  knownButtonText: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#fff', 
    includeFontPadding: false, 
  },
  emergencyActionButton: {
    width: '100%',
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 2,
    elevation: 2,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  emergencyActionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  emergencyActionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emergencyActionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#991b1b',
    letterSpacing: 0.5,
  },
  emergencyActionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7f1d1d',
    lineHeight: 14,
  },
  homeNote: { 
    fontSize: 12, 
    color: '#6b7280', 
    textAlign: 'center', 
    lineHeight: 16, 
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 10,
  },
  footerLink: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    padding: 4 
  },
  footerLinkText: { 
    fontSize: 12, 
    color: '#6b7280', 
    fontWeight: '700' 
  },
  footerDivider: {
    color: '#d1d5db',
    fontSize: 14,
  },
});