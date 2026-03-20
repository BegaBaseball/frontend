import { ChatMeta, ChatRequest, VoiceResponse } from '../types/chatbot';
import { AiStreamMetaPayload } from '../types/ai';
import { getMockRateLimitSeconds } from '../mock/chatbotRateLimitMock';
import { isAxiosError } from 'axios';
import api from './axios';
import { normalizeAiStreamMeta } from './aiMeta';
import { consumeSseStream } from './sse';
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
  data: ChatRequest,
  onDelta: (delta: string) => void,
  onMeta?: (meta: ChatMeta) => void,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const MAX_RETRIES = DEFAULT_STREAM_TIMEOUT_RETRY_ATTEMPTS;
  const READ_TIMEOUT_MS = DEFAULT_STREAM_TIMEOUT_MS;
  const mockMode = import.meta.env?.VITE_MOCK_CHATBOT_RATE_LIMIT;
  const mockSeconds = getMockRateLimitSeconds(mockMode);

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

  try {
    const { sawDone } = await consumeSseStream(response.body, {
      timeoutMs: READ_TIMEOUT_MS,
      signal: options?.signal,
      onEvent: ({ event, data }) => {
        let parsed: AiStreamMetaPayload & {
          delta?: string;
          message?: string;
          detail?: string;
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
        } else if (event === 'meta' && onMeta) {
          onMeta({
            ...normalizeAiStreamMeta(parsed),
            style: typeof parsed.style === 'string' ? parsed.style : 'markdown',
          });
        }
      },
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_STREAM_TIMEOUT_MS);

  try {
    const response = await api.post<VoiceResponse>('/ai/chat/voice', formData, {
      signal: controller.signal,
      timeout: DEFAULT_STREAM_TIMEOUT_MS,
    });

    clearTimeout(timeoutId);

    return response.data.text || '';
  } catch (error) {
    if (
      error instanceof Error
      && (
        error.name === 'AbortError'
        || error.name === 'CanceledError'
        || (isAxiosError(error) && error.code === 'ECONNABORTED')
      )
    ) {
      throw new Error('변환 시간이 초과되었습니다.');
    }
    throw new Error('변환에 실패했습니다.');
  } finally {
    clearTimeout(timeoutId);
  }
}
