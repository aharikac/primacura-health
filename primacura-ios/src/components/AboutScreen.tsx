import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Languages, ListChecks, MapPin, Mic, Quote, ShieldPlus, Speech, User } from 'lucide-react-native';
import { useI18n, StringKey } from '../lib/i18n';

const FEATURES: { Icon: typeof Mic; label: StringKey }[] = [
  { Icon: ListChecks, label: 'featSteps' },
  { Icon: Mic, label: 'featSpeak' },
  { Icon: Speech, label: 'featRead' },
  { Icon: MapPin, label: 'featLocation' },
  { Icon: Languages, label: 'featSpanish' },
];

export function AboutScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.navBackBtn} onPress={onBack} accessibilityLabel={t('backToHome')}>
              <View style={styles.navIconCircle}>
                <ArrowLeft size={18} strokeWidth={2.8} color="#050505" />
              </View>
              <Text style={styles.navBackText}>{t('home')}</Text>
            </TouchableOpacity>
            
            <View style={styles.innerBrand}>
              <Text style={styles.innerBrandTitle}>PrimaCura</Text>
              <Text style={styles.innerBrandSlogan}>{t('slogan')}</Text>
            </View>
          </View>

          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>{t('aboutTitle')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconTile}><ShieldPlus size={20} color="#fff" strokeWidth={2.4} /></View>
            <Text style={styles.cardTitle}>{t('mission')}</Text>
          </View>
          <Text style={styles.cardBody}>{t('missionText')}</Text>
          <View style={styles.features}>
            {FEATURES.map(({ Icon, label }) => (
              <View key={label} style={styles.feature}>
                <Icon size={18} strokeWidth={2.4} color="#9f1d15" />
                <Text style={styles.featureText}>{t(label)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, styles.developerCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconTile}><User size={20} color="#fff" strokeWidth={2.4} /></View>
            <Text style={styles.cardTitle}>{t('developer')}</Text>
          </View>
          <View style={styles.devId}>
            <View style={styles.avatar}><Text style={styles.avatarText}>HA</Text></View>
            <View>
              <Text style={[styles.devName, styles.devNameLarge]}>Harika Appalla</Text>
              <Text style={styles.devRole}>{t('devRole')}</Text>
            </View>
          </View>
          <Text style={styles.cardBody}>
            {t('devText1')}<Text style={styles.devName}>Harika Appalla</Text>{t('devText2')}
          </Text>

          <View style={styles.quoteBlock}>
            <Quote size={22} strokeWidth={2.6} color="#d33b32" />
            <Text style={styles.quoteText}>{t('devQuote')}</Text>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
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
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#050505',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e4e4e7',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  developerCard: {
    backgroundColor: '#fff8f7',
    borderColor: '#f5c2bd',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#d33b32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#050505',
    letterSpacing: -0.3,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#3f3f46',
    fontWeight: '500',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  feature: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff1f0',
    borderWidth: 1.5,
    borderColor: '#f5c2bd',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#9f1d15',
  },
  devId: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d33b32',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d33b32',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  devName: { fontWeight: '800', color: '#d33b32' },
  devNameLarge: { fontSize: 18 },
  devRole: { fontSize: 13, fontWeight: '700', color: '#71717a', marginTop: 2 },
  quoteBlock: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderLeftWidth: 5,
    borderLeftColor: '#d33b32',
  },
  quoteText: {
    flex: 1,
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 23,
    color: '#27272a',
    fontWeight: '500',
  },
});