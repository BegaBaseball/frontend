import { useEffect, useState } from 'react';
import { User } from 'lucide-react';

interface ProfileAvatarProps {
  src?: string | null | undefined;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProfileAvatar({ src, alt, size = 'md', className = '' }: ProfileAvatarProps) {
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

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt}
        data-testid="profile-avatar-image"
        className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200 dark:border-border bg-gray-100 dark:bg-card image-render-quality ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      data-testid="profile-avatar-fallback"
      className={`${sizeClasses[size]} rounded-full bg-gray-100 dark:bg-card border border-gray-200 dark:border-border flex items-center justify-center ${className}`}
    >
      <User className={`${iconSizes[size]} text-gray-400 dark:text-gray-300`} />
    </div>
  );
}
