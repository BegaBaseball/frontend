import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ShieldAlert } from "lucide-react";

interface VerificationRequiredDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VerificationRequiredDialog({ isOpen, onClose }: VerificationRequiredDialogProps) {
    const navigate = useNavigate();

    const handleGoToSettings = () => {
        onClose();
        navigate('/mypage?tab=account');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <ShieldAlert className="w-6 h-6 text-red-600" />
                    </div>
                    <DialogTitle className="text-center text-xl font-bold">본인인증 필요</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        안전하고 신뢰할 수 있는 메이트 문화를 위해<br />
                        <strong>카카오</strong> 또는 <strong>네이버</strong> 계정 연동이 필요합니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 my-4">
                    <p className="font-medium text-gray-900 mb-1">왜 필요한가요?</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>노쇼 방지 및 사용자 신원 확인</li>
                        <li>허위 파티 생성 방지</li>
                        <li>안전한 티켓 거래 보장</li>
                    </ul>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        나중에 하기
                    </Button>
                    <Button
                        onClick={handleGoToSettings}
                        className="flex-1 text-white"
                        style={{ backgroundColor: '#2d5f4f' }}
                    >
                        계정 연동하러 가기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
