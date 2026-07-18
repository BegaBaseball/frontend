import { ChatMeta, ChatQueueStatus, VoiceResponse } from '../types/chatbot';
import { AiStreamMetaPayload } from '../types/ai';
import type { components as AiStreamComponents } from './generated/aiStreamV2';
import { getMockRateLimitSeconds } from '../mock/chatbotRateLimitMock';
import { normalizeAiStreamMeta } from './aiMeta';
import { privatePost } from './privateClient';
import { consumeSseStream } from './sse';
import {
  AI_EVENT_VERSION_HEADER,
  AiStreamContractError,
  decodeAiStreamV2Event,
  getAiEventVersion,
} from './aiStreamContract';
import {
  decodeAiStreamHttpError,
  normalizeAiStreamEventError,
  RateLimitError,
  type AiStreamErrorDetails,
} from './aiStreamError';
import {
  DEFAULT_STREAM_TIMEOUT_MS,
  DEFAULT_STREAM_TIMEOUT_RETRY_ATTEMPTS,
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
export { RateLimitError } from './aiStreamError';

export class ChatStreamEventError extends Error {
  readonly eventCode: string;
  readonly upstreamMessage: string;
  readonly upstreamMessageIsPublic: boolean;
  readonly detail: string | null;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | null;
  readonly supportedVersions: AiStreamErrorDetails['supportedVersions'];

  constructor(
    details: AiStreamErrorDetails,
    options?: { upstreamMessageIsPublic?: boolean },
  ) {
    super(CHATBOT_STREAM_TEMPORARY_ERROR);
    this.name = 'ChatStreamEventError';
    this.eventCode = details.code;
    this.upstreamMessage = details.message;
    this.upstreamMessageIsPublic = options?.upstreamMessageIsPublic === true;
    this.detail = details.detail;
    this.retryable = details.retryable;
    this.retryAfterSeconds = details.retryAfterSeconds;
    this.supportedVersions = [...details.supportedVersions];
  }
}

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
        break;
      }

      const requestError = await decodeAiStreamHttpError(response);
      if (response.status === 429) {
        throw new RateLimitError(requestError);
      }

      if (!requestError.retryable || attempt >= MAX_RETRIES) {
        throw new ChatStreamEventError(requestError, { upstreamMessageIsPublic: true });
      }

      await waitForStreamDelay(getStreamRetryDelayMs(attempt), options?.signal);

    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }

      if (error instanceof ChatStreamEventError) {
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
      acceptDoneSentinel: eventVersion === '1',
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
              throw new ChatStreamEventError(normalizeAiStreamEventError(decoded.data));
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
          code?: string;
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
          const code = typeof parsed.code === 'string'
            ? parsed.code
            : typeof parsed.message === 'string'
              ? parsed.message
              : 'AI_STREAM_EVENT_ERROR';
          const message = typeof parsed.message === 'string' && parsed.message.trim() !== ''
            ? parsed.message
            : CHATBOT_STREAM_TEMPORARY_ERROR;
          throw new ChatStreamEventError({
            code,
            message,
            detail: typeof parsed.detail === 'string' ? parsed.detail : null,
            retryable: true,
            retryAfterSeconds: null,
            supportedVersions: [],
          });
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
