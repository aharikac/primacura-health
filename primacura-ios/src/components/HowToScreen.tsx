import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Phone, Square, TriangleAlert, Volume2 } from 'lucide-react-native';
import { howTos } from '../data/howTo';
import { howToIcon } from './howToIcons';
import { EmergencyDialog } from './EmergencyDialog';
import { StepDiagram } from './StepDiagram';
import { CprRhythm } from './CprRhythm';
import { MoreBelow, useMoreBelow } from './MoreBelow';
import { factsLine } from '../lib/stepText';
import { speakAll, stopSpeaking } from '../lib/speech';

// One How-To card. The numbered steps and their pictures are the page; the key
// numbers are one bold line of text, and the CPR beat is a slim bar docked at
// the bottom (CPR cards only). A "More below" hint shows while there is more
// to scroll. Cards in the same group (e.g. CPR) switch with age tabs.
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
  const { more, scrollProps, scrollDown } = useMoreBelow(currentId);
  const keyLine = factsLine(card.keyFacts);
  const siblings = card.group ? howTos.filter((h) => h.group === card.group) : [];
  const Icon = howToIcon(card.id);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.scrollArea}>
      <ScrollView {...scrollProps} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <Icon size={24} strokeWidth={2.4} color="#fff" />
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

        {keyLine ? (
          <View style={styles.keyRow}>
            <View style={styles.keyDot} />
            <Text style={styles.keyText}>{keyLine}</Text>
          </View>
        ) : null}

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
          <Phone size={16} color={RED} fill={RED} />
          <Text style={styles.callText}>Life-threatening? Call 911 first.</Text>
        </TouchableOpacity>
      </ScrollView>
      <MoreBelow show={more} onPress={scrollDown} />
      </View>

      {card.rhythm ? (
        <View style={styles.dock}>
          <CprRhythm key={card.id} variant="bar" initialMode={card.rhythm} />
        </View>
      ) : null}
      {/* Asks before dialing: Yes, call 911 / Cancel */}
      {confirmCall && <EmergencyDialog onCancel={() => setConfirmCall(false)} />}
    </SafeAreaView>
  );
}

const RED = '#d33b32';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollArea: { flex: 1 },
  dock: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: '#e4e4e7', backgroundColor: '#fff' },
  keyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  keyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: RED, marginTop: 9 },
  keyText: { flex: 1, fontSize: 17, lineHeight: 24, fontWeight: '800', color: '#991b1b' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navIconCircle: { backgroundColor: '#f4f4f5', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  navBackText: { fontSize: 14, fontWeight: '700', color: '#050505' },
  innerBrand: { alignItems: 'flex-end' },
  innerBrandTitle: { fontSize: 15, fontWeight: '900', color: '#050505', letterSpacing: -0.5 },
  innerBrandSlogan: { fontSize: 9, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 46, height: 46, borderRadius: 13, backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
  },
  heroText: { flex: 1, gap: 2 },
  eyebrow: { color: RED, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 24, lineHeight: 28, fontWeight: '900', color: '#050505' },
  summary: { fontSize: 17, lineHeight: 24, fontWeight: '500', color: '#3f3f46' },
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
  stepLead: { fontSize: 18, fontWeight: '900', color: '#050505', marginBottom: 2 },
  stepText: { fontSize: 17, lineHeight: 24, fontWeight: '500', color: '#3f3f46' },
  watch: { padding: 14, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#f59e0b', backgroundColor: '#fffbeb', gap: 6 },
  watchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  watchTitle: { color: '#b45309', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  watchItem: { fontSize: 15, lineHeight: 21, fontWeight: '500', color: '#78350f' },
  call: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#f5c2bd', borderLeftWidth: 6, borderLeftColor: RED },
  callText: { color: '#991b1b', fontSize: 15, fontWeight: '800' },
});
