import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { Condition } from '../types';

export function ProtocolScreen({
  condition,
  onBack,
  onDone,
  backLabel = 'First-Aid Guides',
}: {
  condition: Condition;
  onBack: () => void;
  onDone?: () => void; // DONE on the last step; defaults to onBack
  backLabel?: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const isLast = stepIndex === condition.steps.length - 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        bounces={false}
      >
        <View style={styles.header}>
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

          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>{condition.title}</Text>
            <Text style={styles.subtitle}>Follow these steps carefully.</Text>
          </View>
        </View>

        <View style={styles.protocolBody}>
          <Text style={styles.stepCounter}>STEP {stepIndex + 1} OF {condition.steps.length}</Text>
          <View style={styles.stepCard}>
            <Text key={stepIndex} style={styles.stepText}>
              {condition.steps[stepIndex].replace(/([.!?])\s+/g, '$1\n\n')}
            </Text>
          </View>
        </View>

        <View style={styles.protocolActions}>
          {stepIndex > 0 && (
            <TouchableOpacity style={[styles.stepNav, styles.stepNavBack]} onPress={() => setStepIndex(stepIndex - 1)}>
              <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
              <Text style={styles.stepNavBackText}>BACK</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.stepNav, styles.stepNavNext, stepIndex === 0 && styles.stepNavFull]}
            onPress={() => (isLast ? (onDone ?? onBack)() : setStepIndex(stepIndex + 1))}
          >
            <Text style={styles.stepNavNextText}>{isLast ? 'DONE' : 'NEXT'}</Text>
            <ArrowRight size={20} strokeWidth={2.8} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navIconCircle: {
    backgroundColor: '#f4f4f5',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#050505',
  },
  innerBrand: {
    alignItems: 'flex-end',
  },
  innerBrandTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#050505',
    letterSpacing: -0.5,
  },
  innerBrandSlogan: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitleRow: {
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#050505',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  protocolBody: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  stepCounter: {
    color: '#d33b32',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  stepCard: {
    flexGrow: 1,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e4e4e7',
  },
  stepText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1f2937',
    fontWeight: '600',
  },
  protocolActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  stepNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  stepNavBack: {
    flex: 1,
    backgroundColor: '#e4e4e7',
  },
  stepNavBackText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#050505',
  },
  stepNavNext: {
    flex: 2,
    backgroundColor: '#d33b32',
  },
  stepNavFull: {
    flex: 1, 
  },
  stepNavNextText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});