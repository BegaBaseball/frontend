import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stadium, Place, CategoryType } from '../types/stadium';
import { api } from '../utils/api';
import { loadKakaoMapScript, searchNearbyPlaces, updateMapMarkers } from '../utils/kakaoMap';
import { useKakaoMap } from './useKakaoMap';
import { AsyncStatus, hasValidCoordinates } from '../utils/stadiumGuideUtils';

export const useStadiumGuide = () => {
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [selectedStadium, setSelectedStadium] = useState<Stadium | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('food');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [stadiumsStatus, setStadiumsStatus] = useState<AsyncStatus>('idle');
  const [placesStatus, setPlacesStatus] = useState<AsyncStatus>('idle');
  const [nearbyStatus, setNearbyStatus] = useState<AsyncStatus>('idle');
  const [mapStatus, setMapStatus] = useState<AsyncStatus>('idle');
  const [stadiumsError, setStadiumsError] = useState<string | null>(null);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const {
    mapContainer,
    map,
    markersRef,
    infowindowsRef,
    clearMarkers,
    initializeMap,
  } = useKakaoMap(selectedStadium);

  const loadMapSdk = useCallback(() => {
    setMapStatus('loading');
    setMapError(null);
    setIsMapReady(false);

    loadKakaoMapScript(
      () => {
        setIsMapReady(true);
        setMapStatus('success');
      },
      (message) => {
        setMapStatus('error');
        setMapError(message ?? '지도를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
      }
    );
  }, []);

  const fetchStadiums = useCallback(async () => {
    try {
      setStadiumsStatus('loading');
      setStadiumsError(null);
      const data = await api.getStadiums({
        skipGlobalErrorHandler: true,
      });
      setStadiums(data);

      if (data.length === 0) {
        setSelectedStadium(null);
        setPlaces([]);
        setStadiumsStatus('empty');
        return;
      }

      setStadiumsStatus('success');
      setSelectedStadium((previousSelected) =>
        data.find((stadium) => stadium.stadiumId === previousSelected?.stadiumId) ?? data[0]
      );
    } catch (error) {
      console.error('구장 목록 로드 실패:', error);
      setStadiums([]);
      setSelectedStadium(null);
      setPlaces([]);
      setSelectedPlace(null);
      setStadiumsStatus('error');
      setStadiumsError('구장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    }
  }, []);

  const loadPlaces = useCallback(async () => {
    if (!selectedStadium) {
      setPlaces([]);
      setPlacesStatus('idle');
      setNearbyStatus('idle');
      return;
    }

    setSelectedPlace(null);
    if (isMapReady) {
      clearMarkers();
    }

    if (selectedCategory === 'store' || selectedCategory === 'parking') {
      setPlacesStatus('idle');
      setPlacesError(null);

      if (mapStatus === 'loading') {
        setNearbyStatus('loading');
        setNearbyError(null);
        return;
      }

      if (!isMapReady || !map) {
        setPlaces([]);
        setNearbyStatus('error');
        setNearbyError('지도가 준비되지 않아 주변 검색을 수행할 수 없습니다.');
        return;
      }

      if (!hasValidCoordinates(selectedStadium.lat, selectedStadium.lng)) {
        setPlaces([]);
        setNearbyStatus('error');
        setNearbyError('구장 좌표 정보가 없어 주변 검색을 수행할 수 없습니다.');
        return;
      }

      setNearbyStatus('loading');
      setNearbyError(null);

      searchNearbyPlaces(
        selectedCategory === 'store' ? '편의점' : '주차장',
        selectedCategory,
        selectedStadium,
        map,
        (data) => {
          setPlaces(data);
          setNearbyStatus(data.length > 0 ? 'success' : 'empty');
        },
        (errorMessage) => {
          console.error('주변 시설 검색 실패:', errorMessage);
          setPlaces([]);
          setNearbyStatus('error');
          setNearbyError(`주변 ${selectedCategory === 'store' ? '편의점' : '주차장'} 검색에 실패했습니다.`);
        }
      );
      return;
    }

    try {
      setNearbyStatus('idle');
      setNearbyError(null);
      setPlacesStatus('loading');
      setPlacesError(null);
      const data = await api.getStadiumPlaces(selectedStadium.stadiumId, selectedCategory, {
        skipGlobalErrorHandler: true,
      });
      setPlaces(data);
      setPlacesStatus(data.length > 0 ? 'success' : 'empty');
    } catch (error) {
      console.error('장소 목록 로드 실패:', error);
      setPlaces([]);
      setPlacesStatus('error');
      setPlacesError('장소 목록을 불러오지 못했습니다.');
    }
  }, [selectedStadium, selectedCategory, isMapReady, clearMarkers, mapStatus, map]);

  // ========== 카카오맵 스크립트 로드 ==========
  useEffect(() => {
    loadMapSdk();
  }, [loadMapSdk]);

  // ========== 구장 목록 가져오기 ==========
  useEffect(() => {
    void fetchStadiums();
  }, [fetchStadiums]);

  // ========== 지도 초기화 ==========
  useEffect(() => {
    if (!selectedStadium || !mapContainer.current || !isMapReady) return;

    try {
      initializeMap();
      setMapStatus('success');
      setMapError(null);
    } catch (error) {
      console.error('지도 초기화 실패:', error);
      setMapStatus('error');
      setMapError(error instanceof Error ? error.message : '지도를 불러오는데 실패했습니다.');
    }
  }, [selectedStadium, isMapReady, mapContainer, initializeMap]);

  // ========== 장소 검색 ==========
  useEffect(() => {
    void loadPlaces();
  }, [loadPlaces]);

  // ========== 마커 업데이트 ==========
  useEffect(() => {
    if (!mapContainer.current || !map || !isMapReady) return;

    updateMapMarkers(
      map,
      places,
      selectedPlace,
      markersRef,
      infowindowsRef,
      handleMarkerClick,
      clearMarkers
    );
  }, [places, selectedPlace, map, isMapReady]);

  // ========== Handlers ==========
  const handleMarkerClick = (place: Place) => {
    setSelectedPlace(place);

    const placeElement = document.getElementById(`place-${place.id}`);
    if (placeElement) {
      placeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    mapContainer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleStadiumChange = (stadiumId: string) => {
    const stadium = stadiums.find((s) => s.stadiumId === stadiumId);
    if (stadium) setSelectedStadium(stadium);
  };

  const retryStadiums = useCallback(() => {
    void fetchStadiums();
  }, [fetchStadiums]);

  const retryPlaces = useCallback(() => {
    void loadPlaces();
  }, [loadPlaces]);

  const retryMap = useCallback(() => {
    loadMapSdk();
  }, [loadMapSdk]);

  const loading = useMemo(
    () =>
      stadiumsStatus === 'loading'
      || placesStatus === 'loading'
      || nearbyStatus === 'loading',
    [stadiumsStatus, placesStatus, nearbyStatus]
  );

  const error = useMemo(
    () => stadiumsError ?? placesError ?? nearbyError ?? mapError,
    [stadiumsError, placesError, nearbyError, mapError]
  );

  return {
    // State
    stadiums,
    selectedStadium,
    selectedCategory,
    setSelectedCategory,
    places,
    selectedPlace,
    loading,
    error,
    isMapReady,
    stadiumsStatus,
    placesStatus,
    nearbyStatus,
    mapStatus,
    stadiumsError,
    placesError,
    nearbyError,
    mapError,

    // Map
    mapContainer,
    map,

    // Handlers
    handleStadiumChange,
    handlePlaceClick,
    retryStadiums,
    retryPlaces,
    retryMap,
  };
};
