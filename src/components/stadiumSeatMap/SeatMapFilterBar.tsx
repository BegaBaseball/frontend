import type { SeatMapFilterGroup, SeatMapThemeMode } from './seatMapCommonTypes';

interface SeatMapFilterBarProps {
  groups: readonly SeatMapFilterGroup[];
  selectedId: string;
  onChange: (value: string) => void;
  mode: SeatMapThemeMode;
  accentColor: string;
  testIdPrefix: string;
  getGroupState?: (group: SeatMapFilterGroup) => {
    disabled?: boolean;
    extraButtonProps?: Record<string, string | number | undefined>;
  };
}

export function SeatMapFilterBar({
  groups,
  selectedId,
  onChange,
  mode,
  accentColor,
  testIdPrefix,
  getGroupState,
}: SeatMapFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {groups.map((group) => {
        const active = group.id === selectedId;
        const groupState = getGroupState?.(group);
        const disabled = Boolean(groupState?.disabled);
        return (
          <button
            key={group.id}
            type="button"
            data-testid={`${testIdPrefix}-filter-${group.id}`}
            {...groupState?.extraButtonProps}
            aria-pressed={active}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            onClick={() => !disabled && onChange(group.id)}
            className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active ? accentColor : 'transparent',
              borderColor: active ? accentColor : (mode === 'dark' ? '#334155' : '#e2e8f0'),
              color: active ? '#fff' : disabled ? (mode === 'dark' ? '#475569' : '#cbd5e1') : (mode === 'dark' ? '#94a3b8' : '#334155'),
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.62 : 1,
            }}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}
