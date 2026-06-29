import React, { cloneElement, isValidElement, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { analyzeTicket, TicketInfo } from '@/api/ticket';
import {
    SharedCheckCircleIcon,
    SharedLoaderIcon,
    SharedTicketIcon,
    SharedUploadIcon,
} from '@/components/icons/SharedLeafIcons';
import { toast } from 'sonner';
import PlainDialog from '@/components/ui/plain-dialog';

interface TicketUploadModalProps {
    onTicketAnalyzed?: (data: TicketInfo) => void;
    onConfirm?: (data: TicketInfo) => void;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function TicketUploadModal({
    onTicketAnalyzed,
    onConfirm,
    trigger,
    open,
    onOpenChange,
}: TicketUploadModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [ticketData, setTicketData] = useState<TicketInfo | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isControlled = open !== undefined;
    const resolvedOpen = isControlled ? open : internalOpen;
    const defaultTrigger = (
        <Button variant="outline" className="gap-2">
            <SharedTicketIcon className="w-4 h-4" />
            티켓 등록하기
        </Button>
    );
    const triggerContent = trigger === undefined ? defaultTrigger : trigger;

    const handleOpenChange = (newOpen: boolean) => {
        if (!isControlled) {
            setInternalOpen(newOpen);
        }
        onOpenChange?.(newOpen);
    };

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        // Create preview
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setTicketData(null);

        // Upload and analyze
        setIsLoading(true);
        try {
            const data = await analyzeTicket(file);
            setTicketData(data);
            toast.success('티켓 분석이 완료되었습니다!');
            if (onTicketAnalyzed) {
                onTicketAnalyzed(data);
            }
        } catch (error) {
            console.error('Ticket analysis failed:', error);
            toast.error('티켓 분석에 실패했습니다. 이미지를 다시 확인해주세요.');
            setTicketData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFieldChange = (field: keyof TicketInfo, value: string | number | null) => {
        if (!ticketData) return;
        setTicketData({
            ...ticketData,
            [field]: value
        });
    };

    const handleConfirm = () => {
        if (!ticketData) return;
        if (onConfirm) {
            onConfirm(ticketData);
        }
        handleOpenChange(false);
    };

    const resetForm = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setTicketData(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const renderTrigger = () => {
        if (triggerContent === null) {
            return null;
        }

        if (triggerContent && isValidElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>(triggerContent)) {
            const originalOnClick = triggerContent.props.onClick;
            return cloneElement(triggerContent, {
                onClick: (event: MouseEvent<HTMLElement>) => {
                    originalOnClick?.(event);
                    if (!event.defaultPrevented) {
                        handleOpenChange(true);
                    }
                },
            });
        }

        return (
            <span className="contents" onClick={() => handleOpenChange(true)}>
                {triggerContent}
            </span>
        );
    };

    return (
        <>
            {renderTrigger()}
            <PlainDialog
                open={resolvedOpen}
                onClose={() => handleOpenChange(false)}
                title="티켓 이미지 업로드"
                description="티켓 이미지를 올리면 날짜, 좌석, 매치업 정보를 자동으로 추출합니다."
                className="sm:max-w-md max-h-[90vh] overflow-hidden"
                bodyClassName="max-h-[calc(90vh-81px)] overflow-y-auto"
                footer={(
                    <>
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>취소</Button>
                        {ticketData ? (
                            <Button
                                onClick={handleConfirm}
                                className="bg-primary hover:bg-primary/90 text-white font-bold"
                            >
                                기록하러 가기
                            </Button>
                        ) : (
                            <Button
                                disabled={!previewUrl || isLoading}
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-primary hover:bg-primary/90 text-white font-bold"
                            >
                                이미지 분석하기
                            </Button>
                        )}
                    </>
                )}
            >
                <div className="flex flex-col gap-6 py-1">
                    {/* Upload Area */}
                    <div className="grid w-full items-center gap-1.5">
                        {!previewUrl ? (
                            <div
                                className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <SharedUploadIcon className="w-10 h-10 mb-4 opacity-50" />
                                <p className="text-body font-semibold">티켓 이미지를 업로드하세요</p>
                                <p className="text-body text-muted-foreground mt-1">또는 클릭하여 촬영</p>
                            </div>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden border border-border aspect-video bg-black/5">
                                <img src={previewUrl} alt="Ticket Preview" className="w-full h-full object-contain" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 bg-black/20 hover:bg-black/40 text-white rounded-full"
                                    onClick={resetForm}
                                >
                                    ✕
                                </Button>
                            </div>
                        )}
                        <Input
                            ref={fileInputRef}
                            id="ticket-image"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Analysis Result */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-8 flex-col gap-3 text-muted-foreground">
                            <SharedLoaderIcon className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-body font-semibold animate-pulse">AI가 티켓 정보를 분석 중입니다...</p>
                        </div>
                    )}

                    {!isLoading && ticketData && (
                        <div className="bg-muted/30 rounded-lg p-4 space-y-4 border border-border">
                            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                <div className="flex items-center gap-2 text-green-600 font-bold">
                                    <SharedCheckCircleIcon className="w-4 h-4" />
                                    분석 완료
                                </div>
                                {ticketData.gameId && (
                                        <span className="text-body bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                        경기 일정 매칭됨
                                    </span>
                                )}
                            </div>

                            <div className="grid gap-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <label htmlFor="date" className="text-right text-body">날짜</label>
                                    <Input
                                        id="date"
                                        value={ticketData.date || ''}
                                        onChange={(e) => handleFieldChange('date', e.target.value)}
                                        className="col-span-3 h-8 text-body"
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <label htmlFor="stadium" className="text-right text-body">구장</label>
                                    <Input
                                        id="stadium"
                                        value={ticketData.stadium || ''}
                                        onChange={(e) => handleFieldChange('stadium', e.target.value)}
                                        className="col-span-3 h-8 text-body"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <label htmlFor="matchup" className="text-right text-body">매치업</label>
                                    <div className="col-span-3 flex items-center gap-2">
                                        <Input
                                            value={ticketData.awayTeam || ''}
                                            onChange={(e) => handleFieldChange('awayTeam', e.target.value)}
                                            className="h-8 text-body"
                                            placeholder="원정"
                                        />
                                        <span className="text-body">vs</span>
                                        <Input
                                            value={ticketData.homeTeam || ''}
                                            onChange={(e) => handleFieldChange('homeTeam', e.target.value)}
                                            className="h-8 text-body"
                                            placeholder="홈"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <label htmlFor="seat" className="text-right text-body">좌석</label>
                                    <div className="col-span-3 grid grid-cols-3 gap-2">
                                        <Input
                                            value={ticketData.section || ''}
                                            onChange={(e) => handleFieldChange('section', e.target.value)}
                                            className="h-8 text-body px-2"
                                            placeholder="구역"
                                        />
                                        <Input
                                            value={ticketData.row || ''}
                                            onChange={(e) => handleFieldChange('row', e.target.value)}
                                            className="h-8 text-body px-2"
                                            placeholder="열"
                                        />
                                        <Input
                                            value={ticketData.seat || ''}
                                            onChange={(e) => handleFieldChange('seat', e.target.value)}
                                            className="h-8 text-body px-2"
                                            placeholder="번호"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </PlainDialog>
        </>
    );
}
