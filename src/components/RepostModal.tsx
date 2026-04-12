import { Repeat2, Quote, Undo2 } from 'lucide-react';
import { CheerPost } from '../api/cheerApi';
import PlainDialog from './ui/plain-dialog';
import {
    getRepostPolicyDecision,
} from '../utils/repostPolicy';
import { useAuthProfileSnapshot } from '../store/authStore';

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
    isOwner = false,
}: RepostModalProps) {
    const { userId: authUserId, userHandle: authUserHandle } = useAuthProfileSnapshot();
    const isRepost = !!post.repostType;
    const targetAuthorHandle = isRepost ? post.originalPost?.authorHandle : post.authorHandle;
    const repostPolicy = getRepostPolicyDecision({
        isPostOwner: isOwner,
        isRepostTarget: isRepost,
        targetAuthorHandle,
        currentUserId: authUserId,
        currentUserHandle: authUserHandle,
    });
    const canSimpleRepost = repostPolicy.canSimpleRepost;
    const canQuoteRepost = repostPolicy.canQuoteRepost;
    const repostUnavailableMessage = repostPolicy.repostSimpleUnavailableMessage;

    const handleSimpleRepost = () => {
        onSimpleRepost();
        onClose();
    };

    const handleQuoteRepost = () => {
        onQuoteRepost();
        onClose();
    };

    return (
        <PlainDialog
            open={isOpen}
            onClose={onClose}
            title={<span className="block text-center text-base font-semibold">리포스트</span>}
            className="sm:max-w-[340px] p-0 gap-0"
            bodyClassName="p-0"
            hideCloseButton
        >
                <div className="py-2">
                    {isRepost ? (
                        isOwner && onCancelRepost ? (
                        <button
                          type="button"
                          onClick={() => {
                            onCancelRepost();
                            onClose();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <Undo2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-red-600 dark:text-red-400">
                                        리포스트 삭제
                                    </p>
                                    <p className="text-[16px] font-semibold text-red-500/70 dark:text-red-400/70">
                                        내 프로필에서 제거됩니다
                                    </p>
                                </div>
                            </button>
                        ) : (
                                <div className="px-4 py-6 text-center">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-card mx-auto mb-3 flex items-center justify-center">
                                    <Repeat2 className="w-6 h-6 text-gray-400" />
                                </div>
                                        <p className="text-[16px] font-semibold text-gray-500 dark:text-gray-300">
                                    {repostUnavailableMessage}
                                </p>
                            </div>
                        )
                    ) : canSimpleRepost || canQuoteRepost ? (
                        <>
                            {canSimpleRepost ? (
                            <button
                                type="button"
                                onClick={handleSimpleRepost}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRepostedByMe
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                        : 'bg-gray-100 dark:bg-card'
                                        }`}>
                                        {isRepostedByMe ? (
                                            <Undo2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                            <Repeat2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className={`font-semibold ${isRepostedByMe
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-gray-900 dark:text-white'
                                            }`}>
                                            {isRepostedByMe ? '리포스트 취소' : '리포스트'}
                                        </p>
                                    <p className="text-[16px] font-semibold text-gray-500 dark:text-gray-300">
                                            {isRepostedByMe
                                                ? '내 프로필에서 제거됩니다'
                                                : '내 프로필에 바로 공유됩니다'}
                                        </p>
                                    </div>
                                </button>
                            ) : null}

                            {canQuoteRepost ? (
                            <button
                                type="button"
                                onClick={handleQuoteRepost}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-card flex items-center justify-center">
                                        <Quote className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            인용하기
                                        </p>
                                        <p className="text-[16px] font-semibold text-gray-500 dark:text-gray-300">
                                            내 의견을 덧붙여 공유합니다
                                        </p>
                                    </div>
                                </button>
                            ) : isRepost ? (
                                <div className="px-4 py-6 text-center">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-card mx-auto mb-3 flex items-center justify-center">
                                        <Quote className="w-6 h-6 text-gray-400" />
                                    </div>
                                <p className="text-[16px] font-semibold text-gray-500 dark:text-gray-300">
                                        {repostUnavailableMessage}
                                    </p>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div className="px-4 py-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-card mx-auto mb-3 flex items-center justify-center">
                                <Repeat2 className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-[16px] font-semibold text-gray-500 dark:text-gray-300">
                                {repostUnavailableMessage}
                            </p>
                        </div>
                    )}
                </div>

                {/* 닫기 버튼 */}
                <div className="px-4 py-3 border-t border-gray-100 dark:border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 text-[16px] font-semibold text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        취소
                    </button>
                </div>
        </PlainDialog>
    );
}
