import { Loader2 } from 'lucide-react';

import TeamLogo from './TeamLogo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { TEAMS } from '../utils/constants';
import type { MatchInfo } from '../hooks/useMateCreateMachine';
import type { PartyFormData } from '../utils/mateCreateDraft';
import { FieldLabel } from './MateCreatePrimitives';

interface MateCreateMatchStepProps {
  formData: PartyFormData;
  matchLoadErrorMessage: string;
  isLoadingMatches: boolean;
  availableMatches: MatchInfo[];
  retry: () => void;
  selectMatch: (match: MatchInfo) => void;
  updateFormData: (data: Partial<PartyFormData>) => void;
  knownStadiumNames: string[];
}

export default function MateCreateMatchStep({
  formData,
  matchLoadErrorMessage,
  isLoadingMatches,
  availableMatches,
  retry,
  selectMatch,
  updateFormData,
  knownStadiumNames,
}: MateCreateMatchStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="mb-2 text-xl text-primary sm:text-2xl">
        경기 선택
      </h2>
      <p className="text-[16px] text-gray-500 mb-6">
        관람하실 경기를 선택해주세요
      </p>

      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor="gameDate">경기 날짜 <span className="text-red-500 ml-0.5">*</span></FieldLabel>
          <Input
            id="gameDate"
            type="date"
            value={formData.gameDate}
            onChange={(event) => updateFormData({ gameDate: event.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="mt-1"
          />
        </div>

        {formData.gameDate && (
          <div className="grid gap-3 pt-2">
            {matchLoadErrorMessage && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[16px] text-red-500">{matchLoadErrorMessage}</p>
                <Button variant="outline" size="sm" onClick={retry}>
                  다시 시도
                </Button>
              </div>
            )}
            {isLoadingMatches ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                <p className="text-[16px] text-gray-500">경기를 불러오는 중입니다...</p>
              </div>
            ) : availableMatches.length > 0 ? (
              availableMatches.map((match) => {
                const isSelected = formData.homeTeam === match.homeTeam && formData.awayTeam === match.awayTeam;

                return (
                  <div
                    key={match.id}
                    onClick={() => selectMatch(match)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all relative overflow-hidden ${isSelected
                      ? 'border-primary bg-green-50 dark:bg-green-900/20 ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900'
                      : 'border-gray-200 dark:border-border hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center sm:gap-4">
                        <div className="w-full text-left text-[16px] font-bold text-gray-500 dark:text-gray-300 sm:w-16 sm:text-center">
                          {match.gameTime}
                        </div>
                        <div className="hidden h-8 w-px bg-gray-200 dark:bg-secondary sm:block" />
                        <div className="flex items-center justify-between gap-3 sm:flex-1 sm:justify-center">
                          <span className="flex min-w-0 items-center gap-2 text-[16px] font-bold dark:text-gray-200 sm:text-base">
                            <TeamLogo teamId={match.awayTeam} size="sm" />
                            <span className="truncate">{TEAMS.find((team) => team.id === match.awayTeam)?.name}</span>
                          </span>
                          <span className="text-gray-400 text-[16px]">VS</span>
                          <span className="flex min-w-0 items-center gap-2 text-[16px] font-bold dark:text-gray-200 sm:text-base">
                            <span className="truncate">{TEAMS.find((team) => team.id === match.homeTeam)?.name}</span>
                            <TeamLogo teamId={match.homeTeam} size="sm" />
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 text-left text-[16px] text-gray-400 sm:ml-4 sm:min-w-[60px] sm:text-right">
                        {match.stadium}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/5 dark:bg-primary/20 pointer-events-none" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="space-y-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-4 dark:border-amber-700/40 dark:bg-amber-900/20">
                <div className="text-center py-2 text-gray-600 dark:text-gray-200">
                  경기 목록 조회 결과가 없습니다. 수동 입력으로 계속 진행할 수 있습니다.
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <FieldLabel htmlFor="manualGameTime">경기 시간</FieldLabel>
                    <Input
                      id="manualGameTime"
                      type="time"
                      value={formData.gameTime}
                      onChange={(event) => updateFormData({ gameTime: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <FieldLabel htmlFor="manualStadium">구장</FieldLabel>
                    <Input
                      id="manualStadium"
                      list="manual-stadium-options"
                      value={formData.stadium}
                      onChange={(event) => updateFormData({ stadium: event.target.value })}
                      placeholder="예: 잠실야구장"
                    />
                    <datalist id="manual-stadium-options">
                      {knownStadiumNames.map((stadiumName) => (
                        <option key={stadiumName} value={stadiumName} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <FieldLabel htmlFor="manualAwayTeam">원정 팀</FieldLabel>
                    <select
                      id="manualAwayTeam"
                      value={formData.awayTeam}
                      onChange={(event) => updateFormData({ awayTeam: event.target.value })}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-[16px] dark:border-border dark:bg-input/30"
                    >
                      <option value="">원정 팀 선택</option>
                      {TEAMS.map((team) => (
                        <option key={`away-${team.id}`} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <FieldLabel htmlFor="manualHomeTeam">홈 팀</FieldLabel>
                    <select
                      id="manualHomeTeam"
                      value={formData.homeTeam}
                      onChange={(event) => updateFormData({ homeTeam: event.target.value })}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-[16px] dark:border-border dark:bg-input/30"
                    >
                      <option value="">홈 팀 선택</option>
                      {TEAMS.map((team) => (
                        <option key={`home-${team.id}`} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[16px] text-gray-500 dark:text-gray-300">
                  팀/구장까지 입력하면 다음 단계로 진행할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
