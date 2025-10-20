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
  team: string;
  size?: number;
  className?: string;
}

// 각 팀 로고 이미지 매핑
const teamLogoImages: Record<string, string> = {
  '한화': hanwhaLogo,
  '키움': kiwoomLogo,
  '삼성': samsungLogo,
  '롯데': lotteLogo,
  '두산': doosanLogo,
  '기아': kiaLogo,
  'SSG': ssgLogo,
  'NC': ncLogo,
  'LG': lgLogo,
  'KT': ktLogo,
};

export default function TeamLogo({ team, size = 64, className = '' }: TeamLogoProps) {
  const logoImage = teamLogoImages[team];
  
  if (!logoImage) {
    // 로고가 없는 경우 기본 표시
    return (
      <div 
        className={`rounded-full bg-white/90 flex items-center justify-center ${className}`}
        style={{ width: size, height: size, fontWeight: 900, fontSize: size * 0.28, color: '#2d5f4f' }}
      >
        {team}
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ 
        width: size, 
        height: size,
      }}
    >
      <img
        src={logoImage}
        alt={`${team} 로고`}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
