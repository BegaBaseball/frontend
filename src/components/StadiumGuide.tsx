import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import { MapPin, RefreshCw, AlertTriangle, Search, ArrowUpDown, Heart } from 'lucide-react';
import { KAKAO_API_KEY, CATEGORY_CONFIGS, THEME_COLORS } from '../utils/constants';
import { openKakaoMapRoute } from '../utils/kakaoMap';
import { getCategoryIconConfig } from '../utils/stadium';
import { useStadiumGuide } from '../hooks/useStadiumGuide';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { getMyFavoriteStadiumIds, addStadiumFavorite, removeStadiumFavorite } from '../api/stadium';

type SortOrder = 'default' | 'rating' | 'name';

export default function StadiumGuide() {
  const { theme, resolvedTheme } = useTheme();
  const {
    stadiums,
    selectedStadium,
    selectedCategory,
    setSelectedCategory,
    places,
    selectedPlace,
    loading,
    error,
    isMapReady,
    mapContainer,
    handleStadiumChange,
    handlePlaceClick,
  } = useStadiumGuide();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');

  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const queryClient = useQueryClient();

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['stadium-favorites'],
    queryFn: getMyFavoriteStadiumIds,
    enabled: isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });

  const selectedStadiumId = selectedStadium?.stadiumId ?? null;
  const isFav = selectedStadiumId ? favoriteIds.includes(selectedStadiumId) : false;

  const favMutation = useMutation({
    mutationFn: ({ id, currentlyFav }: { id: string; currentlyFav: boolean }) =>
      currentlyFav ? removeStadiumFavorite(id) : addStadiumFavorite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stadium-favorites'] }),
    onError: () => toast.error('즐겨찾기를 변경하지 못했습니다. 다시 시도해 주세요.'),
  });

  // 다크 모드인지 확인
  const effectiveTheme = resolvedTheme ?? theme;
  const isDark = effectiveTheme === 'dark';

  const filteredPlaces = useMemo(() => {
    let result = places;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (sortOrder === 'rating') {
      result = [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortOrder === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }
    return result;
  }, [places, searchQuery, sortOrder]);

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-7 h-7" style={{ color: THEME_COLORS.primary }} />
          <h2 className="text-2xl sm:text-3xl" style={{ color: THEME_COLORS.primary, fontWeight: 900 }}>구장 가이드</h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded-lg mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 flex-shrink-0"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              재시도
            </Button>
          </div>
        )}

        {/* 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Stadium Selector & Map */}
          <div className="space-y-6">
            {/* Stadium Selector */}
            <div>
              <h3 className="mb-3 font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                구장 선택
              </h3>
              <style>{`
                select {
                  -webkit-appearance: none;
                  -moz-appearance: none;
                  appearance: none;
                }
                select::-ms-expand {
                  display: none;
                }
              `}</style>
              <div className="relative">
                <select
                  value={selectedStadium?.stadiumId || ''}
                  onChange={(e) => handleStadiumChange(e.target.value)}
                  className="w-full py-6 px-4 pr-12 bg-white dark:bg-card border-2 rounded-2xl text-base cursor-pointer dark:text-gray-200"
                  style={{
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                  }}
                >
                  {stadiums.map((stadium) => (
                    <option key={stadium.stadiumId} value={stadium.stadiumId}>
                      {stadium.stadiumName}
                    </option>
                  ))}
                </select>
                {/* 커스텀 화살표 */}
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
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            {/* Stadium Info & Map */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                  구장 위치
                </h3>
              </div>

              {/* 구장 정보 카드 */}
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
                          <button
                            onClick={() => selectedStadiumId && favMutation.mutate({ id: selectedStadiumId, currentlyFav: isFav })}
                            disabled={favMutation.isPending}
                            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                            aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                          >
                            <Heart
                              className={isFav ? 'fill-red-400 text-red-400' : 'text-gray-400 dark:text-white/60'}
                              size={18}
                            />
                          </button>
                        )}
                      </div>
                      {selectedStadium.address && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                          📍 {selectedStadium.address}
                        </p>
                      )}
                      {selectedStadium.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">📞 {selectedStadium.phone}</p>
                      )}
                    </div>
                    <Button
                      onClick={() =>
                        openKakaoMapRoute(
                          selectedStadium.stadiumName,
                          selectedStadium.lat,
                          selectedStadium.lng
                        )
                      }
                      className="px-6 py-3 rounded-lg text-white transition-colors hover:opacity-90 whitespace-nowrap"
                      style={{ backgroundColor: THEME_COLORS.primary }}
                    >
                      길찾기
                    </Button>
                  </div>
                </div>
              )}

              {selectedStadium && KAKAO_API_KEY && isMapReady ? (
                <div
                  className="p-2 rounded-3xl border-2 dark:bg-card dark:border-border"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                  }}
                >
                  <div
                    ref={mapContainer}
                    style={{ width: '100%', height: '500px' }}
                    className="rounded-2xl overflow-hidden kakao-map-container"
                  />
                </div>
              ) : (
                <Card
                  className="p-12 flex flex-col items-center justify-center rounded-3xl border-2 dark:bg-card dark:border-border"
                  style={{
                    backgroundColor: isDark ? undefined : THEME_COLORS.primaryLight,
                    borderColor: isDark ? '#374151' : THEME_COLORS.primary,
                    minHeight: '500px',
                  }}
                >
                  <MapPin className="w-16 h-16 mb-4" style={{ color: THEME_COLORS.primary }} />
                  <h4 style={{ color: THEME_COLORS.primary, fontWeight: 700 }}>
                    {selectedStadium?.stadiumName || '구장을 선택하세요'}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">주변 지도</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-4">
                    {!KAKAO_API_KEY ? '* 카카오맵 API 키를 설정해주세요' : '* 지도 로딩 중이거나 현재 도메인에서 지도를 사용할 수 없습니다.'}
                  </p>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column - Category Filter & Results */}
          <div className="space-y-6">
            {/* Category Buttons */}
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
                      key={config.key}
                      onClick={() => { setSelectedCategory(config.key); setSearchQuery(''); }}
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

            {/* Results List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold dark:text-gray-200" style={{ color: isDark ? '#e5e7eb' : THEME_COLORS.primary }}>
                  {CATEGORY_CONFIGS[selectedCategory].label} 목록
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {filteredPlaces.length}개
                </span>
              </div>

              {/* 검색 + 정렬 */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="장소 이름 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm dark:bg-card dark:border-border"
                  />
                </div>
                <div className="relative">
                  <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                    className="h-9 pl-8 pr-3 text-sm rounded-md border border-input bg-background dark:bg-card dark:border-border dark:text-gray-200 cursor-pointer"
                  >
                    <option value="default">기본순</option>
                    <option value="rating">평점순</option>
                    <option value="name">이름순</option>
                  </select>
                </div>
              </div>

              <style>{`
                .custom-scroll-area::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scroll-area::-webkit-scrollbar-track {
                  background: ${isDark ? '#374151' : THEME_COLORS.primaryLight};
                  border-radius: 10px;
                }
                .custom-scroll-area::-webkit-scrollbar-thumb {
                  background: ${THEME_COLORS.primary};
                  border-radius: 10px;
                }
                .custom-scroll-area::-webkit-scrollbar-thumb:hover {
                  background: #1f4438;
                }
              `}</style>

              {loading ? (
                <div
                  className="rounded-2xl border-2 overflow-hidden dark:bg-card dark:border-border p-4 space-y-3"
                  style={{
                    height: '550px',
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
                  className="rounded-2xl border-2 overflow-hidden dark:bg-card dark:border-border"
                  style={{
                    height: '550px',
                    borderColor: isDark ? '#374151' : THEME_COLORS.border,
                    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                  }}
                >
                  <div
                    className="h-full p-4 overflow-y-auto custom-scroll-area"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: `${THEME_COLORS.primary} ${isDark ? '#374151' : THEME_COLORS.primaryLight}`,
                    }}
                  >
                    <div className="space-y-3 pr-2">
                      {filteredPlaces.length > 0 ? (
                        filteredPlaces.map((place) => {
                          const { Icon, color } = getCategoryIconConfig(place.category);
                          const isSelected = selectedPlace?.id === place.id;

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
                                {/* 왼쪽: Place 정보 (클릭 가능) */}
                                <div
                                  className="flex-1"
                                  onClick={() => handlePlaceClick(place)}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Icon className="w-5 h-5" style={{ color }} />
                                    <h4 className="dark:text-white" style={{ fontWeight: 700 }}>{place.name}</h4>
                                  </div>
                                  {place.description && (
                                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">
                                      {place.description}
                                    </p>
                                  )}
                                  {place.address && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300">📍 {place.address}</p>
                                  )}
                                  {place.phone && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300">📞 {place.phone}</p>
                                  )}
                                  {place.openTime && place.closeTime && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                      ⏰ {place.openTime} - {place.closeTime}
                                    </p>
                                  )}
                                </div>

                                {/* 오른쪽: Rating과 길찾기 버튼 */}
                                <div className="flex items-center gap-3">
                                  {place.rating && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-yellow-500">★</span>
                                      <span style={{ fontWeight: 700 }} className="dark:text-white">
                                        {place.rating.toFixed(1)}
                                      </span>
                                    </div>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openKakaoMapRoute(place.name, place.lat, place.lng);
                                    }}
                                    className="px-4 py-2 rounded-lg text-white transition-colors hover:opacity-90 whitespace-nowrap"
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
                          ) : searchQuery.trim() ? (
                            `'${searchQuery}'에 해당하는 장소가 없습니다.`
                          ) : places.length === 0 && (selectedCategory === 'store' || selectedCategory === 'parking') ? (
                            `주변 ${CATEGORY_CONFIGS[selectedCategory].label}을 검색 중입니다...`
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
