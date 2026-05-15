import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SeatMapFilterGroup } from './seatMapCommonTypes';

interface UseSeatMapSelectionStateOptions<
  TSection,
  TFilterGroup extends SeatMapFilterGroup = SeatMapFilterGroup,
> {
  sections: readonly TSection[];
  filterGroups: readonly TFilterGroup[];
  getId: (section: TSection) => string;
  getCategoryId: (section: TSection) => string;
  initialFilterId?: string;
  isSectionVisible?: (section: TSection, filterGroup: TFilterGroup | null, filterCats: readonly string[] | null) => boolean;
}

export function useSeatMapSelectionState<
  TSection,
  TFilterGroup extends SeatMapFilterGroup = SeatMapFilterGroup,
>({
  sections,
  filterGroups,
  getId,
  getCategoryId,
  initialFilterId = 'all',
  isSectionVisible,
}: UseSeatMapSelectionStateOptions<TSection, TFilterGroup>) {
  const [selected, setSelected] = useState<TSection | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [filterId, setFilterId] = useState(initialFilterId);
  const [toast, setToast] = useState<string | null>(null);

  const activeFilterGroup = useMemo(() => (
    filterGroups.find((group) => group.id === filterId) ?? filterGroups[0] ?? null
  ), [filterGroups, filterId]);

  const filterCats = activeFilterGroup?.cats ?? null;

  const hoveredSection = useMemo(() => (
    hover ? (sections.find((section) => getId(section) === hover) ?? null) : null
  ), [getId, hover, sections]);

  const sectionIsVisible = useCallback((section: TSection) => {
    if (isSectionVisible) {
      return isSectionVisible(section, activeFilterGroup, filterCats);
    }
    return filterCats === null || filterCats.includes(getCategoryId(section));
  }, [activeFilterGroup, filterCats, getCategoryId, isSectionVisible]);

  useEffect(() => {
    if (!selected || sectionIsVisible(selected)) {
      return;
    }
    setSelected(null);
  }, [sectionIsVisible, selected]);

  useEffect(() => {
    if (!hoveredSection || sectionIsVisible(hoveredSection)) {
      return;
    }
    setHover(null);
  }, [hoveredSection, sectionIsVisible]);

  const showToast = useCallback((message: string, timeoutMs = 2800) => {
    setToast(message);
    if (typeof window === 'undefined') {
      return;
    }
    window.setTimeout(() => setToast(null), timeoutMs);
  }, []);

  return {
    selected,
    setSelected,
    hover,
    setHover,
    hoveredSection,
    filterId,
    setFilterId,
    activeFilterGroup,
    filterCats,
    toast,
    setToast,
    showToast,
  };
}
