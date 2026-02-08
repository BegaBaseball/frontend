import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    webpSrc?: string; // Optional WebP source
    alt: string;
    className?: string;
    priority?: boolean; // If true, sets loading="eager"
}

/**
 * OptimizedImage Component
 * - Wraps image in <picture> tag
 * - Supports optional WebP source for modern browsers
 * - Default lazy loading (can be overridden with priority prop)
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    webpSrc,
    alt,
    className,
    priority = false,
    ...props
}) => {
    return (
        <picture>
            {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
            <img
                src={src}
                alt={alt}
                className={`image-render-quality ${className || ''}`}
                loading={priority ? 'eager' : 'lazy'}
                decoding={priority ? 'sync' : 'async'}
                {...props}
            />
        </picture>
    );
};
