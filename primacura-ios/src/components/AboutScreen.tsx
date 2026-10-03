import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Heart, User } from 'lucide-react-native';

export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.navBackBtn} onPress={onBack} accessibilityLabel="Back">
              <View style={styles.navIconCircle}>
                <ArrowLeft size={18} strokeWidth={2.8} color="#050505" />
              </View>
              <Text style={styles.navBackText}>Home</Text>
            </TouchableOpacity>
            
            <View style={styles.innerBrand}>
              <Text style={styles.innerBrandTitle}>PrimaCura</Text>
              <Text style={styles.innerBrandSlogan}>The First Care</Text>
            </View>
          </View>

          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>About PrimaCura</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Heart size={20} color="#d33b32" strokeWidth={2.5} />
            <Text style={styles.cardTitle}>The Mission</Text>
          </View>
          <Text style={styles.cardBody}>
            When a medical emergency strikes, panic often follows. PrimaCura was built to bridge the critical gap between an incident occurring and professional medical help arriving. By providing clear, step-by-step first-aid protocols, this app ensures anyone can take immediate, life-saving action when seconds matter most.
          </Text>
        </View>

        <View style={[styles.card, styles.developerCard]}>
          <View style={styles.cardHeader}>
            <User size={20} color="#d33b32" strokeWidth={2.5} />
            <Text style={styles.cardTitle}>The Developer</Text>
          </View>
          <Text style={styles.cardBody}>
            PrimaCura was designed and engineered entirely by Harika Appalla, a 14-year-old 9th grader with a passion for using technology to make a tangible difference in people's lives.
          </Text>
          
          <View style={styles.quoteBlock}>
            <Text style={styles.quoteText}>
              "I built this app hoping it will help someone in a moment of desperate need. Even if PrimaCura helps just one single person manage an emergency safely, my entire goal has been achieved."
            </Text>
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
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  developerCard: {
    backgroundColor: '#fafafa',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#050505',
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    fontWeight: '500',
  },
  quoteBlock: {
    marginTop: 16,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#d33b32',
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    color: '#4b5563',
    fontWeight: '600',
  },
});