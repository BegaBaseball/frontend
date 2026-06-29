import { type CSSProperties, type PointerEvent, useRef, useState } from 'react';

import {
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
} from '../../utils/errorUtils';
import {
  PREDICTION_MANUAL_LIVE_SCORE_MESSAGE,
  PREDICTION_MANUAL_SCOREBOARD_MESSAGE,
} from '../../utils/predictionManualDataCopy';
import { PredictionWarningTriangleIcon } from './PredictionShellIcons';

type InningRows = Record<number, { away?: number | null; home?: number | null }>;

type PredictionScoreboardSectionProps = {
  headingTextStyle: CSSProperties;
  awayTeamNameStyle: CSSProperties;
  homeTeamNameStyle: CSSProperties;
  liveStatusError: string | null;
  liveStatusErrorCode: string | null;
  isManualLiveStatusError: boolean;
  shouldShowManualScoreboardState: boolean;
  inningRows: InningRows;
  awayTeamName: string;
  homeTeamName: string;
  awayScoreForDisplay: number | string;
  homeScoreForDisplay: number | string;
};

const inningTableClassName = 'min-w-[580px] w-full table-fixed border-collapse text-center text-body';
const inningTeamHeaderClassName = 'w-[112px] whitespace-nowrap px-2 py-2 text-left font-bold';
const inningHeaderCellClassName = 'whitespace-nowrap px-2 py-2 border-l border-gray-200 dark:border-border/70';
const inningRunHeaderClassName = 'whitespace-nowrap px-2 py-2 border-l border-gray-200 dark:border-border font-bold text-red-600';
const inningTeamCellBaseClassName = 'w-[112px] whitespace-nowrap px-2 py-2 text-left font-bold bg-gray-50/70 dark:bg-secondary/30';
const inningCellClassName = 'whitespace-nowrap px-2 py-2 border-l border-gray-100 dark:border-border/60';
const inningRunCellClassName = 'whitespace-nowrap px-2 py-2 border-l border-gray-200 dark:border-border font-bold text-red-600 bg-red-50/40 dark:bg-red-900/20';

