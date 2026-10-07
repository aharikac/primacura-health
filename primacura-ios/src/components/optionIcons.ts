import {
  Baby,
  Bone,
  Brain,
  CircleHelp,
  Droplet,
  Droplets,
  Eye,
  FlaskConical,
  Flame,
  HeartCrack,
  HeartPulse,
  MessageSquareText,
  PersonStanding,
  Pill,
  Syringe,
  User,
  Utensils,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

// One icon per option the backend can offer. Keep in sync with the web app's
// primacura-frontend/src/components/optionIcons.ts and the labels in pchTriage / pchCore.
const ICONS: Record<string, LucideIcon> = {
  'Cardiac Arrest': HeartPulse,
  'Cardiac Arrest (Drowning)': Waves,
  'Heart Attack': HeartCrack,
  Choking: Utensils,
  Anaphylaxis: Syringe,
  'Diabetic Emergency': Droplet,
  Stroke: Brain,
  'Opioid Overdose': Pill,
  'Severe Bleeding': Droplets,
  'Burns (Chemical to Eye)': Eye,
  'Burns (Thermal)': Flame,
  'Poisoning / Ingestion': FlaskConical,
  Seizures: Zap,
  'Head, Neck, or Spinal Injury': Bone,
  'None of these': MessageSquareText,
  // Safety question answers
  'Not responding and not breathing (or only gasping)': HeartPulse,
  'Not responding, but breathing': Wind,
  'Awake and responding': User,
  // Age question answers
  Adult: User,
  'Child (1 year to puberty)': PersonStanding,
  'Infant (under 1 year)': Baby,
};

export function optionIcon(label: string): LucideIcon {
  return ICONS[label] ?? CircleHelp;
}
