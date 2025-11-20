import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { MapPin } from 'lucide-react';
import ChatBot from './ChatBot';
import { api } from '../utils/api';
import { Stadium, Place, CategoryType } from '../types/stadium';
import { KAKAO_API_KEY, CATEGORY_CONFIGS, THEME_COLORS, MAP_CONFIG } from '../utils/constants';
import { 
  loadKakaoMapScript, 
  calculateDistance, 
  openKakaoMapRoute, 
  waitForKakaoMaps 
} from '../utils/kakaoMap';
import { useKakaoMap } from '../hooks/useKakaoMap';

export default function StadiumGuide() {
  // 상태 관리
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [selectedStadium, setSelectedStadium] = useState<Stadium | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('food');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 커스텀 훅
  const {
    mapContainer,
    map,
    markersRef,
    infowindowsRef,
    clearMarkers,
    initializeMap,
  } = useKakaoMap(selectedStadium);

  // 카카오맵 스크립트 로드
  useEffect(() => {
    loadKakaoMapScript();
  }, []);

  // 구장 목록 가져오기
  useEffect(() => {
    fetchStadiums();
  }, []);

  // 선택된 구장이 변경될 때 지도 초기화
  useEffect(() => {
    if (!selectedStadium || !mapContainer.current) return;

    return waitForKakaoMaps(initializeMap, setError);
  }, [selectedStadium]);

  // 선택된 구장과 카테고리가 변경될 때 장소 목록 가져오기
  useEffect(() => {
    if (!selectedStadium) return;
    
    setSelectedPlace(null);
    clearMarkers();
    
    if (selectedCategory === 'store') {
      const cleanup = waitForKakaoMaps(() => searchNearbyPlaces('편의점', 'store'));
      return cleanup;
    } else if (selectedCategory === 'parking') {
      const cleanup = waitForKakaoMaps(() => searchNearbyPlaces('주차장', 'parking'));
      return cleanup;
    } else {
      fetchPlaces(selectedStadium.stadiumId, selectedCategory);
    }
  }, [selectedStadium, selectedCategory]);

  // 장소 목록이 변경되거나 선택된 장소가 변경될 때 마커 업데이트
  useEffect(() => {
    if (!mapContainer.current) return;

    return waitForKakaoMaps(updateMarkers);
  }, [places, selectedPlace]);

  // API 함수들
  const fetchStadiums = async () => {
    try {
      setLoading(true);
      const data = await api.getStadiums();
      setStadiums(data);
      
      if (data.length > 0) {
        setSelectedStadium(data[0]);
      }
    } catch (error) {
      console.error('구장 목록 로드 실패:', error);
      setError('구장 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaces = async (stadiumId: string, category: string) => {
    try {
      setLoading(true);
      const data = await api.getStadiumPlaces(stadiumId, category);
      setPlaces(data);
    } catch (error) {
      console.error('장소 목록 로드 실패:', error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const searchNearbyPlaces = (keyword: string, category: string) => {
    if (!window.kakao || !window.kakao.maps || !selectedStadium || !map) {
      console.error('검색 준비 미완료');
      return;
    }

    const ps = new window.kakao.maps.services.Places();
    const center = new window.kakao.maps.LatLng(selectedStadium.lat, selectedStadium.lng);

    ps.keywordSearch(
      keyword,
      (data: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const nearbyPlaces = data
            .filter((place: any) => {
              const distance = calculateDistance(
                selectedStadium.lat,
                selectedStadium.lng,
                parseFloat(place.y),
                parseFloat(place.x)
              );
              return distance <= MAP_CONFIG.NEARBY_DISTANCE_KM;
            })
            .slice(0, MAP_CONFIG.MAX_SEARCH_RESULTS)
            .map((place: any, index: number) => ({
              id: index + 1000,
              stadiumName: selectedStadium.stadiumName,
              category: category,
              name: place.place_name,
              description: place.category_name,
              lat: parseFloat(place.y),
              lng: parseFloat(place.x),
              address: place.address_name || place.road_address_name,
              phone: place.phone || '',
              rating: null,
              openTime: '',
              closeTime: ''
            }));

          setPlaces(nearbyPlaces);
        } else {
          console.error(`${keyword} 검색 실패:`, status);
          setPlaces([]);
        }
      },
      {
        location: center,
        radius: MAP_CONFIG.SEARCH_RADIUS,
        sort: window.kakao.maps.services.SortBy.DISTANCE
      }
    );
  };

  const updateMarkers = () => {
    if (!map || !window.kakao || !window.kakao.maps) {
      return;
    }

    try {
      clearMarkers();

      const newMarkers: any[] = [];
      const newInfowindows: any[] = [];

      places.forEach((place) => {
        const position = new window.kakao.maps.LatLng(place.lat, place.lng);
        
        const marker = new window.kakao.maps.Marker({
          position: position,
          map: map,
          title: place.name
        });

        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:8px 12px;font-weight:700;white-space:nowrap;min-width:fit-content;">${place.name}</div>`,
          removable: false
        });

        window.kakao.maps.event.addListener(marker, 'click', function() {
          infowindowsRef.current.forEach(iw => iw.close());
          infowindow.open(map, marker);
          setSelectedPlace(place);
          
          const placeElement = document.getElementById(`place-${place.id}`);
          if (placeElement) {
            placeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });

        newMarkers.push(marker);
        newInfowindows.push(infowindow);
      });

      markersRef.current = newMarkers;
      infowindowsRef.current = newInfowindows;

      if (selectedPlace) {
        const selectedIndex = places.findIndex(p => p.id === selectedPlace.id);
        
        if (selectedIndex !== -1) {
          markersRef.current.forEach(marker => marker.setMap(null));
          
          const selectedMarker = newMarkers[selectedIndex];
          const selectedInfowindow = newInfowindows[selectedIndex];
          
          selectedMarker.setMap(map);
          selectedInfowindow.open(map, selectedMarker);
          
          map.setCenter(new window.kakao.maps.LatLng(selectedPlace.lat, selectedPlace.lng));
          map.setLevel(MAP_CONFIG.ZOOM_LEVEL);
        }
      }
    } catch (error) {
      console.error('마커 업데이트 중 오류:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    const config = CATEGORY_CONFIGS[category];
    if (!config) return <MapPin className="w-5 h-5" style={{ color: THEME_COLORS.primary }} />;
    
    const Icon = config.icon;
    return <Icon className="w-5 h-5" style={{ color: config.color }} />;
  };

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
              <h3 className="mb-3" style={{ color: THEME_COLORS.primary }}>구장 선택</h3>
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
                  onChange={(e) => {
                    const stadium = stadiums.find(s => s.stadiumId === e.target.value);
                    if (stadium) setSelectedStadium(stadium);
                  }}
                  className="w-full py-6 px-4 pr-12 bg-white border-2 rounded-2xl text-base cursor-pointer"
                  style={{ 
                    borderColor: THEME_COLORS.primary,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none'
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
              <h3 className="mb-3" style={{ color: THEME_COLORS.primary }}>구장 위치</h3>
              
              {/* 구장 정보 카드 */}
              {selectedStadium && (
                <div className="mb-4 p-4 rounded-xl border-2" style={{ backgroundColor: THEME_COLORS.primaryBg, borderColor: THEME_COLORS.primary }}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5" style={{ color: THEME_COLORS.primary }} />
                        <h4 style={{ fontWeight: 700, color: THEME_COLORS.primary }}>{selectedStadium.stadiumName}</h4>
                      </div>
                      {selectedStadium.address && (
                        <p className="text-sm text-gray-600 mb-1">📍 {selectedStadium.address}</p>
                      )}
                      {selectedStadium.phone && (
                        <p className="text-sm text-gray-600">📞 {selectedStadium.phone}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => openKakaoMapRoute(selectedStadium.stadiumName, selectedStadium.lat, selectedStadium.lng)}
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
                    borderColor: THEME_COLORS.primary
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
                    minHeight: '500px'
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
              <h3 className="mb-3" style={{ color: THEME_COLORS.primary }}>카테고리</h3>
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
                        color: isSelected ? config.color : THEME_COLORS.gray
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
                    backgroundColor: '#f9fafb' 
                  }}
                >
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: THEME_COLORS.primary }}></div>
                    <p className="mt-2 text-gray-600">로딩 중...</p>
                  </div>
                </div>
              ) : (
                <div 
                  className="rounded-2xl border-2 overflow-hidden" 
                  style={{ 
                    height: '550px',
                    borderColor: THEME_COLORS.border, 
                    backgroundColor: '#f9fafb'
                  }}
                >
                  <div 
                    className="h-full p-4 overflow-y-auto custom-scroll-area"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: `${THEME_COLORS.primary} ${THEME_COLORS.primaryLight}`
                    }}
                  >
                    <div className="space-y-3 pr-2">
                      {places.length > 0 ? (
                        places.map((place) => (
                          <Card 
                            key={place.id}
                            id={`place-${place.id}`}
                            className="p-4 hover:shadow-lg transition-shadow cursor-pointer border-2"
                            style={{
                              backgroundColor: selectedPlace?.id === place.id ? THEME_COLORS.primaryLight : 'white',
                              borderColor: selectedPlace?.id === place.id ? THEME_COLORS.primary : THEME_COLORS.border
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div 
                                className="flex-1"
                                onClick={() => {
                                  setSelectedPlace(place);
                                  mapContainer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {getCategoryIcon(place.category)}
                                  <h4 style={{ fontWeight: 700 }}>{place.name}</h4>
                                </div>
                                {place.description && (
                                  <p className="text-gray-600 text-sm mb-1">{place.description}</p>
                                )}
                                {place.address && (
                                  <p className="text-sm text-gray-600">📍 {place.address}</p>
                                )}
                                {place.phone && (
                                  <p className="text-sm text-gray-600">📞 {place.phone}</p>
                                )}
                                {place.openTime && place.closeTime && (
                                  <p className="text-sm text-gray-600">⏰ {place.openTime} - {place.closeTime}</p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {place.rating && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-yellow-500">★</span>
                                    <span style={{ fontWeight: 700 }}>{place.rating.toFixed(1)}</span>
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
                        ))
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