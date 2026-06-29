import { cloneElement, isValidElement, lazy, Suspense, useState, type MouseEvent, type ReactNode, type SVGProps } from 'react';

import { Button } from './ui/button';
import PlainDialog from './ui/plain-dialog';
import type { CoachDataQuality } from '../api/coach';
import { TEAM_DATA, TEAM_LIST, getRandomTeamName } from '../constants/teams';
import { resolveCoachAnalysisPresentation } from '../utils/predictionCoachPresentation';

const CoachAnalysisDialogRuntime = lazy(() => import('./CoachAnalysisDialogRuntime'));

function CoachDialogLoaderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </svg>
  );
}

function CoachDialogZapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />
    </svg>
  );
}

export interface CoachAnalysisDialogProps {
  trigger?: ReactNode;
  defaultOpen?: boolean;
  initialTeam?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeScore?: number | string | null;
  awayScore?: number | string | null;
  gameId?: string;
  gameDate?: string;
  seasonId?: number | string;
  leagueType?: string;
  round?: string;
  gameNo?: number;
  homePitcher?: string | null;
  awayPitcher?: string | null;
  isPastGame?: boolean;
  isFutureGame?: boolean;
  gameStatusBucket?: string | null;
  initialHomeRank?: number | null;
  initialAwayRank?: number | null;
  initialWinProbabilityHome?: number | null;
  initialDataQuality?: CoachDataQuality;
  initialSupportedFactCount?: number;
  initialUsedEvidence?: string[];
  initialGroundingWarnings?: string[];
  initialGroundingReasons?: string[];
  initialFreshnessLabel?: string | null;
}

const getInitialTeamName = (teamId?: string) => {
  if (!teamId) return getRandomTeamName();
  const data = TEAM_DATA[teamId];
  if (data && data.fullName !== '없음') return data.fullName;
  return TEAM_LIST.find((teamName) => teamName.includes(teamId)) || teamId;
};

function CoachAnalysisTriggerButton({
  disabled = false,
  onClick,
}: {
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/20 px-8 h-12 rounded-full font-bold"
    >
      {disabled ? (
        <CoachDialogLoaderIcon className="w-4 h-4 fill-white animate-spin" />
      ) : (
        <CoachDialogZapIcon className="w-4 h-4 fill-white" />
      )}
      <span>AI 코치 상세 분석</span>
    </Button>
  );
}

function CoachAnalysisDialogFallback({
  isOpen,
  onRequestClose,
  homeTeamId,
  awayTeamId,
  initialTeam,
  isPastGame,
  isFutureGame,
  gameStatusBucket,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  homeTeamId?: string;
  awayTeamId?: string;
  initialTeam?: string;
  isPastGame?: boolean;
  isFutureGame?: boolean;
  gameStatusBucket?: string | null;
}) {
  const selectedTeam = getInitialTeamName(initialTeam);
  const presentation = resolveCoachAnalysisPresentation({ isPastGame, isFutureGame, gameStatusBucket });

  return (
    <PlainDialog
      open={isOpen}
      onClose={onRequestClose}
      title={presentation.title}
      description={homeTeamId && awayTeamId
        ? `${getInitialTeamName(homeTeamId)} vs ${getInitialTeamName(awayTeamId)} ${presentation.descriptionWithMatchup}`
        : `${selectedTeam} ${presentation.descriptionWithTeam}`}
      contentTestId="coach-analysis-dialog-loading"
      className="sm:max-w-[700px] max-h-[90vh] overflow-hidden border-none bg-white p-0 shadow-2xl dark:bg-secondary"
      bodyClassName="flex max-h-[calc(90vh-81px)] flex-col overflow-hidden bg-white p-0 dark:bg-secondary"
    >
      <div className="flex min-h-[18rem] items-center justify-center bg-gray-50/60 dark:bg-black/40">
        <div className="inline-flex items-center gap-2 text-body font-semibold text-gray-600 dark:text-white">
          <CoachDialogLoaderIcon className="h-4 w-4 animate-spin" />
          AI 코치 분석 도구를 불러오는 중입니다.
        </div>
      </div>
    </PlainDialog>
  );
}

export default function CoachAnalysisDialog({
  trigger,
  defaultOpen = false,
  ...runtimeProps
}: CoachAnalysisDialogProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasMountedRuntime, setHasMountedRuntime] = useState(defaultOpen);

  const handleOpen = () => {
    setHasMountedRuntime(true);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const renderTrigger = () => {
    if (trigger && isValidElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>(trigger)) {
      const originalOnClick = trigger.props.onClick;
      return cloneElement(trigger, {
        onClick: (event: MouseEvent<HTMLElement>) => {
          originalOnClick?.(event);
          if (!event.defaultPrevented) {
            handleOpen();
          }
        },
      });
    }

    if (trigger) {
      return (
        <span className="contents" onClick={() => handleOpen()}>
          {trigger}
        </span>
      );
    }

    return <CoachAnalysisTriggerButton onClick={(event) => handleOpen()} />;
  };

  return (
    <>
      {renderTrigger()}
      {hasMountedRuntime ? (
        <Suspense
          fallback={(
            <CoachAnalysisDialogFallback
              isOpen={isOpen}
              onRequestClose={handleClose}
              homeTeamId={runtimeProps.homeTeamId}
              awayTeamId={runtimeProps.awayTeamId}
              initialTeam={runtimeProps.initialTeam}
              isPastGame={runtimeProps.isPastGame}
              isFutureGame={runtimeProps.isFutureGame}
              gameStatusBucket={runtimeProps.gameStatusBucket}
            />
          )}
        >
          <CoachAnalysisDialogRuntime
            {...runtimeProps}
            isOpen={isOpen}
            onRequestClose={handleClose}
          />
        </Suspense>
      ) : null}
    </>
  );
}
