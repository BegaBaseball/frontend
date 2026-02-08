import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ImagePlus, Smile } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { useAuthStore } from '../store/authStore';
import { CheerPost, createComment } from '../api/cheerApi';
import TeamLogo from './TeamLogo';
import { TEAM_DATA } from '../constants/teams';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { useTheme } from '../hooks/useTheme';
import { useRef, useEffect } from 'react';

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: CheerPost;
}

export default function CommentModal({ isOpen, onClose, post }: CommentModalProps) {
    const { user } = useAuthStore();
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    const commentMutation = useMutation({
        mutationFn: () => createComment(post.id, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
            queryClient.invalidateQueries({ queryKey: ['cheer-comments', post.id] });
            setContent('');
            onClose();
        },
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    const handleEmojiClick = (emojiData: { emoji: string }) => {
        setContent(prev => prev + emojiData.emoji);
    };

    const handleSubmit = () => {
        if (!content.trim() || commentMutation.isPending) return;
        commentMutation.mutate();
    };

    const teamLabel = post.team;

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none rounded-none sm:rounded-xl bg-white dark:bg-[#151A23]">
                <DialogHeader className="px-4 py-3 border-b border-[#EFF3F4] dark:border-[#232938] flex flex-row items-center justify-between">
                    <DialogTitle className="text-lg font-bold">답글 남기기</DialogTitle>
                </DialogHeader>

                <div className="p-4">
                    {/* Original Post Preview */}
                    <div className="flex gap-3 mb-6 relative">
                        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                            <TeamLogo team={teamLabel} size={40} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="font-bold text-[15px] dark:text-white">{post.author}</span>
                                <span className="text-[14px] text-slate-500 dark:text-slate-400">@{post.authorHandle || post.author}</span>
                                <span className="text-slate-400">·</span>
                                <span className="text-[14px] text-slate-500 dark:text-slate-400">{post.timeAgo}</span>
                            </div>
                            <p className="text-[15px] text-slate-700 dark:text-slate-300 line-clamp-3 mb-2">{post.content}</p>
                            <div className="text-[14px] text-slate-400">
                                <span className="text-indigo-500 font-medium">@{post.authorHandle || post.author}</span> 님에게 답글 남기는 중
                            </div>
                        </div>
                    </div>

                    {/* Reply Area */}
                    <div className="flex gap-3 mt-4">
                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                            {user?.favoriteTeam && user.favoriteTeam !== '없음' ? (
                                <TeamLogo team={TEAM_DATA[user.favoriteTeam]?.name || user.favoriteTeam} size={40} />
                            ) : (
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                    {user?.name?.slice(0, 1) || '?'}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <TextareaAutosize
                                autoFocus
                                placeholder="내 답글을 게시하세요"
                                className="w-full resize-none border-none bg-transparent text-[19px] leading-relaxed text-[#0f1419] dark:text-white placeholder:text-[#536471] dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 min-h-[120px]"
                                minRows={3}
                                maxRows={10}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />

                            <div className="mt-4 flex items-center justify-between border-t border-[#EFF3F4] dark:border-[#232938] pt-3">
                                <div className="flex items-center gap-1">
                                    <div className="relative" ref={emojiPickerRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="p-2 text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute top-full left-0 z-50 mt-2">
                                                <EmojiPicker
                                                    onEmojiClick={handleEmojiClick}
                                                    theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                                                    lazyLoadEmojis={true}
                                                    skinTonesDisabled={true}
                                                    searchPlaceHolder="이모지 검색..."
                                                    width={300}
                                                    height={400}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!content.trim() || commentMutation.isPending}
                                    className="rounded-full px-6 font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-md transition-all"
                                >
                                    {commentMutation.isPending ? '답글 중...' : '답글'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
