import { resolveMateSeatFilterOptions } from '../utils/mateSeatFilterOptions';
import { SEAT_ICONS } from '../utils/seatIcons';
import { Button } from './ui/button';

interface MateSeatFilterButtonsProps {
  layout: 'rail' | 'toolbar';
  inputValue: string;
  onToggleSeat: (keyword: string) => void;
}

const FILTER_ACTIVE_CLASS = 'border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20 dark:text-primary-light';
const FILTER_IDLE_CLASS = 'border-gray-200/80 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#000000] dark:text-white dark:hover:bg-primary/20 dark:hover:text-primary';

export default function MateSeatFilterButtons({
  layout,
  inputValue,
  onToggleSeat,
}: MateSeatFilterButtonsProps) {
  const seatOptions = resolveMateSeatFilterOptions(inputValue);

  return (
    <div className={layout === 'rail' ? 'flex flex-wrap gap-1.5' : 'flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide'}>
      {seatOptions.map((option) => {
        const isActive = inputValue.includes(option.label);

        return (
          <Button
            key={option.id}
            variant="outline"
            size="touch"
            aria-pressed={isActive}
            className={`${layout === 'rail' ? 'h-auto rounded-full px-3 py-1.5 text-12' : 'rounded-full px-4 text-15'} font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#000000] ${
              isActive ? FILTER_ACTIVE_CLASS : FILTER_IDLE_CLASS
            }`}
            onClick={() => onToggleSeat(option.label)}
          >
            <span aria-hidden="true" className="mr-1.5 opacity-70">{SEAT_ICONS[option.category]}</span>
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
