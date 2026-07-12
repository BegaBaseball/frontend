import type { components } from './generated/aiStreamV2';
import type { SseEvent } from './sse';

export type AiStreamV2Event = components['schemas']['AiStreamV2Event'];
export type AiEventVersion = '1' | '2';

const APPROVED_TYPES = new Set<AiStreamV2Event['type']>([
  'chat.status',
  'chat.queue',
  'chat.message.delta',
  'chat.meta',
  'coach.status',
  'coach.preview.chunk',
  'coach.preview.reset',
  'coach.message.delta',
  'coach.meta',
  'stream.error',
  'stream.done',
]);

export class AiStreamContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiStreamContractError';
  }
}

const fail = (message: string): never => {
  throw new AiStreamContractError(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const requireRecord = (value: unknown, path: string): Record<string, unknown> => (
  isRecord(value) ? value : fail(`${path} must be an object`)
);

const requireString = (value: unknown, path: string, allowEmpty = false): string => {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    return fail(`${path} must be a${allowEmpty ? '' : ' non-empty'} string`);
  }
  return value;
};

const requireNumber = (value: unknown, path: string, minimum?: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(`${path} must be a finite number`);
  }
  if (minimum !== undefined && value < minimum) {
    return fail(`${path} must be at least ${minimum}`);
  }
  return value;
};

const requireBoolean = (value: unknown, path: string): boolean => (
  typeof value === 'boolean' ? value : fail(`${path} must be a boolean`)
);

const rejectUnknownKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
) => {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    fail(`${path} contains unknown field: ${unknown[0]}`);
  }
};

const validateOptionalString = (value: unknown, path: string) => {
  if (value !== undefined && value !== null) requireString(value, path, true);
};

const validateOptionalBoolean = (value: unknown, path: string) => {
  if (value !== undefined && value !== null) requireBoolean(value, path);
};

const validateStringArray = (value: unknown, path: string) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    fail(`${path} must be a string array`);
  }
};

const validateToolCalls = (value: unknown, path: string) => {
  if (!Array.isArray(value)) return fail(`${path} must be an array`);
  const toolCalls: unknown[] = value;
  toolCalls.forEach((item: unknown, index: number) => {
    const toolCall = requireRecord(item, `${path}[${index}]`);
    rejectUnknownKeys(toolCall, ['tool_name', 'parameters'], `${path}[${index}]`);
    requireString(toolCall.tool_name, `${path}[${index}].tool_name`);
    if (toolCall.parameters !== undefined) requireRecord(toolCall.parameters, `${path}[${index}].parameters`);
  });
};

const validateDataSources = (value: unknown, path: string) => {
  if (!Array.isArray(value)) return fail(`${path} must be an array`);
  const dataSources: unknown[] = value;
  dataSources.forEach((item: unknown, index: number) => {
    const source = requireRecord(item, `${path}[${index}]`);
    rejectUnknownKeys(source, ['title', 'url', 'content'], `${path}[${index}]`);
    validateOptionalString(source.title, `${path}[${index}].title`);
    validateOptionalString(source.url, `${path}[${index}].url`);
    validateOptionalString(source.content, `${path}[${index}].content`);
  });
};

const CHAT_META_FIELDS = [
  'verified', 'cached', 'semantic_cached', 'intent', 'strategy', 'style',
  'planner_mode', 'planner_cache_hit', 'tool_execution_mode',
  'fallback_triggered', 'fallback_answer_used', 'fallback_reason',
  'grounding_mode', 'source_tier', 'as_of_date', 'finish_reason', 'cancelled',
  'cache_key_prefix', 'cache_similarity', 'error', 'tool_calls', 'tool_results',
  'data_sources', 'answer_sources', 'visualizations', 'perf',
] as const;

