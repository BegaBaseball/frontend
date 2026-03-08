import hanwhaLogo from '../assets/d94cd6cb1a915d591b57bbca900f8268281068e3.png';
import kiwoomLogo from '../assets/d97539563d3c93f568cb7a4331c9e607cfafe914.png';
import samsungLogo from '../assets/24a312517fb1be189f3fae2611b33f19a72d9401.png';
import lotteLogo from '../assets/9e7d58fab40f3e586f2a0aaf6ee3c59993bcf101.png';
import doosanLogo from '../assets/560639a3d1481dca02309d52b06d0efe43f355f7.png';
import kiaLogo from '../assets/5162bdc3599041e7b7b1da494d7d0dcc490e5893.png';
import ssgLogo from '../assets/b414fb1229152a89657a33002953975be2a9217b.png';
import ncLogo from '../assets/51e88fde588eb7cf7d5390b0fce1bb07ff440d2e.png';
import lgLogo from '../assets/202a55c2e2083b7f096b21380d22d1769e56d762.png';
import ktLogo from '../assets/bb63ace90c2b7b74e708cae2f562fbca654538ec.png';

interface TeamLogoProps {
  team?: string;
  teamId?: string;
  size?: number | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export const teamCodeToKoreanName: Record<string, string> = {
  HH: '한화',
  KH: '키움',
  WO: '키움',
  KI: '키움',
  SS: '삼성',
  BE: '한화',
  KW: '키움',
  LT: '롯데',
  LOT: '롯데',
  DB: '두산',
  OB: '두산',
  DO: '두산',
  HT: '기아',
  MBC: 'LG',
  KIA: '기아',
  SK: 'SSG',
  SSG: 'SSG 랜더스',
  NX: '키움',
  NC: 'NC',
  LG: 'LG',
  KT: 'KT',
};

// 각 팀 로고 이미지 매핑 (한글)
const teamLogoImages: Record<string, string> = {
  HH: hanwhaLogo,
  '한화': hanwhaLogo,
  'Hanwha': hanwhaLogo,
  BE: hanwhaLogo,
  hanwha: hanwhaLogo,
  '한화 이글스': hanwhaLogo,
  'hanwha eagles': hanwhaLogo,
  KH: kiwoomLogo,
  WO: kiwoomLogo,
  KI: kiwoomLogo,
  '키움': kiwoomLogo,
  'Kiwoom': kiwoomLogo,
  KW: kiwoomLogo,
  kiwoom: kiwoomLogo,
  '키움 히어로즈': kiwoomLogo,
  'kiwoom heroes': kiwoomLogo,
  'nexen heroes': kiwoomLogo,
  SS: samsungLogo,
  '삼성': samsungLogo,
  'Samsung': samsungLogo,
  samsung: samsungLogo,
  'samsung lions': samsungLogo,
  'samsung 라이온즈': samsungLogo,
  '삼성 라이온즈': samsungLogo,
  LT: lotteLogo,
  LOT: lotteLogo,
  '롯데': lotteLogo,
  'Lotte': lotteLogo,
  'LOTTE': lotteLogo,
  lotte: lotteLogo,
  'lotte giants': lotteLogo,
  DB: doosanLogo,
  OB: doosanLogo,
  DO: doosanLogo,
  '두산': doosanLogo,
  'Doosan': doosanLogo,
  doosan: doosanLogo,
  'doosan bears': doosanLogo,
  '두산 베어스': doosanLogo,
  HT: kiaLogo,
  '기아': kiaLogo,
  'KIA': kiaLogo,
  'Kia': kiaLogo,
  kia: kiaLogo,
  'kia tigers': kiaLogo,
  '기아 타이거즈': kiaLogo,
  SK: ssgLogo,
  SSG: ssgLogo,
  'SSG 랜더스': ssgLogo,
  ssg: ssgLogo,
  sk: ssgLogo,
  'ssg 랜더스': ssgLogo,
  'ssg 랜더즈': ssgLogo,
  'ssglanders': ssgLogo,
  'ssg landers': ssgLogo,
  NX: kiwoomLogo,
  '넥센': kiwoomLogo,
  'NC': ncLogo,
  nc: ncLogo,
  'nc dinos': ncLogo,
  'nc 다이노스': ncLogo,
  MBC: lgLogo,
  'LG': lgLogo,
  'LG 트윈스': lgLogo,
  lg: lgLogo,
  'lg twins': lgLogo,
  'KT': ktLogo,
  'KT 위즈': ktLogo,
  'NC 다이노스': ncLogo,
  'kt': ktLogo,
  'kt wiz': ktLogo,
  '롯데 자이언츠': lotteLogo,
};

// 영어 ID -> 한글 이름 매핑
export const teamIdToName: Record<string, string> = {
  'hanwha': '한화',
  'hh': '한화',
  'be': '한화',
  'kiwoom': '키움',
  'kh': '키움',
  'wo': '키움',
  'ki': '키움',
  'kw': '키움',
  'samsung': '삼성 라이온즈',
  'ss': '삼성 라이온즈',
  'lotte': '롯데 자이언츠',
  'lt': '롯데 자이언츠',
  'lot': '롯데 자이언츠',
  'doosan': '두산 베어스',
  'db': '두산 베어스',
  'ob': '두산 베어스',
  'do': '두산 베어스',
  'kia': '기아 타이거즈',
  'ht': '기아 타이거즈',
  'ssg': 'SSG 랜더스',
  'sk': 'SSG 랜더스',
  'nx': '키움',
  'nexen': '키움',
  'nc': 'NC 다이노스',
  'lg': 'LG 트윈스',
  'mbc': 'LG 트윈스',
  'kt': 'KT 위즈',
};

const LEGACY_CODE_TO_CANONICAL: Record<string, string> = {
  OB: 'DB',
  DO: 'DB',
  BE: 'HH',
  WO: 'KH',
  KI: 'KH',
  KW: 'KH',
  NX: 'KH',
  SK: 'SSG',
  LOT: 'LT',
  HT: 'KIA',
  MBC: 'LG',
};

const CANONICAL_TO_DISPLAY_NAME: Record<string, string> = {
  HH: '한화 이글스',
  KH: '키움 히어로즈',
  SS: '삼성 라이온즈',
  LT: '롯데 자이언츠',
  DB: '두산 베어스',
  KIA: '기아 타이거즈',
  SSG: 'SSG 랜더스',
  NC: 'NC 다이노스',
  LG: 'LG 트윈스',
  KT: 'KT 위즈',
};

const normalizeTeamLabel = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const normalized = trimmed
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const firstToken = normalized.split(/[\/|,:-]|\s+/).find(Boolean) || normalized;
  const leadingAlphaToken = firstToken.match(/^[A-Za-z]{2,10}/)?.[0];
  const alphaToken = leadingAlphaToken || firstToken.replace(/[^A-Za-z]/g, '');

