import { ChatRequest, EdgeFunctionRequest, ChatResponse, VoiceResponse } from '../types/chatbot';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_AI_API_URL || '/ai';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zyofzvnkputevakepbdm.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1`;

/**
 * Edge Function으로 채팅 메시지 전송
 */
export async function sendChatMessageToEdge(data: EdgeFunctionRequest): Promise<ChatResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // 인증 헤더 추가
  const authToken = Cookies.get('Authorization');

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else if (SUPABASE_ANON_KEY) {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  } else {
    throw new Error('Supabase anon key가 설정되지 않았습니다.');
  }

  const response = await fetch(`${EDGE_FUNCTION_URL}/ai-chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  const result: ChatResponse = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * FastAPI SSE 스트리밍 처리
 */
export async function sendChatMessageStream(
  data: ChatRequest,
  onDelta: (delta: string) => void,
  onError: (error: string) => void,
  onMeta?: (meta: {
    verified: boolean;
    dataSources: Array<{ title: string; url?: string; content?: string }>;
    toolCalls: Array<{ toolName: string; parameters: Record<string, unknown> }>;
  }) => void
): Promise<void> {
  const MAX_RETRIES = 3;
  const READ_TIMEOUT_MS = 30000; // 30 seconds

  let attempt = 0;
  let response: Response | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (response.ok) {
        break; // Success
      }

      // Handle 4xx errors (do not retry unless it's 429)
      if (response.status !== 429 && response.status !== 503 && response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // If 5xx or 429, retry
      if (attempt >= MAX_RETRIES) {
        if (response.status === 429) throw new Error('STATUS_429');
        if (response.status === 503) throw new Error('STATUS_503');
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      // Backoff delay: 1s, 2s, 4s...
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      // Network errors or other fetch exceptions
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      // Backoff delay
      const delay = Math.pow(2, attempt - 1) * 1000;
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

  // Read Timeout Management
  const controller = new AbortController(); // Not used for fetch (already done), but logical concept. 
  // Actually, we can't easily abort the standard `response.body` reader from outside without canceling the fetch signal, 
  // but fetch is already done. We can reader.cancel().

  // We'll race reader.read() against a timeout.

  let streamCompleted = false;

  while (true) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      // Race: read vs timeout
      const readPromise = reader.read();
      const timeoutPromise = new Promise<{ done: boolean; value?: Uint8Array }>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('READ_TIMEOUT'));
        }, READ_TIMEOUT_MS);
      });

      const { done, value } = await Promise.race([readPromise, timeoutPromise]);

      if (timeoutId) clearTimeout(timeoutId);

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
            console.warn('Failed to parse SSE data:', line, parseError);
          }
        }
      }
      if (streamCompleted) break;
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);

      // Clean up reader
      await reader.cancel();

      if (error.message === 'READ_TIMEOUT') {
        throw new Error('STREAM_TIMEOUT');
      }
      throw error;
    }
  }

  // 스트림이 [DONE] 시그널 없이 종료된 경우 (서버 비정상 종료 등)
  if (!streamCompleted) {
    throw new Error('INCOMPLETE_STREAM');
  }
}

/**
 * 음성을 텍스트로 변환
 */
export async function convertVoiceToText(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_URL}/chat/voice`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('음성 변환 실패');
    }

    const result: VoiceResponse = await response.json();
    return result.text || '';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('변환 시간이 초과되었습니다.');
    }
    throw new Error('변환에 실패했습니다.');
  } finally {
    clearTimeout(timeoutId);
  }
}