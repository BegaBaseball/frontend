import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { formatDate } from '../../utils/predictionDates';
import {
  PredictionChevronLeftIcon,
  PredictionChevronRightIcon,
  PredictionTrendingUpIcon,
} from './PredictionShellIcons';
import { PREDICTION_BRAND_GRADIENT_CLASS } from './predictionUiTokens';

interface PredictionMatchTabEmptyStateProps {
  currentDate: string;
  isToday: boolean;
  nearestNavigationDate: { date: string; isPast: boolean } | null;
  canMovePrevDate: boolean;
  canMoveNextDate: boolean;
  onPrevDate: () => void;
  onNextDate: () => void;
  onNearestNavigation: () => void;
}

export default function PredictionMatchTabEmptyState({
  currentDate,
  isToday,
  nearestNavigationDate,
  canMovePrevDate,
  canMoveNextDate,
  onPrevDate,
  onNextDate,
  onNearestNavigation,
}: PredictionMatchTabEmptyStateProps) {
  return (
    <Card className={`${PREDICTION_BRAND_GRADIENT_CLASS} relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-2xl border-0 p-5 text-center shadow-[0_24px_60px_-36px_rgba(16,37,32,0.95)] sm:min-h-[260px] sm:p-7 md:min-h-[300px]`}>
      <svg viewBox="0 0 400 220" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M200 210 L80 120 L200 30 L320 120 Z" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.5" />
        <path d="M30 230 A200 200 0 0 1 370 230" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1.5" />
        <circle cx="200" cy="120" r="26" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1.5" />
      </svg>
      <div className="hidden md:block">
        <button
          type="button"
          onClick={onPrevDate}
          disabled={!canMovePrevDate}
          aria-label="이전 날짜 보기"
          className="absolute left-6 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <PredictionChevronLeftIcon size={36} />
        </button>
        <button
          type="button"
          onClick={onNextDate}
          disabled={!canMoveNextDate}
          aria-label="다음 날짜 보기"
          className="absolute right-6 top-1/2 z-10 -translate-y-1/2 rounded-full p-3 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <PredictionChevronRightIcon size={36} />
        </button>
      </div>

      <div className="relative mb-4 rounded-full border border-white/20 bg-white/10 p-4">
        <PredictionTrendingUpIcon className="h-8 w-8 text-emerald-200" />
      </div>
      <div className="relative mb-3">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-12 font-extrabold text-emerald-100">
          {formatDate(currentDate)}
        </p>
      </div>
      <h3 className="relative mb-2 text-20 font-extrabold tracking-normal text-white">
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
    </Card>
  );
}
