export interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  // Metadata for enhanced UI
  verified?: boolean;
  citations?: Array<{
    title: string;
    url?: string;
    content?: string;
  }>;
  toolCalls?: Array<{
    toolName: string;
    parameters: Record<string, unknown>;
  }>;
  intent?: string;
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
export interface ChatMeta {
  verified: boolean;
  dataSources: Array<{
    title: string;
    url?: string;
    content?: string;
  }>;
  toolCalls: Array<{
    toolName: string;
    parameters: Record<string, unknown>;
  }>;
  style: string;
}