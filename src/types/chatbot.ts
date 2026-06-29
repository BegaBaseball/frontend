import { AiDataSource, AiStreamMeta, AiToolCall } from './ai';

export type ChatMessageStatus = 'COMPLETED' | 'CANCELLED' | 'ERROR';

export interface Message {
  id?: string;
  serverId?: number;
  sessionId?: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  status?: ChatMessageStatus;
  isError?: boolean;
  cancelled?: boolean;
  isSystem?: boolean;
  favorite?: boolean;
  // Metadata for enhanced UI
  verified?: boolean;
  cached?: boolean;
  citations?: AiDataSource[];
  toolCalls?: AiToolCall[];
  intent?: string;
  strategy?: string;
  plannerMode?: string;
  plannerCacheHit?: boolean;
  toolExecutionMode?: string;
  fallbackReason?: string;
  finishReason?: string;
  errorCode?: string;
  metadata?: Record<string, unknown> | null;
}

export interface ChatRequest {
  question: string;
  history: Array<{ role: string; content: string }> | null;
}

export interface ChatQueueStatus {
  state: 'queued' | 'processing';
  queuePosition: number;
  estimatedWaitTime: number;
  rpmLimit: number;
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

export interface ChatSessionSummary {
  sessionId: number;
  title: string;
  messageCount: number;
  latestMessagePreview?: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface StoredChatMessage {
  messageId: number;
  sessionId: number;
  role: 'USER' | 'ASSISTANT';
  status: ChatMessageStatus;
  content: string;
  verified?: boolean | null;
  cached?: boolean | null;
  intent?: string | null;
  strategy?: string | null;
  finishReason?: string | null;
  cancelled: boolean;
  errorCode?: string | null;
  plannerMode?: string | null;
  plannerCacheHit?: boolean | null;
  toolExecutionMode?: string | null;
  fallbackReason?: string | null;
  metadata?: Record<string, unknown> | null;
  citations?: Array<{ title?: string; url?: string; content?: string }> | null;
  toolCalls?: Array<{ tool_name?: string; toolName?: string; parameters?: Record<string, unknown> }> | null;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatFavoriteItem {
  messageId: number;
  sessionId: number;
  sessionTitle: string;
  content: string;
  prompt?: string | null;
  favoritedAt: string;
  messageCreatedAt: string;
}

// Metadata from SSE 'meta' event
export interface ChatMeta extends AiStreamMeta {
  style: string;
}
