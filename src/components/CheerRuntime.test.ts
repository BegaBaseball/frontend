import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readRuntimeSource = () => readFileSync(
  new URL('./CheerRuntime.tsx', import.meta.url),
  'utf8'
);
const readLivePanelSource = () => readFileSync(
  new URL('./CheerLivePanel.tsx', import.meta.url),
  'utf8'
);
const readSidebarPanelsSource = () => readFileSync(
  new URL('./CheerSidebarPanels.tsx', import.meta.url),
  'utf8'
);

test('CheerRuntime는 탭 표시 후 다음 paint에서 피드와 URL 상태를 전환한다', () => {
  const source = readRuntimeSource();

  assert.match(source, /import \{ lazy, memo, Suspense, startTransition, useEffect, useMemo, useRef, useState \} from 'react';/);
  assert.match(source, /import \{ scheduleAfterNextPaint \} from '\.\.\/utils\/afterNextPaint';/);
  assert.match(source, /const CheerFeedTabs = memo\(function CheerFeedTabs/);
  assert.match(source, /const \[selectedTab, setSelectedTab\] = useState<CheerTabKey>\(activeTab\);/);
  assert.match(source, /setSelectedTab\(tab\.key\);\s*onTabChange\(tab\.key\);/);
  assert.match(source, /const \[contentFeedTab, setContentFeedTab\] = useState<CheerTabKey>/);
  assert.doesNotMatch(source, /const \[activeFeedTab, setActiveFeedTab\]/);
  assert.match(
    source,
    /scheduleAfterNextPaint\(\(\) => \{[\s\S]*startTransition\(\(\) => \{\s*setContentFeedTab\(nextTab\);/
  );
  assert.match(source, /setSearchParams\(\(currentParams\) => \{/);
  assert.match(source, /<LazyCheerFeedRuntimeContent\s+activeFeedTab=\{activeContentFeedTab\}/);
});

test('CheerRuntime는 데스크톱 사이드바 인기글 데이터를 lazy chunk보다 먼저 요청한다', () => {
  const source = readRuntimeSource();

  assert.match(source, /const queryClient = useQueryClient\(\);/);
  assert.match(source, /if \(!shouldRenderSidebar\) \{\s*return;\s*\}/);
  assert.match(source, /queryClient\.prefetchQuery\(\{/);
  assert.match(source, /queryKey: \['cheer-hot', 'HYBRID'\]/);
  assert.match(source, /queryFn: \(\) => fetchHotPosts\(\{ page: 0, size: 5, algorithm: 'HYBRID' \}\)/);
});

test('CheerRuntime는 경기 데이터와 라이브 스냅샷을 필요한 lazy runtime에서만 요청한다', () => {
  const runtimeSource = readRuntimeSource();
  const livePanelSource = readLivePanelSource();
  const sidebarPanelsSource = readSidebarPanelsSource();

  assert.doesNotMatch(runtimeSource, /useGamesData/);
  assert.doesNotMatch(runtimeSource, /fetchGameLiveSnapshot/);
  assert.doesNotMatch(runtimeSource, /LIVE_GAME_EVENT_LIMIT/);
  assert.match(livePanelSource, /useGamesData/);
  assert.match(livePanelSource, /fetchGameLiveSnapshot/);
  assert.match(sidebarPanelsSource, /useGamesData/);
});
