import { Home, Megaphone, MapPin, LineChart, Users, BookOpen } from 'lucide-react';
import homeScreenshot from '../assets/home.png';
import predictionScreenshot from '../assets/prediction.png';
import diaryScreenshot from '../assets/diary.png';
import screenshot2 from '../assets/cheer.png';
import screenshot3 from '../assets/stadium.png';
import mateScreenshot1 from '../assets/mate.png';
import { Feature } from '../types/landing';

export const LANDING_FEATURES: Feature[] = [
  {
    icon: Home,
    title: 'KBO 경기일정 및 홈',
    description: '실시간 경기 정보, 스토브리그 소식을 확인하세요',
    image: homeScreenshot,
    guide: [
      '홈 화면에서 오늘의 경기 일정 확인',
      'KBO LIVE로 실시간 경기 현황 체크',
      '팀별 랭킹과 티켓 예매 정보 한눈에'
    ]
  },
  {
    icon: Megaphone,
    title: '응원석',
    description: '마이팀 설정으로 필터링하여 우리 팀 소식만 모아보세요',
    image: screenshot2,
    guide: [
      '마이팀 설정 후 우리 팀 게시글만 필터링',
      '응원 글 작성 및 다른 팬들과 소통',
      '경기 후기와 응원 메시지 공유'
    ]
  },
  {
    icon: MapPin,
    title: '구장 가이드',
    description: '야구장 내부 맛집, 배달존 및 근처 편의점, 주차장 정보 제공',
    image: screenshot3,
    guide: [
      '구장 선택 후 카테고리별 정보 확인',
      '맛집, 배달존, 편의점, 주차장 정보 제공',
      '구장 방문 전 필수 정보 미리 체크'
    ]
  },
  {
    icon: LineChart,
    title: '전력분석실',
    description: '전력 분석과 승부 예측으로 경기를 더 재미있게 즐기세요',
    image: predictionScreenshot,
    guide: [
      '스토브리그 시즌: 순위 예측 활성화',
      '시즌 중: 승부 예측 활성화',
      '친구들과 예측 결과 저장하고 공유하기'
    ]
  },
  {
    icon: Users,
    title: '같이가요',
    description: '직관메이트를 구하고 함께 야구를 즐기세요',
    image: mateScreenshot1,
    guide: [
      '내가 호스트인 파티: 신청 관리 → 승인/거절 → 채팅방 소통',
      '참여 신청한 파티: 승인 대기 → 승인 후 채팅 가능',
      '경기 당일 체크인으로 보증금 환불 받기'
    ]
  },
  {
    icon: BookOpen,
    title: '다이어리',
    description: '개인화된 페이지에서 나만의 야구 다이어리를 작성하세요',
    image: diaryScreenshot,
    guide: [
      '직관 기록과 경기 후기 작성',
      '사진과 메모로 추억 저장',
      '나만의 야구 일정 관리'
    ]
  }
];