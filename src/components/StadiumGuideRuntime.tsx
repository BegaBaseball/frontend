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
import { resolveStadiumSeatMapEntry } from './stadiumSeatMapRegistry';
import { StadiumSeatMapManualRequired } from './StadiumSeatMapStates';
import { SeatMapRuntimeShell } from './stadiumSeatMap/SeatMapRuntimeShell';
import { getCategoryIcon } from '../utils/stadium';
import { useStadiumGuide } from '../hooks/useStadiumGuide';
import { useTheme } from '../hooks/useTheme';
import { useAuthSession, useAuthProfileSnapshot } from '../store/authStore';
import AdSlot from './ads/AdSlot';
import {
  formatOptionalText,
  hasValidCoordinates,
  normalizeOptionalText,
} from '../utils/stadiumGuideUtils';
import { getStadiumDisplayName } from '../utils/stadiumDisplay';
import type { CategoryType } from '../types/stadium';
import './StadiumGuide.css';

const AuthenticatedStadiumFavoriteToggle = lazy(() => import('./AuthenticatedStadiumFavoriteToggle'));
const StadiumGuidePlacesRuntime = lazy(() => import('./StadiumGuidePlacesRuntime'));

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
    ? 'stadium-guide-category-button flex h-[86px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-xl border px-2 py-3 shadow-sm transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:hover:translate-y-0'
    : 'stadium-guide-category-button flex min-h-[108px] flex-col items-center justify-center gap-2.5 rounded-2xl border-2 px-3 py-5 shadow-sm transition-all hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:hover:translate-y-0 sm:min-h-[132px] sm:gap-3 sm:py-8';
  const iconWrapClass = compact
    ? 'rounded-full p-2.5'
    : 'rounded-full p-2.5 sm:p-3';
  const iconClass = compact ? 'h-6 w-6' : 'h-6 w-6 sm:h-8 sm:w-8';
  const labelClass = compact ? 'text-sm font-black leading-tight break-keep' : 'text-sm font-bold sm:text-[17px] break-keep';

  return (
    <div className={gridClass}>
      {Object.values(CATEGORY_CONFIGS).map((config) => {
        const Icon = getCategoryIcon(config.iconKey);
        const isSelected = selectedCategory === config.key;
        const categoryAccent = isDark && (config.key === 'store' || config.key === 'parking')
          ? STADIUM_DARK_COLORS.accentHex
          : config.color;

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
                ? (isDark ? `${categoryAccent}22` : config.bgColor)
                : (isDark ? STADIUM_DARK_COLORS.raised : 'white'),
              borderColor: isSelected
                ? (isDark ? `${categoryAccent}99` : config.borderColor)
                : (isDark ? STADIUM_DARK_COLORS.border : THEME_COLORS.border),
              color: isSelected
                ? categoryAccent
                : (isDark ? STADIUM_DARK_COLORS.muted : THEME_COLORS.gray),
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <div className={`${iconWrapClass} ${isSelected ? '' : 'stadium-guide-category-icon bg-gray-50 dark:bg-transparent'}`}>
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
  const { userId: authUserId } = useAuthProfileSnapshot();
  const selectedStadiumId = selectedStadium?.stadiumId ?? null;
  const selectedStadiumDisplayName = getStadiumDisplayName(selectedStadium);
  const seatMapEntry = resolveStadiumSeatMapEntry(selectedStadiumId, selectedStadium?.stadiumName);
  const seatMapBadgeLabel = seatMapEntry?.badgeLabel ?? '좌석도 준비 필요';

  const effectiveTheme = resolvedTheme ?? theme;
  const isDark = effectiveTheme === 'dark';
  const stadiumTitleColor = isDark ? STADIUM_DARK_COLORS.text : THEME_COLORS.primary;
  const stadiumAccentColor = isDark ? STADIUM_DARK_COLORS.accent : THEME_COLORS.primary;
  const stadiumActionStyle = {
    backgroundColor: isDark ? STADIUM_DARK_COLORS.accent : THEME_COLORS.primary,
    color: isDark ? '#03100b' : '#ffffff',
  };

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
    if (!seatMapEntry) {
      return (
        <div data-testid="stadium-seat-map">
          <StadiumSeatMapManualRequired stadiumName={selectedStadiumDisplayName} />
        </div>
      );
    }

    const SeatMapComponent = seatMapEntry.Component;
    const seatMapResetKey = [
      seatMapEntry.id,
      selectedStadiumId,
      selectedStadium?.stadiumName,
    ].filter(Boolean).join(':');
    const shellResetKey = `${seatMapEntry.shellTemplate}:${seatMapResetKey}`;

    return (
      <SeatMapRuntimeShell
        template={seatMapEntry.shellTemplate}
        usesCoordinateGeometry={seatMapEntry.usesCoordinateGeometry}
        badgeLabel={seatMapEntry.badgeLabel}
        stadiumName={selectedStadiumDisplayName}
        resetKey={shellResetKey}
      >
        <SeatMapComponent />
      </SeatMapRuntimeShell>
    );
  };

  return (
    <div className="stadium-guide-page min-h-screen bg-white dark:bg-background transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Hero Section */}
        <section
          className="stadium-hero-container rounded-2xl border border-primary/30 px-5 py-5 sm:px-6 sm:py-6"
          style={{
            backgroundColor: isDark ? undefined : THEME_COLORS.primaryBg,
          }}
        >
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 dark:bg-[rgba(126,211,179,0.08)]">
                <MapPinIcon className="h-5 w-5 text-primary" style={{ color: isDark ? STADIUM_DARK_COLORS.accent : undefined }} />
              </div>
              <h1
                className="font-bold text-xl tracking-tight text-primary sm:text-2xl text-balance"
                style={{ color: isDark ? STADIUM_DARK_COLORS.accent : undefined }}
              >
                구장 가이드
              </h1>
            </div>
            <p className="stadium-guide-muted w-full max-w-none text-sm leading-relaxed text-gray-700 dark:text-white/90 sm:text-base text-balance">
              전국 KBO 야구장의 상세한 위치 정보부터 명당 자리, 주변 맛집까지
              직관을 위한 모든 필수 정보를 베가(BEGA)에서 확인하세요.
            </p>
          </div>
        </section>

        {stadiumsStatus === 'error' && stadiumsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-400/30 dark:text-red-200 px-4 py-3 rounded-lg mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WarningTriangleIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-[16px]">{stadiumsError}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 dark:bg-transparent dark:text-red-200 dark:border-red-400/30 dark:hover:bg-red-400/10 flex-shrink-0"
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
              <h3 className="text-xl mb-4 font-bold dark:text-white text-balance" style={{ color: stadiumTitleColor }}>
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
                  className="stadium-guide-select stadium-guide-control w-full rounded-2xl border-2 bg-white px-4 py-4 pr-11 text-base font-bold shadow-sm transition-all cursor-pointer focus:ring-2 focus:ring-primary/20 dark:text-white sm:px-6 sm:py-6 sm:pr-12 sm:text-lg"
                  style={{
                    borderColor: isDark ? STADIUM_DARK_COLORS.borderStrong : THEME_COLORS.primary,
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
                      {getStadiumDisplayName(stadium)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 sm:right-6">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDark ? STADIUM_DARK_COLORS.accentHex : THEME_COLORS.primary}
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
                <h3 className="text-xl font-bold dark:text-white text-balance" style={{ color: stadiumTitleColor }}>
                  구장 위치 & 단축 경로
                </h3>
              </div>

              {selectedStadium && (
                <div
                  className="stadium-guide-panel-strong mb-6 rounded-2xl border-2 p-4 shadow-sm sm:p-6"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryBg,
                    borderColor: isDark ? undefined : THEME_COLORS.primary,
                  }}
                >
                  <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="p-1.5 bg-primary/10 rounded-lg dark:bg-[rgba(126,211,179,0.08)]">
                          <MapPinIcon className="w-5 h-5" style={{ color: stadiumAccentColor }} />
                        </div>
                        <h4 className="text-xl dark:text-white" style={{ fontWeight: 800, color: stadiumTitleColor }}>
                          {selectedStadiumDisplayName}
                        </h4>
                        {isLoggedIn && selectedStadiumId && (
                          <Suspense fallback={null}>
                            <AuthenticatedStadiumFavoriteToggle stadiumId={selectedStadiumId} />
                          </Suspense>
                        )}
                      </div>
                      {selectedStadiumAddress && (
                        <p className="stadium-guide-muted mb-2 flex items-center gap-2 text-sm text-gray-600 dark:text-white sm:text-[17px]">
                          <span className="opacity-60">📍</span> {selectedStadiumAddress}
                        </p>
                      )}
                      {selectedStadiumPhone && (
                        <p className="stadium-guide-muted flex items-center gap-2 text-sm text-gray-600 dark:text-white sm:text-[17px]">
                          <span className="opacity-60">📞</span> {selectedStadiumPhone}
                        </p>
                      )}
                    </div>
                    <Button
                      size="touch"
                      onClick={() => openKakaoMapRoute(selectedStadium.stadiumName, selectedStadium.lat, selectedStadium.lng)}
                      disabled={!hasStadiumCoordinates}
                      className="w-full rounded-xl px-6 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 md:w-auto sm:px-8 sm:text-lg"
                      style={stadiumActionStyle}
                    >
                      카카오맵 길찾기
                    </Button>
                  </div>
                </div>
              )}

              {canRenderMap ? (
                <div
                  className="stadium-guide-panel-strong rounded-[1.75rem] border-2 p-2 shadow-inner sm:rounded-[2.5rem] sm:p-3"
                  role="region"
                  aria-label={`${selectedStadiumDisplayName || '선택한 구장'} 주변 지도`}
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? undefined : THEME_COLORS.primary,
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
                  className="stadium-guide-map-frame stadium-guide-panel-strong flex flex-col items-center justify-center rounded-[1.75rem] border-2 p-6 sm:rounded-[2.5rem] sm:p-12"
                  role="status"
                  aria-live="polite"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? undefined : THEME_COLORS.primary,
                  }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-primary/15 dark:bg-[rgba(126,211,179,0.08)] dark:ring-[rgba(126,211,179,0.18)]">
                    <MapPinIcon className="h-8 w-8 opacity-70" style={{ color: stadiumAccentColor }} />
                  </div>
                  <span
                    className="mt-5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
                    style={{ color: stadiumAccentColor, backgroundColor: isDark ? 'rgba(126, 211, 179, 0.1)' : undefined }}
                  >
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
                  <h4 className="mt-3 text-center text-lg sm:text-xl" style={{ color: stadiumTitleColor, fontWeight: 800 }}>
                    {selectedStadiumDisplayName || '구장을 선택하세요'}
                  </h4>
                  <p className="stadium-guide-muted mt-3 max-w-sm text-center text-sm leading-relaxed text-gray-500 dark:text-white sm:text-[16px]">
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
                    <p className="stadium-guide-muted mt-4 rounded-xl bg-white/70 px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:bg-[rgba(0,0,0,0.82)] dark:text-white">
                      상단의 구장 선택 메뉴에서 원하는 구장을 먼저 선택하세요.
                    </p>
                  )}
                  {selectedStadium && !KAKAO_API_KEY && (
                    <p className="stadium-guide-muted mt-4 rounded-xl bg-white/70 px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:bg-[rgba(0,0,0,0.82)] dark:text-white">
                      운영 환경의 카카오맵 JavaScript API 키 설정을 확인해야 합니다.
                    </p>
                  )}
                  {canShowMapFallbackActions && selectedStadium && (
                    <div className="mt-5 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="touch"
                        className="rounded-xl border-primary/25 bg-white px-5 font-bold text-primary hover:bg-primary/10 dark:bg-transparent dark:hover:bg-[rgba(126,211,179,0.1)]"
                        onClick={retryMap}
                        style={{ borderColor: isDark ? STADIUM_DARK_COLORS.borderStrong : undefined, color: stadiumAccentColor }}
                      >
                        <RefreshIcon className="mr-2 h-4 w-4" />
                        지도 다시 시도
                      </Button>
                      <Button
                        type="button"
                        size="touch"
                        className="rounded-xl px-5 font-bold text-white shadow-sm"
                        style={stadiumActionStyle}
                        onClick={() => openKakaoMapRoute(selectedStadium.stadiumName, selectedStadium.lat, selectedStadium.lng)}
                      >
                        카카오맵에서 열기
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </div>

            <div className="space-y-8 lg:hidden" data-testid="stadium-guide-mobile-panels">
              <div>
                <h3 className="text-xl mb-4 font-bold dark:text-white" style={{ color: stadiumTitleColor }}>
                  주변 정보 카테고리
                </h3>
                <StadiumGuideCategorySelector
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  disabled={stadiumControlsDisabled}
                  isDark={isDark}
                  compact
                />
              </div>

              <AdSlot
                slotId="stadium_partner_1"
                pageType="stadium"
                contentId={selectedStadiumId !== null ? String(selectedStadiumId) : null}
                disabled={!selectedStadiumId}
                loggedIn={isLoggedIn}
                userId={authUserId ? String(authUserId) : null}
              />

              <div>
                <Suspense fallback={null}>
                  <StadiumGuidePlacesRuntime
                    selectedStadiumId={selectedStadiumId}
                    selectedStadiumName={selectedStadiumDisplayName || null}
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
                  <h3 className="text-xl font-bold dark:text-white" style={{ color: stadiumTitleColor }}>
                    좌석 배치도
                  </h3>
                  <span
                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-bold"
                    style={{ color: stadiumAccentColor, backgroundColor: isDark ? 'rgba(126, 211, 179, 0.1)' : undefined }}
                  >
                    {seatMapBadgeLabel}
                  </span>
                </div>
                {renderSeatMap()}
                <div
                  className="h-[var(--mobile-footer-safe-bottom)] lg:hidden"
                  aria-hidden="true"
                  data-testid="stadium-mobile-bottom-spacer"
                />
              </div>
            </div>
          </div>

          <div className="hidden space-y-8 sm:space-y-10 lg:block" data-testid="stadium-guide-desktop-panels">
            <div>
              <h3 className="text-xl mb-4 font-bold dark:text-white" style={{ color: stadiumTitleColor }}>
                주변 정보 카테고리
              </h3>
              <StadiumGuideCategorySelector
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                disabled={stadiumControlsDisabled}
                isDark={isDark}
                compact
              />
            </div>

            <AdSlot
              slotId="stadium_partner_1"
              pageType="stadium"
              contentId={selectedStadiumId !== null ? String(selectedStadiumId) : null}
              disabled={!selectedStadiumId}
              loggedIn={isLoggedIn}
              userId={authUserId ? String(authUserId) : null}
            />

            <div>
              <Suspense fallback={null}>
                <StadiumGuidePlacesRuntime
                  selectedStadiumId={selectedStadiumId}
                  selectedStadiumName={selectedStadiumDisplayName || null}
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

        <div className="mt-8 hidden lg:block" data-testid="stadium-guide-seatmap">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold dark:text-white" style={{ color: stadiumTitleColor }}>
              좌석 배치도
            </h3>
            <span
              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-bold"
              style={{ color: stadiumAccentColor, backgroundColor: isDark ? 'rgba(126, 211, 179, 0.1)' : undefined }}
            >
              {seatMapBadgeLabel}
            </span>
          </div>
          {renderSeatMap()}
        </div>
      </div>
    </div>
  );
}
