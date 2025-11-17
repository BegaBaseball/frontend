// src/utils/kakaoMap.ts 생성
import { KAKAO_API_KEY, MAP_CONFIG } from './constants';

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
        console.log('카카오맵 로드 완료');
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