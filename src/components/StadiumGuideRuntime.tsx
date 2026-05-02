import { lazy, Suspense } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { KAKAO_API_KEY, CATEGORY_CONFIGS, THEME_COLORS } from '../utils/constants';
import { openKakaoMapRoute } from '../utils/kakaoMap';
import StadiumSeatMap, { resolveStadiumSeatMapPresetMeta } from './ui/StadiumSeatMap';
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
import type { CategoryType } from '../types/stadium';
import './StadiumGuide.css';

const AuthenticatedStadiumFavoriteToggle = lazy(() => import('./AuthenticatedStadiumFavoriteToggle'));
const JamsilSeatMap = lazy(() => import('./jamsil/JamsilSeatMap'));
const IncheonSeatMap = lazy(() => import('./incheon/IncheonSeatMap'));
const DaeguSeatMap = lazy(() => import('./daegu/DaeguSeatMap'));
const DaejeonSeatMap = lazy(() => import('./daejeon/DaejeonSeatMap'));
const GocheokSeatMap = lazy(() => import('./gocheok/GocheokSeatMap'));
const GwangjuSeatMap = lazy(() => import('./gwangju/GwangjuSeatMap'));
const ChangwonSeatMap = lazy(() => import('./changwon/ChangwonSeatMap'));
const SajikSeatMap = lazy(() => import('./sajik/SajikSeatMap'));
const SuwonSeatMap = lazy(() => import('./suwon/SuwonSeatMap'));
const StadiumGuideAdSlot = lazy(() => import('./ads/AdSlot'));
const StadiumGuidePlacesRuntime = lazy(() => import('./StadiumGuidePlacesRuntime'));

