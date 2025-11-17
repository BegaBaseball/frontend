// src/hooks/useKakaoMap.ts
import { useRef, useState, useEffect } from 'react';
import { MAP_CONFIG } from '../utils/constants';
import { Stadium, Place } from '../types/stadium';

export const useKakaoMap = (selectedStadium: Stadium | null) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const markersRef = useRef<any[]>([]);
  const stadiumMarkerRef = useRef<any>(null);
  const infowindowsRef = useRef<any[]>([]);

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    infowindowsRef.current.forEach(iw => iw.close());
    infowindowsRef.current = [];
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
      const container = mapContainer.current;
      const options = {
        center: new window.kakao.maps.LatLng(selectedStadium.lat, selectedStadium.lng),
        level: MAP_CONFIG.DEFAULT_LEVEL,
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
    } catch (error) {
      console.error('지도 초기화 중 오류:', error);
      throw new Error('지도를 초기화하는데 실패했습니다.');
    }
  };

  return {
    mapContainer,
    map,
    markersRef,
    infowindowsRef,
    clearMarkers,
    initializeMap,
  };
};