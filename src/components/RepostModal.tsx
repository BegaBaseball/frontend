import { Repeat2, Quote, Undo2, Trash2 } from 'lucide-react';
import { CheerPost } from '../api/cheerApi';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from './ui/dialog';

interface RepostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: CheerPost;
    onSimpleRepost: () => void;
    onQuoteRepost: () => void;
    isRepostedByMe: boolean;
    onCancelRepost?: () => void;
    isOwner?: boolean;
}

export default function RepostModal({
    isOpen,
    onClose,
    post,
    onSimpleRepost,
    onQuoteRepost,
    isRepostedByMe,
    onCancelRepost,
    isOwner,
}: RepostModalProps) {
    // 리포스트인 게시글은 다시 리포스트할 수 없음 (중첩 방지)
    const isRepost = !!post.repostType;

    const handleSimpleRepost = () => {
        onSimpleRepost();
        onClose();
    };

    const handleQuoteRepost = () => {
        onQuoteRepost();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="sm:max-w-[340px] p-0 gap-0">
                <DialogHeader className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <DialogTitle className="text-base font-semibold text-center">
                        리포스트
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        게시글을 리포스트하거나 인용할 수 있는 옵션을 선택하세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {isRepost ? (
                        // 리포스트된 게시글인 경우 안내 메시지
                        // 리포스트된 게시글인 경우
                        post.repostType && isOwner && onCancelRepost ? (
                            // 내가 작성한 리포스트라면 -> 취소(삭제) 기능 제공
                            <button
                                onClick={() => {
                                    onCancelRepost();
                                    onClose();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-medium text-red-600 dark:text-red-400">
                                        리포스트 삭제
                                    </p>
                                    <p className="text-xs text-red-500/70 dark:text-red-400/70">
                                        이 리포스트를 영구적으로 삭제합니다
                                    </p>
                                </div>
                            </button>
                        ) : (
                            // 남의 리포스트라면 -> "재리포스트 불가" 안내
                            <div className="px-4 py-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-3 flex items-center justify-center">
                                    <Repeat2 className="w-6 h-6 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    리포스트된 글은 다시 리포스트할 수 없습니다.
                                </p>
                            </div>
                        )
                    ) : (
                        <>
                            {/* 단순 리포스트 버튼 */}
                            <button
                                onClick={handleSimpleRepost}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRepostedByMe
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                    : 'bg-gray-100 dark:bg-gray-800'
                                    }`}>
                                    {isRepostedByMe ? (
                                        <Undo2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <Repeat2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className={`font-medium ${isRepostedByMe
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-gray-900 dark:text-white'
                                        }`}>
                                        {isRepostedByMe ? '리포스트 취소' : '리포스트'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {isRepostedByMe
                                            ? '내 프로필에서 제거됩니다'
                                            : '내 프로필에 바로 공유됩니다'}
                                    </p>
                                </div>
                            </button>

                            {/* 인용 리포스트 버튼 */}
                            <button
                                onClick={handleQuoteRepost}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Quote className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        인용하기
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        내 의견을 덧붙여 공유합니다
                                    </p>
                                </div>
                            </button>
                        </>
                    )}
                </div>

                {/* 닫기 버튼 */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        취소
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