const validateChatMeta = (data: Record<string, unknown>) => {
  rejectUnknownKeys(data, CHAT_META_FIELDS, 'data');
  ['verified', 'cached', 'semantic_cached', 'planner_cache_hit', 'fallback_triggered',
    'fallback_answer_used', 'cancelled'].forEach((field) => validateOptionalBoolean(data[field], `data.${field}`));
  ['intent', 'strategy', 'style', 'planner_mode', 'tool_execution_mode', 'fallback_reason',
    'grounding_mode', 'source_tier', 'as_of_date', 'finish_reason', 'cache_key_prefix',
    'error'].forEach((field) => validateOptionalString(data[field], `data.${field}`));
  if (data.cache_similarity !== undefined && data.cache_similarity !== null) {
    requireNumber(data.cache_similarity, 'data.cache_similarity');
  }
  if (data.tool_calls !== undefined) validateToolCalls(data.tool_calls, 'data.tool_calls');
  if (data.data_sources !== undefined) validateDataSources(data.data_sources, 'data.data_sources');
  ['tool_results', 'answer_sources', 'visualizations'].forEach((field) => {
    if (data[field] !== undefined && !Array.isArray(data[field])) fail(`data.${field} must be an array`);
  });
  if (data.perf !== undefined) requireRecord(data.perf, 'data.perf');
};

const validateManualDataRequest = (value: unknown) => {
  const request = requireRecord(value, 'data.manual_data_request');
  rejectUnknownKeys(
    request,
    ['scope', 'missing_items', 'operator_message', 'blocking', 'code'],
    'data.manual_data_request',
  );
  requireString(request.scope, 'data.manual_data_request.scope');
  requireString(request.operator_message, 'data.manual_data_request.operator_message');
  requireBoolean(request.blocking, 'data.manual_data_request.blocking');
  validateOptionalString(request.code, 'data.manual_data_request.code');
  const missingItems = request.missing_items;
  if (!Array.isArray(missingItems)) return fail('data.manual_data_request.missing_items must be an array');
  missingItems.forEach((item: unknown, index: number) => {
    const missing = requireRecord(item, `data.manual_data_request.missing_items[${index}]`);
    rejectUnknownKeys(
      missing,
      ['key', 'label', 'reason', 'expected_format'],
      `data.manual_data_request.missing_items[${index}]`,
    );
    ['key', 'label', 'reason', 'expected_format'].forEach((field) => (
      requireString(missing[field], `data.manual_data_request.missing_items[${index}].${field}`)
    ));
  });
};

const COACH_META_FIELDS = [
  'structured_response', 'tool_calls', 'verified', 'data_sources', 'resolved_focus',
  'request_mode', 'analysis_type', 'focus_signature', 'question_signature',
  'cache_key_version', 'cache_state', 'validation_status', 'in_progress', 'cached',
  'llm_skip_reason', 'focus_section_missing', 'missing_focus_sections',
  'generation_mode', 'data_quality', 'used_evidence', 'grounding_warnings',
  'grounding_reasons', 'supported_fact_count', 'game_status_bucket',
  'manual_data_request', 'win_probability_home',
] as const;

const validateCoachMeta = (data: Record<string, unknown>) => {
  rejectUnknownKeys(data, COACH_META_FIELDS, 'data');
  if ('analysisType' in data || 'llmSkipReason' in data) fail('data must use canonical snake_case aliases');
  ['request_mode', 'analysis_type', 'focus_signature', 'question_signature', 'cache_key_version',
    'cache_state', 'validation_status', 'llm_skip_reason', 'generation_mode', 'data_quality',
    'game_status_bucket'].forEach((field) => validateOptionalString(data[field], `data.${field}`));
  ['verified', 'in_progress', 'cached', 'focus_section_missing'].forEach((field) => (
    validateOptionalBoolean(data[field], `data.${field}`)
  ));
  ['resolved_focus', 'missing_focus_sections', 'used_evidence', 'grounding_warnings',
    'grounding_reasons'].forEach((field) => {
    if (data[field] !== undefined) validateStringArray(data[field], `data.${field}`);
  });
  if (data.tool_calls !== undefined) validateToolCalls(data.tool_calls, 'data.tool_calls');
  if (data.data_sources !== undefined) validateDataSources(data.data_sources, 'data.data_sources');
  if (data.manual_data_request !== undefined && data.manual_data_request !== null) {
    validateManualDataRequest(data.manual_data_request);
  }
  if (data.supported_fact_count !== undefined && data.supported_fact_count !== null) {
    requireNumber(data.supported_fact_count, 'data.supported_fact_count', 0);
  }
  if (data.win_probability_home !== undefined && data.win_probability_home !== null) {
    const probability = requireNumber(data.win_probability_home, 'data.win_probability_home', 0);
    if (probability > 1) fail('data.win_probability_home must be at most 1');
  }
  if (data.structured_response !== undefined && data.structured_response !== null) {
    const structured = requireRecord(data.structured_response, 'data.structured_response');
    if ('analysisType' in structured) fail('data.structured_response must use analysis_type');
  }
};

