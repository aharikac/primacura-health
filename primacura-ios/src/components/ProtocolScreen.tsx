import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Image as ImageIcon, Phone, X } from 'lucide-react-native';
import { Condition } from '../types';
import { ShowMeHow, chipStyles } from './ShowMeHow';
import { StepDiagram } from './StepDiagram';
import { CprRhythm } from './CprRhythm';
import { EmergencyDialog } from './EmergencyDialog';
import { diagrams } from '../data/diagrams';
import { FactPills } from './FactPills';

// One step at a time: the action in big type, details under it, key numbers as
// pills, then small chips for the picture and "Show me how". The CPR rhythm bar
// and Back/Next are docked at the bottom, so nothing ever covers the step.
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
  onDone?: () => void; // DONE on the last step; defaults to onBack
  backLabel?: string;
}) {
  const total = condition.steps.length;
  const isLast = stepIndex === total - 1;
  const text = condition.steps[stepIndex];
  const rawAction = condition.actions?.[stepIndex] ?? null;
  const action = rawAction && text.startsWith(rawAction) ? rawAction : null;
  const details = action ? text.slice(action.length).trim() : text;
  const facts = condition.facts?.[stepIndex] ?? [];
  const howToId = condition.howTo?.[stepIndex] ?? null;
  const diagramId = condition.diagram?.[stepIndex] ?? null;

  const hasRhythm = !!condition.rhythm?.some(Boolean);
  const [rhythmRunning, setRhythmRunning] = useState(false);
  const showRhythm = !!condition.rhythm?.[stepIndex] || rhythmRunning;

  const [pictureOpen, setPictureOpen] = useState(false);
  const [confirmCall, setConfirmCall] = useState(false);
  useEffect(() => setPictureOpen(false), [stepIndex]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.back} onPress={onBack} accessibilityLabel={`Back to ${backLabel}`}>
            <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
          </TouchableOpacity>
          <View style={styles.titleBox}>
            <Text style={styles.stepOf}>STEP {stepIndex + 1} OF {total}</Text>
            <Text style={styles.title} accessibilityRole="header">{condition.title}</Text>
          </View>
          <TouchableOpacity
            style={styles.call}
            onPress={() => setConfirmCall(true)}
            accessibilityRole="button"
            accessibilityLabel="Call 911"
          >
            <Phone size={14} color="#d33b32" fill="#d33b32" />
            <Text style={styles.callText}>911</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progress}>
          {condition.steps.map((_, i) => (
            <View key={i} style={[styles.seg, i < stepIndex && styles.segDone, i === stepIndex && styles.segNow]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} key={stepIndex}>
        {action ? <Text style={styles.action}>{action}</Text> : null}
        {details ? <Text style={[styles.details, !action && styles.detailsOnly]}>{details}</Text> : null}
        <FactPills facts={facts} />
        {(diagramId || howToId) && (
          <View style={styles.chips}>
            {diagramId && diagrams[diagramId] ? (
              <Pressable
                onPress={() => setPictureOpen(true)}
                style={({ pressed }) => [chipStyles.chip, pressed && chipStyles.pressed]}
                accessibilityRole="button"
              >
                <View style={chipStyles.icon}>
                  <ImageIcon size={18} strokeWidth={2.4} color="#d33b32" />
                </View>
                <Text style={chipStyles.label}>See picture</Text>
              </Pressable>
            ) : null}
            {howToId ? <ShowMeHow howToId={howToId} onOpen={onOpenHowTo} /> : null}
          </View>
        )}
      </ScrollView>

      <View style={styles.dock}>
        {hasRhythm && (
          <View style={!showRhythm && styles.hidden}>
            <CprRhythm variant="bar" onRunningChange={setRhythmRunning} />
          </View>
        )}
        <View style={styles.actions}>
          {stepIndex > 0 && (
            <TouchableOpacity style={[styles.nav, styles.navBack]} onPress={() => onStepChange(stepIndex - 1)}>
              <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
              <Text style={styles.navBackText}>BACK</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nav, styles.navNext]}
            onPress={() => (isLast ? (onDone ?? onBack)() : onStepChange(stepIndex + 1))}
          >
            <Text style={styles.navNextText}>{isLast ? 'DONE' : 'NEXT'}</Text>
            <ArrowRight size={20} strokeWidth={2.8} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={pictureOpen && !!diagramId} transparent animationType="slide" onRequestClose={() => setPictureOpen(false)}>
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
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' },
  titleBox: { flex: 1 },
  stepOf: { color: RED, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 18, lineHeight: 21, fontWeight: '900', color: '#050505' },
  call: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#fff1f0', borderWidth: 1.5, borderColor: '#f5c2bd' },
  callText: { color: RED, fontSize: 13, fontWeight: '900' },
  progress: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#e4e4e7' },
  segDone: { backgroundColor: '#f0a39d' },
  segNow: { backgroundColor: RED },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16, gap: 14 },
  action: { fontSize: 26, lineHeight: 30, fontWeight: '900', color: '#050505', letterSpacing: -0.4 },
  details: { fontSize: 17, lineHeight: 24, fontWeight: '600', color: '#3f3f46' },
  detailsOnly: { fontSize: 20, lineHeight: 28, color: '#1f2937' },
  chips: { flexDirection: 'row', gap: 10 },
  dock: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 10, borderTopWidth: 1.5, borderTopColor: '#e4e4e7', backgroundColor: '#fff' },
  hidden: { display: 'none' },
  actions: { flexDirection: 'row', gap: 10 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, height: 56, gap: 6 },
  navBack: { flex: 1, borderWidth: 2, borderColor: '#050505', backgroundColor: '#fff' },
  navBackText: { fontSize: 16, fontWeight: '900', color: '#050505' },
  navNext: { flex: 2, backgroundColor: RED },
  navNextText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 34, gap: 8 },
  grab: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#d4d4d8', alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '900', color: '#050505' },
  sheetClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center' },
});
