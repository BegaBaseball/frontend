import cheerScreenshot from '../assets/landing-showcase-cheer.webp';
import diaryScreenshot from '../assets/landing-showcase-diary.webp';
import homeScreenshot from '../assets/landing-showcase-home.webp';
import mateScreenshot from '../assets/landing-showcase-mate.webp';
import predictionScreenshot from '../assets/landing-showcase-prediction.webp';
import stadiumScreenshot from '../assets/landing-showcase-stadium.webp';
import { Container } from './ui/page-primitives';

const FEATURE_STORIES = [
  {
    title: '오늘 경기',
    description: '오늘 볼 경기와 상태를 먼저 확인합니다.',
    image: homeScreenshot,
    alt: 'BEGA 홈에서 오늘 경기와 주요 정보를 확인하는 화면',
  },
  {
    title: '전력분석실',
    description: '선발, 일정, 예측을 경기 전에 비교합니다.',
    image: predictionScreenshot,
    alt: 'BEGA 전력분석실에서 경기 예측을 확인하는 화면',
  },
  {
    title: '같이가요',
    description: '같이 볼 팬을 찾고 신청 상태를 정리합니다.',
    image: mateScreenshot,
    alt: 'BEGA 같이가요에서 직관 메이트 목록을 확인하는 화면',
  },
  {
    title: '응원석',
    description: '마이팀 이야기와 현장 반응을 모아봅니다.',
    image: cheerScreenshot,
    alt: 'BEGA 응원석에서 팬 게시글을 확인하는 화면',
  },
  {
    title: '구장 가이드',
    description: '좌석, 먹거리, 동선을 방문 전에 점검합니다.',
    image: stadiumScreenshot,
    alt: 'BEGA 구장 가이드에서 구장 정보를 확인하는 화면',
  },
  {
    title: '다이어리',
    description: '관람 기록과 승률을 경기 후에 남깁니다.',
    image: diaryScreenshot,
    alt: 'BEGA 다이어리에서 직관 기록을 확인하는 화면',
  },
] as const;

export default function LandingCapabilityShowcase() {
  return (
    <Container>
      <div className="landing-capability-layout">
        <div className="landing-capability-copy">
          <h2 className="landing-capability-title">
            경기 전, 현장, 경기 후를 나눠 보여줍니다
          </h2>
          <p>
            예정 경기 확인부터 예측, 동행, 구장 동선, 응원, 다이어리까지 실제 화면으로 이어집니다.
          </p>
        </div>

        <div className="landing-capability-grid" data-testid="landing-capability-grid">
          {FEATURE_STORIES.map((item, index) => (
            <article
              key={item.title}
              className={`landing-capability-tile landing-capability-tile-${index + 1}`}
            >
              <img
                src={item.image}
                alt={item.alt}
                width={1440}
                height={900}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="landing-capability-image"
              />
              <div className="landing-capability-tile-copy">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Container>
  );
}
