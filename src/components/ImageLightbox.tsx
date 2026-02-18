import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-6 top-6 rounded-full p-2 text-white transition-colors hover:bg-white/10"
        onClick={onClose}
        aria-label="Close image viewer"
      >
        <X className="h-8 w-8" />
      </button>

      {images.length > 1 && (
        <button
          type="button"
          className="absolute left-6 rounded-full p-3 text-white transition-colors hover:bg-white/10"
          onClick={(event) => {
            event.stopPropagation();
            onPrev();
          }}
          aria-label="Previous image"
        >
          <ChevronLeft className="h-10 w-10" />
        </button>
      )}

      <div className="max-h-[90vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="h-full w-full select-none object-contain"
          draggable={false}
        />
        <p className="mt-4 text-center text-sm text-white/60">
          {currentIndex + 1} / {images.length}
        </p>
      </div>

      {images.length > 1 && (
        <button
          type="button"
          className="absolute right-6 rounded-full p-3 text-white transition-colors hover:bg-white/10"
          onClick={(event) => {
            event.stopPropagation();
            onNext();
          }}
          aria-label="Next image"
        >
          <ChevronRight className="h-10 w-10" />
        </button>
      )}
    </div>
  );
}
