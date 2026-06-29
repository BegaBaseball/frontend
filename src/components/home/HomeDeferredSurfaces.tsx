import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { HomeAuthSnapshot } from './HomeAuthBridge';

const LazyAdSlot = lazy(() => import('../ads/AdSlot'));
const LazyHomeAuthBridge = lazy(() => import('./HomeAuthBridge'));
const LazyHomeQueryProvider = lazy(() => import('./HomeQueryProvider'));
const LazyHomeSecondaryPanels = lazy(() => import('./HomeSecondaryPanelsContainer'));

const HOME_DEFERRED_AD_SLOT_DELAY_MS = 400;
const getCalendarMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

interface HomeDeferredSurfacesProps {
  selectedDate: Date;
  selectedDateKey: string;
  showCalendar: boolean;
  loggedIn: boolean;
  userId: string | null;
  suppressRecoveryActions: boolean;
  onAuthSnapshotChange: (snapshot: HomeAuthSnapshot) => void;
  onCloseCalendar: () => void;
  onSelectCalendarDate: (date: Date) => void;
}

export default function HomeDeferredSurfaces({
  selectedDate,
  selectedDateKey,
  showCalendar,
  loggedIn,
  userId,
  suppressRecoveryActions,
  onAuthSnapshotChange,
  onCloseCalendar,
  onSelectCalendarDate,
}: HomeDeferredSurfacesProps) {
  const navigate = useNavigate();
  const calendarDialogTitleId = useId();
  const adSlotTimeoutRef = useRef<number | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => getCalendarMonth(selectedDate));
  const [shouldMountAdSlot, setShouldMountAdSlot] = useState(false);
  const [shouldMountWelcomeGuide, setShouldMountWelcomeGuide] = useState(false);

  useEffect(() => {
    if (shouldMountAdSlot) {
      return undefined;
    }

    adSlotTimeoutRef.current = globalThis.setTimeout(() => {
      adSlotTimeoutRef.current = null;
      setShouldMountAdSlot(true);
    }, HOME_DEFERRED_AD_SLOT_DELAY_MS) as unknown as number;

    return () => {
      if (adSlotTimeoutRef.current !== null) {
        window.clearTimeout(adSlotTimeoutRef.current);
        adSlotTimeoutRef.current = null;
      }
    };
  }, [shouldMountAdSlot]);

  useEffect(() => {
    const dontShowAgain = localStorage.getItem('bega_dont_show_guide');
    const hasVisited = localStorage.getItem('bega_has_visited');

    if (!dontShowAgain && !hasVisited) {
      setShouldMountWelcomeGuide(true);
    }
  }, []);

  useEffect(() => {
    if (!showCalendar) {
      return undefined;
    }

    setCalendarMonth(getCalendarMonth(selectedDate));

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseCalendar();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onCloseCalendar, selectedDate, showCalendar]);

  return (
    <>
      <Suspense fallback={null}>
        <LazyHomeAuthBridge onSnapshotChange={onAuthSnapshotChange} />
      </Suspense>

      {shouldMountAdSlot ? (
        <Suspense fallback={null}>
          <LazyAdSlot
            slotId="home_mid_1"
            pageType="home"
            contentId={selectedDateKey}
            loggedIn={loggedIn}
            userId={userId}
          />
        </Suspense>
      ) : null}

      <Suspense fallback={null}>
        <LazyHomeQueryProvider>
          <LazyHomeSecondaryPanels
            selectedDate={selectedDate}
            selectedDateKey={selectedDateKey}
            calendarMonth={calendarMonth}
            showCalendar={showCalendar}
            shouldMountWelcomeGuide={shouldMountWelcomeGuide}
            calendarDialogTitleId={calendarDialogTitleId}
            loggedIn={loggedIn}
            userId={userId}
            suppressRecoveryActions={suppressRecoveryActions}
            onNavigateToCheer={() => navigate('/cheer')}
            onNavigateToMate={() => navigate('/mate')}
            onNavigateToCheerPost={(postId) => navigate(`/cheer?postId=${postId}`)}
            onSelectFeaturedMate={(mate) => navigate(`/mate/${mate.id}`, {
              state: { partySeed: mate },
            })}
            onCloseCalendar={onCloseCalendar}
            onCalendarMonthChange={setCalendarMonth}
            onSelectCalendarDate={onSelectCalendarDate}
          />
        </LazyHomeQueryProvider>
      </Suspense>
    </>
  );
}
