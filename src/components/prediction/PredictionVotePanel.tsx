import type { CSSProperties } from 'react';

import TeamLogo from '../TeamLogo';
import { Button } from '../ui/button';
import type { PredictionUserVoteResolutionState } from '../../hooks/predictionHookShared';
import type { Game, VoteTeam } from '../../types/prediction';
import { getFullTeamName, getTeamColorByAnyKey } from '../../constants/teams';
import {
  PredictionCheckCircleIcon,
  PredictionLoaderIcon,
} from './PredictionShellIcons';
import {
  PREDICTION_SOFT_CHIP_CLASS,
  PREDICTION_SURFACE_CARD_CLASS,
} from './predictionUiTokens';

type PredictionVotePanelProps = {
  game: Game;
  userVote: VoteTeam | null | undefined;
  userVoteResolutionState?: PredictionUserVoteResolutionState;
  votePercentages: { totalVotes: number };
  isDarkMode: boolean;
  isVoteOpen: boolean;
  isVoteActionLocked: boolean;
  isPostponedOrCancelled: boolean;
  onVote: (team: VoteTeam) => void;
};

export default function PredictionVotePanel({
  game,
  userVote,
  userVoteResolutionState = 'resolved',
  votePercentages,
  isDarkMode,
  isVoteOpen,
  isVoteActionLocked,
  isPostponedOrCancelled,
  onVote,
}: PredictionVotePanelProps) {
  const awayTeamName = getFullTeamName(game.awayTeam);
  const homeTeamName = getFullTeamName(game.homeTeam);
  const awayColor = getTeamColorByAnyKey(game.awayTeam);
  const homeColor = getTeamColorByAnyKey(game.homeTeam);
  const isUserVoteResolutionUnknown = userVoteResolutionState === 'unknown-auth';
  const voteButtonTitle = isUserVoteResolutionUnknown
    ? '로그인 상태를 다시 확인한 뒤 예측을 진행해주세요.'
    : undefined;
  const totalVotes = votePercentages.totalVotes;
  const shouldRenderDisabledVote = !isVoteOpen && isPostponedOrCancelled;
  const votePanelTitleId = 'prediction-vote-panel-title';
  const votePanelHelperId = 'prediction-vote-panel-helper';
  const votePanelParticipantsId = 'prediction-vote-panel-participants';

  const voteOptions: Array<{
    team: VoteTeam;
    teamCode: string;
    teamName: string;
    sideLabel: 'AWAY' | 'HOME';
    color: string;
  }> = [
    {
      team: 'away',
      teamCode: game.awayTeam,
      teamName: awayTeamName,
      sideLabel: 'AWAY',
      color: awayColor,
    },
    {
      team: 'home',
      teamCode: game.homeTeam,
      teamName: homeTeamName,
      sideLabel: 'HOME',
      color: homeColor,
    },
  ];
  const selectedVoteOption = voteOptions.find((option) => option.team === userVote);

  if (!isVoteOpen && !shouldRenderDisabledVote) {
    return null;
  }

  return (
    <section
      className={`${PREDICTION_SURFACE_CARD_CLASS} mt-4 rounded-2xl p-3 sm:p-4`}
      data-testid="prediction-vote-panel"
      aria-labelledby={votePanelTitleId}
      aria-describedby={`${votePanelHelperId} ${votePanelParticipantsId}`}
    >
      <div className="mb-3 flex flex-col gap-1.5 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id={votePanelTitleId} className="text-16 font-black tracking-normal text-slate-950 dark:text-white">승리 팀 예측</h3>
          <p className="mt-1 text-body font-semibold text-slate-700 dark:text-white/80">
            승리할 것으로 예상하는 팀을 선택해 주세요.
          </p>
          <p id={votePanelHelperId} className="mt-0.5 text-12 font-medium text-slate-500 dark:text-white/55">
            경기 시작 전까지 변경할 수 있어요.
          </p>
        </div>
        <span
          id={votePanelParticipantsId}
          data-testid="prediction-vote-participants"
          className={`${PREDICTION_SOFT_CHIP_CLASS} w-fit rounded-full px-2.5 py-1 text-12 font-extrabold`}
        >
          참여 {totalVotes.toLocaleString()}명
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch sm:gap-3">
        {voteOptions.map(({ team, teamCode, teamName, sideLabel, color }, index) => {
          const isSelected = userVote === team;
          const buttonLabel = isVoteActionLocked ? '처리 중...' : isSelected ? '선택됨' : '선택';
          const buttonAriaLabel = isSelected
            ? `${teamName} 승리 예측 선택됨, 다시 누르면 예측 취소`
            : `${teamName} 승리 예측`;
          const buttonStyle = {
            borderColor: isSelected
              ? color
              : isDarkMode
                ? 'rgba(51, 65, 85, 0.95)'
                : 'rgba(226, 232, 240, 0.95)',
            background: isSelected
              ? color
              : isDarkMode
                ? 'rgba(15, 23, 42, 0.82)'
                : 'rgba(255, 255, 255, 0.96)',
            boxShadow: isSelected ? `0 0 0 1px ${color}33, 0 14px 32px -18px ${color}` : undefined,
          } satisfies CSSProperties;

          return (
            <div key={team} className="contents">
              {index === 1 ? (
                <div className="hidden h-full items-center justify-center sm:flex">
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-12 font-black text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white/70">
                    VS
                  </span>
                </div>
              ) : null}
              {shouldRenderDisabledVote ? (
                <Button
                  disabled
                  aria-label={`${teamName} 승리 예측 불가`}
                  data-testid={team === 'away' ? 'vote-disabled-away-btn' : 'vote-disabled-home-btn'}
                  variant="outline"
                  className="h-auto min-h-[104px] w-full items-center justify-between gap-3 whitespace-normal rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3.5 text-left text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <TeamLogo team={teamCode} size={36} className="h-9 w-9 shrink-0" />
                    <span className="min-w-0">
                      <span className="mb-1 inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-11 font-black tracking-[0.08em] text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white/55">
                        {sideLabel}
                      </span>
                      <span className="block truncate text-16 font-black text-slate-700 dark:text-white">{teamName}</span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-12 font-bold dark:border-slate-700 dark:bg-slate-950/60 dark:text-white">
                    투표할 수 없습니다
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onVote(team)}
                  disabled={isVoteActionLocked}
                  aria-pressed={isSelected}
                  aria-label={buttonAriaLabel}
                  title={voteButtonTitle}
                  data-testid={team === 'away' ? 'prediction-vote-away-btn' : 'vote-home-btn'}
                  className={[
                    'h-auto min-h-[104px] w-full items-center justify-between gap-3 whitespace-normal rounded-2xl border bg-white/95 px-4 py-3.5 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform]',
                    'duration-200 ease-out motion-reduce:transition-none',
                    isSelected ? 'scale-[1.01] text-white shadow-md motion-reduce:scale-100' : 'hover:-translate-y-0.5 hover:bg-slate-50',
                    'active:scale-[0.99] dark:bg-slate-950/70 dark:hover:bg-slate-900/80',
                    'disabled:cursor-not-allowed disabled:active:scale-100 disabled:opacity-80 disabled:hover:translate-y-0',
                  ].join(' ')}
                  style={buttonStyle}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <TeamLogo team={teamCode} size={38} className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
                    <span className="min-w-0">
                      <span className={`mb-1 inline-flex rounded-full border px-2 py-0.5 text-11 font-black tracking-[0.08em] ${
                        isSelected
                          ? 'border-white/50 bg-white/20 text-white'
                          : 'border-slate-200 bg-white/80 text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white/55'
                      }`}>
                        {sideLabel}
                      </span>
                      <span className={`block truncate text-18 font-black ${
                        isSelected ? 'text-white' : 'text-slate-950 dark:text-white'
                      }`}>
                        {teamName}
                      </span>
                    </span>
                  </span>
                  <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-12 font-black ${
                    isSelected
                      ? 'border-white/50 bg-white/20 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white'
                  }`}>
                    {isSelected ? (
                      <PredictionCheckCircleIcon
                        className="h-3.5 w-3.5 animate-score-pop motion-reduce:animate-none"
                        style={{ color: '#ffffff' }}
                        aria-hidden
                      />
                    ) : null}
                    <span>{buttonLabel}</span>
                    {isVoteActionLocked ? <PredictionLoaderIcon className="h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
                  </span>
                </Button>
              )}
              <div className="sm:hidden">
                {index === 0 ? (
                  <div className="flex justify-center py-0.5">
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-12 font-black text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white/70">
                      VS
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {userVote && !shouldRenderDisabledVote ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            data-testid="prediction-vote-cancel-btn"
            aria-label={`${selectedVoteOption?.teamName ?? '선택한 팀'} 승리 예측 취소`}
            className="min-h-10 rounded-full px-2.5 text-12 font-bold text-slate-500 underline-offset-4 hover:bg-slate-100 hover:text-slate-900 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/60 dark:hover:bg-slate-900/80 dark:hover:text-white"
            onClick={() => onVote(userVote)}
            disabled={isVoteActionLocked}
          >
            예측 취소
          </button>
        </div>
      ) : null}
    </section>
  );
}
