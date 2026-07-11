import { useNavigate } from 'react-router-dom';
import { EmbeddedPost as EmbeddedPostType } from '../api/cheerApi';
import { formatTimeAgo } from '../utils/time';
import { OptimizedImage } from './common/OptimizedImage';
import { CheerCardTrashIcon as TrashIcon } from './icons/CheerCardIcons';
import { ProfileAvatar } from './ui/ProfileAvatar';

interface EmbeddedPostProps {
    post: EmbeddedPostType;
    onClick?: () => void;
    className?: string;
}

function resolveProfileImage(imageUrl?: string) {
    if (!imageUrl) return null;
    if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return null;
    return imageUrl;
}

export default function EmbeddedPost({ post, onClick, className }: EmbeddedPostProps) {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
        } else if (!post.deleted && post.id) {
            navigate(`/cheer/${post.id}`);
        }
    };

    // 삭제된 게시글 플레이스홀더
    if (post.deleted) {
        return (
            <div
                className="mt-3 rounded-xl border border-dashed border-gray-200 dark:border-border bg-gray-50 dark:bg-card/50 p-4"
            >
                <div className="flex items-center gap-2 text-gray-400 dark:text-white">
                    <TrashIcon className="h-4 w-4" />
                    <span className="text-body font-semibold">삭제된 게시글입니다</span>
                </div>
            </div>
        );
    }

    // 본문 미리보기 (100자 제한)
    const previewContent = post.content?.length > 100
        ? post.content.slice(0, 100) + '...'
        : post.content || '';
    const authorProfileImageUrl = resolveProfileImage(post.authorProfileImageUrl);

    return (
        <div
            onClick={handleClick}
            className={`mt-3 rounded-xl border border-gray-200 dark:border-border bg-gray-50 dark:bg-secondary p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-secondary transition-colors ${className || ''}`}
            style={{
                borderLeftColor: post.teamColor || 'var(--primary)',
                borderLeftWidth: '3px',
            }}
        >
            {/* 작성자 정보 */}
            <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-secondary overflow-hidden flex-shrink-0">
                    {authorProfileImageUrl ? (
                        <ProfileAvatar
                            src={authorProfileImageUrl}
                            alt={post.author}
                            fallbackName={post.author}
                            width={24}
                            height={24}
                        />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-body font-semibold text-slate-500 dark:text-white">
                            {post.author?.slice(0, 1) || '?'}
                        </div>
                    )}
                </div>
                    <div className="flex items-center gap-1.5 text-body font-semibold min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {post.author}
                    </span>
                    <span className="text-gray-500 dark:text-white truncate">
                        {post.authorHandle} · {formatTimeAgo(post.createdAt)}
                    </span>
                </div>
            </div>

            {/* 본문 미리보기 */}
            {previewContent && (
                <p className="text-body font-semibold text-gray-600 dark:text-white line-clamp-2">
                    {previewContent}
                </p>
            )}

            {/* 이미지 미리보기 (첫 번째 이미지만) */}
            {post.imageUrls && post.imageUrls.length > 0 && (
                <div className="mt-2 relative">
                    <OptimizedImage
                        src={post.imageUrls[0]}
                        alt="첨부 이미지"
                        className="h-20 w-full object-cover rounded-lg image-render-quality"
                        loading="lazy"
                        width={320}
                        height={80}
                        sizes="(max-width: 1024px) 100vw, 320px"
                    />
                    {post.imageUrls.length > 1 && (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-body px-1.5 py-0.5 rounded">
                          +{post.imageUrls.length - 1}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
