// components/ranking/RankingItem.tsx
import React from 'react';
import { Button } from '../ui/button';
import { X, GripVertical } from 'lucide-react';
import TeamLogo from '../TeamLogo';
import { RankingItemProps } from '../../types/ranking';
import { PLAYOFF_TEAMS } from '../../constants/ranking';

const RankingItem = React.memo(function RankingItem({
  team,
  index,
  alreadySaved,
  onRemove,
  onMove,
  draggedIndex = null,
  onDragIndexChange,
}: RankingItemProps) {
  const canReorder = team !== null && !alreadySaved;
  const isDragging = canReorder && draggedIndex === index;

  const isPlayoffTeam = index < PLAYOFF_TEAMS;
  const badgeClassName = isPlayoffTeam
    ? 'bg-primary ring-2 ring-primary/25 dark:ring-primary/40'
    : 'bg-gray-400 dark:bg-secondary';

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canReorder) {
      return;
    }

    onDragIndexChange?.(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (alreadySaved || draggedIndex === null || draggedIndex === index) {
      return;
    }

    event.preventDefault();
    onMove(draggedIndex, index);
    onDragIndexChange?.(index);
  };

  const handleDragEnd = () => {
    onDragIndexChange?.(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (alreadySaved) {
      return;
    }

    event.preventDefault();
    onDragIndexChange?.(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canReorder) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'ArrowUp' && index > 0) {
        event.preventDefault();
        onMove(index, index - 1);
        setTimeout(() => {
          const items = document.querySelectorAll('[data-ranking-item]');
          (items[index - 1] as HTMLElement | undefined)?.focus();
        }, 0);
      } else if (event.key === 'ArrowDown' && index < 9) {
        event.preventDefault();
        onMove(index, index + 1);
        setTimeout(() => {
          const items = document.querySelectorAll('[data-ranking-item]');
          (items[index + 1] as HTMLElement | undefined)?.focus();
        }, 0);
      }
    }
  };

  return (
    <>
      {index === PLAYOFF_TEAMS && (
        <div className="my-4 flex items-center gap-4 opacity-80">
          <div className="h-px flex-1 border-t border-dashed border-red-500 bg-red-400/50 dark:bg-red-500/50" />
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-500 dark:border-red-800 dark:bg-red-900/20">
            가을야구 진출 (PS)
          </span>
          <div className="h-px flex-1 border-t border-dashed border-red-500 bg-red-400/50 dark:bg-red-500/50" />
        </div>
      )}

      <div
        data-ranking-item
        tabIndex={canReorder ? 0 : -1}
        draggable={canReorder}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onKeyDown={handleKeyDown}
        aria-label={
          team
            ? `${index + 1}위: ${team.name}${canReorder ? '. Ctrl+화살표로 순위 변경' : ''}`
            : `${index + 1}위: 팀 미선택`
        }
        className={`border rounded-xl p-3 transition-all ${
          team
            ? `${isPlayoffTeam ? 'border-primary/30 dark:border-primary/50' : 'border-gray-200 dark:border-border'} bg-white dark:bg-card shadow-sm ${!alreadySaved && 'cursor-move'}`
            : 'border-dashed border-gray-300 dark:border-border bg-gray-50 dark:bg-secondary/40'
        } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'} focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 font-black text-lg ${badgeClassName}`}
          >
            {index + 1}
          </div>

          {team ? (
            <div className="flex items-center gap-3 flex-1">
              {!alreadySaved && <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-300 flex-shrink-0" />}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-secondary/40 border border-gray-100 dark:border-border flex-shrink-0">
                <TeamLogo team={team.shortName} size={32} />
              </div>
              <span style={{ fontWeight: 700 }} className={`flex-1 ${isPlayoffTeam ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>{team.name}</span>
              {!alreadySaved && (
                <Button
                  onClick={() => onRemove(index)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-secondary"
                >
                  <X className="w-4 h-4 text-red-500 dark:text-red-400" />
                </Button>
              )}
            </div>
          ) : (
            <div className="flex-1 text-center text-gray-400 dark:text-gray-300 text-sm">
              팀을 선택하세요
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export default RankingItem;
