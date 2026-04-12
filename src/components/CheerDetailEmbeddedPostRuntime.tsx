import type { CSSProperties } from 'react';
import type { EmbeddedPost as EmbeddedPostType } from '../api/cheerApi';
import { Quote, Repeat2 } from 'lucide-react';
import EmbeddedPost from './EmbeddedPost';

interface CheerDetailEmbeddedPostRuntimeProps {
    detailAccent: string;
    isQuoteRepost: boolean;
    isSimpleRepost: boolean;
    originalEmbeddedPost: EmbeddedPostType | null;
    primaryBorderStyle: CSSProperties;
    surfaceTintStyle: CSSProperties;
    variant: 'repost-banner' | 'simple-deleted';
}

export default function CheerDetailEmbeddedPostRuntime({
    detailAccent,
    isQuoteRepost,
    isSimpleRepost,
    originalEmbeddedPost,
    primaryBorderStyle,
    surfaceTintStyle,
    variant,
}: CheerDetailEmbeddedPostRuntimeProps) {
    if (!originalEmbeddedPost) {
        return null;
    }

    if (variant === 'simple-deleted') {
        if (!isSimpleRepost) {
            return null;
        }

        return (
            <EmbeddedPost
                post={originalEmbeddedPost}
                className="mt-0 bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900"
            />
        );
    }

    return (
        <div
            className="rounded-[20px] border p-3.5 backdrop-blur-sm transition-colors dark:border-white/10 dark:bg-white/[0.03] sm:p-4"
            style={{
                ...primaryBorderStyle,
                ...surfaceTintStyle,
            }}
        >
            <div className="flex items-center gap-2 text-[16px] font-bold" style={{ color: detailAccent }}>
                {isQuoteRepost ? <Quote className="h-3.5 w-3.5" /> : <Repeat2 className="h-3.5 w-3.5" />}
                <span>
                    {isSimpleRepost
                        ? '원글 반응/댓글과 함께 보입니다.'
                        : '인용 원문을 함께 볼 수 있어요.'}
                </span>
            </div>
            {isQuoteRepost ? (
                <EmbeddedPost
                    post={originalEmbeddedPost}
                    className="mt-4 bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900"
                />
            ) : null}
        </div>
    );
}
