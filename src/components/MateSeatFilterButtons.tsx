import type { MateSeatFilterOption } from './MateFilterBottomSheet';
import { Button } from './ui/button';

interface MateSeatFilterButtonsProps {
  layout: 'rail' | 'toolbar';
  seatOptions: MateSeatFilterOption[];
  inputValue: string;
  onToggleSeat: (keyword: string) => void;
}

const FILTER_ACTIVE_CLASS = 'border-transparent bg-primary text-primary-foreground shadow-sm dark:bg-primary dark:text-primary-foreground';
const FILTER_IDLE_CLASS = 'border-gray-200/80 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:border-white/15 dark:bg-[#16181c] dark:text-zinc-200 dark:hover:bg-primary/20 dark:hover:text-primary';

export default function MateSeatFilterButtons({
  layout,
  seatOptions,
  inputValue,
  onToggleSeat,
}: MateSeatFilterButtonsProps) {
  return (
    <div className={layout === 'rail' ? 'grid grid-cols-1 gap-2' : 'flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide'}>
      {seatOptions.map((option) => {
        const isActive = inputValue.includes(option.label);

        return (
          <Button
            key={option.id}
            variant="outline"
            size="touch"
            aria-pressed={isActive}
            className={`${layout === 'rail' ? 'w-full justify-start rounded-xl' : 'rounded-full'} px-4 text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0a0a0a] ${
              isActive ? FILTER_ACTIVE_CLASS : FILTER_IDLE_CLASS
            }`}
            onClick={() => onToggleSeat(option.label)}
          >
            <span aria-hidden="true" className="mr-1.5 opacity-70">{option.icon}</span>
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
