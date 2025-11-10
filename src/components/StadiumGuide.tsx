import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { MapPin, Utensils, ShoppingBag, ParkingCircle, Truck } from 'lucide-react';
import ChatBot from './ChatBot';
import Navbar from './Navbar';

// Kakao Maps 타입 선언
declare global {
  interface Window {
    kakao: any;
  }
}

// 백엔드 DTO와 일치하는 인터페이스
interface Stadium {
  stadiumId: string;
  stadiumName: string;
  team: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
}

interface Place {
  id: number;
  stadiumName: string;
  category: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  rating: number | null;
  openTime: string;
  closeTime: string;
}

export default function StadiumGuide() {
  const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_MAP_KEY as string;
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080/api';

  // 디버깅용 로그
  console.log(' Kakao API Key:', KAKAO_API_KEY);
  console.log(' API Base URL:', API_BASE_URL);
  // 상태 관리
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [selectedStadium, setSelectedStadium] = useState<Stadium | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'food' | 'delivery' | 'store' | 'parking'>('food');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<any>(null);

  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const stadiumMarkerRef = useRef<any>(null);
  const infowindowsRef = useRef<any[]>([]);

  // 카카오맵 스크립트 로드
  useEffect(() => {
    if (!KAKAO_API_KEY) {
      console.error('카카오 API 키가 없습니다');
      return;
    }

    if (window.kakao && window.kakao.maps) {
      console.log('카카오맵 이미 로드됨');
      return;
    }

    const existingScript = document.querySelector(`script[src*="dapi.kakao.com"]`);
    if (existingScript) {
      console.log('카카오맵 스크립트 로딩 중...');
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services&autoload=false`;
    
    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          console.log('카카오맵 완전히 로드됨');
        });
      }
    };
    
    script.onerror = () => {
      console.error('카카오맵 스크립트 로드 실패');
    };
    
    document.head.appendChild(script);
  }, [KAKAO_API_KEY]);

  // 구장 목록 가져오기
  useEffect(() => {
    fetchStadiums();
  }, []);

  // 선택된 구장이 변경될 때 지도 초기화
  useEffect(() => {
    if (!selectedStadium || !mapContainer.current) return;

    let mounted = true;
    let checkCount = 0;
    const maxChecks = 50;

    const checkAndInit = setInterval(() => {
      checkCount++;
      
      if (!mounted) {
        clearInterval(checkAndInit);
        return;
      }

      if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
        clearInterval(checkAndInit);
        console.log('카카오맵 준비 완료, 지도 초기화 시작');
        
        setTimeout(() => {
          if (mounted) {
            initializeMap();
          }
        }, 100);
      } else if (checkCount >= maxChecks) {
        clearInterval(checkAndInit);
        console.error('카카오맵 로드 타임아웃');
        setError('지도를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
      }
    }, 100);

    return () => {
      mounted = false;
      clearInterval(checkAndInit);
    };
  }, [selectedStadium]);

  // 선택된 구장과 카테고리가 변경될 때 장소 목록 가져오기
  useEffect(() => {
    if (!selectedStadium) return;
    
    setSelectedPlace(null);
    infowindowsRef.current.forEach(iw => iw.close());
    infowindowsRef.current = [];
    
    if (selectedCategory === 'store') {
      const checkMapReady = setInterval(() => {
        if (mapContainer.current && window.kakao && window.kakao.maps) {
          clearInterval(checkMapReady);
          searchNearbyPlaces('편의점', 'store');
        }
      }, 100);
      
      return () => clearInterval(checkMapReady);
    } else if (selectedCategory === 'parking') {
      const checkMapReady = setInterval(() => {
        if (mapContainer.current && window.kakao && window.kakao.maps) {
          clearInterval(checkMapReady);
          searchNearbyPlaces('주차장', 'parking');
        }
      }, 100);
      
      return () => clearInterval(checkMapReady);
    } else {
      fetchPlaces(selectedStadium.stadiumId, selectedCategory);
    }
  }, [selectedStadium, selectedCategory]);

  // 장소 목록이 변경되거나 선택된 장소가 변경될 때 마커 업데이트
  useEffect(() => {
    if (!mapContainer.current) return;

    let mounted = true;
    let checkCount = 0;
    const maxChecks = 50;

    const checkAndUpdate = setInterval(() => {
      checkCount++;
      
      if (!mounted) {
        clearInterval(checkAndUpdate);
        return;
      }

      if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
        clearInterval(checkAndUpdate);
        
        setTimeout(() => {
          if (mounted) {
            updateMarkers();
          }
        }, 100);
      } else if (checkCount >= maxChecks) {
        clearInterval(checkAndUpdate);
        console.error('마커 업데이트 타임아웃');
      }
    }, 100);

    return () => {
      mounted = false;
      clearInterval(checkAndUpdate);
    };
  }, [places, selectedPlace]);

  // API 함수들
  const fetchStadiums = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/stadiums`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fetched stadiums:', data);
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
      const response = await fetch(`${API_BASE_URL}/stadiums/${stadiumId}/places?category=${category}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Fetched places for ${category}:`, data);
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
              return distance <= 1;
            })
            .slice(0, 10)
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

          console.log(`${keyword} 검색 결과:`, nearbyPlaces);
          setPlaces(nearbyPlaces);
        } else {
          console.error(`${keyword} 검색 실패:`, status);
          setPlaces([]);
        }
      },
      {
        location: center,
        radius: 1000,
        sort: window.kakao.maps.services.SortBy.DISTANCE
      }
    );
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const initializeMap = () => {
    if (!mapContainer.current || !selectedStadium) {
      console.error('지도 초기화 실패: 컨테이너 또는 구장 정보 없음');
      return;
    }

    if (!window.kakao || !window.kakao.maps) {
      console.error('카카오맵 SDK 로드 안됨');
      return;
    }

    try {
      console.log('지도 초기화 중...', selectedStadium);
      
      const container = mapContainer.current;
      const options = {
        center: new window.kakao.maps.LatLng(selectedStadium.lat, selectedStadium.lng),
        level: 4,
      };

      const newMap = new window.kakao.maps.Map(container, options);
      setMap(newMap);

      if (stadiumMarkerRef.current) {
        stadiumMarkerRef.current.setMap(null);
      }

      const markerPosition = new window.kakao.maps.LatLng(selectedStadium.lat, selectedStadium.lng);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        map: newMap
      });

      stadiumMarkerRef.current = marker;

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:8px 12px;font-weight:700;white-space:nowrap;min-width:fit-content;">${selectedStadium.stadiumName}</div>`,
        removable: false
      });
      infowindow.open(newMap, marker);

      console.log('지도 초기화 완료');
    } catch (error) {
      console.error('지도 초기화 중 오류:', error);
      setError('지도를 초기화하는데 실패했습니다.');
    }
  };

  const updateMarkers = () => {
    if (!map || !window.kakao || !window.kakao.maps) {
      console.error('마커 업데이트 실패: 지도 또는 카카오맵 SDK 없음');
      return;
    }

    try {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      infowindowsRef.current.forEach(iw => iw.close());
      infowindowsRef.current = [];

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
          map.setLevel(3);
        }
      }

      console.log(`${places.length}개 마커 업데이트 완료`);
    } catch (error) {
      console.error('마커 업데이트 중 오류:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food':
        return <Utensils className="w-5 h-5" style={{ color: '#ff9500' }} />;
      case 'delivery':
        return <Truck className="w-5 h-5" style={{ color: '#2196f3' }} />;
      case 'store':
        return <ShoppingBag className="w-5 h-5" style={{ color: '#2d5f4f' }} />;
      case 'parking':
        return <ParkingCircle className="w-5 h-5" style={{ color: '#2d5f4f' }} />;
      default:
        return <MapPin className="w-5 h-5" style={{ color: '#2d5f4f' }} />;
    }
  };

  const openKakaoMap = (place: Place) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      const kakaoMapUrl = `kakaomap://route?ep=${place.lat},${place.lng}&by=CAR`;
      window.location.href = kakaoMapUrl;
      
      setTimeout(() => {
        const webUrl = `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`;
        window.open(webUrl, '_blank');
      }, 1500);
    } else {
      const url = `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}`;
      window.open(url, '_blank');
    }
  };

  const openStadiumRoute = () => {
    if (!selectedStadium) return;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const kakaoMapUrl = `kakaomap://route?ep=${selectedStadium.lat},${selectedStadium.lng}&by=CAR`;
      window.location.href = kakaoMapUrl;
      setTimeout(() => {
        const webUrl = `https://map.kakao.com/link/to/${encodeURIComponent(selectedStadium.stadiumName)},${selectedStadium.lat},${selectedStadium.lng}`;
        window.open(webUrl, '_blank');
      }, 1500);
    } else {
      const url = `https://map.kakao.com/link/to/${encodeURIComponent(selectedStadium.stadiumName)},${selectedStadium.lat},${selectedStadium.lng}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar currentPage="stadium" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-7 h-7" style={{ color: '#2d5f4f' }} />
          <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>구장 가이드</h2>
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
              <h3 className="mb-3" style={{ color: '#2d5f4f' }}>구장 선택</h3>
              <select
                value={selectedStadium?.stadiumId || ''}
                onChange={(e) => {
                  const stadium = stadiums.find(s => s.stadiumId === e.target.value);
                  if (stadium) setSelectedStadium(stadium);
                }}
                className="w-full py-6 px-4 bg-white border-2 rounded-2xl text-base"
                style={{ borderColor: '#2d5f4f' }}
              >
                {stadiums.map((stadium) => (
                  <option key={stadium.stadiumId} value={stadium.stadiumId}>
                    {stadium.stadiumName}
                  </option>
                ))}
              </select>
            </div>

            {/* Stadium Info & Map */}
            <div>
              <h3 className="mb-3" style={{ color: '#2d5f4f' }}>구장 위치</h3>
              
              {/* 구장 정보 카드 */}
              {selectedStadium && (
                <div className="mb-4 p-4 rounded-xl border-2" style={{ backgroundColor: '#f0f9f6', borderColor: '#2d5f4f' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5" style={{ color: '#2d5f4f' }} />
                        <h4 style={{ fontWeight: 700, color: '#2d5f4f' }}>{selectedStadium.stadiumName}</h4>
                      </div>
                      {selectedStadium.address && (
                        <p className="text-sm text-gray-600 mb-1">📍 {selectedStadium.address}</p>
                      )}
                      {selectedStadium.phone && (
                        <p className="text-sm text-gray-600">📞 {selectedStadium.phone}</p>
                      )}
                    </div>
                    <Button
                      onClick={openStadiumRoute}
                      className="px-6 py-3 rounded-lg text-white transition-colors hover:opacity-90 whitespace-nowrap"
                      style={{ backgroundColor: '#2d5f4f' }}
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
                    backgroundColor: '#e8f5f0',
                    borderColor: '#2d5f4f'
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
                    backgroundColor: '#e8f5f0',
                    borderColor: '#2d5f4f',
                    minHeight: '500px'
                  }}
                >
                  <MapPin className="w-16 h-16 mb-4" style={{ color: '#2d5f4f' }} />
                  <h4 style={{ color: '#2d5f4f', fontWeight: 700 }}>
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
              <h3 className="mb-3" style={{ color: '#2d5f4f' }}>카테고리</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedCategory('food')}
                  className="py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedCategory === 'food' ? '#fff5e6' : 'white',
                    borderColor: selectedCategory === 'food' ? '#ff9500' : '#e5e7eb',
                    color: selectedCategory === 'food' ? '#ff9500' : '#4b5563'
                  }}
                >
                  <Utensils className="w-6 h-6" />
                  <span className="text-sm" style={{ fontWeight: selectedCategory === 'food' ? 700 : 400 }}>구장 먹거리</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('delivery')}
                  className="py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedCategory === 'delivery' ? '#e3f2fd' : 'white',
                    borderColor: selectedCategory === 'delivery' ? '#2196f3' : '#e5e7eb',
                    color: selectedCategory === 'delivery' ? '#2196f3' : '#4b5563'
                  }}
                >
                  <Truck className="w-6 h-6" />
                  <span className="text-sm" style={{ fontWeight: selectedCategory === 'delivery' ? 700 : 400 }}>배달픽업존</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('store')}
                  className="py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedCategory === 'store' ? '#e8f5f0' : 'white',
                    borderColor: selectedCategory === 'store' ? '#2d5f4f' : '#e5e7eb',
                    color: selectedCategory === 'store' ? '#2d5f4f' : '#4b5563'
                  }}
                >
                  <ShoppingBag className="w-6 h-6" />
                  <span className="text-sm" style={{ fontWeight: selectedCategory === 'store' ? 700 : 400 }}>편의점</span>
                </button>

                <button
                  onClick={() => setSelectedCategory('parking')}
                  className="py-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2"
                  style={{
                    backgroundColor: selectedCategory === 'parking' ? '#e8f5f0' : 'white',
                    borderColor: selectedCategory === 'parking' ? '#2d5f4f' : '#e5e7eb',
                    color: selectedCategory === 'parking' ? '#2d5f4f' : '#4b5563'
                  }}
                >
                  <ParkingCircle className="w-6 h-6" />
                  <span className="text-sm" style={{ fontWeight: selectedCategory === 'parking' ? 700 : 400 }}>주차장</span>
                </button>
              </div>
            </div>

            {/* Results List */}
            <div>
              <h3 className="mb-3" style={{ color: '#2d5f4f' }}>
                {selectedCategory === 'food' ? '구장 먹거리' : 
                 selectedCategory === 'delivery' ? '배달픽업존' : 
                 selectedCategory === 'store' ? '편의점' : '주차장'} 목록
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2d5f4f' }}></div>
                  <p className="mt-2 text-gray-600">로딩 중...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {places.length > 0 ? (
                    places.map((place) => (
                      <div 
                        key={place.id}
                        id={`place-${place.id}`}
                        className="p-4 rounded-lg border-2 transition-shadow cursor-pointer hover:shadow-lg"
                        style={{
                          backgroundColor: selectedPlace?.id === place.id ? '#e8f5f0' : 'white',
                          borderColor: selectedPlace?.id === place.id ? '#2d5f4f' : '#e5e7eb'
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
                                openKakaoMap(place);
                              }}
                              className="px-4 py-2 rounded-lg text-white transition-colors hover:opacity-90"
                              style={{ backgroundColor: '#2d5f4f' }}
                            >
                              길찾기
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {selectedStadium ? (
                        selectedCategory === 'store' || selectedCategory === 'parking' ? (
                          `주변 ${selectedCategory === 'store' ? '편의점' : '주차장'}을 검색 중입니다...`
                        ) : (
                          '해당 카테고리에 등록된 장소가 없습니다.'
                        )
                      ) : (
                        '구장을 선택해주세요.'
                      )}
                    </div>
                  )}
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