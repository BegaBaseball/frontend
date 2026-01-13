import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ReportReason, ReportReasonLabels, reportPost } from '../api/cheer';
import { toast } from 'sonner';

interface ReportModalProps {
    postId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ReportModal({ postId, isOpen, onClose }: ReportModalProps) {
    const [reason, setReason] = useState<ReportReason>(ReportReason.SPAM);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!postId) return;

        setIsSubmitting(true);
        try {
            await reportPost(postId, reason, description);
            toast.success('신고가 접수되었습니다.');
            onClose();
            // Reset form
            setReason(ReportReason.SPAM);
            setDescription('');
        } catch (error) {
            console.error('Failed to report post:', error);
            toast.error('신고 접수 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>게시글 신고</DialogTitle>
                    <DialogDescription>
                        신고 사유를 선택해주세요. 허위 신고 시 불이익을 받을 수 있습니다.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <RadioGroup value={reason} onValueChange={(val: string) => setReason(val as ReportReason)}>
                        {Object.entries(ReportReasonLabels).map(([key, label]) => (
                            <div key={key} className="flex items-center space-x-2">
                                <RadioGroupItem value={key} id={`r-${key}`} />
                                <Label htmlFor={`r-${key}`}>{label}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                    <div className="grid gap-2">
                        <Label htmlFor="description">추가 설명 (선택)</Label>
                        <Textarea
                            id="description"
                            placeholder="상세 내용을 입력해주세요."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        취소
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? '접수 중...' : '신고하기'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
