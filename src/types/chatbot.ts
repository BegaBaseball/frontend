export interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatRequest {
  question: string;
  history: Array<{ role: string; content: string }> | null;
}

export interface EdgeFunctionRequest {
  query: string;
  history: Array<{ role: string; content: string }> | null;
  style: string;
}

export interface ChatResponse {
  answer?: string;
  error?: string;
}

export interface VoiceResponse {
  text?: string;
  error?: string;
}