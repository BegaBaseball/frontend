import { useEffect, useMemo, useState } from 'react';

import { CATEGORY_CONFIGS, THEME_COLORS } from '../utils/constants';
import { openKakaoMapRoute } from '../utils/kakaoMap';
import { getCategoryIconConfig } from '../utils/stadium';
import type { Place } from '../types/stadium';
import {
  filterAndSortPlaces,
  formatOptionalText,
  hasValidCoordinates,
  normalizeOptionalText,
  StadiumGuideSortOrder,
} from '../utils/stadiumGuideUtils';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  RefreshIcon,
  SearchIcon,
  WarningTriangleIcon,
} from './icons/PublicShellIcons';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

const STADIUM_DARK_COLORS = {
  surface: 'var(--stadium-dark-surface)',
  raised: 'var(--stadium-dark-raised)',
  border: 'var(--stadium-dark-border)',
  borderStrong: 'var(--stadium-dark-border-strong)',
  text: 'var(--stadium-dark-text)',
  muted: 'var(--stadium-dark-muted)',
  accent: 'var(--stadium-dark-accent)',
  accentHex: '#7ed3b3',
} as const;

interface StadiumGuidePlacesRuntimeProps {
  selectedStadiumId: string | null;
  selectedStadiumName: string | null;
  selectedCategory: keyof typeof CATEGORY_CONFIGS;
  places: Place[];
  selectedPlace: Place | null;
  listStatus: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  listError: string | null;
  retryPlaces: () => void;
  handlePlaceClick: (place: Place) => void;
  listControlsDisabled: boolean;
  isDark: boolean;
  isNearbyCategory: boolean;
}

