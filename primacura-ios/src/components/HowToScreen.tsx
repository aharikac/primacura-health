import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Square, TriangleAlert, Volume2 } from 'lucide-react-native';
import { howTos } from '../data/howTo';
import { howToIcon } from './howToIcons';
import { EmergencyDialog } from './EmergencyDialog';
import { StepDiagram } from './StepDiagram';
import { CprRhythm } from './CprRhythm';
import { FactPills } from './FactPills';
import { speakAll, stopSpeaking } from '../lib/speech';

// One How-To card: what it's for, the key numbers, numbered moves and what to
// watch out for. Cards in the same group (e.g. CPR) switch with age tabs.
export function HowToScreen({
  howToId,
  onBack,
  backLabel = 'Back',
}: {
  howToId: string;
  onBack: () => void;
  backLabel?: string;
}) {
  const [currentId, setCurrentId] = useState(howToId);
  const [confirmCall, setConfirmCall] = useState(false);
  useEffect(() => setCurrentId(howToId), [howToId]);

  const card = howTos.find((h) => h.id === currentId) ?? howTos[0];

  // Listen: reads the steps in order, highlighting the one being read.
  const [speaking, setSpeaking] = useState<number | null>(null);
  useEffect(() => { stopSpeaking(); setSpeaking(null); }, [currentId]);
  useEffect(() => () => stopSpeaking(), []);
  const listen = () => {
    if (speaking !== null) { stopSpeaking(); setSpeaking(null); return; }
    setSpeaking(-1);
    speakAll(
      [`${card.title}.`, ...card.steps.map((s, i) => `Step ${i + 1}. ${s.lead ? s.lead + '. ' : ''}${s.text}`)],
      (i) => setSpeaking(i - 1),
      () => setSpeaking(null),
    );
  };
  const siblings = card.group ? howTos.filter((h) => h.group === card.group) : [];
  const Icon = howToIcon(card.id);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.navBackBtn} onPress={onBack} accessibilityLabel={`Back to ${backLabel}`}>
            <View style={styles.navIconCircle}>
              <ArrowLeft size={18} strokeWidth={2.8} color="#050505" />
            </View>
            <Text style={styles.navBackText}>{backLabel}</Text>
          </TouchableOpacity>
          <View style={styles.innerBrand}>
            <Text style={styles.innerBrandTitle}>PrimaCura</Text>
            <Text style={styles.innerBrandSlogan}>The First Care</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon size={30} strokeWidth={2.4} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>HOW-TO</Text>
            <Text style={styles.title} accessibilityRole="header">{card.title}</Text>
          </View>
        </View>
        <Text style={styles.summary}>{card.summary}</Text>
        <Pressable style={[styles.listen, speaking !== null && styles.listenOn]} onPress={listen} accessibilityRole="button">
          {speaking !== null ? <Square size={12} color="#fff" fill="#fff" /> : <Volume2 size={15} color="#3f3f46" />}
          <Text style={[styles.listenText, speaking !== null && styles.listenTextOn]}>
            {speaking !== null ? 'Stop listening' : 'Listen to the steps'}
          </Text>
        </Pressable>

        {siblings.length > 1 && (
          <View style={styles.tabs} accessibilityRole="tablist">
            {siblings.map((s) => {
              const active = s.id === card.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setCurrentId(s.id)}
                  style={[styles.tab, active && styles.tabActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{s.age}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <FactPills facts={card.keyFacts} />

        {card.rhythm ? <CprRhythm key={card.id} initialMode={card.rhythm} /> : null}

        <View>
          {card.steps.map((step, i) => {
            const last = i === card.steps.length - 1;
            return (
              <View key={`${card.id}-${i}`} style={[styles.step, last && styles.stepLast, speaking === i && styles.stepSpeaking]}>
                <View style={styles.stepRail}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  {!last && <View style={styles.stepLine} />}
                </View>
                <View style={styles.stepBody}>
                  {step.lead ? <Text style={styles.stepLead}>{step.lead}</Text> : null}
                  <Text style={styles.stepText}>{step.text}</Text>
                  {step.diagram ? <StepDiagram id={step.diagram} /> : null}
                </View>
              </View>
            );
          })}
        </View>

        {card.watchOut.length > 0 && (
          <View style={styles.watch}>
            <View style={styles.watchTitleRow}>
              <TriangleAlert size={17} strokeWidth={2.6} color="#b45309" />
              <Text style={styles.watchTitle}>WATCH OUT</Text>
            </View>
            {card.watchOut.map((w) => (
              <Text key={w} style={styles.watchItem}>•  {w}</Text>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.call}
          onPress={() => setConfirmCall(true)}
          accessibilityRole="button"
          accessibilityLabel="Life-threatening? Call 911 first."
        >
          <Phone size={16} color="#fff" fill="#fff" />
          <Text style={styles.callText}>Life-threatening? Call 911 first.</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Asks before dialing: Yes, call 911 / Cancel */}
      {confirmCall && <EmergencyDialog onCancel={() => setConfirmCall(false)} />}
    </SafeAreaView>
  );
}

const RED = '#d33b32';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navIconCircle: { backgroundColor: '#f4f4f5', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navBackText: { fontSize: 14, fontWeight: '700', color: '#050505' },
  innerBrand: { alignItems: 'flex-end' },
  innerBrandTitle: { fontSize: 15, fontWeight: '900', color: '#050505', letterSpacing: -0.5 },
  innerBrandSlogan: { fontSize: 9, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
    shadowColor: RED, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
  },
  heroText: { flex: 1, gap: 2 },
  eyebrow: { color: RED, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 24, lineHeight: 28, fontWeight: '900', color: '#050505' },
  summary: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: '#52525b' },
  tabs: { flexDirection: 'row', gap: 4, padding: 4, backgroundColor: '#f4f4f5', borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  tabText: { fontSize: 15, fontWeight: '800', color: '#52525b' },
  tabTextActive: { color: RED },
  step: { flexDirection: 'row', gap: 14, paddingBottom: 18 },
  stepLast: { paddingBottom: 0 },
  stepSpeaking: { backgroundColor: '#fff7ed', borderRadius: 10 },
  listen: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: '#e4e4e7', backgroundColor: '#fff' },
  listenOn: { backgroundColor: '#050505', borderColor: '#050505' },
  listenText: { fontSize: 13, fontWeight: '800', color: '#3f3f46' },
  listenTextOn: { color: '#fff' },
  stepRail: { alignItems: 'center', width: 34 },
  stepNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  stepLine: { flex: 1, width: 2, backgroundColor: '#f5c2bd', marginTop: 4, marginBottom: -16 },
  stepBody: { flex: 1, paddingTop: 5 },
  stepLead: { fontSize: 16, fontWeight: '900', color: '#050505', marginBottom: 2 },
  stepText: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: '#3f3f46' },
  watch: { padding: 14, borderRadius: 12, borderWidth: 2, borderColor: '#fcd34d', borderLeftWidth: 6, borderLeftColor: '#f59e0b', backgroundColor: '#fffbeb', gap: 6 },
  watchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  watchTitle: { color: '#b45309', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  watchItem: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#78350f' },
  call: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: '#050505' },
  callText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
