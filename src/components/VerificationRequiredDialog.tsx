import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Lock, Shield, ShieldCheck } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

interface VerificationRequiredDialogProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'normal' | 'security';
    title?: string;
    description?: ReactNode;
    confirmLabel?: string;
    onConfirm?: () => void;
}

const ACCOUNT_SETTINGS_PATH = '/mypage?view=accountSettings';
const SECURITY_DEFAULT_TITLE = '본인인증 필요';
const NORMAL_DEFAULT_DESCRIPTION = (
    <>
        안전하고 신뢰할 수 있는 메이트 문화를 위해<br />
        <strong>카카오</strong> 또는 <strong>네이버</strong> 계정 연동이 필요합니다.
    </>
);
const SECURITY_DEFAULT_INSTRUCTION = (
    <>
        지금은 민감한 계정 작업 구간입니다.
        <br />
        본인 확인을 완료한 뒤 진행해 주세요.
    </>
);

export default function VerificationRequiredDialog({
    isOpen,
    onClose,
    mode = 'normal',
    title,
    description,
    confirmLabel,
    onConfirm,
}: VerificationRequiredDialogProps) {
    const navigate = useNavigate();

    const isSecurityMode = mode === 'security';
    const dialogTitle = title || (isSecurityMode ? SECURITY_DEFAULT_TITLE : '본인인증 필요');
    const dialogDescription =
        description
            || (isSecurityMode ? SECURITY_DEFAULT_INSTRUCTION : NORMAL_DEFAULT_DESCRIPTION);
    const actionLabel = confirmLabel || (isSecurityMode ? '안전하게 진행' : '계정 연동하러 가기');

    const handleAction = () => {
        onClose();
        if (onConfirm) {
            onConfirm();
            return;
        }

        navigate(ACCOUNT_SETTINGS_PATH);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={`sm:max-w-md ${isSecurityMode
                    ? 'bg-slate-950/95 border-slate-700 text-white'
                    : 'bg-background'
                    }`}
            >
                <DialogHeader>
                    <div className={`mx-auto w-14 h-14 rounded-full mb-4 flex items-center justify-center ${isSecurityMode ? 'bg-amber-400/20' : 'bg-red-100'}`}>
                        {isSecurityMode ? (
                            <div className="relative">
                                <ShieldCheck className="w-7 h-7 text-amber-200" />
                                <Lock className="w-3.5 h-3.5 text-amber-100 absolute -right-1.5 -bottom-1.5 bg-amber-500/90 rounded-full p-0.5" />
                            </div>
                        ) : (
                            <Shield className="w-6 h-6 text-red-600" />
                        )}
                    </div>
                    <DialogTitle className={`text-center text-xl font-bold ${isSecurityMode ? 'text-white' : 'text-foreground'}`}>
                        {dialogTitle}
                    </DialogTitle>
                    <DialogDescription className={`text-center pt-2 ${isSecurityMode ? 'text-slate-200' : 'text-muted-foreground'}`}>
                        {dialogDescription}
                    </DialogDescription>
                </DialogHeader>
                <div className={`p-4 rounded-lg text-sm my-4 ${isSecurityMode ? 'bg-slate-900/60 text-slate-100 border border-slate-700' : 'bg-gray-50 text-gray-600'}`}>
                    <p className={`font-medium mb-1 ${isSecurityMode ? 'text-white' : 'text-gray-900'}`}>
                        {isSecurityMode ? '보안 조치 안내' : '왜 필요한가요?'}
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                        {isSecurityMode ? (
                            <>
                                <li>등록된 인증 수단을 통해 비정상 접근을 방지합니다.</li>
                                <li>민감한 계정 변경 동작은 추가 확인 후에만 적용됩니다.</li>
                            </>
                        ) : (
                            <>
                                <li>노쇼 방지 및 사용자 신원 확인</li>
                                <li>허위 파티 생성 방지</li>
                                <li>안전한 티켓 거래 보장</li>
                            </>
                        )}
                    </ul>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button
                        variant={isSecurityMode ? 'outline' : 'outline'}
                        onClick={onClose}
                        className={`flex-1 ${isSecurityMode ? 'border-slate-500 text-slate-200 hover:text-white' : ''}`}
                    >
                        나중에 하기
                    </Button>
                    <Button
                        onClick={handleAction}
                        className={`flex-1 ${isSecurityMode ? 'bg-amber-500 hover:bg-amber-500/90 text-black' : 'bg-primary text-white'}`}
                    >
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
