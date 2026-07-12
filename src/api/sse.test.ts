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
