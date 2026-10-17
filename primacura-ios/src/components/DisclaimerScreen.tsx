import { useState } from 'react'; /*[cite: 13]*/
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { ArrowLeft, ShieldAlert, Globe, MapPin } from 'lucide-react-native';
import { useI18n } from '../lib/i18n';

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

// Spanish version of the general and international terms. The state-by-state
// legal provisions stay in their original English.
const TEXT = {
  en: {
    binding: "By downloading, opening, or using PrimaCura Health, you automatically agree to all terms and liability disclaimers listed below.",
    tab1: "1. Universal Terms",
    tab2: "2. US (50 States)",
    tab3: "3. International",
    s1: "Section 1: Core Universal Terms",
    h1: "1. NOT MEDICAL ADVICE & NO DOCTOR-PATIENT RELATIONSHIP",
    p1: "The App, including all text, instructions, and interactive tools, is provided solely for informational and educational purposes. It does not provide medical diagnosis or professional healthcare advice.",
    h2: "2. EMERGENCY WARNING",
    p2: "THE APP IS NOT A SUBSTITUTE FOR EMERGENCY SERVICES. In a life-threatening emergency, immediately call 911 or your local emergency number.",
    h3: "3. ABSOLUTE LIMITATION OF LIABILITY & RELEASE",
    p3: "To the maximum extent permitted by applicable law, the App creators and team shall not be liable for any claims, injuries, losses, or damages arising out of your use of the App or reliance on its instructions.",
    h4: "4. \"AS-IS\" WARRANTY DISCLAIMER",
    p4: "The App is provided \"AS IS\" and \"AS AVAILABLE\" without warranties of any kind, either express or implied.",
    s2: "Section 2: State-Specific Provisions (All 50 US States)",
    search: "Search state (e.g. California, Texas)...",
    s3: "Section 3: International Provisions",
    g: "Global Emergency Dispatch",
    gp: "International users are responsible for calling their local national emergency response number (e.g., 112 in Europe, 999 in the UK, 000 in Australia) rather than US-centric numbers.",
    eu: "European Union (EU) & United Kingdom (UK)",
    eup: "The App is an educational reference tool and is NOT a certified medical device under EU Regulation 2017/745 (MDR) or UK Medical Devices Regulations 2002.",
    au: "Australia & New Zealand",
    aup: "Under Australian Consumer Law and NZ Consumer Guarantees Act, statutory guarantees are limited strictly to re-supplying the App services.",
    stateNote: "",
  },
  es: {
    binding: "Al descargar, abrir o usar PrimaCura Health, aceptas automáticamente todos los términos y exenciones de responsabilidad que aparecen abajo.",
    tab1: "1. Términos generales",
    tab2: "2. EE. UU. (50 estados)",
    tab3: "3. Internacional",
    s1: "Sección 1: Términos generales",
    h1: "1. NO ES CONSEJO MÉDICO NI CREA UNA RELACIÓN MÉDICO-PACIENTE",
    p1: "La App, incluidos todos sus textos, instrucciones y herramientas interactivas, se ofrece solo con fines informativos y educativos. No da diagnósticos médicos ni consejo profesional de salud.",
    h2: "2. ADVERTENCIA DE EMERGENCIA",
    p2: "LA APP NO REEMPLAZA A LOS SERVICIOS DE EMERGENCIA. En una emergencia que pone en riesgo la vida, llama de inmediato al 911 o a tu número local de emergencias.",
    h3: "3. LIMITACIÓN TOTAL DE RESPONSABILIDAD Y LIBERACIÓN",
    p3: "En la máxima medida que permita la ley aplicable, los creadores y el equipo de la App no serán responsables de ningún reclamo, lesión, pérdida o daño que surja del uso de la App o de seguir sus instrucciones.",
    h4: "4. EXENCIÓN DE GARANTÍAS (\"TAL CUAL\")",
    p4: "La App se ofrece \"TAL CUAL\" y \"SEGÚN DISPONIBILIDAD\", sin garantías de ningún tipo, ni expresas ni implícitas.",
    s2: "Sección 2: Disposiciones por estado (los 50 estados de EE. UU.)",
    search: "Busca un estado (p. ej., California, Texas)...",
    s3: "Sección 3: Disposiciones internacionales",
    g: "Emergencias en otros países",
    gp: "Fuera de EE. UU., cada usuario debe llamar al número nacional de emergencias de su país (por ejemplo, 112 en Europa, 999 en el Reino Unido, 000 en Australia) en lugar de números de EE. UU.",
    eu: "Unión Europea (UE) y Reino Unido",
    eup: "La App es una herramienta educativa de consulta y NO es un dispositivo médico certificado según el Reglamento (UE) 2017/745 (MDR) ni el Reglamento de Dispositivos Médicos del Reino Unido de 2002.",
    au: "Australia y Nueva Zelanda",
    aup: "Según la Ley del Consumidor de Australia y la Ley de Garantías al Consumidor de Nueva Zelanda, las garantías legales se limitan estrictamente a volver a prestar los servicios de la App.",
    stateNote: "Las disposiciones legales de cada estado se muestran en su idioma original (inglés).",
  },
  'zh-Hans': {
    binding: "下载、打开或使用PrimaCura Health，即表示你自动同意以下所有条款和免责声明。",
    tab1: "1. 通用条款",
    tab2: "2. 美国（50州）",
    tab3: "3. 国际",
    s1: "第1节：通用条款",
    h1: "1. 不是医疗建议，也不建立医患关系",
    p1: "本应用的所有文字、说明和互动工具仅供参考和教育用途，不提供医疗诊断或专业医疗建议。",
    h2: "2. 紧急情况警告",
    p2: "本应用不能代替紧急服务。遇到危及生命的紧急情况，请立即拨打911或当地紧急电话。",
    h3: "3. 责任限制和免责",
    p3: "在适用法律允许的最大范围内，本应用的创作者和团队对因使用本应用或依赖其说明而引起的任何索赔、伤害、损失或损害概不负责。",
    h4: "4. “按现状”免责声明",
    p4: "本应用按“现状”和“现有可用”提供，不作任何明示或暗示的保证。",
    s2: "第2节：各州条款（美国50州）",
    search: "搜索州名（例如 California、Texas）…",
    s3: "第3节：国际条款",
    g: "其他国家的紧急电话",
    gp: "美国以外的用户应拨打所在国家的紧急电话（例如欧洲112、英国999、澳大利亚000），而不是美国的号码。",
    eu: "欧盟和英国",
    eup: "本应用是教育参考工具，不是欧盟法规2017/745（MDR）或英国2002年医疗器械法规认证的医疗器械。",
    au: "澳大利亚和新西兰",
    aup: "根据澳大利亚消费者法和新西兰消费者保障法，法定保障仅限于重新提供本应用的服务。",
    stateNote: "各州的法律条款以原文（英文）显示。",
  },
  'zh-Hant': {
    binding: "下載、打開或使用PrimaCura Health，即表示你自動同意以下所有條款和免責聲明。",
    tab1: "1. 通用條款",
    tab2: "2. 美國（50州）",
    tab3: "3. 國際",
    s1: "第1節：通用條款",
    h1: "1. 不是醫療建議，也不建立醫患關係",
    p1: "本應用的所有文字、説明和互動工具僅供參考和教育用途，不提供醫療診斷或專業醫療建議。",
    h2: "2. 緊急情況警告",
    p2: "本應用不能代替緊急服務。遇到危及生命的緊急情況，請立即撥打911或當地緊急電話。",
    h3: "3. 責任限制和免責",
    p3: "在適用法律允許的最大範圍內，本應用的創作者和團隊對因使用本應用或依賴其説明而引起的任何索賠、傷害、損失或損害概不負責。",
    h4: "4. 「按現狀」免責聲明",
    p4: "本應用按「現狀」和「現有可用」提供，不作任何明示或暗示的保證。",
    s2: "第2節：各州條款（美國50州）",
    search: "搜索州名（例如 California、Texas）…",
    s3: "第3節：國際條款",
    g: "其他國家的緊急電話",
    gp: "美國以外的用户應撥打所在國家的緊急電話（例如歐洲112、英國999、澳大利亞000），而不是美國的號碼。",
    eu: "歐盟和英國",
    eup: "本應用是教育參考工具，不是歐盟法規2017/745（MDR）或英國2002年醫療器械法規認證的醫療器械。",
    au: "澳大利亞和新西蘭",
    aup: "根據澳大利亞消費者法和新西蘭消費者保障法，法定保障僅限於重新提供本應用的服務。",
    stateNote: "各州的法律條款以原文（英文）顯示。",
  },
};

