import { AiDataSource, AiStreamMeta, AiStreamMetaPayload, AiToolCall } from '../types/ai';

export const normalizeAiDataSources = (
  dataSources?: AiStreamMetaPayload['data_sources'],
): AiDataSource[] => (dataSources || []).map((source) => ({
  title: source.title || 'Unknown',
  url: source.url,
  content: source.content,
}));

export const normalizeAiToolCalls = (
  toolCalls?: AiStreamMetaPayload['tool_calls'],
): AiToolCall[] => (toolCalls || []).map((toolCall) => ({
  toolName: toolCall.tool_name || 'unknown',
  parameters: toolCall.parameters || {},
}));

export const normalizeAiStreamMeta = (
  payload: AiStreamMetaPayload,
): AiStreamMeta => ({
  verified: payload.verified ?? false,
  cached: payload.cached ?? false,
  intent: payload.intent,
  strategy: payload.strategy,
  dataSources: normalizeAiDataSources(payload.data_sources),
  toolCalls: normalizeAiToolCalls(payload.tool_calls),
  finish_reason: payload.finish_reason,
  cancelled: payload.cancelled,
  error: payload.error,
});
