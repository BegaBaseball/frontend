// src/utils/kakaoMap.ts 생성
import { KAKAO_API_KEY, MAP_CONFIG } from './constants';

import { CategoryType, Place, Stadium } from '../types/stadium';

export interface KakaoMapOptions {
  lat: number;
  lng: number;
  level?: number;
}

const isValidCoordinate = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const hasPlaceCoordinates = (place: Place): place is Place & { lat: number; lng: number } =>
  isValidCoordinate(place.lat) && isValidCoordinate(place.lng);

let kakaoMapScriptPromise: Promise<void> | null = null;

const KAKAO_MAP_SCRIPT_SELECTOR = 'script[data-kakao-map-sdk="true"], script[src*="dapi.kakao.com/v2/maps/sdk.js"]';

const getKakaoMapScriptElement = () => document.querySelector(KAKAO_MAP_SCRIPT_SELECTOR) as HTMLScriptElement | null;

const setKakaoMapScriptLoadState = (script: HTMLScriptElement | null, state: 'ready' | 'error') => {
  if (script) {
    script.dataset.kakaoMapLoadState = state;
  }
};

const getKakaoMapScriptLoadState = (script: HTMLScriptElement | null) => script?.dataset?.kakaoMapLoadState;

const getKakaoMapLoadErrorMessage = () => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return '카카오맵 스크립트 로드 실패: 네트워크 연결이 없어 카카오맵을 불러올 수 없습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.';
  }

  return '카카오맵 스크립트 로드 실패: 카카오맵 스크립트를 불러오지 못했습니다. 네트워크, 광고 차단, API 키 도메인 허용 설정을 확인해주세요.';
};

const waitForKakaoMapSdkReady = () => new Promise<void>((resolve, reject) => {
  if (!window.kakao || !window.kakao.maps) {
    reject(new Error(getKakaoMapLoadErrorMessage()));
    return;
  }

  let isResolved = false;
  const timeoutId = window.setTimeout(() => {
    if (!isResolved) {
      isResolved = true;
      reject(new Error('지도를 초기화하지 못했습니다. 카카오맵 API 키와 도메인 허용 설정을 확인해주세요.'));
    }
  }, 5000);

  window.kakao.maps.load(() => {
    if (isResolved) {
      return;
    }

    isResolved = true;
    window.clearTimeout(timeoutId);
    resolve();
  });
});

