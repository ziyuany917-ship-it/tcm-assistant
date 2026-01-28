
export interface UserProfile {
  name: string;
  age: string;
  gender: string;
  constitution: string; // e.g., "Phlegm-Dampness", "Qi-Deficiency"
  history: string; // Medical history
  allergies: string;
  goals?: string; // Long-term health goals (e.g. "Lose weight", "Sleep better")
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  image?: string; 
}

export interface DailyLog {
  id: string;
  date: string;
  content: string;
  // Added 'diagnosis' and 'meditation' per PRD requirements
  type: 'general' | 'emotion' | 'diet' | 'work' | 'diagnosis' | 'meditation';
  timestamp: number;
  image?: string; // Added to support images in logs
  warning?: string; // Health risk warning from AI
}

// New structure for the Editable Done List
export interface DoneItem {
  id: string;
  date: string;
  activity: string;
  hours: number;
  completed: boolean;
}

export interface DailyInsight {
  date: string;
  healthAdvice: string;
}

export interface Habit {
  id: string;
  name: string;
  // 36 cycles in a year. 
  // We track completion map: cycleIndex (0-35) -> completedCount (0-10)
  history: Record<number, boolean[]>; 
}

export enum View {
  LANDING = 'LANDING',
  MIND_BODY_DASHBOARD = 'MIND_BODY_DASHBOARD', 
  CONSULTATION = 'CONSULTATION', // New separate view
  GROWTH = 'GROWTH',
  PROFILE = 'PROFILE'
}

export interface GeminiResponse {
  text: string;
  error?: string;
}
