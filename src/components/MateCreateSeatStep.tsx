import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { getTeamColorByAnyKey } from '../constants/teams';
import { TEAMS } from '../utils/constants';
import { SEAT_CATEGORIES, SeatCategory } from '../utils/stadiumData';
import { SEAT_ICONS } from '../utils/seatIcons';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { FieldLabel } from './MateCreatePrimitives';

interface MateCreateSeatStepProps {
  formData: PartyFormData;
  availableCategoryKeys: SeatCategory[];
  updateFormData: (data: Partial<PartyFormData>) => void;
}

const seatDescriptions: Record<string, string> = {
  '응원석': '치어리더와 함께 열정 응원! 🔥',
  '테이블석': '음식을 편하게 먹을 수 있어요 🍗',
  '프리미엄': '최고의 시야와 편안함 💎',
  '익사이팅': '선수들과 가장 가까운 곳 ⚡',
  '일반/시야': '가성비 좋게 관람해요 👀',
  '이색좌석': '특별한 경험을 원한다면 ⛺',
  '외야석': '홈런볼을 잡을 기회! ⚾',
};

const mapTeamId = (backendId: string): string => {
  if (!backendId) return '';
  const code = backendId.toUpperCase();
  const mapping: Record<string, string> = {
    LG: 'lg',
    KT: 'kt',
    NC: 'nc',
    SSG: 'ssg',
    SK: 'ssg',
    DB: 'doosan',
    OB: 'doosan',
    DO: 'doosan',
    SS: 'samsung',
    LT: 'lotte',
    KIA: 'kia',
    HT: 'kia',
    HH: 'hanwha',
    KH: 'kiwoom',
    WO: 'kiwoom',
    KI: 'kiwoom',
    NX: 'kiwoom',
    KW: 'kiwoom',
  };
  return mapping[code] || backendId.toLowerCase();
};

