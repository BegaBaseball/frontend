import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    webpSrc?: string; // Optional WebP source
    alt: string;
    className?: string;
    priority?: boolean; // If true, sets loading="eager"
    width?: number | string;
    height?: number | string;
}

/**
 * OptimizedImage Component
 * - Wraps image in <picture> tag
 * - Supports optional WebP source for modern browsers
 * - Default lazy loading (can be overridden with priority prop)
 * - Shows a fallback placeholder when the image fails to load
 * - Accepts optional width/height props to prevent CLS (Cumulative Layout Shift)
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    webpSrc,
    alt,
    className,
    priority = false,
    width,
    height,
    ...props
}) => {
    const [hasError, setHasError] = useState(false);

    const handleError = () => {
        setHasError(true);
    };

    if (hasError) {
        return (
            <div
                className={`flex items-center justify-center bg-gray-100 dark:bg-secondary text-gray-400 dark:text-gray-500 ${className || ''}`}
                style={{ width, height }}
                role="img"
                aria-label={alt || '이미지를 불러올 수 없습니다'}
                title={alt || '이미지를 불러올 수 없습니다'}
            >
                <ImageOff className="w-6 h-6 opacity-50" />
            </div>
        );
    }

    return (
        <picture>
            {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
            <img
                src={src}
                alt={alt}
                className={`image-render-quality ${className || ''}`}
                loading={priority ? 'eager' : 'lazy'}
                decoding={priority ? 'sync' : 'async'}
                width={width}
                height={height}
                onError={handleError}
                {...props}
            />
        </picture>
    );
};
