import { useState, useEffect } from 'react';
import { Stadium, Place, CategoryType } from '../types/stadium';
import { api } from '../utils/api';
import { loadKakaoMapScript, searchNearbyPlaces, updateMapMarkers } from '../utils/kakaoMap';
import { useKakaoMap } from './useKakaoMap';

export const useStadiumGuide = () => {
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [selectedStadium, setSelectedStadium] = useState<Stadium | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('food');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const {
    mapContainer,
    map,
    markersRef,
    infowindowsRef,
    clearMarkers,
    initializeMap,
  } = useKakaoMap(selectedStadium);

  // ========== 카카오맵 스크립트 로드 ==========
  useEffect(() => {
    loadKakaoMapScript(
      () => setIsMapReady(true),
      (message) => {
        setError(message ?? '지도를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
      }
    );
  }, []);

  // ========== 구장 목록 가져오기 ==========
  useEffect(() => {
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

    fetchStadiums();
  }, []);

  // ========== 지도 초기화 ==========
  useEffect(() => {
    if (!selectedStadium || !mapContainer.current || !isMapReady) return;

    try {
      initializeMap();
    } catch (error) {
      console.error('지도 초기화 실패:', error);
      setError('지도를 불러오는데 실패했습니다. 페이지를 새로고침해주세요.');
    }
  }, [selectedStadium, isMapReady]);

  // ========== 장소 검색 ==========
  useEffect(() => {
    if (!selectedStadium || !isMapReady) return;

    setSelectedPlace(null);
    clearMarkers();

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

    if (selectedCategory === 'store') {
      if (!map) return;
      searchNearbyPlaces(
        '편의점',
        'store',
        selectedStadium,
        map,
        setPlaces,
        (error) => console.error(error)
      );
    } else if (selectedCategory === 'parking') {
      if (!map) return;
      searchNearbyPlaces(
        '주차장',
        'parking',
        selectedStadium,
        map,
        setPlaces,
        (error) => console.error(error)
      );
    } else {
      fetchPlaces(selectedStadium.stadiumId, selectedCategory);
    }
  }, [selectedStadium, selectedCategory, map, isMapReady]);

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

    // Map
    mapContainer,
    map,

    // Handlers
    handleStadiumChange,
    handlePlaceClick,
  };
};
