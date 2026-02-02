import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Eye, EyeOff, Settings, Trash2, Link as LinkIcon, Unlink } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../ui/alert-dialog';
import { deleteAccount, getConnectedProviders, unlinkProvider } from '../../api/profile';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSocialLoginUrl, getLinkToken } from '../../api/auth';

interface AccountSettingsSectionProps {
    userProvider?: string;
    onCancel: () => void;
}

export default function AccountSettingsSection({ userProvider, onCancel }: AccountSettingsSectionProps) {
    const navigate = useNavigate();
    const { logout, user } = useAuthStore();
    const queryClient = useQueryClient();

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const isLocalUser = !userProvider || userProvider === 'LOCAL';

    // 연동된 계정 목록 조회
    const { data: connectedProviders = [] } = useQuery({
        queryKey: ['connectedProviders'],
        queryFn: getConnectedProviders
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteAccount(isLocalUser ? password : undefined),
        onSuccess: () => {
            toast.success('계정이 성공적으로 삭제되었습니다.');
            logout();
            navigate('/');
        },
        onError: (error: Error) => {
            setError(error.message);
        },
    });

    const unlinkMutation = useMutation({
        mutationFn: (provider: string) => unlinkProvider(provider),
        onSuccess: () => {
            toast.success('계정 연동이 해제되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['connectedProviders'] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const handleDeleteConfirm = () => {
        setError('');

        if (isLocalUser && !password) {
            setError('비밀번호를 입력해주세요.');
            return;
        }

        deleteMutation.mutate();
    };

    const [isLinking, setIsLinking] = useState(false);

    const handleLinkAccount = async (provider: string) => {
        // 소셜 연동 시작
        setIsLinking(true);
        try {
            // 1. 먼저 Link Token을 발급받음 (인증된 요청)
            const { linkToken } = await getLinkToken();

            // 2. Link Token을 포함하여 OAuth URL로 리다이렉트
            const targetUrl = getSocialLoginUrl(
                provider.toLowerCase() as 'kakao' | 'google' | 'naver',
                { mode: 'link', linkToken }
            );

            window.location.href = targetUrl;
        } catch (error: any) {
            toast.error(error.message || '연동 토큰 발급에 실패했습니다. 다시 로그인해주세요.');
            setIsLinking(false);
        }
    };

    const handleUnlinkAccount = (provider: string) => {
        if (confirm(`${provider} 연동을 해제하시겠습니까?`)) {
            unlinkMutation.mutate(provider);
        }
    };

    const isConnected = (provider: string) => {
        return connectedProviders.some(p => p.provider === provider);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-gray-100 dark:border-gray-700 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-[#2d5f4f] dark:text-emerald-400" />
                <h2 className="text-xl font-bold text-[#2d5f4f] dark:text-emerald-400">계정 설정</h2>
            </div>

            {/* 계정 연동 상태 */}
            <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">로그인 연동 관리</h3>
                <div className="space-y-3">
                    {/* Google */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center p-1.5">
                                <svg className="w-full h-full" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </div>
                            <span className="font-medium">Google</span>
                        </div>
                        {isConnected('google') ? (
                            <Button variant="outline" size="sm" onClick={() => handleUnlinkAccount('google')} disabled={unlinkMutation.isPending}>
                                <Unlink className="w-4 h-4 mr-2" />
                                해제
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => handleLinkAccount('google')} disabled={isLinking}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                {isLinking ? '연동 중...' : '연동'}
                            </Button>
                        )}
                    </div>

                    {/* Kakao */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center p-1.5">
                                <svg className="w-full h-full" viewBox="0 0 24 24" fill="#3C1E1E">
                                    <path d="M12 3C6.48 3 2 6.48 2 11c0 2.76 1.81 5.18 4.5 6.55-.15.57-.55 2.06-.63 2.38-.1.4.14.39.3.28.12-.08 1.92-1.3 2.72-1.84.67.1 1.38.15 2.11.15 5.52 0 10-3.48 10-8s-4.48-8-10-8z" />
                                </svg>
                            </div>
                            <span className="font-medium">Kakao</span>
                        </div>
                        {isConnected('kakao') ? (
                            <Button variant="outline" size="sm" onClick={() => handleUnlinkAccount('kakao')} disabled={unlinkMutation.isPending}>
                                <Unlink className="w-4 h-4 mr-2" />
                                해제
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => handleLinkAccount('kakao')} disabled={isLinking}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                {isLinking ? '연동 중...' : '연동'}
                            </Button>
                        )}
                    </div>

                    {/* Naver */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#03C75A] flex items-center justify-center p-1.5">
                                <span className="text-white font-bold text-xs italic">N</span>
                            </div>
                            <span className="font-medium">Naver</span>
                        </div>
                        {isConnected('naver') ? (
                            <Button variant="outline" size="sm" onClick={() => handleUnlinkAccount('naver')} disabled={unlinkMutation.isPending}>
                                <Unlink className="w-4 h-4 mr-2" />
                                해제
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => handleLinkAccount('naver')} disabled={isLinking}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                {isLinking ? '연동 중...' : '연동'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* 위험 구역 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    위험 구역
                </h3>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="font-medium text-red-800 dark:text-red-300">계정 삭제</p>
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteDialog(true)}
                            className="flex-shrink-0"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            계정 삭제
                        </Button>
                    </div>
                </div>
            </div>

            {/* 뒤로가기 버튼 */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button variant="outline" className="w-full" onClick={onCancel}>
                    돌아가기
                </Button>
            </div>

            {/* 삭제 확인 다이얼로그 */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                            정말 계정을 삭제하시겠습니까?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                            <p>
                                이 작업은 되돌릴 수 없습니다. 계정을 삭제하면 다음 데이터가 모두 삭제됩니다:
                            </p>
                            <ul className="list-disc list-inside text-sm space-y-1">
                                <li>프로필 정보</li>
                                <li>작성한 게시글 및 댓글</li>
                                <li>직관 일기</li>
                                <li>메이트 신청 내역</li>
                            </ul>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {error && (
                        <Alert variant="destructive" className="my-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>오류</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* LOCAL 사용자는 비밀번호 입력 필요 */}
                    {isLocalUser && (
                        <div className="my-4 space-y-2">
                            <Label htmlFor="deletePassword">비밀번호 확인</Label>
                            <div className="relative">
                                <Input
                                    id="deletePassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="비밀번호를 입력하세요"
                                    className="pr-10"
                                    disabled={deleteMutation.isPending}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            취소
                        </AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={deleteMutation.isPending || (isLocalUser && !password)}
                        >
                            {deleteMutation.isPending ? '삭제 중...' : '계정 삭제'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
