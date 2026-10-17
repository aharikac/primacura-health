import { createContext, useContext } from 'react';
import { Condition, Diagram, HowTo, Lang } from '../types';
import { conditions } from '../data/conditions';
import { conditionsEs } from '../data/conditions.es';
import { howTos } from '../data/howTo';
import { howTosEs } from '../data/howTo.es';
import { diagrams } from '../data/diagrams';
import { diagramsEs } from '../data/diagrams.es';

// App language: English or Spanish. The guides, How-To cards and diagrams come
// from the backend CSVs (the generated *.es.ts files); everything else the app
// says is here. Keep in sync with the other app's src/lib/i18n.tsx.
const en = {
  slogan: 'The First Care',
  langSwitch: 'Español',
  langSwitchLabel: 'Cambiar a español',
  home: 'Home',
  back: 'Back',
  backToHome: 'Back to home',
  backToPrevious: 'Back to the previous question',
  backTo: 'Back to {x}',
  // Home
  describeLabel: 'Describe the emergency',
  heading1: "Describe what's",
  heading2: 'happening.',
  speakLabel: 'Or speak using microphone',
  microphone: 'Microphone',
  processing: 'Processing…',
  processingAria: 'Processing audio description',
  speak: 'Speak',
  speakAria: 'Start talking to describe the situation',
  stop: 'Stop',
  stopAria: 'Stop talking and process the description of the situation',
  pickGuide: 'Pick a First-Aid Guide',
  homeNote: "Step-by-step first aid for when medical help isn't nearby.",
  call911: 'Call 911',
  emergencyDial: 'Emergency? Dial 911',
  hideLocation: 'Hide my location',
  showLocation911: 'Show my location for 911',
  finding: 'Finding…',
  myLocation: 'My location',
  more: 'More',
  about: 'About',
  disclaimer: 'Disclaimer',
  contact: 'Contact',
  // Search
  typeSituation: 'Type the situation in detail...',
  getHelp: 'Get help',
  searchConditions: 'Search conditions...',
  searchConditionsAria: 'Search conditions',
  // Clarification
  clarifyTitle: 'Please clarify the situation',
  checkScene: 'CHECK SCENE FOR SAFETY.',
  lifeThreatening: "If it's life-threatening, call 911 immediately.",
  linkAgeMessage: '**Who needs help?** Tap their age to see the right steps.',
  engineDown: 'The local first-aid engine did not respond. Call 911 now for a life-threatening emergency, then try again when the engine is ready.',
  // Guides
  guidesTitle: 'First-Aid Guides',
  guidesPick: 'Select a condition to view its protocol.',
  howToPick: 'Learn each skill, move by move.',
  guideType: 'Guide type',
  emergencies: 'Emergencies',
  howTo: 'How-To',
  noGuides1: 'NO GUIDES',
  noGuides2: 'FOUND',
  tryAgain1: 'Try a different search',
  tryAgain2: 'term.',
  guides: 'Guides',
  options: 'Options',
  // Steps
  stepN: 'Step {n}',
  stepNofM: 'Step {n} of {m}',
  lifeThreateningCall: 'Life-threatening? Call 911',
  tapToEnlarge: 'Tap to enlarge',
  tapToEnlargeAria: '{x} Tap to enlarge.',
  previousStep: 'Previous step',
  stopReadingAloud: 'Stop reading aloud',
  readStepsAloud: 'Read steps aloud',
  stopReading: 'Stop reading',
  readAloud: 'Read aloud',
  done: 'Done',
  next: 'Next',
  yourLocation: 'Your location',
  yourLocation911: 'Your location for 911',
  close: 'Close',
  picture: 'Picture',
  closePicture: 'Close picture',
  showMeHow: 'Show me how',
  // How-To
  stopListening: 'Stop listening',
  listenSteps: 'Listen to the steps',
  whoFor: 'Who is it for',
  watchOut: 'Watch out',
  callFirst: 'Life-threatening? Call 911 first.',
  moreBelow: 'More below',
  scrollMore: 'Scroll down for more',
  // CPR rhythm
  tapStart: 'Tap Start and push with the beat',
  giveBreaths: 'Give 2 breaths · {s}s',
  getReady: 'Get ready to give breaths',
  pushHardFast: 'Push hard and fast',
  ofThirtyPush: '{n} of 30 · push',
  pushN: 'Push · {n}',
  cprGuide: 'CPR rhythm guide',
  pushBeat: 'Push to the beat',
  pushesMinute: '110 pushes a minute',
  handsOnly: 'Hands-only',
  stopBeat: 'Stop the beat',
  startBeat: 'Start the beat',
  start: 'Start',
  startCaps: 'START',
  stopCaps: 'STOP',
  cprGuideTitle: 'CPR rhythm guide · 110 a minute',
  mode: 'Mode',
  breaths302: '30 : 2 breaths',
  ready: 'Ready',
  breaths: 'Breaths',
  of30: 'of 30',
  push: 'Push',
  beepOff: 'Turn beep off',
  beepOn: 'Turn beep on',
  // Location
  locNoBrowser: 'This browser cannot share your location. Tell 911 a nearby address or landmark.',
  locDenied: 'Location is turned off for this site. Allow it in your browser settings, or tell 911 a nearby address or landmark.',
  locFailed: 'Could not find your location. Try again outside or near a window, or tell 911 a nearby address or landmark.',
  copied: 'Copied',
  copy: 'Copy',
  map: 'Map',
  update: 'Update',
  updateLocation: 'Update location',
  locNote: 'Read these numbers to the 911 dispatcher. Your location stays on this device.',
  findingLocation: 'Finding your location…',
  locOffApp: 'Location is off for PrimaCura. Turn it on in Settings, or tell 911 a nearby address or landmark.',
  locFailedApp: 'Could not find your location. Try again near a window, or tell 911 a nearby address or landmark.',
  locNoteApp: 'Read these numbers to the 911 dispatcher. Your location stays on this phone.',
  share: 'Share',
  myLocationShare: 'My location: {x}',
  // Emergency call sheet
  confirmCall: 'CONFIRM EMERGENCY CALL',
  confirmCallText1: 'This will dial ',
  confirmCallText2: ' from your phone. Only use in a real emergency.',
  yesCall: 'YES, CALL 911',
  cancel: 'Cancel',
  // About
  aboutTitle: 'About PrimaCura',
  aboutSub: 'The First Care mission and developer.',
  mission: 'The Mission',
  missionText: 'When a medical emergency strikes, panic often follows. PrimaCura Health was built to bridge the critical gap between an incident occurring and professional medical help arriving. By providing clear, step-by-step, voice-enabled first-aid protocols, this platform ensures that anyone can take immediate, life-saving action when seconds matter most.',
  featSteps: 'Step-by-step guides',
  featSpeak: 'Speak or type',
  featRead: 'Reads steps aloud',
  featLocation: 'Location for 911',
  featSpanish: 'English and Spanish',
  developer: 'The Developer',
  devRole: 'Designer & developer',
  devText1: 'PrimaCura Health was designed and engineered by ',
  devText2: ", a 14-year-old 9th grader with a passion for using technology to make a tangible difference in people's lives.",
  devQuote: "I built this app hoping it will help someone in a moment of desperate need. Even if PrimaCura helps just one single person manage an emergency safely, I've achieved my goal.",
  // Contact
  contactTitle: 'Contact Us',
  contactSub: 'Get in touch with the team.',
  name: 'Name',
  yourName: 'Your Name',
  emailAddress: 'Email Address',
  message: 'Message',
  howHelp: 'How can we help you?',
  sending: 'Sending...',
  sendMessage: 'Send Message',
  reachUs: 'Reach us directly at:',
  words: 'words',
  sentOk: 'Thank you! Your message has been sent successfully.',
  sendFailed: 'Failed to send message. Please try again or email us directly.',
  bindingAgreement: 'BINDING AGREEMENT:',
  // Disclaimer
  disclaimerTitle: 'Medical Disclaimer',
  disclaimerSub: 'Important safety information.',
  describeSituation: 'Describe the situation',
  useIfLifeThreatening: "Use if it's life-threatening",
  typeClarification: 'Type clarification in\ndetail...',
  speechFailed: "I couldn't understand the recording on this device. Please type what is happening instead.\n\nIf it is life-threatening, call 911 now.",
  micOff: 'Microphone access is off. Please type what is happening, or allow microphone access in Settings.',
  engineDownApp: 'The first-aid engine did not respond. Call 911 now for a life-threatening emergency, then try again, or browse the guides from the home screen.',
};
type Strings = typeof en;

