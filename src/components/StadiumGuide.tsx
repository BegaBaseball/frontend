import { Card } from './ui/card';
import { Button } from './ui/button';
import { MapPin } from 'lucide-react';
import ChatBot from './ChatBot';
import { KAKAO_API_KEY, CATEGORY_CONFIGS, THEME_COLORS } from '../utils/constants';
import { openKakaoMapRoute } from '../utils/kakaoMap';
import { getCategoryIconConfig } from '../utils/stadium';
import { useStadiumGuide } from '../hooks/useStadiumGuide';

export default function StadiumGuide() {
  const {
    stadiums,
    selectedStadium,
    selectedCategory,
    setSelectedCategory,
    places,
    selectedPlace,
    loading,
    error,
    mapContainer,
    handleStadiumChange,
    handlePlaceClick,
  } = useStadiumGuide();

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-7 h-7" style={{ color: THEME_COLORS.primary }} />
          <h2 style={{ color: THEME_COLORS.primary, fontWeight: 900 }}>구장 가이드</h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Stadium Selector & Map */}
          <div className="space-y-6">
            {/* Stadium Selector */}
            <div>
              <h3 className="mb-3" style={{ color: THEME_COLORS.primary }}>
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
                  className="w-full py-6 px-4 pr-12 bg-white border-2 rounded-2xl text-base cursor-pointer"
                  style={{
                    borderColor: THEME_COLORS.primary,
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
                    stroke={THEME_COLORS.primary}
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
              <h3 className="mb-3" style={{ color: THEME_COLORS.primary }}>
                구장 위치
              </h3>

              {/* 구장 정보 카드 */}
              {selectedStadium && (
                <div
                  className="mb-4 p-4 rounded-xl border-2"
                  style={{
                    backgroundColor: THEME_COLORS.primaryBg,
                    borderColor: THEME_COLORS.primary,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5" style={{ color: THEME_COLORS.primary }} />
                        <h4 style={{ fontWeight: 700, color: THEME_COLORS.primary }}>
                          {selectedStadium.stadiumName}
                        </h4>
                      </div>
                      {selectedStadium.address && (
                        <p className="text-sm text-gray-600 mb-1">
                          📍 {selectedStadium.address}
                        </p>
                      )}
                      {selectedStadium.phone && (
                        <p className="text-sm text-gray-600">📞 {selectedStadium.phone}</p>
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

              {/* 지도 */}
              {selectedStadium && KAKAO_API_KEY ? (
                <div
                  className="p-2 rounded-3xl border-2"
                  style={{
                    backgroundColor: THEME_COLORS.primaryLight,
                    borderColor: THEME_COLORS.primary,
                  }}
                >
                  <div
                    ref={mapContainer}
                    style={{ width: '100%', height: '500px' }}
                    className="rounded-2xl overflow-hidden"
                  />
                </div>
              ) : (
                <Card
                  className="p-12 flex flex-col items-center justify-center rounded-3xl border-2"
                  style={{
                    backgroundColor: THEME_COLORS.primaryLight,
                    borderColor: THEME_COLORS.primary,
                    minHeight: '500px',
                  }}
                >
                  <MapPin className="w-16 h-16 mb-4" style={{ color: THEME_COLORS.primary }} />
                  <h4 style={{ color: THEME_COLORS.primary, fontWeight: 700 }}>
                    {selectedStadium?.stadiumName || '구장을 선택하세요'}
                  </h4>
                  <p className="text-gray-600 mt-2">주변 지도</p>
                  <p className="text-sm text-gray-500 mt-4">
                    {!KAKAO_API_KEY ? '* 카카오맵 API 키를 설정해주세요' : '* 지도 로딩 중...'}
                  </p>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column - Category Filter & Results */}
          <div className="space-y-6">
            {/* Category Buttons */}
            <div>
              <h3 className="mb-3" style={{ color: THEME_COLORS.primary }}>
                카테고리
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(CATEGORY_CONFIGS).map((config) => {
                  const Icon = config.icon;
                  const isSelected = selectedCategory === config.key;

                  return (
                    <button
                      key={config.key}
                      onClick={() => setSelectedCategory(config.key)}
                      className="py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2"
                      style={{
                        backgroundColor: isSelected ? config.bgColor : 'white',
                        borderColor: isSelected ? config.borderColor : THEME_COLORS.border,
                        color: isSelected ? config.color : THEME_COLORS.gray,
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
              <h3 className="mb-3" style={{ color: THEME_COLORS.primary }}>
                {CATEGORY_CONFIGS[selectedCategory].label} 목록
              </h3>

              <style>{`
                .custom-scroll-area::-webkit-scrollbar {
                  width: 8px;
                }
                .custom-scroll-area::-webkit-scrollbar-track {
                  background: ${THEME_COLORS.primaryLight};
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
                  className="rounded-2xl border-2 flex items-center justify-center"
                  style={{
                    height: '550px',
                    borderColor: THEME_COLORS.border,
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <div className="text-center">
                    <div
                      className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                      style={{ borderColor: THEME_COLORS.primary }}
                    ></div>
                    <p className="mt-2 text-gray-600">로딩 중...</p>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-2xl border-2 overflow-hidden"
                  style={{
                    height: '550px',
                    borderColor: THEME_COLORS.border,
                    backgroundColor: '#f9fafb',
                  }}
                >
                  <div
                    className="h-full p-4 overflow-y-auto custom-scroll-area"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: `${THEME_COLORS.primary} ${THEME_COLORS.primaryLight}`,
                    }}
                  >
                    <div className="space-y-3 pr-2">
                      {places.length > 0 ? (
                        places.map((place) => {
                          const { Icon, color } = getCategoryIconConfig(place.category);
                          
                          return (
                            <Card
                              key={place.id}
                              id={`place-${place.id}`}
                              className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2"
                              style={{
                                backgroundColor:
                                  selectedPlace?.id === place.id
                                    ? THEME_COLORS.primaryLight
                                    : 'white',
                                borderColor:
                                  selectedPlace?.id === place.id
                                    ? THEME_COLORS.primary
                                    : THEME_COLORS.border,
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
                                    <h4 style={{ fontWeight: 700 }}>{place.name}</h4>
                                  </div>
                                  {place.description && (
                                    <p className="text-gray-600 text-sm mb-1">
                                      {place.description}
                                    </p>
                                  )}
                                  {place.address && (
                                    <p className="text-sm text-gray-600">📍 {place.address}</p>
                                  )}
                                  {place.phone && (
                                    <p className="text-sm text-gray-600">📞 {place.phone}</p>
                                  )}
                                  {place.openTime && place.closeTime && (
                                    <p className="text-sm text-gray-600">
                                      ⏰ {place.openTime} - {place.closeTime}
                                    </p>
                                  )}
                                </div>

                                {/* 오른쪽: Rating과 길찾기 버튼 */}
                                <div className="flex items-center gap-3">
                                  {place.rating && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-yellow-500">★</span>
                                      <span style={{ fontWeight: 700 }}>
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
                        <div className="text-center py-8 text-gray-500">
                          {selectedStadium ? (
                            selectedCategory === 'store' || selectedCategory === 'parking' ? (
                              `주변 ${CATEGORY_CONFIGS[selectedCategory].label}을 검색 중입니다...`
                            ) : (
                              '해당 카테고리에 등록된 장소가 없습니다.'
                            )
                          ) : (
                            '구장을 선택해주세요.'
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

      {/* ChatBot */}
      <ChatBot />
    </div>
  );
}