import cheerScreenshot from '../assets/landing-showcase-cheer.webp';
import diaryScreenshot from '../assets/landing-showcase-diary.webp';
import homeScreenshot from '../assets/landing-showcase-home.webp';
import mateScreenshot from '../assets/landing-showcase-mate.webp';
import predictionScreenshot from '../assets/landing-showcase-prediction.webp';
import stadiumScreenshot from '../assets/landing-showcase-stadium.webp';
import type { Feature } from '../types/landing';

export const LANDING_FEATURES: Feature[] = [
  {
    iconKey: 'home',
    title: '오늘 경기 보드',
    description: '오늘 볼 경기, 상태, 다음 동선을 먼저 확인합니다.',
    image: homeScreenshot,
    mobileImage: homeScreenshot,
    guide: [
      '오늘 경기와 예정 상태를 빠르게 확인',
      '전력분석실과 티켓 흐름으로 이동',
      '내 팀 중심의 경기 흐름 파악'
    ]
  },
  {
    iconKey: 'megaphone',
    title: '응원석',
    description: '마이팀 팬들의 반응과 경기 이야기를 모아봅니다.',
    image: cheerScreenshot,
    mobileImage: cheerScreenshot,
    guide: [
      '마이팀 게시글만 골라서 보기',
      '경기 전 기대와 현장 반응 공유',
      '후기와 응원 메시지를 한곳에 정리'
    ]
  },
  {
    iconKey: 'map',
    title: '구장 가이드',
    description: '방문 전에 좌석, 먹거리, 이동 정보를 점검합니다.',
    image: stadiumScreenshot,
    mobileImage: stadiumScreenshot,
    guide: [
      '구장별 좌석과 편의 정보 확인',
      '맛집, 배달존, 편의점, 주차장 점검',
      '처음 가는 구장도 이동 동선 미리 파악'
    ]
  },
  {
    iconKey: 'linechart',
    title: '전력분석실',
    description: '경기 전 예측과 시즌 흐름을 비교합니다.',
    image: predictionScreenshot,
    mobileImage: predictionScreenshot,
    guide: [
      '시즌 중 승부 예측 참여',
      '스토브리그에는 순위 예측 확인',
      '예측 결과를 저장하고 다시 보기'
    ]
  },
  {
    iconKey: 'users',
    title: '같이가요',
    description: '같이 볼 팬을 찾고 약속 상태를 관리합니다.',
    image: mateScreenshot,
    mobileImage: mateScreenshot,
    guide: [
      '호스트로 신청자를 관리',
      '참여 신청한 파티의 승인 상태 확인',
      '승인 후 채팅으로 시간과 장소 조율'
    ]
  },
  {
    iconKey: 'book',
    title: '다이어리',
    description: '경기 후 관람 기록과 사진을 남깁니다.',
    image: diaryScreenshot,
    mobileImage: diaryScreenshot,
    guide: [
      '직관 일정과 경기 후기를 기록',
      '사진과 메모로 관람 순간 저장',
      '나만의 승률과 관람 히스토리 확인'
    ]
  }
];
