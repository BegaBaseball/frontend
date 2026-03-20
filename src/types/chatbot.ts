import { AiDataSource, AiStreamMeta, AiToolCall } from './ai';

export interface Message {
  id?: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isError?: boolean;
  cancelled?: boolean;
  isSystem?: boolean;
  // Metadata for enhanced UI
  verified?: boolean;
  cached?: boolean;
  citations?: AiDataSource[];
  toolCalls?: AiToolCall[];
  intent?: string;
  strategy?: string;
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

// Metadata from SSE 'meta' event
export interface ChatMeta extends AiStreamMeta {
  style: string;
}
