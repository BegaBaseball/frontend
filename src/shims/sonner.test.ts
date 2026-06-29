import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSonnerShimSource = () => readFileSync(
  new URL('./sonner.tsx', import.meta.url),
  'utf-8'
);

test('sonner shim은 자동 종료되지 않는 loading toast를 지원한다', () => {
  const source = readSonnerShimSource();

  assert.match(source, /type ToastVariant = 'default' \| 'success' \| 'error' \| 'info' \| 'warning' \| 'loading';/);
  assert.match(source, /loading: \(title: ReactNode, options\?: ToastOptions\) => pushToast\('loading', title, \{[\s\S]*duration: Number\.POSITIVE_INFINITY,[\s\S]*\}\)/);
  assert.match(source, /const shouldAutoDismiss = Number\.isFinite\(entry\.duration\) && entry\.duration > 0;/);
  assert.match(source, /const shouldShowProgress = Number\.isFinite\(entry\.duration\) && entry\.duration > 0;/);
});
