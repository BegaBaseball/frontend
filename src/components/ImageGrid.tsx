import React, { useState } from 'react';
import { cn } from '../lib/utils';
import ImageLightbox from './ImageLightbox';
import { ImageGridImageOffIcon } from './icons/ImageGridIcons';

interface ImageGridProps {
  images: string[];
}

const ImageGrid = React.memo(function ImageGrid({ images }: ImageGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [failedImageIndexes, setFailedImageIndexes] = useState<Set<number>>(() => new Set());

  if (!images || images.length === 0) return null;

  const openLightbox = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedIndex(index);
  };

  const closeLightbox = () => setSelectedIndex(null);
  const showNext = () =>
    setSelectedIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
  const showPrev = () =>
    setSelectedIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
  const isSingleImage = images.length === 1;
  const markImageFailed = (index: number) => () => {
    setFailedImageIndexes((previousIndexes) => {
      if (previousIndexes.has(index)) {
        return previousIndexes;
      }

      const nextIndexes = new Set(previousIndexes);
      nextIndexes.add(index);
      return nextIndexes;
    });
  };

  return (
    <>
      <div
        data-skip-cheer-card-nav
        className={cn(
          'mt-2 grid gap-1 overflow-hidden rounded-2xl ring-1 ring-inset ring-black/10',
          isSingleImage ? 'grid-cols-1' : 'grid-cols-2'
        )}
      >
        {images.slice(0, 4).map((src, index) => {
          const isPrimarySingleImage = isSingleImage && index === 0;
          const imageFailed = failedImageIndexes.has(index);
          const width = isSingleImage ? 1280 : 640;
          const height = isSingleImage ? 720 : 640;

          return (
            <div
              key={src}
              className={cn(
                'relative cursor-zoom-in bg-slate-100',
                images.length === 3 && index === 0 ? 'row-span-2' : 'aspect-square',
                isSingleImage && 'aspect-video'
              )}
              onClick={(event) => openLightbox(index, event)}
            >
              {imageFailed ? (
                <div
                  className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-secondary dark:text-white"
                  role="img"
                  aria-label={`게시 이미지 ${index + 1}을 불러올 수 없습니다`}
                >
                  <ImageGridImageOffIcon className="h-6 w-6 opacity-60" />
                </div>
              ) : (
                <img
                  src={src}
                  alt={`게시 이미지 ${index + 1}`}
                  className="block h-full w-full object-cover image-render-quality transition-all hover:brightness-90"
                  loading={isPrimarySingleImage ? 'eager' : 'lazy'}
                  decoding={isPrimarySingleImage ? 'sync' : 'async'}
                  fetchPriority={isPrimarySingleImage ? 'high' : 'auto'}
                  width={width}
                  height={height}
                  sizes={isSingleImage ? '(max-width: 1024px) 100vw, 720px' : '(max-width: 640px) 50vw, 320px'}
                  onError={markImageFailed(index)}
                />
              )}
              {images.length > 4 && index === 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-lg font-bold text-white">
                  +{images.length - 3}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedIndex !== null && (
        <ImageLightbox
          images={images}
          currentIndex={selectedIndex}
          onClose={closeLightbox}
          onPrev={showPrev}
          onNext={showNext}
        />
      )}
    </>
  );
});

export default ImageGrid;
