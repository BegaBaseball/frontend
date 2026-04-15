import { Button } from './ui/button';
import TeamLogo from './TeamLogo';
import firstPlaceImage from '../assets/f552d9266ac817e0c86b657dead0069395c6da11.webp';

interface RankingPredictionCompletionPanelProps {
  topTeamShortName?: string;
  isPredictionSaved: boolean;
  alreadySaved: boolean;
  onCompletePrediction: () => void;
  onSave: () => void;
  onShare: () => void;
}

export default function RankingPredictionCompletionPanel({
  topTeamShortName,
  isPredictionSaved,
  alreadySaved,
  onCompletePrediction,
  onSave,
  onShare,
}: RankingPredictionCompletionPanelProps) {
  return (
    <>
      <div className="mb-4 mx-auto w-[60px]">
        <img
          src={firstPlaceImage}
          alt="First Place"
          loading="lazy"
          decoding="async"
          className="w-full h-auto object-contain"
        />
      </div>

      <p className="mb-4 text-primary font-black text-2xl">
        1위
      </p>

      {topTeamShortName ? (
        <div className="mb-6 flex justify-center">
          <TeamLogo team={topTeamShortName} size={140} />
        </div>
      ) : null}

      <p className="mb-4 text-[16px]">모든 팀이 배치되었습니다!</p>

      {!isPredictionSaved && !alreadySaved ? (
        <Button
          onClick={onCompletePrediction}
          data-testid="ranking-complete-btn"
          className="w-full bg-primary-dark text-white hover:bg-primary"
        >
          예측 완료
        </Button>
      ) : alreadySaved ? (
        <div className="space-y-2">
          <Button
            onClick={onShare}
            data-testid="ranking-share-btn"
            variant="outline"
            className="w-full border-2 border-primary text-primary hover:bg-primary/10 dark:border-primary dark:text-primary dark:hover:bg-primary/20"
          >
            공유하기
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={onSave}
            data-testid="ranking-save-btn"
            className="w-full bg-primary-dark text-white hover:bg-primary"
          >
            저장하기
          </Button>
          <Button
            onClick={onShare}
            data-testid="ranking-share-btn"
            variant="outline"
            className="w-full border-2 border-primary text-primary hover:bg-primary/10 dark:border-primary dark:text-primary dark:hover:bg-primary/20"
          >
            공유하기
          </Button>
        </div>
      )}
    </>
  );
}
