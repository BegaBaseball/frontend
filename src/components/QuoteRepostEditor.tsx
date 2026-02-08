import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { CheerPost, EmbeddedPost as EmbeddedPostType } from '../api/cheerApi';
import { useCheerMutations } from '../hooks/useCheerQueries';
import { useAuthStore } from '../store/authStore';
import EmbeddedPost from './EmbeddedPost';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';

interface QuoteRepostEditorProps {
    isOpen: boolean;
    onClose: () => void;
    post: CheerPost;
}

export default function QuoteRepostEditor({ isOpen, onClose, post }: QuoteRepostEditorProps) {
    const [content, setContent] = useState('');
    const { confirm } = useConfirmDialog();
    const { quoteRepostMutation } = useCheerMutations();
    const user = useAuthStore((state) => state.user);

    const MAX_LENGTH = 500;
    const remainingChars = MAX_LENGTH - content.length;
    const isOverLimit = remainingChars < 0;
    const canSubmit = content.trim().length > 0 && !isOverLimit && !quoteRepostMutation.isPending;

    // 원본 게시글을 EmbeddedPost 형식으로 변환
    const embeddedOriginal: EmbeddedPostType = {
        id: post.id,
        teamId: post.teamId,
        teamColor: post.teamColor,
        content: post.content,
        author: post.author,
        authorHandle: post.authorHandle,
        authorProfileImageUrl: post.authorProfileImageUrl,
        createdAt: post.createdAt,
        imageUrls: post.imageUrls || [],
        deleted: false,
    };

    const handleSubmit = () => {
        if (!canSubmit) return;

        quoteRepostMutation.mutate(
            { postId: post.id, content: content.trim() },
            {
                onSuccess: () => {
                    toast.success('인용 리포스트가 게시되었습니다.');
                    setContent('');
                    onClose();
                },
                onError: (error: any) => {
                    const message = error?.response?.data?.message || '인용 리포스트에 실패했습니다.';
                    toast.error(message);
                },
            }
        );
    };

    const handleClose = async () => {
        if (content.trim() && !quoteRepostMutation.isPending) {
            const confirmed = await confirm({ title: '작성 취소', description: '작성 중인 내용이 있습니다. 정말 닫으시겠습니까?', confirmLabel: '닫기' });
            if (!confirmed) return;
        }
        setContent('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[500px] p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleClose}
                            className="p-1 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            disabled={quoteRepostMutation.isPending}
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                        <DialogTitle className="text-base font-semibold">
                            인용 리포스트
                        </DialogTitle>
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                canSubmit
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {quoteRepostMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                '게시'
                            )}
                        </button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4">
                    {/* 작성자 정보 */}
                    <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                            {user?.profileImageUrl ? (
                                <img
                                    src={user.profileImageUrl}
                                    alt={user.name || '프로필'}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {user?.name?.slice(0, 1) || '?'}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-sm mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {user?.name || '사용자'}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    {user?.handle || '@user'}
                                </span>
                            </div>

                            {/* 텍스트 입력 */}
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="내 의견을 추가하세요..."
                                className="w-full min-h-[100px] resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 focus:outline-none text-base leading-relaxed"
                                disabled={quoteRepostMutation.isPending}
                                autoFocus
                            />

                            {/* 원본 게시글 미리보기 */}
                            <EmbeddedPost post={embeddedOriginal} />
                        </div>
                    </div>
                </div>

                {/* 하단 글자 수 표시 */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                    <div className="flex justify-end">
                        <span
                            className={`text-sm ${
                                isOverLimit
                                    ? 'text-red-500'
                                    : remainingChars <= 50
                                    ? 'text-yellow-500'
                                    : 'text-gray-400'
                            }`}
                        >
                            {remainingChars}
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
