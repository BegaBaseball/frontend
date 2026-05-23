import { useState } from 'react';
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

const DIMENSION_LABELS: Record<string, string> = {
  grade: '등급',
  position: '위치',
  level: '층수',
};

// 층수(level)가 메인 — 항상 노출
// 등급(grade)·위치(position)는 보조 — 기본 접힘
const PRIMARY_DIMENSION = 'level' as const;
const SECONDARY_DIMENSIONS = ['grade', 'position'] as const;

export function SeatMapFilterBar({
  groups,
  selectedId,
  onChange,
  mode,
  accentColor,
  testIdPrefix,
  getGroupState,
}: SeatMapFilterBarProps) {
  const [showSecondary, setShowSecondary] = useState(false);

  const renderButton = (group: SeatMapFilterGroup) => {
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
  };

  const renderDimensionRow = (dim: string) => {
    const dimGroups = groups.filter(g => g.filterDimension === dim);
    if (!dimGroups.length) return null;
    return (
      <div key={dim} className="flex items-center gap-1.5 flex-wrap">
        <span
          className="text-[11px] shrink-0 text-right w-7"
          style={{ color: mode === 'dark' ? '#64748b' : '#94a3b8' }}
        >
          {DIMENSION_LABELS[dim]}
        </span>
        {dimGroups.map(renderButton)}
      </div>
    );
  };

  const hasDimensions = groups.some(g => g.filterDimension);

  // dimension 없는 구장(대구·인천 등) — 기존 flat 렌더링 유지
  if (!hasDimensions) {
    return (
      <div className="flex flex-wrap gap-1.5 py-1">
        {groups.map(renderButton)}
      </div>
    );
  }

  // 보조 필터(등급·위치)에 활성 항목이 있으면 자동 펼침
  const secondaryGroups = groups.filter(g =>
    g.filterDimension && SECONDARY_DIMENSIONS.includes(g.filterDimension as typeof SECONDARY_DIMENSIONS[number])
  );
  const secondaryActive = secondaryGroups.some(g => g.id === selectedId);

  const isExpanded = showSecondary || secondaryActive;

  // 보조 필터 토글 레이블
  const secondaryLabels = SECONDARY_DIMENSIONS
    .filter(dim => groups.some(g => g.filterDimension === dim))
    .map(dim => DIMENSION_LABELS[dim])
    .join('·');

  return (
    <div className="space-y-1.5 py-1">
      {/* 메인 필터 — 층수, 항상 노출 */}
      {renderDimensionRow(PRIMARY_DIMENSION)}

      {/* 보조 필터 토글 버튼 */}
      {secondaryLabels && (
        <div className="flex items-center gap-1.5">
          <span className="w-7 shrink-0" />
          <button
            type="button"
            data-testid={`${testIdPrefix}-filter-secondary-toggle`}
            onClick={() => setShowSecondary(v => !v)}
            className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all"
            style={{
              borderColor: isExpanded ? accentColor : (mode === 'dark' ? '#334155' : '#e2e8f0'),
              color: isExpanded ? accentColor : (mode === 'dark' ? '#64748b' : '#94a3b8'),
              background: 'transparent',
            }}
            aria-expanded={isExpanded}
          >
            {secondaryLabels}
            <svg
              width="10" height="10" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {secondaryActive && (
            <span
              className="text-[11px] font-semibold"
              style={{ color: accentColor }}
            >
              적용 중
            </span>
          )}
        </div>
      )}

      {/* 보조 필터 행들 — 펼쳤을 때만 표시 */}
      {isExpanded && SECONDARY_DIMENSIONS.map(renderDimensionRow)}
    </div>
  );
}
