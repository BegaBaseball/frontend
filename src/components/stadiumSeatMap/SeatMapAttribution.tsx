import type { ReactNode } from 'react';

import type { SeatMapSourceInfo } from './seatMapCommonTypes';

interface SeatMapAttributionProps {
  source: SeatMapSourceInfo;
  secondarySources?: SeatMapSourceInfo[];
  children?: ReactNode;
}

function SourceLink({ source }: { source: SeatMapSourceInfo }) {
  if (!source.sourceUrl) {
    return null;
  }

  return (
    <a
      href={source.sourceUrl}
      target="_blank"
      rel="noreferrer"
      className="ml-1 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-600 dark:hover:text-slate-300"
    >
      출처
    </a>
  );
}

export function SeatMapAttribution({ source, secondarySources = [], children }: SeatMapAttributionProps) {
  return (
    <div className="stadium-seatmap-attribution mt-2 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
      {source.prefixLabel ?? '좌석 배치 기준:'} {source.sourceLabel}
      <SourceLink source={source} />
      {secondarySources.map((secondarySource) => (
        <span key={`${secondarySource.prefixLabel ?? ''}:${secondarySource.sourceLabel}`}>
          <span className="mx-1">·</span>
          {secondarySource.prefixLabel ?? '보조 참고:'} {secondarySource.sourceLabel}
          <SourceLink source={secondarySource} />
        </span>
      ))}
      {source.assetStatus === 'MANUAL_BASEBALL_DATA_REQUIRED' && (
        <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">
          MANUAL_BASEBALL_DATA_REQUIRED
        </span>
      )}
      {children}
    </div>
  );
}
