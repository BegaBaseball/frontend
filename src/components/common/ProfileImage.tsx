import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ProfileImageProps {
  src?: string | null;
  /** 이니셜 폴백용 (첫 글자 표시) */
  username?: string;
  /** 크기 preset: xs=24px, sm=32px, md=40px, lg=48px, xl=64px */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  alt?: string;
}

const SIZE_CLASS_MAP: Record<NonNullable<ProfileImageProps['size']>, string> = {
  xs: 'size-6',   // 24px
  sm: 'size-8',   // 32px
  md: 'size-10',  // 40px
  lg: 'size-12',  // 48px
  xl: 'size-16',  // 64px
};

const FALLBACK_TEXT_SIZE_MAP: Record<NonNullable<ProfileImageProps['size']>, string> = {
  xs: 'text-[16px]',
  sm: 'text-[16px]',
  md: 'text-[16px]',
  lg: 'text-base',
  xl: 'text-lg',
};

const ICON_SIZE_MAP: Record<NonNullable<ProfileImageProps['size']>, number> = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
};

/**
 * 레거시 storage URL 또는 로컬 에셋 경로를 감지하여 null을 반환합니다.
 * authStore.ts의 normalizeProfileImageUrl 로직과 동일한 규칙을 따릅니다.
 */
function resolveImageSrc(value?: string | null): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('/src/assets/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.toLowerCase().includes('/storage/v1/object/')
  ) {
    return null;
  }

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * ProfileImage
 *
 * 프로필 이미지를 표시하는 공통 컴포넌트입니다.
 * - 레거시 URL(기존 storage 경로, 로컬 에셋 등) 자동 필터링
 * - 이미지 로드 실패 시 username 이니셜로 폴백
 * - username이 없을 경우 UserIcon으로 폴백
 * - 기본 lazy loading 적용
 */
export const ProfileImage: React.FC<ProfileImageProps> = ({
  src,
  username,
  size = 'md',
  className,
  alt,
}) => {
  const [imgError, setImgError] = useState(false);

  const resolvedSrc = resolveImageSrc(src);

  useEffect(() => {
    setImgError(false);
  }, [resolvedSrc]);

  const showImage = resolvedSrc !== null && !imgError;
  const initial = username?.trim().slice(0, 1) || null;

  const sizeClass = SIZE_CLASS_MAP[size];
  const fallbackTextClass = FALLBACK_TEXT_SIZE_MAP[size];
  const iconSize = ICON_SIZE_MAP[size];
  const imageAlt = alt ?? username ?? '프로필';

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClass,
        className,
      )}
    >
      {showImage && (
        <img
          src={resolvedSrc}
          alt={imageAlt}
          className="block size-full object-cover"
          decoding="async"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      )}
      {!showImage && (
        <div className="flex size-full items-center justify-center bg-slate-100 font-semibold select-none text-slate-600 dark:bg-secondary dark:text-gray-300">
          {initial ? (
            <span className={fallbackTextClass}>{initial}</span>
          ) : (
            <User size={iconSize} className="text-slate-400 dark:text-gray-500" />
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileImage;
