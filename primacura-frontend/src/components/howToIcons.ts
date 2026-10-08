import {
  Bandage,
  Bed,
  BookOpen,
  Candy,
  Droplets,
  Hand,
  HeartPulse,
  Pill,
  SprayCan,
  Syringe,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';

// One icon per How-To card id. Keep in sync with the iOS app's howToIcons.ts.
const ICONS: Record<string, LucideIcon> = {
  'cpr-adult': HeartPulse,
  'cpr-child': HeartPulse,
  'cpr-infant': HeartPulse,
  'hands-only-cpr': Hand,
  aed: Zap,
  'choking-adult-child': Utensils,
  'chest-thrusts': Utensils,
  'choking-infant': Utensils,
  'recovery-position': Bed,
  'recovery-position-infant': Bed,
  'direct-pressure': Droplets,
  tourniquet: Bandage,
  epipen: Syringe,
  naloxone: SprayCan,
  aspirin: Pill,
  sugar: Candy,
  'cool-burn': Droplets,
};

export const howToIcon = (id: string): LucideIcon => ICONS[id] ?? BookOpen;
