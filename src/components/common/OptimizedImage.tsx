import React, { useState } from 'react';
import { OptimizedImageOffIcon } from '../icons/OptimizedImageIcons';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    webpSrc?: string; // Optional WebP source
    alt: string;
    className?: string;
    priority?: boolean; // If true, prioritizes network and decode work for above-the-fold images
    fetchPriority?: 'high' | 'low' | 'auto';
    fetchpriority?: 'high' | 'low' | 'auto';
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
    const {
        onError,
        loading: loadingFromProps,
        decoding: decodingFromProps,
        fetchPriority: fetchPriorityFromProps,
        fetchpriority: lowercaseFetchPriorityFromProps,
        style: styleFromProps,
        ...restProps
    } = props;
    const loading = priority ? 'eager' : (loadingFromProps ?? 'lazy');
    const decoding = priority ? 'sync' : (decodingFromProps ?? 'async');
    const fetchPriority = priority ? 'high' : (fetchPriorityFromProps ?? lowercaseFetchPriorityFromProps);
    const fetchPriorityProps = fetchPriority ? { fetchPriority } : {};
    const numericWidth = typeof width === 'number' ? width : Number(width);
    const numericHeight = typeof height === 'number' ? height : Number(height);
    const reservedAspectRatio = Number.isFinite(numericWidth) && numericWidth > 0
        && Number.isFinite(numericHeight) && numericHeight > 0
        ? `${numericWidth} / ${numericHeight}`
        : undefined;
    const imageStyle = reservedAspectRatio && styleFromProps?.aspectRatio === undefined
        ? { ...styleFromProps, aspectRatio: reservedAspectRatio }
        : styleFromProps;
    const fallbackStyle = reservedAspectRatio && styleFromProps?.aspectRatio === undefined
        ? { ...styleFromProps, width, height, aspectRatio: reservedAspectRatio }
        : { ...styleFromProps, width, height };

    const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
        setHasError(true);
        onError?.(event);
    };

    if (hasError) {
        return (
            <div
                className={`flex items-center justify-center bg-gray-100 dark:bg-secondary text-gray-400 dark:text-white ${className || ''}`}
                style={fallbackStyle}
                role="img"
                aria-label={alt || '이미지를 불러올 수 없습니다'}
                title={alt || '이미지를 불러올 수 없습니다'}
            >
                <OptimizedImageOffIcon className="w-6 h-6 opacity-50" />
            </div>
        );
    }

    return (
        <picture>
            {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
            <img
                src={src}
                alt={alt}
                className={`block image-render-quality ${className || ''}`}
                loading={loading}
                decoding={decoding}
                width={width}
                height={height}
                style={imageStyle}
                onError={handleError}
                {...fetchPriorityProps}
                {...restProps}
            />
        </picture>
    );
};
