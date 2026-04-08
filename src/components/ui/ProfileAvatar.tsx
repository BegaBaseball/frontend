import { useEffect, useId, useState } from 'react';

const RING_CLASS_MAP = {
  default: 'p-px bg-black/5 dark:bg-white/10',
  cheer: 'p-0.5 bg-slate-200/90 dark:bg-slate-700/80',
  cheerFeed: 'text-slate-200 dark:text-slate-700',
} as const;

type RingVariant = keyof typeof RING_CLASS_MAP;

interface ProfileAvatarSvgImageProps {
  alt: string;
  className: string;
  clipPathId: string;
  src: string;
  showStroke?: boolean;
  svgCx: number;
  svgCy: number;
  svgHeight: number;
  svgRadius: number;
  svgWidth: number;
  onError: () => void;
}

function ProfileAvatarSvgImage({
  alt,
  className,
  clipPathId,
  src,
  showStroke = false,
  svgCx,
  svgCy,
  svgHeight,
  svgRadius,
  svgWidth,
  onError,
}: ProfileAvatarSvgImageProps) {
  return (
    <svg
      data-testid="profile-avatar-image"
      className={className}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width={svgWidth}
      height={svgHeight}
      aria-label={alt}
      role="img"
    >
      <defs>
        <clipPath id={clipPathId}>
          <circle cx={svgCx} cy={svgCy} r={svgRadius} />
        </clipPath>
      </defs>
      <image
        href={src}
        x="0"
        y="0"
        width={svgWidth}
        height={svgHeight}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipPathId})`}
        onError={onError}
      />
      {showStroke ? (
        <circle
          cx={svgCx}
          cy={svgCy}
          r={svgRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}

interface CheerFeedAvatarFallbackProps {
  className: string;
  iconSizeClass: string;
  initials: string;
}

function CheerFeedAvatarFallback({
  className,
  iconSizeClass,
  initials,
}: CheerFeedAvatarFallbackProps) {
  return (
    <div
      data-testid="profile-avatar-fallback"
      className={className}
    >
      <span className={`${iconSizeClass} flex items-center justify-center`}>
        {initials}
      </span>
    </div>
  );
}

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
  ringVariant?: RingVariant;
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
  ringVariant = 'default',
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const svgId = useId().replace(/:/g, '');

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
  const resolvedSize = hasFixedSize && resolvedWidth === resolvedHeight ? resolvedWidth : undefined;
  const resolvedSizes = sizes ?? (resolvedSize ? `${resolvedSize}px` : undefined);
  const sizeStyle = hasFixedSize
    ? {
      width: `${resolvedWidth}px`,
      height: `${resolvedHeight}px`,
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
    ? (Math.max(resolvedWidth!, resolvedHeight!) >= 48
      ? iconSizes.lg
      : Math.max(resolvedWidth!, resolvedHeight!) >= 40
        ? iconSizes.md
        : iconSizes.sm)
    : iconSizes[size];
  const sizePixels = {
    sm: 40,
    md: 48,
    lg: 56,
  } as const;
  const isCheerFeedFrame = showRing && ringVariant === 'cheerFeed';
  const isCheerRingFrame = showRing && ringVariant === 'cheer';
  const usesSvgImageSurface = isCheerFeedFrame || isCheerRingFrame;
  const ringClass = ringClassName || RING_CLASS_MAP[ringVariant];
  const innerSizeClass = hasFixedSize || showRing ? 'w-full h-full' : containerClass;
  const cheerFeedSvgToneClass = `${innerSizeClass} block ${ringClass} ${className}`.trim();
  const cheerFeedFallbackClass = `${innerSizeClass} avatar-edge-smooth rounded-full border ${ringClassName || 'border-slate-200 dark:border-slate-700'} ${fallbackClassByName} text-white font-semibold flex items-center justify-center ${className}`.trim();
  const imageClassName = `${innerSizeClass} ${isCheerFeedFrame ? '' : 'rounded-full'} object-cover block bg-gray-100 dark:bg-card ${className}`.trim();
  const cheerRingSvgClassName = `${innerSizeClass} block bg-gray-100 dark:bg-card ${className}`.trim();
  const fallbackClassName = `${innerSizeClass} ${isCheerFeedFrame ? '' : 'rounded-full'} ${fallbackClassByName} text-white font-semibold flex items-center justify-center ${className}`.trim();
  const ringWrapperClassName = isCheerFeedFrame
    ? `inline-flex items-center justify-center ${!hasFixedSize ? containerClass : ''}`.trim()
    : `${ringClass} rounded-full inline-flex items-center justify-center overflow-hidden ${!hasFixedSize ? containerClass : ''}`.trim();
  const svgWidth = resolvedWidth ?? sizePixels[size];
  const svgHeight = resolvedHeight ?? sizePixels[size];
  const svgRadius = Math.max(0, Math.min(svgWidth, svgHeight) / 2 - 0.5);
  const svgCx = svgWidth / 2;
  const svgCy = svgHeight / 2;
  const clipPathId = `profile-avatar-clip-${svgId}`;
  const imageElement = src && !imageError && !usesSvgImageSurface
    ? (
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
    )
    : null;
  const ringSvgImageElement = src && !imageError && usesSvgImageSurface
    ? (
      <ProfileAvatarSvgImage
        alt={alt}
        className={isCheerFeedFrame ? cheerFeedSvgToneClass : cheerRingSvgClassName}
        clipPathId={clipPathId}
        src={src}
        showStroke={isCheerFeedFrame}
        svgCx={svgCx}
        svgCy={svgCy}
        svgHeight={svgHeight}
        svgRadius={svgRadius}
        svgWidth={svgWidth}
        onError={() => setImageError(true)}
      />
    )
    : null;

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

  const contentElement = ringSvgImageElement || imageElement || fallbackElement;

  if (!showRing) {
    return contentElement;
  }

  if (isCheerFeedFrame) {
    const cheerFeedContentElement = src && !imageError ? (
      <ProfileAvatarSvgImage
        alt={alt}
        className={cheerFeedSvgToneClass}
        clipPathId={clipPathId}
        src={src}
        showStroke
        svgCx={svgCx}
        svgCy={svgCy}
        svgHeight={svgHeight}
        svgRadius={svgRadius}
        svgWidth={svgWidth}
        onError={() => setImageError(true)}
      />
    ) : (
      <CheerFeedAvatarFallback
        className={cheerFeedFallbackClass}
        iconSizeClass={iconSizeClass}
        initials={initials}
      />
    );

    return (
      <span
        data-testid="profile-avatar-frame"
        className={ringWrapperClassName}
        style={sizeStyle}
      >
        {cheerFeedContentElement}
      </span>
    );
  }

  return (
    <span
      data-testid="profile-avatar-frame"
      className={ringWrapperClassName}
      style={sizeStyle}
    >
      <span className="inline-flex h-full w-full items-center justify-center overflow-hidden rounded-full">
        {contentElement}
      </span>
    </span>
  );
}
