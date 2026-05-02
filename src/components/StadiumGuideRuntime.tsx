import { lazy, Suspense } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { KAKAO_API_KEY, CATEGORY_CONFIGS, THEME_COLORS } from '../utils/constants';
import { openKakaoMapRoute } from '../utils/kakaoMap';
import stadiumBg from '../assets/stadium.webp';
import StadiumSeatMap from './ui/StadiumSeatMap';
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
        {/* Premium Hero Section */}
        <section className="stadium-hero-container">
          <div
            className="stadium-hero-bg"
            style={{ backgroundImage: `url(${stadiumBg})` }}
          />
          <div className="stadium-hero-overlay" />
          <div className="relative z-10 h-full p-8 md:p-12 flex flex-col justify-end min-h-[380px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg">
                <MapPinIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">구장 가이드</h1>
            </div>
            <p className="text-lg text-white/80 max-w-xl leading-relaxed">
              전국 KBO 야구장의 상세한 위치 정보부터 명당 자리, 주변 맛집까지
              직관을 위한 모든 필수 정보를 베가(BEGA)에서 확인하세요.
            </p>
          </div>
        </section>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div>
              <h3 className="text-xl mb-4 font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                구장 선택
              </h3>
              <div className="relative">
                <select
                  value={selectedStadium?.stadiumId || ''}
                  onChange={(e) => handleStadiumChange(e.target.value)}
                  disabled={stadiumControlsDisabled}
                  className="stadium-guide-select w-full py-6 px-6 pr-12 bg-white dark:bg-card border-2 rounded-2xl text-lg font-bold shadow-sm transition-all focus:ring-2 focus:ring-primary/20 cursor-pointer dark:text-gray-200"
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
                <div className="absolute right-6 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDark ? '#e5e7eb' : THEME_COLORS.primary}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                  구장 위치 & 단축 경로
                </h3>
              </div>

              {selectedStadium && (
                <div
                  className="mb-6 p-6 rounded-2xl border-2 dark:bg-card dark:border-border shadow-sm"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryBg,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <MapPinIcon className="w-5 h-5" style={{ color: THEME_COLORS.primary }} />
                        </div>
                        <h4 className="text-xl dark:text-white" style={{ fontWeight: 800, color: isDark ? '#fff' : THEME_COLORS.primary }}>
                          {selectedStadium.stadiumName}
                        </h4>
                        {isLoggedIn && selectedStadiumId && (
                          <Suspense fallback={null}>
                            <AuthenticatedStadiumFavoriteToggle stadiumId={selectedStadiumId} />
                          </Suspense>
                        )}
                      </div>
                      {selectedStadiumAddress && (
                      <p className="text-[17px] text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-2">
                          <span className="opacity-60">📍</span> {selectedStadiumAddress}
                        </p>
                      )}
                      {selectedStadiumPhone && (
                        <p className="text-[17px] text-gray-600 dark:text-gray-300 flex items-center gap-2">
                          <span className="opacity-60">📞</span> {selectedStadiumPhone}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => openKakaoMapRoute(selectedStadium.stadiumName, selectedStadium.lat, selectedStadium.lng)}
                      disabled={!hasStadiumCoordinates}
                      className="w-full md:w-auto px-8 py-4 rounded-xl text-lg font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50"
                      style={{ backgroundColor: THEME_COLORS.primary }}
                    >
                      카카오맵 길찾기
                    </Button>
                  </div>
                </div>
              )}

              {canRenderMap ? (
                <div
                  className="p-3 rounded-[2.5rem] border-2 dark:bg-card dark:border-border shadow-inner"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <div
                    ref={mapContainer}
                    className="stadium-guide-map rounded-[2rem] overflow-hidden"
                  />
                </div>
              ) : (
                <Card
                  className="stadium-guide-map-frame p-12 flex flex-col items-center justify-center rounded-[2.5rem] border-2 dark:bg-card dark:border-border"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <MapPinIcon className="w-16 h-16 mb-4 opacity-20" style={{ color: THEME_COLORS.primary }} />
                  <h4 className="text-xl" style={{ color: THEME_COLORS.primary, fontWeight: 800 }}>
                    {selectedStadium?.stadiumName || '구장을 선택하세요'}
                  </h4>
                  <p className="text-[16px] text-gray-500 dark:text-gray-300 mt-4 text-center max-w-xs">
                    {!selectedStadium
                      ? '구장을 선택하면 주변 지도를 표시합니다.'
                      : !KAKAO_API_KEY
                        ? '카카오맵 API 키가 설정되지 않았습니다.'
                        : !hasStadiumCoordinates
                          ? '구장의 좌표 정보가 없어 지도를 표시할 수 없습니다.'
                          : mapStatus === 'loading'
                            ? '지도를 로딩 중입니다...'
                            : formatOptionalText(mapError, '지도를 불러올 수 없습니다.')}
                  </p>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-10">
            {/* Interactive Seat Map Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                  좌석 배치도 (Concept)
                </h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-bold">INTERACTIVE</span>
              </div>
              <StadiumSeatMap />
            </div>

            <div>
              <h3 className="text-xl mb-4 font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                주변 정보 카테고리
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.values(CATEGORY_CONFIGS).map((config) => {
                  const Icon = getCategoryIcon(config.iconKey);
                  const isSelected = selectedCategory === config.key;

                  return (
                    <button
                      type="button"
                      key={config.key}
                      onClick={() => { setSelectedCategory(config.key); }}
                      disabled={stadiumControlsDisabled}
                      className="py-8 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 dark:bg-card shadow-sm hover:translate-y--1"
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
                      <div className={`p-3 rounded-full ${isSelected ? '' : 'bg-gray-50 dark:bg-gray-800'}`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <span className="text-[17px] font-bold">
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

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
