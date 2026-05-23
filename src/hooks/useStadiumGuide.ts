import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stadium, Place, CategoryType } from '../types/stadium';
import { loadKakaoMapScript, searchNearbyPlaces, updateMapMarkers } from '../utils/kakaoMap';
import { useKakaoMap } from './useKakaoMap';
import {
  AsyncStatus,
  hasValidCoordinates,
  sanitizeStadiumGuideErrorMessage,
} from '../utils/stadiumGuideUtils';
import {
  fetchStadiumPlaces as fetchStadiumGuidePlaces,
  fetchStadiums as fetchStadiumGuideStadiums,
} from '../api/stadiumGuidePublic';

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
        setMapError(sanitizeStadiumGuideErrorMessage(
          message,
          '지도를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.',
        ));
      }
    );
  }, []);

  const fetchStadiums = useCallback(async () => {
    try {
      setStadiumsStatus('loading');
      setStadiumsError(null);
      const data = await fetchStadiumGuideStadiums();
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

  // DB 기반 카테고리(food 등) 장소 로드: 지도와 무관하므로 isMapReady 의존 없음
  const loadDbPlaces = useCallback(async () => {
    if (!selectedStadium) {
      setPlaces([]);
      setPlacesStatus('idle');
      setNearbyStatus('idle');
      return;
    }

    if (selectedCategory === 'store' || selectedCategory === 'parking') {
      setPlacesStatus('idle');
      setPlacesError(null);
      return;
    }

    setSelectedPlace(null);
    setNearbyStatus('idle');
    setNearbyError(null);
    setPlacesStatus('loading');
    setPlacesError(null);

    try {
      const data = await fetchStadiumGuidePlaces(selectedStadium.stadiumId, selectedCategory);
      setPlaces(data);
      setPlacesStatus(data.length > 0 ? 'success' : 'empty');
    } catch (error) {
      console.error('장소 목록 로드 실패:', error);
      setPlaces([]);
      setPlacesStatus('error');
      setPlacesError('장소 목록을 불러오지 못했습니다.');
    }
  }, [selectedStadium, selectedCategory]);

  // Kakao 기반 카테고리(store/parking) 주변 검색: 지도 준비 완료 시에만 실행
  const loadNearbyPlaces = useCallback(() => {
    if (!selectedStadium || (selectedCategory !== 'store' && selectedCategory !== 'parking')) {
      return;
    }

    setSelectedPlace(null);
    clearMarkers();

    if (!isMapReady || !map) {
      setPlaces([]);
      setNearbyStatus(mapStatus === 'loading' ? 'loading' : 'error');
      setNearbyError(mapStatus === 'loading' ? null : '지도가 준비되지 않아 주변 검색을 수행할 수 없습니다.');
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
  }, [selectedStadium, selectedCategory, isMapReady, map, mapStatus, clearMarkers]);

  // ========== 카카오맵 스크립트 로드 + 구장 목록 (병렬) ==========
  useEffect(() => {
    loadMapSdk();
  }, [loadMapSdk]);

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
      setMapError(sanitizeStadiumGuideErrorMessage(
        error,
        '지도를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.',
      ));
    }
  }, [selectedStadium, isMapReady, mapContainer, initializeMap]);

  // ========== DB 장소 로드 (지도 불필요 — SDK 준비 전에 선행 실행 가능) ==========
  useEffect(() => {
    void loadDbPlaces();
  }, [loadDbPlaces]);

  // ========== 주변 검색 (지도 준비 완료 후) ==========
  useEffect(() => {
    loadNearbyPlaces();
  }, [loadNearbyPlaces]);

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
    void loadDbPlaces();
    loadNearbyPlaces();
  }, [loadDbPlaces, loadNearbyPlaces]);

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
