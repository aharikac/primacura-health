import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet, Modal, Animated, Easing, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Maximize2, Phone, Speech, Square, X } from 'lucide-react-native';
import { Condition } from '../types';
import { ShowMeHow } from './ShowMeHow';
import { StepDiagram } from './StepDiagram';
import { CprRhythm } from './CprRhythm';
import { EmergencyDialog } from './EmergencyDialog';
import { diagrams } from '../data/diagrams';
import { speakAll, stopSpeaking } from '../lib/speech';
import { factsLine, splitSentences } from '../lib/stepText';

// One step at a time, and the step is the page:
//   1. the action in big type
//   2. the picture, right in the page (tap to enlarge)
//   3. the details, one sentence per line, key numbers last in bold red
//   4. one clear "Show me how" button
// Helpers stay small and docked at the bottom: the CPR beat (slim bar, CPR
// steps only), then Back (quiet text), read-aloud and Next (the one big button).
// Location lives in the 911 popup, so the header only has Back, the title and 911.
export function ProtocolScreen({
  condition,
  stepIndex,
  onStepChange,
  onOpenHowTo,
  onBack,
  onDone,
  backLabel = 'First-Aid Guides',
}: {
  condition: Condition;
  // The current step lives in App so "Show me how" -> Back returns to the same step.
  stepIndex: number;
  onStepChange: (index: number) => void;
  onOpenHowTo: (howToId: string) => void;
  onBack: () => void;
  onDone?: () => void; // Done on the last step; defaults to onBack
  backLabel?: string;
}) {
  const total = condition.steps.length;
  const isLast = stepIndex === total - 1;
  const text = condition.steps[stepIndex];
  const rawAction = condition.actions?.[stepIndex] ?? null;
  const action = rawAction && text.startsWith(rawAction) ? rawAction : null;
  const details = action ? text.slice(action.length).trim() : text;
  const lines = splitSentences(details);
  const keyLine = factsLine(condition.facts?.[stepIndex] ?? []);
  const howToId = condition.howTo?.[stepIndex] ?? null;
  const diagramId = condition.diagram?.[stepIndex] ?? null;
  const diagram = diagramId ? diagrams[diagramId] : undefined;

  const hasRhythm = !!condition.rhythm?.some(Boolean);
  const [rhythmRunning, setRhythmRunning] = useState(false);
  const showRhythm = !!condition.rhythm?.[stepIndex] || rhythmRunning;

  const [pictureOpen, setPictureOpen] = useState(false);
  const [confirmCall, setConfirmCall] = useState(false);
  useEffect(() => setPictureOpen(false), [stepIndex]);

  // "More below" hint: shown while the step has content under the fold.
  const scrollRef = useRef<ScrollView>(null);
  const view = useRef({ height: 0, content: 0, y: 0 });
  const [more, setMore] = useState(false);
  const updateMore = () => {
    const v = view.current;
    setMore(v.content - v.y - v.height > 12);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    view.current.y = e.nativeEvent.contentOffset.y;
    updateMore();
  };
  useEffect(() => { view.current.y = 0; }, [stepIndex]);
  const scrollDown = () => scrollRef.current?.scrollTo({ y: view.current.y + view.current.height * 0.7, animated: true });
  // A gentle bounce twice when the hint appears, so it is noticed.
  const nudge = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!more) return;
    const bounce = Animated.sequence([
      Animated.timing(nudge, { toValue: 4, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(nudge, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    Animated.sequence([bounce, bounce]).start();
  }, [more, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Read aloud: once switched on, each step is read as you move to it.
  const [readAloud, setReadAloud] = useState(false);
  useEffect(() => {
    if (!readAloud) return;
    speakAll([`Step ${stepIndex + 1}. ${action ?? ''} ${details} ${keyLine}`]);
  }, [readAloud, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopSpeaking(), []);
  const toggleReadAloud = () => {
    if (readAloud) stopSpeaking();
    setReadAloud(!readAloud);
  };

  const goNext = () => (isLast ? (onDone ?? onBack)() : onStepChange(stepIndex + 1));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.back} onPress={onBack} accessibilityLabel={`Back to ${backLabel}`}>
            <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
          </TouchableOpacity>
          <View style={styles.titleBox}>
            <Text style={styles.stepOf}>STEP {stepIndex + 1} OF {total}</Text>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>{condition.title}</Text>
          </View>
          <TouchableOpacity style={styles.call} onPress={() => setConfirmCall(true)} accessibilityRole="button" accessibilityLabel="Call 911">
            <Phone size={15} color={RED} fill={RED} />
            <Text style={styles.callText}>911</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progress}>
          {condition.steps.map((_, i) => (
            <View key={i} style={[styles.seg, i < stepIndex && styles.segDone, i === stepIndex && styles.segNow]} />
          ))}
        </View>
      </View>

      <View style={styles.scrollArea}>
      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        key={stepIndex}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={(e) => { view.current.height = e.nativeEvent.layout.height; updateMore(); }}
        onContentSizeChange={(_, h) => { view.current.content = h; updateMore(); }}
      >
        {action ? <Text style={styles.action}>{action}</Text> : null}

        {diagram ? (
          <Pressable
            onPress={() => setPictureOpen(true)}
            style={({ pressed }) => [styles.picture, pressed && styles.picturePressed]}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${diagram.alt} Tap to enlarge.`}
          >
            <SvgXml xml={diagram.svg} width="100%" height="100%" />
            <View style={styles.zoom}>
              <Maximize2 size={12} color="#3f3f46" strokeWidth={2.6} />
              <Text style={styles.zoomText}>Tap to enlarge</Text>
            </View>
          </Pressable>
        ) : null}

        {(lines.length > 0 || keyLine) && (
          <View style={styles.lines}>
            {lines.map((line, i) => (
              <View key={i} style={styles.line}>
                <View style={styles.dot} />
                <Text style={[styles.lineText, !action && styles.lineTextLarge]}>{line}</Text>
              </View>
            ))}
            {keyLine ? (
              <View style={styles.line}>
                <View style={[styles.dot, styles.dotKey]} />
                <Text style={[styles.lineText, styles.keyText]}>{keyLine}</Text>
              </View>
            ) : null}
          </View>
        )}

        {howToId ? <ShowMeHow howToId={howToId} onOpen={onOpenHowTo} /> : null}
      </ScrollView>
      {more ? (
        <>
          <View style={styles.fade} pointerEvents="none">
            {[0.15, 0.35, 0.6, 0.85, 1].map((o) => <View key={o} style={[styles.fadeBand, { opacity: o }]} />)}
          </View>
          <Animated.View pointerEvents="box-none" style={[styles.moreWrap, { transform: [{ translateY: nudge }] }]}>
            <TouchableOpacity style={styles.more} onPress={scrollDown} accessibilityRole="button" accessibilityLabel="Scroll down for more">
              <Text style={styles.moreText}>More below</Text>
              <ChevronDown size={16} strokeWidth={2.8} color="#3f3f46" />
            </TouchableOpacity>
          </Animated.View>
        </>
      ) : null}
      </View>

      <View style={styles.dock}>
        {hasRhythm && (
          <View style={!showRhythm && styles.hidden}>
            <CprRhythm variant="bar" onRunningChange={setRhythmRunning} />
          </View>
        )}
        <View style={styles.nav}>
          {stepIndex > 0 ? (
            <TouchableOpacity style={styles.prev} onPress={() => onStepChange(stepIndex - 1)} accessibilityRole="button" accessibilityLabel="Previous step">
              <ChevronLeft size={22} strokeWidth={2.6} color="#3f3f46" />
              <Text style={styles.prevText}>Back</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.navSpacer} />
          <Pressable
            style={({ pressed }) => [styles.speak, readAloud && styles.speakOn, pressed && styles.speakPressed]}
            onPress={toggleReadAloud}
            accessibilityRole="button"
            accessibilityLabel={readAloud ? 'Stop reading aloud' : 'Read steps aloud'}
            accessibilityState={{ selected: readAloud }}
          >
            {readAloud ? <Square size={16} color="#fff" fill="#fff" /> : <Speech size={22} strokeWidth={2.4} color="#050505" />}
          </Pressable>
          <TouchableOpacity style={styles.next} onPress={goNext} accessibilityRole="button">
            <Text style={styles.nextText}>{isLast ? 'Done' : 'Next'}</Text>
            {!isLast ? <ChevronRight size={22} strokeWidth={2.8} color="#fff" /> : null}
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={pictureOpen && !!diagram} transparent animationType="slide" onRequestClose={() => setPictureOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPictureOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{action ?? condition.title}</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={() => setPictureOpen(false)} accessibilityLabel="Close picture">
                <X size={20} strokeWidth={2.6} color="#050505" />
              </TouchableOpacity>
            </View>
            {diagramId ? <StepDiagram id={diagramId} /> : null}
          </Pressable>
        </Pressable>
      </Modal>

      {confirmCall && <EmergencyDialog onCancel={() => setConfirmCall(false)} />}
    </SafeAreaView>
  );
}

const RED = '#d33b32';
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' },
  titleBox: { flex: 1 },
  stepOf: { color: RED, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '800', color: '#27272a' },
  call: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff1f0', borderWidth: 1.5, borderColor: '#f5c2bd' },
  callText: { color: '#991b1b', fontSize: 15, fontWeight: '900' },
  progress: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#e4e4e7' },
  segDone: { backgroundColor: '#f0a39d' },
  segNow: { backgroundColor: RED },

  scrollArea: { flex: 1 },
  body: { flex: 1 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 50 },
  fadeBand: { flex: 1, backgroundColor: '#fff' },
  moreWrap: { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1.5, borderColor: '#e4e4e7', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  moreText: { fontSize: 14, fontWeight: '800', color: '#3f3f46' },
  bodyContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 16 },
  action: { fontSize: 27, lineHeight: 31, fontWeight: '900', color: '#0a0a0a', letterSpacing: -0.4 },

  picture: { height: 176, padding: 8, borderRadius: 16, borderWidth: 1.5, borderColor: '#e4e4e7', backgroundColor: '#fafafa', overflow: 'hidden' },
  picturePressed: { borderColor: RED },
  zoom: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1.5, borderColor: '#e4e4e7' },
  zoomText: { fontSize: 12, fontWeight: '800', color: '#3f3f46' },

  lines: { gap: 10 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d4d4d8', marginTop: 10 },
  dotKey: { backgroundColor: RED },
  lineText: { flex: 1, fontSize: 18, lineHeight: 25, fontWeight: '500', color: '#3f3f46' },
  lineTextLarge: { fontSize: 20, lineHeight: 28, color: '#1f2937' },
  keyText: { fontWeight: '800', color: '#991b1b' },

  dock: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, gap: 10, borderTopWidth: 1, borderTopColor: '#e4e4e7', backgroundColor: '#fff' },
  hidden: { display: 'none' },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prev: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 10 },
  prevText: { fontSize: 17, fontWeight: '800', color: '#3f3f46' },
  navSpacer: { flex: 1 },
  speak: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: '#e4e4e7', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  speakOn: { backgroundColor: '#050505', borderColor: '#050505' },
  speakPressed: { borderColor: RED },
  next: { width: '50%', height: 50, borderRadius: 14, backgroundColor: RED, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  nextText: { fontSize: 18, fontWeight: '900', color: '#fff' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 34, gap: 8 },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#d4d4d8', alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: '#050505' },
  sheetClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' },
});
