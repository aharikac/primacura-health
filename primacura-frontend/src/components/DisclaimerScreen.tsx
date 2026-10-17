import { useState } from 'react';
import { ArrowLeft, ShieldAlert, Globe, MapPin, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../lib/i18n';

type DisclaimerSection = 'universal' | 'us-states' | 'international';

const US_STATES_DATA: { state: string; text: string }[] = [
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
};

export function DisclaimerScreen({ onBack }: { onBack: () => void }) {
  const { t, lang } = useI18n();
  const d = TEXT[lang];
  const [activeTab, setActiveTab] = useState<DisclaimerSection>('universal');
  const [searchState, setSearchState] = useState('');

  const filteredStates = US_STATES_DATA.filter(item => 
    item.state.toLowerCase().includes(searchState.toLowerCase()) ||
    item.text.toLowerCase().includes(searchState.toLowerCase())
  );

  return (
    <main className="disclaimer-screen" style={{ padding: '16px', overflowY: 'auto', maxHeight: '100%' }}>
      <header className="inner-page-header">
        
        <div className="header-top-row">
          <button className="nav-back-btn" onClick={onBack} aria-label={t('backToHome')}>
            <div className="nav-icon-circle">
              <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
            </div>
            {t('home')}
          </button>
          
          <div className="inner-brand">
            <span className="inner-brand-title">PrimaCura</span>
            <span className="inner-brand-slogan">{t('slogan')}</span>
          </div>
        </div>

        <div className="header-title-row">
          <h1>{t('disclaimerTitle')}</h1>
          <p>{t('disclaimerSub')}</p>
        </div>
        
      </header>

      {/* Mandatory Use Agreement Banner */}
      <div style={{ backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
        <p style={{ margin: 0, fontWeight: 700, color: '#856404' }}>
          <ShieldAlert size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          {t('bindingAgreement')}
        </p>
        <span style={{ color: '#856404' }}>
          {d.binding}
        </span>
      </div>

      {/* Section Selector Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', borderBottom: '2px solid #e0e0e0', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('universal')}
          style={{
            flex: 1,
            padding: '8px 4px',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'universal' ? '#111827' : '#f3f4f6',
            color: activeTab === 'universal' ? '#ffffff' : '#4b5563',
            cursor: 'pointer'
          }}
        >
          {d.tab1}
        </button>
        <button
          onClick={() => setActiveTab('us-states')}
          style={{
            flex: 1,
            padding: '8px 4px',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'us-states' ? '#111827' : '#f3f4f6',
            color: activeTab === 'us-states' ? '#ffffff' : '#4b5563',
            cursor: 'pointer'
          }}
        >
          {d.tab2}
        </button>
        <button
          onClick={() => setActiveTab('international')}
          style={{
            flex: 1,
            padding: '8px 4px',
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeTab === 'international' ? '#111827' : '#f3f4f6',
            color: activeTab === 'international' ? '#ffffff' : '#4b5563',
            cursor: 'pointer'
          }}
        >
          {d.tab3}
        </button>
      </div>

      {/* Tab 1: Universal Disclaimer */}
      {activeTab === 'universal' && (
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4', color: '#1f2937' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: '#e63946' }}>
            {d.s1}
          </h2>
          
          <div style={{ marginBottom: '12px' }}>
            <strong>{d.h1}</strong>
            <p style={{ marginTop: '4px', color: '#4b5563' }}>
              {d.p1}
            </p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong>{d.h2}</strong>
            <p style={{ marginTop: '4px', color: '#4b5563' }}>
              {d.p2}
            </p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong>{d.h3}</strong>
            <p style={{ marginTop: '4px', color: '#4b5563' }}>
              {d.p3}
            </p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong>{d.h4}</strong>
            <p style={{ marginTop: '4px', color: '#4b5563' }}>
              {d.p4}
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: 50 US States */}
      {activeTab === 'us-states' && (
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: '#e63946' }}>
            {d.s2}
          </h2>
          <input
            type="text"
            placeholder={d.search}
            value={searchState}
            onChange={(e) => setSearchState(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              marginBottom: '12px',
              fontSize: '0.85rem'
            }}
          />

          {d.stateNote && <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#6b7280' }}>{d.stateNote}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
            {filteredStates.map((item) => (
              <div key={item.state} style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <strong style={{ color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} /> {item.state}
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#4b5563' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: International */}
      {activeTab === 'international' && (
        <div style={{ fontSize: '0.85rem', lineHeight: '1.4', color: '#1f2937' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: '#e63946' }}>
            {d.s3}
          </h2>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={14} /> {d.g}
            </strong>
            <p style={{ marginTop: '4px', color: '#4b5563' }}>
              {d.gp}
            </p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong>{d.eu}</strong>
            <p style={{ marginTop: '4px', color: '#4b5563' }}>
              {d.eup}
            </p>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong>{d.au}</strong>
            <p style={{ marginTop: '4px', color: '#4b5563' }}>
              {d.aup}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}