const validateEventData = (type: AiStreamV2Event['type'], value: unknown) => {
  const data = requireRecord(value, 'data');
  switch (type) {
    case 'chat.status':
      rejectUnknownKeys(data, ['message'], 'data');
      requireString(data.message, 'data.message');
      break;
    case 'chat.queue':
      rejectUnknownKeys(data, ['state', 'queue_position', 'estimated_wait_time', 'rpm_limit'], 'data');
      if (data.state !== 'queued' && data.state !== 'processing') fail('data.state is invalid');
      requireNumber(data.queue_position, 'data.queue_position', 0);
      requireNumber(data.estimated_wait_time, 'data.estimated_wait_time', 0);
      requireNumber(data.rpm_limit, 'data.rpm_limit', 0);
      break;
    case 'chat.message.delta':
    case 'coach.message.delta':
      rejectUnknownKeys(data, ['delta'], 'data');
      requireString(data.delta, 'data.delta');
      break;
    case 'chat.meta':
      validateChatMeta(data);
      break;
    case 'coach.status':
      rejectUnknownKeys(data, ['status'], 'data');
      requireString(data.status, 'data.status');
      break;
    case 'coach.preview.chunk':
      rejectUnknownKeys(data, ['text', 'attempt'], 'data');
      requireString(data.text, 'data.text', true);
      requireNumber(data.attempt, 'data.attempt', 1);
      break;
    case 'coach.preview.reset':
      rejectUnknownKeys(data, ['attempt'], 'data');
      requireNumber(data.attempt, 'data.attempt', 1);
      break;
    case 'coach.meta':
      validateCoachMeta(data);
      break;
    case 'stream.error':
      rejectUnknownKeys(data, ['code', 'message', 'detail', 'retryable'], 'data');
      requireString(data.code, 'data.code');
      requireString(data.message, 'data.message');
      validateOptionalString(data.detail, 'data.detail');
      requireBoolean(data.retryable, 'data.retryable');
      break;
    case 'stream.done':
      rejectUnknownKeys(data, ['reason'], 'data');
      if (data.reason !== 'completed' && data.reason !== 'error' && data.reason !== 'cancelled') {
        fail('data.reason is invalid');
      }
      break;
  }
};

export const decodeAiStreamV2Event = (event: SseEvent): AiStreamV2Event => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(event.data);
  } catch {
    return fail('AI stream payload is not valid JSON');
  }

  const envelope = requireRecord(parsed, 'AI stream envelope');
  rejectUnknownKeys(envelope, ['version', 'type', 'data'], 'AI stream top-level envelope');
  if (envelope.version !== 2) fail('AI stream version must be 2');
  if (typeof envelope.type !== 'string' || !APPROVED_TYPES.has(envelope.type as AiStreamV2Event['type'])) {
    fail('AI stream type is not supported');
  }
  if (event.event !== envelope.type) {
    fail(`SSE event ${event.event} does not match envelope type ${envelope.type}`);
  }

  validateEventData(envelope.type as AiStreamV2Event['type'], envelope.data);
  return envelope as AiStreamV2Event;
};

export const resolveAiEventVersion = (value: unknown): AiEventVersion => {
  if (value === undefined || value === null || value === '') return '2';
  if (value === '1' || value === '2') return value;
  return fail('VITE_AI_EVENT_VERSION must be 1 or 2');
};

export const getAiEventVersion = (): AiEventVersion => (
  resolveAiEventVersion(
    import.meta.env?.VITE_AI_EVENT_VERSION
      ?? (typeof process !== 'undefined' ? process.env?.VITE_AI_EVENT_VERSION : undefined),
  )
);

export const isTypedDone = (event: AiStreamV2Event): boolean => event.type === 'stream.done';
