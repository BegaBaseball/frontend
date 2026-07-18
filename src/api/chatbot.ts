import { ChatMeta, ChatQueueStatus, VoiceResponse } from '../types/chatbot';
import { AiStreamMetaPayload } from '../types/ai';
import type { components as AiStreamComponents } from './generated/aiStreamV2';
import { getMockRateLimitSeconds } from '../mock/chatbotRateLimitMock';
import { normalizeAiStreamMeta } from './aiMeta';
import { privatePost } from './privateClient';
import { consumeSseStream } from './sse';
import {
  AiStreamContractError,
  decodeAiStreamV2Event,
  getAiEventVersion,
} from './aiStreamContract';
import {
  DEFAULT_STREAM_TIMEOUT_MS,
  DEFAULT_STREAM_TIMEOUT_RETRY_ATTEMPTS,
  CHATBOT_STATUS_RATE_LIMIT,
  CHATBOT_STATUS_SERVICE_UNAVAILABLE,
  CHATBOT_STREAM_TIMEOUT_ERROR,
  CHATBOT_STREAM_INCOMPLETE_ERROR,
  CHATBOT_STREAM_TEMPORARY_ERROR,
  isStreamAbortError,
  isStreamReadTimeoutError,
  isStreamRequestTimeoutError,
  getStreamRetryDelayMs,
  requestStream,
  waitForStreamDelay,
} from './stream';

const buildAiStreamPath = (path: string): string => `/ai${path.startsWith('/') ? path : `/${path}`}`;
/**
 * FastAPI SSE 스트리밍 처리
 */
export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(CHATBOT_STATUS_RATE_LIMIT);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ChatStreamEventError extends Error {
  detail?: string;
  eventCode?: string;

  constructor(eventCode?: string, detail?: string) {
    super(CHATBOT_STREAM_TEMPORARY_ERROR);
    this.name = 'ChatStreamEventError';
    this.detail = detail;
    this.eventCode = eventCode;
  }
}

const DEFAULT_RETRY_AFTER_SECONDS = 10;
const AI_EVENT_VERSION_HEADER = 'X-AI-Event-Version';

type ChatMetaV2 = AiStreamComponents['schemas']['ChatMetaData'];
type ChatStreamRequestWire = AiStreamComponents['schemas']['ChatStreamRequest'];
export type ChatStreamRequest = Pick<
  ChatStreamRequestWire,
  'question' | 'cache_bypass' | 'filters' | 'style'
> & {
  history: AiStreamComponents['schemas']['ChatHistoryMessage'][] | null;
} & Record<string, unknown>;

const toLegacyChatMetaPayload = (data: ChatMetaV2): AiStreamMetaPayload => ({
  verified: data.verified ?? undefined,
  cached: data.cached ?? undefined,
  intent: data.intent ?? undefined,
  strategy: data.strategy ?? undefined,
  style: data.style ?? undefined,
  planner_mode: data.planner_mode ?? undefined,
  planner_cache_hit: data.planner_cache_hit ?? undefined,
  tool_execution_mode: data.tool_execution_mode ?? undefined,
  fallback_reason: data.fallback_reason ?? undefined,
  perf: data.perf,
  model_usage: data.model_usage,
  model_usage_complete: data.model_usage_complete ?? undefined,
  data_sources: data.data_sources?.map((source) => ({
    title: source.title ?? undefined,
    url: source.url ?? undefined,
    content: source.content ?? undefined,
  })),
  tool_calls: data.tool_calls?.map((toolCall) => ({
    tool_name: toolCall.tool_name,
    parameters: toolCall.parameters,
  })),
  finish_reason: data.finish_reason ?? undefined,
  cancelled: data.cancelled ?? undefined,
  error: data.error ?? undefined,
});

export type { ChatQueueStatus };

const parseRetryAfterSeconds = (retryAfterHeader: string | null): number | null => {
  if (!retryAfterHeader) return null;

  const numericValue = Number(retryAfterHeader);
  if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
    return Math.max(0, Math.floor(numericValue));
  }

  const parsedDate = Date.parse(retryAfterHeader);
  if (!Number.isNaN(parsedDate)) {
    const diffMs = parsedDate - Date.now();
    return Math.max(0, Math.ceil(diffMs / 1000));
  }

  return null;
};

