import TeamLogo from '../TeamLogo';
import {
  PREDICTION_BRAND_TEXT_CLASS,
  PREDICTION_SOFT_CHIP_CLASS,
  PREDICTION_SURFACE_CARD_CLASS,
} from '../prediction/predictionUiTokens';
import type { SavedPredictionResponse } from '../../types/ranking';
import { RankingCheckIcon } from './RankingPredictionIcons';

interface RankingPredictionResultPanelProps {
  result: SavedPredictionResponse;
}

export default function RankingPredictionResultPanel({ result }: RankingPredictionResultPanelProps) {
  const teamDetails = result.teamDetails ?? [];
  const exactMatchCount = result.exactMatchCount ?? 0;

  return (
    <div
      className={`${PREDICTION_SURFACE_CARD_CLASS} animate-fade-in-up rounded-2xl p-4 motion-reduce:animate-none md:col-span-2 lg:col-span-3`}
      data-testid="ranking-result-panel"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className={`${PREDICTION_BRAND_TEXT_CLASS} text-lg font-extrabold`}>
          {result.seasonYear} 시즌 결과
        </h2>
        <span
          className={`${PREDICTION_SOFT_CHIP_CLASS} rounded-full px-3 py-1 text-body font-bold`}
          data-testid="ranking-result-score"
        >
          {teamDetails.length}개 중 {exactMatchCount}개 적중
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {teamDetails.map((detail, index) => {
          const predictedRank = index + 1;
          const isExactMatch = detail.currentRank === predictedRank;

          return (
            <div
              key={detail.teamId}
              data-testid={`ranking-result-row-${detail.teamId}`}
              className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${
                isExactMatch
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-primary/10'
                  : 'border-slate-200 bg-white dark:border-border dark:bg-card'
              }`}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-body font-black text-slate-600 dark:bg-secondary/40 dark:text-white">
                {predictedRank}
              </div>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 dark:border-border dark:bg-secondary/40">
                <TeamLogo teamId={detail.teamId} size={24} />
              </div>
              <span className="min-w-0 flex-1 truncate font-bold text-slate-900 dark:text-white">
                {detail.teamName}
              </span>
              {isExactMatch ? (
                <RankingCheckIcon
                  className="h-5 w-5 flex-shrink-0 text-primary dark:text-primary-light"
                  aria-label="정확히 적중"
                />
              ) : (
                <span className="flex-shrink-0 text-body font-semibold text-slate-400 dark:text-white/60">
                  실제 {detail.currentRank ?? '-'}위
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
