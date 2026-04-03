import { forwardRef, TextareaHTMLAttributes, useEffect, useLayoutEffect, useRef } from 'react';

interface AutosizeTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    minRows?: number;
    maxRows?: number;
}

const AutosizeTextarea = forwardRef<HTMLTextAreaElement, AutosizeTextareaProps>(function AutosizeTextarea(
    {
        minRows = 1,
        maxRows,
        onChange,
        rows,
        style,
        ...props
    },
    forwardedRef,
) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = () => {
        const element = textareaRef.current;
        if (!element || typeof window === 'undefined') {
            return;
        }

        const computedStyle = window.getComputedStyle(element);
        const lineHeight = Number.parseFloat(computedStyle.lineHeight);
        const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
        const borderTop = Number.parseFloat(computedStyle.borderTopWidth) || 0;
        const borderBottom = Number.parseFloat(computedStyle.borderBottomWidth) || 0;
        const verticalOffset = paddingTop + paddingBottom + borderTop + borderBottom;

        element.style.height = 'auto';

        let nextHeight = element.scrollHeight;
        if (Number.isFinite(lineHeight)) {
            const minHeight = Math.max(minRows, 1) * lineHeight + verticalOffset;
            nextHeight = Math.max(nextHeight, minHeight);

            if (typeof maxRows === 'number' && maxRows > 0) {
                const maxHeight = Math.max(maxRows, minRows) * lineHeight + verticalOffset;
                element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden';
                nextHeight = Math.min(nextHeight, maxHeight);
            } else {
                element.style.overflowY = 'hidden';
            }
        }

        element.style.height = `${nextHeight}px`;
    };

    useLayoutEffect(() => {
        resize();
    }, [maxRows, minRows, props.value]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleResize = () => resize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [maxRows, minRows, props.value]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(event);
        resize();
    };

    const setTextareaRef = (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof forwardedRef === 'function') {
            forwardedRef(node);
        } else if (forwardedRef) {
            forwardedRef.current = node;
        }
    };

    return (
        <textarea
            {...props}
            ref={setTextareaRef}
            rows={rows ?? minRows}
            onChange={handleChange}
            style={{
                ...style,
                overflowY: style?.overflowY ?? 'hidden',
            }}
        />
    );
});

export default AutosizeTextarea;
