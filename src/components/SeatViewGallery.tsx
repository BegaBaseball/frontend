import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchSeatViews, SeatViewPhoto } from '../api/diary';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import { Button } from './ui/plain-button';
import { MateCameraIcon, MateCloseIcon } from './MateIcons';

interface SeatViewGalleryProps {
  stadium: string;
  section: string;
  sectionAliases?: string[];
  compact?: boolean;
}

export function buildSeatViewSectionQueries(section: string, sectionAliases: string[] = []): string[] {
  return Array.from(new Set(
    [section, ...sectionAliases]
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

export default function SeatViewGallery({ stadium, section, sectionAliases = [], compact = false }: SeatViewGalleryProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<SeatViewPhoto | null>(null);
  const sectionQueries = buildSeatViewSectionQueries(section, sectionAliases);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['seat-views', stadium, sectionQueries],
    queryFn: async () => {
      const results = await Promise.all(
        sectionQueries.map((sectionName) => fetchSeatViews(stadium, sectionName)),
      );
      return dedupeSeatViewPhotos(results).slice(0, 9);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: Boolean(stadium && sectionQueries.length > 0),
  });

  if (isLoading) {
    return (
      <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {Array.from({ length: compact ? 2 : 3 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] rounded-xl bg-gray-200 dark:bg-secondary animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 dark:border-border bg-gray-50 dark:bg-secondary/50 py-6 px-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-border">
          <MateCameraIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <div>
          <p className="text-[16px] font-semibold text-gray-800 dark:text-gray-100">
            아직 등록된 시야가 없어요
          </p>
          <p className="mt-0.5 text-[16px] text-gray-500 dark:text-gray-400">
            직관 후 다이어리에 사진을 올리면{' '}
            <span className="font-bold text-primary">+50 포인트</span>를 받아요!
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-full text-[16px] min-h-9">
          <Link to="/mypage">다이어리에서 공유하기</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {photos.map((photo, idx) => (
          <button
            type="button"
            key={idx}
            onClick={() => setLightboxPhoto(photo)}
            className="group overflow-hidden rounded-xl bg-gray-100 dark:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <img
              src={photo.photoUrl}
              alt={`${formatStadiumDisplayName(photo.stadium)} ${photo.section ?? ''} 시야 ${idx + 1}`}
              className="aspect-[4/3] h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            onClick={() => setLightboxPhoto(null)}
            aria-label="닫기"
          >
            <MateCloseIcon className="h-5 w-5" />
          </button>
          <img
            src={lightboxPhoto.photoUrl}
            alt="시야 사진 원본"
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {(lightboxPhoto.section || lightboxPhoto.diaryDate) && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-[16px] text-white backdrop-blur-sm">
              {lightboxPhoto.section && <span>{lightboxPhoto.section} </span>}
              {lightboxPhoto.diaryDate && <span>· {lightboxPhoto.diaryDate}</span>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
