// src/utils/kakaoMap.ts 생성
import { KAKAO_API_KEY, MAP_CONFIG } from './constants';

import { Place, Stadium } from '../types/stadium';

export interface KakaoMapOptions {
  lat: number;
  lng: number;
  level?: number;
}

export const loadKakaoMapScript = (onLoad?: () => void, onError?: () => void) => {
  if (!KAKAO_API_KEY) {
    console.error('카카오 API 키가 없습니다');
    return;
  }

  if (window.kakao && window.kakao.maps) {
    onLoad?.();
    return;
  }

  const existingScript = document.querySelector(`script[src*="dapi.kakao.com"]`);
  if (existingScript) {
    return;
  }

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services&autoload=false`;
  
  script.onload = () => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        
        onLoad?.();
      });
    }
  };
  
  script.onerror = () => {
    console.error('카카오맵 스크립트 로드 실패');
    onError?.();
  };
  
  document.head.appendChild(script);
};

export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const openKakaoMapRoute = (name: string, lat: number, lng: number) => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    const kakaoMapUrl = `kakaomap://route?ep=${lat},${lng}&by=CAR`;
    window.location.href = kakaoMapUrl;
    
    setTimeout(() => {
      const webUrl = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
      window.open(webUrl, '_blank');
    }, 1500);
  } else {
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
    window.open(url, '_blank');
  }
};

export const waitForKakaoMaps = (
  callback: () => void,
  onError?: (message: string) => void,
  maxChecks = 50,
  interval = 100
) => {
  let checkCount = 0;
  let mounted = true;

  const checkAndRun = setInterval(() => {
    checkCount++;
    
    if (!mounted) {
      clearInterval(checkAndRun);
      return;
    }

    if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
      clearInterval(checkAndRun);
      setTimeout(() => {
        if (mounted) {
          callback();
        }
      }, interval);
    } else if (checkCount >= maxChecks) {
      clearInterval(checkAndRun);
      console.error('카카오맵 로드 타임아웃');
      onError?.('지도를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
    }
  }, interval);

  return () => {
    mounted = false;
    clearInterval(checkAndRun);
  };
};

/**
 * 주변 장소 검색
 */
export const searchNearbyPlaces = (
  keyword: string,
  category: string,
  stadium: Stadium,
  map: any,
  onSuccess: (places: Place[]) => void,
  onError: (error: string) => void
) => {
  if (!window.kakao || !window.kakao.maps || !stadium || !map) {
    onError('검색 준비 미완료');
    return;
  }

  const ps = new window.kakao.maps.services.Places();
  const center = new window.kakao.maps.LatLng(stadium.lat, stadium.lng);

  ps.keywordSearch(
    keyword,
    (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const nearbyPlaces = data
          .filter((place: any) => {
            const distance = calculateDistance(
              stadium.lat,
              stadium.lng,
              parseFloat(place.y),
              parseFloat(place.x)
            );
            return distance <= MAP_CONFIG.NEARBY_DISTANCE_KM;
          })
          .slice(0, MAP_CONFIG.MAX_SEARCH_RESULTS)
          .map((place: any, index: number) => ({
            id: index + 1000,
            stadiumName: stadium.stadiumName,
            category: category,
            name: place.place_name,
            description: place.category_name,
            lat: parseFloat(place.y),
            lng: parseFloat(place.x),
            address: place.address_name || place.road_address_name,
            phone: place.phone || '',
            rating: null,
            openTime: '',
            closeTime: '',
          }));

        onSuccess(nearbyPlaces);
      } else {
        console.error(`${keyword} 검색 실패:`, status);
        onSuccess([]);
      }
    },
    {
      location: center,
      radius: MAP_CONFIG.SEARCH_RADIUS,
      sort: window.kakao.maps.services.SortBy.DISTANCE,
    }
  );
};

/**
 * 지도 마커 업데이트
 */
export const updateMapMarkers = (
  map: any,
  places: Place[],
  selectedPlace: Place | null,
  markersRef: React.MutableRefObject<any[]>,
  infowindowsRef: React.MutableRefObject<any[]>,
  onMarkerClick: (place: Place) => void,
  clearMarkers: () => void
) => {
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
        title: place.name,
      });

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:8px 12px;font-weight:700;white-space:nowrap;min-width:fit-content;">${place.name}</div>`,
        removable: false,
      });

      window.kakao.maps.event.addListener(marker, 'click', function () {
        infowindowsRef.current.forEach((iw) => iw.close());
        infowindow.open(map, marker);
        onMarkerClick(place);
      });

      newMarkers.push(marker);
      newInfowindows.push(infowindow);
    });

    markersRef.current = newMarkers;
    infowindowsRef.current = newInfowindows;

    // 선택된 장소가 있으면 해당 마커만 표시
    if (selectedPlace) {
      const selectedIndex = places.findIndex((p) => p.id === selectedPlace.id);

      if (selectedIndex !== -1) {
        markersRef.current.forEach((marker) => marker.setMap(null));

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