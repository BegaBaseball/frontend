import { useEffect, useRef, useState, type ReactNode } from 'react';

const TAB_TRANSITION_MS = 200;

type PredictionTab = 'match' | 'ranking';
type TopNoticePayload = { kind: string; content: ReactNode };

type PredictionAnimatedSectionsProps = {
  activeTab: PredictionTab;
  topNotice: TopNoticePayload | null;
  matchChildren: ReactNode;
  rankingChildren: ReactNode;
};

export default function PredictionAnimatedSections({
  activeTab,
  topNotice,
  matchChildren,
  rankingChildren,
}: PredictionAnimatedSectionsProps) {
  const [displayedTab, setDisplayedTab] = useState<PredictionTab>(activeTab);
  const [tabVisible, setTabVisible] = useState(true);
  const enterFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeTab === displayedTab) {
      return;
    }

    setTabVisible(false);
    const switchTimeoutId = window.setTimeout(() => {
      setDisplayedTab(activeTab);
      enterFrameRef.current = window.requestAnimationFrame(() => {
        setTabVisible(true);
        enterFrameRef.current = null;
      });
    }, TAB_TRANSITION_MS);

    return () => {
      window.clearTimeout(switchTimeoutId);
      if (enterFrameRef.current !== null) {
        window.cancelAnimationFrame(enterFrameRef.current);
        enterFrameRef.current = null;
      }
    };
  }, [activeTab, displayedTab]);

  useEffect(() => {
    if (activeTab !== displayedTab || tabVisible) {
      return;
    }

    enterFrameRef.current = window.requestAnimationFrame(() => {
      setTabVisible(true);
      enterFrameRef.current = null;
    });

    return () => {
      if (enterFrameRef.current !== null) {
        window.cancelAnimationFrame(enterFrameRef.current);
        enterFrameRef.current = null;
      }
    };
  }, [activeTab, displayedTab, tabVisible]);

  const isShowingActiveTab = displayedTab === activeTab;
  const hiddenTranslateY = isShowingActiveTab ? 10 : -10;
  const tabContentStyle = {
    opacity: tabVisible ? 1 : 0,
    transform: `translateY(${tabVisible ? 0 : hiddenTranslateY}px)`,
    transition: `opacity ${TAB_TRANSITION_MS}ms ease-out, transform ${TAB_TRANSITION_MS}ms ease-out`,
  } as const;
  const tabContent = displayedTab === 'match' ? matchChildren : rankingChildren;

  return (
    <div className="relative">
      {topNotice && (
        <div
          key={`top-notice-${topNotice.kind}`}
          className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center sm:justify-end"
        >
          {topNotice.content}
        </div>
      )}

      <div style={tabContentStyle}>
        {tabContent}
      </div>
    </div>
  );
}
