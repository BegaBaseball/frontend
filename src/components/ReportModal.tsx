import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ReportReason, ReportReasonLabels, reportPost } from '../api/cheerApi';
import { toast } from 'sonner';
import PlainDialog from './ui/plain-dialog';

interface ReportModalProps {
    postId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ReportModal({ postId, isOpen, onClose }: ReportModalProps) {
    const [reason, setReason] = useState<ReportReason>(ReportReason.SPAM);
    const [description, setDescription] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [ownerContact, setOwnerContact] = useState('');
    const [license, setLicense] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [requestedAction, setRequestedAction] = useState('');
    const [hasRightEvidence, setHasRightEvidence] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!postId) return;

        setIsSubmitting(true);
        try {
            const result = await reportPost(postId, {
                reason,
                description,
                sourceUrl: sourceUrl || undefined,
                ownerContact: ownerContact || undefined,
                license: license || undefined,
                evidenceUrl: evidenceUrl || undefined,
                requestedAction: requestedAction || undefined,
                requestedReason: description || undefined,
                hasRightEvidence,
            });
            toast.success(`신고가 접수되었습니다. 케이스 ID: ${result.caseId}`);
            onClose();
            // Reset form
            setReason(ReportReason.SPAM);
            setDescription('');
            setSourceUrl('');
            setOwnerContact('');
            setLicense('');
            setEvidenceUrl('');
            setRequestedAction('');
            setHasRightEvidence(false);
        } catch (error) {
            console.error('Failed to report post:', error);
            toast.error('신고 접수 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PlainDialog
            open={isOpen}
            onClose={onClose}
            title="게시글 신고"
            className="max-w-[425px]"
            footer={(
                <>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        취소
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? '접수 중...' : '신고하기'}
                    </Button>
                </>
            )}
        >
            <p className="text-[15px] text-gray-600 dark:text-gray-300">
                신고 사유를 선택해주세요. 허위 신고 시 불이익을 받을 수 있습니다.
            </p>
            <div className="grid gap-4 py-4">
                <fieldset>
                    <legend className="mb-2 text-[15px] font-semibold text-gray-700 dark:text-gray-300">신고 사유 선택</legend>
                    <div className="grid gap-3" aria-label="신고 사유">
                        {Object.entries(ReportReasonLabels).map(([key, label]) => (
                            <label key={key} htmlFor={`r-${key}`} className="flex items-center space-x-2 text-[15px] text-gray-700 dark:text-gray-300">
                                <input
                                    id={`r-${key}`}
                                    type="radio"
                                    name="report-reason"
                                    value={key}
                                    checked={reason === key}
                                    onChange={() => setReason(key as ReportReason)}
                                    className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="grid gap-2">
                    <label htmlFor="description" className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">추가 설명 (선택)</label>
                    <Textarea
                        id="description"
                        placeholder="상세 내용을 입력해주세요."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="sourceUrl" className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">원문 URL (선택)</label>
                    <Textarea
                        id="sourceUrl"
                        placeholder="https://example.com/original"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="ownerContact" className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">권리자/대리인 연락처 (선택)</label>
                    <Textarea
                        id="ownerContact"
                        placeholder="이메일 또는 연락 가능한 정보"
                        value={ownerContact}
                        onChange={(e) => setOwnerContact(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="license" className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">라이선스 정보 (선택)</label>
                    <Textarea
                        id="license"
                        placeholder="예: CC BY 4.0"
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="evidenceUrl" className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">증빙 링크 (선택)</label>
                    <Textarea
                        id="evidenceUrl"
                        placeholder="증빙 자료 링크"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <label htmlFor="requestedAction" className="text-[15px] font-semibold text-gray-700 dark:text-gray-300">요청 조치 (선택)</label>
                    <Textarea
                        id="requestedAction"
                        placeholder="예: TAKE_DOWN"
                        value={requestedAction}
                        onChange={(e) => setRequestedAction(e.target.value)}
                    />
                </div>
                <label className="flex items-center gap-2 text-[15px] text-gray-700 dark:text-gray-300">
                    <input
                        type="checkbox"
                        checked={hasRightEvidence}
                        onChange={(e) => setHasRightEvidence(e.target.checked)}
                    />
                    권리자 또는 대리인 증빙을 보유하고 있습니다.
                </label>
            </div>
        </PlainDialog>
    );
}
