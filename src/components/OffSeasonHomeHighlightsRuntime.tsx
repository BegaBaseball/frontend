import TeamLogo from './TeamLogo';
import { Card } from './ui/card';
import type { Ranking } from '../types/home';
import {
  AwardIcon,
  CrownIcon,
  TrendingUpIcon,
  TrophyIcon,
} from './icons/PublicFeatureIcons';
import { OffseasonPill } from './offseason/offseasonUi';

interface AwardData {
  award: string;
  playerName: string;
  team: string;
  stats: string;
}

interface OffSeasonHomeHighlightsRuntimeProps {
  awards: AwardData[];
  rankings: Ranking[];
  isLargeScreen: boolean;
}

export default function OffSeasonHomeHighlightsRuntime({
  awards,
  rankings,
  isLargeScreen,
}: OffSeasonHomeHighlightsRuntimeProps) {
  return (
    <>
      <section>
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="bg-primary p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <AwardIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-primary">시상식 결과</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {awards.map((award, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all border-none bg-white dark:bg-background group ring-1 ring-black/5 dark:ring-white/10">
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl md:rounded-2xl bg-gray-50 dark:bg-card border border-gray-100 dark:border-border shadow-sm transition-transform group-hover:rotate-6">
                    <TeamLogo team={award.team} size={36} className="md:w-11 md:h-11" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[15px] md:text-[15px] font-black text-primary uppercase tracking-wider mb-0.5 md:mb-1">{award.award}</h4>
                    <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{award.playerName}</p>
                  </div>
                </div>
                <div className="pt-3 md:pt-4 border-t border-gray-100 dark:border-border">
                  <p className="text-[15px] md:text-[15px] text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">{award.stats}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="bg-primary p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <TrophyIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-primary">2025 포스트시즌 결과</h3>
        </div>

        <Card className="p-4 md:p-10 overflow-x-auto bg-white dark:bg-card border border-gray-200 dark:border-border shadow-xl rounded-2xl md:rounded-3xl">
          {!isLargeScreen ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="relative pl-8 pb-4 border-l-2 border-gray-300 dark:border-border">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-gray-300 dark:bg-border"></div>
                <span className="text-[15px] font-bold text-gray-400 dark:text-gray-300 mb-2 block">와일드카드</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-card rounded-lg border border-gray-200 dark:border-border">
                    <span className="text-[14px] font-bold text-gray-500 dark:text-zinc-300 w-6">5위</span>
                    <TeamLogo team="NC" size={20} />
                    <span className="font-bold text-gray-900 dark:text-white text-[15px]">NC</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-primary">
                    <span className="text-[14px] font-bold text-primary w-6">4위</span>
                    <TeamLogo team="삼성" size={20} />
                    <span className="font-bold text-gray-900 dark:text-white text-[15px]">삼성</span>
                    <OffseasonPill className="ml-auto border-none bg-primary px-2 py-0.5 text-[14px] text-white">승</OffseasonPill>
                  </div>
                </div>
              </div>

              <div className="relative pl-8 pb-4 border-l-2 border-primary">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                <span className="text-[15px] font-bold text-gray-400 dark:text-gray-300 mb-2 block">준플레이오프</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-card rounded-lg border border-gray-200 dark:border-border">
                    <span className="text-[14px] font-bold text-gray-500 dark:text-zinc-300 w-6">3위</span>
                    <TeamLogo team="SSG" size={20} />
                    <span className="font-bold text-gray-900 dark:text-white text-[15px]">SSG</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-primary">
                    <span className="text-[14px] font-bold text-primary w-6">WC</span>
                    <TeamLogo team="삼성" size={20} />
                    <span className="font-bold text-gray-900 dark:text-white text-[15px]">삼성</span>
                    <OffseasonPill className="ml-auto border-none bg-primary px-2 py-0.5 text-[14px] text-white">승</OffseasonPill>
                  </div>
                </div>
              </div>

              <div className="relative pl-8 pb-4 border-l-2 border-primary">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                <span className="text-[15px] font-bold text-gray-400 dark:text-gray-300 mb-2 block">플레이오프</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-primary">
                    <span className="text-[14px] font-bold text-primary w-6">2위</span>
                    <TeamLogo team="한화" size={20} />
                    <span className="font-bold text-gray-900 dark:text-white text-[15px]">한화</span>
                    <OffseasonPill className="ml-auto border-none bg-primary px-2 py-0.5 text-[14px] text-white">승</OffseasonPill>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-card rounded-lg border border-gray-200 dark:border-border">
                    <span className="text-[14px] font-bold text-gray-500 dark:text-zinc-300 w-6">준PO</span>
                    <TeamLogo team="삼성" size={20} />
                    <span className="font-bold text-gray-900 dark:text-white text-[15px]">삼성</span>
                  </div>
                </div>
              </div>

              <div className="relative pl-8">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-yellow-500"></div>
                <div className="flex items-center gap-2 mb-2">
                  <CrownIcon className="w-4 h-4 text-yellow-500" />
                  <span className="text-[14px] font-bold text-yellow-600 dark:text-yellow-400">한국시리즈</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary to-[#1a3c34] rounded-xl shadow-lg">
                    <span className="text-[14px] font-bold text-emerald-200 w-6">1위</span>
                    <TeamLogo team="LG" size={24} />
                    <span className="font-bold text-white">LG</span>
                    <OffseasonPill className="ml-auto border-none bg-yellow-400 px-2 py-0.5 text-[14px] text-black">V3</OffseasonPill>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-card rounded-lg border border-gray-200 dark:border-border opacity-70">
                    <span className="text-[14px] font-bold text-gray-500 dark:text-zinc-300 w-6">PO</span>
                    <TeamLogo team="한화" size={20} />
                    <span className="font-bold text-gray-900 dark:text-white text-[15px]">한화</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-w-[680px] sm:min-w-[760px] md:min-w-[800px] flex items-center justify-center relative h-[340px] sm:h-[380px] md:h-[400px] gap-6 sm:gap-9 md:gap-12">
              <div className="flex flex-col gap-4 relative z-10 translate-y-20">
                <div className="flex flex-col gap-2">
                <span className="text-[14px] font-bold text-gray-400 dark:text-gray-300 text-center">와일드카드</span>
                  <div className="flex flex-col gap-3 relative">
                    <div className="absolute right-[-48px] top-1/2 -translate-y-[1px] w-[48px] h-[2px] bg-gray-300 dark:bg-border"></div>
                    <div className="absolute right-[-48px] top-[-46px] bottom-[50%] w-[2px] bg-gray-300 dark:bg-border"></div>

                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-card rounded-lg border border-gray-200 dark:border-border w-44">
                      <span className="text-[15px] font-bold text-gray-500 dark:text-zinc-300 w-8">5위</span>
                      <TeamLogo team="NC" size={24} />
                      <span className="font-bold text-gray-900 dark:text-white">NC</span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-primary w-44 relative z-10">
                    <span className="text-[15px] font-bold text-primary w-8">4위</span>
                      <TeamLogo team="삼성" size={24} />
                      <span className="font-bold text-gray-900 dark:text-white">삼성</span>
                      <OffseasonPill className="ml-auto border-none bg-primary px-2 py-0.5 text-[14px] text-white">승</OffseasonPill>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 relative z-10 translate-y-8">
                <span className="text-[14px] font-bold text-gray-400 dark:text-gray-300 text-center">준플레이오프</span>
                <div className="flex flex-col gap-8 relative">
                  <div className="absolute left-[-48px] bottom-[26px] w-[48px] h-[2px] bg-primary"></div>
                  <div className="absolute right-[-48px] top-1/2 -translate-y-[1px] w-[48px] h-[2px] bg-gray-300 dark:bg-border"></div>
                  <div className="absolute right-[-48px] top-[-46px] bottom-[50%] w-[2px] bg-gray-300 dark:bg-border"></div>

                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-card rounded-lg border border-gray-200 dark:border-border w-48">
                    <span className="text-[15px] font-bold text-gray-500 dark:text-zinc-300 w-8">3위</span>
                    <TeamLogo team="SSG" size={24} />
                    <span className="font-bold text-gray-900 dark:text-white">SSG</span>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-primary w-48">
                    <span className="text-[15px] font-bold text-primary w-8">WC</span>
                    <TeamLogo team="삼성" size={24} />
                    <span className="font-bold text-gray-900 dark:text-white">삼성</span>
                    <OffseasonPill className="ml-auto border-none bg-primary px-2 py-0.5 text-[14px] text-white">승</OffseasonPill>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 relative z-10 -translate-y-4">
                <span className="text-[14px] font-bold text-gray-400 dark:text-gray-300 text-center">플레이오프</span>
                <div className="flex flex-col gap-8 relative">
                  <div className="absolute left-[-48px] bottom-[26px] w-[48px] h-[2px] bg-primary"></div>
                  <div className="absolute right-[-48px] top-1/2 -translate-y-[1px] w-[48px] h-[2px] bg-gray-300 dark:bg-border"></div>
                  <div className="absolute right-[-48px] top-[-46px] bottom-[50%] w-[2px] bg-gray-300 dark:bg-border"></div>

                  <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-primary w-52">
                    <span className="text-[15px] font-bold text-primary w-8">2위</span>
                    <TeamLogo team="한화" size={24} />
                    <span className="font-bold text-gray-900 dark:text-white">한화</span>
                    <OffseasonPill className="ml-auto border-none bg-primary px-2 py-0.5 text-[14px] text-white">승</OffseasonPill>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-card rounded-lg border border-gray-200 dark:border-border w-52">
                    <span className="text-[15px] font-bold text-gray-500 dark:text-zinc-300 w-8">준PO</span>
                    <TeamLogo team="삼성" size={24} />
                    <span className="font-bold text-gray-900 dark:text-white">삼성</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 relative z-10 -translate-y-16">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CrownIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-[14px] font-bold text-yellow-600 dark:text-yellow-400 text-center">한국시리즈</span>
                </div>

                <div className="flex flex-col gap-8 relative">
                  <div className="absolute left-[-48px] bottom-[30px] w-[48px] h-[2px] bg-primary"></div>

                  <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-primary to-[#1a3c34] rounded-xl shadow-lg shadow-emerald-900/20 border-none w-60 sm:scale-110">
                    <span className="text-[15px] font-bold text-emerald-200 w-8">1위</span>
                    <TeamLogo team="LG" size={32} />
                    <span className="font-bold text-white text-lg">LG</span>
                    <OffseasonPill className="ml-auto border-none bg-yellow-400 px-2 py-0.5 text-[14px] text-black">V3</OffseasonPill>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-card rounded-lg border border-gray-200 dark:border-border w-60 opacity-70">
                    <span className="text-[15px] font-bold text-gray-500 dark:text-zinc-300 w-8">PO</span>
                    <TeamLogo team="한화" size={24} />
                    <span className="font-bold text-gray-900 dark:text-white">한화</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="pb-10">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="bg-primary p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <TrendingUpIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-primary">최종 순위</h3>
        </div>

        <Card className="overflow-hidden shadow-2xl border border-gray-200 dark:border-border bg-white dark:bg-card rounded-2xl md:rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100 dark:bg-secondary text-gray-600 dark:text-gray-200 uppercase border-b border-gray-200 dark:border-border">
                <tr>
                  <th className="py-4 px-4 md:px-6 font-bold text-[15px]">순위</th>
                  <th className="py-4 px-4 md:px-6 font-bold text-[15px]">팀명</th>
                  <th className="py-4 px-4 md:px-6 font-bold text-[15px] text-center hidden sm:table-cell">경기</th>
                  <th className="py-4 px-4 md:px-6 font-bold text-[15px] text-center">승/패</th>
                  <th className="py-4 px-4 md:px-6 font-bold text-[15px] text-center">승률</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((team: Ranking) => (
                  <tr
                    key={team.rank}
                    className={`group border-b border-gray-100 dark:border-border/70 last:border-b-0 transition-colors odd:bg-white even:bg-gray-50/70 dark:odd:bg-card dark:even:bg-secondary/40 hover:bg-emerald-50/50 dark:hover:bg-secondary/70 dark:text-gray-100 ${team.rank <= 3 ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : ''}`}
                  >
                    <td className="py-4 px-4 md:px-6">
                      <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-white shadow-md font-black text-[15px] md:text-[15px] ${team.rank <= 3 ? 'bg-primary scale-105' : 'bg-gray-400 dark:bg-secondary'}`}>
                        {team.rank}
                      </div>
                    </td>
                    <td className="py-4 px-4 md:px-6">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-white dark:bg-card border border-gray-100 dark:border-border shadow-sm flex-shrink-0">
                          <TeamLogo team={team.teamId} size={24} className="md:w-7 md:h-7" />
                        </div>
                        <span className="text-gray-900 dark:text-gray-100 font-bold text-[15px] truncate max-w-[70px] md:max-w-none">
                          {team.teamName}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 md:px-6 text-center text-gray-600 dark:text-gray-200 text-[15px] hidden sm:table-cell">{team.games}</td>
                    <td className="py-4 px-4 md:px-6 text-center">
                      <div className="flex flex-col md:flex-row items-center justify-center gap-0 md:gap-1.5">
                        <span className="text-emerald-600 font-bold text-[15px]">{team.wins}승</span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[15px]">{team.losses}패</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 md:px-6 text-center font-black text-gray-900 dark:text-gray-100 text-[15px] tabular-nums">{team.winRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}
