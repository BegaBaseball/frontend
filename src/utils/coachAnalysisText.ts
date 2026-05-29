const stripInlineMarkdown = (value: string): string => (
    value
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
);

const normalizeStructuredLine = (value: string): string => (
    stripInlineMarkdown(
        value
            .replace(/^\s*#{1,6}\s*/, '')
            .replace(/^\s*[-*+]\s+/, '')
            .replace(/^\s*\d+\.\s+/, ''),
    )
        .replace(/\s{2,}/g, ' ')
        .trim()
);

export const normalizeStructuredInlineText = (
    value: string,
    fallback = '',
): string => {
    const normalized = normalizeStructuredLine(
        String(value || '')
            .replace(/\r\n/g, '\n')
            .replace(/\n+/g, ' '),
    );

    return normalized || fallback;
};

// Preserve **bold** spans for the verdict highlighter while stripping other inline markdown.
const BOLD_OPEN_SENTINEL = '@@BEGA-BOLD-OPEN@@';
const BOLD_CLOSE_SENTINEL = '@@BEGA-BOLD-CLOSE@@';

const stripInlineMarkdownKeepBold = (value: string): string => {
    const protectedValue = value.replace(
        /\*\*(.*?)\*\*/g,
        (_match, inner: string) => `${BOLD_OPEN_SENTINEL}${inner}${BOLD_CLOSE_SENTINEL}`,
    );
    const stripped = protectedValue
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
    return stripped
        .split(BOLD_OPEN_SENTINEL).join('**')
        .split(BOLD_CLOSE_SENTINEL).join('**');
};

const normalizeVerdictLine = (value: string): string => (
    stripInlineMarkdownKeepBold(
        value
            .replace(/^\s*#{1,6}\s*/, '')
            .replace(/^\s*[-+]\s+/, '')
            .replace(/^\s*\d+\.\s+/, ''),
    )
        .replace(/\s{2,}/g, ' ')
        .trim()
);

export const normalizeVerdictText = (
    value: string,
    fallback = '',
): string => {
    const normalized = normalizeVerdictLine(
        String(value || '')
            .replace(/\r\n/g, '\n')
            .replace(/\n+/g, ' '),
    );

    return normalized || fallback;
};

export const normalizeStructuredMultilineText = (
    value: string,
    fallback = '',
): string => {
    const source = String(value || '').replace(/\r\n/g, '\n');
    const normalizedLines = source.split('\n').map(normalizeStructuredLine);
    const compactLines: string[] = [];

    normalizedLines.forEach((line) => {
        if (!line) {
            if (compactLines.length > 0 && compactLines[compactLines.length - 1] !== '') {
                compactLines.push('');
            }
            return;
        }
        compactLines.push(line);
    });

    while (compactLines[0] === '') {
        compactLines.shift();
    }
    while (compactLines[compactLines.length - 1] === '') {
        compactLines.pop();
    }

    return compactLines.join('\n').trim() || fallback;
};

export const normalizeStructuredInsightList = (values?: unknown[]): string[] => (
    Array.isArray(values)
        ? values
            .map((value) => (typeof value === 'string' ? normalizeStructuredInlineText(value, '') : ''))
            .filter((value) => Boolean(value))
        : []
);

export const sanitizeMarkdown = (value: string, fallback = ''): string => {
    const source = String(value || '')
        .replace(/\r\n/g, '\n')
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<\/?[^>]+>/g, '')
        .replace(/```[\s\S]*?```/g, (block) =>
            block
                .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
                .replace(/```$/, ''),
        )
        .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return source || fallback;
};