export default function PredictionScoreboardSection({
  headingTextStyle,
  awayTeamNameStyle,
  homeTeamNameStyle,
  liveStatusError,
  liveStatusErrorCode,
  isManualLiveStatusError,
  shouldShowManualScoreboardState,
  inningRows,
  awayTeamName,
  homeTeamName,
  awayScoreForDisplay,
  homeScoreForDisplay,
}: PredictionScoreboardSectionProps) {
  const [inningPage, setInningPage] = useState(0);
  const inningPointerStartXRef = useRef<number | null>(null);
  const inningKeys = Object.keys(inningRows).map(Number).sort((a, b) => a - b);
  const regularInnings = inningKeys.filter((inning) => inning <= 9);
  const extraInnings = inningKeys.filter((inning) => inning > 9);
  const regularInningCols = regularInnings.length
    ? regularInnings
    : Array.from({ length: 9 }, (_, index) => index + 1);
  const extraInningCols = extraInnings;
  const hasExtraInnings = extraInnings.length > 0;

  const handleInningSwipeOffset = (offsetX: number) => {
    if (!hasExtraInnings) return;
    if (offsetX < -50 && inningPage === 0) {
      setInningPage(1);
    }
    if (offsetX > 50 && inningPage === 1) {
      setInningPage(0);
    }
  };

  const handleInningPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    inningPointerStartXRef.current = event.clientX;
  };

  const handleInningPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (inningPointerStartXRef.current == null) {
      return;
    }

    const offsetX = event.clientX - inningPointerStartXRef.current;
    inningPointerStartXRef.current = null;
    handleInningSwipeOffset(offsetX);
  };

  const clearInningPointerStart = () => {
    inningPointerStartXRef.current = null;
  };

  return (
    <section>
      <div
        className="mb-3 flex items-center gap-2 text-body font-bold text-gray-900 dark:text-white"
        style={headingTextStyle}
      >
        <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
        스코어보드
        {hasExtraInnings ? (
          <span className="ml-auto text-body text-gray-400">
            {inningPage === 0 ? '연장이닝 보기 →' : '← 정규이닝 보기'}
          </span>
        ) : null}
      </div>
      {liveStatusError ? (
        <div
          data-testid="prediction-scoreboard-live-status-warning"
          data-error-code={liveStatusErrorCode || undefined}
          className="mb-3 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-3 text-15 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100"
        >
          <div className="flex items-start gap-2">
            <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold">
                {isManualLiveStatusError
                  ? '실시간 점수/이닝 데이터 준비가 필요합니다.'
                  : '실시간 점수 갱신 상태를 확인 중입니다.'}
              </p>
              <p className="mt-1 leading-relaxed">
                {isManualLiveStatusError ? PREDICTION_MANUAL_LIVE_SCORE_MESSAGE : liveStatusError}
              </p>
              {isManualLiveStatusError ? (
                <p className="mt-2 inline-flex w-fit rounded border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 font-mono text-13 text-amber-900 dark:border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100">
                  {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div
        data-testid="prediction-scoreboard"
        className="overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-border dark:bg-secondary/40"
      >
        {shouldShowManualScoreboardState ? (
          <div
            data-testid="prediction-scoreboard-manual-required"
            className="flex items-start gap-2 px-4 py-4 text-body text-amber-800 dark:text-amber-200"
          >
            <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold">스코어보드 상세 입력 대기</p>
              <p className="mt-1 leading-relaxed">{PREDICTION_MANUAL_SCOREBOARD_MESSAGE}</p>
              <p className="mt-2 inline-flex w-fit rounded border border-amber-300/70 bg-amber-50 px-2 py-0.5 font-mono text-13 text-amber-900 dark:border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100">
                {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
              </p>
            </div>
          </div>
        ) : hasExtraInnings ? (
          <div
            className="overflow-hidden"
            onPointerDown={handleInningPointerDown}
            onPointerUp={handleInningPointerUp}
            onPointerCancel={clearInningPointerStart}
            style={{ touchAction: 'pan-y' }}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${inningPage * 100}%)` }}
            >
              {[regularInningCols, extraInningCols].map((cols, index) => (
                <div key={index} className="min-w-full overflow-x-auto px-3 py-3">
                  <ScoreboardTable
                    cols={cols}
                    inningRows={inningRows}
                    awayTeamName={awayTeamName}
                    homeTeamName={homeTeamName}
                    awayTeamNameStyle={awayTeamNameStyle}
                    homeTeamNameStyle={homeTeamNameStyle}
                    awayScoreForDisplay={awayScoreForDisplay}
                    homeScoreForDisplay={homeScoreForDisplay}
                    suffix={index === 0 ? '' : '-extra-page'}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-2">
              {[0, 1].map((page) => (
                <button
                  type="button"
                  key={page}
                  aria-label={page === 0 ? '정규 이닝 보기' : '연장 이닝 보기'}
                  onClick={() => setInningPage(page)}
                  className={`h-2 w-2 rounded-full ${inningPage === page ? 'bg-gray-800 dark:bg-gray-100' : 'bg-gray-200 dark:bg-border'}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto px-3 py-3">
            <ScoreboardTable
              cols={regularInningCols}
              inningRows={inningRows}
              awayTeamName={awayTeamName}
              homeTeamName={homeTeamName}
              awayTeamNameStyle={awayTeamNameStyle}
              homeTeamNameStyle={homeTeamNameStyle}
              awayScoreForDisplay={awayScoreForDisplay}
              homeScoreForDisplay={homeScoreForDisplay}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ScoreboardTable({
  cols,
  inningRows,
  awayTeamName,
  homeTeamName,
  awayTeamNameStyle,
  homeTeamNameStyle,
  awayScoreForDisplay,
  homeScoreForDisplay,
  suffix = '',
}: {
  cols: number[];
  inningRows: InningRows;
  awayTeamName: string;
  homeTeamName: string;
  awayTeamNameStyle: CSSProperties;
  homeTeamNameStyle: CSSProperties;
  awayScoreForDisplay: number | string;
  homeScoreForDisplay: number | string;
  suffix?: string;
}) {
  return (
    <table className={inningTableClassName}>
      <thead className="border-b border-gray-200 bg-gray-100 text-body text-gray-600 dark:border-border dark:bg-border/60 dark:text-white">
        <tr>
          <th className={inningTeamHeaderClassName}>팀</th>
          {cols.map((inning) => (
            <th key={inning} className={inningHeaderCellClassName}>{inning}</th>
          ))}
          <th className={inningRunHeaderClassName}>R</th>
        </tr>
      </thead>
      <tbody className="text-gray-700 dark:text-white">
        <tr className="border-b border-gray-100 bg-white transition-colors hover:bg-emerald-50/50 dark:border-border/70 dark:bg-card dark:hover:bg-secondary/50">
          <td className={inningTeamCellBaseClassName} style={awayTeamNameStyle}>
            {awayTeamName}
          </td>
          {cols.map((inning) => (
            <td
              key={`away-${inning}`}
              data-testid={`prediction-scoreboard-cell-away-${inning}`}
              className={inningCellClassName}
            >
              {inningRows[inning]?.away ?? '-'}
            </td>
          ))}
          <td
            data-testid={`prediction-scoreboard-total-away${suffix}`}
            className={inningRunCellClassName}
          >
            {awayScoreForDisplay}
          </td>
        </tr>
        <tr className="border-b border-gray-100 bg-gray-50/70 transition-colors hover:bg-emerald-50/50 dark:border-border/70 dark:bg-secondary/50 dark:hover:bg-secondary/60">
          <td className={inningTeamCellBaseClassName} style={homeTeamNameStyle}>
            {homeTeamName}
          </td>
          {cols.map((inning) => (
            <td
              key={`home-${inning}`}
              data-testid={`prediction-scoreboard-cell-home-${inning}`}
              className={inningCellClassName}
            >
              {inningRows[inning]?.home ?? '-'}
            </td>
          ))}
          <td
            data-testid={`prediction-scoreboard-total-home${suffix}`}
            className={inningRunCellClassName}
          >
            {homeScoreForDisplay}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
