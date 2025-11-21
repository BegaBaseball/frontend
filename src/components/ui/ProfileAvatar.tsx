import { useState } from 'react';
import { User } from 'lucide-react';

interface ProfileAvatarProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProfileAvatar({ src, alt, size = 'md', className = '' }: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
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
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ${className}`}
    >
      <User className={`${iconSizes[size]} text-gray-500`} />
    </div>
  );
}