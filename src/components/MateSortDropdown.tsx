import { useState } from 'react';

import { MATE_SORT_OPTIONS, type MateSortOptionKey } from '../utils/mateSortOptions';
import { MateCheckCircleIcon } from './MateIcons';
import { ChevronDownIcon } from './icons/PublicShellIcons';
import { Button } from './ui/button';
import PlainMenu from './ui/plain-menu';

interface MateSortDropdownProps {
  activeSortKey: MateSortOptionKey;
  onSortChange: (nextSortKey: MateSortOptionKey) => void;
}

export default function MateSortDropdown({
  activeSortKey,
  onSortChange,
}: MateSortDropdownProps) {
  const [open, setOpen] = useState(false);
  const activeOption = MATE_SORT_OPTIONS.find((option) => option.key === activeSortKey) ?? MATE_SORT_OPTIONS[0]!;

  return (
    <PlainMenu
      open={open}
      onOpenChange={setOpen}
      align="end"
      panelClassName="w-56 overflow-hidden p-1"
      trigger={(
        <Button
          variant="outline"
          size="touch"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((currentValue) => !currentValue)}
          className="h-[46px] rounded-14 border-gray-200/80 bg-white px-4 text-13 font-bold text-gray-700 shadow-none hover:border-primary/30 hover:bg-primary/10 hover:text-primary dark:border-white/10 dark:bg-[#000000] dark:text-white dark:hover:bg-primary/15"
        >
          <span>정렬: {activeOption.label}</span>
          <ChevronDownIcon className="ml-1 h-3 w-3" />
        </Button>
      )}
    >
      {MATE_SORT_OPTIONS.map((option) => {
        const isActive = option.key === activeSortKey;

        return (
          <button
            key={option.key}
            type="button"
            role="menuitemradio"
            aria-checked={isActive}
            onClick={() => {
              onSortChange(option.key);
              setOpen(false);
            }}
            className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10'
            }`}
          >
            <MateCheckCircleIcon className={`mt-0.5 h-4 w-4 ${isActive ? 'text-primary' : 'text-transparent'}`} />
            <span className="min-w-0">
              <span className="block text-15 font-black leading-5">{option.label}</span>
              <span className="block text-13 font-bold leading-5 text-gray-500 dark:text-white">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </PlainMenu>
  );
}
