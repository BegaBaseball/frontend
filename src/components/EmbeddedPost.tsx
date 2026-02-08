import { useNavigate } from 'react-router-dom';
import { EmbeddedPost as EmbeddedPostType } from '../api/cheerApi';
import { formatTimeAgo } from '../utils/time';
import { Trash2 } from 'lucide-react';

interface EmbeddedPostProps {
    post: EmbeddedPostType;
    onClick?: () => void;
    className?: string;
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
                className="mt-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4"
            >
                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                    <Trash2 className="h-4 w-4" />
                    <span className="text-sm">삭제된 게시글입니다</span>
                </div>
            </div>
        );
    }

    // 본문 미리보기 (100자 제한)
    const previewContent = post.content?.length > 100
        ? post.content.slice(0, 100) + '...'
        : post.content || '';

    return (
        <div
            onClick={handleClick}
            className={`mt-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1A1F2B] p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#232938] transition-colors ${className || ''}`}
            style={{
                borderLeftColor: post.teamColor || '#2d5f4f',
                borderLeftWidth: '3px',
            }}
        >
            {/* 작성자 정보 */}
            <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden flex-shrink-0">
                    {post.authorProfileImageUrl ? (
                        <img
                            src={post.authorProfileImageUrl}
                            alt={post.author}
                            className="h-full w-full object-cover image-render-quality"
                        />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-medium text-slate-500 dark:text-slate-400">
                            {post.author?.slice(0, 1) || '?'}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-sm min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {post.author}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 truncate">
                        {post.authorHandle} · {formatTimeAgo(post.createdAt)}
                    </span>
                </div>
            </div>

            {/* 본문 미리보기 */}
            {previewContent && (
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {previewContent}
                </p>
            )}

            {/* 이미지 미리보기 (첫 번째 이미지만) */}
            {post.imageUrls && post.imageUrls.length > 0 && (
                <div className="mt-2 relative">
                    <img
                        src={post.imageUrls[0]}
                        alt="첨부 이미지"
                        className="h-20 w-full object-cover rounded-lg image-render-quality"
                    />
                    {post.imageUrls.length > 1 && (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                            +{post.imageUrls.length - 1}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