  if (alphaToken) {
    const upperToken = alphaToken.toUpperCase();
    const candidateCodes = Array.from(new Set([
      upperToken,
      upperToken.slice(0, 3),
      upperToken.slice(0, 2),
    ].filter((candidate) => candidate.length >= 2)));

    for (const candidateCode of candidateCodes) {
      const canonicalCode = LEGACY_CODE_TO_CANONICAL[candidateCode] || candidateCode;

      if (teamLogoImages[canonicalCode]) {
        return canonicalCode;
      }

      const mappedName = teamIdToName[canonicalCode.toLowerCase()];
      if (mappedName && teamLogoImages[mappedName]) {
        return mappedName;
      }
    }
  }

  const embeddedAlphaTokens = normalized.match(/[A-Za-z]{2,10}/g) || [];
  for (const token of embeddedAlphaTokens) {
    const upperToken = token.toUpperCase();
    const canonicalCode = LEGACY_CODE_TO_CANONICAL[upperToken] || upperToken;

    if (teamLogoImages[canonicalCode]) {
      return canonicalCode;
    }

    const mappedName = teamIdToName[canonicalCode.toLowerCase()];
    if (mappedName && teamLogoImages[mappedName]) {
      return mappedName;
    }
  }

  const hangulTokenMatch = normalized.match(/[가-힣]+/);
  if (hangulTokenMatch && teamLogoImages[hangulTokenMatch[0]]) {
    return hangulTokenMatch[0];
  }

  if (teamLogoImages[firstToken]) {
    return firstToken;
  }

  return normalized;
};

export const resolveTeamDisplayName = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const directMapped = teamIdToName[trimmed.toLowerCase()];
  if (directMapped) {
    return directMapped;
  }

  const canonicalKey = normalizeTeamLabel(trimmed);
  if (!canonicalKey) {
    return trimmed;
  }

  const canonicalUpper = (LEGACY_CODE_TO_CANONICAL[canonicalKey.toUpperCase()] || canonicalKey).toUpperCase();
  const canonicalMapped = teamIdToName[canonicalUpper.toLowerCase()];
  if (canonicalMapped) {
    return canonicalMapped;
  }

  if (CANONICAL_TO_DISPLAY_NAME[canonicalUpper]) {
    return CANONICAL_TO_DISPLAY_NAME[canonicalUpper];
  }

  if (trimmed.toUpperCase().includes('OB')) {
    return '두산 베어스';
  }

  return trimmed;
};

// 크기 문자열 -> 숫자 변환
const sizeMap: Record<string, number> = {
  'sm': 24,
  'md': 48,
  'lg': 80,
};

export default function TeamLogo({ team, teamId, size = 64, className = '' }: TeamLogoProps) {
  const rawTeamValue = teamId ?? team;
  const teamName = resolveTeamDisplayName(rawTeamValue);
  const canonicalKey = normalizeTeamLabel(rawTeamValue ?? teamName);

  // size가 문자열이면 숫자로 변환
  const numericSize = typeof size === 'string' && size !== 'full' ? sizeMap[size] : size;

  const logoImage = canonicalKey ? teamLogoImages[canonicalKey] : undefined;
  const isResponsive = size === 'full';

  if (!logoImage) {
    // 로고가 없는 경우 기본 표시
    return (
      <div
        className={`rounded-full bg-white/90 flex items-center justify-center text-primary ${className}`}
        style={!isResponsive ? { width: numericSize, height: numericSize, fontWeight: 900, fontSize: Number(numericSize) * 0.28 } : { fontWeight: 900 }}
      >
        {teamName || team || '?'}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-white ${className}`}
      style={!isResponsive ? {
        width: numericSize,
        height: numericSize,
      } : {}}
    >
      <img
        src={logoImage}
        alt={`${teamName || team} 로고`}
        className="image-render-quality"
        style={{
          width: isResponsive ? '100%' : numericSize,
          height: isResponsive ? '100%' : numericSize,
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