const es: Strings = {
  slogan: 'Los primeros cuidados',
  langSwitch: 'English',
  langSwitchLabel: 'Switch to English',
  home: 'Inicio',
  back: 'Atrás',
  backToHome: 'Volver al inicio',
  backToPrevious: 'Volver a la pregunta anterior',
  backTo: 'Volver a {x}',
  describeLabel: 'Describe la emergencia',
  heading1: 'Describe lo que',
  heading2: 'está pasando.',
  speakLabel: 'O habla con el micrófono',
  microphone: 'Micrófono',
  processing: 'Procesando…',
  processingAria: 'Procesando la descripción de audio',
  speak: 'Hablar',
  speakAria: 'Empieza a hablar para describir la situación',
  stop: 'Parar',
  stopAria: 'Deja de hablar y procesa la descripción de la situación',
  pickGuide: 'Elige una guía de primeros auxilios',
  homeNote: 'Primeros auxilios paso a paso para cuando la ayuda médica no está cerca.',
  call911: 'Llamar al 911',
  emergencyDial: 'Emergencia: 911',
  hideLocation: 'Ocultar mi ubicación',
  showLocation911: 'Mostrar mi ubicación para el 911',
  finding: 'Buscando…',
  myLocation: 'Mi ubicación',
  more: 'Más',
  about: 'Acerca de',
  disclaimer: 'Aviso legal',
  contact: 'Contacto',
  typeSituation: 'Escribe la situación con detalle...',
  getHelp: 'Pedir ayuda',
  searchConditions: 'Buscar emergencias...',
  searchConditionsAria: 'Buscar emergencias',
  clarifyTitle: 'Aclara la situación',
  checkScene: 'ASEGÚRATE DE QUE EL LUGAR ES SEGURO.',
  lifeThreatening: 'Si su vida corre peligro, llama al 911 de inmediato.',
  linkAgeMessage: '**¿Quién necesita ayuda?** Toca su edad para ver los pasos correctos.',
  engineDown: 'El servicio de primeros auxilios no respondió. Si su vida corre peligro, llama al 911 ahora y vuelve a intentarlo cuando el servicio esté listo.',
  guidesTitle: 'Guías de primeros auxilios',
  guidesPick: 'Elige una emergencia para ver sus pasos.',
  howToPick: 'Aprende cada técnica, paso a paso.',
  guideType: 'Tipo de guía',
  emergencies: 'Emergencias',
  howTo: 'Cómo hacerlo',
  noGuides1: 'NO SE ENCONTRARON',
  noGuides2: 'GUÍAS',
  tryAgain1: 'Prueba con otra',
  tryAgain2: 'palabra.',
  guides: 'Guías',
  options: 'Opciones',
  stepN: 'Paso {n}',
  stepNofM: 'Paso {n} de {m}',
  lifeThreateningCall: '¿Su vida corre peligro? Llama al 911',
  tapToEnlarge: 'Toca para ampliar',
  tapToEnlargeAria: '{x} Toca para ampliar.',
  previousStep: 'Paso anterior',
  stopReadingAloud: 'Dejar de leer en voz alta',
  readStepsAloud: 'Leer los pasos en voz alta',
  stopReading: 'Dejar de leer',
  readAloud: 'Leer en voz alta',
  done: 'Listo',
  next: 'Siguiente',
  yourLocation: 'Tu ubicación',
  yourLocation911: 'Tu ubicación para el 911',
  close: 'Cerrar',
  picture: 'Imagen',
  closePicture: 'Cerrar la imagen',
  showMeHow: 'Muéstrame cómo',
  stopListening: 'Dejar de escuchar',
  listenSteps: 'Escuchar los pasos',
  whoFor: 'Para quién es',
  watchOut: 'Cuidado',
  callFirst: '¿Su vida corre peligro? Llama primero al 911.',
  moreBelow: 'Hay más abajo',
  scrollMore: 'Desplázate hacia abajo para ver más',
  tapStart: 'Toca Iniciar y presiona al ritmo',
  giveBreaths: 'Da 2 respiraciones · {s} s',
  getReady: 'Prepárate para dar respiraciones',
  pushHardFast: 'Presiona fuerte y rápido',
  ofThirtyPush: '{n} de 30 · presiona',
  pushN: 'Presiona · {n}',
  cprGuide: 'Guía de ritmo de RCP',
  pushBeat: 'Presiona al ritmo',
  pushesMinute: '110 compresiones por minuto',
  handsOnly: 'Solo manos',
  stopBeat: 'Parar el ritmo',
  startBeat: 'Iniciar el ritmo',
  start: 'Iniciar',
  startCaps: 'INICIAR',
  stopCaps: 'PARAR',
  cprGuideTitle: 'Guía de ritmo de RCP · 110 por minuto',
  mode: 'Modo',
  breaths302: '30 : 2 respiraciones',
  ready: 'Listo',
  breaths: 'Respira',
  of30: 'de 30',
  push: 'Presiona',
  beepOff: 'Quitar el pitido',
  beepOn: 'Poner el pitido',
  locNoBrowser: 'Este navegador no puede compartir tu ubicación. Dile al 911 una dirección o un lugar conocido cercano.',
  locDenied: 'La ubicación está desactivada para este sitio. Actívala en la configuración del navegador, o dile al 911 una dirección o un lugar conocido cercano.',
  locFailed: 'No se pudo encontrar tu ubicación. Inténtalo afuera o cerca de una ventana, o dile al 911 una dirección o un lugar conocido cercano.',
  copied: 'Copiado',
  copy: 'Copiar',
  map: 'Mapa',
  update: 'Actualizar',
  updateLocation: 'Actualizar la ubicación',
  locNote: 'Lee estos números al operador del 911. Tu ubicación se queda en este dispositivo.',
  findingLocation: 'Buscando tu ubicación…',
  locOffApp: 'La ubicación está desactivada para PrimaCura. Actívala en Configuración, o dile al 911 una dirección o un lugar conocido cercano.',
  locFailedApp: 'No se pudo encontrar tu ubicación. Inténtalo cerca de una ventana, o dile al 911 una dirección o un lugar conocido cercano.',
  locNoteApp: 'Lee estos números al operador del 911. Tu ubicación se queda en este teléfono.',
  share: 'Compartir',
  myLocationShare: 'Mi ubicación: {x}',
  confirmCall: 'CONFIRMA LA LLAMADA DE EMERGENCIA',
  confirmCallText1: 'Se marcará el ',
  confirmCallText2: ' desde tu teléfono. Úsalo solo en una emergencia real.',
  yesCall: 'SÍ, LLAMAR AL 911',
  cancel: 'Cancelar',
  aboutTitle: 'Acerca de PrimaCura',
  aboutSub: 'La misión de PrimaCura y su desarrolladora.',
  mission: 'La misión',
  missionText: 'Cuando ocurre una emergencia médica, muchas veces llega el pánico. PrimaCura Health se creó para cubrir el momento crítico entre el incidente y la llegada de la ayuda médica profesional. Con pasos de primeros auxilios claros, uno por uno y con voz, cualquier persona puede actuar de inmediato para salvar una vida cuando cada segundo cuenta.',
  featSteps: 'Guías paso a paso',
  featSpeak: 'Habla o escribe',
  featRead: 'Lee los pasos en voz alta',
  featLocation: 'Ubicación para el 911',
  featSpanish: 'Inglés y español',
  developer: 'La desarrolladora',
  devRole: 'Diseñadora y desarrolladora',
  devText1: 'PrimaCura Health fue diseñada y desarrollada por ',
  devText2: ', una estudiante de 9.º grado de 14 años a quien le apasiona usar la tecnología para mejorar de verdad la vida de las personas.',
  devQuote: 'Creé esta app con la esperanza de que ayude a alguien en un momento de verdadera necesidad. Si PrimaCura ayuda aunque sea a una sola persona a manejar una emergencia de forma segura, habré cumplido mi meta.',
  contactTitle: 'Contáctanos',
  contactSub: 'Escríbele al equipo.',
  name: 'Nombre',
  yourName: 'Tu nombre',
  emailAddress: 'Correo electrónico',
  message: 'Mensaje',
  howHelp: '¿Cómo te podemos ayudar?',
  sending: 'Enviando...',
  sendMessage: 'Enviar mensaje',
  reachUs: 'Escríbenos directamente a:',
  words: 'palabras',
  sentOk: '¡Gracias! Tu mensaje se envió correctamente.',
  sendFailed: 'No se pudo enviar el mensaje. Inténtalo de nuevo o escríbenos directamente.',
  bindingAgreement: 'ACUERDO VINCULANTE:',
  disclaimerTitle: 'Aviso médico',
  disclaimerSub: 'Información de seguridad importante.',
  describeSituation: 'Describe la situación',
  useIfLifeThreatening: 'Úsalo si su vida corre peligro',
  typeClarification: 'Escribe la aclaración\ncon detalle...',
  speechFailed: 'No pude entender la grabación en este dispositivo. Mejor escribe lo que está pasando.\n\nSi su vida corre peligro, llama al 911 ahora.',
  micOff: 'El acceso al micrófono está desactivado. Escribe lo que está pasando, o permite el micrófono en Configuración.',
  engineDownApp: 'El servicio de primeros auxilios no respondió. Si su vida corre peligro, llama al 911 ahora; luego vuelve a intentarlo o abre las guías desde el inicio.',
};

