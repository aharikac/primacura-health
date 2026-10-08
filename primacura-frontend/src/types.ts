export type Screen = 'home' | 'guides' | 'protocol' | 'howto' | 'clarification' | 'disclaimer' | 'about' | 'contact';

export type Condition = {
  title: string;
  description: string;
  steps: string[];
  // Same length as steps: the short action each step starts with (shown in big type).
  actions?: (string | null)[];
  // Same length as steps: key numbers shown as pills.
  facts?: string[][];
  // Same length as steps: the How-To card to link from each step ("Show me how"), or null.
  howTo?: (string | null)[];
  // Same length as steps: diagram id to show with each step, or null.
  diagram?: (string | null)[];
  // Same length as steps: true where the CPR rhythm guide should appear.
  rhythm?: boolean[];
};

// A step diagram (generated from primacura-backend/data/diagrams/*.svg).
export type Diagram = { alt: string; aspect: number; svg: string };

export type HowToStep = { lead: string; text: string; diagram?: string };

// A How-To card (generated from primacura-backend/data/how-to-guides.csv).
export type HowTo = {
  id: string;
  title: string;
  age: string;      // Adult, Child, Infant, Adult/Child or Any
  group: string;    // cards in the same group (e.g. cpr) are shown as age tabs
  askAge: boolean;  // "Show me how" asks who needs help first, then opens the group's card for that age
  rhythm: '' | 'cpr' | 'hands-only';  // show the CPR rhythm guide (30:2 or hands-only)
  summary: string;
  keyFacts: string[];
  steps: HowToStep[];
  watchOut: string[];
};

export type ChatResponse = {
  status: 'success' | 'clarification_needed' | 'age_clarification_needed' | 'unable_to_identify';
  title: string;
  steps: string[];
  message: string;
  confidence: number;
  options?: string[];
  // One line per option, same order (empty for age and breathing answers).
  option_hints?: string[];
  // Same length as steps: How-To card id per step, or null (older backends omit it).
  step_howto?: (string | null)[];
  step_diagram?: (string | null)[];
  step_rhythm?: boolean[];
  step_action?: (string | null)[];
  step_facts?: string[][];
  session_id: string;
};