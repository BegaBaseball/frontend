import { useCallback, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { toggleBlockByHandle, BlockToggleResponse } from '../../api/blockApi';
import { useAuthProfileSnapshot } from '../../store/authStore';
import { Button } from '../ui/button';
import { ProfileBanIcon, ProfileLoaderIcon } from './ProfileIcons';

interface BlockButtonProps {
    handle: string;
    userName?: string;
    initialBlocked?: boolean;
    onBlockChange?: (response: BlockToggleResponse) => void;
    size?: 'sm' | 'default' | 'lg';
    variant?: 'default' | 'ghost' | 'destructive';
}

export default function BlockButton({
    handle,
    userName = '이 사용자',
    initialBlocked = false,
    onBlockChange,
    size = 'default',
    variant = 'ghost',
}: BlockButtonProps) {
    const { userHandle: currentUserHandle } = useAuthProfileSnapshot();
    const [isBlocked, setIsBlocked] = useState(initialBlocked);
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        if (!isConfirmOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsConfirmOpen(false);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isConfirmOpen]);

    if (handle && currentUserHandle === handle) {
        return null;
    }

    const handleToggleBlock = useCallback(async () => {
        if (isLoading) {
            return;
        }

        setIsLoading(true);
        try {
            const response = await toggleBlockByHandle(handle);
            setIsBlocked(response.blocked);
            onBlockChange?.(response);
            setIsConfirmOpen(false);
        } catch (error) {
            console.error('Failed to toggle block:', error);
            toast.error('차단 처리에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [handle, isLoading, onBlockChange]);

    const buttonSize = size === 'sm' ? 'h-8 px-3 text-body' : size === 'lg' ? 'h-11 px-6' : 'h-9 px-4';

    if (isBlocked) {
        return (
            <Button
                onClick={handleToggleBlock}
                variant="outline"
                disabled={isLoading}
                className={`${buttonSize} border-red-500 text-red-500 hover:bg-red-50`}
            >
                {isLoading ? (
                    <ProfileLoaderIcon className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <ProfileBanIcon className="mr-1 h-4 w-4" />
                        차단 해제
                    </>
                )}
            </Button>
        );
    }

    return (
        <>
            <Button
                variant={variant}
                disabled={isLoading}
                onClick={() => setIsConfirmOpen(true)}
                className={`${buttonSize} text-gray-500 hover:bg-red-50 hover:text-red-500`}
            >
                {isLoading ? (
                    <ProfileLoaderIcon className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <ProfileBanIcon className="mr-1 h-4 w-4" />
                        차단
                    </>
                )}
            </Button>

            {isConfirmOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[90]">
                    <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={() => setIsConfirmOpen(false)} />
                    <div className="absolute inset-0 flex items-center justify-center p-4" onClick={() => setIsConfirmOpen(false)}>
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            aria-describedby={descriptionId}
                            onClick={(event) => event.stopPropagation()}
                            className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-dialog ring-1 ring-black/5 dark:border-border dark:bg-card"
                        >
                            <div className="space-y-2">
                                <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
                                    사용자 차단
                                </h2>
                                <div id={descriptionId} className="text-body text-gray-600 dark:text-white">
                                    <p>{userName}를 차단하시겠습니까?</p>
                                    <ul className="mt-3 list-inside list-disc space-y-1">
                                        <li>상대방의 게시글이 피드에서 숨겨집니다</li>
                                        <li>양방향 팔로우 관계가 해제됩니다</li>
                                        <li>상대방에게 알림이 가지 않습니다</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={isLoading}>
                                    취소
                                </Button>
                                <Button
                                    onClick={handleToggleBlock}
                                    disabled={isLoading}
                                    className="bg-red-500 text-white hover:bg-red-600"
                                >
                                    {isLoading ? '처리 중...' : '차단하기'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
