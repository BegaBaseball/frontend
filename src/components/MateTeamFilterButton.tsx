import { memo } from 'react';

import TeamLogo from './TeamLogo';
import { Button } from './ui/button';

interface MateTeamFilterButtonProps {
  layout: 'rail' | 'toolbar';
  favoriteTeamId: string;
  myTeamOnly: boolean;
  onClick: () => void;
}

const FILTER_ACTIVE_CLASS = 'border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20 dark:text-primary-light';
const FILTER_IDLE_CLASS = 'border-gray-200/80 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#000000] dark:text-white dark:hover:bg-primary/20 dark:hover:text-primary';

function MateTeamFilterButton({
  layout,
  favoriteTeamId,
  myTeamOnly,
  onClick,
}: MateTeamFilterButtonProps) {
  return (
    <Button
      variant="outline"
      size="touch"
      aria-pressed={myTeamOnly}
      className={`${layout === 'rail' ? 'h-10 w-full justify-start rounded-10 px-3 text-13' : 'rounded-full px-4 text-15'} font-bold transition-colors ${
        myTeamOnly
          ? FILTER_ACTIVE_CLASS
          : FILTER_IDLE_CLASS
      }`}
      onClick={onClick}
    >
      <TeamLogo teamId={favoriteTeamId} size={16} className="mr-2 opacity-90" />
      내 팀 경기만
    </Button>
  );
}

export default memo(MateTeamFilterButton);
