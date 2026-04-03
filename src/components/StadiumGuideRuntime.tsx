import { lazy, Suspense, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import { MapPin, RefreshCw, AlertTriangle, Search, ArrowUpDown } from 'lucide-react';
import { KAKAO_API_KEY, CATEGORY_CONFIGS, THEME_COLORS } from '../utils/constants';
import { openKakaoMapRoute } from '../utils/kakaoMap';
import { getCategoryIconConfig } from '../utils/stadium';
import { useStadiumGuide } from '../hooks/useStadiumGuide';
import { useTheme } from '../hooks/useTheme';
import { useAuthSession } from '../store/authStore';
import {
  filterAndSortPlaces,
  formatOptionalText,
  hasValidCoordinates,
  normalizeOptionalText,
  StadiumGuideSortOrder,
} from '../utils/stadiumGuideUtils';
import './StadiumGuide.css';

const AuthenticatedStadiumFavoriteToggle = lazy(() => import('./AuthenticatedStadiumFavoriteToggle'));
const StadiumGuideAdSlot = lazy(() => import('./ads/AdSlot'));

export default function StadiumGuideRuntime() {
  const { theme, resolvedTheme } = useTheme();
  const {
    stadiums,
    selectedStadium,
    selectedCategory,
    setSelectedCategory,
    places,
    selectedPlace,
    isMapReady,
    mapContainer,
    handleStadiumChange,
    handlePlaceClick,
    stadiumsStatus,
    placesStatus,
    nearbyStatus,
    mapStatus,
    stadiumsError,
    placesError,
    nearbyError,
    mapError,
    retryStadiums,
    retryPlaces,
    retryMap,
  } = useStadiumGuide();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<StadiumGuideSortOrder>('default');

  const { isLoggedIn } = useAuthSession();
  const selectedStadiumId = selectedStadium?.stadiumId ?? null;

  const effectiveTheme = resolvedTheme ?? theme;
  const isDark = effectiveTheme === 'dark';

  const filteredPlaces = useMemo(() => {
    return filterAndSortPlaces(places, searchQuery, sortOrder);
  }, [places, searchQuery, sortOrder]);

  const isNearbyCategory = selectedCategory === 'store' || selectedCategory === 'parking';
  const listStatus = isNearbyCategory ? nearbyStatus : placesStatus;
  const listError = isNearbyCategory ? nearbyError : placesError;
  const hasStadiumCoordinates = hasValidCoordinates(selectedStadium?.lat, selectedStadium?.lng);
  const selectedStadiumAddress = normalizeOptionalText(selectedStadium?.address);
  const selectedStadiumPhone = normalizeOptionalText(selectedStadium?.phone);
  const canRenderMap = Boolean(selectedStadium && KAKAO_API_KEY && isMapReady && mapStatus === 'success' && hasStadiumCoordinates);
  const stadiumControlsDisabled = stadiumsStatus === 'loading' || stadiumsStatus === 'empty' || stadiumsStatus === 'error';
  const listControlsDisabled = stadiumControlsDisabled || !selectedStadium;

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-7 h-7" style={{ color: THEME_COLORS.primary }} />
          <h2 className="text-2xl sm:text-3xl" style={{ color: THEME_COLORS.primary, fontWeight: 900 }}>구장 가이드</h2>
        </div>

        {stadiumsStatus === 'error' && stadiumsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{stadiumsError}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 flex-shrink-0"
              onClick={retryStadiums}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              재시도
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                구장 선택
              </h3>
              <div className="relative">
                <select
                  value={selectedStadium?.stadiumId || ''}
                  onChange={(e) => handleStadiumChange(e.target.value)}
                  disabled={stadiumControlsDisabled}
                  className="stadium-guide-select w-full py-6 px-4 pr-12 bg-white dark:bg-card border-2 rounded-2xl text-base cursor-pointer dark:text-gray-200"
                  style={{
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  {stadiums.length === 0 && (
                    <option value="">
                      {stadiumsStatus === 'loading'
                        ? '구장 목록 로딩 중...'
                        : stadiumsStatus === 'error'
                          ? '구장 정보를 불러오지 못했습니다.'
                          : '등록된 구장이 없습니다.'}
                    </option>
                  )}
                  {stadiums.map((stadium) => (
                    <option key={stadium.stadiumId} value={stadium.stadiumId}>
                      {stadium.stadiumName}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDark ? '#e5e7eb' : THEME_COLORS.primary}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                  구장 위치
                </h3>
              </div>

              {selectedStadium && (
                <div
                  className="mb-4 p-4 rounded-xl border-2 dark:bg-card dark:border-border"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryBg,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5" style={{ color: THEME_COLORS.primary }} />
                        <h4 className="dark:text-white" style={{ fontWeight: 700, color: isDark ? '#fff' : THEME_COLORS.primary }}>
                          {selectedStadium.stadiumName}
                        </h4>
                        {isLoggedIn && selectedStadiumId && (
                          <Suspense fallback={null}>
                            <AuthenticatedStadiumFavoriteToggle stadiumId={selectedStadiumId} />
                          </Suspense>
                        )}
                      </div>
                      {selectedStadiumAddress && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                          📍 {selectedStadiumAddress}
                        </p>
                      )}
                      {selectedStadiumPhone && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">📞 {selectedStadiumPhone}</p>
                      )}
                      {!hasStadiumCoordinates && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                          좌표 정보가 없어 길찾기/지도 표시를 제공할 수 없습니다.
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => openKakaoMapRoute(selectedStadium.stadiumName, selectedStadium.lat, selectedStadium.lng)}
                      disabled={!hasStadiumCoordinates}
                      className="px-6 py-3 rounded-lg text-white transition-colors hover:opacity-90 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: THEME_COLORS.primary }}
                    >
                      길찾기
                    </Button>
                  </div>
                </div>
              )}

              {canRenderMap ? (
                <div
                  className="p-2 rounded-3xl border-2 dark:bg-card dark:border-border"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <div
                    ref={mapContainer}
                    className="stadium-guide-map rounded-2xl overflow-hidden"
                  />
                </div>
              ) : (
                <Card
                  className="stadium-guide-map-frame p-12 flex flex-col items-center justify-center rounded-3xl border-2 dark:bg-card dark:border-border"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <MapPin className="w-16 h-16 mb-4" style={{ color: THEME_COLORS.primary }} />
                  <h4 style={{ color: THEME_COLORS.primary, fontWeight: 700 }}>
                    {selectedStadium?.stadiumName || '구장을 선택하세요'}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">주변 지도</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-4">
                    {!selectedStadium
                      ? '구장을 선택하면 지도를 표시합니다.'
                      : !KAKAO_API_KEY
                        ? '카카오맵 API 키를 설정해주세요.'
                        : !hasStadiumCoordinates
                          ? '선택된 구장의 좌표 정보가 없어 지도를 표시할 수 없습니다.'
                          : mapStatus === 'loading'
                            ? '지도를 준비하고 있습니다...'
                            : formatOptionalText(mapError, '현재 도메인에서 지도를 사용할 수 없습니다.')}
                  </p>
                  {selectedStadium && KAKAO_API_KEY && hasStadiumCoordinates && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={retryMap}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      지도 다시 시도
                    </Button>
                  )}
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                카테고리
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(CATEGORY_CONFIGS).map((config) => {
                  const Icon = config.icon;
                  const isSelected = selectedCategory === config.key;

                  return (
                    <button
                      type="button"
                      key={config.key}
                      onClick={() => { setSelectedCategory(config.key); setSearchQuery(''); }}
                      disabled={stadiumControlsDisabled}
                      className="py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 dark:bg-card"
                      style={{
                        backgroundColor: isSelected
                          ? (isDark ? `${config.color}22` : config.bgColor)
                          : (isDark ? '#1f2937' : 'white'),
                        borderColor: isSelected
                          ? config.borderColor
                          : (isDark ? '#374151' : THEME_COLORS.border),
                        color: isSelected
                          ? config.color
                          : (isDark ? '#9ca3af' : THEME_COLORS.gray),
                        opacity: stadiumControlsDisabled ? 0.5 : 1,
                      }}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-sm" style={{ fontWeight: isSelected ? 700 : 400 }}>
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedStadium && (
              <Suspense fallback={null}>
                <StadiumGuideAdSlot
                  slotId="stadium_partner_1"
                  pageType="stadium"
                  contentId={selectedStadiumId}
                  creativeType="sponsor_card"
                  loggedIn={isLoggedIn}
                  minHeight={176}
                />
              </Suspense>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                  {CATEGORY_CONFIGS[selectedCategory].label} 목록
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {filteredPlaces.length}개
                </span>
              </div>

              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="장소 이름 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={listControlsDisabled}
                    className="pl-9 h-9 text-sm dark:bg-card dark:border-border"
                  />
                </div>
                <div className="relative">
                  <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as StadiumGuideSortOrder)}
                    disabled={listControlsDisabled}
                    className="stadium-guide-select h-9 pl-8 pr-3 text-sm rounded-md border border-input bg-background dark:bg-card dark:border-border dark:text-gray-200 cursor-pointer"
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
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-semibold">
                              {formatOptionalText(listError, '목록을 불러오지 못했습니다.')}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700"
                            onClick={retryPlaces}
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
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
                                  {placeDescription && (
                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">
                                      {placeDescription}
                                    </p>
                                  )}
                                  {placeAddress && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300">📍 {placeAddress}</p>
                                  )}
                                  {placePhone && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300">📞 {placePhone}</p>
                                  )}
                                  {(placeOpenTime || placeCloseTime) && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                      ⏰ {formatOptionalText(placeOpenTime)} - {formatOptionalText(placeCloseTime)}
                                    </p>
                                  )}
                                  {!hasPlaceCoordinates && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                      좌표 정보가 없어 길찾기를 제공할 수 없습니다.
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  {typeof place.rating === 'number' && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-yellow-500">★</span>
                                      <span style={{ fontWeight: 700 }} className="dark:text-white">
                                        {place.rating.toFixed(1)}
                                      </span>
                                    </div>
                                  )}

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
                          {!selectedStadium ? (
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
          </div>
        </div>
      </div>
    </div>
  );
}