export async function sendChatMessageStream(
  data: ChatStreamRequest,
  onDelta: (delta: string) => void,
  onMeta?: (meta: ChatMeta) => void,
  options?: {
    signal?: AbortSignal;
    onQueueStatus?: (status: ChatQueueStatus) => void;
  },
): Promise<void> {
  const MAX_RETRIES = DEFAULT_STREAM_TIMEOUT_RETRY_ATTEMPTS;
  const READ_TIMEOUT_MS = DEFAULT_STREAM_TIMEOUT_MS;
  const mockMode = import.meta.env?.VITE_MOCK_CHATBOT_RATE_LIMIT;
  const mockSeconds = getMockRateLimitSeconds(mockMode);
  const eventVersion = getAiEventVersion();

  if (mockSeconds !== null) {
    throw new RateLimitError(mockSeconds);
  }

  let attempt = 0;
  let response: Response | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      response = await requestStream(buildAiStreamPath('/chat/stream'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AI_EVENT_VERSION_HEADER]: eventVersion,
        },
        body: JSON.stringify(data),
        timeoutMs: DEFAULT_STREAM_TIMEOUT_MS,
        signal: options?.signal,
      });

      if (response.ok) {
        break; // Success
      }

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retryAfterSeconds = parseRetryAfterSeconds(retryAfterHeader) ?? DEFAULT_RETRY_AFTER_SECONDS;
        throw new RateLimitError(retryAfterSeconds);
      }

      // Handle 4xx errors (do not retry unless it's 503)
      if (response.status !== 503 && response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // If 5xx or 503, retry
      if (attempt >= MAX_RETRIES) {
        if (response.status === 503) throw new Error(CHATBOT_STATUS_SERVICE_UNAVAILABLE);
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // Backoff delay: 1s, 2s, 4s...
      const delay = getStreamRetryDelayMs(attempt);
      await waitForStreamDelay(delay, options?.signal);

    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }

      if (isStreamAbortError(error)) {
        throw error;
      }

      if (isStreamRequestTimeoutError(error)) {
        if (attempt >= MAX_RETRIES) {
          throw new Error(CHATBOT_STREAM_TIMEOUT_ERROR);
        }
        const delay = getStreamRetryDelayMs(attempt);
        await waitForStreamDelay(delay, options?.signal);
        continue;
      }

      // Network errors or other fetch exceptions
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      // Backoff delay
      const delay = getStreamRetryDelayMs(attempt);
      await waitForStreamDelay(delay, options?.signal);
    }
  }

  if (!response || !response.body) {
    throw new Error('Failed to connect to server after retries.');
  }

  if (
    eventVersion === '2'
    && response.headers.get(AI_EVENT_VERSION_HEADER) !== '2'
  ) {
    throw new AiStreamContractError(
      'AI stream negotiated version header is missing or mismatched.',
    );
  }

  try {
    const { sawDone } = await consumeSseStream(response.body, {
      timeoutMs: READ_TIMEOUT_MS,
      signal: options?.signal,
      onEvent: ({ event, data }) => {
        if (eventVersion === '2') {
          const decoded = decodeAiStreamV2Event({ event, data });
          switch (decoded.type) {
            case 'chat.status':
              return;
            case 'chat.queue':
              options?.onQueueStatus?.({
                state: decoded.data.state,
                queuePosition: decoded.data.queue_position,
                estimatedWaitTime: decoded.data.estimated_wait_time,
                rpmLimit: decoded.data.rpm_limit,
              });
              return;
            case 'chat.message.delta':
              onDelta(decoded.data.delta);
              return;
            case 'chat.meta':
              if (onMeta) {
                onMeta({
                  ...normalizeAiStreamMeta(toLegacyChatMetaPayload(decoded.data)),
                  style: decoded.data.style ?? 'markdown',
                });
              }
              return;
            case 'stream.error':
              throw new ChatStreamEventError(
                decoded.data.code,
                decoded.data.detail ?? decoded.data.message,
              );
            case 'stream.done':
              return;
            case 'coach.status':
            case 'coach.preview.chunk':
            case 'coach.preview.reset':
            case 'coach.message.delta':
            case 'coach.meta':
              throw new AiStreamContractError(
                `Unexpected coach event on chat stream: ${decoded.type}`,
              );
          }
        }

        let parsed: AiStreamMetaPayload & {
          delta?: string;
          message?: string;
          detail?: string;
          state?: string;
          queuePosition?: number;
          estimatedWaitTime?: number;
          rpmLimit?: number;
        };
        try {
          parsed = JSON.parse(data);
        } catch (parseError) {
          const preview = data.length > 160 ? `${data.slice(0, 160)}...` : data;
          console.warn('Failed to parse SSE data:', {
            previewLength: data.length,
            preview,
            parseErrorName: parseError instanceof Error ? parseError.name : 'ParseError',
          });
          return;
        }

        if (event === 'message' && parsed.delta) {
          onDelta(parsed.delta);
        } else if (event === 'error') {
          throw new ChatStreamEventError(
            parsed.message,
            parsed.detail || '일시적인 오류가 발생했습니다. 다시 시도해주세요.',
          );
        } else if (event === 'queue' && options?.onQueueStatus) {
          const state = parsed.state === 'processing' ? 'processing' : 'queued';
          options.onQueueStatus({
            state,
            queuePosition: typeof parsed.queuePosition === 'number' ? parsed.queuePosition : 0,
            estimatedWaitTime: typeof parsed.estimatedWaitTime === 'number' ? parsed.estimatedWaitTime : 0,
            rpmLimit: typeof parsed.rpmLimit === 'number' ? parsed.rpmLimit : 0,
          });
        } else if (event === 'meta' && onMeta) {
          onMeta({
            ...normalizeAiStreamMeta(parsed),
            style: typeof parsed.style === 'string' ? parsed.style : 'markdown',
          });
        }
      },
      isTerminalEvent: eventVersion === '2'
        ? ({ event }) => event === 'stream.done'
        : undefined,
    });

    if (!sawDone) {
      throw new Error(CHATBOT_STREAM_INCOMPLETE_ERROR);
    }
  } catch (error: unknown) {
    if (isStreamAbortError(error)) {
      throw error;
    }
    if (isStreamReadTimeoutError(error)) {
      throw new Error(CHATBOT_STREAM_TIMEOUT_ERROR);
    }
    throw error;
  }
}

/**
 * 음성을 텍스트로 변환
 */
export async function convertVoiceToText(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');

  try {
    const response = await privatePost<VoiceResponse, FormData>('/ai/chat/voice', formData, {
      timeoutMs: DEFAULT_STREAM_TIMEOUT_MS,
    });

    return response.text || '';
  } catch (error) {
    if (
      error instanceof Error
      && (
        error.name === 'AbortError'
        || error.name === 'CanceledError'
        || /^Request timed out after \d+ms$/i.test(error.message)
      )
    ) {
      throw new Error('변환 시간이 초과되었습니다.');
    }
    throw new Error('변환에 실패했습니다.');
  }
}
