import { useState } from 'react'; /*[cite: 13]*/
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { ArrowLeft, ShieldAlert, Globe, MapPin } from 'lucide-react-native'; /*[cite: 13]*/

type DisclaimerSection = 'universal' | 'us-states' | 'international'; /*[cite: 13]*/

const US_STATES_DATA: { state: string; text: string }[] = [ /*[cite: 13]*/
  { state: 'Alabama', text: 'Incorporates Ala. Code § 6-5-92. App Providers do not provide emergency medical responder services; no duty of care is assumed under state negligence laws.' },
  { state: 'Alaska', text: 'Incorporates AS 09.65.090. Liability is excluded to the maximum extent permitted; use of App content does not constitute volunteer emergency assistance.' },
  { state: 'Arizona', text: 'Pursuant to A.R.S. § 12-553, users waive all negligence claims. Implied warranties are disclaimed under Title 47 (UCC).' },
  { state: 'Arkansas', text: 'Incorporates Ark. Code Ann. § 17-95-101. App Providers assume no responsibility for bystander emergency care or first aid intervention.' },
  { state: 'California', text: 'CALIFORNIA CIVIL CODE SECTION 1542 WAIVER: YOU EXPRESSLY WAIVE CA CIVIL CODE § 1542. ALSO INCORPORATES HEALTH & SAFETY CODE § 1799.102.' },
  { state: 'Colorado', text: 'Incorporates C.R.S. § 13-21-108. App content does not constitute professional medical direction or emergency medical service instruction under Colorado law.' },
  { state: 'Connecticut', text: 'Pursuant to Conn. Gen. Stat. § 52-557b, App Providers bear no liability for emergency first aid information or layperson intervention decisions.' },
  { state: 'Delaware', text: 'Pursuant to 10 Del. C. § 6835, App Providers disclaim all tort liability. Implied warranties disclaimed under 6 Del. C. Art. 2.' },
  { state: 'Florida', text: 'Incorporates Fla. Stat. § 768.13 (Good Samaritan Act). All claims for ordinary negligence, product liability, and personal injury are fully waived.' },
  { state: 'Georgia', text: 'Incorporates O.C.G.A. § 51-1-29. Use of App does not establish emergency medical dispatch or licensed instruction under Georgia tort statutes.' },
  { state: 'Hawaii', text: 'Pursuant to H.R.S. § 663-1.5, App Providers disclaim all liability for emergency guidance or reliance on non-certified instructional materials.' },
  { state: 'Idaho', text: 'Incorporates Idaho Code § 5-330. Users assume full risk for all emergency response procedures executed after viewing App content.' },
  { state: 'Illinois', text: 'Incorporates 745 ILCS 49/ (Good Samaritan Act). App Providers disclaim all implied warranties under 810 ILCS 5/ and liability for non-clinical emergency info.' },
  { state: 'Indiana', text: 'Pursuant to Ind. Code § 34-30-12, App Providers bear zero liability for emergency medical assistance decisions made by users.' },
  { state: 'Iowa', text: 'Incorporates Iowa Code § 613.17. Users accept that App instructions carry no statutory implied warranty of medical accuracy under Iowa law.' },
  { state: 'Kansas', text: 'Pursuant to K.S.A. 65-2891, App Providers disclaim all liability for emergency health actions taken by non-licensed bystanders.' },
  { state: 'Kentucky', text: 'Incorporates KRS 411.148. Disclaims all express/implied health warranties and limits liability to the fullest extent under the Kentucky Constitution.' },
  { state: 'Louisiana', text: 'LOUISIANA CIVIL CODE DISCLAIMER: REGARDLESS OF LA C.C. ART. 2315 ET SEQ., USERS EXPRESSLY ASSUME ALL RISKS ASSOCIATED WITH APP USE.' },
  { state: 'Maine', text: 'Pursuant to 14 M.R.S. § 164, App Providers assume no responsibility for bystander emergency care rendered using App references.' },
  { state: 'Maryland', text: 'Incorporates Md. Code, Cts. & Jud. Proc. § 5-603. App Providers disclaim all tort and product liability for emergency instructions.' },
  { state: 'Massachusetts', text: 'Pursuant to M.G.L. c. 258A § 9 and M.G.L. c. 106 (UCC), all implied warranties and consumer claims against App Providers are fully disclaimed.' },
  { state: 'Michigan', text: 'Incorporates MCL 691.1501. App Providers carry no liability for first aid procedures rendered by users in Michigan.' },
  { state: 'Minnesota', text: 'Incorporates Minn. Stat. § 604A.01. The App provides reference material only and does not perform the legal duty to render assistance.' },
  { state: 'Mississippi', text: 'Pursuant to Miss. Code Ann. § 73-25-37, App Providers disclaim all liability for emergency first aid advice or bystander reliance.' },
  { state: 'Missouri', text: 'Incorporates RSMo § 537.037. Users acknowledge that App Providers are not rendering professional healthcare or emergency dispatch services.' },
  { state: 'Montana', text: 'Pursuant to MCA § 27-1-714, App Providers disclaim all liability for emergency first aid procedures referenced in the App.' },
  { state: 'Nebraska', text: 'Incorporates Neb. Rev. Stat. § 25-21,186. App Providers bear no liability for layperson emergency intervention decisions.' },
  { state: 'Nevada', text: 'Pursuant to NRS 41.500, App Providers disclaim all liability for emergency care or advice rendered via mobile applications.' },
  { state: 'New Hampshire', text: 'Incorporates RSA 508:12. App Providers carry zero statutory duty or liability regarding emergency first aid content.' },
  { state: 'New Jersey', text: 'NEW JERSEY JUSTIFIED DISCLAIMER (NJSA 56:12-14 ET SEQ.): PURSUANT TO TCCNNA, LIMITATIONS OF LIABILITY APPLY TO THE FULLEST EXTENT PERMITTED.' },
  { state: 'New Mexico', text: 'Pursuant to NMSA 1978 § 24-10-3, App Providers disclaim all liability for emergency first aid instructions.' },
  { state: 'New York', text: 'Incorporates N.Y. Pub. Health Law § 3000-a. App Providers disclaim all implied warranties under N.Y. U.C.C. § 2-316.' },
  { state: 'North Carolina', text: 'Pursuant to N.C.G.S. § 90-21.14, App Providers bear no responsibility for emergency first aid assistance performed by App users.' },
  { state: 'North Dakota', text: 'Incorporates N.D.C.C. § 32-03.1-02. Users assume all responsibility for emergency first aid measures performed.' },
  { state: 'Ohio', text: 'Pursuant to R.C. 2305.23, App Providers disclaim all tort, negligence, and product liability arising from emergency first aid content.' },
  { state: 'Oklahoma', text: 'Incorporates 76 O.S. § 5 (Good Samaritan Act). App Providers carry no duty of care or liability for bystander emergency decisions.' },
  { state: 'Oregon', text: 'Pursuant to ORS 30.800, App Providers bear zero liability for emergency first aid or medical assistance information provided in the App.' },
  { state: 'Pennsylvania', text: 'Incorporates 42 Pa.C.S. § 8331. Disclaims all implied warranties under 13 Pa.C.S. (UCC) and liability for emergency health guidance.' },
  { state: 'Rhode Island', text: 'Pursuant to R.I. Gen. Laws § 9-1-27.1, App Providers disclaim all liability for bystander first aid procedures or emergency content.' },
  { state: 'South Carolina', text: 'Incorporates S.C. Code Ann. § 15-1-310. App Providers carry no liability for emergency advice or first aid instructions.' },
  { state: 'South Dakota', text: 'Pursuant to SDCL § 20-9-4.1, App Providers bear no responsibility for emergency care decisions rendered by users.' },
  { state: 'Tennessee', text: 'Incorporates T.C.A. § 63-6-218. App Providers disclaim all liability for bystander first aid or emergency guidance.' },
  { state: 'Texas', text: 'TEXAS CIVIL PRACTICE & REMEDIES CODE DISCLAIMER: PURSUANT TO CPRC CHAPTER 74 AND § 74.151, PROVIDERS DISCLAIM ALL LIABILITY.' },
  { state: 'Utah', text: 'Incorporates Utah Code § 78B-4-501. App Providers carry no liability for first aid or emergency medical information accessed via the App.' },
  { state: 'Vermont', text: 'Pursuant to 12 V.S.A. § 519, App Providers provide information only and bear no liability for bystander emergency intervention.' },
  { state: 'Virginia', text: 'Incorporates Va. Code § 8.01-225. App Providers disclaim all product and tort liability regarding emergency response content.' },
  { state: 'Washington', text: 'Pursuant to RCW 4.24.300, App Providers carry zero liability for emergency care decisions or first aid instructions provided in the App.' },
  { state: 'West Virginia', text: 'Incorporates W. Va. Code § 55-7-19. App Providers disclaim all liability for emergency first aid assistance rendered by users.' },
  { state: 'Wisconsin', text: 'Pursuant to Wis. Stat. § 895.48, App Providers carry no duty of care or liability for bystander emergency assistance guidance.' },
  { state: 'Wyoming', text: 'Incorporates Wyo. Stat. § 1-1-110. App Providers disclaim all liability for emergency first aid procedures or medical information.' },
];