export default function StadiumGuidePlacesRuntime({
  selectedStadiumId,
  selectedStadiumName,
  selectedCategory,
  places,
  selectedPlace,
  listStatus,
  listError,
  retryPlaces,
  handlePlaceClick,
  listControlsDisabled,
  isDark,
  isNearbyCategory,
}: StadiumGuidePlacesRuntimeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<StadiumGuideSortOrder>('default');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setSearchQuery('');
    setSortOrder('default');
    setExpandedIds(new Set());
  }, [selectedCategory, selectedStadiumId]);

  const filteredPlaces = useMemo(
    () => filterAndSortPlaces(places, searchQuery, sortOrder),
    [places, searchQuery, sortOrder],
  );
  const titleColor = isDark ? STADIUM_DARK_COLORS.text : THEME_COLORS.primary;
  const mutedColor = isDark ? STADIUM_DARK_COLORS.muted : undefined;
  const listShellStyle = {
    borderColor: isDark ? STADIUM_DARK_COLORS.border : THEME_COLORS.border,
    backgroundColor: isDark ? STADIUM_DARK_COLORS.surface : '#f9fafb',
  };

  const handleCardClick = (place: Place) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(place.id) ? next.delete(place.id) : next.add(place.id);
      return next;
    });
    handlePlaceClick(place);
  };

  return (
    <div data-testid="stadium-guide-places-panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold dark:text-white text-balance" style={{ color: titleColor }}>
          {CATEGORY_CONFIGS[selectedCategory].label} 목록
        </h3>
        <span className="text-[16px] text-gray-400 dark:text-white" style={{ color: mutedColor }}>
          {filteredPlaces.length}개
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="장소 이름 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={listControlsDisabled}
            className="stadium-guide-control min-h-11 pl-9 text-[16px]"
          />
        </div>
        <div className="relative">
          <ArrowUpDownIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as StadiumGuideSortOrder)}
            disabled={listControlsDisabled}
            className="stadium-guide-select stadium-guide-control min-h-11 pl-8 pr-3 text-[16px] rounded-md border border-input bg-background dark:text-white cursor-pointer"
          >
            <option value="default">기본순</option>
            <option value="rating">평점순</option>
            <option value="name">이름순</option>
          </select>
        </div>
      </div>

      {listStatus === 'loading' ? (
        <div
          className="stadium-guide-list-shell rounded-2xl border-2 overflow-hidden p-4 space-y-3"
          style={listShellStyle}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 bg-white rounded-xl border border-gray-200"
              style={{
                backgroundColor: isDark ? STADIUM_DARK_COLORS.raised : undefined,
                borderColor: isDark ? STADIUM_DARK_COLORS.border : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="stadium-guide-loading-block w-5 h-5 rounded" />
                    <Skeleton className="stadium-guide-loading-block h-5 w-32" />
                  </div>
                  <Skeleton className="stadium-guide-loading-block h-4 w-48" />
                  <Skeleton className="stadium-guide-loading-block h-4 w-36" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="stadium-guide-loading-block h-5 w-8" />
                  <Skeleton className="stadium-guide-loading-block h-9 w-16 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="stadium-guide-list-shell rounded-2xl border-2 overflow-hidden"
          style={listShellStyle}
        >
          <div className="h-full p-4 overflow-y-auto stadium-guide-scroll-area">
            <div className="space-y-3 pr-2">
              {listStatus === 'error' ? (
                <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-400/30 p-4">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-200 mb-2">
                    <WarningTriangleIcon className="w-4 h-4" />
                    <span className="text-[16px] font-semibold">
                      {formatOptionalText(listError, '목록을 불러오지 못했습니다.')}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50 dark:bg-transparent dark:text-red-200 dark:border-red-400/30 dark:hover:bg-red-400/10"
                    onClick={retryPlaces}
                  >
                    <RefreshIcon className="w-3.5 h-3.5 mr-1" />
                    목록 다시 시도
                  </Button>
                </div>
              ) : filteredPlaces.length > 0 ? (
                filteredPlaces.map((place) => {
                  const { Icon, color } = getCategoryIconConfig(place.category);
                  const isSelected = selectedPlace?.id === place.id;
                  const placeAccent = isDark && (place.category === 'store' || place.category === 'parking')
                    ? STADIUM_DARK_COLORS.accentHex
                    : color;
                  const placeDescription = normalizeOptionalText(place.description);
                  const placeAddress = normalizeOptionalText(place.address);
                  const placePhone = normalizeOptionalText(place.phone);
                  const placeOpenTime = normalizeOptionalText(place.openTime);
                  const placeCloseTime = normalizeOptionalText(place.closeTime);
                  const hasPlaceCoordinates = hasValidCoordinates(place.lat, place.lng);

                  const isExpanded = expandedIds.has(place.id);

                  return (
                    <Card
                      key={place.id}
                      id={`place-${place.id}`}
                      className="p-3 sm:p-4 hover:shadow-lg transition-shadow cursor-pointer border-2"
                      style={{
                        backgroundColor: isSelected
                          ? (isDark ? `${placeAccent}1f` : THEME_COLORS.primaryLight)
                          : (isDark ? STADIUM_DARK_COLORS.raised : 'white'),
                        borderColor: isSelected
                          ? (isDark ? `${placeAccent}99` : THEME_COLORS.primary)
                          : (isDark ? STADIUM_DARK_COLORS.border : THEME_COLORS.border),
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => handleCardClick(place)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-5 h-5 flex-shrink-0" style={{ color: placeAccent }} />
                            <h4 className="dark:text-white text-balance" style={{ fontWeight: 700 }}>{place.name}</h4>
                          </div>
                          {placeDescription ? (
                            <p className={`text-gray-600 dark:text-white text-sm mb-1 text-balance ${isExpanded ? '' : 'line-clamp-1 sm:line-clamp-none'}`} style={{ color: mutedColor }}>
                              {placeDescription}
                            </p>
                          ) : null}
                          {placeAddress ? (
                            <p className={`text-sm text-gray-600 dark:text-white ${isExpanded ? 'block' : 'hidden sm:block'}`} style={{ color: mutedColor }}>📍 {placeAddress}</p>
                          ) : null}
                          {placePhone ? (
                            <p className={`text-sm text-gray-600 dark:text-white ${isExpanded ? 'block' : 'hidden sm:block'}`} style={{ color: mutedColor }}>📞 {placePhone}</p>
                          ) : null}
                          {placeOpenTime || placeCloseTime ? (
                            <p className={`text-sm text-gray-600 dark:text-white ${isExpanded ? 'block' : 'hidden sm:block'}`} style={{ color: mutedColor }}>
                              ⏰ {formatOptionalText(placeOpenTime)} - {formatOptionalText(placeCloseTime)}
                            </p>
                          ) : null}
                          {!hasPlaceCoordinates ? (
                            <p className={`text-sm text-amber-700 dark:text-amber-400 mt-1 ${isExpanded ? 'block' : 'hidden sm:block'}`}>
                              좌표 정보가 없어 길찾기를 제공할 수 없습니다.
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <ChevronDownIcon
                            className={`w-4 h-4 text-gray-400 transition-transform sm:hidden ${isExpanded ? 'rotate-180' : ''}`}
                          />
                          {typeof place.rating === 'number' ? (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">★</span>
                              <span style={{ fontWeight: 700, color: isDark ? STADIUM_DARK_COLORS.text : undefined }} className="dark:text-white text-sm">
                                {place.rating.toFixed(1)}
                              </span>
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openKakaoMapRoute(place.name, place.lat, place.lng);
                            }}
                            disabled={!hasPlaceCoordinates}
                            className="min-h-11 px-3 py-2 sm:px-4 rounded-lg text-white text-sm transition-colors hover:opacity-90 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              backgroundColor: isDark ? STADIUM_DARK_COLORS.accent : THEME_COLORS.primary,
                              color: isDark ? '#03100b' : '#ffffff',
                            }}
                          >
                            길찾기
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-white text-balance" style={{ color: mutedColor }}>
                  {!selectedStadiumName ? (
                    '구장을 선택해주세요.'
                  ) : listStatus === 'idle' ? (
                    '카테고리를 선택하면 장소 목록을 표시합니다.'
                  ) : searchQuery.trim() ? (
                    `'${searchQuery}'에 해당하는 장소가 없습니다.`
                  ) : listStatus === 'empty' && isNearbyCategory ? (
                    `주변 ${CATEGORY_CONFIGS[selectedCategory].label} 검색 결과가 없습니다.`
                  ) : (
                    '해당 카테고리에 등록된 장소가 없습니다.'
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
