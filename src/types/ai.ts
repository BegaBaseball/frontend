export interface AiDataSource {
  title: string;
  url?: string;
  content?: string;
}

export interface AiToolCall {
  toolName: string;
  parameters: Record<string, unknown>;
}

export interface AiStreamMetaPayload {
  verified?: boolean;
  cached?: boolean;
  intent?: string;
  strategy?: string;
  style?: string;
  data_sources?: Array<{ title?: string; url?: string; content?: string }>;
  tool_calls?: Array<{ tool_name?: string; parameters?: Record<string, unknown> }>;
  finish_reason?: string;
  cancelled?: boolean;
  error?: string;
}

export interface AiStreamMeta {
  verified: boolean;
  cached?: boolean;
  intent?: string;
  strategy?: string;
  dataSources: AiDataSource[];
  toolCalls: AiToolCall[];
  finish_reason?: string;
  cancelled?: boolean;
  error?: string;
}
