import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import TeamLogo from './TeamLogo';
import { BellRing, CalendarClock } from 'lucide-react';

interface MyTeamCardProps {
    myTeamId?: string;
    myTeamName?: string; // We might need to fetch this or map it
    isLoggedIn: boolean;
}

export default function MyTeamCard({ myTeamId, myTeamName, isLoggedIn }: MyTeamCardProps) {
    const navigate = useNavigate();

    if (!isLoggedIn) {
        return (
            <div className="h-full flex flex-col justify-center items-center text-center p-4 bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3">
                    <BellRing className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-600 dark:text-gray-300 mb-1">My Team 설정</h3>
                <p className="text-xs text-gray-400 mb-4">로그인하고 응원팀 소식을 받아보세요</p>
                <Button
                    size="sm"
                    onClick={() => navigate('/login')}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                >
                    로그인하기
                </Button>
            </div>
        );
    }

    // Placeholder Data for Authenticated User (Real data would need an API call for "Next Match")
    return (
        <div className="h-full relative overflow-hidden rounded-xl bg-gradient-to-br from-[#c60c30] to-[#8a001a] p-5 text-white shadow-lg">
            {/* Background Logo Decoration */}
            <div className="absolute -bottom-4 -right-4 opacity-10 rotate-12">
                <TeamLogo team={myTeamName || "KIA"} size={120} />
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs bg-black/20 px-2 py-0.5 rounded text-white/80 inline-block mb-2">My Team</p>
                        <h3 className="text-2xl font-black italic tracking-tighter">{myTeamName || "KIA"}</h3>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                            <CalendarClock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-white/70">다음 경기 • D-Day</p>
                            <p className="font-bold text-sm">오늘 18:30 vs LG</p>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        variant="secondary"
                        className="w-full bg-white text-[#c60c30] hover:bg-white/90 font-bold border-0"
                    >
                        응원하러 가기
                    </Button>
                </div>
            </div>
        </div>
    );
}
