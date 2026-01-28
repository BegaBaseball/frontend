import { useState, useRef, useEffect } from 'react';
import { X, ImagePlus, Smile } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { useTheme } from '../hooks/useTheme';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { TEAM_DATA } from '../constants/teams';
import TeamLogo from './TeamLogo';
import { useAuthStore } from '../store/authStore';

interface CheerWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: string, files: File[]) => Promise<void>;
    teamColor: string;
    teamAccent: string;
    teamContrastText: string;
    teamLabel: string;
    teamId?: string;
}

export default function CheerWriteModal({
    isOpen,
    onClose,
    onSubmit,
    teamColor,
    teamAccent,
    teamContrastText,
    teamLabel,
    teamId
}: CheerWriteModalProps) {
    const { user } = useAuthStore();
    const [content, setContent] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const { theme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

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

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const MAX_SIZE = 5 * 1024 * 1024; // 5MB
            const incomingFiles = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));

            const validFiles: File[] = [];
            let skippedCount = 0;

            incomingFiles.forEach(file => {
                if (file.size > MAX_SIZE) {
                    skippedCount++;
                } else {
                    validFiles.push(file);
                }
            });

            if (skippedCount > 0) {
                alert(`이미지 크기는 5MB 이하여야 합니다. (${skippedCount}개 파일 제외됨)`);
            }

            if (validFiles.length === 0) {
                event.target.value = '';
                return;
            }

            const combinedFiles = [...files, ...validFiles].slice(0, 10);
            const newPreviews = validFiles.map(file => ({
                file,
                url: URL.createObjectURL(file)
            }));
            setFiles(combinedFiles);
            setPreviews(prev => [...prev, ...newPreviews].slice(0, 10));
            event.target.value = '';
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            URL.revokeObjectURL(prev[index].url);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleEmojiClick = (emojiData: { emoji: string }) => {
        setContent(prev => prev + emojiData.emoji);
    };

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setIsSubmitting(true);
        try {
            await onSubmit(content, files);
            setContent('');
            setFiles([]);
            previews.forEach(p => URL.revokeObjectURL(p.url));
            setPreviews([]);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="w-full h-full max-w-none max-h-none sm:w-auto sm:h-auto sm:max-w-[600px] sm:max-h-[90vh] p-0 overflow-hidden border-none rounded-none sm:rounded-lg bg-white dark:bg-[#151A23] fixed inset-0 sm:inset-auto">
                <DialogHeader className="px-4 py-3 border-b border-[#EFF3F4] dark:border-[#232938] flex flex-row items-center justify-between">
                    <DialogTitle className="text-lg font-bold">새 응원글 작성</DialogTitle>
                </DialogHeader>

                <div className="p-4">
                    <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user?.favoriteTeam && user.favoriteTeam !== '없음' ? (
                                <TeamLogo teamId={teamId} team={teamLabel} size={40} />
                            ) : (
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                    {user?.name?.slice(0, 1) || '?'}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                            <TextareaAutosize
                                autoFocus
                                placeholder="지금 우리 팀에게 응원을 남겨주세요!"
                                className="w-full resize-none border-none bg-transparent text-[19px] leading-relaxed text-[#0f1419] dark:text-white placeholder:text-[#536471] dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 min-h-[120px]"
                                minRows={5}
                                maxRows={15}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />

                            {previews.length > 0 && (
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    {previews.map((preview, index) => (
                                        <div key={preview.url} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
                                            <img src={preview.url} alt="preview" className="h-full w-full object-cover" />
                                            <button
                                                onClick={() => handleRemoveFile(index)}
                                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex items-center justify-between border-t border-[#EFF3F4] dark:border-[#232938] pt-3">
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors"
                                    >
                                        <ImagePlus className="w-5 h-5" />
                                    </button>
                                    <div className="relative" ref={emojiPickerRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors"
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute top-0 left-full z-50 ml-2 sm:left-auto sm:right-0 sm:top-full sm:mt-2">
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
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!content.trim() || isSubmitting}
                                    className="rounded-full px-6 font-bold shadow-md hover:shadow-lg transition-all"
                                    style={{ backgroundColor: teamAccent, color: teamContrastText }}
                                >
                                    {isSubmitting ? '게시 중...' : '게시하기'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