export type StringKey = keyof Strings;
const STRINGS: Record<Lang, Strings> = { en, es };

// The backend's answer values stay English (the apps send the value back); these
// are what the buttons show. The age answers double as the How-To age question.
export const AGE_OPTIONS = ['Adult', 'Child (1 year to puberty)', 'Infant (under 1 year)'];
const AGE_LABELS: Record<Lang, string[]> = {
  en: AGE_OPTIONS,
  es: ['Adulto', 'Niño (de 1 año a la pubertad)', 'Bebé (menor de 1 año)'],
};
const AGE_HINTS: Record<Lang, string[]> = {
  en: ['Teen or grown-up', 'Toddler to pre-teen', 'Baby under 1 year old'],
  es: ['Adolescente o adulto', 'De niño pequeño a preadolescente', 'Bebé menor de 1 año'],
};
// How-To card ages (Adult, Child, Infant, Adult/Child, Any).
const CARD_AGE_ES: Record<string, string> = {
  Adult: 'Adulto', Child: 'Niño', Infant: 'Bebé', 'Adult/Child': 'Adulto/Niño', Any: 'Todas',
};

export function initialLang(): Lang {
  try {
    const saved = window.localStorage.getItem('primacura-lang');
    if (saved === 'en' || saved === 'es') return saved;
  } catch { /* storage blocked: use the browser language */ }
  return typeof navigator !== 'undefined' && /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
}

