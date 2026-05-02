// components/ranking/RankingItem.tsx
import React from 'react';
import { Button } from '../ui/button';
import {
  SharedChevronDownIcon,
  SharedChevronUpIcon,
  SharedCloseIcon,
  SharedGripVerticalIcon,
} from '../icons/SharedLeafIcons';
import TeamLogo from '../TeamLogo';
import { RankingItemProps } from '../../types/ranking';
import { PLAYOFF_TEAMS } from '../../constants/ranking';

const RankingItem = React.memo(function RankingItem({
  team,
  index,
  alreadySaved,
  onRemove,
  onMoveTeamToIndex,
  onMoveTeamByStep,
  draggedTeamId = null,
  lastMovedTeamId = null,
  onDragTeamChange,
}: RankingItemProps) {
  const canReorder = team !== null && !alreadySaved;
  const teamId = team?.id ?? null;
  const isDragging = canReorder && teamId !== null && draggedTeamId === teamId;
  const isRecentlyMoved = teamId !== null && lastMovedTeamId === teamId;

  const isPlayoffTeam = index < PLAYOFF_TEAMS;
  const badgeClassName = isPlayoffTeam
    ? 'bg-primary ring-2 ring-primary/25 dark:ring-primary/40'
    : 'bg-gray-400 dark:bg-secondary';
  const movementStateClassName = isDragging
    ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/30 dark:ring-primary/40'
    : isRecentlyMoved
      ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200 dark:border-emerald-500/80 dark:bg-emerald-950/30 dark:ring-emerald-500/30'
      : '';

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (!team || !canReorder) {
      return;
    }

    onDragTeamChange?.(team.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', team.id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (alreadySaved || draggedTeamId === null || draggedTeamId === teamId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onMoveTeamToIndex(draggedTeamId, index);
  };

  const handleDragEnd = () => {
    onDragTeamChange?.(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (alreadySaved) {
      return;
    }

    event.preventDefault();
    onDragTeamChange?.(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!team || !canReorder) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'ArrowUp' && index > 0) {
        event.preventDefault();
        onMoveTeamByStep(team.id, -1);
        setTimeout(() => {
          const items = document.querySelectorAll('[data-ranking-item]');
          (items[index - 1] as HTMLElement | undefined)?.focus();
        }, 0);
      } else if (event.key === 'ArrowDown' && index < 9) {
        event.preventDefault();
        onMoveTeamByStep(team.id, 1);
        setTimeout(() => {
          const items = document.querySelectorAll('[data-ranking-item]');
          (items[index + 1] as HTMLElement | undefined)?.focus();
        }, 0);
      }
    }
  };

  const handleMoveButtonClick = (direction: -1 | 1) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!team) {
      return;
    }

    onMoveTeamByStep(team.id, direction);
  };

  return (
    <>
      {index === PLAYOFF_TEAMS && (
        <div className="my-4 flex items-center gap-4 opacity-80">
          <div className="h-px flex-1 border-t border-dashed border-red-500 bg-red-400/50 dark:bg-red-500/50" />
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[16px] font-bold text-red-500 dark:border-red-800 dark:bg-red-900/20">
            가을야구 진출 (PS)
          </span>
          <div className="h-px flex-1 border-t border-dashed border-red-500 bg-red-400/50 dark:bg-red-500/50" />
        </div>
      )}

      <div
        data-ranking-item
        data-team-id={teamId ?? undefined}
        data-testid={team ? `ranking-row-${team.id}` : `ranking-empty-slot-${index}`}
        tabIndex={canReorder ? 0 : -1}
        draggable={canReorder}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onKeyDown={handleKeyDown}
        aria-label={
          team
            ? `${index + 1}위: ${team.name}${canReorder ? '. 위아래 버튼 또는 Ctrl+화살표로 순위 변경' : ''}`
            : `${index + 1}위: 팀 미선택`
        }
        className={`border rounded-xl p-3 transition-[background-color,border-color,box-shadow] duration-150 ${
          team
            ? `${isPlayoffTeam ? 'border-primary/30 dark:border-primary/50' : 'border-gray-200 dark:border-border'} bg-white dark:bg-card shadow-sm ${!alreadySaved && 'cursor-grab active:cursor-grabbing'}`
            : 'border-dashed border-gray-300 dark:border-border bg-gray-50 dark:bg-secondary/40'
        } ${movementStateClassName} focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 font-black text-lg ${badgeClassName}`}
          >
            {index + 1}
          </div>

          {team ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                {!alreadySaved && <SharedGripVerticalIcon className="hidden w-4 h-4 text-gray-400 dark:text-gray-300 flex-shrink-0 sm:block" />}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-secondary/40 border border-gray-100 dark:border-border flex-shrink-0">
                  <TeamLogo team={team.shortName} size={32} />
                </div>
                <span style={{ fontWeight: 700 }} className={`min-w-0 flex-1 truncate ${isPlayoffTeam ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>{team.name}</span>
              </div>
              {!alreadySaved && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    onClick={handleMoveButtonClick(-1)}
                    variant="ghost"
                    size="iconTouch"
                    disabled={index === 0}
                    aria-label={`${team.name} 순위 올리기`}
                    data-testid={`ranking-move-up-${team.id}`}
                    className="rounded-lg text-gray-600 hover:bg-primary/10 hover:text-primary dark:text-gray-300 dark:hover:bg-primary/20"
                  >
                    <SharedChevronUpIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleMoveButtonClick(1)}
                    variant="ghost"
                    size="iconTouch"
                    disabled={index >= 9}
                    aria-label={`${team.name} 순위 내리기`}
                    data-testid={`ranking-move-down-${team.id}`}
                    className="rounded-lg text-gray-600 hover:bg-primary/10 hover:text-primary dark:text-gray-300 dark:hover:bg-primary/20"
                  >
                    <SharedChevronDownIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => onRemove(index)}
                    variant="ghost"
                    size="iconTouch"
                    aria-label={`${team.name} 순위에서 제거`}
                    data-testid={`ranking-remove-${team.id}`}
                    className="rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-secondary"
                  >
                    <SharedCloseIcon className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 text-center text-gray-400 dark:text-gray-300 text-[16px]">
              팀을 선택하세요
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export default RankingItem;
