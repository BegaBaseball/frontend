import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Ban, Loader2 } from 'lucide-react';
import { toggleBlock, BlockToggleResponse } from '../../api/blockApi';
import { useAuthStore } from '../../store/authStore';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';

interface BlockButtonProps {
    userId: number;
    userName?: string;
    initialBlocked?: boolean;
    onBlockChange?: (response: BlockToggleResponse) => void;
    size?: 'sm' | 'default' | 'lg';
    variant?: 'default' | 'ghost' | 'destructive';
}

export default function BlockButton({
    userId,
    userName = '이 사용자',
    initialBlocked = false,
    onBlockChange,
    size = 'default',
    variant = 'ghost',
}: BlockButtonProps) {
    const { user } = useAuthStore();
    const [isBlocked, setIsBlocked] = useState(initialBlocked);
    const [isLoading, setIsLoading] = useState(false);

    // Don't show block button for own profile
    if (user?.id === userId) {
        return null;
    }

    const handleToggleBlock = useCallback(async () => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const response = await toggleBlock(userId);
            setIsBlocked(response.blocked);
            onBlockChange?.(response);
        } catch (error) {
            console.error('Failed to toggle block:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId, isLoading, onBlockChange]);

    const buttonSize = size === 'sm' ? 'h-8 px-3 text-xs' : size === 'lg' ? 'h-11 px-6' : 'h-9 px-4';

    if (isBlocked) {
        return (
            <Button
                onClick={handleToggleBlock}
                variant="outline"
                disabled={isLoading}
                className={`${buttonSize} border-red-500 text-red-500 hover:bg-red-50`}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <Ban className="h-4 w-4 mr-1" />
                        차단 해제
                    </>
                )}
            </Button>
        );
    }

    // Not blocked - show confirmation dialog
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant={variant}
                    disabled={isLoading}
                    className={`${buttonSize} text-gray-500 hover:text-red-500 hover:bg-red-50`}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <Ban className="h-4 w-4 mr-1" />
                            차단
                        </>
                    )}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>사용자 차단</AlertDialogTitle>
                    <AlertDialogDescription>
                        {userName}를 차단하시겠습니까?
                        <br /><br />
                        차단하면 다음과 같은 효과가 있습니다:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>상대방의 게시글이 피드에서 숨겨집니다</li>
                            <li>양방향 팔로우 관계가 해제됩니다</li>
                            <li>상대방에게 알림이 가지 않습니다</li>
                        </ul>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleToggleBlock}
                        className="bg-red-500 hover:bg-red-600"
                    >
                        차단하기
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
