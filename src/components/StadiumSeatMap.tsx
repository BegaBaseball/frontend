import React, { useState } from 'react';
import SeatDetailCard from './SeatDetailCard';

interface StadiumSeatMapProps {
    stadium: string;
    selectedSection?: string;
    onSectionSelect: (section: string) => void;
}

interface Section {
    id: string;
    path: string;
    color: string;
    gradientId: string;
}

// 잠실야구장 좌석 배치도 (실제 구장 형태 반영)
const JAMSIL_SECTIONS: Section[] = [
    // 내야 1루 (블루석) - 호 형태
    { id: '블루석', path: 'M160,220 Q120,200 100,160 L140,140 Q150,175 180,195 Z', color: '#3B82F6', gradientId: 'blueGrad' },
    // 내야 중앙 (오렌지석)
    { id: '오렌지석', path: 'M180,195 Q210,180 240,175 Q270,180 300,195 L280,220 Q240,205 200,220 Z', color: '#F97316', gradientId: 'orangeGrad' },
    // 내야 3루 (레드석) - 호 형태
    { id: '레드석', path: 'M300,195 Q330,175 340,140 L380,160 Q360,200 320,220 Z', color: '#EF4444', gradientId: 'redGrad' },
    // 네이비석 (1루 측 확장)
    { id: '네이비석', path: 'M80,180 Q60,140 70,100 L110,90 Q100,130 100,160 Z', color: '#1E3A5F', gradientId: 'navyGrad' },
    // 그린석 (3루 측 확장)
    { id: '그린석', path: 'M380,160 Q380,130 370,90 L410,100 Q420,140 400,180 Z', color: '#22C55E', gradientId: 'greenGrad' },
    // 1루 외야
    { id: '1루 외야', path: 'M50,120 Q30,80 50,50 L100,40 Q80,70 70,100 Z', color: '#8B5CF6', gradientId: 'purpleGrad' },
    // 3루 외야
    { id: '3루 외야', path: 'M380,40 L430,50 Q450,80 430,120 L410,100 Q400,70 380,40 Z', color: '#8B5CF6', gradientId: 'purpleGrad2' },
    // 중앙 외야 - 반원형
    { id: '중앙 외야', path: 'M100,40 Q160,15 240,10 Q320,15 380,40 L340,70 Q280,50 240,48 Q200,50 140,70 Z', color: '#6366F1', gradientId: 'indigoGrad' },
    // 익사이팅존
    { id: '익사이팅존', path: 'M190,235 Q220,230 240,230 Q260,230 290,235 L285,255 Q255,248 225,255 Z', color: '#EC4899', gradientId: 'pinkGrad' },
];

// 사직야구장
const SAJIK_SECTIONS: Section[] = [
    { id: '1루 내야', path: 'M120,200 Q100,170 110,140 L160,130 Q145,160 155,195 Z', color: '#3B82F6', gradientId: 'blueGrad' },
    { id: '중앙 내야', path: 'M155,195 Q190,180 240,175 Q290,180 325,195 L310,210 Q250,195 170,210 Z', color: '#F97316', gradientId: 'orangeGrad' },
    { id: '3루 내야', path: 'M325,195 Q335,160 320,130 L370,140 Q380,170 360,200 Z', color: '#EF4444', gradientId: 'redGrad' },
    { id: '1루 외야', path: 'M80,160 Q60,120 80,80 L130,70 Q105,110 110,140 Z', color: '#22C55E', gradientId: 'greenGrad' },
    { id: '3루 외야', path: 'M350,70 L400,80 Q420,120 400,160 L370,140 Q375,110 350,70 Z', color: '#22C55E', gradientId: 'greenGrad2' },
    { id: '중앙 외야', path: 'M130,70 Q180,40 240,35 Q300,40 350,70 L320,100 Q260,75 160,100 Z', color: '#8B5CF6', gradientId: 'purpleGrad' },
];

// 기본 구장 레이아웃
const DEFAULT_SECTIONS: Section[] = [
    { id: '1루', path: 'M120,200 Q100,160 120,120 L180,110 Q155,150 165,195 Z', color: '#3B82F6', gradientId: 'blueGrad' },
    { id: '중앙', path: 'M165,195 Q200,175 240,170 Q280,175 315,195 L295,215 Q240,195 185,215 Z', color: '#F97316', gradientId: 'orangeGrad' },
    { id: '3루', path: 'M315,195 Q325,150 300,110 L360,120 Q380,160 360,200 Z', color: '#EF4444', gradientId: 'redGrad' },
    { id: '외야', path: 'M100,100 Q160,50 240,45 Q320,50 380,100 L340,130 Q280,90 200,90 Q140,90 140,130 Z', color: '#22C55E', gradientId: 'greenGrad' },
];

const getStadiumSections = (stadium: string): Section[] => {
    if (stadium.includes('잠실')) return JAMSIL_SECTIONS;
    if (stadium.includes('사직')) return SAJIK_SECTIONS;
    return DEFAULT_SECTIONS;
};

