import { useQuery } from '@tanstack/react-query';

import { fetchSeatViews, type SeatViewPhoto } from '../api/diary';

export function buildSeatViewSectionQueries(section: string, sectionAliases: string[] = []): string[] {
  return Array.from(new Set(
    [...sectionAliases, section]
      .map((value) => value.trim())
      .filter(Boolean),
  ));
}

export function dedupeSeatViewPhotos(photoGroups: SeatViewPhoto[][]): SeatViewPhoto[] {
  const seen = new Set<string>();
  const photos: SeatViewPhoto[] = [];

  photoGroups.flat().forEach((photo) => {
    const key = photo.photoUrl || `${photo.stadium}:${photo.section ?? ''}:${photo.block ?? ''}:${photo.diaryDate}`;
    if (seen.has(key)) return;
    seen.add(key);
    photos.push(photo);
  });

  return photos;
}

type SeatViewFetcher = (stadium: string, section: string, limit: number) => Promise<SeatViewPhoto[]>;

export async function fetchPrioritizedSeatViewPhotos(
  stadium: string,
  sectionQueries: string[],
  limit: number,
  fetcher: SeatViewFetcher = fetchSeatViews,
): Promise<SeatViewPhoto[]> {
  const photoGroups: SeatViewPhoto[][] = [];

  for (const sectionName of sectionQueries) {
    photoGroups.push(await fetcher(stadium, sectionName, limit));
    const photos = dedupeSeatViewPhotos(photoGroups);
    if (photos.length >= limit) {
      return photos.slice(0, limit);
    }
  }

  return dedupeSeatViewPhotos(photoGroups).slice(0, limit);
}

/**
 * Shared seat-view photo query (diary `/diary/seat-views`). Used by SeatViewGallery
 * to render the gallery and by MateDetail's seat block to show the photo count.
 * Matching section/stadium/limit queryKeys share cached requests across call sites.
 */
export function useSeatViewPhotos(
  stadium: string,
  section: string,
  sectionAliases: string[] = [],
  limit = 9,
) {
  const sectionQueries = buildSeatViewSectionQueries(section, sectionAliases);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['seat-views', stadium, sectionQueries, limit],
    queryFn: async () => {
      return fetchPrioritizedSeatViewPhotos(stadium, sectionQueries, limit);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: Boolean(stadium && sectionQueries.length > 0),
  });

  return { photos, isLoading };
}
