// components/ranking/RankingItem.tsx
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '../ui/button';
import { X, GripVertical } from 'lucide-react';
import TeamLogo from '../TeamLogo';
import { RankingItemProps } from '../../types/ranking';
import { PLAYOFF_TEAMS } from '../../constants/ranking';

export default function RankingItem({ 
  team, 
  index, 
  alreadySaved, 
  onRemove,
  onMove 
}: RankingItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'TEAM',
    item: { index },
    canDrag: team !== null && !alreadySaved,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'TEAM',
    hover: (item: { index: number }) => {
      if (!ref.current || alreadySaved) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      
      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const isPlayoffTeam = index < PLAYOFF_TEAMS;
  const badgeClassName = isPlayoffTeam
    ? 'bg-primary ring-2 ring-primary/25 dark:ring-primary/40'
    : 'bg-gray-400 dark:bg-secondary';

  return (
    <div
      ref={ref}
      className={`border rounded-xl p-3 transition-all ${
        team 
          ? `${isPlayoffTeam ? 'border-primary/30 dark:border-primary/50' : 'border-gray-200 dark:border-border'} bg-white dark:bg-card shadow-sm ${!alreadySaved && 'cursor-move'}` 
          : 'border-dashed border-gray-300 dark:border-border bg-gray-50 dark:bg-secondary/40'
      } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
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
  );
}
