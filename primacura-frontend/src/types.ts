export type Screen = 'home' | 'guides' | 'protocol' | 'clarification' | 'disclaimer' | 'about';

export type Condition = {
  title: string;
  description: string;
  steps: string[];
};

export type ChatResponse = {
  status: 'success' | 'clarification_needed' | 'age_clarification_needed' | 'unable_to_identify';
  title: string;
  steps: string[];
  message: string;
  distance: number;
  session_id: string;
};