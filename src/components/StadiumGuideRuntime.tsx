import { lazy, Suspense } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { KAKAO_API_KEY, CATEGORY_CONFIGS, THEME_COLORS } from '../utils/constants';
import { openKakaoMapRoute } from '../utils/kakaoMap';
import {
  MapPinIcon,
  RefreshIcon,
  WarningTriangleIcon,
} from './icons/PublicShellIcons';
import { getCategoryIcon } from '../utils/stadium';
import { useStadiumGuide } from '../hooks/useStadiumGuide';
import { useTheme } from '../hooks/useTheme';
import { useAuthSession } from '../store/authStore';
import {
  formatOptionalText,
  hasValidCoordinates,
  normalizeOptionalText,
} from '../utils/stadiumGuideUtils';
import './StadiumGuide.css';

const AuthenticatedStadiumFavoriteToggle = lazy(() => import('./AuthenticatedStadiumFavoriteToggle'));
const StadiumGuideAdSlot = lazy(() => import('./ads/AdSlot'));
const StadiumGuidePlacesRuntime = lazy(() => import('./StadiumGuidePlacesRuntime'));

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

  const { isLoggedIn } = useAuthSession();
  const selectedStadiumId = selectedStadium?.stadiumId ?? null;

  const effectiveTheme = resolvedTheme ?? theme;
  const isDark = effectiveTheme === 'dark';

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
          <MapPinIcon className="w-7 h-7" style={{ color: THEME_COLORS.primary }} />
          <h2 className="text-2xl sm:text-3xl" style={{ color: THEME_COLORS.primary, fontWeight: 900 }}>구장 가이드</h2>
        </div>

        {stadiumsStatus === 'error' && stadiumsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WarningTriangleIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-[16px]">{stadiumsError}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 flex-shrink-0"
              onClick={retryStadiums}
            >
              <RefreshIcon className="w-3.5 h-3.5 mr-1" />
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
                        <MapPinIcon className="w-5 h-5" style={{ color: THEME_COLORS.primary }} />
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
                      <p className="text-[16px] text-gray-600 dark:text-gray-300 mb-1">
                          📍 {selectedStadiumAddress}
                        </p>
                      )}
                      {selectedStadiumPhone && (
                        <p className="text-[16px] text-gray-600 dark:text-gray-300">📞 {selectedStadiumPhone}</p>
                      )}
                      {!hasStadiumCoordinates && (
                        <p className="text-[16px] text-amber-700 dark:text-amber-400 mt-2">
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
                  <MapPinIcon className="w-16 h-16 mb-4" style={{ color: THEME_COLORS.primary }} />
                  <h4 style={{ color: THEME_COLORS.primary, fontWeight: 700 }}>
                    {selectedStadium?.stadiumName || '구장을 선택하세요'}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">주변 지도</p>
                  <p className="text-[16px] text-gray-500 dark:text-gray-300 mt-4">
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
                      <RefreshIcon className="w-3.5 h-3.5 mr-1" />
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
                  const Icon = getCategoryIcon(config.iconKey);
                  const isSelected = selectedCategory === config.key;

                  return (
                    <button
                      type="button"
                      key={config.key}
                      onClick={() => { setSelectedCategory(config.key); }}
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
                        <span className="text-[16px]" style={{ fontWeight: isSelected ? 700 : 400 }}>
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
              <Suspense fallback={null}>
                <StadiumGuidePlacesRuntime
                  selectedStadiumId={selectedStadiumId}
                  selectedStadiumName={selectedStadium?.stadiumName ?? null}
                  selectedCategory={selectedCategory}
                  places={places}
                  selectedPlace={selectedPlace}
                  listStatus={listStatus}
                  listError={listError}
                  retryPlaces={retryPlaces}
                  handlePlaceClick={handlePlaceClick}
                  listControlsDisabled={listControlsDisabled}
                  isDark={isDark}
                  isNearbyCategory={isNearbyCategory}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
