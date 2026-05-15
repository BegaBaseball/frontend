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
  RefreshIcon,
  SearchIcon,
  WarningTriangleIcon,
} from './icons/PublicShellIcons';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

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

  useEffect(() => {
    setSearchQuery('');
    setSortOrder('default');
  }, [selectedCategory, selectedStadiumId]);

  const filteredPlaces = useMemo(
    () => filterAndSortPlaces(places, searchQuery, sortOrder),
    [places, searchQuery, sortOrder],
  );

  return (
    <div data-testid="stadium-guide-places-panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
          {CATEGORY_CONFIGS[selectedCategory].label} 목록
        </h3>
        <span className="text-[16px] text-gray-400 dark:text-gray-500">
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
            className="pl-9 h-9 text-[16px] dark:bg-card dark:border-border"
          />
        </div>
        <div className="relative">
          <ArrowUpDownIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as StadiumGuideSortOrder)}
            disabled={listControlsDisabled}
            className="stadium-guide-select h-9 pl-8 pr-3 text-[16px] rounded-md border border-input bg-background dark:bg-card dark:border-border dark:text-gray-200 cursor-pointer"
          >
            <option value="default">기본순</option>
            <option value="rating">평점순</option>
            <option value="name">이름순</option>
          </select>
        </div>
      </div>

      {listStatus === 'loading' ? (
        <div
          className="stadium-guide-list-shell rounded-2xl border-2 overflow-hidden dark:bg-card dark:border-border p-4 space-y-3"
          style={{
            borderColor: isDark ? '#374151' : THEME_COLORS.border,
            backgroundColor: isDark ? '#1f2937' : '#f9fafb',
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-border">
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-5 h-5 rounded" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-9 w-16 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="stadium-guide-list-shell rounded-2xl border-2 overflow-hidden dark:bg-card dark:border-border"
          style={{
            borderColor: isDark ? '#374151' : THEME_COLORS.border,
            backgroundColor: isDark ? '#1f2937' : '#f9fafb',
          }}
        >
          <div className="h-full p-4 overflow-y-auto stadium-guide-scroll-area">
            <div className="space-y-3 pr-2">
              {listStatus === 'error' ? (
                <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 p-4">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                    <WarningTriangleIcon className="w-4 h-4" />
                    <span className="text-[16px] font-semibold">
                      {formatOptionalText(listError, '목록을 불러오지 못했습니다.')}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700"
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
                  const placeDescription = normalizeOptionalText(place.description);
                  const placeAddress = normalizeOptionalText(place.address);
                  const placePhone = normalizeOptionalText(place.phone);
                  const placeOpenTime = normalizeOptionalText(place.openTime);
                  const placeCloseTime = normalizeOptionalText(place.closeTime);
                  const hasPlaceCoordinates = hasValidCoordinates(place.lat, place.lng);

                  return (
                    <Card
                      key={place.id}
                      id={`place-${place.id}`}
                      className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2 dark:bg-card"
                      style={{
                        backgroundColor: isSelected
                          ? (isDark ? '#1f4436' : THEME_COLORS.primaryLight)
                          : (isDark ? '#1f2937' : 'white'),
                        borderColor: isSelected
                          ? THEME_COLORS.primary
                          : (isDark ? '#374151' : THEME_COLORS.border),
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="flex-1"
                          onClick={() => handlePlaceClick(place)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-5 h-5" style={{ color }} />
                            <h4 className="dark:text-white" style={{ fontWeight: 700 }}>{place.name}</h4>
                          </div>
                          {placeDescription ? (
                            <p className="text-gray-600 dark:text-gray-300 text-[16px] mb-1">
                              {placeDescription}
                            </p>
                          ) : null}
                          {placeAddress ? (
                            <p className="text-[16px] text-gray-600 dark:text-gray-300">📍 {placeAddress}</p>
                          ) : null}
                          {placePhone ? (
                            <p className="text-[16px] text-gray-600 dark:text-gray-300">📞 {placePhone}</p>
                          ) : null}
                          {placeOpenTime || placeCloseTime ? (
                            <p className="text-[16px] text-gray-600 dark:text-gray-300">
                              ⏰ {formatOptionalText(placeOpenTime)} - {formatOptionalText(placeCloseTime)}
                            </p>
                          ) : null}
                          {!hasPlaceCoordinates ? (
                            <p className="text-[16px] text-amber-700 dark:text-amber-400 mt-1">
                              좌표 정보가 없어 길찾기를 제공할 수 없습니다.
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                          {typeof place.rating === 'number' ? (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-500">★</span>
                              <span style={{ fontWeight: 700 }} className="dark:text-white">
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
                            className="px-4 py-2 rounded-lg text-white transition-colors hover:opacity-90 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: THEME_COLORS.primary }}
                          >
                            길찾기
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-300">
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
