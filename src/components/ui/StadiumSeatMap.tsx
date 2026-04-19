import React, { useState } from 'react';
import { THEME_COLORS } from '../../utils/constants';

interface SeatSection {
  id: string;
  name: string;
  type: 'home' | 'away' | 'premium' | 'outfield';
  points: string;
}

const CONCEPT_SECTIONS: SeatSection[] = [
  { id: 'h1', name: 'Home Table', type: 'premium', points: '150,300 180,280 220,280 250,300 220,320 180,320' },
  { id: 'h2', name: '1st Base Desk', type: 'home', points: '260,300 350,250 380,270 290,320' },
  { id: 'h3', name: '3rd Base Desk', type: 'home', points: '140,300 50,250 20,270 110,320' },
  { id: 'a1', name: 'Away Cheering', type: 'away', points: '360,240 450,150 480,180 390,270' },
  { id: 'a2', name: 'Home Cheering', type: 'home', points: '40,240 -50,150 -80,180 10,270' },
  { id: 'o1', name: 'Outfield left', type: 'outfield', points: '50,140 150,50 180,70 80,160' },
  { id: 'o2', name: 'Center Field', type: 'outfield', points: '160,40 340,40 340,80 160,80' },
  { id: 'o3', name: 'Outfield right', type: 'outfield', points: '350,50 450,140 420,160 320,70' },
];

const TYPE_COLORS = {
  home: { bg: '#63b39b', border: '#2f6c5c', text: '홈 응원석' },
  away: { bg: '#ef4444', border: '#b91c1c', text: '어웨이 응원석' },
  premium: { bg: '#eab308', border: '#a16207', text: '프리미엄/테이블' },
  outfield: { bg: '#94a3b8', border: '#475569', text: '외야석' },
};

export default function StadiumSeatMap() {
  const [hoveredSection, setHoveredSection] = useState<SeatSection | null>(null);
  const [selectedSection, setSelectedSection] = useState<SeatSection | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-900 rounded-3xl overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 shadow-inner">
        {/* SVG Map Container */}
        <svg 
          viewBox="0 0 500 400" 
          className="w-full h-full p-8 transition-all duration-500 ease-in-out"
        >
          {/* Pitch/Field Illustration */}
          <path 
            d="M 250 380 L 100 250 Q 250 100 400 250 Z" 
            fill="#34d399" 
            fillOpacity="0.2"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="250" cy="350" r="10" fill="#fbbf24" fillOpacity="0.5" />
          
          {/* Seating Sections */}
          {CONCEPT_SECTIONS.map((section) => (
            <polygon
              key={section.id}
              points={section.points}
              className="cursor-pointer transition-all duration-300"
              fill={selectedSection?.id === section.id ? TYPE_COLORS[section.type].bg : `${TYPE_COLORS[section.type].bg}44`}
              stroke={TYPE_COLORS[section.type].border}
              strokeWidth={selectedSection?.id === section.id ? "3" : "1"}
              onMouseEnter={() => setHoveredSection(section)}
              onMouseLeave={() => setHoveredSection(null)}
              onClick={() => setSelectedSection(section === selectedSection ? null : section)}
              style={{
                filter: hoveredSection?.id === section.id ? 'brightness(1.1)' : 'none',
                transform: hoveredSection?.id === section.id ? 'scale(1.01)' : 'scale(1)',
                transformOrigin: 'center',
              }}
            />
          ))}
        </svg>

        {/* Legend / Overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {Object.entries(TYPE_COLORS).map(([type, config]) => (
            <div key={type} className="flex items-center gap-2 bg-white/80 dark:bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.bg }} />
              <span className="text-xs font-bold dark:text-white">{config.text}</span>
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {(hoveredSection || selectedSection) && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-800 shadow-2xl border-2 border-primary rounded-2xl p-4 min-w-[200px] animate-fade-in-up">
            <h4 className="font-black text-primary text-lg">{(selectedSection || hoveredSection)?.name}</h4>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {TYPE_COLORS[(selectedSection || hoveredSection)!.type].text}
            </p>
            <button className="mt-3 w-full py-2 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">
              이 구역 시야 보기
            </button>
          </div>
        )}
      </div>
      
      <div className="bg-primary/5 dark:bg-primary/10 p-6 rounded-2xl border border-primary/20">
        <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
          💡 좌석 안내 팁
        </h4>
        <ul className="text-sm text-neutral-600 dark:text-neutral-300 space-y-1">
          <li>• 좌석 선택 시 해당 구역의 실제 시야 사진을 확인할 수 있습니다.</li>
          <li>• 응원석은 경기에 따라 매우 혼잡할 수 있으니 참고하세요.</li>
        </ul>
      </div>
    </div>
  );
}