export const loadKakaoMapScript = (onLoad?: () => void, onError?: (message?: string) => void) => {
  if (!KAKAO_API_KEY) {
    onError?.('카카오맵 API 키가 없습니다. 운영 환경의 VITE_KAKAO_MAP_KEY 설정을 확인해주세요.');
    return;
  }

  if (window.kakao && window.kakao.maps) {
    waitForKakaoMapSdkReady()
      .then(() => onLoad?.())
      .catch((error) => onError?.(error instanceof Error ? error.message : getKakaoMapLoadErrorMessage()));
    return;
  }

  if (!kakaoMapScriptPromise) {
    kakaoMapScriptPromise = new Promise<void>((resolve, reject) => {
      const handleReady = () => {
        const loadedScript = getKakaoMapScriptElement();
        setKakaoMapScriptLoadState(loadedScript, 'ready');
        waitForKakaoMapSdkReady().then(resolve).catch(reject);
      };

      const handleError = () => {
        const message = getKakaoMapLoadErrorMessage();
        console.error('카카오맵 스크립트 로드 실패:', message);
        setKakaoMapScriptLoadState(getKakaoMapScriptElement(), 'error');
        reject(new Error(message));
      };

      const existingScript = getKakaoMapScriptElement();
      const existingScriptLoadState = getKakaoMapScriptLoadState(existingScript);

      if (existingScriptLoadState === 'error') {
        handleError();
        return;
      }

      if (existingScript) {
        existingScript.addEventListener('load', handleReady, { once: true });
        existingScript.addEventListener('error', handleError, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&libraries=services&autoload=false`;
      script.async = true;
      script.dataset.kakaoMapSdk = 'true';
      script.onload = handleReady;
      script.onerror = handleError;

      document.head.appendChild(script);
    }).catch((error) => {
      kakaoMapScriptPromise = null;
      throw error;
    });
  }

  kakaoMapScriptPromise
    .then(() => onLoad?.())
    .catch((error) => onError?.(error instanceof Error ? error.message : getKakaoMapLoadErrorMessage()));
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

export const openKakaoMapRoute = (name: string, lat: number | null | undefined, lng: number | null | undefined): boolean => {
  if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
    console.error('길찾기 실패: 좌표 정보 없음');
    return false;
  }

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

  return true;
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
  category: Extract<CategoryType, 'store' | 'parking'>,
  stadium: Stadium,
  map: kakao.maps.Map,
  onSuccess: (places: Place[]) => void,
  onError: (error: string) => void
) => {
  if (!window.kakao || !window.kakao.maps || !stadium || !map) {
    onError('검색 준비 미완료');
    return;
  }

  if (!isValidCoordinate(stadium.lat) || !isValidCoordinate(stadium.lng)) {
    onError('검색 준비 미완료');
    return;
  }

  const stadiumLat = stadium.lat;
  const stadiumLng = stadium.lng;
  const ps = new window.kakao.maps.services.Places();
  const center = new window.kakao.maps.LatLng(stadiumLat, stadiumLng);

  ps.keywordSearch(
    keyword,
    (data: kakao.maps.services.PlaceSearchResult[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const nearbyPlaces = data
          .filter((place: kakao.maps.services.PlaceSearchResult) => {
            const distance = calculateDistance(
              stadiumLat,
              stadiumLng,
              parseFloat(place.y),
              parseFloat(place.x)
            );
            return distance <= MAP_CONFIG.NEARBY_DISTANCE_KM;
          })
          .slice(0, MAP_CONFIG.MAX_SEARCH_RESULTS)
          .map((place: kakao.maps.services.PlaceSearchResult, index: number) => ({
            id: index + 1000,
            stadiumName: stadium.stadiumName,
            category: category,
            name: place.place_name,
            description: place.category_name,
            lat: parseFloat(place.y),
            lng: parseFloat(place.x),
            address: place.address_name || place.road_address_name || '',
            phone: place.phone || '',
            rating: null,
            openTime: '',
            closeTime: '',
          }));

        onSuccess(nearbyPlaces);
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        onSuccess([]);
      } else {
        console.error(`${keyword} 검색 실패:`, status);
        onError(`${keyword} 검색 실패`);
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
  map: kakao.maps.Map,
  places: Place[],
  selectedPlace: Place | null,
  markersRef: React.MutableRefObject<kakao.maps.Marker[]>,
  infowindowsRef: React.MutableRefObject<kakao.maps.InfoWindow[]>,
  onMarkerClick: (place: Place) => void,
  clearMarkers: () => void
) => {
  if (!map || !window.kakao || !window.kakao.maps) {
    return;
  }

  try {
    clearMarkers();

    const newMarkers: kakao.maps.Marker[] = [];
    const newInfowindows: kakao.maps.InfoWindow[] = [];
    const renderablePlaces = places.filter(hasPlaceCoordinates);

    renderablePlaces.forEach((place) => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);

      const marker = new window.kakao.maps.Marker({
        position: position,
        map: map,
        title: place.name,
      });

      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:8px 12px;font-weight:700;white-space:nowrap;min-width:fit-content;color:#111827;">${place.name}</div>`,
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
    if (selectedPlace && isValidCoordinate(selectedPlace.lat) && isValidCoordinate(selectedPlace.lng)) {
      const selectedIndex = renderablePlaces.findIndex((p) => p.id === selectedPlace.id);

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