export function DisclaimerScreen({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<DisclaimerSection>('universal'); /*[cite: 13]*/
  const [searchState, setSearchState] = useState(''); /*[cite: 13]*/

  const filteredStates = US_STATES_DATA.filter(item => 
    item.state.toLowerCase().includes(searchState.toLowerCase()) ||
    item.text.toLowerCase().includes(searchState.toLowerCase())
  ); /*[cite: 13]*/

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={true}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.navBackBtn} onPress={onBack} accessibilityLabel="Back to home">
              <View style={styles.navIconCircle}>
                <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
              </View>
              <Text style={styles.navBackText}>Home</Text>
            </TouchableOpacity>
            
            <View style={styles.innerBrand}>
              <Text style={styles.innerBrandTitle}>PrimaCura</Text>
              <Text style={styles.innerBrandSlogan}>The First Care</Text>
            </View>
          </View>

          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>Medical Disclaimer</Text>
            <Text style={styles.subtitle}>Important safety information.</Text>
          </View>
        </View>

        {/* Mandatory Use Agreement Banner[cite: 13] */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            <ShieldAlert size={16} color="#856404" /> BINDING AGREEMENT:
          </Text>
          <Text style={styles.bannerText}>
            By downloading, opening, or using PrimaCura Health, you automatically agree to all terms and liability disclaimers listed below.
          </Text>
        </View>

        {/* Section Selector Tabs[cite: 13] */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('universal')}
            style={[styles.tabButton, activeTab === 'universal' ? styles.tabActive : styles.tabInactive]}
          >
            <Text style={[styles.tabText, activeTab === 'universal' ? styles.tabTextActive : styles.tabTextInactive]}>
              1. Universal Terms
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('us-states')}
            style={[styles.tabButton, activeTab === 'us-states' ? styles.tabActive : styles.tabInactive]}
          >
            <Text style={[styles.tabText, activeTab === 'us-states' ? styles.tabTextActive : styles.tabTextInactive]}>
              2. US (50 States)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('international')}
            style={[styles.tabButton, activeTab === 'international' ? styles.tabActive : styles.tabInactive]}
          >
            <Text style={[styles.tabText, activeTab === 'international' ? styles.tabTextActive : styles.tabTextInactive]}>
              3. International
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Universal Disclaimer[cite: 13] */}
        {activeTab === 'universal' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Section 1: Core Universal Terms</Text>
            
            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>1. NOT MEDICAL ADVICE & NO DOCTOR-PATIENT RELATIONSHIP</Text>
              <Text style={styles.termText}>
                The App, including all text, instructions, and interactive tools, is provided solely for informational and educational purposes. It does not provide medical diagnosis or professional healthcare advice.
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>2. EMERGENCY WARNING</Text>
              <Text style={styles.termText}>
                THE APP IS NOT A SUBSTITUTE FOR EMERGENCY SERVICES. In a life-threatening emergency, immediately call 911 or your local emergency number.
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>3. ABSOLUTE LIMITATION OF LIABILITY & RELEASE</Text>
              <Text style={styles.termText}>
                To the maximum extent permitted by applicable law, the App creators and team shall not be liable for any claims, injuries, losses, or damages arising out of your use of the App or reliance on its instructions.
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>4. "AS-IS" WARRANTY DISCLAIMER</Text>
              <Text style={styles.termText}>
                The App is provided "AS IS" and "AS AVAILABLE" without warranties of any kind, either express or implied.
              </Text>
            </View>
          </View>
        )}

        {/* Tab 2: 50 US States[cite: 13] */}
        {activeTab === 'us-states' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Section 2: State-Specific Provisions (All 50 US States)</Text>
            <TextInput
              placeholder="Search state (e.g. California, Texas)..."
              placeholderTextColor="#9ca3af"
              value={searchState}
              onChangeText={setSearchState}
              style={styles.searchInput}
            />

            <View style={styles.stateListContainer}>
              {filteredStates.map((item) => (
                <View key={item.state} style={styles.stateBlock}>
                  <View style={styles.stateTitleRow}>
                    <MapPin size={14} color="#111827" />
                    <Text style={styles.stateTitleText}>{item.state}</Text>
                  </View>
                  <Text style={styles.stateDetailText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tab 3: International[cite: 13] */}
        {activeTab === 'international' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>Section 3: International Provisions</Text>

            <View style={styles.termBlock}>
              <View style={styles.stateTitleRow}>
                <Globe size={14} color="#111827" />
                <Text style={styles.termTitle}>Global Emergency Dispatch</Text>
              </View>
              <Text style={styles.termText}>
                International users are responsible for calling their local national emergency response number (e.g., 112 in Europe, 999 in the UK, 000 in Australia) rather than US-centric numbers.
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>European Union (EU) & United Kingdom (UK)</Text>
              <Text style={styles.termText}>
                The App is an educational reference tool and is NOT a certified medical device under EU Regulation 2017/745 (MDR) or UK Medical Devices Regulations 2002.
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>Australia & New Zealand</Text>
              <Text style={styles.termText}>
                Under Australian Consumer Law and NZ Consumer Guarantees Act, statutory guarantees are limited strictly to re-supplying the App services.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navIconCircle: {
    backgroundColor: '#f4f4f5',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBackText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#050505',
  },
  innerBrand: {
    alignItems: 'flex-end',
  },
  innerBrandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#050505',
    letterSpacing: -0.5,
  },
  innerBrandSlogan: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitleRow: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#050505',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  banner: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  bannerTitle: {
    fontWeight: '700',
    color: '#856404',
    marginBottom: 4,
    fontSize: 14,
  },
  bannerText: {
    color: '#856404',
    fontSize: 14,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#111827',
  },
  tabInactive: {
    backgroundColor: '#f3f4f6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextInactive: {
    color: '#4b5563',
  },
  sectionContainer: {
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#e63946',
  },
  termBlock: {
    marginBottom: 16,
  },
  termTitle: {
    fontWeight: '700',
    color: '#1f2937',
    fontSize: 14,
    marginBottom: 4,
  },
  termText: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
  searchInput: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 16,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  stateListContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  stateBlock: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stateTitleText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  stateDetailText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
});