import hanwhaLogo from 'figma:asset/d94cd6cb1a915d591b57bbca900f8268281068e3.png';
import kiwoomLogo from 'figma:asset/d97539563d3c93f568cb7a4331c9e607cfafe914.png';
import samsungLogo from 'figma:asset/24a312517fb1be189f3fae2611b33f19a72d9401.png';
import lotteLogo from 'figma:asset/9e7d58fab40f3e586f2a0aaf6ee3c59993bcf101.png';
import doosanLogo from 'figma:asset/560639a3d1481dca02309d52b06d0efe43f355f7.png';
import kiaLogo from 'figma:asset/5162bdc3599041e7b7b1da494d7d0dcc490e5893.png';
import ssgLogo from 'figma:asset/b414fb1229152a89657a33002953975be2a9217b.png';
import ncLogo from 'figma:asset/51e88fde588eb7cf7d5390b0fce1bb07ff440d2e.png';
import lgLogo from 'figma:asset/202a55c2e2083b7f096b21380d22d1769e56d762.png';
import ktLogo from 'figma:asset/bb63ace90c2b7b74e708cae2f562fbca654538ec.png';

interface TeamLogoProps {
  team?: string;
  teamId?: string;
  size?: number | 'sm' | 'md' | 'lg';
  className?: string;
}

// 각 팀 로고 이미지 매핑 (한글)
const teamLogoImages: Record<string, string> = {
  'HH': hanwhaLogo,
  'WO': kiwoomLogo,
  'SS': samsungLogo,
  'LT': lotteLogo,
  'OB': doosanLogo,
  'HT': kiaLogo,
  'SK': ssgLogo,
  'NC': ncLogo,
  'LG': lgLogo,
  'KT': ktLogo,
};

// 영어 ID -> 한글 이름 매핑
export const teamIdToName: Record<string, string> = {
  'hanwha': '한화',
  'kiwoom': '키움',
  'samsung': '삼성',
  'lotte': '롯데',
  'doosan': '두산',
  'kia': '기아',
  'ssg': 'SSG',
  'nc': 'NC',
  'lg': 'LG',
  'kt': 'KT',
};

// 크기 문자열 -> 숫자 변환
const sizeMap: Record<string, number> = {
  'sm': 24,
  'md': 48,
  'lg': 80,
};

export default function TeamLogo({ team, teamId, size = 64, className = '' }: TeamLogoProps) {
  // teamId가 있으면 한글 이름으로 변환
  const teamName = teamId ? teamIdToName[teamId] : team;
  
  // size가 문자열이면 숫자로 변환
  const numericSize = typeof size === 'string' ? sizeMap[size] : size;
  
  const logoImage = teamName ? teamLogoImages[teamName] : undefined;
  
  if (!logoImage) {
    // 로고가 없는 경우 기본 표시
    return (
      <div 
        className={`rounded-full bg-white/90 flex items-center justify-center ${className}`}
        style={{ width: numericSize, height: numericSize, fontWeight: 900, fontSize: numericSize * 0.28, color: '#2d5f4f' }}
      >
        {teamName || team || '?'}
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ 
        width: numericSize, 
        height: numericSize,
      }}
    >
      <img
        src={logoImage}
        alt={`${teamName || team} 로고`}
        style={{
          width: numericSize,
          height: numericSize,
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
