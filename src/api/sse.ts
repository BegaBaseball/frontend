import { readWithTimeout } from './stream';

export interface SseEvent {
  event: string;
  data: string;
}

export interface ConsumeSseStreamOptions {
  timeoutMs: number;
  acceptDoneSentinel: boolean;
  signal?: AbortSignal;
  onEvent: (event: SseEvent) => void | Promise<void>;
  isTerminalEvent?: (event: SseEvent) => boolean;
}

export interface ConsumeSseStreamResult {
  sawDone: boolean;
}

export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  options: ConsumeSseStreamOptions,
): Promise<ConsumeSseStreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let currentEvent = 'message';
  let sawDone = false;

  const processLine = async (line: string) => {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      currentEvent = 'message';
      return;
    }

    if (trimmedLine.startsWith('event:')) {
      currentEvent = trimmedLine.slice(6).trim() || 'message';
      return;
    }

    if (trimmedLine.startsWith(':')) {
      return;
    }

    if (!trimmedLine.startsWith('data:')) {
      return;
    }

    const data = trimmedLine.slice(5).trim();
    if (data === '[DONE]' && options.acceptDoneSentinel) {
      sawDone = true;
      return;
    }

    const sseEvent = {
      event: currentEvent,
      data,
    };
    await options.onEvent(sseEvent);
    if (options.isTerminalEvent?.(sseEvent)) {
      sawDone = true;
    }
  };

  try {
    while (!sawDone) {
      if (options.signal?.aborted) {
        throw options.signal.reason ?? new DOMException('aborted', 'AbortError');
      }
      const { done, value } = await readWithTimeout(() => reader.read(), options.timeoutMs);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        await processLine(line);
        if (sawDone) break;
      }
    }

    if (!sawDone) {
      const remainingLines = buffer.split('\n');
      for (const line of remainingLines) {
        await processLine(line);
        if (sawDone) break;
      }
    }

    if (sawDone) {
      await reader.cancel('SSE completed');
    }
  } finally {
    reader.releaseLock();
  }

  return { sawDone };
}
