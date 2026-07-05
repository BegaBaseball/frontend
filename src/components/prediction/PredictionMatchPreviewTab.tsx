import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import type { Game } from '../../types/prediction';
import { formatDate } from '../../utils/predictionDates';
import {
  buildPredictionScheduleDateRail,
  buildPredictionScheduleRowViewModel,
  formatPredictionScheduleDateKey,
  getPredictionScheduleMonthTitle,
  getPredictionScheduleTeamShortName,
  getPredictionScheduleTodayKey,
  parsePredictionScheduleDateKey,
  resolvePredictionScheduleMonthDate,
  type PredictionScheduleStatusTone,
  type PredictionScheduleWinnerSide,
} from '../../utils/predictionSchedulePreviewModel';
import { SharedCalendarDaysIcon } from '../icons/SharedLeafIcons';
import {
  PredictionChevronLeftIcon,
  PredictionChevronRightIcon,
  PredictionTrendingUpIcon,
} from './PredictionShellIcons';
import {
  PREDICTION_BRAND_BUTTON_CLASS,
  PREDICTION_BRAND_GRADIENT_CLASS,
  PREDICTION_SOFT_CHIP_CLASS,
  PREDICTION_SURFACE_CARD_CLASS,
} from './predictionUiTokens';

const TeamLogo = lazy(() => import('../TeamLogo'));

interface PredictionMatchPreviewTabProps {
  currentDateGames: Game[];
  currentDate: string;
  nearestNavigationDate: { date: string; isPast: boolean } | null;
  isToday: boolean;
  onEnterMatchDetail: (game: Game) => void;
  onGoToDate: (date: string) => void;
  onNearestNavigation: () => void;
}

const ScheduleTeamLogo = ({ team }: { team: string }) => (
  <Suspense
    fallback={(
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-8 font-black text-slate-700 ring-1 ring-slate-200 sm:h-7 sm:w-7 sm:text-9 lg:h-[34px] lg:w-[34px] lg:text-10">
        {getPredictionScheduleTeamShortName(team)}
      </div>
    )}
  >
    <TeamLogo team={team} size="full" className="h-6 w-6 shrink-0 sm:h-7 sm:w-7 lg:h-[34px] lg:w-[34px]" />
  </Suspense>
);

