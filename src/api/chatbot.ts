import { ChatRequest, VoiceResponse } from '../types/chatbot';
import { getMockRateLimitSeconds } from '../mock/chatbotRateLimitMock';
import { isAxiosError } from 'axios';
import api from './axios';
import {
  DEFAULT_STREAM_TIMEOUT_MS,
  DEFAULT_STREAM_TIMEOUT_RETRY_ATTEMPTS,
  CHATBOT_STATUS_RATE_LIMIT,
  CHATBOT_STATUS_SERVICE_UNAVAILABLE,
  CHATBOT_STREAM_TIMEOUT_ERROR,
  CHATBOT_STREAM_INCOMPLETE_ERROR,
  isStreamReadTimeoutError,
  isStreamRequestTimeoutError,
  readWithTimeout,
  getStreamRetryDelayMs,
  requestStream,
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
  onError: (error: string) => void,
  onMeta?: (meta: {
    verified: boolean;
    cached?: boolean;
    intent?: string;
    dataSources: Array<{ title: string; url?: string; content?: string }>;
    toolCalls: Array<{ toolName: string; parameters: Record<string, unknown> }>;
  }) => void
): Promise<void> {
  const MAX_RETRIES = DEFAULT_STREAM_TIMEOUT_RETRY_ATTEMPTS;
  const READ_TIMEOUT_MS = DEFAULT_STREAM_TIMEOUT_MS;
  const mockMode = import.meta.env.VITE_MOCK_CHATBOT_RATE_LIMIT;
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
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }

      if (isStreamRequestTimeoutError(error)) {
        if (attempt >= MAX_RETRIES) {
          throw new Error(CHATBOT_STREAM_TIMEOUT_ERROR);
        }
        const delay = getStreamRetryDelayMs(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Network errors or other fetch exceptions
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      // Backoff delay
      const delay = getStreamRetryDelayMs(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (!response || !response.body) {
    throw new Error('Failed to connect to server after retries.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let currentEvent = 'message';

  // Read timeout is enforced by readWithTimeout() around each reader.read() call.

  let streamCompleted = false;

  while (true) {
    try {
      const { done, value } = await readWithTimeout(() => reader.read(), READ_TIMEOUT_MS);

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          const dataString = line.substring(5).trim();
          if (dataString === '[DONE]') {
            streamCompleted = true;
            break;
          }

          try {
            const parsed = JSON.parse(dataString);
            if (currentEvent === 'message' && parsed.delta) {
              onDelta(parsed.delta);
            } else if (currentEvent === 'error') {
              onError(parsed.message || '알 수 없는 오류');
              return; // Stop processing on error
            } else if (currentEvent === 'meta' && onMeta) {
              onMeta({
                verified: parsed.verified ?? false,
                cached: parsed.cached ?? false,
                intent: parsed.intent,
                dataSources: (parsed.data_sources || []).map((s: { title?: string; url?: string; content?: string }) => ({
                  title: s.title || 'Unknown',
                  url: s.url,
                  content: s.content,
                })),
                toolCalls: (parsed.tool_calls || []).map((t: { tool_name?: string; parameters?: Record<string, unknown> }) => ({
                  toolName: t.tool_name || 'unknown',
                  parameters: t.parameters || {},
                })),
              });
            }
            currentEvent = 'message';
          } catch (parseError) {
            const preview = line.length > 160 ? `${line.slice(0, 160)}...` : line;
            console.warn('Failed to parse SSE data:', {
              previewLength: line.length,
              preview,
              parseErrorName: parseError instanceof Error ? parseError.name : 'ParseError',
            });
          }
        }
      }
      if (streamCompleted) break;
    } catch (error: unknown) {
      // Clean up reader
      await reader.cancel();

      if (isStreamReadTimeoutError(error)) {
        throw new Error(CHATBOT_STREAM_TIMEOUT_ERROR);
      }
      throw error;
    }
  }

  // 스트림이 [DONE] 시그널 없이 종료된 경우 (서버 비정상 종료 등)
  if (!streamCompleted) {
    throw new Error(CHATBOT_STREAM_INCOMPLETE_ERROR);
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