function StadiumGuideCategorySelector({
  selectedCategory,
  setSelectedCategory,
  disabled,
  isDark,
  columns = 'two',
  compact = false,
}: {
  selectedCategory: CategoryType;
  setSelectedCategory: (category: CategoryType) => void;
  disabled: boolean;
  isDark: boolean;
  columns?: 'two' | 'four';
  compact?: boolean;
}) {
  const gridClass = compact
    ? 'grid grid-cols-4 gap-2'
    : `grid grid-cols-2 gap-3 sm:gap-4 ${columns === 'four' ? 'lg:grid-cols-4' : ''}`;
  const buttonClass = compact
    ? 'flex h-[76px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border px-2 py-2.5 shadow-sm transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:hover:translate-y-0 dark:bg-card'
    : 'flex min-h-[108px] flex-col items-center justify-center gap-2.5 rounded-2xl border-2 px-3 py-5 shadow-sm transition-all hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:hover:translate-y-0 dark:bg-card sm:min-h-[132px] sm:gap-3 sm:py-8';
  const iconWrapClass = compact
    ? 'rounded-full p-2'
    : 'rounded-full p-2.5 sm:p-3';
  const iconClass = compact ? 'h-5 w-5' : 'h-6 w-6 sm:h-8 sm:w-8';
  const labelClass = compact ? 'text-[13px] font-black leading-tight' : 'text-sm font-bold sm:text-[17px]';

  return (
    <div className={gridClass}>
      {Object.values(CATEGORY_CONFIGS).map((config) => {
        const Icon = getCategoryIcon(config.iconKey);
        const isSelected = selectedCategory === config.key;

        return (
          <button
            type="button"
            key={config.key}
            onClick={() => { setSelectedCategory(config.key); }}
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={`${config.label} 주변 정보 보기`}
            className={buttonClass}
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
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <div className={`${iconWrapClass} ${isSelected ? '' : 'bg-gray-50 dark:bg-gray-800'}`}>
              <Icon className={iconClass} />
            </div>
            <span className={labelClass}>
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
  const seatMapPresetMeta = resolveStadiumSeatMapPresetMeta(selectedStadiumId, selectedStadium?.stadiumName);
  const isJamsilSeatMap = seatMapPresetMeta.id === 'jamsil';
  const isIncheonSeatMap = seatMapPresetMeta.id === 'incheon';
  const isDaejeonSeatMap = seatMapPresetMeta.id === 'daejeon';
  const isDaeguSeatMap = seatMapPresetMeta.id === 'daegu';
  const isGocheokSeatMap = seatMapPresetMeta.id === 'gocheok';
  const isGwangjuSeatMap = seatMapPresetMeta.id === 'gwangju';
  const isChangwonSeatMap = seatMapPresetMeta.id === 'changwon';
  const isSajikSeatMap = seatMapPresetMeta.id === 'sajik';
  const isSuwonSeatMap = seatMapPresetMeta.id === 'suwon';
  const seatMapBadgeLabel = isJamsilSeatMap
    ? '잠실 블록 단위 안내도'
    : isIncheonSeatMap
      ? '인천 SSG 공식 좌석도'
      : isDaejeonSeatMap
        ? '대전 한화 공식 좌석도'
        : isDaeguSeatMap
          ? '대구 삼성 공식 좌석도'
          : isGocheokSeatMap
            ? '고척 키움 공식 좌석도'
            : isGwangjuSeatMap
              ? '광주 KIA 공식 좌석도'
              : isChangwonSeatMap
                ? '창원 NC 공식 좌석도'
                : isSajikSeatMap
                  ? '사직 롯데 공식 좌석도'
                  : isSuwonSeatMap
                    ? '수원 kt 위즈 파크 공식 좌석도'
                    : seatMapPresetMeta.label;

  const effectiveTheme = resolvedTheme ?? theme;
  const isDark = effectiveTheme === 'dark';

  const isNearbyCategory = selectedCategory === 'store' || selectedCategory === 'parking';
  const listStatus = isNearbyCategory ? nearbyStatus : placesStatus;
  const listError = isNearbyCategory ? nearbyError : placesError;
  const hasStadiumCoordinates = hasValidCoordinates(selectedStadium?.lat, selectedStadium?.lng);
  const selectedStadiumAddress = normalizeOptionalText(selectedStadium?.address);
  const selectedStadiumPhone = normalizeOptionalText(selectedStadium?.phone);
  const canRenderMap = Boolean(selectedStadium && KAKAO_API_KEY && isMapReady && mapStatus === 'success' && hasStadiumCoordinates);
  const canShowMapFallbackActions = Boolean(selectedStadium && hasStadiumCoordinates && !canRenderMap);
  const stadiumControlsDisabled = stadiumsStatus === 'loading' || stadiumsStatus === 'empty' || stadiumsStatus === 'error';
  const listControlsDisabled = stadiumControlsDisabled || !selectedStadium;
  const renderSeatMap = () => {
    if (isJamsilSeatMap) {
      return (
        <Suspense fallback={<StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />}>
          <JamsilSeatMap />
        </Suspense>
      );
    }

    if (isIncheonSeatMap) {
      return (
        <Suspense fallback={<StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />}>
          <IncheonSeatMap />
        </Suspense>
      );
    }

    if (isDaeguSeatMap) {
      return (
        <Suspense fallback={<StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />}>
          <DaeguSeatMap />
        </Suspense>
      );
    }

    if (isDaejeonSeatMap) {
      return (
        <Suspense fallback={<StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />}>
          <DaejeonSeatMap />
        </Suspense>
      );
    }

    if (isGocheokSeatMap) {
      return (
        <Suspense fallback={<StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />}>
          <GocheokSeatMap />
        </Suspense>
      );
    }

    if (isGwangjuSeatMap) {
      return (
        <Suspense fallback={<StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />}>
          <GwangjuSeatMap />
        </Suspense>
      );
    }

    if (isChangwonSeatMap) {
      return (
        <Suspense fallback={<StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />}>
          <ChangwonSeatMap />
        </Suspense>
      );
    }

    if (isSajikSeatMap) {
      return (
        <Suspense fallback={<StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />}>
          <SajikSeatMap />
        </Suspense>
      );
    }

    if (isSuwonSeatMap) {
      return (
        <Suspense fallback={<StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />}>
          <SuwonSeatMap />
        </Suspense>
      );
    }

    return <StadiumSeatMap stadiumId={selectedStadiumId} stadiumName={selectedStadium?.stadiumName} />;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Hero Section */}
        <section className="stadium-hero-container">
          <div className="relative z-10 h-full p-6 sm:p-8 md:p-12 flex flex-col justify-end min-h-[300px] sm:min-h-[380px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg">
                <MapPinIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="font-black text-white tracking-tight">구장 가이드</h1>
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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-7 sm:space-y-8">
            <div>
              <h3 className="text-xl mb-4 font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                구장 선택
              </h3>
              <div className="relative">
                <select
                  id="stadium-guide-select"
                  value={selectedStadium?.stadiumId || ''}
                  onChange={(e) => handleStadiumChange(e.target.value)}
                  disabled={stadiumControlsDisabled}
                  aria-label="구장 선택"
                  aria-busy={stadiumsStatus === 'loading'}
                  className="stadium-guide-select w-full rounded-2xl border-2 bg-white px-4 py-4 pr-11 text-base font-bold shadow-sm transition-all cursor-pointer focus:ring-2 focus:ring-primary/20 dark:bg-card dark:text-gray-200 sm:px-6 sm:py-6 sm:pr-12 sm:text-lg"
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
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 sm:right-6">
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
                  className="mb-6 rounded-2xl border-2 p-4 shadow-sm dark:bg-card dark:border-border sm:p-6"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryBg,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-3">
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
                        <p className="mb-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 sm:text-[17px]">
                          <span className="opacity-60">📍</span> {selectedStadiumAddress}
                        </p>
                      )}
                      {selectedStadiumPhone && (
                        <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 sm:text-[17px]">
                          <span className="opacity-60">📞</span> {selectedStadiumPhone}
                        </p>
                      )}
                    </div>
                    <Button
                      size="touch"
                      onClick={() => openKakaoMapRoute(selectedStadium.stadiumName, selectedStadium.lat, selectedStadium.lng)}
                      disabled={!hasStadiumCoordinates}
                      className="w-full rounded-xl px-6 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 md:w-auto sm:px-8 sm:text-lg"
                      style={{ backgroundColor: THEME_COLORS.primary }}
                    >
                      카카오맵 길찾기
                    </Button>
                  </div>
                </div>
              )}

              {canRenderMap ? (
                <div
                  className="rounded-[1.75rem] border-2 p-2 shadow-inner dark:bg-card dark:border-border sm:rounded-[2.5rem] sm:p-3"
                  role="region"
                  aria-label={`${selectedStadium?.stadiumName || '선택한 구장'} 주변 지도`}
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <div
                    ref={mapContainer}
                    className="stadium-guide-map overflow-hidden rounded-[1.35rem] sm:rounded-[2rem]"
                    aria-busy={mapStatus === 'loading'}
                  />
                </div>
              ) : (
                <Card
                  className="stadium-guide-map-frame flex flex-col items-center justify-center rounded-[1.75rem] border-2 p-6 dark:bg-card dark:border-border sm:rounded-[2.5rem] sm:p-12"
                  role="status"
                  aria-live="polite"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-primary/15 dark:bg-background/70">
                    <MapPinIcon className="h-8 w-8 opacity-70" style={{ color: THEME_COLORS.primary }} />
                  </div>
                  <span className="mt-5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {!selectedStadium
                      ? '구장 선택 필요'
                      : mapStatus === 'loading'
                        ? '지도 로딩 중'
                        : !KAKAO_API_KEY
                          ? '지도 설정 필요'
                          : !hasStadiumCoordinates
                            ? '좌표 정보 없음'
                            : '지도 표시 불가'}
                  </span>
                  <h4 className="mt-3 text-center text-lg sm:text-xl" style={{ color: THEME_COLORS.primary, fontWeight: 800 }}>
                    {selectedStadium?.stadiumName || '구장을 선택하세요'}
                  </h4>
                  <p className="mt-3 max-w-sm text-center text-sm leading-relaxed text-gray-500 dark:text-gray-300 sm:text-[16px]">
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
                  {!selectedStadium && (
                    <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:bg-background/60 dark:text-gray-300">
                      상단의 구장 선택 메뉴에서 원하는 구장을 먼저 선택하세요.
                    </p>
                  )}
                  {selectedStadium && !KAKAO_API_KEY && (
                    <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:bg-background/60 dark:text-gray-300">
                      운영 환경의 카카오맵 JavaScript API 키 설정을 확인해야 합니다.
                    </p>
                  )}
                  {canShowMapFallbackActions && selectedStadium && (
                    <div className="mt-5 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="touch"
                        className="rounded-xl border-primary/25 bg-white px-5 font-bold text-primary hover:bg-primary/10 dark:bg-card dark:hover:bg-primary/15"
                        onClick={retryMap}
                      >
                        <RefreshIcon className="mr-2 h-4 w-4" />
                        지도 다시 시도
                      </Button>
                      <Button
                        type="button"
                        size="touch"
                        className="rounded-xl px-5 font-bold text-white shadow-sm"
                        style={{ backgroundColor: THEME_COLORS.primary }}
                        onClick={() => openKakaoMapRoute(selectedStadium.stadiumName, selectedStadium.lat, selectedStadium.lng)}
                      >
                        카카오맵에서 열기
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </div>

            <div className="space-y-8 lg:hidden">
              <div>
                <h3 className="text-xl mb-4 font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                  주변 정보 카테고리
                </h3>
                <StadiumGuideCategorySelector
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  disabled={stadiumControlsDisabled}
                  isDark={isDark}
                  columns="four"
                  compact
                />
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

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                    좌석 배치도
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-bold">
                    {seatMapBadgeLabel}
                  </span>
                </div>
                {renderSeatMap()}
              </div>
            </div>
          </div>

          <div className="hidden space-y-8 sm:space-y-10 lg:block">
            <div>
              <h3 className="text-xl mb-4 font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                주변 정보 카테고리
              </h3>
              <StadiumGuideCategorySelector
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                disabled={stadiumControlsDisabled}
                isDark={isDark}
              />
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

        <div className="mt-8 hidden lg:block">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
              좌석 배치도
            </h3>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-bold">
              {seatMapBadgeLabel}
            </span>
          </div>
          {renderSeatMap()}
        </div>
      </div>
    </div>
  );
}
