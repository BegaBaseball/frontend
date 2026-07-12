import assert from 'node:assert/strict';
import test from 'node:test';

import { consumeSseStream } from './sse';

test('consumeSseStream returns immediately after DONE without waiting for EOF', async () => {
  let cancelled = false;
  let delivered = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (delivered) {
        return new Promise(() => undefined);
      }
      delivered = true;
      controller.enqueue(new TextEncoder().encode(
        'event: message\ndata: {"delta":"완료"}\n\nevent: done\ndata: [DONE]\n\n',
      ));
    },
    cancel() {
      cancelled = true;
    },
  });

  const events: string[] = [];
  const result = await consumeSseStream(body, {
    timeoutMs: 50,
    onEvent: ({ data }) => {
      events.push(data);
    },
  });

  assert.equal(result.sawDone, true);
  assert.equal(cancelled, true);
  assert.deepEqual(events, ['{"delta":"완료"}']);
});

test('consumeSseStream accepts a typed v2 terminal predicate without waiting for EOF', async () => {
  let cancelled = false;
  let delivered = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (delivered) return new Promise(() => undefined);
      delivered = true;
      controller.enqueue(new TextEncoder().encode(
        'event: chat.message.delta\n'
        + 'data: {"version":2,"type":"chat.message.delta","data":{"delta":"완료"}}\n\n'
        + 'event: stream.done\n'
        + 'data: {"version":2,"type":"stream.done","data":{"reason":"completed"}}\n\n',
      ));
    },
    cancel() {
      cancelled = true;
    },
  });

  const events: string[] = [];
  const result = await consumeSseStream(body, {
    timeoutMs: 50,
    onEvent: ({ data }) => {
      events.push(data);
    },
    isTerminalEvent: ({ event }) => event === 'stream.done',
  });

  assert.equal(result.sawDone, true);
  assert.equal(cancelled, true);
  assert.equal(events.length, 2);
});
