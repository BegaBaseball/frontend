import { useEffect, useState } from 'react';

interface ProfileAvatarProps {
  src?: string | null | undefined;
  alt: string;
  fallbackName?: string;
  size?: 'sm' | 'md' | 'lg';
  width?: 24 | 32 | 40 | 48 | 64 | 80 | 96;
  height?: 24 | 32 | 40 | 48 | 64 | 80 | 96;
  srcSet?: string;
  sizes?: string;
  className?: string;
  showRing?: boolean;
  ringClassName?: string;
}

export function ProfileAvatar({
  src,
  alt,
  fallbackName,
  size = 'md',
  width,
  height,
  srcSet,
  sizes,
  className = '',
  showRing = false,
  ringClassName,
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-14 w-14',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
  };

  const initials = (() => {
    const source = (fallbackName || alt || '').trim();
    if (!source) return '?';
    return source[0]?.toUpperCase() || '?';
  })();

  const fallbackClassByName = (() => {
    const source = (fallbackName || alt || '').trim();
    const index = source ? source.charCodeAt(0) : 0;
    const palette = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-green-600',
      'from-fuchsia-500 to-pink-600',
      'from-orange-500 to-amber-600',
      'from-cyan-500 to-blue-600',
      'from-violet-500 to-purple-600',
    ];
    const color = palette[Math.abs(index) % palette.length];
    return `bg-gradient-to-br ${color}`;
  })();

  const resolvedWidth = width ?? height;
  const resolvedHeight = height ?? width;
  const hasFixedSize = resolvedWidth != null && resolvedHeight != null;
  const resolvedSize = hasFixedSize ? resolvedWidth : undefined;
  const resolvedSizes = sizes ?? (resolvedSize ? `${resolvedSize}px` : undefined);
  const sizeStyle = hasFixedSize
    ? {
      width: `${resolvedSize}px`,
      height: `${resolvedSize}px`,
    }
    : undefined;
  const imageStyle = {
    objectFit: 'cover' as const,
    display: 'block',
    imageRendering: 'auto' as const,
    ...(showRing ? {} : (sizeStyle || {})),
  };
  const containerClass = hasFixedSize ? '' : sizeClasses[size];
  const iconSizeClass = hasFixedSize
    ? (resolvedSize! >= 48 ? iconSizes.lg : resolvedSize! >= 40 ? iconSizes.md : iconSizes.sm)
    : iconSizes[size];
  const ringClass = ringClassName || 'p-px bg-black/5 dark:bg-white/10';
  const innerSizeClass = hasFixedSize || showRing ? 'w-full h-full' : containerClass;
  const imageClassName = `${innerSizeClass} rounded-full object-cover block bg-gray-100 dark:bg-card image-render-quality ${className}`.trim();
  const fallbackClassName = `${innerSizeClass} rounded-full ${fallbackClassByName} text-white font-semibold flex items-center justify-center ${className}`.trim();
  const ringWrapperClassName = `${ringClass} rounded-full inline-flex items-center justify-center overflow-hidden ${!hasFixedSize ? containerClass : ''}`.trim();

  if (src && !imageError) {
    const imageElement = (
        <img
          src={src}
          srcSet={srcSet}
          sizes={resolvedSizes}
          alt={alt}
          width={resolvedSize}
          height={resolvedSize}
        style={imageStyle}
        decoding="async"
        loading="lazy"
        data-testid="profile-avatar-image"
        className={imageClassName}
        onError={() => setImageError(true)}
      />
    );

    if (!showRing) {
      return imageElement;
    }

    return (
      <span className={ringWrapperClassName} style={sizeStyle}>
        {imageElement}
      </span>
    );
  }

  const fallbackElement = (
    <div
      data-testid="profile-avatar-fallback"
      style={hasFixedSize && !showRing ? sizeStyle : undefined}
      className={fallbackClassName}
    >
      <span className={`${iconSizeClass} flex items-center justify-center`}>
        {initials}
      </span>
    </div>
  );

  if (!showRing) {
    return fallbackElement;
  }

  return (
    <span className={ringWrapperClassName} style={sizeStyle}>
      {fallbackElement}
    </span>
  );
}