export default function StadiumSeatMap({ stadium, selectedSection, onSectionSelect }: StadiumSeatMapProps) {
    const [hoveredSection, setHoveredSection] = useState<string | null>(null);
    const [showDetailCard, setShowDetailCard] = useState(false);
    const [selectedSectionData, setSelectedSectionData] = useState<Section | null>(null);

    const sections = getStadiumSections(stadium);

    if (!stadium) {
        return (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center">
                <div className="text-gray-400 text-4xl mb-3">🏟️</div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">구장을 먼저 선택해주세요</p>
            </div>
        );
    }

    const handleSectionClick = (section: Section) => {
        setSelectedSectionData(section);
        setShowDetailCard(true);
    };

    const handleDetailConfirm = (detail: string) => {
        onSectionSelect(detail);
        setShowDetailCard(false);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="text-center">
                <h4 className="font-bold text-lg text-[#2d5f4f] dark:text-[#4ade80]">{stadium}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">좌석 영역을 터치하세요</p>
            </div>

            {/* Stadium Map */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-green-200 via-green-100 to-green-50 dark:from-green-900/40 dark:via-green-800/20 dark:to-gray-900" />

                <svg viewBox="0 0 480 280" className="relative w-full h-auto">
                    {/* Gradient definitions */}
                    <defs>
                        {sections.map((section) => (
                            <linearGradient key={section.gradientId} id={section.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={section.color} />
                                <stop offset="100%" stopColor={`${section.color}bb`} />
                            </linearGradient>
                        ))}
                        {/* Glow filter for selected */}
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {/* Shadow filter */}
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                        </filter>
                    </defs>

                    {/* Ground (야구장 다이아몬드) */}
                    <g>
                        {/* 잔디 */}
                        <ellipse cx="240" cy="150" rx="70" ry="50" fill="url(#groundGrad)" stroke="#16a34a" strokeWidth="2" />
                        <defs>
                            <radialGradient id="groundGrad">
                                <stop offset="0%" stopColor="#4ade80" />
                                <stop offset="100%" stopColor="#22c55e" />
                            </radialGradient>
                        </defs>
                        {/* 다이아몬드 */}
                        <polygon points="240,120 270,150 240,180 210,150" fill="#f5d38c" stroke="#d4a757" strokeWidth="1.5" />
                        <text x="240" y="155" textAnchor="middle" fontSize="10" fill="#78350f" fontWeight="600">그라운드</text>
                    </g>

                    {/* Seat sections */}
                    {sections.map((section) => {
                        const isSelected = selectedSection?.includes(section.id);
                        const isHovered = hoveredSection === section.id;

                        return (
                            <g
                                key={section.id}
                                onClick={() => handleSectionClick(section)}
                                onMouseEnter={() => setHoveredSection(section.id)}
                                onMouseLeave={() => setHoveredSection(null)}
                                className="cursor-pointer"
                                style={{
                                    filter: isSelected ? 'url(#glow)' : isHovered ? 'url(#shadow)' : 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <path
                                    d={section.path}
                                    fill={`url(#${section.gradientId})`}
                                    stroke={isSelected ? '#2d5f4f' : isHovered ? '#ffffff' : section.color}
                                    strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
                                    opacity={isHovered || isSelected ? 1 : 0.85}
                                    style={{
                                        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                        transformOrigin: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                />
                                {/* Section label */}
                                <text
                                    x={getPathCenter(section.path).x}
                                    y={getPathCenter(section.path).y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="9"
                                    fontWeight="600"
                                    fill="white"
                                    style={{
                                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    {section.id}
                                </text>
                            </g>
                        );
                    })}
                </svg>

                {/* Hovered section tooltip */}
                {hoveredSection && !showDetailCard && (
                    <div
                        className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-xl backdrop-blur-sm"
                        style={{
                            background: `linear-gradient(135deg, ${sections.find(s => s.id === hoveredSection)?.color}, ${sections.find(s => s.id === hoveredSection)?.color}dd)`
                        }}
                    >
                        {hoveredSection} 클릭하여 선택
                    </div>
                )}
            </div>

            {/* Selected section display */}
            {selectedSection && (
                <div
                    className="p-4 rounded-xl text-white text-center font-medium shadow-lg"
                    style={{
                        background: `linear-gradient(135deg, ${selectedSectionData?.color || '#2d5f4f'}, ${selectedSectionData?.color || '#2d5f4f'}cc)`
                    }}
                >
                    <div className="text-xs opacity-80 mb-1">선택된 좌석</div>
                    <div className="text-lg">{selectedSection}</div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-2 justify-center">
                {sections.slice(0, 6).map((section) => (
                    <button
                        key={section.id}
                        onClick={() => handleSectionClick(section)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <div
                            className="w-3 h-3 rounded-full shadow-inner"
                            style={{ background: `linear-gradient(135deg, ${section.color}, ${section.color}bb)` }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">{section.id}</span>
                    </button>
                ))}
            </div>

            {/* Seat Detail Card Modal */}
            {showDetailCard && selectedSectionData && (
                <SeatDetailCard
                    section={selectedSectionData.id}
                    sectionColor={selectedSectionData.color}
                    onConfirm={handleDetailConfirm}
                    onCancel={() => setShowDetailCard(false)}
                />
            )}
        </div>
    );
}

// Helper: Calculate path center
function getPathCenter(path: string): { x: number; y: number } {
    const matches = path.match(/(\d+),(\d+)/g);
    if (!matches) return { x: 240, y: 150 };

    let sumX = 0, sumY = 0;
    matches.forEach(match => {
        const [x, y] = match.split(',').map(Number);
        sumX += x;
        sumY += y;
    });

    return {
        x: sumX / matches.length,
        y: sumY / matches.length,
    };
}
