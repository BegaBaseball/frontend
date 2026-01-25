import { useState } from 'react';
import { cn } from '../lib/utils';
import ImageLightbox from './ImageLightbox';

interface ImageGridProps {
  images: string[];
}

export default function ImageGrid({ images }: ImageGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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

  return (
    <>
      <div
        className={cn(
          'mt-2 grid gap-1 overflow-hidden rounded-2xl ring-1 ring-inset ring-black/10',
          images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        )}
      >
        {images.slice(0, 4).map((src, index) => (
          <div
            key={src}
            className={cn(
              'relative cursor-zoom-in bg-slate-100',
              images.length === 3 && index === 0 ? 'row-span-2' : 'aspect-square',
              images.length === 1 && 'aspect-video'
            )}
            onClick={(event) => openLightbox(index, event)}
          >
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover transition-all hover:brightness-90 image-render-quality"
              loading="lazy"
            />
            {images.length > 4 && index === 3 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-lg font-bold text-white">
                +{images.length - 3}
              </div>
            )}
          </div>
        ))}
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
}