export function saveLang(lang: Lang) {
  try { window.localStorage.setItem('primacura-lang', lang); } catch { /* not saved: fine */ }
}

export const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({
  lang: 'en',
  setLang: () => undefined,
});

export type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  conditions: Condition[];
  howTos: HowTo[];
  diagrams: Record<string, Diagram>;
  ageLabels: string[];
  ageHints: string[];
  cardAge: (age: string) => string;
};

export function i18nFor(lang: Lang, setLang: (lang: Lang) => void = () => undefined): I18n {
  const strings = STRINGS[lang];
  return {
    lang,
    setLang,
    t: (key, vars) => strings[key].replace(/\{(\w+)\}/g, (m, v: string) => (vars && v in vars ? String(vars[v]) : m)),
    conditions: lang === 'es' ? conditionsEs : conditions,
    howTos: lang === 'es' ? howTosEs : howTos,
    // Diagrams without a Spanish version fall back to English.
    diagrams: lang === 'es' ? { ...diagrams, ...diagramsEs } : diagrams,
    ageLabels: AGE_LABELS[lang],
    ageHints: AGE_HINTS[lang],
    cardAge: (age) => (lang === 'es' ? CARD_AGE_ES[age] ?? age : age),
  };
}

export function useI18n(): I18n {
  const { lang, setLang } = useContext(LangContext);
  return i18nFor(lang, setLang);
}