export default function MateCreateSeatStep({
  formData,
  availableCategoryKeys,
  updateFormData,
}: MateCreateSeatStepProps) {
  const homeTeamId = mapTeamId(formData.homeTeam);
  const awayTeamId = mapTeamId(formData.awayTeam);

  return (
    <div className="space-y-6 sm:space-y-8">
      <h2 className="mb-4 text-lg font-bold text-primary sm:mb-6 sm:text-xl">
        좌석 정보
      </h2>

      <div className="space-y-3">
        <FieldLabel className="text-base font-bold sm:text-lg">응원 진영 선택 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 min-h-[7rem] sm:h-28">
          <button
            type="button"
            onClick={() => updateFormData({ cheeringSide: 'HOME' })}
            className={`relative flex min-w-0 flex-col items-center justify-center rounded-xl px-2 py-3 text-center transition-all duration-200 sm:px-3 ${formData.cheeringSide === 'HOME'
              ? 'ring-4 ring-offset-2 scale-[1.02] shadow-md'
              : 'opacity-70 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            style={{
              backgroundColor: formData.cheeringSide === 'HOME' ? getTeamColorByAnyKey(homeTeamId) : 'transparent',
              borderColor: getTeamColorByAnyKey(homeTeamId),
              borderWidth: formData.cheeringSide === 'HOME' ? 0 : 2,
              color: formData.cheeringSide === 'HOME' ? 'white' : getTeamColorByAnyKey(homeTeamId),
            }}
          >
            <div className="mb-2">
              <TeamLogo teamId={homeTeamId} size={34} />
            </div>
            <span className="text-center text-sm font-bold leading-tight sm:text-lg">
              {TEAMS.find((team) => team.id === homeTeamId)?.name || '홈팀'}
            </span>
            <div className="mt-1 text-[10px] font-medium opacity-80 sm:text-[11px]">홈 팀 응원</div>
          </button>

          <button
            type="button"
            onClick={() => updateFormData({ cheeringSide: 'NEUTRAL' })}
            className={`flex min-w-0 flex-col items-center justify-center rounded-xl border-2 px-2 py-3 text-center transition-all duration-200 sm:px-3 ${formData.cheeringSide === 'NEUTRAL'
              ? 'bg-gray-500 text-white ring-4 ring-gray-300 ring-offset-2 scale-[1.02] border-transparent shadow-md'
              : 'border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-border dark:hover:bg-gray-800'
              }`}
          >
            <span className="mb-1 text-2xl sm:text-3xl">😐</span>
            <span className="text-sm font-bold sm:text-lg">상관없음</span>
            <div className="mt-1 text-[10px] font-medium opacity-80 sm:text-[11px]">중립</div>
          </button>

          <button
            type="button"
            onClick={() => updateFormData({ cheeringSide: 'AWAY' })}
            className={`relative flex min-w-0 flex-col items-center justify-center rounded-xl px-2 py-3 text-center transition-all duration-200 sm:px-3 ${formData.cheeringSide === 'AWAY'
              ? 'ring-4 ring-offset-2 scale-[1.02] shadow-md'
              : 'opacity-70 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            style={{
              backgroundColor: formData.cheeringSide === 'AWAY' ? getTeamColorByAnyKey(awayTeamId) : 'transparent',
              borderColor: getTeamColorByAnyKey(awayTeamId),
              borderWidth: formData.cheeringSide === 'AWAY' ? 0 : 2,
              color: formData.cheeringSide === 'AWAY' ? 'white' : getTeamColorByAnyKey(awayTeamId),
            }}
          >
            <div className="mb-2">
              <TeamLogo teamId={awayTeamId} size={34} />
            </div>
            <span className="text-center text-sm font-bold leading-tight sm:text-lg">
              {TEAMS.find((team) => team.id === awayTeamId)?.name || '원정팀'}
            </span>
            <div className="mt-1 text-[10px] font-medium opacity-80 sm:text-[11px]">원정 팀 응원</div>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <FieldLabel className="text-base font-bold sm:text-lg">좌석 종류 (선택)</FieldLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(SEAT_CATEGORIES)
            .filter(([key]) => availableCategoryKeys.includes(key as SeatCategory))
            .map(([key, value]) => {
              const isSelected = formData.seatCategory === value.label;

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => updateFormData({ seatCategory: isSelected ? '' : value.label })}
                  className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200 hover:shadow-sm sm:p-4 ${isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-gray-100 hover:border-primary/50 bg-white dark:bg-card dark:border-border'
                    }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-2 text-xl sm:h-12 sm:w-12 sm:text-2xl ${isSelected ? 'bg-white' : 'bg-gray-50 dark:bg-secondary'}`}>
                    {SEAT_ICONS[key as SeatCategory]}
                  </div>
                  <div>
                    <div className={`font-bold ${isSelected ? 'text-primary' : 'text-gray-900 dark:text-gray-100'}`}>
                      {value.label}
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-gray-500 sm:text-xs">
                      {seatDescriptions[value.label] || '편안한 관람'}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      <div className="space-y-3">
        <FieldLabel className="text-base font-bold sm:text-lg" htmlFor="seatDetail">좌석 상세 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">구역/블록</label>
            <div className="relative">
              <Input
                placeholder="예: 305"
                value={formData.seatDetail.split(' ')[0]?.replace('블록', '') || ''}
                onChange={(event) => {
                  const parts = formData.seatDetail.split(' ');
                  const block = event.target.value;
                  const row = parts[1] || '';
                  const seat = parts[2] || '';
                  updateFormData({ seatDetail: `${block}${block ? '블록' : ''} ${row} ${seat}`.trim() });
                }}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">블록</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">열</label>
            <div className="relative">
              <Input
                placeholder="예: 12"
                value={formData.seatDetail.split(' ')[1]?.replace('열', '') || ''}
                onChange={(event) => {
                  const parts = formData.seatDetail.split(' ');
                  const block = parts[0] || '';
                  const row = event.target.value;
                  const seat = parts[2] || '';
                  updateFormData({ seatDetail: `${block} ${row}${row ? '열' : ''} ${seat}`.trim() });
                }}
                className="pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">열</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">번 (선택)</label>
            <div className="relative">
              <Input
                placeholder="예: 15"
                value={formData.seatDetail.split(' ')[2]?.replace('번', '') || ''}
                onChange={(event) => {
                  const parts = formData.seatDetail.split(' ');
                  const block = parts[0] || '';
                  const row = parts[1] || '';
                  const seat = event.target.value;
                  updateFormData({ seatDetail: `${block} ${row} ${seat}${seat ? '번' : ''}`.trim() });
                }}
                className="pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">번</span>
            </div>
          </div>
        </div>

        {(formData.cheeringSide || formData.seatCategory || formData.seatDetail) && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg bg-gray-50 p-3 dark:bg-card sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <span className="text-sm text-gray-500">미리보기</span>
            <span className="break-words text-sm font-bold text-gray-700 dark:text-gray-300 sm:text-right">
              {[
                formData.cheeringSide === 'HOME' ? '[홈응원]' : formData.cheeringSide === 'AWAY' ? '[원정응원]' : formData.cheeringSide === 'NEUTRAL' ? '[중립]' : '',
                formData.seatCategory,
                formData.seatDetail,
              ].filter(Boolean).join(' ')}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="maxParticipants" className="text-base font-bold sm:text-lg">모집 인원 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <select
          id="maxParticipants"
          value={formData.maxParticipants.toString()}
          onChange={(event) => updateFormData({ maxParticipants: parseInt(event.target.value, 10) })}
          className="h-12 w-full rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-border dark:bg-input/30"
        >
          <option value="2">2명 (본인 포함)</option>
          <option value="3">3명 (본인 포함)</option>
          <option value="4">4명 (본인 포함)</option>
        </select>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="ticketPrice" className="text-base font-bold sm:text-lg">티켓 가격 (1인당) <span className="text-red-500 ml-0.5">*</span></FieldLabel>
        <div className="relative">
          <Input
            id="ticketPrice"
            type="number"
            min="0"
            step="1000"
            value={formData.ticketPrice || ''}
            onChange={(event) => updateFormData({ ticketPrice: parseInt(event.target.value) || 0 })}
            placeholder="예: 12000"
            className="h-12 pr-12 text-base sm:text-lg"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
            원
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2 px-1">
          * 선택하신 <span className="font-bold text-primary">{formData.seatCategory}</span> 기준 예상 가격입니다. 실제 예매 가격과 다를 수 있습니다.
        </p>
        {formData.ticketPrice > 0 && (
          <Alert>
            <AlertDescription className="text-sm">
              참여자는 호스트 승인 후 채팅에서 티켓 가격 <span className="text-primary">{formData.ticketPrice.toLocaleString()}원</span> 기준으로 직거래를 조율합니다.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
