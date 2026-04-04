import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import type { AdminStadium, Place, PlaceFormData } from '../../api/admin';
import {
  createPlace,
  deletePlace,
  fetchAdminPlaces,
  fetchAdminStadiums,
  updatePlace,
} from '../../api/admin';

const AdminStadiumsPanel = lazy(() =>
  import('./AdminStadiumsPanel').then((module) => ({ default: module.AdminStadiumsPanel })),
);
const AdminPlaceDialogContent = lazy(() => import('./AdminPlaceDialogContent'));
const AdminDeletePlaceDialogContent = lazy(() => import('./AdminDeletePlaceDialogContent'));

const PLACE_CATEGORIES = [
  '음식점',
  '카페',
  '편의점',
  '주차장',
  '대중교통',
  '숙박',
  '관광명소',
  '기타',
] as const;

const emptyForm = (): PlaceFormData => ({
  name: '',
  category: '',
  description: '',
  address: '',
  phone: '',
  lat: 0,
  lng: 0,
  rating: undefined,
  openTime: '',
  closeTime: '',
});

export default function AdminStadiumsRuntime() {
  const [stadiums, setStadiums] = useState<AdminStadium[]>([]);
  const [stadiumsLoading, setStadiumsLoading] = useState(false);
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [stadiumError, setStadiumError] = useState<string | null>(null);
  const [placeDialog, setPlaceDialog] = useState<null | 'create' | Place>(null);
  const [placeForm, setPlaceForm] = useState<PlaceFormData>(emptyForm());
  const [placeSubmitting, setPlaceSubmitting] = useState(false);
  const [deletingPlaceId, setDeletingPlaceId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    setStadiumsLoading(true);
    fetchAdminStadiums()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setStadiums(data);
        if (data.length > 0) {
          setSelectedStadiumId((current) => current || data[0].stadiumId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStadiumError('구장 목록을 불러올 수 없습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStadiumsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadPlaces = useCallback(async (stadiumId: string) => {
    if (!stadiumId) {
      return;
    }

    setPlacesLoading(true);
    setStadiumError(null);
    try {
      const data = await fetchAdminPlaces(stadiumId);
      setPlaces(data);
    } catch {
      setStadiumError('장소 목록을 불러올 수 없습니다.');
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStadiumId) {
      void loadPlaces(selectedStadiumId);
    }
  }, [loadPlaces, selectedStadiumId]);

  const openCreateDialog = () => {
    setPlaceForm(emptyForm());
    setPlaceDialog('create');
  };

  const openEditDialog = (place: Place) => {
    setPlaceForm({
      name: place.name,
      category: place.category,
      description: place.description ?? '',
      address: place.address ?? '',
      phone: place.phone ?? '',
      lat: place.lat,
      lng: place.lng,
      rating: place.rating,
      openTime: place.openTime ?? '',
      closeTime: place.closeTime ?? '',
    });
    setPlaceDialog(place);
  };

  const handlePlaceSubmit = async () => {
    if (!selectedStadiumId) {
      return;
    }

    setPlaceSubmitting(true);
    setStadiumError(null);
    try {
      if (placeDialog === 'create') {
        await createPlace(selectedStadiumId, placeForm);
      } else if (placeDialog && typeof placeDialog === 'object') {
        await updatePlace(placeDialog.id, placeForm);
      }
      setPlaceDialog(null);
      await loadPlaces(selectedStadiumId);
    } catch (error) {
      setStadiumError(error instanceof Error ? error.message : '저장 실패');
    } finally {
      setPlaceSubmitting(false);
    }
  };

  const handleDeletePlace = async () => {
    if (deletingPlaceId == null) {
      return;
    }

    setStadiumError(null);
    try {
      await deletePlace(deletingPlaceId);
      setDeletingPlaceId(null);
      await loadPlaces(selectedStadiumId);
    } catch (error) {
      setStadiumError(error instanceof Error ? error.message : '삭제 실패');
    }
  };

  const stadiumName =
    stadiums.find((stadium) => stadium.stadiumId === selectedStadiumId)?.stadiumName ?? '';

  return (
    <>
      <AdminStadiumsPanel
        stadiumError={stadiumError}
        selectedStadiumId={selectedStadiumId}
        stadiumsLoading={stadiumsLoading}
        stadiums={stadiums}
        placesLoading={placesLoading}
        places={places}
        setSelectedStadiumId={setSelectedStadiumId}
        openCreateDialog={openCreateDialog}
        openEditDialog={openEditDialog}
        setDeletingPlaceId={setDeletingPlaceId}
      />

      {placeDialog !== null && (
        <Suspense fallback={null}>
          <AdminPlaceDialogContent
            open
            mode={placeDialog === 'create' ? 'create' : 'edit'}
            stadiumName={stadiumName}
            categories={PLACE_CATEGORIES}
            stadiumError={stadiumError}
            placeForm={placeForm}
            setPlaceForm={setPlaceForm}
            placeSubmitting={placeSubmitting}
            onOpenChange={(open) => {
              if (!open) {
                setPlaceDialog(null);
              }
            }}
            onSubmit={handlePlaceSubmit}
          />
        </Suspense>
      )}

      {deletingPlaceId !== null && (
        <Suspense fallback={null}>
          <AdminDeletePlaceDialogContent
            open
            onOpenChange={(open) => {
              if (!open) {
                setDeletingPlaceId(null);
              }
            }}
            onConfirm={handleDeletePlace}
          />
        </Suspense>
      )}
    </>
  );
}