const renderScheduleTeamLogo = (
  team: string,
  side: Exclude<PredictionScheduleWinnerSide, null>,
  winnerSide: PredictionScheduleWinnerSide,
) => {
  const isWinner = winnerSide === side;
  if (isWinner) {
    return (
      <div className="relative shrink-0">
        <div
          data-testid="prediction-schedule-winning-logo"
          className="rounded-full bg-emerald-50 p-1 ring-2 ring-emerald-400 ring-offset-2 ring-offset-white transition-all dark:bg-emerald-950/30 dark:ring-emerald-300 dark:ring-offset-card"
          aria-label="승리 팀 로고"
        >
          <ScheduleTeamLogo team={team} />
        </div>
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-9 font-black text-white shadow-sm sm:h-5 sm:min-w-5 sm:text-10">
          승
        </span>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <div className="rounded-full transition-all">
        <ScheduleTeamLogo team={team} />
      </div>
    </div>
  );
};

const getStatusToneClass = (tone: PredictionScheduleStatusTone) => {
  if (tone === 'live') {
    return 'text-rose-700 dark:text-rose-200';
  }
  if (tone === 'closed') {
    return 'text-slate-700 dark:text-white';
  }
  if (tone === 'unavailable') {
    return 'text-amber-700 dark:text-amber-200';
  }
  return 'text-blue-600 dark:text-sky-300';
};

const PREDICTION_SCHEDULE_INITIAL_RECT = { width: 920, height: 640 };
const MOBILE_DATE_SHEET_SIZE = 7;

const getCompactDateLabel = (dateKey: string) => {
  const date = parsePredictionScheduleDateKey(dateKey);
  if (!date) {
    return formatDate(dateKey);
  }

  const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${date.getMonth() + 1}.${date.getDate()}(${weekday})`;
};

const getDateSheetMonthLabel = (dateKey: string) => {
  const date = parsePredictionScheduleDateKey(dateKey);
  if (!date) {
    return getPredictionScheduleMonthTitle(dateKey);
  }

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
};

const getMobileDateSheetItems = (items: ReturnType<typeof buildPredictionScheduleDateRail>) => {
  if (items.length <= MOBILE_DATE_SHEET_SIZE) {
    return items;
  }

  const selectedIndex = Math.max(0, items.findIndex((item) => item.isSelected));
  const maxStartIndex = Math.max(0, items.length - MOBILE_DATE_SHEET_SIZE);
  const startIndex = Math.min(Math.max(0, selectedIndex - 3), maxStartIndex);
  return items.slice(startIndex, startIndex + MOBILE_DATE_SHEET_SIZE);
};

const getDateSheetFocusableElements = (container: HTMLElement | null) => {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
};

export default function PredictionMatchPreviewTab({
  currentDateGames,
  currentDate,
  nearestNavigationDate,
  isToday,
  onEnterMatchDetail,
  onGoToDate,
  onNearestNavigation,
}: PredictionMatchPreviewTabProps) {
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const selectedDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileDateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileSelectedDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const dateSheetDialogRef = useRef<HTMLDivElement | null>(null);
  const shouldRestoreMobileDateFocusRef = useRef(false);
  const matchListScrollRef = useRef<HTMLDivElement | null>(null);
  const currentDateKey = formatPredictionScheduleDateKey(parsePredictionScheduleDateKey(currentDate) || new Date());
  const monthTitle = getPredictionScheduleMonthTitle(currentDate);
  const currentTime = useCurrentTime(60_000);
  const dateRailItems = useMemo(() => buildPredictionScheduleDateRail(currentDate), [currentDate]);
  const mobileDateSheetItems = useMemo(() => getMobileDateSheetItems(dateRailItems), [dateRailItems]);
  const rowViewModels = useMemo(
    () => currentDateGames.map((game) => ({
      game,
      viewModel: buildPredictionScheduleRowViewModel(game, currentDate, currentTime),
    })),
    [currentDateGames, currentDate, currentTime],
  );

  // Each row has team, status, action, and mobile stadium metadata.
  const ESTIMATED_ROW_HEIGHT = 112;
  const rowVirtualizer = useVirtualizer({
    count: rowViewModels.length,
    getScrollElement: () => matchListScrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    initialRect: PREDICTION_SCHEDULE_INITIAL_RECT,
    overscan: 3,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const renderedRows = virtualRows.length > 0
    ? virtualRows
    : rowViewModels.map((_, index) => ({
      index,
      start: index * ESTIMATED_ROW_HEIGHT,
    }));

  const closeMobileDateSheet = useCallback(() => {
    shouldRestoreMobileDateFocusRef.current = true;
    setIsDateSheetOpen(false);
  }, []);

  useEffect(() => {
    selectedDateButtonRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
    });
  }, [currentDateKey]);

  useEffect(() => {
    if (!isDateSheetOpen) {
      if (shouldRestoreMobileDateFocusRef.current) {
        shouldRestoreMobileDateFocusRef.current = false;
        mobileDateTriggerRef.current?.focus();
      }
      return;
    }

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileDateSheet();
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    (mobileSelectedDateButtonRef.current ?? dateSheetDialogRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [closeMobileDateSheet, isDateSheetOpen, currentDateKey]);

  const handleMonthMove = (monthOffset: number) => {
    onGoToDate(resolvePredictionScheduleMonthDate(currentDate, monthOffset));
  };

  const handleDateInputChange = (value: string) => {
    if (parsePredictionScheduleDateKey(value)) {
      onGoToDate(value);
    }
  };

  const handleMobileDateSelect = (date: string) => {
    closeMobileDateSheet();
    onGoToDate(date);
  };

  const handleDateSheetKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = getDateSheetFocusableElements(dateSheetDialogRef.current);
    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div className="w-full font-sans" data-testid="prediction-schedule-preview">
      <div
        data-testid="prediction-schedule-toolbar"
        className="mb-4 text-slate-900 dark:text-white"
      >
        <div className="flex items-center gap-2 md:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="prediction-schedule-mobile-today-btn"
            className="h-10 rounded-xl border-slate-200 bg-white px-3 text-13 font-extrabold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-border dark:bg-card dark:text-white"
            onClick={() => onGoToDate(getPredictionScheduleTodayKey())}
          >
            최근
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-12 font-bold text-slate-500 dark:text-white/70">
              {getDateSheetMonthLabel(currentDateKey)}
            </p>
            <p className="truncate text-17 font-extrabold text-slate-950 dark:text-white">
              KBO리그
            </p>
          </div>
          <button
            ref={mobileDateTriggerRef}
            type="button"
            aria-label="경기 날짜 선택"
            aria-haspopup="dialog"
            aria-expanded={isDateSheetOpen}
            aria-controls="prediction-mobile-date-sheet"
            data-testid="prediction-schedule-mobile-date-trigger"
            className={`${PREDICTION_BRAND_BUTTON_CLASS} inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-13 font-extrabold shadow-sm`}
            onClick={() => setIsDateSheetOpen(true)}
          >
            {getCompactDateLabel(currentDateKey)}
            <SharedCalendarDaysIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden flex-wrap items-center justify-center gap-2 md:flex sm:gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="prediction-schedule-today-btn"
            className="h-11 rounded-full border-slate-200 bg-white px-4 text-15 font-bold text-slate-500 shadow-sm hover:bg-slate-50 dark:border-border dark:bg-card dark:text-white sm:px-5"
            onClick={() => onGoToDate(getPredictionScheduleTodayKey())}
          >
            최근
          </Button>
          <button
            type="button"
            aria-label="이전 달 보기"
            data-testid="prediction-schedule-month-prev"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white hover:shadow-sm dark:text-white dark:hover:bg-secondary"
            onClick={() => handleMonthMove(-1)}
          >
            <PredictionChevronLeftIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
          <p
            key={monthTitle}
            data-testid="prediction-schedule-month-title"
            className="min-w-[8.5rem] animate-fade-in-up text-center text-[2.35rem] font-black leading-none tracking-normal text-slate-900 motion-reduce:animate-none dark:text-white sm:min-w-[10.5rem] sm:text-5xl"
          >
            {monthTitle}
          </p>
          <button
            type="button"
            aria-label="다음 달 보기"
            data-testid="prediction-schedule-month-next"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-white hover:shadow-sm dark:text-white dark:hover:bg-secondary"
            onClick={() => handleMonthMove(1)}
          >
            <PredictionChevronRightIcon className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
          <label className="relative inline-flex h-11 cursor-pointer items-center justify-center overflow-hidden rounded-full px-3 text-slate-700 transition-colors hover:bg-white hover:shadow-sm dark:text-white dark:hover:bg-secondary sm:px-4">
            <span className="sr-only">날짜 선택</span>
            <SharedCalendarDaysIcon className="h-6 w-6" />
            <input
              type="date"
              value={currentDateKey}
              aria-label="경기 날짜 선택"
              data-testid="prediction-schedule-date-input"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(event) => handleDateInputChange(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="relative -mx-4 mb-8 hidden sm:-mx-6 md:block">
        <div
          data-testid="prediction-schedule-date-rail"
          className="overflow-x-auto px-4 sm:px-6"
        >
          <div className="flex min-w-[60rem] items-end justify-between gap-5 border-b border-slate-200 dark:border-border">
            {dateRailItems.map((item) => (
              <button
                key={item.date}
                ref={item.isSelected ? selectedDateButtonRef : undefined}
                type="button"
                data-testid="prediction-schedule-date-button"
                data-date={item.date}
                aria-pressed={item.isSelected}
                aria-label={`${item.date} 경기 일정 보기`}
                className={`min-h-11 min-w-[4.85rem] border-b-[5px] px-2 pb-3 text-center transition-[border-color,color,transform] duration-200 ease-out motion-reduce:transition-none ${
                  item.isSelected
                    ? '-translate-y-1 border-blue-500 text-blue-500 motion-reduce:translate-y-0'
                    : 'border-transparent text-slate-800 hover:border-slate-300 hover:text-slate-950 dark:text-white dark:hover:border-gray-500'
                }`}
                onClick={() => onGoToDate(item.date)}
              >
                <span className={`block text-body font-black ${item.isToday ? 'text-blue-500' : ''}`}>
                  {item.isToday ? '오늘' : item.weekday}
                </span>
                <span className="mt-1 block text-3xl font-black leading-none">
                  {item.day}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div
          aria-hidden="true"
          data-testid="prediction-schedule-date-rail-fade"
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background via-background/90 to-transparent dark:from-background dark:via-background/90"
        />
      </div>

      <Card
        className={`${PREDICTION_SURFACE_CARD_CLASS} overflow-hidden rounded-2xl text-slate-900 dark:text-white`}
        data-testid="prediction-match-preview-root"
      >
        <div className="flex min-h-[4.5rem] items-center justify-between border-b border-slate-100 px-4 dark:border-border sm:px-7">
          <div>
            <h2 className="text-xl font-black tracking-normal sm:text-2xl">KBO리그</h2>
            <p className="mt-1 text-12 font-bold text-slate-500 dark:text-white/60 md:hidden">
              좌우 스와이프로 날짜 이동
            </p>
          </div>
          <span className={`${PREDICTION_SOFT_CHIP_CLASS} rounded-full px-3 py-1 text-12 font-extrabold`}>
            {currentDateGames.length}경기
          </span>
        </div>

        {currentDateGames.length > 0 ? (
          <div className="relative">
            <div
              ref={matchListScrollRef}
              className="max-h-[40rem] overflow-x-hidden overflow-y-auto lg:overflow-x-auto"
              data-testid="prediction-schedule-match-list"
              tabIndex={0}
              aria-label="경기 일정 가로 스크롤 영역"
            >
              {/* Virtual container: total height drives the scrollbar */}
              <div
                className="relative min-w-0 lg:min-w-[920px] lg:pr-16"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {renderedRows.map((virtualItem) => {
                  const { game, viewModel } = rowViewModels[virtualItem.index];
                  const compactScoreLabel = viewModel.status.scoreLabel?.replace(/\s+/g, '') || '';

                  return (
                    <div
                      key={game.gameId}
                      data-index={virtualItem.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      {/* Divider between rows */}
                      {virtualItem.index > 0 && (
                        <div className="border-t border-slate-200 dark:border-border" />
                      )}
                      <div
                        data-testid="prediction-schedule-match-row"
                        data-game-id={game.gameId}
                        aria-label={viewModel.ariaLabel}
                        className="grid min-h-[7rem] animate-fade-in-up grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] items-center gap-1 px-2 py-3 motion-reduce:animate-none sm:grid-cols-[4.25rem_minmax(0,1fr)_4.25rem] sm:gap-3 sm:px-4 lg:grid-cols-[5rem_minmax(8rem,10rem)_minmax(28rem,1fr)_11rem] lg:gap-4 lg:px-6 lg:py-4"
                      >
                        <div className="min-w-0 lg:hidden">
                          <p className="text-13 font-black leading-tight tabular-nums text-slate-900 dark:text-white sm:text-15">
                            {viewModel.startTimeLabel}
                          </p>
                        </div>
                        <div className="hidden text-lg font-black tabular-nums text-slate-900 dark:text-white lg:block">
                          {viewModel.startTimeLabel}
                        </div>
                        <div className="hidden min-w-0 whitespace-normal break-keep text-body font-bold leading-snug text-slate-500 dark:text-white lg:block">
                          {viewModel.stadiumLabel}
                        </div>
                        <div
                          className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] items-center gap-1 sm:grid-cols-[minmax(0,1fr)_3.25rem_minmax(0,1fr)] sm:gap-2 lg:grid-cols-[minmax(10rem,1fr)_6.25rem_minmax(10rem,1fr)] lg:gap-3"
                          data-testid="prediction-schedule-matchup"
                        >
                          <div className="flex min-h-12 min-w-0 items-center justify-end gap-1 sm:min-h-14 sm:gap-2 lg:min-h-[3.75rem] lg:gap-3">
                            <div className="min-w-0 text-right">
                              <p
                                className="truncate text-13 font-black leading-tight text-slate-900 dark:text-white sm:text-15 lg:text-xl"
                                aria-label={viewModel.awayTeam.fullName}
                              >
                                {viewModel.awayTeam.shortName}
                              </p>
                              <p className="truncate text-10 font-semibold leading-tight text-slate-500 dark:text-white sm:text-xs lg:text-body">
                                {viewModel.awayTeam.pitcherName}
                              </p>
                            </div>
                            {renderScheduleTeamLogo(viewModel.awayTeam.rawName, 'away', viewModel.winnerSide)}
                          </div>
                          <div className={`text-center text-12 font-black sm:text-sm lg:text-lg ${getStatusToneClass(viewModel.status.tone)}`}>
                            {viewModel.status.hasScore ? (
                              <span
                                className="inline-flex min-w-[2.5rem] items-center justify-center rounded-md bg-slate-100 px-1 py-1 text-slate-900 tabular-nums dark:bg-secondary dark:text-white sm:min-w-[3.25rem] sm:px-2 lg:min-w-[5.5rem] lg:rounded-full lg:px-3 lg:py-1.5"
                                aria-label={`${viewModel.status.label} ${viewModel.status.scoreLabel}`}
                              >
                                <span className="lg:hidden">{compactScoreLabel}</span>
                                <span className="hidden lg:inline">{viewModel.status.scoreLabel}</span>
                              </span>
                            ) : (
                              viewModel.status.label
                            )}
                          </div>
                          <div className="flex min-h-12 min-w-0 items-center gap-1 sm:min-h-14 sm:gap-2 lg:min-h-[3.75rem] lg:gap-3">
                            {renderScheduleTeamLogo(viewModel.homeTeam.rawName, 'home', viewModel.winnerSide)}
                            <div className="min-w-0">
                              <p
                                className="flex min-w-0 items-center gap-0.5 text-13 font-black leading-tight text-slate-900 dark:text-white sm:text-15 lg:gap-1.5 lg:text-xl"
                                aria-label={viewModel.homeTeam.fullName}
                              >
                                <span className="truncate">{viewModel.homeTeam.shortName}</span>
                                <span className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded bg-slate-400 px-0.5 text-10 font-black text-white sm:h-5 sm:min-w-5 sm:text-11 lg:h-6 lg:min-w-6 lg:rounded-md lg:px-1 lg:text-caption">
                                  홈
                                </span>
                              </p>
                              <p className="truncate text-10 font-semibold leading-tight text-slate-500 dark:text-white sm:text-xs lg:text-body">
                                {viewModel.homeTeam.pitcherName}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="sticky right-0 z-20 flex justify-end bg-white pl-1 dark:bg-card lg:static lg:bg-transparent lg:pl-0">
                          {viewModel.canEnterDetail ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              data-testid="prediction-match-enter-detail-btn"
                              className="h-8 min-w-10 rounded-lg border-slate-200 bg-white px-2 text-12 font-black text-primary dark:border-border dark:bg-card dark:text-primary-light dark:hover:bg-secondary hover:bg-emerald-50 sm:h-9 sm:min-w-[3.5rem] sm:text-caption lg:h-10 lg:min-w-[4.5rem] lg:px-4 lg:text-body"
                              onClick={() => onEnterMatchDetail(game)}
                            >
                              전력
                            </Button>
                          ) : null}
                        </div>
                        <div
                          data-testid="prediction-schedule-stadium-meta"
                          className="col-span-3 min-w-0 whitespace-normal break-keep rounded-md bg-slate-50 px-2 py-1 text-center text-11 font-bold leading-snug text-slate-500 dark:bg-white/[0.03] dark:text-white sm:text-13 lg:hidden"
                        >
                          {viewModel.stadiumLabel}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className={`${PREDICTION_BRAND_GRADIENT_CLASS} relative flex min-h-[15rem] flex-col items-center justify-start overflow-hidden px-5 py-7 text-center sm:min-h-[18rem] sm:justify-center sm:py-10`}>
            <svg viewBox="0 0 400 220" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <path d="M200 210 L80 120 L200 30 L320 120 Z" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.5" />
              <path d="M30 230 A200 200 0 0 1 370 230" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1.5" />
            </svg>
            <div className="relative mb-3 rounded-full border border-white/20 bg-white/10 p-3 sm:mb-4 sm:p-4">
              <PredictionTrendingUpIcon className="h-6 w-6 text-emerald-200 sm:h-8 sm:w-8" />
            </div>
            <p className="relative mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-12 font-extrabold text-emerald-100">
              {formatDate(currentDate)}
            </p>
            <h3 className="relative mb-2 text-20 font-black tracking-normal text-white">
              {isToday ? '오늘은 그라운드가 쉬는 날이에요' : '예정된 경기 일정이 없습니다'}
            </h3>
            <p className="relative max-w-md text-13 font-medium leading-relaxed text-white/75 sm:text-body">
              {nearestNavigationDate
                ? `가장 가까운 경기일은 ${formatDate(nearestNavigationDate.date)}입니다. ${nearestNavigationDate.isPast ? '이전' : '다음'} 날짜로 이동해 확인해보세요.`
                : '다른 날짜를 확인해보세요.'}
            </p>
            {nearestNavigationDate ? (
              <Button
                type="button"
                variant="outline"
                data-testid="prediction-empty-nearest-date-btn"
                className="relative mt-5 min-h-11 w-full max-w-xs border-0 bg-white text-primary-dark shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] hover:bg-emerald-50"
                onClick={onNearestNavigation}
              >
                {nearestNavigationDate.isPast ? '이전 경기 결과 보기' : '다음 경기 예측하러 가기'}
              </Button>
            ) : null}
          </div>
        )}
      </Card>

      {isDateSheetOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="날짜 선택 닫기"
            className="absolute inset-0 w-full bg-slate-950/45"
            onClick={closeMobileDateSheet}
          />
          <div
            id="prediction-mobile-date-sheet"
            ref={dateSheetDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prediction-mobile-date-sheet-title"
            aria-describedby="prediction-mobile-date-sheet-description"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 rounded-t-20 bg-white px-4 pb-5 pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.25)] outline-none dark:bg-card"
            onKeyDown={handleDateSheetKeyDown}
          >
            <span className="mx-auto block h-1 w-11 rounded-full bg-slate-200 dark:bg-border" />
            <div className="mt-3 flex items-center justify-between">
              <span
                id="prediction-mobile-date-sheet-title"
                className="text-15 font-extrabold text-slate-950 dark:text-white"
              >
                {getDateSheetMonthLabel(currentDateKey)}
              </span>
              <p id="prediction-mobile-date-sheet-description" className="sr-only">
                날짜를 선택하면 해당 날짜의 KBO 경기 일정으로 이동합니다.
              </p>
              <button
                type="button"
                aria-label="날짜 선택 닫기"
                data-testid="prediction-schedule-mobile-date-close"
                className="rounded-full px-2 py-1 text-xl font-bold leading-none text-slate-400 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 dark:text-white/60 dark:hover:bg-secondary"
                onClick={closeMobileDateSheet}
              >
                x
              </button>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1">
              {mobileDateSheetItems.map((item) => (
                <button
                  key={item.date}
                  ref={item.isSelected ? mobileSelectedDateButtonRef : undefined}
                  type="button"
                  data-testid="prediction-schedule-mobile-date-button"
                  data-date={item.date}
                  aria-pressed={item.isSelected}
                  aria-label={`${item.date} 경기 일정 보기${item.isToday ? ', 오늘' : ''}${item.isSelected ? ', 선택됨' : ''}`}
                  className={`flex min-h-[58px] flex-col items-center justify-center rounded-xl border px-1 transition-colors ${
                    item.isSelected
                      ? 'border-primary bg-emerald-50 text-primary-dark'
                      : item.isToday
                        ? 'border-emerald-100 bg-white text-emerald-700'
                        : 'border-slate-100 bg-slate-50 text-slate-600'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-300`}
                  onClick={() => handleMobileDateSelect(item.date)}
                >
                  <span className="text-11 font-bold">{item.weekday}</span>
                  <span className="mt-1 text-17 font-black leading-none">{item.day}</span>
                  <span className={`mt-1 text-9 font-black ${item.isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {item.isToday ? '오늘' : item.isSelected ? '선택' : ''}
                  </span>
                </button>
              ))}
            </div>
            <Button
              type="button"
              aria-label="오늘 경기 일정으로 이동"
              variant="brand"
              className="mt-4 min-h-11 w-full"
              onClick={() => handleMobileDateSelect(getPredictionScheduleTodayKey())}
            >
              오늘로 이동
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
