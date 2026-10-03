export type Screen = 'home' | 'guides' | 'protocol' | 'clarification' | 'disclaimer';

export interface Condition {
  title: string;
  description: string;
  steps: string[];
}

export interface ChatResponse {
  status: string;
  title: string;
  steps?: string[];
  message: string;
  distance: number;
  session_id: string;
}