import type { GameLiveEvent, GameLiveSnapshot } from '../types/prediction';
import {
  isManualBaseballDataRequiredCode,
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
} from '../utils/errorUtils';

interface CheerLiveEventSummaryProps {
  snapshot: GameLiveSnapshot | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
  maxEvents?: number;
}

const HALF_LABELS: Record<string, string> = {
  TOP: '초',
  T: '초',
  AWAY: '초',
  BOTTOM: '말',
  B: '말',
  HOME: '말',
};

const formatInning = (inning?: number | null, inningHalf?: string | null): string | null => {
  if (inning == null && !inningHalf) return null;
  const half = inningHalf ? HALF_LABELS[inningHalf.trim().toUpperCase()] ?? inningHalf : null;
  return [inning == null ? null : `${inning}회`, half].filter(Boolean).join(' ');
};

const eventKey = (event: GameLiveEvent, index: number) => (
  event.eventSeq == null ? `event-${index}` : `event-${event.eventSeq}`
);

export default function CheerLiveEventSummary({
  snapshot,
  isLoading = false,
  errorMessage = null,
  errorCode = null,
  maxEvents = 5,
}: CheerLiveEventSummaryProps) {
  const events = snapshot?.events.slice(-maxEvents).reverse() ?? [];
  const currentInning = formatInning(snapshot?.currentInning, snapshot?.currentInningHalf);
  const isManualDataRequired = isManualBaseballDataRequiredCode(errorCode);

  return (
    <section className="border-t border-slate-100 px-5 py-5 dark:border-border" data-testid="cheer-live-event-summary">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-body font-black text-slate-900 dark:text-white">실시간 경기 흐름</h3>
        {currentInning ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-caption font-black text-slate-600 dark:bg-secondary dark:text-white">
            {currentInning}
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <div
          className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-caption font-semibold text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100"
          data-error-code={errorCode || undefined}
        >
          <p className="font-black">
            {isManualDataRequired ? '실시간 경기 데이터 준비가 필요합니다.' : errorMessage}
          </p>
          {isManualDataRequired ? (
            <>
              <p className="mt-1 leading-relaxed">내부 game_events 데이터가 준비되지 않아 임의로 채우지 않습니다. 운영자 데이터 입력 후 갱신됩니다.</p>
              <code className="mt-2 inline-flex rounded border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 text-[11px] dark:border-amber-300/50 dark:bg-amber-900/30">
                {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
              </code>
            </>
          ) : null}
        </div>
      ) : null}

      {events.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {events.map((event, index) => (
            <li key={eventKey(event, index)} className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-secondary/60">
              <div className="flex flex-wrap items-center gap-2 text-caption font-black text-slate-500 dark:text-slate-300">
                <span>{formatInning(event.inning, event.inningHalf) || '이닝 정보 없음'}</span>
                {event.resultCode || event.eventType ? <span>{event.resultCode || event.eventType}</span> : null}
              </div>
              <p className="mt-1 text-body font-semibold leading-relaxed text-slate-900 dark:text-white">
                {event.description || '내부 이벤트 설명이 아직 입력되지 않았습니다.'}
              </p>
            </li>
          ))}
        </ol>
      ) : isLoading ? (
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-secondary" />
      ) : !errorMessage ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-caption font-semibold text-slate-500 dark:bg-secondary/60 dark:text-slate-300">
          내부 경기 이벤트가 등록되면 여기에 실시간으로 표시됩니다.
        </p>
      ) : null}
    </section>
  );
}
