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
  planner_mode?: string;
  planner_cache_hit?: boolean;
  tool_execution_mode?: string;
  fallback_reason?: string;
  perf?: Record<string, unknown>;
  model_usage?: unknown[];
  model_usage_complete?: boolean;
  data_sources?: Array<{ title?: string; url?: string; content?: string }>;
  tool_calls?: Array<{ tool_name?: string; toolName?: string; parameters?: Record<string, unknown> }>;
  finish_reason?: string;
  cancelled?: boolean;
  error?: string;
}

export interface AiStreamMeta {
  verified: boolean;
  cached?: boolean;
  intent?: string;
  strategy?: string;
  plannerMode?: string;
  plannerCacheHit?: boolean;
  toolExecutionMode?: string;
  fallbackReason?: string;
  perf?: Record<string, unknown>;
  modelUsage?: unknown[];
  modelUsageComplete?: boolean;
  dataSources: AiDataSource[];
  toolCalls: AiToolCall[];
  finish_reason?: string;
  cancelled?: boolean;
  error?: string;
}
