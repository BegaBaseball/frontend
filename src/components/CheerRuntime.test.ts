import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readRuntimeSource = () => readFileSync(
  new URL('./CheerRuntime.tsx', import.meta.url),
  'utf-8'
);

test('CheerRuntime는 탭 표시 후 다음 paint에서 피드 교체를 시작한다', () => {
  const source = readRuntimeSource();

  assert.match(
    source,
    /import \{ lazy, Suspense, startTransition, useEffect, useMemo, useRef, useState \} from 'react';/
  );
  assert.match(source, /import \{ scheduleAfterNextPaint \} from '\.\.\/utils\/afterNextPaint';/);
  assert.match(source, /const \[contentFeedTab, setContentFeedTab\] = useState<FeedTabKey>/);
  assert.match(
    source,
    /scheduleAfterNextPaint\(\(\) => \{\s*startTransition\(\(\) => \{\s*setContentFeedTab\(activeFeedTab\);/
  );
  assert.match(source, /activeFeedTab=\{contentFeedTab\}/);
});
