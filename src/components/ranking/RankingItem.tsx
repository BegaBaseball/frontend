// components/ranking/RankingItem.tsx
import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '../ui/button';
import { X, GripVertical } from 'lucide-react';
import TeamLogo from '../TeamLogo';
import { Team } from '../../types/ranking';

interface RankingItemProps {
  team: Team | null;
  index: number;
  alreadySaved: boolean;
  moveTeam: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (index: number) => void;
}

export default function RankingItem({
  team,
  index,
  alreadySaved,
  moveTeam,
  onRemove,
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

      moveTeam(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const backgroundColor = index < 5 ? '#2d5f4f' : '#9ca3af';

  return (
    <div
      ref={ref}
      className={`border-2 rounded-xl p-3 transition-all ${
        team
          ? `border-transparent bg-white shadow-sm ${!alreadySaved && 'cursor-move'}`
          : 'border-dashed border-gray-300 bg-gray-50'
      } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor, fontWeight: 900, fontSize: '1.1rem' }}
        >
          {index + 1}
        </div>

        {team ? (
          <div className="flex items-center gap-3 flex-1">
            {!alreadySaved && (
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
            <TeamLogo team={team.shortName} size={40} />
            <span style={{ fontWeight: 700 }} className="flex-1">
              {team.name}
            </span>
            {!alreadySaved && (
              <Button
                onClick={() => onRemove(index)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50"
              >
                <X className="w-4 h-4 text-red-500" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 text-center text-gray-400 text-sm">팀을 선택하세요</div>
        )}
      </div>
    </div>
  );
}