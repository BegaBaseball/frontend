import { Button } from '../ui/button';
import { Card } from '../ui/card';
import type { Game } from '../../types/prediction';
import { getFullTeamName } from '../../constants/teams';
import { formatDate } from '../../utils/predictionDates';
import { getGameStatus } from '../../utils/predictionStatus';
import {
  PredictionChevronLeftIcon,
  PredictionChevronRightIcon,
  PredictionTrendingUpIcon,
} from './PredictionShellIcons';

interface PredictionMatchPreviewTabProps {
  currentDateGames: Game[];
  currentDate: string;
  currentGame: Game | null;
  canMovePrevDate: boolean;
  canMoveNextDate: boolean;
  nearestNavigationDate: { date: string; isPast: boolean } | null;
  isToday: boolean;
  onEnterMatchDetail: () => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onNearestNavigation: () => void;
}

export default function PredictionMatchPreviewTab({
  currentDateGames,
  currentDate,
  currentGame,
  canMovePrevDate,
  canMoveNextDate,
  nearestNavigationDate,
  isToday,
  onEnterMatchDetail,
  onPrevDate,
  onNextDate,
  onNearestNavigation,
}: PredictionMatchPreviewTabProps) {
  const gameStatus = getGameStatus(currentGame, new Date(), {
    gameDate: currentGame?.gameDate || currentDate,
    startTime: null,
    homeScore: currentGame?.homeScore ?? null,
    awayScore: currentGame?.awayScore ?? null,
    hasProgressData: false,
  });
  const awayTeamName = currentGame?.awayTeam ? getFullTeamName(currentGame.awayTeam) : '';
  const homeTeamName = currentGame?.homeTeam ? getFullTeamName(currentGame.homeTeam) : '';

  return (
    <>
      <div className="flex md:hidden items-center justify-between mb-3 px-4">
        <button
          type="button"
          onClick={onPrevDate}
          disabled={!canMovePrevDate}
          aria-label="이전 날짜 보기"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30"
        >
          <PredictionChevronLeftIcon size={24} className="text-emerald-600 dark:text-emerald-300" />
        </button>
        <span className="font-bold text-slate-900 dark:text-gray-100">
          {formatDate(currentDate)}
        </span>
        <button
          type="button"
          onClick={onNextDate}
          disabled={!canMoveNextDate}
          aria-label="다음 날짜 보기"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30"
        >
          <PredictionChevronRightIcon size={24} className="text-emerald-600 dark:text-emerald-300" />
        </button>
      </div>

      <div className="w-full">
        {currentDateGames.length > 0 ? (
          <Card className="relative p-4 sm:p-6 md:p-7 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md flex flex-col items-center justify-center min-h-[190px] rounded-2xl">
            {currentGame ? (
              <>
                <div className="mb-3">
                  <p className="text-lg font-bold text-slate-900 dark:text-gray-100">
                    {awayTeamName} vs {homeTeamName}
                  </p>
                  <p className="text-[16px] text-slate-500 dark:text-gray-300 mt-1">
                    {gameStatus.statusLabel}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-10 bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-white"
                  onClick={onEnterMatchDetail}
                >
                  경기 상세 보기
                </Button>
              </>
            ) : (
              <p className="text-lg font-bold text-slate-900 dark:text-gray-100">
                {formatDate(currentDate)}
              </p>
            )}

            <div className="hidden md:block">
              <button
                type="button"
                onClick={onPrevDate}
                disabled={!canMovePrevDate}
                aria-label="이전 날짜 보기"
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-gray-300 transition-colors"
              >
                <PredictionChevronLeftIcon size={36} />
              </button>
              <button
                type="button"
                onClick={onNextDate}
                disabled={!canMoveNextDate}
                aria-label="다음 날짜 보기"
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-gray-300 transition-colors"
              >
                <PredictionChevronRightIcon size={36} />
              </button>
            </div>
          </Card>
        ) : (
          <Card className="relative p-4 sm:p-6 md:p-7 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md flex flex-col items-center justify-center min-h-[170px] sm:min-h-[210px] md:min-h-[250px] rounded-2xl">
            <div className="hidden md:block">
              <button
                type="button"
                onClick={onPrevDate}
                disabled={!canMovePrevDate}
                aria-label="이전 날짜 보기"
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-gray-300 transition-colors"
              >
                <PredictionChevronLeftIcon size={36} />
              </button>
              <button
                type="button"
                onClick={onNextDate}
                disabled={!canMoveNextDate}
                aria-label="다음 날짜 보기"
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-gray-300 transition-colors"
              >
                <PredictionChevronRightIcon size={36} />
              </button>
            </div>

            <div className="bg-slate-100 dark:bg-card p-4 rounded-full mb-4">
              <PredictionTrendingUpIcon className="w-8 h-8 text-slate-400 dark:text-gray-300" />
            </div>
            <div className="mb-4">
              <p className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-1">
                {formatDate(currentDate)}
              </p>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-gray-100 mb-2">
              {isToday ? '오늘은 예정된 경기가 없습니다.' : '예정된 경기 일정이 없습니다.'}
            </h3>
            <p className="text-slate-500 dark:text-gray-300">
              {nearestNavigationDate
                ? `가장 가까운 경기일은 ${formatDate(nearestNavigationDate.date)}입니다. ${nearestNavigationDate.isPast ? '이전' : '다음'} 날짜로 이동해 확인해보세요!`
                : '다른 날짜를 확인해보세요!'}
            </p>
            {nearestNavigationDate ? (
              <Button
                type="button"
                variant="outline"
                data-testid="prediction-empty-nearest-date-btn"
                className="mt-3 min-h-10 border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                onClick={onNearestNavigation}
              >
                {nearestNavigationDate.isPast ? '가장 가까운 이전 경기 보기' : '가장 가까운 다음 경기 보기'}
              </Button>
            ) : null}
          </Card>
        )}
      </div>
    </>
  );
}
