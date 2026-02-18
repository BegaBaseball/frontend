import { useEffect, useState } from 'react';

interface ProfileAvatarProps {
  src?: string | null | undefined;
  alt: string;
  fallbackName?: string;
  size?: 'sm' | 'md' | 'lg';
  width?: 32 | 40 | 48 | 64;
  height?: 32 | 40 | 48 | 64;
  srcSet?: string;
  sizes?: string;
  className?: string;
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
  const resolvedSize = hasFixedSize ? resolvedWidth : null;
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
    ...(sizeStyle || {}),
  };
  const containerClass = hasFixedSize ? '' : sizeClasses[size];
  const iconSizeClass = hasFixedSize
    ? (resolvedSize >= 48 ? iconSizes.lg : resolvedSize >= 40 ? iconSizes.md : iconSizes.sm)
    : iconSizes[size];

  if (src && !imageError) {
    return (
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={resolvedSize ?? undefined}
        height={resolvedSize ?? undefined}
        style={imageStyle}
        data-testid="profile-avatar-image"
        className={`${containerClass} rounded-full object-cover border border-gray-200 dark:border-border bg-gray-100 dark:bg-card ${className}`.trim()}
        onError={() => setImageError(true)}
      />
  );
  }

  return (
    <div
      data-testid="profile-avatar-fallback"
      style={sizeStyle}
      className={`${containerClass} rounded-full ${fallbackClassByName} border border-gray-200 dark:border-border text-white font-semibold flex items-center justify-center ${className}`.trim()}
    >
      <span className={`${iconSizeClass} flex items-center justify-center`}>
        {initials}
      </span>
    </div>
  );
}
