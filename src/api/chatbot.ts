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
  const response = await fetch(`${API_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Failed to get readable stream from response.');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let currentEvent = 'message';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        const dataString = line.substring(5).trim();
        if (dataString === '[DONE]') break;

        try {
          const parsed = JSON.parse(dataString);
          if (currentEvent === 'message' && parsed.delta) {
            onDelta(parsed.delta);
          } else if (currentEvent === 'error') {
            onError(parsed.message || '알 수 없는 오류');
          } else if (currentEvent === 'meta' && onMeta) {
            // Transform snake_case to camelCase for frontend consistency
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