import type { GameRelayEvent } from '../../types/prediction';
import {
  isManualBaseballDataRequiredCode,
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
} from '../../utils/errorUtils';
import { PREDICTION_MANUAL_LIVE_RELAY_MESSAGE } from '../../utils/predictionManualDataCopy';
import { PredictionWarningTriangleIcon, PredictionZapIcon } from './PredictionShellIcons';

interface LiveRelayTimelineProps {
  events: GameRelayEvent[];
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

const formatInningLabel = (event: GameRelayEvent): string => {
  const inning = event.inning == null ? null : `${event.inning}회`;
  const rawHalf = event.inningHalf?.trim();
  const half = rawHalf ? HALF_LABELS[rawHalf.toUpperCase()] ?? rawHalf : null;
  if (inning && half) {
    return `${inning} ${half}`;
  }
  return inning || half || '이닝 정보 없음';
};

const formatUpdatedAt = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const buildMetaItems = (event: GameRelayEvent): string[] => {
  const items = [
    event.pitcherName ? `투수 ${event.pitcherName}` : null,
    event.batterName ? `타자 ${event.batterName}` : null,
  ];

  return items.filter((item): item is string => Boolean(item));
};

export function LiveRelayTimeline({
  events,
  errorMessage = null,
  errorCode = null,
  maxEvents = 20,
}: LiveRelayTimelineProps) {
  const displayEvents = events.slice(-maxEvents).reverse();
  const isManualRelayError = isManualBaseballDataRequiredCode(errorCode);

  if (displayEvents.length === 0 && !errorMessage) {
    return null;
  }

  return (
    <section data-testid="prediction-live-relay-timeline">
      <div className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
          <PredictionZapIcon className="h-3.5 w-3.5" />
        </span>
        문자중계
        {displayEvents.length > 0 ? (
          <span className="ml-auto rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[13px] font-bold text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-200">
            최신 {displayEvents.length}개
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <div
          data-testid="prediction-live-relay-warning"
          data-error-code={errorCode || undefined}
          className="mb-3 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-3 text-[15px] text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100"
        >
          <div className="flex items-start gap-2">
            <PredictionWarningTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold leading-relaxed">
                {isManualRelayError ? '문자중계 데이터 준비가 필요합니다.' : errorMessage}
              </p>
              {isManualRelayError ? (
                <>
                  <p className="mt-1 leading-relaxed">{PREDICTION_MANUAL_LIVE_RELAY_MESSAGE}</p>
                  <p className="mt-2 inline-flex w-fit rounded border border-amber-300/70 bg-amber-100/70 px-2 py-0.5 font-mono text-[13px] text-amber-900 dark:border-amber-300/50 dark:bg-amber-900/30 dark:text-amber-100">
                    {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {displayEvents.length > 0 ? (
        <div className="relative">
          <span className="absolute left-3 top-1 bottom-1 z-0 w-px bg-rose-100 dark:bg-rose-900/45" />
          <div className="space-y-3">
            {displayEvents.map((event, index) => {
              const metaItems = buildMetaItems(event);
              const updatedAt = formatUpdatedAt(event.updatedAt ?? event.createdAt);
              const resultLabel = event.result || event.eventType || null;

              return (
                <div key={`${event.relayId ?? 'relay'}-${index}`} className="relative">
                  <span className="absolute left-3 top-4 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-rose-500 bg-white shadow-[0_0_0_5px_rgba(244,63,94,0.12)] dark:bg-background" />
                  <div className="ml-6 rounded-lg border border-gray-100 bg-white px-3 py-2.5 shadow-sm dark:border-border dark:bg-secondary/40">
                    <div className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-gray-500 dark:text-gray-300">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700 dark:bg-border/60 dark:text-gray-100">
                        {formatInningLabel(event)}
                      </span>
                      {resultLabel ? <span>{resultLabel}</span> : null}
                      {updatedAt ? <span className="ml-auto font-mono">{updatedAt}</span> : null}
                    </div>
                    <p className="mt-2 text-[16px] font-semibold leading-relaxed text-gray-900 dark:text-gray-100">
                      {event.playDescription || '문자중계 내용이 비어 있습니다.'}
                    </p>
                    {metaItems.length > 0 ? (
                      <p className="mt-1.5 text-[14px] font-medium text-gray-500 dark:text-gray-300">
                        {metaItems.join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
