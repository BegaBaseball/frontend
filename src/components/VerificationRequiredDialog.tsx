import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Lock, Shield, ShieldCheck } from 'lucide-react';
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
    const titleId = useId();
    const descriptionId = useId();

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

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4" onClick={onClose}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={descriptionId}
                    onClick={(event) => event.stopPropagation()}
                    className={`w-full max-w-[calc(100vw-2rem)] rounded-xl border p-6 shadow-[0_28px_80px_-30px_rgba(15,23,42,0.40)] ring-1 ring-black/5 sm:max-w-md ${isSecurityMode
                        ? 'border-slate-700 bg-slate-950/95 text-white'
                        : 'bg-background'
                        }`}
                >
                    <div className="text-center">
                        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${isSecurityMode ? 'bg-amber-400/20' : 'bg-red-100'}`}>
                            {isSecurityMode ? (
                                <div className="relative">
                                    <ShieldCheck className="h-7 w-7 text-amber-200" />
                                    <Lock className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-full bg-amber-500/90 p-0.5 text-amber-100" />
                                </div>
                            ) : (
                                <Shield className="h-6 w-6 text-red-600" />
                            )}
                        </div>
                        <h2 id={titleId} className={`text-xl font-bold ${isSecurityMode ? 'text-white' : 'text-foreground'}`}>
                            {dialogTitle}
                        </h2>
                        <div id={descriptionId} className={`pt-2 text-[16px] ${isSecurityMode ? 'text-slate-200' : 'text-muted-foreground'}`}>
                            {dialogDescription}
                        </div>
                    </div>
                    <div className={`my-4 rounded-lg p-4 text-[16px] ${isSecurityMode ? 'border border-slate-700 bg-slate-900/60 text-slate-100' : 'bg-gray-50 text-gray-600'}`}>
                        <p className={`mb-1 font-semibold ${isSecurityMode ? 'text-white' : 'text-gray-900'}`}>
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
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className={`flex-1 ${isSecurityMode ? 'border-slate-500 text-slate-200 hover:text-white' : ''}`}
                        >
                            나중에 하기
                        </Button>
                        <Button
                            onClick={handleAction}
                            className={`flex-1 ${isSecurityMode ? 'bg-amber-500 text-black hover:bg-amber-500/90' : 'bg-primary text-white'}`}
                        >
                            {actionLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
