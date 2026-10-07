export type Screen = 'home' | 'guides' | 'protocol' | 'clarification' | 'disclaimer' | 'about' | 'contact';

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
  confidence: number;
  // Tappable answers for clarification questions. Sending one back verbatim
  // as the next query always resolves the question.
  options?: string[];
  // One line per option, same order (empty for age and breathing answers).
  option_hints?: string[];
  session_id: string;
};