import { AiDataSource, AiStreamMeta, AiStreamMetaPayload, AiToolCall } from '../types/ai';

export const normalizeAiDataSources = (
  dataSources?: Array<{ title?: string; url?: string; content?: string }> | null,
): AiDataSource[] => (dataSources || []).map((source) => ({
  title: source.title || 'Unknown',
  url: source.url,
  content: source.content,
}));

export const normalizeAiToolCalls = (
  toolCalls?: Array<{ tool_name?: string; toolName?: string; parameters?: Record<string, unknown> }> | null,
): AiToolCall[] => (toolCalls || []).map((toolCall) => ({
  toolName: toolCall.tool_name || toolCall.toolName || 'unknown',
  parameters: toolCall.parameters || {},
}));

export const normalizeAiStreamMeta = (
  payload: AiStreamMetaPayload,
): AiStreamMeta => ({
  verified: payload.verified ?? false,
  cached: payload.cached ?? false,
  intent: payload.intent,
  strategy: payload.strategy,
  plannerMode: payload.planner_mode,
  plannerCacheHit: payload.planner_cache_hit,
  toolExecutionMode: payload.tool_execution_mode,
  fallbackReason: payload.fallback_reason,
  perf: payload.perf,
  dataSources: normalizeAiDataSources(payload.data_sources),
  toolCalls: normalizeAiToolCalls(payload.tool_calls),
  finish_reason: payload.finish_reason,
  cancelled: payload.cancelled,
  error: payload.error,
});
