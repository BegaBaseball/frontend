import React, { useState } from 'react';
import { X, Check, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface SeatDetailCardProps {
    section: string;
    sectionColor: string;
    onConfirm: (detail: string) => void;
    onCancel: () => void;
}

// 블록 옵션 (구역에 따라 다름)
const BLOCK_OPTIONS: Record<string, string[]> = {
    '블루석': ['A구역', 'B구역', 'C구역', 'D구역'],
    '오렌지석': ['A구역', 'B구역', 'C구역'],
    '레드석': ['A구역', 'B구역', 'C구역', 'D구역'],
    '네이비석': ['A구역', 'B구역'],
    '그린석': ['A구역', 'B구역'],
    '익사이팅존': ['1구역', '2구역', '3구역'],
    '프리미엄': ['VIP', 'VVIP'],
    // 사직
    '1루 내야': ['A블록', 'B블록', 'C블록'],
    '3루 내야': ['A블록', 'B블록', 'C블록'],
    '중앙 내야': ['A블록', 'B블록'],
    // 기본
    '1루': ['A', 'B', 'C'],
    '3루': ['A', 'B', 'C'],
    '중앙': ['A', 'B'],
    '외야': ['좌측', '중앙', '우측'],
};

export default function SeatDetailCard({ section, sectionColor, onConfirm, onCancel }: SeatDetailCardProps) {
    const [selectedBlock, setSelectedBlock] = useState('');
    const [row, setRow] = useState('');
    const [seatStart, setSeatStart] = useState('');
    const [seatEnd, setSeatEnd] = useState('');

    const blocks = BLOCK_OPTIONS[section] || ['A', 'B', 'C'];

    const handleConfirm = () => {
        let detail = section;
        if (selectedBlock) detail += ` ${selectedBlock}`;
        if (row) detail += ` ${row}열`;
        if (seatStart) {
            detail += ` ${seatStart}번`;
            if (seatEnd && seatEnd !== seatStart) {
                detail += `~${seatEnd}번`;
            }
        }
        onConfirm(detail);
    };

    const isValid = section && (selectedBlock || row || seatStart);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div
                    className="p-4 text-white flex items-center justify-between"
                    style={{ background: `linear-gradient(135deg, ${sectionColor}, ${sectionColor}dd)` }}
                >
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        <h3 className="font-bold text-lg">{section}</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* Block Selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">구역 선택</Label>
                        <div className="flex flex-wrap gap-2">
                            {blocks.map((block) => (
                                <button
                                    key={block}
                                    onClick={() => setSelectedBlock(block)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedBlock === block
                                            ? 'text-white shadow-lg scale-105'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    style={selectedBlock === block ? { backgroundColor: sectionColor } : {}}
                                >
                                    {block}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Row Input */}
                    <div className="space-y-2">
                        <Label htmlFor="row" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            열 (Row)
                        </Label>
                        <Input
                            id="row"
                            type="number"
                            min="1"
                            max="50"
                            value={row}
                            onChange={(e) => setRow(e.target.value)}
                            placeholder="예: 5"
                            className="text-center text-lg font-semibold"
                        />
                    </div>

                    {/* Seat Range */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">좌석 번호</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                type="number"
                                min="1"
                                max="100"
                                value={seatStart}
                                onChange={(e) => setSeatStart(e.target.value)}
                                placeholder="시작"
                                className="text-center font-semibold"
                            />
                            <span className="text-gray-400 font-medium">~</span>
                            <Input
                                type="number"
                                min="1"
                                max="100"
                                value={seatEnd}
                                onChange={(e) => setSeatEnd(e.target.value)}
                                placeholder="끝 (선택)"
                                className="text-center font-semibold"
                            />
                        </div>
                        <p className="text-xs text-gray-500">연석일 경우 범위를 입력하세요</p>
                    </div>

                    {/* Preview */}
                    {isValid && (
                        <div
                            className="p-3 rounded-xl text-white text-center font-medium"
                            style={{ background: `linear-gradient(135deg, ${sectionColor}, ${sectionColor}cc)` }}
                        >
                            {section}
                            {selectedBlock && ` ${selectedBlock}`}
                            {row && ` ${row}열`}
                            {seatStart && ` ${seatStart}번`}
                            {seatEnd && seatEnd !== seatStart && `~${seatEnd}번`}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isValid}
                        className="flex-1 text-white"
                        style={{ backgroundColor: sectionColor }}
                    >
                        <Check className="w-4 h-4 mr-2" />
                        선택 완료
                    </Button>
                </div>
            </div>
        </div>
    );
}