export function DisclaimerScreen({ onBack }: { onBack: () => void }) {
  const { t, lang } = useI18n();
  const d = TEXT[lang];
  const [activeTab, setActiveTab] = useState<DisclaimerSection>('universal');
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
            <TouchableOpacity style={styles.navBackBtn} onPress={onBack} accessibilityLabel={t('backToHome')}>
              <View style={styles.navIconCircle}>
                <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
              </View>
              <Text style={styles.navBackText}>{t('home')}</Text>
            </TouchableOpacity>
            
            <View style={styles.innerBrand}>
              <Text style={styles.innerBrandTitle}>PrimaCura</Text>
              <Text style={styles.innerBrandSlogan}>{t('slogan')}</Text>
            </View>
          </View>

          <View style={styles.headerTitleRow}>
            <Text style={styles.title}>{t('disclaimerTitle')}</Text>
            <Text style={styles.subtitle}>{t('disclaimerSub')}</Text>
          </View>
        </View>

        {/* Mandatory Use Agreement Banner[cite: 13] */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>
            <ShieldAlert size={16} color="#856404" /> {t('bindingAgreement')}
          </Text>
          <Text style={styles.bannerText}>
            {d.binding}
          </Text>
        </View>

        {/* Section Selector Tabs[cite: 13] */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('universal')}
            style={[styles.tabButton, activeTab === 'universal' ? styles.tabActive : styles.tabInactive]}
          >
            <Text style={[styles.tabText, activeTab === 'universal' ? styles.tabTextActive : styles.tabTextInactive]}>
              {d.tab1}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('us-states')}
            style={[styles.tabButton, activeTab === 'us-states' ? styles.tabActive : styles.tabInactive]}
          >
            <Text style={[styles.tabText, activeTab === 'us-states' ? styles.tabTextActive : styles.tabTextInactive]}>
              {d.tab2}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('international')}
            style={[styles.tabButton, activeTab === 'international' ? styles.tabActive : styles.tabInactive]}
          >
            <Text style={[styles.tabText, activeTab === 'international' ? styles.tabTextActive : styles.tabTextInactive]}>
              {d.tab3}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Universal Disclaimer[cite: 13] */}
        {activeTab === 'universal' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>{d.s1}</Text>
            
            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>{d.h1}</Text>
              <Text style={styles.termText}>
                {d.p1}
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>{d.h2}</Text>
              <Text style={styles.termText}>
                {d.p2}
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>{d.h3}</Text>
              <Text style={styles.termText}>
                {d.p3}
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>{d.h4}</Text>
              <Text style={styles.termText}>
                {d.p4}
              </Text>
            </View>
          </View>
        )}

        {/* Tab 2: 50 US States[cite: 13] */}
        {activeTab === 'us-states' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeader}>{d.s2}</Text>
            <TextInput
              placeholder={d.search}
              placeholderTextColor="#9ca3af"
              value={searchState}
              onChangeText={setSearchState}
              style={styles.searchInput}
            />

            {d.stateNote ? <Text style={styles.stateDetailText}>{d.stateNote}</Text> : null}
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
            <Text style={styles.sectionHeader}>{d.s3}</Text>

            <View style={styles.termBlock}>
              <View style={styles.stateTitleRow}>
                <Globe size={14} color="#111827" />
                <Text style={styles.termTitle}>{d.g}</Text>
              </View>
              <Text style={styles.termText}>
                {d.gp}
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>{d.eu}</Text>
              <Text style={styles.termText}>
                {d.eup}
              </Text>
            </View>

            <View style={styles.termBlock}>
              <Text style={styles.termTitle}>{d.au}</Text>
              <Text style={styles.termText}>
                {d.aup}
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