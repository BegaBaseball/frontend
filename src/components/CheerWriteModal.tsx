import { useState, useRef, useEffect } from 'react';
import { X, ImagePlus, Smile } from 'lucide-react';
import { toast } from 'sonner';
import TextareaAutosize from 'react-textarea-autosize';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { useTheme } from '../hooks/useTheme';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import TeamLogo from './TeamLogo';
import { useAuthStore } from '../store/authStore';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { ShareMode } from '../api/cheerApi';

export interface CheerWritePayload {
    content: string;
    files: File[];
    shareMode: ShareMode;
    sourceUrl?: string;
    sourceTitle?: string;
    sourceAuthor?: string;
    sourceLicense?: string;
    sourceLicenseUrl?: string;
    sourceChangedNote?: string;
    sourceSnapshotType?: string;
}

interface CheerWriteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CheerWritePayload) => Promise<void>;
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
    const [shareMode, setShareMode] = useState<ShareMode>('INTERNAL_REPOST');
    const [sourceUrl, setSourceUrl] = useState('');
    const [sourceTitle, setSourceTitle] = useState('');
    const [sourceAuthor, setSourceAuthor] = useState('');
    const [sourceLicense, setSourceLicense] = useState('');
    const [sourceLicenseUrl, setSourceLicenseUrl] = useState('');
    const [sourceChangedNote, setSourceChangedNote] = useState('');
    const [sourceSnapshotType, setSourceSnapshotType] = useState('');
    const { theme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const previewsRef = useRef(previews);
    useEffect(() => { previewsRef.current = previews; }, [previews]);

    // 모달 닫힐 때 Object URL 누수 방지
    useEffect(() => {
        if (!isOpen) {
            previewsRef.current.forEach(p => URL.revokeObjectURL(p.url));
        }
    }, [isOpen]);
    const resolveProfileImage = (imageUrl?: string) => {
        if (!imageUrl) return null;
        if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return null;
        return imageUrl;
    };

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
                toast.warning(`이미지 크기는 5MB 이하여야 합니다. (${skippedCount}개 파일 제외됨)`);
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
        const externalModes: ShareMode[] = ['EXTERNAL_LINK', 'EXTERNAL_COPY', 'EXTERNAL_EMBED', 'EXTERNAL_SUMMARY'];
        if (externalModes.includes(shareMode) && !sourceUrl.trim()) {
            toast.error('외부 공유 모드에서는 출처 URL이 필요합니다.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit({
                content,
                files,
                shareMode,
                sourceUrl: sourceUrl || undefined,
                sourceTitle: sourceTitle || undefined,
                sourceAuthor: sourceAuthor || undefined,
                sourceLicense: sourceLicense || undefined,
                sourceLicenseUrl: sourceLicenseUrl || undefined,
                sourceChangedNote: sourceChangedNote || undefined,
                sourceSnapshotType: sourceSnapshotType || undefined,
            });
            setContent('');
            setFiles([]);
            previews.forEach(p => URL.revokeObjectURL(p.url));
            setPreviews([]);
            setShareMode('INTERNAL_REPOST');
            setSourceUrl('');
            setSourceTitle('');
            setSourceAuthor('');
            setSourceLicense('');
            setSourceLicenseUrl('');
            setSourceChangedNote('');
            setSourceSnapshotType('');
            onClose();
        } catch (error) {
            console.error('게시글 작성 실패:', error);
            toast.error('게시글 작성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="w-full h-auto max-w-[95%] sm:max-w-[600px] lg:max-w-[800px] max-h-[90vh] p-0 overflow-hidden border-none rounded-2xl bg-white dark:bg-card">
                <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#EFF3F4] dark:border-border flex flex-row items-center justify-between">
                    <DialogTitle className="text-lg sm:text-xl font-bold">새 응원글 작성</DialogTitle>
                    <DialogDescription className="sr-only">
                        새로운 응원글을 작성하고 이미지를 업로드하는 모달입니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="flex gap-3 sm:gap-4">
                        {user?.profileImageUrl ? (
                            <ProfileAvatar
                                src={resolveProfileImage(user.profileImageUrl) || undefined}
                                alt={user?.name || '프로필'}
                                fallbackName={user?.name || '프로필'}
                                width={40}
                                height={40}
                                showRing
                                ringClassName="p-px bg-slate-100 dark:bg-secondary"
                            />
                        ) : user?.favoriteTeam && user.favoriteTeam !== '없음' ? (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-secondary p-px flex-shrink-0 overflow-hidden">
                                <div className="h-full w-full rounded-full bg-slate-100 dark:bg-secondary flex items-center justify-center overflow-hidden">
                                    <TeamLogo teamId={teamId} team={teamLabel} size={40} />
                                </div>
                            </span>
                        ) : (
                            <ProfileAvatar
                                alt={user?.name || '프로필'}
                                fallbackName={user?.name || '프로필'}
                                width={40}
                                height={40}
                                showRing
                                ringClassName="p-px bg-slate-100 dark:bg-secondary"
                            />
                        )}
                        <div className="flex-1 min-w-0 flex flex-col gap-2 sm:gap-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <select
                                    value={shareMode}
                                    onChange={(e) => setShareMode(e.target.value as ShareMode)}
                                    className="rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm"
                                >
                                    <option value="INTERNAL_REPOST">내부 공유</option>
                                    <option value="INTERNAL_QUOTE">내부 인용</option>
                                    <option value="EXTERNAL_LINK">외부 링크</option>
                                    <option value="EXTERNAL_EMBED">외부 임베드</option>
                                    <option value="EXTERNAL_SUMMARY">외부 요약</option>
                                    <option value="EXTERNAL_COPY">외부 재게시</option>
                                </select>
                                <input
                                    value={sourceUrl}
                                    onChange={(e) => setSourceUrl(e.target.value)}
                                    placeholder="출처 URL (외부 모드 필수)"
                                    className="rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm"
                                />
                                <input
                                    value={sourceTitle}
                                    onChange={(e) => setSourceTitle(e.target.value)}
                                    placeholder="원문 제목 (선택)"
                                    className="rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm"
                                />
                                <input
                                    value={sourceAuthor}
                                    onChange={(e) => setSourceAuthor(e.target.value)}
                                    placeholder="작성자/권리자 (선택)"
                                    className="rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm"
                                />
                                <input
                                    value={sourceLicense}
                                    onChange={(e) => setSourceLicense(e.target.value)}
                                    placeholder="라이선스 (선택)"
                                    className="rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm"
                                />
                                <input
                                    value={sourceLicenseUrl}
                                    onChange={(e) => setSourceLicenseUrl(e.target.value)}
                                    placeholder="라이선스 URL (선택)"
                                    className="rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm"
                                />
                                <input
                                    value={sourceChangedNote}
                                    onChange={(e) => setSourceChangedNote(e.target.value)}
                                    placeholder="변경사항 (선택)"
                                    className="rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm"
                                />
                                <input
                                    value={sourceSnapshotType}
                                    onChange={(e) => setSourceSnapshotType(e.target.value)}
                                    placeholder="스냅샷 유형 (선택)"
                                    className="rounded-md border border-slate-200 dark:border-border bg-white dark:bg-card px-3 py-2 text-sm"
                                />
                            </div>
                            <TextareaAutosize
                                autoFocus
                                placeholder="지금 우리 팀에게 응원을 남겨주세요!"
                                className="w-full resize-none border-none bg-transparent text-[16px] sm:text-[19px] lg:text-[20px] leading-relaxed text-[#0f1419] dark:text-white placeholder:text-[#536471] dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 min-h-[150px] sm:min-h-[200px] lg:min-h-[300px]"
                                minRows={8}
                                maxRows={15}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />

                            {previews.length > 0 && (
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    {previews.map((preview, index) => (
                                        <div key={preview.url} className="relative aspect-square overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
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

                            <div className="mt-4 flex items-center justify-between border-t border-[#EFF3F4] dark:border-border pt-3">
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
